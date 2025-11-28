import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import { Pool } from 'pg';
import BlnkService from '../../../services/blnk';
import SMSService from '../../../services/sms';
import MTNMoMoService from '../../../services/momo';
import AirtelMoneyService from '../../../services/airtel';

const router = Router();

// Database pool
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Service instances
let blnkService: BlnkService;
let smsService: SMSService;
let momoService: MTNMoMoService;
let airtelService: AirtelMoneyService;

function initServices(container?: any) {
  if (!blnkService) {
    blnkService = new BlnkService(container);
    smsService = new SMSService();
    momoService = new MTNMoMoService();
    airtelService = new AirtelMoneyService();
  }
}

// Phone helpers
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '250' + cleaned.substring(1);
  } else if (!cleaned.startsWith('250') && cleaned.length === 9) {
    cleaned = '250' + cleaned;
  }
  return cleaned;
}

function isMTNNumber(phone: string): boolean {
  const cleaned = normalizePhone(phone);
  const prefix = cleaned.substring(3, 5);
  return ['78', '79'].includes(prefix);
}

// Generate loan number
function generateLoanNumber(): string {
  const prefix = 'LN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ==================== LOAN PRODUCTS ====================

/**
 * Get available loan products
 * GET /store/loans/products
 */
router.get('/products', wrapHandler(async (req, res) => {
  try {
    const products = await db.query(`
      SELECT id, name, description, loan_type, min_amount, max_amount,
             interest_rate, term_days, requirements, is_active
      FROM bigcompany.loan_products
      WHERE is_active = true
      ORDER BY loan_type, min_amount ASC
    `);

    res.json({ products: products.rows });
  } catch (error: any) {
    console.error('Get loan products error:', error);
    res.status(500).json({ error: 'Failed to get loan products' });
  }
}));

/**
 * Get loan product details
 * GET /store/loans/products/:id
 */
router.get('/products/:id', wrapHandler(async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await db.query(`
      SELECT * FROM bigcompany.loan_products WHERE id = $1
    `, [productId]);

    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Loan product not found' });
    }

    res.json({ product: product.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get product details' });
  }
}));

// ==================== LOAN ELIGIBILITY & SCORING ====================

/**
 * Check loan eligibility
 * GET /store/loans/eligibility
 *
 * Uses credit scoring based on:
 * - Purchase history
 * - Wallet activity
 * - Gas purchase frequency
 * - Previous loan repayment
 */
router.get('/eligibility', wrapHandler(async (req, res) => {
  initServices(req.scope);
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get customer info
    const customer = await db.query(`
      SELECT c.*, c.metadata FROM customer c WHERE c.id = $1
    `, [customerId]);

    if (customer.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerData = customer.rows[0];

    // Calculate credit score (0-100)
    let creditScore = 50; // Base score
    const scoreBreakdown: Record<string, number> = {};

    // 1. Account age (up to 10 points)
    const accountAge = await db.query(`
      SELECT EXTRACT(DAY FROM NOW() - created_at) as days FROM customer WHERE id = $1
    `, [customerId]);
    const ageDays = Number(accountAge.rows[0]?.days || 0);
    const ageScore = Math.min(ageDays / 30, 10); // 1 point per month, max 10
    creditScore += ageScore;
    scoreBreakdown.account_age = ageScore;

    // 2. Wallet activity (up to 15 points)
    const walletActivity = await db.query(`
      SELECT COUNT(*) as tx_count, COALESCE(SUM(amount), 0) as total_volume
      FROM bigcompany.wallet_topups
      WHERE user_id = $1 AND status = 'success' AND created_at > NOW() - INTERVAL '90 days'
    `, [customerId]);
    const txCount = Number(walletActivity.rows[0]?.tx_count || 0);
    const activityScore = Math.min(txCount * 2, 15);
    creditScore += activityScore;
    scoreBreakdown.wallet_activity = activityScore;

    // 3. Gas purchase frequency (up to 15 points)
    const gasActivity = await db.query(`
      SELECT COUNT(*) as gas_count, COALESCE(SUM(amount), 0) as gas_total
      FROM bigcompany.utility_topups
      WHERE user_id = $1 AND status = 'success' AND created_at > NOW() - INTERVAL '90 days'
    `, [customerId]);
    const gasCount = Number(gasActivity.rows[0]?.gas_count || 0);
    const gasScore = Math.min(gasCount * 3, 15);
    creditScore += gasScore;
    scoreBreakdown.gas_purchases = gasScore;

    // 4. Previous loan repayment history (up to 20 points, can be negative)
    const loanHistory = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'paid') as paid_loans,
        COUNT(*) FILTER (WHERE status = 'defaulted') as defaulted_loans,
        COUNT(*) FILTER (WHERE status IN ('active', 'disbursed') AND due_date < NOW()) as overdue_loans
      FROM bigcompany.loans WHERE borrower_id = $1
    `, [customerId]);

    const paidLoans = Number(loanHistory.rows[0]?.paid_loans || 0);
    const defaultedLoans = Number(loanHistory.rows[0]?.defaulted_loans || 0);
    const overdueLoans = Number(loanHistory.rows[0]?.overdue_loans || 0);

    let repaymentScore = paidLoans * 5; // +5 per paid loan
    repaymentScore -= defaultedLoans * 15; // -15 per default
    repaymentScore -= overdueLoans * 10; // -10 per overdue
    repaymentScore = Math.max(-10, Math.min(repaymentScore, 20)); // Clamp to -10 to +20
    creditScore += repaymentScore;
    scoreBreakdown.repayment_history = repaymentScore;

    // 5. NFC card usage (up to 10 points)
    const nfcUsage = await db.query(`
      SELECT COUNT(*) as nfc_tx FROM bigcompany.nfc_transactions
      WHERE user_id = $1 AND status = 'success' AND created_at > NOW() - INTERVAL '90 days'
    `, [customerId]);
    const nfcScore = Math.min(Number(nfcUsage.rows[0]?.nfc_tx || 0), 10);
    creditScore += nfcScore;
    scoreBreakdown.nfc_usage = nfcScore;

    // Ensure score is within bounds
    creditScore = Math.max(0, Math.min(creditScore, 100));

    // Check for existing active loans
    const activeLoans = await db.query(`
      SELECT * FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('pending', 'approved', 'disbursed', 'active')
    `, [customerId]);

    const hasActiveLoan = activeLoans.rows.length > 0;

    // Get eligible products based on score
    const eligibleProducts = await db.query(`
      SELECT * FROM bigcompany.loan_products
      WHERE is_active = true
      AND min_credit_score <= $1
      ORDER BY max_amount DESC
    `, [creditScore]);

    // Calculate max eligible amount based on score
    let maxEligibleAmount = 0;
    if (creditScore >= 80) {
      maxEligibleAmount = 50000; // Premium tier
    } else if (creditScore >= 60) {
      maxEligibleAmount = 20000; // Standard tier
    } else if (creditScore >= 40) {
      maxEligibleAmount = 10000; // Basic tier
    } else if (creditScore >= 20) {
      maxEligibleAmount = 5000; // Starter tier
    }

    res.json({
      eligible: creditScore >= 20 && !hasActiveLoan,
      credit_score: Math.round(creditScore),
      score_breakdown: scoreBreakdown,
      max_eligible_amount: maxEligibleAmount,
      has_active_loan: hasActiveLoan,
      active_loan: hasActiveLoan ? activeLoans.rows[0] : null,
      eligible_products: eligibleProducts.rows,
      message: hasActiveLoan
        ? 'You have an active loan. Please repay before applying for a new one.'
        : creditScore < 20
        ? 'Build your credit score by using our services regularly.'
        : 'You are eligible for a loan!',
    });
  } catch (error: any) {
    console.error('Eligibility check error:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
}));

// ==================== CUSTOMER LOANS ====================

/**
 * Get customer's loans
 * GET /store/loans
 */
router.get('/', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const loans = await db.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type, lp.description as product_description
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.borrower_id = $1
      ORDER BY l.created_at DESC
    `, [customerId]);

    // Calculate summary
    const activeLoans = loans.rows.filter(l => ['active', 'disbursed'].includes(l.status));
    const totalOutstanding = activeLoans.reduce((sum, l) => sum + Number(l.outstanding_balance), 0);

    res.json({
      loans: loans.rows,
      summary: {
        total_loans: loans.rows.length,
        active_loans: activeLoans.length,
        total_outstanding: totalOutstanding,
        currency: 'RWF',
      },
    });
  } catch (error: any) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Failed to get loans' });
  }
}));

/**
 * Get loan details
 * GET /store/loans/:id
 */
router.get('/:id', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const loanId = req.params.id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const loan = await db.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type, lp.description as product_description
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.id = $1 AND l.borrower_id = $2
    `, [loanId, customerId]);

    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Get repayment history
    const repayments = await db.query(`
      SELECT * FROM bigcompany.loan_repayments
      WHERE loan_id = $1
      ORDER BY paid_at DESC
    `, [loanId]);

    // Calculate repayment progress
    const loanData = loan.rows[0];
    const totalRepaid = Number(loanData.total_repayment) - Number(loanData.outstanding_balance);
    const repaymentProgress = (totalRepaid / Number(loanData.total_repayment)) * 100;

    res.json({
      loan: loanData,
      repayments: repayments.rows,
      progress: {
        total_repayment: Number(loanData.total_repayment),
        amount_repaid: totalRepaid,
        outstanding: Number(loanData.outstanding_balance),
        percentage: Math.round(repaymentProgress),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get loan details' });
  }
}));

/**
 * Apply for a loan
 * POST /store/loans/apply
 */
router.post('/apply', wrapHandler(async (req, res) => {
  initServices(req.scope);
  const customerId = req.user?.customer_id;
  const { loan_product_id, amount, purpose } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!loan_product_id || !amount) {
    return res.status(400).json({ error: 'loan_product_id and amount are required' });
  }

  try {
    // Get customer info
    const customer = await db.query(`
      SELECT * FROM customer WHERE id = $1
    `, [customerId]);

    if (customer.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get loan product
    const product = await db.query(`
      SELECT * FROM bigcompany.loan_products WHERE id = $1 AND is_active = true
    `, [loan_product_id]);

    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Loan product not found' });
    }

    const productData = product.rows[0];

    // Validate amount
    if (amount < productData.min_amount || amount > productData.max_amount) {
      return res.status(400).json({
        error: 'Invalid loan amount',
        min_amount: productData.min_amount,
        max_amount: productData.max_amount,
      });
    }

    // Check for existing active loans
    const existingLoans = await db.query(`
      SELECT * FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('pending', 'approved', 'disbursed', 'active')
    `, [customerId]);

    if (existingLoans.rows.length > 0) {
      return res.status(400).json({
        error: 'You already have an active loan. Please repay it before applying for a new one.',
        existing_loan: {
          loan_number: existingLoans.rows[0].loan_number,
          outstanding_balance: existingLoans.rows[0].outstanding_balance,
          status: existingLoans.rows[0].status,
        },
      });
    }

    // Generate loan number
    const loanNumber = generateLoanNumber();

    // Calculate total repayment (for food loans, interest is 0%)
    const interestRate = Number(productData.interest_rate) || 0;
    const totalRepayment = amount * (1 + interestRate);

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (productData.term_days || 30));

    // For food loans, auto-approve and disburse
    const isFoodLoan = productData.loan_type === 'food';
    const initialStatus = isFoodLoan ? 'disbursed' : 'pending';

    // Create loan
    const result = await db.query(`
      INSERT INTO bigcompany.loans (
        loan_number, borrower_id, loan_product_id, principal,
        interest_rate, total_repayment, outstanding_balance,
        currency, status, due_date, purpose, disbursed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'RWF', $8, $9, $10, $11)
      RETURNING *
    `, [
      loanNumber,
      customerId,
      loan_product_id,
      amount,
      interestRate,
      totalRepayment,
      totalRepayment,
      initialStatus,
      dueDate.toISOString().split('T')[0],
      purpose || null,
      isFoodLoan ? new Date() : null,
    ]);

    const newLoan = result.rows[0];

    // For food loans, create credit in Blnk ledger
    if (isFoodLoan) {
      try {
        await blnkService.createLoanCredit(customerId, amount, loanNumber);
      } catch (blnkError) {
        console.error('Blnk loan credit error:', blnkError);
        // Continue - loan is still valid
      }
    }

    // Send SMS notification
    const phone = customer.rows[0].phone;
    if (phone) {
      const message = isFoodLoan
        ? `BIG Food Loan approved!\nAmount: ${amount.toLocaleString()} RWF\nDue: ${dueDate.toLocaleDateString()}\nUse for food purchases at any BIG retailer.\nRef: ${loanNumber}`
        : `BIG Loan application received!\nAmount: ${amount.toLocaleString()} RWF\nStatus: Under review\nWe'll notify you once approved.\nRef: ${loanNumber}`;

      await smsService.send({ to: phone, message });
    }

    res.json({
      success: true,
      message: isFoodLoan
        ? 'Food loan approved and credited to your account!'
        : 'Loan application submitted. We will review and notify you.',
      loan: {
        ...newLoan,
        product_name: productData.name,
        loan_type: productData.loan_type,
      },
    });
  } catch (error: any) {
    console.error('Loan apply error:', error);
    res.status(500).json({ error: 'Failed to apply for loan' });
  }
}));

/**
 * Make loan repayment
 * POST /store/loans/:id/repay
 */
router.post('/:id/repay', wrapHandler(async (req, res) => {
  initServices(req.scope);
  const customerId = req.user?.customer_id;
  const loanId = req.params.id;
  const { amount, payment_method } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  try {
    // Get customer info
    const customer = await db.query(`SELECT * FROM customer WHERE id = $1`, [customerId]);
    const phone = customer.rows[0]?.phone;

    // Get loan
    const loan = await db.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.id = $1 AND l.borrower_id = $2 AND l.status IN ('disbursed', 'active')
    `, [loanId, customerId]);

    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Active loan not found' });
    }

    const loanData = loan.rows[0];
    const outstanding = Number(loanData.outstanding_balance);

    // Validate amount
    if (amount > outstanding) {
      return res.status(400).json({
        error: 'Repayment amount exceeds outstanding balance',
        outstanding_balance: outstanding,
        max_repayment: outstanding,
      });
    }

    const repaymentRef = `REP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Payment method handling
    if (payment_method === 'wallet') {
      // Pay from wallet
      const walletBalance = await blnkService.getCustomerBalance(customerId, 'customer_wallets');

      if (walletBalance < amount) {
        return res.status(400).json({
          error: 'Insufficient wallet balance',
          balance: walletBalance,
          required: amount,
        });
      }

      // Deduct from wallet via Blnk
      await blnkService.deductFromWallet(customerId, amount, `Loan repayment: ${loanData.loan_number}`);

      // Process repayment
      await processRepayment(loanId, amount, 'wallet', repaymentRef, customerId, phone, loanData);

      const newOutstanding = outstanding - amount;
      const fullyPaid = newOutstanding <= 0;

      res.json({
        success: true,
        message: fullyPaid ? 'Loan fully repaid! Thank you!' : `Repayment of ${amount.toLocaleString()} RWF successful.`,
        repayment: {
          amount,
          reference: repaymentRef,
          payment_method: 'wallet',
        },
        new_outstanding: newOutstanding,
        loan_status: fullyPaid ? 'paid' : 'active',
      });
    } else if (payment_method === 'mtn_momo' || payment_method === 'airtel_money') {
      // Mobile money payment
      if (!phone) {
        return res.status(400).json({ error: 'Phone number required for mobile money payment' });
      }

      let paymentResult;

      if (isMTNNumber(phone)) {
        paymentResult = await momoService.requestPayment({
          amount,
          currency: 'RWF',
          externalId: repaymentRef,
          payerPhone: phone,
          payerMessage: `BIG Loan Repayment - ${loanData.loan_number}`,
        });
      } else {
        paymentResult = await airtelService.requestPayment({
          amount,
          phone,
          reference: repaymentRef,
        });
      }

      if (paymentResult?.success) {
        // Store pending repayment
        await db.query(`
          INSERT INTO bigcompany.loan_repayments
          (loan_id, amount, payment_method, status, reference, metadata)
          VALUES ($1, $2, $3, 'pending', $4, $5)
        `, [
          loanId,
          amount,
          payment_method,
          repaymentRef,
          JSON.stringify({ momo_reference: paymentResult.referenceId || paymentResult.transactionId }),
        ]);

        res.json({
          success: true,
          pending: true,
          message: 'Payment request sent to your phone. Approve to complete repayment.',
          reference: repaymentRef,
          momo_reference: paymentResult.referenceId || paymentResult.transactionId,
        });
      } else {
        res.status(400).json({ error: 'Payment request failed. Please try again.' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid payment_method. Use: wallet, mtn_momo, or airtel_money' });
    }
  } catch (error: any) {
    console.error('Loan repay error:', error);
    res.status(500).json({ error: 'Repayment failed' });
  }
}));

/**
 * Get active food loan credit (for spending)
 * GET /store/loans/food-credit
 */
router.get('/food-credit', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const foodLoans = await db.query(`
      SELECT l.*, lp.name as product_name
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.borrower_id = $1
      AND l.status IN ('active', 'disbursed')
      AND lp.loan_type = 'food'
      ORDER BY l.created_at DESC
    `, [customerId]);

    const totalCredit = foodLoans.rows.reduce((sum, loan) => sum + Number(loan.outstanding_balance), 0);

    res.json({
      available_credit: totalCredit,
      currency: 'RWF',
      loans: foodLoans.rows,
      can_spend: totalCredit > 0,
      message: totalCredit > 0
        ? `You have ${totalCredit.toLocaleString()} RWF food credit available.`
        : 'No food credit available. Apply for a food loan!',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get food credit' });
  }
}));

// ==================== HELPER FUNCTIONS ====================

async function processRepayment(
  loanId: string,
  amount: number,
  paymentMethod: string,
  reference: string,
  customerId: string,
  phone: string | null,
  loanData: any
): Promise<void> {
  const outstanding = Number(loanData.outstanding_balance);
  const newOutstanding = Math.max(0, outstanding - amount);
  const fullyPaid = newOutstanding <= 0;
  const newStatus = fullyPaid ? 'paid' : 'active';

  // Update loan
  await db.query(`
    UPDATE bigcompany.loans
    SET outstanding_balance = $1, status = $2, updated_at = NOW(),
        paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE paid_at END
    WHERE id = $3
  `, [newOutstanding, newStatus, loanId]);

  // Record repayment
  await db.query(`
    INSERT INTO bigcompany.loan_repayments (loan_id, amount, payment_method, status, reference, paid_at)
    VALUES ($1, $2, $3, 'success', $4, NOW())
  `, [loanId, amount, paymentMethod, reference]);

  // Send SMS notification
  if (phone) {
    const message = fullyPaid
      ? `BIG: Loan ${loanData.loan_number} fully repaid! Thank you for your payment of ${amount.toLocaleString()} RWF. Your credit score has improved!`
      : `BIG: Loan repayment of ${amount.toLocaleString()} RWF received. Remaining: ${newOutstanding.toLocaleString()} RWF. Ref: ${reference.substring(0, 12)}`;

    await smsService.send({ to: phone, message });
  }

  // If food loan fully paid, update Blnk ledger
  if (fullyPaid && loanData.loan_type === 'food') {
    try {
      await blnkService.closeLoanCredit(customerId, loanData.loan_number);
    } catch (error) {
      console.error('Error closing loan credit in Blnk:', error);
    }
  }
}

// ==================== ADMIN ENDPOINTS ====================

/**
 * Admin: Get all pending loans
 * GET /admin/loans/pending
 */
router.get('/admin/pending', wrapHandler(async (req, res) => {
  try {
    const loans = await db.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type,
             c.email, c.phone, c.first_name, c.last_name
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      JOIN customer c ON l.borrower_id = c.id
      WHERE l.status = 'pending'
      ORDER BY l.created_at ASC
    `);

    res.json({ loans: loans.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get pending loans' });
  }
}));

/**
 * Admin: Approve/Reject loan
 * POST /admin/loans/:id/review
 */
router.post('/admin/:id/review', wrapHandler(async (req, res) => {
  initServices(req.scope);
  const loanId = req.params.id;
  const { action, rejection_reason } = req.body; // action: 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use: approve or reject' });
  }

  try {
    const loan = await db.query(`
      SELECT l.*, c.phone, c.email, c.first_name
      FROM bigcompany.loans l
      JOIN customer c ON l.borrower_id = c.id
      WHERE l.id = $1 AND l.status = 'pending'
    `, [loanId]);

    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Pending loan not found' });
    }

    const loanData = loan.rows[0];

    if (action === 'approve') {
      // Approve and disburse
      await db.query(`
        UPDATE bigcompany.loans
        SET status = 'disbursed', approved_at = NOW(), disbursed_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [loanId]);

      // Create credit in Blnk
      await blnkService.createLoanCredit(loanData.borrower_id, Number(loanData.principal), loanData.loan_number);

      // Notify customer
      if (loanData.phone) {
        await smsService.send({
          to: loanData.phone,
          message: `BIG: Good news! Your loan of ${Number(loanData.principal).toLocaleString()} RWF has been approved and credited. Due: ${new Date(loanData.due_date).toLocaleDateString()}. Ref: ${loanData.loan_number}`,
        });
      }

      res.json({ success: true, message: 'Loan approved and disbursed', status: 'disbursed' });
    } else {
      // Reject
      await db.query(`
        UPDATE bigcompany.loans
        SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
        WHERE id = $2
      `, [rejection_reason || 'Application did not meet requirements', loanId]);

      // Notify customer
      if (loanData.phone) {
        await smsService.send({
          to: loanData.phone,
          message: `BIG: Your loan application was not approved. Reason: ${rejection_reason || 'Did not meet requirements'}. Build your credit score and try again!`,
        });
      }

      res.json({ success: true, message: 'Loan rejected', status: 'rejected' });
    }
  } catch (error: any) {
    console.error('Loan review error:', error);
    res.status(500).json({ error: 'Failed to review loan' });
  }
}));

/**
 * Admin: Get overdue loans
 * GET /admin/loans/overdue
 */
router.get('/admin/overdue', wrapHandler(async (req, res) => {
  try {
    const loans = await db.query(`
      SELECT l.*, lp.name as product_name, lp.loan_type,
             c.email, c.phone, c.first_name, c.last_name,
             EXTRACT(DAY FROM NOW() - l.due_date) as days_overdue
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      JOIN customer c ON l.borrower_id = c.id
      WHERE l.status IN ('disbursed', 'active') AND l.due_date < NOW()
      ORDER BY l.due_date ASC
    `);

    res.json({
      loans: loans.rows,
      total_overdue: loans.rows.length,
      total_outstanding: loans.rows.reduce((sum, l) => sum + Number(l.outstanding_balance), 0),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get overdue loans' });
  }
}));

export default router;
