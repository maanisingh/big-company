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
   * Initialize the BigCompany ledger structure
   */
  async initializeLedgers(): Promise<{ customerLedger: BlnkLedger; merchantLedger: BlnkLedger; systemLedger: BlnkLedger }> {
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

    return { customerLedger, merchantLedger, systemLedger };
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
   * Disburse loan to customer wallet
   */
  async disburseLoan(
    systemBalanceId: string,
    customerBalanceId: string,
    amount: number,
    loanId: string
  ): Promise<BlnkTransaction> {
    return this.createTransaction({
      amount,
      currency: 'RWF',
      source: systemBalanceId,
      destination: customerBalanceId,
      reference: `LOAN-${loanId}`,
      description: `Loan disbursement for loan ${loanId}`,
      meta_data: { type: 'loan_disbursement', loan_id: loanId },
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
}

export default BlnkService;
