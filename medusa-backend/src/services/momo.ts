import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface MoMoConfig {
  apiKey: string;
  apiUser: string;
  apiSecret: string;
  subscriptionKey: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
}

interface CollectionRequest {
  amount: number;
  currency: string;
  externalId: string;
  payerPhone: string;
  payerMessage?: string;
  payeeNote?: string;
}

interface DisbursementRequest {
  amount: number;
  currency: string;
  externalId: string;
  payeePhone: string;
  payeeNote?: string;
}

interface MoMoResponse {
  success: boolean;
  referenceId?: string;
  status?: string;
  error?: string;
  financialTransactionId?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class MTNMoMoService {
  private config: MoMoConfig;
  private collectionClient: AxiosInstance;
  private disbursementClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl: string;

  constructor() {
    this.config = {
      apiKey: process.env.MOMO_API_KEY || '',
      apiUser: process.env.MOMO_API_USER || '',
      apiSecret: process.env.MOMO_API_SECRET || '',
      subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY || '',
      environment: (process.env.MOMO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      callbackUrl: process.env.MOMO_CALLBACK_URL || 'https://api.bigcompany.rw/webhooks/momo',
    };

    this.baseUrl = this.config.environment === 'production'
      ? 'https://proxy.momoapi.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';

    const commonHeaders = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
    };

    this.collectionClient = axios.create({
      baseURL: `${this.baseUrl}/collection`,
      headers: commonHeaders,
    });

    this.disbursementClient = axios.create({
      baseURL: `${this.baseUrl}/disbursement`,
      headers: commonHeaders,
    });
  }

  /**
   * Get OAuth2 access token for Collection API
   */
  private async getCollectionToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.config.apiUser}:${this.config.apiKey}`).toString('base64');

      const response = await this.collectionClient.post<TokenResponse>(
        '/token/',
        null,
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early

      return this.accessToken;
    } catch (error: any) {
      console.error('MTN MoMo token error:', error.response?.data || error.message);
      throw new Error('Failed to obtain MoMo access token');
    }
  }

  /**
   * Request payment from customer (Collection - RequestToPay)
   */
  async requestPayment(request: CollectionRequest): Promise<MoMoResponse> {
    const referenceId = uuidv4();

    try {
      const token = await this.getCollectionToken();

      // Format phone number to MSISDN format (without +)
      const msisdn = this.formatMSISDN(request.payerPhone);

      await this.collectionClient.post(
        '/v1_0/requesttopay',
        {
          amount: request.amount.toString(),
          currency: request.currency,
          externalId: request.externalId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: msisdn,
          },
          payerMessage: request.payerMessage || `Payment to BIG Company - ${request.externalId}`,
          payeeNote: request.payeeNote || 'Wallet top-up',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': this.config.environment,
            'X-Callback-Url': this.config.callbackUrl,
          },
        }
      );

      return {
        success: true,
        referenceId,
        status: 'PENDING',
      };
    } catch (error: any) {
      console.error('MTN MoMo collection error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Check status of a payment request
   */
  async getPaymentStatus(referenceId: string): Promise<MoMoResponse> {
    try {
      const token = await this.getCollectionToken();

      const response = await this.collectionClient.get(
        `/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this.config.environment,
          },
        }
      );

      return {
        success: true,
        referenceId,
        status: response.data.status,
        financialTransactionId: response.data.financialTransactionId,
      };
    } catch (error: any) {
      console.error('MTN MoMo status check error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send money to customer (Disbursement - Transfer)
   */
  async disburseFunds(request: DisbursementRequest): Promise<MoMoResponse> {
    const referenceId = uuidv4();

    try {
      const credentials = Buffer.from(`${this.config.apiUser}:${this.config.apiKey}`).toString('base64');

      // Get disbursement token
      const tokenResponse = await this.disbursementClient.post<TokenResponse>(
        '/token/',
        null,
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          },
        }
      );

      const msisdn = this.formatMSISDN(request.payeePhone);

      await this.disbursementClient.post(
        '/v1_0/transfer',
        {
          amount: request.amount.toString(),
          currency: request.currency,
          externalId: request.externalId,
          payee: {
            partyIdType: 'MSISDN',
            partyId: msisdn,
          },
          payerMessage: 'BIG Company Disbursement',
          payeeNote: request.payeeNote || 'Funds transfer',
        },
        {
          headers: {
            'Authorization': `Bearer ${tokenResponse.data.access_token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': this.config.environment,
          },
        }
      );

      return {
        success: true,
        referenceId,
        status: 'PENDING',
      };
    } catch (error: any) {
      console.error('MTN MoMo disbursement error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Validate account holder (Check if phone is registered)
   */
  async validateAccount(phone: string): Promise<{ valid: boolean; accountHolderName?: string }> {
    try {
      const token = await this.getCollectionToken();
      const msisdn = this.formatMSISDN(phone);

      const response = await this.collectionClient.get(
        `/v1_0/accountholder/msisdn/${msisdn}/basicuserinfo`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this.config.environment,
          },
        }
      );

      return {
        valid: true,
        accountHolderName: response.data.name,
      };
    } catch (error: any) {
      return { valid: false };
    }
  }

  /**
   * Get account balance (for merchant accounts)
   */
  async getBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      const token = await this.getCollectionToken();

      const response = await this.collectionClient.get(
        '/v1_0/account/balance',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': this.config.environment,
          },
        }
      );

      return {
        balance: parseFloat(response.data.availableBalance),
        currency: response.data.currency,
      };
    } catch (error: any) {
      console.error('MTN MoMo balance error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Format phone number to MSISDN format (250XXXXXXXXX)
   */
  private formatMSISDN(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '250' + cleaned.substring(1);
    } else if (cleaned.startsWith('+250')) {
      cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('250')) {
      cleaned = '250' + cleaned;
    }

    return cleaned;
  }
}

export default MTNMoMoService;
