/**
 * Wallet Balance Service
 * Manages separate wallet and loan balances with transfer restrictions
 * Sprint 4: Loan Balance Separation
 */

import { Pool } from 'pg';
import { BlnkService } from './blnk';

// Database connection (adjust based on your config)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bigcompany',
  user: process.env.DB_USER || 'bigcompany_app',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ==================== INTERFACES ====================

export interface WalletBalance {
  userId: string;
  userType: 'consumer' | 'retailer' | 'wholesaler';
  walletBalance: number;
  loanBalance: number;
  totalBalance: number;
  availableForTransfer: number;
  loanLimit: number;
  dailyTransferLimit: number;
  lastLoanDisbursement?: Date;
  lastTransfer?: Date;
  currency: string;
  isActive: boolean;
}

export interface BalanceDetails {
  walletBalance: number;
  loanBalance: number;
  totalBalance: number;
  availableForTransfer: number;
  availableForPurchase: number;
  loanLimit: number;
}

export interface BalanceTransaction {
  id: string;
  userId: string;
  transactionType: string;
  balanceType: 'wallet' | 'loan';
  amount: number;
  direction: 'credit' | 'debit';
  walletBalanceBefore: number;
  walletBalanceAfter: number;
  loanBalanceBefore: number;
  loanBalanceAfter: number;
  referenceId?: string;
  referenceType?: string;
  description?: string;
  blnkTransactionId?: string;
  createdAt: Date;
}

export interface TransferValidation {
  canTransfer: boolean;
  reason?: string;
  walletBalance: number;
  requiredAmount: number;
  shortfall?: number;
}

export interface PurchaseValidation {
  canPurchase: boolean;
  reason?: string;
  totalBalance: number;
  requiredAmount: number;
  shortfall?: number;
  suggestedSplit?: {
    fromWallet: number;
    fromLoan: number;
  };
}

// ==================== WALLET BALANCE SERVICE ====================

export default class WalletBalanceService {
  private blnkService: BlnkService;
  private walletLedgerId: string;
  private loanLedgerId: string;
  private container: any;

  constructor(container?: any) {
    this.container = container;
    // Only initialize BlnkService if container is provided
    this.blnkService = container ? new BlnkService(container) : null as any;
    // Get ledger IDs from environment or initialize them
    this.walletLedgerId = process.env.BLNK_WALLET_LEDGER_ID || '';
    this.loanLedgerId = process.env.BLNK_LOAN_LEDGER_ID || '';
  }

  /**
   * Get balance details for a user
   */
  async getBalanceDetails(userId: string): Promise<BalanceDetails | null> {
    const query = `SELECT * FROM bigcompany.get_balance_details($1)`;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      walletBalance: parseFloat(row.wallet_balance),
      loanBalance: parseFloat(row.loan_balance),
      totalBalance: parseFloat(row.total_balance),
      availableForTransfer: parseFloat(row.available_for_transfer),
      availableForPurchase: parseFloat(row.available_for_purchase),
      loanLimit: parseFloat(row.loan_limit),
    };
  }

  /**
   * Get full wallet balance record
   */
  async getWalletBalance(userId: string): Promise<WalletBalance | null> {
    const query = `
      SELECT
        user_id, user_type, wallet_balance, loan_balance,
        total_balance, available_for_transfer, loan_limit,
        daily_transfer_limit, last_loan_disbursement, last_transfer,
        currency, is_active
      FROM bigcompany.wallet_balances
      WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.mapWalletBalance(row);
  }

  /**
   * Create or initialize wallet balance for new user
   * Sprint 4: Also creates Blnk balances and stores their IDs
   */
  async createWalletBalance(
    userId: string,
    userType: 'consumer' | 'retailer' | 'wholesaler',
    loanLimit: number = 0
  ): Promise<WalletBalance> {
    // Create Blnk balances first
    let blnkWalletBalanceId: string | null = null;
    let blnkLoanBalanceId: string | null = null;

    try {
      if (this.walletLedgerId && this.loanLedgerId) {
        const blnkBalances = await this.blnkService.createUserBalances(
          userId,
          userType,
          this.walletLedgerId,
          this.loanLedgerId
        );
        blnkWalletBalanceId = blnkBalances.walletBalance.balance_id;
        blnkLoanBalanceId = blnkBalances.loanBalance.balance_id;
      }
    } catch (error) {
      console.error('Failed to create Blnk balances:', error);
      // Continue without Blnk integration if it fails
    }

    // Create local wallet balance record
    const query = `
      INSERT INTO bigcompany.wallet_balances (
        user_id, user_type, loan_limit,
        blnk_wallet_balance_id, blnk_loan_balance_id
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO UPDATE
      SET
        user_type = EXCLUDED.user_type,
        loan_limit = EXCLUDED.loan_limit,
        blnk_wallet_balance_id = COALESCE(EXCLUDED.blnk_wallet_balance_id, bigcompany.wallet_balances.blnk_wallet_balance_id),
        blnk_loan_balance_id = COALESCE(EXCLUDED.blnk_loan_balance_id, bigcompany.wallet_balances.blnk_loan_balance_id)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, userType, loanLimit, blnkWalletBalanceId, blnkLoanBalanceId]);
    return this.mapWalletBalance(result.rows[0]);
  }

  /**
   * Validate transfer (can only use wallet balance, not loan)
   */
  async validateTransfer(userId: string, amount: number): Promise<TransferValidation> {
    const balance = await this.getBalanceDetails(userId);

    if (!balance) {
      return {
        canTransfer: false,
        reason: 'Wallet not found',
        walletBalance: 0,
        requiredAmount: amount,
        shortfall: amount,
      };
    }

    const canTransfer = balance.walletBalance >= amount;

    return {
      canTransfer,
      reason: canTransfer
        ? undefined
        : 'Insufficient wallet balance. Loan balance cannot be used for transfers.',
      walletBalance: balance.walletBalance,
      requiredAmount: amount,
      shortfall: canTransfer ? undefined : amount - balance.walletBalance,
    };
  }

  /**
   * Validate purchase (can use wallet + loan balance)
   */
  async validatePurchase(userId: string, amount: number): Promise<PurchaseValidation> {
    const balance = await this.getBalanceDetails(userId);

    if (!balance) {
      return {
        canPurchase: false,
        reason: 'Wallet not found',
        totalBalance: 0,
        requiredAmount: amount,
        shortfall: amount,
      };
    }

    const canPurchase = balance.totalBalance >= amount;

    let suggestedSplit = undefined;
    if (canPurchase && balance.walletBalance < amount) {
      // Need to use both wallet and loan
      suggestedSplit = {
        fromWallet: balance.walletBalance,
        fromLoan: amount - balance.walletBalance,
      };
    }

    return {
      canPurchase,
      reason: canPurchase ? undefined : 'Insufficient balance',
      totalBalance: balance.totalBalance,
      requiredAmount: amount,
      shortfall: canPurchase ? undefined : amount - balance.totalBalance,
      suggestedSplit,
    };
  }

  /**
   * Credit wallet balance (top-up, refund, etc.)
   */
  async creditWallet(
    userId: string,
    amount: number,
    transactionType: string,
    description?: string,
    referenceId?: string,
    referenceType?: string,
    blnkTransactionId?: string
  ): Promise<BalanceTransaction> {
    const transactionId = await this.recordTransaction(
      userId,
      transactionType,
      'wallet',
      amount,
      'credit',
      referenceId,
      referenceType,
      description,
      blnkTransactionId
    );

    return this.getTransaction(transactionId);
  }

  /**
   * Debit wallet balance (purchase, transfer, etc.)
   */
  async debitWallet(
    userId: string,
    amount: number,
    transactionType: string,
    description?: string,
    referenceId?: string,
    referenceType?: string,
    blnkTransactionId?: string
  ): Promise<BalanceTransaction> {
    // Validate sufficient wallet balance
    const validation = await this.validateTransfer(userId, amount);
    if (!validation.canTransfer) {
      throw new Error(validation.reason || 'Insufficient wallet balance');
    }

    const transactionId = await this.recordTransaction(
      userId,
      transactionType,
      'wallet',
      amount,
      'debit',
      referenceId,
      referenceType,
      description,
      blnkTransactionId
    );

    return this.getTransaction(transactionId);
  }

  /**
   * Credit loan balance (loan disbursement)
   */
  async creditLoan(
    userId: string,
    amount: number,
    transactionType: string = 'loan_disbursement',
    description?: string,
    referenceId?: string,
    referenceType?: string,
    blnkTransactionId?: string
  ): Promise<BalanceTransaction> {
    const balance = await this.getBalanceDetails(userId);

    if (!balance) {
      throw new Error('Wallet not found');
    }

    // Check loan limit
    if (balance.loanBalance + amount > balance.loanLimit) {
      throw new Error(`Loan limit exceeded. Current: ${balance.loanBalance}, Limit: ${balance.loanLimit}`);
    }

    const transactionId = await this.recordTransaction(
      userId,
      transactionType,
      'loan',
      amount,
      'credit',
      referenceId,
      referenceType,
      description,
      blnkTransactionId
    );

    // Update last_loan_disbursement
    await pool.query(
      `UPDATE bigcompany.wallet_balances SET last_loan_disbursement = NOW() WHERE user_id = $1`,
      [userId]
    );

    return this.getTransaction(transactionId);
  }

  /**
   * Debit loan balance (loan repayment)
   */
  async debitLoan(
    userId: string,
    amount: number,
    transactionType: string = 'loan_repayment',
    description?: string,
    referenceId?: string,
    referenceType?: string,
    blnkTransactionId?: string
  ): Promise<BalanceTransaction> {
    const balance = await this.getBalanceDetails(userId);

    if (!balance) {
      throw new Error('Wallet not found');
    }

    if (balance.loanBalance < amount) {
      throw new Error(`Insufficient loan balance. Current: ${balance.loanBalance}, Required: ${amount}`);
    }

    const transactionId = await this.recordTransaction(
      userId,
      transactionType,
      'loan',
      amount,
      'debit',
      referenceId,
      referenceType,
      description,
      blnkTransactionId
    );

    return this.getTransaction(transactionId);
  }

  /**
   * Process purchase with automatic split (wallet first, then loan)
   */
  async processPurchase(
    userId: string,
    amount: number,
    orderId: string,
    description?: string
  ): Promise<{
    walletTransaction?: BalanceTransaction;
    loanTransaction?: BalanceTransaction;
    totalPaid: number;
    fromWallet: number;
    fromLoan: number;
  }> {
    const validation = await this.validatePurchase(userId, amount);

    if (!validation.canPurchase) {
      throw new Error(validation.reason || 'Insufficient balance for purchase');
    }

    const balance = await this.getBalanceDetails(userId);
    if (!balance) {
      throw new Error('Wallet not found');
    }

    let walletTransaction: BalanceTransaction | undefined;
    let loanTransaction: BalanceTransaction | undefined;
    let fromWallet = 0;
    let fromLoan = 0;

    // Use wallet balance first
    if (balance.walletBalance > 0) {
      fromWallet = Math.min(balance.walletBalance, amount);
      walletTransaction = await this.debitWallet(
        userId,
        fromWallet,
        'purchase',
        description || `Purchase order ${orderId}`,
        orderId,
        'order'
      );
    }

    // Use loan balance if needed
    const remaining = amount - fromWallet;
    if (remaining > 0 && balance.loanBalance >= remaining) {
      fromLoan = remaining;
      loanTransaction = await this.debitLoan(
        userId,
        fromLoan,
        'purchase',
        description || `Purchase order ${orderId} (loan portion)`,
        orderId,
        'order'
      );
    }

    return {
      walletTransaction,
      loanTransaction,
      totalPaid: fromWallet + fromLoan,
      fromWallet,
      fromLoan,
    };
  }

  /**
   * Log restricted transfer attempt
   */
  async logRestrictedTransfer(
    userId: string,
    attemptedAmount: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const query = `SELECT bigcompany.log_restricted_transfer($1, $2, $3, $4)`;
    const result = await pool.query(query, [userId, attemptedAmount, ipAddress, userAgent]);
    return result.rows[0].log_restricted_transfer;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    balanceType?: 'wallet' | 'loan'
  ): Promise<BalanceTransaction[]> {
    let query = `
      SELECT * FROM bigcompany.balance_transactions
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (balanceType) {
      query += ` AND balance_type = $${params.length + 1}`;
      params.push(balanceType);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map((row) => this.mapBalanceTransaction(row));
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats(userId: string): Promise<{
    totalCredits: number;
    totalDebits: number;
    netChange: number;
    transactionCount: number;
    lastTransaction?: Date;
  }> {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) as net_change,
        COUNT(*) as transaction_count,
        MAX(created_at) as last_transaction
      FROM bigcompany.balance_transactions
      WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    const row = result.rows[0];

    return {
      totalCredits: parseFloat(row.total_credits),
      totalDebits: parseFloat(row.total_debits),
      netChange: parseFloat(row.net_change),
      transactionCount: parseInt(row.transaction_count),
      lastTransaction: row.last_transaction,
    };
  }

  // ==================== PRIVATE METHODS ====================

  private async recordTransaction(
    userId: string,
    transactionType: string,
    balanceType: 'wallet' | 'loan',
    amount: number,
    direction: 'credit' | 'debit',
    referenceId?: string,
    referenceType?: string,
    description?: string,
    blnkTransactionId?: string,
    createdBy?: string
  ): Promise<string> {
    const query = `
      SELECT bigcompany.record_balance_transaction(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) as transaction_id
    `;
    const result = await pool.query(query, [
      userId,
      transactionType,
      balanceType,
      amount,
      direction,
      referenceId,
      referenceType,
      description,
      blnkTransactionId,
      createdBy,
    ]);

    return result.rows[0].transaction_id;
  }

  private async getTransaction(transactionId: string): Promise<BalanceTransaction> {
    const query = `SELECT * FROM bigcompany.balance_transactions WHERE id = $1`;
    const result = await pool.query(query, [transactionId]);

    if (result.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    return this.mapBalanceTransaction(result.rows[0]);
  }

  private mapWalletBalance(row: any): WalletBalance {
    return {
      userId: row.user_id,
      userType: row.user_type,
      walletBalance: parseFloat(row.wallet_balance),
      loanBalance: parseFloat(row.loan_balance),
      totalBalance: parseFloat(row.total_balance),
      availableForTransfer: parseFloat(row.available_for_transfer),
      loanLimit: parseFloat(row.loan_limit),
      dailyTransferLimit: parseFloat(row.daily_transfer_limit),
      lastLoanDisbursement: row.last_loan_disbursement,
      lastTransfer: row.last_transfer,
      currency: row.currency,
      isActive: row.is_active,
    };
  }

  private mapBalanceTransaction(row: any): BalanceTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      transactionType: row.transaction_type,
      balanceType: row.balance_type,
      amount: parseFloat(row.amount),
      direction: row.direction,
      walletBalanceBefore: parseFloat(row.wallet_balance_before),
      walletBalanceAfter: parseFloat(row.wallet_balance_after),
      loanBalanceBefore: parseFloat(row.loan_balance_before),
      loanBalanceAfter: parseFloat(row.loan_balance_after),
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      description: row.description,
      blnkTransactionId: row.blnk_transaction_id,
      createdAt: row.created_at,
    };
  }
}

// Export as named export for imports that use: import { WalletBalanceService }
export { WalletBalanceService };

// Note: WalletBalanceService should be initialized with a container
// For use in Medusa services, inject via dependency injection
// For standalone use, create instance: new WalletBalanceService(container)
