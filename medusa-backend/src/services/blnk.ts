import axios, { AxiosInstance } from 'axios';
import { TransactionBaseService } from '@medusajs/medusa';

interface BlnkLedger {
  ledger_id: string;
  name: string;
  created_at: string;
  meta_data?: Record<string, any>;
}

interface BlnkBalance {
  balance_id: string;
  balance: number;
  credit_balance: number;
  debit_balance: number;
  currency: string;
  ledger_id: string;
  identity_id?: string;
  created_at: string;
  meta_data?: Record<string, any>;
}

interface BlnkTransaction {
  transaction_id: string;
  amount: number;
  currency: string;
  source: string;
  destination: string;
  reference: string;
  description: string;
  status: string;
  created_at: string;
  meta_data?: Record<string, any>;
}

interface CreateLedgerInput {
  name: string;
  meta_data?: Record<string, any>;
}

interface CreateBalanceInput {
  ledger_id: string;
  currency: string;
  identity_id?: string;
  meta_data?: Record<string, any>;
}

interface CreateTransactionInput {
  amount: number;
  currency: string;
  source: string;
  destination: string;
  reference: string;
  description?: string;
  meta_data?: Record<string, any>;
}

class BlnkService extends TransactionBaseService {
  private client: AxiosInstance;
  private blnkUrl: string;

  constructor(container: any) {
    super(container);
    this.blnkUrl = process.env.BLNK_API_URL || 'http://localhost:5001';
    this.client = axios.create({
      baseURL: this.blnkUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ==================== LEDGERS ====================

  async createLedger(input: CreateLedgerInput): Promise<BlnkLedger> {
    try {
      const response = await this.client.post('/ledgers', input);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create ledger: ${error.message}`);
    }
  }

  async getLedger(ledgerId: string): Promise<BlnkLedger> {
    try {
      const response = await this.client.get(`/ledgers/${ledgerId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get ledger: ${error.message}`);
    }
  }

  async listLedgers(): Promise<BlnkLedger[]> {
    try {
      const response = await this.client.get('/ledgers');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to list ledgers: ${error.message}`);
    }
  }

  // ==================== BALANCES ====================

  async createBalance(input: CreateBalanceInput): Promise<BlnkBalance> {
    try {
      const response = await this.client.post('/balances', input);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create balance: ${error.message}`);
    }
  }

  async getBalance(balanceId: string): Promise<BlnkBalance> {
    try {
      const response = await this.client.get(`/balances/${balanceId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async listBalances(ledgerId?: string): Promise<BlnkBalance[]> {
    try {
      const url = ledgerId ? `/balances?ledger_id=${ledgerId}` : '/balances';
      const response = await this.client.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to list balances: ${error.message}`);
    }
  }

  // ==================== TRANSACTIONS ====================

  async createTransaction(input: CreateTransactionInput): Promise<BlnkTransaction> {
    try {
      const response = await this.client.post('/transactions', input);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  async getTransaction(transactionId: string): Promise<BlnkTransaction> {
    try {
      const response = await this.client.get(`/transactions/${transactionId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  async listTransactions(balanceId?: string): Promise<BlnkTransaction[]> {
    try {
      const url = balanceId ? `/transactions?balance_id=${balanceId}` : '/transactions';
      const response = await this.client.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to list transactions: ${error.message}`);
    }
  }

  // ==================== BIGCOMPANY HELPERS ====================

  /**
   * Initialize the BigCompany ledger structure with separate wallet and loan ledgers
   * Sprint 4: Wallet and Loan Balance Separation
   * Sprint 5: Company and Gas Station revenue split ledgers
   */
  async initializeLedgers(): Promise<{
    customerLedger: BlnkLedger;
    merchantLedger: BlnkLedger;
    systemLedger: BlnkLedger;
    walletBalancesLedger: BlnkLedger;
    loanBalancesLedger: BlnkLedger;
    companyRevenueLedger: BlnkLedger;
    gasStationRevenueLedger: BlnkLedger;
  }> {
    const customerLedger = await this.createLedger({
      name: 'customer_wallets',
      meta_data: { type: 'customer', currency: 'RWF' },
    });

    const merchantLedger = await this.createLedger({
      name: 'merchant_wallets',
      meta_data: { type: 'merchant', currency: 'RWF' },
    });

    const systemLedger = await this.createLedger({
      name: 'system_accounts',
      meta_data: { type: 'system', currency: 'RWF' },
    });

    // Sprint 4: Separate ledgers for wallet and loan balances
    const walletBalancesLedger = await this.createLedger({
      name: 'wallet_balances',
      meta_data: { type: 'wallet', currency: 'RWF', description: 'Regular wallet balances - transferable, withdrawable' },
    });

    const loanBalancesLedger = await this.createLedger({
      name: 'loan_balances',
      meta_data: { type: 'loan', currency: 'RWF', description: 'Loan balances - purchase-only, non-transferable' },
    });

    // Sprint 5: Company and Gas Station revenue ledgers
    const companyRevenueLedger = await this.createLedger({
      name: 'company_revenue',
      meta_data: {
        type: 'revenue',
        currency: 'RWF',
        description: 'Company revenue - 28% commission from each transaction',
        profit_share: 0.28
      },
    });

    const gasStationRevenueLedger = await this.createLedger({
      name: 'gas_station_revenue',
      meta_data: {
        type: 'revenue',
        currency: 'RWF',
        description: 'Gas station rewards - 12% from each transaction',
        profit_share: 0.12
      },
    });

    return {
      customerLedger,
      merchantLedger,
      systemLedger,
      walletBalancesLedger,
      loanBalancesLedger,
      companyRevenueLedger,
      gasStationRevenueLedger
    };
  }

  /**
   * Create a customer wallet
   */
  async createCustomerWallet(customerId: string, ledgerId: string): Promise<BlnkBalance> {
    return this.createBalance({
      ledger_id: ledgerId,
      currency: 'RWF',
      identity_id: customerId,
      meta_data: { type: 'customer_wallet', customer_id: customerId },
    });
  }

  /**
   * Create a merchant wallet
   */
  async createMerchantWallet(merchantId: string, ledgerId: string, merchantType: 'retailer' | 'wholesaler'): Promise<BlnkBalance> {
    return this.createBalance({
      ledger_id: ledgerId,
      currency: 'RWF',
      identity_id: merchantId,
      meta_data: { type: 'merchant_wallet', merchant_id: merchantId, merchant_type: merchantType },
    });
  }

  /**
   * Create both wallet and loan balances for a user
   * Sprint 4: Each user needs two separate balance IDs
   */
  async createUserBalances(
    userId: string,
    userType: 'consumer' | 'retailer' | 'wholesaler',
    walletLedgerId: string,
    loanLedgerId: string
  ): Promise<{ walletBalance: BlnkBalance; loanBalance: BlnkBalance }> {
    const walletBalance = await this.createBalance({
      ledger_id: walletLedgerId,
      currency: 'RWF',
      identity_id: userId,
      meta_data: { type: 'wallet_balance', user_id: userId, user_type: userType },
    });

    const loanBalance = await this.createBalance({
      ledger_id: loanLedgerId,
      currency: 'RWF',
      identity_id: userId,
      meta_data: { type: 'loan_balance', user_id: userId, user_type: userType },
    });

    return { walletBalance, loanBalance };
  }

  /**
   * Top up customer wallet (from mobile money)
   */
  async topUpWallet(
    customerBalanceId: string,
    systemBalanceId: string,
    amount: number,
    reference: string,
    paymentMethod: string
  ): Promise<BlnkTransaction> {
    return this.createTransaction({
      amount,
      currency: 'RWF',
      source: systemBalanceId, // System account (mobile money collection)
      destination: customerBalanceId,
      reference,
      description: `Wallet top-up via ${paymentMethod}`,
      meta_data: { type: 'topup', payment_method: paymentMethod },
    });
  }

  /**
   * Pay from customer wallet to merchant
   */
  async payFromWallet(
    customerBalanceId: string,
    merchantBalanceId: string,
    amount: number,
    orderId: string
  ): Promise<BlnkTransaction> {
    return this.createTransaction({
      amount,
      currency: 'RWF',
      source: customerBalanceId,
      destination: merchantBalanceId,
      reference: `ORDER-${orderId}`,
      description: `Payment for order ${orderId}`,
      meta_data: { type: 'order_payment', order_id: orderId },
    });
  }

  /**
   * Disburse loan to customer loan balance
   * Sprint 4: Loans now go to separate loan balance, not wallet balance
   */
  async disburseLoan(
    systemBalanceId: string,
    customerLoanBalanceId: string,
    amount: number,
    loanId: string
  ): Promise<BlnkTransaction> {
    return this.createTransaction({
      amount,
      currency: 'RWF',
      source: systemBalanceId,
      destination: customerLoanBalanceId, // Now goes to loan balance instead of wallet
      reference: `LOAN-${loanId}`,
      description: `Loan disbursement for loan ${loanId}`,
      meta_data: { type: 'loan_disbursement', loan_id: loanId, balance_type: 'loan' },
    });
  }

  /**
   * Repay loan from customer wallet
   */
  async repayLoan(
    customerBalanceId: string,
    systemBalanceId: string,
    amount: number,
    loanId: string
  ): Promise<BlnkTransaction> {
    return this.createTransaction({
      amount,
      currency: 'RWF',
      source: customerBalanceId,
      destination: systemBalanceId,
      reference: `LOAN-REPAY-${loanId}`,
      description: `Loan repayment for loan ${loanId}`,
      meta_data: { type: 'loan_repayment', loan_id: loanId },
    });
  }

  /**
   * Get customer wallet balance
   */
  async getCustomerBalance(customerId: string, ledgerId: string): Promise<number> {
    const balances = await this.listBalances(ledgerId);
    const customerBalance = balances.find(
      (b) => b.meta_data?.customer_id === customerId
    );
    return customerBalance ? customerBalance.balance : 0;
  }

  // ==================== SPRINT 4: WALLET/LOAN BALANCE METHODS ====================

  /**
   * Credit wallet balance (top-up, refund, etc.)
   */
  async creditWalletBalance(
    systemBalanceId: string,
    walletBalanceId: string,
    amount: number,
    reference: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<BlnkTransaction> {
    return this.createTransaction({
      amount,
      currency: 'RWF',
      source: systemBalanceId,
      destination: walletBalanceId,
      reference,
      description,
      meta_data: { ...metadata, balance_type: 'wallet' },
    });
  }

  /**
   * Debit wallet balance (purchase, transfer, etc.)
   */
  async debitWalletBalance(
    walletBalanceId: string,
    destinationBalanceId: string,
    amount: number,
    reference: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<BlnkTransaction> {
    return this.createTransaction({
      amount,
      currency: 'RWF',
      source: walletBalanceId,
      destination: destinationBalanceId,
      reference,
      description,
      meta_data: { ...metadata, balance_type: 'wallet' },
    });
  }

  /**
   * Credit loan balance (loan disbursement)
   */
  async creditLoanBalance(
    systemBalanceId: string,
    loanBalanceId: string,
    amount: number,
    reference: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<BlnkTransaction> {
    return this.createTransaction({
      amount,
      currency: 'RWF',
      source: systemBalanceId,
      destination: loanBalanceId,
      reference,
      description,
      meta_data: { ...metadata, balance_type: 'loan' },
    });
  }

  /**
   * Debit loan balance (loan repayment or purchase using loan)
   */
  async debitLoanBalance(
    loanBalanceId: string,
    destinationBalanceId: string,
    amount: number,
    reference: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<BlnkTransaction> {
    return this.createTransaction({
      amount,
      currency: 'RWF',
      source: loanBalanceId,
      destination: destinationBalanceId,
      reference,
      description,
      meta_data: { ...metadata, balance_type: 'loan' },
    });
  }

  /**
   * Get user's wallet and loan balances
   */
  async getUserBalances(
    walletBalanceId: string,
    loanBalanceId: string
  ): Promise<{ walletBalance: number; loanBalance: number; totalBalance: number }> {
    const [wallet, loan] = await Promise.all([
      this.getBalance(walletBalanceId),
      this.getBalance(loanBalanceId),
    ]);

    return {
      walletBalance: wallet.balance,
      loanBalance: loan.balance,
      totalBalance: wallet.balance + loan.balance,
    };
  }

  /**
   * Process payment with profit split (60% retailer, 28% company, 12% gas)
   * Sprint 5: Implement revenue sharing model
   */
  async processPaymentWithSplit(
    customerBalanceId: string,
    retailerBalanceId: string,
    companyBalanceId: string,
    gasStationBalanceId: string,
    totalAmount: number,
    orderId: string,
    metadata?: Record<string, any>
  ): Promise<{
    customerTransaction: BlnkTransaction;
    retailerTransaction: BlnkTransaction;
    companyTransaction: BlnkTransaction;
    gasTransaction: BlnkTransaction;
    split: { retailer: number; company: number; gas: number };
  }> {
    // Calculate profit split
    const retailerAmount = Math.round(totalAmount * 0.60);
    const companyAmount = Math.round(totalAmount * 0.28);
    const gasAmount = Math.round(totalAmount * 0.12);

    // Verify split adds up (with rounding adjustment)
    const splitTotal = retailerAmount + companyAmount + gasAmount;
    const adjustment = totalAmount - splitTotal;

    // Add any rounding adjustment to retailer
    const finalRetailerAmount = retailerAmount + adjustment;

    // 1. Debit customer
    const customerTransaction = await this.createTransaction({
      amount: totalAmount,
      currency: 'RWF',
      source: customerBalanceId,
      destination: retailerBalanceId, // Goes to retailer first, then split
      reference: `ORDER-${orderId}`,
      description: `Payment for order ${orderId}`,
      meta_data: { ...metadata, type: 'customer_payment', order_id: orderId },
    });

    // 2. Credit retailer (60%)
    const retailerTransaction = await this.createTransaction({
      amount: finalRetailerAmount,
      currency: 'RWF',
      source: retailerBalanceId,
      destination: retailerBalanceId,
      reference: `ORDER-${orderId}-RETAILER`,
      description: `Retailer revenue (60%) for order ${orderId}`,
      meta_data: { ...metadata, type: 'retailer_revenue', order_id: orderId, share_percentage: 60 },
    });

    // 3. Credit company (28%)
    const companyTransaction = await this.createTransaction({
      amount: companyAmount,
      currency: 'RWF',
      source: retailerBalanceId,
      destination: companyBalanceId,
      reference: `ORDER-${orderId}-COMPANY`,
      description: `Company commission (28%) for order ${orderId}`,
      meta_data: { ...metadata, type: 'company_commission', order_id: orderId, share_percentage: 28 },
    });

    // 4. Credit gas station (12%)
    const gasTransaction = await this.createTransaction({
      amount: gasAmount,
      currency: 'RWF',
      source: retailerBalanceId,
      destination: gasStationBalanceId,
      reference: `ORDER-${orderId}-GAS`,
      description: `Gas rewards (12%) for order ${orderId}`,
      meta_data: { ...metadata, type: 'gas_rewards', order_id: orderId, share_percentage: 12 },
    });

    return {
      customerTransaction,
      retailerTransaction,
      companyTransaction,
      gasTransaction,
      split: {
        retailer: finalRetailerAmount,
        company: companyAmount,
        gas: gasAmount,
      },
    };
  }

  /**
   * Create balance for company revenue collection
   */
  async createCompanyRevenueBalance(ledgerId: string): Promise<BlnkBalance> {
    return this.createBalance({
      ledger_id: ledgerId,
      currency: 'RWF',
      meta_data: { type: 'company_revenue', description: '28% commission from all transactions' },
    });
  }

  /**
   * Create balance for gas station rewards collection
   */
  async createGasStationBalance(ledgerId: string, gasStationId?: string): Promise<BlnkBalance> {
    return this.createBalance({
      ledger_id: ledgerId,
      currency: 'RWF',
      meta_data: {
        type: 'gas_station_rewards',
        gas_station_id: gasStationId || 'default',
        description: '12% rewards from all transactions'
      },
    });
  }
}

export default BlnkService;
