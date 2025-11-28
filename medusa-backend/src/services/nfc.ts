import { Pool } from 'pg';
import crypto from 'crypto';
import BlnkService from './blnk';
import SMSService from './sms';
import MTNMoMoService from './momo';
import AirtelMoneyService from './airtel';

interface NFCCard {
  id: string;
  userId: string;
  cardUid: string;
  dashboardId: string;
  cardAlias: string;
  isActive: boolean;
  linkedAt: Date;
  lastUsedAt: Date | null;
}

interface LinkCardRequest {
  userId: string;
  cardUid: string;
  pin: string;
  alias?: string;
}

interface POSPaymentRequest {
  cardUid: string;
  amount: number;
  merchantId: string;
  orderId?: string;
  pin?: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
  requiresMoMo?: boolean;
  momoReference?: string;
}

class NFCCardService {
  private db: Pool;
  private blnkService: BlnkService;
  private smsService: SMSService;
  private momoService: MTNMoMoService;
  private airtelService: AirtelMoneyService;

  constructor(container: any) {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.blnkService = new BlnkService(container);
    this.smsService = new SMSService();
    this.momoService = new MTNMoMoService();
    this.airtelService = new AirtelMoneyService();
  }

  /**
   * Generate a unique dashboard ID for new cards
   */
  private generateDashboardId(): string {
    const prefix = 'BIG';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`.substring(0, 15);
  }

  /**
   * Hash PIN for secure storage
   */
  private hashPin(pin: string): string {
    return crypto
      .createHash('sha256')
      .update(pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret'))
      .digest('hex');
  }

  /**
   * Verify PIN
   */
  private verifyPin(inputPin: string, storedHash: string): boolean {
    const inputHash = this.hashPin(inputPin);
    return inputHash === storedHash;
  }

  /**
   * Register a new NFC card (for card production/inventory)
   */
  async registerCard(cardUid: string): Promise<{ dashboardId: string }> {
    const dashboardId = this.generateDashboardId();

    await this.db.query(`
      INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, is_active)
      VALUES ($1, $2, false)
      ON CONFLICT (card_uid) DO NOTHING
    `, [cardUid.toUpperCase(), dashboardId]);

    return { dashboardId };
  }

  /**
   * Link card to user account
   */
  async linkCard(request: LinkCardRequest): Promise<{ success: boolean; card?: NFCCard; error?: string }> {
    const { userId, cardUid, pin, alias } = request;
    const normalizedUid = cardUid.toUpperCase();

    // Validate PIN
    if (!pin || pin.length < 4 || pin.length > 6) {
      return { success: false, error: 'PIN must be 4-6 digits' };
    }

    if (!/^\d+$/.test(pin)) {
      return { success: false, error: 'PIN must contain only numbers' };
    }

    // Check if card exists
    const existingCard = await this.db.query(
      'SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1',
      [normalizedUid]
    );

    let dashboardId: string;

    if (existingCard.rows.length === 0) {
      // Auto-register the card
      dashboardId = this.generateDashboardId();
      await this.db.query(`
        INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, user_id, card_alias, pin_hash, is_active, linked_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
      `, [normalizedUid, dashboardId, userId, alias || 'My Card', this.hashPin(pin)]);
    } else {
      const card = existingCard.rows[0];

      // Check if already linked to another user
      if (card.user_id && card.user_id !== userId) {
        return { success: false, error: 'Card is already linked to another account' };
      }

      dashboardId = card.dashboard_id;

      // Link to user
      await this.db.query(`
        UPDATE bigcompany.nfc_cards
        SET user_id = $1, card_alias = $2, pin_hash = $3, is_active = true, linked_at = NOW()
        WHERE card_uid = $4
      `, [userId, alias || card.card_alias || 'My Card', this.hashPin(pin), normalizedUid]);
    }

    // Get updated card
    const result = await this.db.query(
      'SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1',
      [normalizedUid]
    );

    return {
      success: true,
      card: this.mapCardRow(result.rows[0]),
    };
  }

  /**
   * Unlink card from user account
   */
  async unlinkCard(userId: string, cardUid: string, pin: string): Promise<{ success: boolean; error?: string }> {
    const card = await this.db.query(
      'SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1 AND user_id = $2',
      [cardUid.toUpperCase(), userId]
    );

    if (card.rows.length === 0) {
      return { success: false, error: 'Card not found or not linked to your account' };
    }

    // Verify PIN
    if (!this.verifyPin(pin, card.rows[0].pin_hash)) {
      return { success: false, error: 'Invalid PIN' };
    }

    await this.db.query(`
      UPDATE bigcompany.nfc_cards
      SET user_id = NULL, is_active = false, pin_hash = NULL
      WHERE card_uid = $1
    `, [cardUid.toUpperCase()]);

    return { success: true };
  }

  /**
   * Get user's linked cards
   */
  async getUserCards(userId: string): Promise<NFCCard[]> {
    const result = await this.db.query(
      'SELECT * FROM bigcompany.nfc_cards WHERE user_id = $1 ORDER BY linked_at DESC',
      [userId]
    );

    return result.rows.map(this.mapCardRow);
  }

  /**
   * Get card by UID
   */
  async getCardByUid(cardUid: string): Promise<NFCCard | null> {
    const result = await this.db.query(
      'SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1',
      [cardUid.toUpperCase()]
    );

    if (result.rows.length === 0) return null;
    return this.mapCardRow(result.rows[0]);
  }

  /**
   * Get card by dashboard ID
   */
  async getCardByDashboardId(dashboardId: string): Promise<NFCCard | null> {
    const result = await this.db.query(
      'SELECT * FROM bigcompany.nfc_cards WHERE dashboard_id = $1',
      [dashboardId.toUpperCase()]
    );

    if (result.rows.length === 0) return null;
    return this.mapCardRow(result.rows[0]);
  }

  /**
   * Process POS tap-to-pay payment
   */
  async processPOSPayment(request: POSPaymentRequest): Promise<PaymentResult> {
    const { cardUid, amount, merchantId, orderId, pin } = request;

    // Get card details
    const card = await this.getCardByUid(cardUid);

    if (!card) {
      return { success: false, error: 'Card not recognized' };
    }

    if (!card.isActive) {
      return { success: false, error: 'Card is inactive' };
    }

    if (!card.userId) {
      return { success: false, error: 'Card not linked to an account' };
    }

    // For amounts > 5000 RWF, require PIN
    if (amount > 5000 && !pin) {
      return { success: false, error: 'PIN required for transactions over 5,000 RWF' };
    }

    // Verify PIN if provided
    if (pin) {
      const cardData = await this.db.query(
        'SELECT pin_hash FROM bigcompany.nfc_cards WHERE card_uid = $1',
        [cardUid.toUpperCase()]
      );

      if (!this.verifyPin(pin, cardData.rows[0].pin_hash)) {
        return { success: false, error: 'Invalid PIN' };
      }
    }

    // Get customer wallet balance
    const balance = await this.blnkService.getCustomerBalance(
      card.userId,
      'customer_wallets'
    );

    // Get customer phone for notifications
    const customer = await this.db.query(
      "SELECT phone, email, metadata FROM customer WHERE id = $1",
      [card.userId]
    );
    const phone = customer.rows[0]?.phone || customer.rows[0]?.metadata?.phone;

    if (balance >= amount) {
      // Sufficient balance - deduct from wallet
      try {
        // Get merchant's Blnk balance ID
        const merchant = await this.db.query(
          'SELECT blnk_account_id FROM bigcompany.merchant_profiles WHERE id = $1',
          [merchantId]
        );

        if (!merchant.rows[0]?.blnk_account_id) {
          return { success: false, error: 'Merchant wallet not configured' };
        }

        // Create transaction reference
        const txRef = `POS-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        // Execute ledger transaction
        const transaction = await this.blnkService.payFromWallet(
          card.userId, // This should be the customer's balance ID
          merchant.rows[0].blnk_account_id,
          amount,
          orderId || txRef
        );

        // Update card last used
        await this.db.query(
          'UPDATE bigcompany.nfc_cards SET last_used_at = NOW() WHERE card_uid = $1',
          [cardUid.toUpperCase()]
        );

        // Send SMS notification
        if (phone) {
          await this.smsService.send({
            to: phone,
            message: `BIG: Card payment of ${amount.toLocaleString()} RWF successful. Ref: ${txRef}. New balance: ${(balance - amount).toLocaleString()} RWF`,
          });
        }

        return {
          success: true,
          transactionId: transaction.transaction_id,
          message: 'Payment successful',
        };
      } catch (error: any) {
        console.error('POS payment error:', error);
        return { success: false, error: 'Payment processing failed' };
      }
    } else {
      // Insufficient balance - trigger MoMo push
      const shortfall = amount - balance;
      const isMTN = phone && this.isMTNNumber(phone);

      let momoResult;
      const momoRef = `POS-MOMO-${Date.now()}`;

      if (isMTN) {
        momoResult = await this.momoService.requestPayment({
          amount: shortfall,
          currency: 'RWF',
          externalId: momoRef,
          payerPhone: phone,
          payerMessage: `BIG POS Payment - Top up ${shortfall.toLocaleString()} RWF`,
        });
      } else if (phone) {
        momoResult = await this.airtelService.requestPayment({
          amount: shortfall,
          phone: phone,
          reference: momoRef,
        });
      }

      if (momoResult?.success) {
        // Store pending transaction for webhook completion
        await this.db.query(`
          INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
          VALUES ($1, 'pos_payment_pending', 'nfc_card', $2, $3)
        `, [
          card.userId,
          cardUid,
          JSON.stringify({
            amount,
            merchantId,
            orderId,
            momoRef,
            shortfall,
            walletBalance: balance,
          }),
        ]);

        return {
          success: false,
          requiresMoMo: true,
          momoReference: momoResult.referenceId || momoResult.transactionId,
          message: `Insufficient balance. MoMo request sent for ${shortfall.toLocaleString()} RWF.`,
        };
      }

      return {
        success: false,
        error: `Insufficient balance. Available: ${balance.toLocaleString()} RWF`,
      };
    }
  }

  /**
   * Update card PIN
   */
  async updatePin(
    userId: string,
    cardUid: string,
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> {
    // Validate new PIN
    if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      return { success: false, error: 'New PIN must be 4-6 digits' };
    }

    const card = await this.db.query(
      'SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1 AND user_id = $2',
      [cardUid.toUpperCase(), userId]
    );

    if (card.rows.length === 0) {
      return { success: false, error: 'Card not found' };
    }

    // Verify current PIN
    if (!this.verifyPin(currentPin, card.rows[0].pin_hash)) {
      return { success: false, error: 'Current PIN is incorrect' };
    }

    // Update PIN
    await this.db.query(
      'UPDATE bigcompany.nfc_cards SET pin_hash = $1 WHERE card_uid = $2',
      [this.hashPin(newPin), cardUid.toUpperCase()]
    );

    return { success: true };
  }

  /**
   * Activate/Deactivate card
   */
  async setCardStatus(
    userId: string,
    cardUid: string,
    active: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.db.query(`
      UPDATE bigcompany.nfc_cards
      SET is_active = $1
      WHERE card_uid = $2 AND user_id = $3
      RETURNING *
    `, [active, cardUid.toUpperCase(), userId]);

    if (result.rows.length === 0) {
      return { success: false, error: 'Card not found' };
    }

    return { success: true };
  }

  /**
   * Get card transaction history
   */
  async getCardTransactions(cardUid: string, limit: number = 20): Promise<any[]> {
    const card = await this.getCardByUid(cardUid);
    if (!card || !card.userId) return [];

    // Get transactions from Blnk ledger
    const transactions = await this.blnkService.listTransactions(card.userId);

    return transactions.slice(0, limit);
  }

  // ==================== HELPER METHODS ====================

  private mapCardRow(row: any): NFCCard {
    return {
      id: row.id,
      userId: row.user_id,
      cardUid: row.card_uid,
      dashboardId: row.dashboard_id,
      cardAlias: row.card_alias,
      isActive: row.is_active,
      linkedAt: row.linked_at,
      lastUsedAt: row.last_used_at,
    };
  }

  private isMTNNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    const prefix = cleaned.substring(cleaned.length - 9, cleaned.length - 6);
    return ['78', '79'].some(p => prefix.startsWith(p));
  }

  async close(): Promise<void> {
    await this.db.end();
  }
}

export default NFCCardService;
