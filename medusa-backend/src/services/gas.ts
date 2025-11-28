import axios, { AxiosInstance } from 'axios';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface GasTopupRequest {
  meterNumber: string;
  amount: number;
  customerId: string;
  phone: string;
}

interface GasTopupResponse {
  success: boolean;
  transactionId?: string;
  token?: string;
  units?: number;
  message?: string;
  error?: string;
}

interface GasMeterInfo {
  meterNumber: string;
  customerName?: string;
  address?: string;
  tariff?: string;
  balance?: number;
  lastPurchase?: {
    date: string;
    amount: number;
    units: number;
  };
}

// Rwanda Gas/Electricity providers
// RECO/EUCL for electricity, various for gas
// This implementation supports multiple providers

class GasService {
  private db: Pool;
  private providers: Map<string, AxiosInstance> = new Map();
  private predefinedAmounts = [300, 500, 1000, 2000, 5000, 10000];

  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize provider clients
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // EUCL/RECO Rwanda Electricity (also handles prepaid gas meters)
    if (process.env.EUCL_API_URL) {
      this.providers.set('eucl', axios.create({
        baseURL: process.env.EUCL_API_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EUCL_API_KEY}`,
        },
      }));
    }

    // SP (Service Provider) for prepaid utilities via IremboGov
    if (process.env.IREMBO_API_URL) {
      this.providers.set('irembo', axios.create({
        baseURL: process.env.IREMBO_API_URL,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.IREMBO_API_KEY || '',
        },
      }));
    }

    // PayGo/UpOwa style prepaid gas meters
    if (process.env.PAYGO_API_URL) {
      this.providers.set('paygo', axios.create({
        baseURL: process.env.PAYGO_API_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PAYGO_API_KEY}`,
        },
      }));
    }

    // Generic STS (Standard Transfer Specification) provider
    // Most prepaid meters in Africa use STS protocol
    if (process.env.STS_VENDOR_URL) {
      this.providers.set('sts', axios.create({
        baseURL: process.env.STS_VENDOR_URL,
        headers: {
          'Content-Type': 'application/json',
          'X-Vendor-Code': process.env.STS_VENDOR_CODE || '',
          'X-API-Key': process.env.STS_API_KEY || '',
        },
      }));
    }
  }

  /**
   * Validate meter number and get customer info
   */
  async validateMeter(meterNumber: string): Promise<GasMeterInfo | null> {
    // Clean meter number
    const cleanMeter = meterNumber.replace(/\D/g, '');

    // Try STS provider first (most common)
    const stsClient = this.providers.get('sts');
    if (stsClient) {
      try {
        const response = await stsClient.post('/meter/validate', {
          meterNumber: cleanMeter,
        });

        if (response.data.valid) {
          return {
            meterNumber: cleanMeter,
            customerName: response.data.customerName,
            address: response.data.address,
            tariff: response.data.tariff,
            balance: response.data.balance,
          };
        }
      } catch (error) {
        console.log('STS validation failed, trying other providers...');
      }
    }

    // Try EUCL
    const euclClient = this.providers.get('eucl');
    if (euclClient) {
      try {
        const response = await euclClient.get(`/meters/${cleanMeter}`);
        return {
          meterNumber: cleanMeter,
          customerName: response.data.customer_name,
          address: response.data.location,
          tariff: response.data.tariff_code,
        };
      } catch (error) {
        console.log('EUCL validation failed...');
      }
    }

    // If no provider configured, use simulation for development
    if (this.providers.size === 0) {
      // Simulate valid meter for testing
      if (cleanMeter.length >= 11) {
        return {
          meterNumber: cleanMeter,
          customerName: 'Test Customer',
          address: 'Kigali, Rwanda',
          tariff: 'RESIDENTIAL',
        };
      }
    }

    return null;
  }

  /**
   * Purchase gas/electricity units
   */
  async purchaseUnits(request: GasTopupRequest): Promise<GasTopupResponse> {
    const { meterNumber, amount, customerId, phone } = request;

    // Validate amount
    if (!this.predefinedAmounts.includes(amount)) {
      return {
        success: false,
        error: `Invalid amount. Valid amounts: ${this.predefinedAmounts.join(', ')} RWF`,
      };
    }

    // Clean and validate meter
    const cleanMeter = meterNumber.replace(/\D/g, '');
    const meterInfo = await this.validateMeter(cleanMeter);

    if (!meterInfo) {
      return {
        success: false,
        error: 'Invalid meter number',
      };
    }

    const transactionId = `GAS-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // Record the transaction
    await this.db.query(`
      INSERT INTO bigcompany.utility_topups
      (user_id, amount, currency, status, provider_reference, metadata)
      VALUES ($1, $2, 'RWF', 'processing', $3, $4)
    `, [customerId, amount, transactionId, JSON.stringify({
      meter_number: cleanMeter,
      phone: phone,
      meter_info: meterInfo,
    })]);

    // Try to purchase from providers
    const result = await this.executePurchase(cleanMeter, amount, transactionId);

    if (result.success) {
      // Update transaction with token
      await this.db.query(`
        UPDATE bigcompany.utility_topups
        SET status = 'success', token = $1, units_purchased = $2
        WHERE provider_reference = $3
      `, [result.token, result.units, transactionId]);

      // Link meter to user if not already linked
      await this.linkMeterToUser(customerId, cleanMeter, meterInfo);

      return {
        success: true,
        transactionId,
        token: result.token,
        units: result.units,
        message: `Successfully purchased ${result.units} units for meter ${cleanMeter}`,
      };
    } else {
      // Update transaction as failed
      await this.db.query(`
        UPDATE bigcompany.utility_topups
        SET status = 'failed', metadata = metadata || $1
        WHERE provider_reference = $2
      `, [JSON.stringify({ error: result.error }), transactionId]);

      return {
        success: false,
        error: result.error || 'Failed to purchase units',
      };
    }
  }

  /**
   * Execute purchase with providers
   */
  private async executePurchase(
    meterNumber: string,
    amount: number,
    reference: string
  ): Promise<{ success: boolean; token?: string; units?: number; error?: string }> {
    // Try STS provider
    const stsClient = this.providers.get('sts');
    if (stsClient) {
      try {
        const response = await stsClient.post('/vend', {
          meterNumber: meterNumber,
          amount: amount,
          currency: 'RWF',
          reference: reference,
        });

        if (response.data.success) {
          return {
            success: true,
            token: response.data.token, // 20-digit STS token
            units: response.data.units,
          };
        }
      } catch (error: any) {
        console.error('STS vend error:', error.response?.data || error.message);
      }
    }

    // Try EUCL
    const euclClient = this.providers.get('eucl');
    if (euclClient) {
      try {
        const response = await euclClient.post('/transactions/prepaid', {
          meter_number: meterNumber,
          amount: amount,
          external_ref: reference,
        });

        if (response.data.status === 'SUCCESS') {
          return {
            success: true,
            token: response.data.token,
            units: response.data.units_purchased,
          };
        }
      } catch (error: any) {
        console.error('EUCL vend error:', error.response?.data || error.message);
      }
    }

    // Simulation mode for development (when no provider configured)
    if (this.providers.size === 0) {
      // Calculate units based on typical Rwanda tariff (~120 RWF per unit)
      const unitsPerRwf = 1 / 120;
      const units = Math.floor(amount * unitsPerRwf * 10) / 10;

      // Generate simulated STS token (20 digits)
      const token = this.generateSimulatedToken();

      return {
        success: true,
        token: token,
        units: units,
      };
    }

    return {
      success: false,
      error: 'No provider available to process request',
    };
  }

  /**
   * Generate simulated STS token for development
   */
  private generateSimulatedToken(): string {
    let token = '';
    for (let i = 0; i < 20; i++) {
      token += Math.floor(Math.random() * 10);
      if ((i + 1) % 4 === 0 && i < 19) {
        token += '-';
      }
    }
    return token; // Format: 0000-0000-0000-0000-0000
  }

  /**
   * Link meter to user account
   */
  private async linkMeterToUser(
    userId: string,
    meterNumber: string,
    meterInfo: GasMeterInfo
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO bigcompany.utility_meters
      (user_id, meter_type, meter_number, alias, is_verified, metadata)
      VALUES ($1, 'gas', $2, $3, true, $4)
      ON CONFLICT (meter_number, provider) DO UPDATE
      SET user_id = $1, is_verified = true, updated_at = NOW()
    `, [
      userId,
      meterNumber,
      meterInfo.customerName || `Meter ${meterNumber}`,
      JSON.stringify(meterInfo),
    ]);
  }

  /**
   * Get user's meters
   */
  async getUserMeters(userId: string): Promise<GasMeterInfo[]> {
    const result = await this.db.query(`
      SELECT * FROM bigcompany.utility_meters
      WHERE user_id = $1 AND meter_type = 'gas'
      ORDER BY created_at DESC
    `, [userId]);

    return result.rows.map(row => ({
      meterNumber: row.meter_number,
      customerName: row.alias,
      address: row.metadata?.address,
      tariff: row.metadata?.tariff,
    }));
  }

  /**
   * Get user's topup history
   */
  async getTopupHistory(userId: string, limit: number = 20): Promise<any[]> {
    const result = await this.db.query(`
      SELECT t.*, m.alias as meter_alias, m.meter_number
      FROM bigcompany.utility_topups t
      LEFT JOIN bigcompany.utility_meters m ON t.meter_id = m.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;
  }

  /**
   * Get predefined amounts
   */
  getPredefinedAmounts(): number[] {
    return this.predefinedAmounts;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.end();
  }
}

export default GasService;
