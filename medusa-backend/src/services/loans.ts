import { Pool } from 'pg';
import crypto from 'crypto';
import BlnkService from './blnk';
import SMSService from './sms';

interface LoanProduct {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  termDays: number;
  loanType: 'food' | 'cash';
  requirements: Record<string, any>;
  isActive: boolean;
}

interface Loan {
  id: string;
  loanNumber: string;
  borrowerId: string;
  loanProductId: string;
  principal: number;
  interestRate: number;
  totalRepayment: number;
  outstandingBalance: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'active' | 'paid' | 'defaulted';
  approvedBy?: string;
  approvedAt?: Date;
  disbursedAt?: Date;
  dueDate?: Date;
  blnkAccountId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

interface LoanApplication {
  borrowerId: string;
  loanProductId: string;
  requestedAmount: number;
  purpose?: string;
  metadata?: Record<string, any>;
}

interface LoanApproval {
  loanId: string;
  adminId: string;
  approvedAmount?: number;
  decision: 'approve' | 'reject';
  reason?: string;
}

interface RepaymentResult {
  success: boolean;
  repaymentId?: string;
  remainingBalance?: number;
  message?: string;
  error?: string;
}

class LoanService {
  private db: Pool;
  private blnkService: BlnkService;
  private smsService: SMSService;

  constructor(container: any) {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.blnkService = new BlnkService(container);
    this.smsService = new SMSService();
  }

  /**
   * Generate unique loan number
   */
  private generateLoanNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `LN${year}${month}${random}`;
  }

  // ==================== LOAN PRODUCTS ====================

  /**
   * Get all loan products
   */
  async getLoanProducts(activeOnly: boolean = true): Promise<LoanProduct[]> {
    const query = activeOnly
      ? 'SELECT * FROM bigcompany.loan_products WHERE is_active = true ORDER BY min_amount'
      : 'SELECT * FROM bigcompany.loan_products ORDER BY min_amount';

    const result = await this.db.query(query);
    return result.rows.map(this.mapLoanProduct);
  }

  /**
   * Get loan product by ID
   */
  async getLoanProduct(productId: string): Promise<LoanProduct | null> {
    const result = await this.db.query(
      'SELECT * FROM bigcompany.loan_products WHERE id = $1',
      [productId]
    );
    return result.rows[0] ? this.mapLoanProduct(result.rows[0]) : null;
  }

  /**
   * Create loan product (admin)
   */
  async createLoanProduct(product: Partial<LoanProduct>): Promise<LoanProduct> {
    const result = await this.db.query(`
      INSERT INTO bigcompany.loan_products
      (name, description, min_amount, max_amount, interest_rate, term_days, loan_type, requirements, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      product.name,
      product.description,
      product.minAmount,
      product.maxAmount,
      product.interestRate || 0,
      product.termDays || 30,
      product.loanType || 'food',
      JSON.stringify(product.requirements || {}),
      product.isActive !== false,
    ]);

    return this.mapLoanProduct(result.rows[0]);
  }

  /**
   * Update loan product (admin)
   */
  async updateLoanProduct(productId: string, updates: Partial<LoanProduct>): Promise<LoanProduct | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.minAmount !== undefined) {
      setClauses.push(`min_amount = $${paramIndex++}`);
      values.push(updates.minAmount);
    }
    if (updates.maxAmount !== undefined) {
      setClauses.push(`max_amount = $${paramIndex++}`);
      values.push(updates.maxAmount);
    }
    if (updates.interestRate !== undefined) {
      setClauses.push(`interest_rate = $${paramIndex++}`);
      values.push(updates.interestRate);
    }
    if (updates.termDays !== undefined) {
      setClauses.push(`term_days = $${paramIndex++}`);
      values.push(updates.termDays);
    }
    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (setClauses.length === 0) return this.getLoanProduct(productId);

    values.push(productId);

    const result = await this.db.query(`
      UPDATE bigcompany.loan_products
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    return result.rows[0] ? this.mapLoanProduct(result.rows[0]) : null;
  }

  // ==================== LOAN APPLICATIONS ====================

  /**
   * Check customer eligibility for loan
   */
  async checkEligibility(borrowerId: string): Promise<{
    eligible: boolean;
    maxAmount: number;
    reason?: string;
    existingLoans?: Loan[];
  }> {
    // Check for existing active loans
    const existingLoans = await this.db.query(`
      SELECT * FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('pending', 'approved', 'disbursed', 'active')
    `, [borrowerId]);

    if (existingLoans.rows.length > 0) {
      return {
        eligible: false,
        maxAmount: 0,
        reason: 'You have an existing active loan',
        existingLoans: existingLoans.rows.map(this.mapLoan),
      };
    }

    // Check repayment history
    const repaymentHistory = await this.db.query(`
      SELECT l.*,
        CASE WHEN l.status = 'paid' AND l.due_date >= (
          SELECT MAX(paid_at) FROM bigcompany.loan_repayments WHERE loan_id = l.id
        ) THEN 'on_time' ELSE 'late' END as payment_status
      FROM bigcompany.loans l
      WHERE borrower_id = $1 AND status = 'paid'
      ORDER BY created_at DESC
      LIMIT 5
    `, [borrowerId]);

    // Calculate credit score based on history
    let maxAmount = 5000; // Default max for new customers

    if (repaymentHistory.rows.length > 0) {
      const onTimePayments = repaymentHistory.rows.filter(r => r.payment_status === 'on_time').length;
      const totalPayments = repaymentHistory.rows.length;
      const repaymentRate = onTimePayments / totalPayments;

      if (repaymentRate >= 0.9) {
        maxAmount = 10000; // Excellent history
      } else if (repaymentRate >= 0.7) {
        maxAmount = 7000; // Good history
      } else if (repaymentRate >= 0.5) {
        maxAmount = 5000; // Fair history
      } else {
        maxAmount = 2000; // Poor history
      }
    }

    // Check account age (must be at least 7 days old)
    const customer = await this.db.query(
      'SELECT created_at FROM customer WHERE id = $1',
      [borrowerId]
    );

    if (customer.rows.length === 0) {
      return { eligible: false, maxAmount: 0, reason: 'Customer account not found' };
    }

    const accountAge = Date.now() - new Date(customer.rows[0].created_at).getTime();
    const minAgeDays = 7;

    if (accountAge < minAgeDays * 24 * 60 * 60 * 1000) {
      return {
        eligible: false,
        maxAmount: 0,
        reason: `Account must be at least ${minAgeDays} days old`,
      };
    }

    return { eligible: true, maxAmount };
  }

  /**
   * Apply for a loan
   */
  async applyForLoan(application: LoanApplication): Promise<{ success: boolean; loan?: Loan; error?: string }> {
    const { borrowerId, loanProductId, requestedAmount, purpose, metadata } = application;

    // Check eligibility
    const eligibility = await this.checkEligibility(borrowerId);
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    // Get loan product
    const product = await this.getLoanProduct(loanProductId);
    if (!product) {
      return { success: false, error: 'Loan product not found' };
    }

    if (!product.isActive) {
      return { success: false, error: 'Loan product is not available' };
    }

    // Validate amount
    if (requestedAmount < product.minAmount || requestedAmount > product.maxAmount) {
      return {
        success: false,
        error: `Amount must be between ${product.minAmount} and ${product.maxAmount} RWF`,
      };
    }

    if (requestedAmount > eligibility.maxAmount) {
      return {
        success: false,
        error: `Maximum eligible amount is ${eligibility.maxAmount} RWF`,
      };
    }

    // Calculate repayment
    const totalRepayment = requestedAmount * (1 + product.interestRate);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + product.termDays);

    // Create loan
    const loanNumber = this.generateLoanNumber();

    const result = await this.db.query(`
      INSERT INTO bigcompany.loans
      (loan_number, borrower_id, loan_product_id, principal, interest_rate, total_repayment,
       outstanding_balance, currency, status, due_date, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'RWF', 'pending', $8, $9)
      RETURNING *
    `, [
      loanNumber,
      borrowerId,
      loanProductId,
      requestedAmount,
      product.interestRate,
      totalRepayment,
      totalRepayment,
      dueDate,
      JSON.stringify({ purpose, ...metadata }),
    ]);

    // Log application
    await this.logAudit(borrowerId, 'loan_application', 'loan', result.rows[0].id, {
      amount: requestedAmount,
      product: product.name,
    });

    return { success: true, loan: this.mapLoan(result.rows[0]) };
  }

  /**
   * Process loan approval/rejection (admin)
   */
  async processLoanDecision(decision: LoanApproval): Promise<{ success: boolean; loan?: Loan; error?: string }> {
    const { loanId, adminId, approvedAmount, decision: approvalDecision, reason } = decision;

    // Get loan
    const loan = await this.db.query(
      'SELECT * FROM bigcompany.loans WHERE id = $1',
      [loanId]
    );

    if (loan.rows.length === 0) {
      return { success: false, error: 'Loan not found' };
    }

    if (loan.rows[0].status !== 'pending') {
      return { success: false, error: 'Loan has already been processed' };
    }

    if (approvalDecision === 'reject') {
      // Reject loan
      const result = await this.db.query(`
        UPDATE bigcompany.loans
        SET status = 'rejected', approved_by = $1, approved_at = NOW(),
            metadata = metadata || $2
        WHERE id = $3
        RETURNING *
      `, [adminId, JSON.stringify({ rejection_reason: reason }), loanId]);

      await this.logAudit(adminId, 'loan_rejected', 'loan', loanId, { reason });

      // Notify customer
      await this.notifyCustomer(loan.rows[0].borrower_id, 'loan_rejected', {
        loanNumber: loan.rows[0].loan_number,
        reason,
      });

      return { success: true, loan: this.mapLoan(result.rows[0]) };
    }

    // Approve loan
    const finalAmount = approvedAmount || loan.rows[0].principal;
    const product = await this.getLoanProduct(loan.rows[0].loan_product_id);
    const totalRepayment = finalAmount * (1 + (product?.interestRate || 0));

    const result = await this.db.query(`
      UPDATE bigcompany.loans
      SET status = 'approved', principal = $1, total_repayment = $2, outstanding_balance = $2,
          approved_by = $3, approved_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [finalAmount, totalRepayment, adminId, loanId]);

    await this.logAudit(adminId, 'loan_approved', 'loan', loanId, {
      approvedAmount: finalAmount,
      totalRepayment,
    });

    // Auto-disburse for food loans
    if (product?.loanType === 'food') {
      return this.disburseLoan(loanId, adminId);
    }

    return { success: true, loan: this.mapLoan(result.rows[0]) };
  }

  /**
   * Disburse approved loan
   */
  async disburseLoan(loanId: string, adminId: string): Promise<{ success: boolean; loan?: Loan; error?: string }> {
    const loan = await this.db.query(
      'SELECT * FROM bigcompany.loans WHERE id = $1',
      [loanId]
    );

    if (loan.rows.length === 0) {
      return { success: false, error: 'Loan not found' };
    }

    if (loan.rows[0].status !== 'approved') {
      return { success: false, error: 'Loan must be approved before disbursement' };
    }

    try {
      // Create loan account in Blnk (for tracking)
      // For food loans, we don't transfer actual money, just create credit limit
      const loanAccountId = `loan_${loanId}`;

      // Update loan status
      const result = await this.db.query(`
        UPDATE bigcompany.loans
        SET status = 'disbursed', disbursed_at = NOW(), blnk_account_id = $1
        WHERE id = $2
        RETURNING *
      `, [loanAccountId, loanId]);

      await this.logAudit(adminId, 'loan_disbursed', 'loan', loanId, {
        amount: loan.rows[0].principal,
      });

      // Notify customer
      await this.notifyCustomer(loan.rows[0].borrower_id, 'loan_disbursed', {
        loanNumber: loan.rows[0].loan_number,
        amount: loan.rows[0].principal,
        dueDate: loan.rows[0].due_date,
      });

      return { success: true, loan: this.mapLoan(result.rows[0]) };
    } catch (error: any) {
      console.error('Loan disbursement error:', error);
      return { success: false, error: 'Failed to disburse loan' };
    }
  }

  /**
   * Get loan by ID
   */
  async getLoan(loanId: string): Promise<Loan | null> {
    const result = await this.db.query(
      'SELECT * FROM bigcompany.loans WHERE id = $1',
      [loanId]
    );
    return result.rows[0] ? this.mapLoan(result.rows[0]) : null;
  }

  /**
   * Get customer's loans
   */
  async getCustomerLoans(borrowerId: string): Promise<Loan[]> {
    const result = await this.db.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.borrower_id = $1
      ORDER BY l.created_at DESC
    `, [borrowerId]);

    return result.rows.map(this.mapLoan);
  }

  /**
   * Get all loans (admin)
   */
  async getAllLoans(filters: {
    status?: string;
    borrowerId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ loans: Loan[]; total: number }> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      whereConditions.push(`l.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters.borrowerId) {
      whereConditions.push(`l.borrower_id = $${paramIndex++}`);
      params.push(filters.borrowerId);
    }
    if (filters.fromDate) {
      whereConditions.push(`l.created_at >= $${paramIndex++}`);
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      whereConditions.push(`l.created_at <= $${paramIndex++}`);
      params.push(filters.toDate);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM bigcompany.loans l ${whereClause}`,
      params
    );

    // Get loans
    params.push(filters.limit || 50);
    params.push(filters.offset || 0);

    const result = await this.db.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type,
             c.email as borrower_email, c.first_name, c.last_name
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      LEFT JOIN customer c ON l.borrower_id = c.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    return {
      loans: result.rows.map(this.mapLoan),
      total: parseInt(countResult.rows[0].count),
    };
  }

  // ==================== REPAYMENTS ====================

  /**
   * Process loan repayment
   */
  async processRepayment(
    loanId: string,
    amount: number,
    paymentMethod: 'wallet' | 'mobile_money' | 'gas_reward',
    metadata?: Record<string, any>
  ): Promise<RepaymentResult> {
    const loan = await this.db.query(
      'SELECT * FROM bigcompany.loans WHERE id = $1',
      [loanId]
    );

    if (loan.rows.length === 0) {
      return { success: false, error: 'Loan not found' };
    }

    const loanData = loan.rows[0];

    if (!['disbursed', 'active'].includes(loanData.status)) {
      return { success: false, error: 'Loan is not active' };
    }

    if (amount > loanData.outstanding_balance) {
      amount = loanData.outstanding_balance; // Cap at outstanding
    }

    if (amount <= 0) {
      return { success: false, error: 'Invalid repayment amount' };
    }

    try {
      // Record repayment
      const repaymentResult = await this.db.query(`
        INSERT INTO bigcompany.loan_repayments
        (loan_id, amount, principal_portion, payment_method, metadata)
        VALUES ($1, $2, $2, $3, $4)
        RETURNING *
      `, [loanId, amount, paymentMethod, JSON.stringify(metadata || {})]);

      // Update loan
      const newBalance = loanData.outstanding_balance - amount;
      const newStatus = newBalance <= 0 ? 'paid' : 'active';

      await this.db.query(`
        UPDATE bigcompany.loans
        SET outstanding_balance = $1, status = $2, updated_at = NOW()
        WHERE id = $3
      `, [Math.max(0, newBalance), newStatus, loanId]);

      // Log
      await this.logAudit(loanData.borrower_id, 'loan_repayment', 'loan', loanId, {
        amount,
        method: paymentMethod,
        remainingBalance: newBalance,
      });

      // Notify if fully paid
      if (newStatus === 'paid') {
        await this.notifyCustomer(loanData.borrower_id, 'loan_paid', {
          loanNumber: loanData.loan_number,
        });
      }

      return {
        success: true,
        repaymentId: repaymentResult.rows[0].id,
        remainingBalance: Math.max(0, newBalance),
        message: newStatus === 'paid' ? 'Loan fully repaid!' : `Repayment successful. Remaining: ${newBalance.toLocaleString()} RWF`,
      };
    } catch (error: any) {
      console.error('Repayment error:', error);
      return { success: false, error: 'Failed to process repayment' };
    }
  }

  /**
   * Auto-recover loan from customer transactions
   */
  async autoRecoverFromTransaction(
    borrowerId: string,
    transactionAmount: number,
    transactionId: string
  ): Promise<{ recovered: boolean; amount?: number }> {
    // Get active loan
    const loan = await this.db.query(`
      SELECT * FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('disbursed', 'active')
      ORDER BY created_at ASC
      LIMIT 1
    `, [borrowerId]);

    if (loan.rows.length === 0) {
      return { recovered: false };
    }

    // Calculate recovery amount (10% of transaction, max outstanding balance)
    const recoveryPercentage = 0.10;
    let recoveryAmount = Math.floor(transactionAmount * recoveryPercentage);
    recoveryAmount = Math.min(recoveryAmount, loan.rows[0].outstanding_balance);

    if (recoveryAmount < 100) {
      return { recovered: false }; // Minimum recovery amount
    }

    const result = await this.processRepayment(
      loan.rows[0].id,
      recoveryAmount,
      'wallet',
      { auto_recovery: true, source_transaction: transactionId }
    );

    return {
      recovered: result.success,
      amount: result.success ? recoveryAmount : undefined,
    };
  }

  /**
   * Get repayment history
   */
  async getRepaymentHistory(loanId: string): Promise<any[]> {
    const result = await this.db.query(`
      SELECT * FROM bigcompany.loan_repayments
      WHERE loan_id = $1
      ORDER BY paid_at DESC
    `, [loanId]);

    return result.rows;
  }

  // ==================== FOOD LOAN SPENDING ====================

  /**
   * Check if customer can use food loan for purchase
   */
  async checkFoodLoanAvailability(borrowerId: string, amount: number): Promise<{
    available: boolean;
    availableCredit: number;
    reason?: string;
  }> {
    const loan = await this.db.query(`
      SELECT l.*, lp.loan_type
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.borrower_id = $1 AND l.status IN ('disbursed', 'active') AND lp.loan_type = 'food'
      LIMIT 1
    `, [borrowerId]);

    if (loan.rows.length === 0) {
      return { available: false, availableCredit: 0, reason: 'No active food loan' };
    }

    const availableCredit = loan.rows[0].principal - (loan.rows[0].metadata?.used_amount || 0);

    if (amount > availableCredit) {
      return {
        available: false,
        availableCredit,
        reason: `Insufficient loan credit. Available: ${availableCredit.toLocaleString()} RWF`,
      };
    }

    return { available: true, availableCredit };
  }

  /**
   * Use food loan credit for purchase
   */
  async useFoodLoanCredit(
    borrowerId: string,
    amount: number,
    orderId: string,
    merchantId: string
  ): Promise<{ success: boolean; error?: string }> {
    const availability = await this.checkFoodLoanAvailability(borrowerId, amount);

    if (!availability.available) {
      return { success: false, error: availability.reason };
    }

    // Get loan
    const loan = await this.db.query(`
      SELECT * FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('disbursed', 'active')
      LIMIT 1
    `, [borrowerId]);

    const usedAmount = (loan.rows[0].metadata?.used_amount || 0) + amount;

    // Update used amount
    await this.db.query(`
      UPDATE bigcompany.loans
      SET metadata = metadata || $1, status = 'active'
      WHERE id = $2
    `, [
      JSON.stringify({
        used_amount: usedAmount,
        last_usage: { orderId, merchantId, amount, date: new Date() },
      }),
      loan.rows[0].id,
    ]);

    await this.logAudit(borrowerId, 'food_loan_used', 'loan', loan.rows[0].id, {
      amount,
      orderId,
      merchantId,
    });

    return { success: true };
  }

  // ==================== ADMIN REPORTING ====================

  /**
   * Get loan statistics
   */
  async getLoanStatistics(fromDate?: Date, toDate?: Date): Promise<{
    totalLoans: number;
    totalDisbursed: number;
    totalOutstanding: number;
    totalRepaid: number;
    byStatus: Record<string, number>;
    avgLoanAmount: number;
    defaultRate: number;
  }> {
    let dateCondition = '';
    const params: any[] = [];

    if (fromDate) {
      params.push(fromDate);
      dateCondition += ` AND created_at >= $${params.length}`;
    }
    if (toDate) {
      params.push(toDate);
      dateCondition += ` AND created_at <= $${params.length}`;
    }

    const stats = await this.db.query(`
      SELECT
        COUNT(*) as total_loans,
        SUM(CASE WHEN status IN ('disbursed', 'active', 'paid') THEN principal ELSE 0 END) as total_disbursed,
        SUM(CASE WHEN status IN ('disbursed', 'active') THEN outstanding_balance ELSE 0 END) as total_outstanding,
        SUM(CASE WHEN status = 'paid' THEN total_repayment ELSE 0 END) as total_repaid,
        AVG(principal) as avg_loan_amount,
        COUNT(CASE WHEN status = 'defaulted' THEN 1 END)::float / NULLIF(COUNT(*), 0) as default_rate
      FROM bigcompany.loans
      WHERE 1=1 ${dateCondition}
    `, params);

    const byStatus = await this.db.query(`
      SELECT status, COUNT(*) as count
      FROM bigcompany.loans
      WHERE 1=1 ${dateCondition}
      GROUP BY status
    `, params);

    const statusMap: Record<string, number> = {};
    byStatus.rows.forEach(row => {
      statusMap[row.status] = parseInt(row.count);
    });

    const data = stats.rows[0];

    return {
      totalLoans: parseInt(data.total_loans) || 0,
      totalDisbursed: parseFloat(data.total_disbursed) || 0,
      totalOutstanding: parseFloat(data.total_outstanding) || 0,
      totalRepaid: parseFloat(data.total_repaid) || 0,
      byStatus: statusMap,
      avgLoanAmount: parseFloat(data.avg_loan_amount) || 0,
      defaultRate: parseFloat(data.default_rate) || 0,
    };
  }

  // ==================== HELPERS ====================

  private mapLoanProduct(row: any): LoanProduct {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      minAmount: parseFloat(row.min_amount),
      maxAmount: parseFloat(row.max_amount),
      interestRate: parseFloat(row.interest_rate),
      termDays: row.term_days,
      loanType: row.loan_type,
      requirements: row.requirements || {},
      isActive: row.is_active,
    };
  }

  private mapLoan(row: any): Loan {
    return {
      id: row.id,
      loanNumber: row.loan_number,
      borrowerId: row.borrower_id,
      loanProductId: row.loan_product_id,
      principal: parseFloat(row.principal),
      interestRate: parseFloat(row.interest_rate),
      totalRepayment: parseFloat(row.total_repayment),
      outstandingBalance: parseFloat(row.outstanding_balance),
      currency: row.currency,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      disbursedAt: row.disbursed_at,
      dueDate: row.due_date,
      blnkAccountId: row.blnk_account_id,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }

  private async notifyCustomer(customerId: string, type: string, data: any): Promise<void> {
    const customer = await this.db.query(
      "SELECT phone, email FROM customer WHERE id = $1",
      [customerId]
    );

    if (!customer.rows[0]?.phone) return;

    const phone = customer.rows[0].phone;

    switch (type) {
      case 'loan_disbursed':
        await this.smsService.sendLoanApproval(
          phone,
          data.amount,
          new Date(data.dueDate).toLocaleDateString()
        );
        break;
      case 'loan_rejected':
        await this.smsService.send({
          to: phone,
          message: `BIG: Your loan application was not approved. Reason: ${data.reason || 'Not specified'}. Contact support for details.`,
        });
        break;
      case 'loan_paid':
        await this.smsService.send({
          to: phone,
          message: `BIG: Congratulations! Loan #${data.loanNumber} has been fully repaid. Thank you!`,
        });
        break;
    }
  }

  private async logAudit(userId: string, action: string, entityType: string, entityId: string, data: any): Promise<void> {
    await this.db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, action, entityType, entityId, JSON.stringify(data)]);
  }

  async close(): Promise<void> {
    await this.db.end();
  }
}

export default LoanService;
