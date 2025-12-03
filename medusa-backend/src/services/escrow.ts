import { TransactionBaseService } from '@medusajs/medusa';
import { Pool } from 'pg';
import BlnkService from './blnk';

interface CreateEscrowInput {
  order_id: string;
  retailer_id: string;
  wholesaler_id: string;
  order_amount: number;
  escrow_amount: number;
  order_details?: any;
  currency?: string;
  auto_release_days?: number;
}

interface ReleaseEscrowInput {
  escrow_id: string;
  confirmed_by: string;
  notes?: string;
}

interface RecordRepaymentInput {
  escrow_transaction_id: string;
  retailer_id: string;
  repayment_amount: number;
  repayment_method: 'auto_deduct' | 'mobile_money' | 'bank_transfer' | 'wallet' | 'offset';
  payment_reference?: string;
  notes?: string;
}

interface EscrowTransaction {
  id: string;
  order_id: string;
  retailer_id: string;
  wholesaler_id: string;
  order_amount: number;
  escrow_amount: number;
  currency: string;
  status: 'held' | 'released' | 'disputed' | 'refunded' | 'expired';
  blnk_escrow_balance_id?: string;
  blnk_transaction_ref?: string;
  auto_release_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface RetailerEscrowSummary {
  retailer_id: string;
  total_escrow_transactions: number;
  active_escrow_count: number;
  total_held_amount: number;
  total_released_amount: number;
  total_disputed_amount: number;
  total_repaid_amount: number;
  outstanding_debt: number;
  last_escrow_date?: Date;
  last_repayment_date?: Date;
}

interface EscrowSettings {
  auto_release_days: number;
  default_deduction_percentage: number;
  minimum_wallet_balance: number;
  max_outstanding_debt: number;
  escrow_enabled: boolean;
  dispute_resolution_email: string;
}

class EscrowService extends TransactionBaseService {
  private db: Pool;
  private blnkService: BlnkService;
  private companyEscrowLedgerId: string;

  constructor(container: any) {
    super(container);

    // Initialize PostgreSQL connection
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://bigcompany_user:bigcompany_password@localhost:5435/bigcompany',
    });

    // Get BlnkService from container
    this.blnkService = container.resolve('blnkService');

    // Company's master escrow ledger ID (should be created during setup)
    this.companyEscrowLedgerId = process.env.COMPANY_ESCROW_LEDGER_ID || '';
  }

  // ==================== ESCROW CREATION ====================

  /**
   * Create an escrow transaction when retailer orders from wholesaler
   * 1. Record in database
   * 2. Move funds from company's main account to escrow balance in Blnk
   * 3. Track for auto-release
   */
  async createEscrow(input: CreateEscrowInput): Promise<EscrowTransaction> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Check if escrow system is enabled
      const settings = await this.getSettings();
      if (!settings.escrow_enabled) {
        throw new Error('Escrow system is currently disabled');
      }

      // Check retailer's outstanding debt limit
      const summary = await this.getRetailerSummary(input.retailer_id);
      if (summary && summary.outstanding_debt + input.escrow_amount > settings.max_outstanding_debt) {
        throw new Error(`Retailer has exceeded maximum outstanding debt limit (${settings.max_outstanding_debt} RWF)`);
      }

      // Calculate auto-release date
      const autoReleaseDays = input.auto_release_days || settings.auto_release_days;
      const autoReleaseDate = new Date();
      autoReleaseDate.setDate(autoReleaseDate.getDate() + autoReleaseDays);

      // Record escrow transaction in database
      const insertQuery = `
        INSERT INTO bigcompany.escrow_transactions (
          order_id, retailer_id, wholesaler_id, order_amount, escrow_amount,
          currency, order_details, auto_release_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'held')
        RETURNING *;
      `;

      const result = await client.query(insertQuery, [
        input.order_id,
        input.retailer_id,
        input.wholesaler_id,
        input.order_amount,
        input.escrow_amount,
        input.currency || 'RWF',
        JSON.stringify(input.order_details || {}),
        autoReleaseDate,
      ]);

      const escrowTransaction = result.rows[0];

      // Create Blnk transaction to move funds to escrow
      try {
        // Company pays wholesaler, but holds in escrow first
        const blnkTx = await this.blnkService.createTransaction({
          amount: input.escrow_amount,
          currency: input.currency || 'RWF',
          source: this.companyEscrowLedgerId, // Company's escrow pool
          destination: `escrow_${escrowTransaction.id}`, // Dedicated escrow balance
          reference: input.order_id,
          description: `Escrow for order ${input.order_id} - Retailer: ${input.retailer_id}`,
          meta_data: {
            escrow_id: escrowTransaction.id,
            retailer_id: input.retailer_id,
            wholesaler_id: input.wholesaler_id,
            order_id: input.order_id,
          },
        });

        // Update escrow record with Blnk references
        await client.query(
          `UPDATE bigcompany.escrow_transactions
           SET blnk_transaction_ref = $1, blnk_escrow_balance_id = $2, updated_at = NOW()
           WHERE id = $3`,
          [blnkTx.transaction_id, `escrow_${escrowTransaction.id}`, escrowTransaction.id]
        );

        escrowTransaction.blnk_transaction_ref = blnkTx.transaction_id;
        escrowTransaction.blnk_escrow_balance_id = `escrow_${escrowTransaction.id}`;
      } catch (blnkError: any) {
        console.error('Blnk transaction failed:', blnkError.message);
        // Continue without Blnk integration (track in DB only)
      }

      await client.query('COMMIT');
      return escrowTransaction;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== ESCROW RELEASE ====================

  /**
   * Release escrow funds to wholesaler after confirmation
   * Can be triggered by:
   * 1. Manual confirmation by retailer/admin
   * 2. Auto-release after timeout (handled by cron job)
   */
  async releaseEscrow(input: ReleaseEscrowInput): Promise<EscrowTransaction> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get escrow transaction
      const escrowResult = await client.query(
        'SELECT * FROM bigcompany.escrow_transactions WHERE id = $1 AND status = $2',
        [input.escrow_id, 'held']
      );

      if (escrowResult.rows.length === 0) {
        throw new Error('Escrow transaction not found or already released');
      }

      const escrow = escrowResult.rows[0];

      // Update status to released
      await client.query(
        `UPDATE bigcompany.escrow_transactions
         SET status = 'released',
             confirmed_by = $1,
             confirmed_at = NOW(),
             released_at = NOW(),
             notes = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [input.confirmed_by, input.notes, input.escrow_id]
      );

      // Transfer funds from escrow to wholesaler in Blnk
      if (escrow.blnk_escrow_balance_id) {
        try {
          await this.blnkService.createTransaction({
            amount: escrow.escrow_amount,
            currency: escrow.currency,
            source: escrow.blnk_escrow_balance_id,
            destination: `wholesaler_${escrow.wholesaler_id}`,
            reference: `release_${escrow.order_id}`,
            description: `Payment to wholesaler for order ${escrow.order_id}`,
            meta_data: {
              escrow_id: escrow.id,
              order_id: escrow.order_id,
              released_by: input.confirmed_by,
            },
          });
        } catch (blnkError: any) {
          console.error('Blnk release failed:', blnkError.message);
          // Status already updated in DB, log error but continue
        }
      }

      await client.query('COMMIT');

      // Return updated transaction
      const updatedResult = await client.query(
        'SELECT * FROM bigcompany.escrow_transactions WHERE id = $1',
        [input.escrow_id]
      );

      return updatedResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Auto-release escrows that have passed their auto_release_at date
   * Should be called by a cron job
   */
  async processAutoReleases(): Promise<number> {
    const result = await this.db.query(
      `SELECT * FROM bigcompany.escrow_transactions
       WHERE status = 'held'
       AND auto_release_at <= NOW()
       AND confirmation_required = true`
    );

    let releasedCount = 0;

    for (const escrow of result.rows) {
      try {
        await this.releaseEscrow({
          escrow_id: escrow.id,
          confirmed_by: 'system_auto_release',
          notes: 'Auto-released after timeout',
        });
        releasedCount++;
      } catch (error: any) {
        console.error(`Failed to auto-release escrow ${escrow.id}:`, error.message);
      }
    }

    return releasedCount;
  }

  // ==================== REPAYMENTS ====================

  /**
   * Record a repayment from retailer to company
   */
  async recordRepayment(input: RecordRepaymentInput): Promise<any> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Verify escrow transaction exists
      const escrowResult = await client.query(
        'SELECT * FROM bigcompany.escrow_transactions WHERE id = $1',
        [input.escrow_transaction_id]
      );

      if (escrowResult.rows.length === 0) {
        throw new Error('Escrow transaction not found');
      }

      // Record repayment
      const insertQuery = `
        INSERT INTO bigcompany.escrow_repayments (
          escrow_transaction_id, retailer_id, repayment_amount, repayment_method,
          payment_reference, notes, status, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', NOW())
        RETURNING *;
      `;

      const result = await client.query(insertQuery, [
        input.escrow_transaction_id,
        input.retailer_id,
        input.repayment_amount,
        input.repayment_method,
        input.payment_reference,
        input.notes,
      ]);

      const repayment = result.rows[0];

      // If auto-deduct, record Blnk transaction
      if (input.repayment_method === 'auto_deduct') {
        try {
          const blnkTx = await this.blnkService.createTransaction({
            amount: input.repayment_amount,
            currency: 'RWF',
            source: `retailer_${input.retailer_id}`,
            destination: this.companyEscrowLedgerId,
            reference: `repayment_${repayment.id}`,
            description: `Auto-deduct repayment from retailer ${input.retailer_id}`,
            meta_data: {
              repayment_id: repayment.id,
              escrow_transaction_id: input.escrow_transaction_id,
              retailer_id: input.retailer_id,
            },
          });

          await client.query(
            'UPDATE bigcompany.escrow_repayments SET blnk_transaction_ref = $1 WHERE id = $2',
            [blnkTx.transaction_id, repayment.id]
          );
        } catch (blnkError: any) {
          console.error('Blnk repayment transaction failed:', blnkError.message);
        }
      }

      await client.query('COMMIT');
      return repayment;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process auto-deductions for all retailers with positive wallet balances
   * Should be called daily by cron job
   */
  async processAutoDeductions(): Promise<{ processed: number; total_amount: number }> {
    // Get all retailers with auto-deduct enabled
    const retailersResult = await this.db.query(
      `SELECT * FROM bigcompany.escrow_auto_deductions
       WHERE enabled = true AND suspended = false`
    );

    let processedCount = 0;
    let totalAmount = 0;

    for (const retailer of retailersResult.rows) {
      try {
        // Get retailer's outstanding debt
        const summary = await this.getRetailerSummary(retailer.retailer_id);
        if (!summary || summary.outstanding_debt <= 0) {
          continue;
        }

        // Get retailer's wallet balance (would need wallet service integration)
        // For now, skip Blnk check and just record
        const deductionAmount = Math.min(
          summary.outstanding_debt * (retailer.deduction_percentage / 100),
          retailer.max_daily_deduction_rwf || summary.outstanding_debt
        );

        if (deductionAmount > 0) {
          // Find oldest unpaid escrow to apply payment to
          const oldestEscrow = await this.db.query(
            `SELECT et.id, et.escrow_amount,
                    COALESCE(SUM(er.repayment_amount), 0) as total_repaid
             FROM bigcompany.escrow_transactions et
             LEFT JOIN bigcompany.escrow_repayments er ON et.id = er.escrow_transaction_id
             WHERE et.retailer_id = $1
             AND et.status IN ('held', 'released')
             GROUP BY et.id, et.escrow_amount
             HAVING et.escrow_amount > COALESCE(SUM(er.repayment_amount), 0)
             ORDER BY et.created_at ASC
             LIMIT 1`,
            [retailer.retailer_id]
          );

          if (oldestEscrow.rows.length > 0) {
            await this.recordRepayment({
              escrow_transaction_id: oldestEscrow.rows[0].id,
              retailer_id: retailer.retailer_id,
              repayment_amount: deductionAmount,
              repayment_method: 'auto_deduct',
              notes: 'Automatic daily deduction from sales',
            });

            processedCount++;
            totalAmount += deductionAmount;
          }
        }
      } catch (error: any) {
        console.error(`Failed to process auto-deduct for ${retailer.retailer_id}:`, error.message);
      }
    }

    return { processed: processedCount, total_amount: totalAmount };
  }

  // ==================== QUERIES ====================

  async getRetailerSummary(retailer_id: string): Promise<RetailerEscrowSummary | null> {
    const result = await this.db.query(
      'SELECT * FROM bigcompany.retailer_escrow_summary WHERE retailer_id = $1',
      [retailer_id]
    );

    return result.rows[0] || null;
  }

  async getRetailerEscrows(retailer_id: string, status?: string): Promise<EscrowTransaction[]> {
    let query = 'SELECT * FROM bigcompany.escrow_transactions WHERE retailer_id = $1';
    const params: any[] = [retailer_id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getEscrowById(escrow_id: string): Promise<EscrowTransaction | null> {
    const result = await this.db.query(
      'SELECT * FROM bigcompany.escrow_transactions WHERE id = $1',
      [escrow_id]
    );

    return result.rows[0] || null;
  }

  async getSettings(): Promise<EscrowSettings> {
    const result = await this.db.query('SELECT * FROM bigcompany.escrow_settings');

    const settings: any = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    return {
      auto_release_days: parseInt(settings.auto_release_days || '7'),
      default_deduction_percentage: parseFloat(settings.default_deduction_percentage || '30'),
      minimum_wallet_balance: parseFloat(settings.minimum_wallet_balance || '10000'),
      max_outstanding_debt: parseFloat(settings.max_outstanding_debt || '5000000'),
      escrow_enabled: settings.escrow_enabled === 'true',
      dispute_resolution_email: settings.dispute_resolution_email || 'escrow@bigcompany.rw',
    };
  }

  // ==================== ADMIN OPERATIONS ====================

  async updateAutoDeductSettings(
    retailer_id: string,
    settings: {
      enabled?: boolean;
      deduction_percentage?: number;
      minimum_balance_rwf?: number;
      max_daily_deduction_rwf?: number;
    }
  ): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (settings.enabled !== undefined) {
      fields.push(`enabled = $${paramIndex++}`);
      values.push(settings.enabled);
    }
    if (settings.deduction_percentage !== undefined) {
      fields.push(`deduction_percentage = $${paramIndex++}`);
      values.push(settings.deduction_percentage);
    }
    if (settings.minimum_balance_rwf !== undefined) {
      fields.push(`minimum_balance_rwf = $${paramIndex++}`);
      values.push(settings.minimum_balance_rwf);
    }
    if (settings.max_daily_deduction_rwf !== undefined) {
      fields.push(`max_daily_deduction_rwf = $${paramIndex++}`);
      values.push(settings.max_daily_deduction_rwf);
    }

    if (fields.length === 0) {
      throw new Error('No settings to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(retailer_id);

    const query = `
      INSERT INTO bigcompany.escrow_auto_deductions (retailer_id)
      VALUES ($${paramIndex})
      ON CONFLICT (retailer_id) DO UPDATE SET ${fields.join(', ')}
      RETURNING *;
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async raiseDispute(escrow_id: string, reason: string, raised_by: string): Promise<void> {
    await this.db.query(
      `UPDATE bigcompany.escrow_transactions
       SET status = 'disputed',
           dispute_reason = $1,
           dispute_raised_by = $2,
           dispute_raised_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [reason, raised_by, escrow_id]
    );
  }

  // ==================== WHOLESALER QUERIES ====================

  async getWholesalerPendingEscrows(wholesaler_id: string): Promise<EscrowTransaction[]> {
    const result = await this.db.query(
      `SELECT * FROM bigcompany.escrow_transactions
       WHERE wholesaler_id = $1 AND status = 'held'
       ORDER BY auto_release_at ASC`,
      [wholesaler_id]
    );

    return result.rows;
  }

  async getWholesalerEscrows(wholesaler_id: string, status?: string): Promise<EscrowTransaction[]> {
    let query = 'SELECT * FROM bigcompany.escrow_transactions WHERE wholesaler_id = $1';
    const params: any[] = [wholesaler_id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getWholesalerSummary(wholesaler_id: string): Promise<any> {
    const result = await this.db.query(
      `SELECT
         COUNT(*) AS total_escrow_transactions,
         COUNT(*) FILTER (WHERE status = 'held') AS pending_confirmations,
         COALESCE(SUM(escrow_amount) FILTER (WHERE status = 'held'), 0) AS pending_amount,
         COALESCE(SUM(escrow_amount) FILTER (WHERE status = 'released'), 0) AS total_received,
         MAX(released_at) AS last_payment_date
       FROM bigcompany.escrow_transactions
       WHERE wholesaler_id = $1`,
      [wholesaler_id]
    );

    return result.rows[0];
  }
}

export default EscrowService;
