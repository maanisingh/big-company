import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface AirtelConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
  country: string;
  currency: string;
}

interface AirtelPaymentRequest {
  amount: number;
  phone: string;
  reference: string;
  transactionId?: string;
}

interface AirtelDisbursementRequest {
  amount: number;
  phone: string;
  reference: string;
  recipientName?: string;
}

interface AirtelResponse {
  success: boolean;
  transactionId?: string;
  status?: string;
  message?: string;
  error?: string;
}

interface AirtelTokenResponse {
  access_token: string;
  expires_in: string;
  token_type: string;
}

class AirtelMoneyService {
  private config: AirtelConfig;
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl: string;

  constructor() {
    this.config = {
      clientId: process.env.AIRTEL_CLIENT_ID || '',
      clientSecret: process.env.AIRTEL_CLIENT_SECRET || '',
      environment: (process.env.AIRTEL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      callbackUrl: process.env.AIRTEL_CALLBACK_URL || 'https://api.bigcompany.rw/webhooks/airtel',
      country: 'RW',
      currency: 'RWF',
    };

    this.baseUrl = this.config.environment === 'production'
      ? 'https://openapi.airtel.africa'
      : 'https://openapiuat.airtel.africa';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
    });
  }

  /**
   * Get OAuth2 access token from Airtel
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await this.client.post<AirtelTokenResponse>(
        '/auth/oauth2/token',
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (parseInt(response.data.expires_in) * 1000) - 60000;

      return this.accessToken;
    } catch (error: any) {
      console.error('Airtel Money token error:', error.response?.data || error.message);
      throw new Error('Failed to obtain Airtel access token');
    }
  }

  /**
   * Request payment from customer (USSD Push)
   */
  async requestPayment(request: AirtelPaymentRequest): Promise<AirtelResponse> {
    try {
      const token = await this.getAccessToken();
      const transactionId = request.transactionId || uuidv4().replace(/-/g, '').substring(0, 20);
      const msisdn = this.formatMSISDN(request.phone);

      const response = await this.client.post(
        '/merchant/v1/payments/',
        {
          reference: request.reference,
          subscriber: {
            country: this.config.country,
            currency: this.config.currency,
            msisdn: msisdn,
          },
          transaction: {
            amount: request.amount,
            country: this.config.country,
            currency: this.config.currency,
            id: transactionId,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Country': this.config.country,
            'X-Currency': this.config.currency,
          },
        }
      );

      const data = response.data?.data;
      const status = response.data?.status;

      return {
        success: status?.success === true || status?.code === '200',
        transactionId: data?.transaction?.id || transactionId,
        status: status?.message || 'PENDING',
        message: status?.result_code,
      };
    } catch (error: any) {
      console.error('Airtel Money payment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.status?.message || error.message,
      };
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(transactionId: string): Promise<AirtelResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `/standard/v1/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Country': this.config.country,
            'X-Currency': this.config.currency,
          },
        }
      );

      const data = response.data?.data;
      const status = response.data?.status;

      return {
        success: true,
        transactionId: data?.transaction?.id,
        status: data?.transaction?.status,
        message: status?.message,
      };
    } catch (error: any) {
      console.error('Airtel Money status error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.status?.message || error.message,
      };
    }
  }

  /**
   * Disburse funds to customer
   */
  async disburseFunds(request: AirtelDisbursementRequest): Promise<AirtelResponse> {
    try {
      const token = await this.getAccessToken();
      const transactionId = uuidv4().replace(/-/g, '').substring(0, 20);
      const msisdn = this.formatMSISDN(request.phone);

      const response = await this.client.post(
        '/standard/v1/disbursements/',
        {
          payee: {
            msisdn: msisdn,
            name: request.recipientName || 'BIG Customer',
          },
          reference: request.reference,
          pin: process.env.AIRTEL_PIN || '',
          transaction: {
            amount: request.amount,
            id: transactionId,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Country': this.config.country,
            'X-Currency': this.config.currency,
          },
        }
      );

      const status = response.data?.status;

      return {
        success: status?.success === true || status?.code === '200',
        transactionId,
        status: status?.message,
      };
    } catch (error: any) {
      console.error('Airtel Money disbursement error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.status?.message || error.message,
      };
    }
  }

  /**
   * Check if account is registered with Airtel Money
   */
  async validateAccount(phone: string): Promise<{ valid: boolean; name?: string }> {
    try {
      const token = await this.getAccessToken();
      const msisdn = this.formatMSISDN(phone);

      const response = await this.client.get(
        `/standard/v1/users/${msisdn}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Country': this.config.country,
            'X-Currency': this.config.currency,
          },
        }
      );

      const data = response.data?.data;

      return {
        valid: data?.is_barred === false,
        name: `${data?.first_name || ''} ${data?.last_name || ''}`.trim(),
      };
    } catch (error: any) {
      return { valid: false };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        '/standard/v1/users/balance',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Country': this.config.country,
            'X-Currency': this.config.currency,
          },
        }
      );

      const data = response.data?.data;

      return {
        balance: parseFloat(data?.balance || 0),
        currency: data?.currency || this.config.currency,
      };
    } catch (error: any) {
      console.error('Airtel Money balance error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Refund a transaction
   */
  async refund(transactionId: string): Promise<AirtelResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.post(
        `/standard/v1/payments/refund`,
        {
          transaction: {
            airtel_money_id: transactionId,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Country': this.config.country,
            'X-Currency': this.config.currency,
          },
        }
      );

      const status = response.data?.status;

      return {
        success: status?.success === true,
        message: status?.message,
      };
    } catch (error: any) {
      console.error('Airtel Money refund error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.status?.message || error.message,
      };
    }
  }

  /**
   * Format phone number to MSISDN format (without country code for Airtel)
   */
  private formatMSISDN(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    // Airtel Rwanda uses format without country code in some endpoints
    if (cleaned.startsWith('250')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    return cleaned;
  }
}

export default AirtelMoneyService;
