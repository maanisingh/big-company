/**
 * Manual Payment Service
 * Handles 3 verification methods for remote card payments:
 * 1. Direct PIN entry
 * 2. One-time 8-digit payment code
 * 3. SMS OTP verification
 */

import { MedusaError } from 'medusa-core-utils';
import { BaseService } from 'medusa-interfaces';
import crypto from 'crypto';

interface PaymentCodeData {
  card_id: string;
  code: string;
  amount: number;
  retailer_id: string;
  branch_id?: string;
  customer_phone?: string;
  expires_at: Date;
}

interface VerificationResult {
  success: boolean;
  error?: string;
  card_balance?: number;
  transaction_id?: string;
}

class ManualPaymentService extends BaseService {
  private db: any;
  private smsService: any;
  private blnkService: any;

  constructor({ db, smsService, blnkService }: any) {
    super();
    this.db = db;
    this.smsService = smsService;
    this.blnkService = blnkService;
  }

  // ==================== SECURITY CHECKS ====================

  /**
   * Check if card is locked due to failed attempts
   */
  async isCardLocked(cardId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT bigcompany.is_card_locked($1) as locked',
      [cardId]
    );
    return result.rows[0]?.locked || false;
  }

  /**
   * Count failed attempts in last N minutes
   */
  async countFailedAttempts(cardId: string, minutes: number = 15): Promise<number> {
    const result = await this.db.query(
      'SELECT bigcompany.count_failed_attempts($1, $2) as count',
      [cardId, minutes]
    );
    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Lock card for specified duration
   */
  async lockCard(cardId: string, durationMinutes: number = 30, reason: string = 'Too many failed attempts', retailerId?: string): Promise<void> {
    await this.db.query(
      'SELECT bigcompany.lock_card($1, $2, $3, $4)',
      [cardId, durationMinutes, reason, retailerId || null]
    );
  }

  /**
   * Record verification attempt
   */
  async recordAttempt(cardId: string, retailerId: string, method: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.db.query(`
      INSERT INTO bigcompany.payment_verification_attempts
      (card_id, retailer_id, verification_method, success, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [cardId, retailerId, method, success, ipAddress, userAgent]);
  }

  /**
   * Check rate limiting before verification
   */
  async checkRateLimit(cardId: string, retailerId: string): Promise<void> {
    // Check if card is locked
    const locked = await this.isCardLocked(cardId);
    if (locked) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        'Card is temporarily locked due to security reasons. Please try again later.'
      );
    }

    // Check failed attempts in last 15 minutes
    const failedAttempts = await this.countFailedAttempts(cardId, 15);
    if (failedAttempts >= 3) {
      // Lock card for 30 minutes
      await this.lockCard(cardId, 30, 'Exceeded maximum failed attempts', retailerId);
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        'Too many failed attempts. Card locked for 30 minutes.'
      );
    }
  }

  /**
   * Log manual payment audit trail
   */
  async logPaymentAudit(data: {
    cardId: string;
    retailerId: string;
    branchId?: string;
    amount: number;
    method: string;
    verificationCode?: string;
    success: boolean;
    errorMessage?: string;
    transactionId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    // Mask sensitive verification code (show only last 4 digits)
    const maskedCode = data.verificationCode
      ? '****' + data.verificationCode.slice(-4)
      : null;

    await this.db.query(`
      INSERT INTO bigcompany.manual_payment_audit
      (card_id, retailer_id, branch_id, amount, verification_method, verification_code,
       success, error_message, transaction_id, ip_address, user_agent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      data.cardId,
      data.retailerId,
      data.branchId || null,
      data.amount,
      data.method,
      maskedCode,
      data.success,
      data.errorMessage || null,
      data.transactionId || null,
      data.ipAddress || null,
      data.userAgent || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]);
  }

  // ==================== METHOD 1: DIRECT PIN ENTRY ====================

  /**
   * Verify PIN and process payment
   */
  async verifyPinAndCharge(
    cardId: string,
    pin: string,
    amount: number,
    retailerId: string,
    branchId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<VerificationResult> {
    try {
      // Rate limiting check
      await this.checkRateLimit(cardId, retailerId);

      // Verify PIN
      const cardResult = await this.db.query(`
        SELECT id, card_uid, balance, pin_hash, is_active, customer_id
        FROM bigcompany.nfc_cards
        WHERE card_uid = $1
      `, [cardId]);

      if (cardResult.rows.length === 0) {
        await this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount,
          method: 'pin',
          success: false,
          errorMessage: 'Card not found',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Card not found' };
      }

      const card = cardResult.rows[0];

      if (!card.is_active) {
        await this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount,
          method: 'pin',
          success: false,
          errorMessage: 'Card is inactive',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Card is inactive' };
      }

      // Verify PIN
      const bcrypt = require('bcryptjs');
      const pinValid = await bcrypt.compare(pin, card.pin_hash);

      if (!pinValid) {
        await this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount,
          method: 'pin',
          verificationCode: pin,
          success: false,
          errorMessage: 'Invalid PIN',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Invalid PIN' };
      }

      // Check balance
      if (card.balance < amount) {
        await this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount,
          method: 'pin',
          success: false,
          errorMessage: 'Insufficient balance',
          ipAddress,
          userAgent,
        });
        return {
          success: false,
          error: 'Insufficient balance',
          card_balance: card.balance,
        };
      }

      // Process payment via Blnk
      const transaction = await this.blnkService.recordTransaction({
        reference: `MANUAL-PIN-${Date.now()}`,
        amount,
        precision: 100,
        source: card.id,
        destination: retailerId,
        currency: 'RWF',
        description: `Manual card payment - PIN`,
        meta_data: {
          card_uid: cardId,
          payment_method: 'manual_pin',
          retailer_id: retailerId,
          branch_id: branchId,
        },
      });

      // Update card balance
      await this.db.query(`
        UPDATE bigcompany.nfc_cards
        SET balance = balance - $1,
            last_used_at = NOW()
        WHERE card_uid = $2
      `, [amount, cardId]);

      // Record successful attempt
      await this.recordAttempt(cardId, retailerId, 'pin', true, ipAddress, userAgent);
      await this.logPaymentAudit({
        cardId,
        retailerId,
        branchId,
        amount,
        method: 'pin',
        success: true,
        transactionId: transaction.transaction_id,
        ipAddress,
        userAgent,
        metadata: { blnk_reference: transaction.reference },
      });

      return {
        success: true,
        card_balance: card.balance - amount,
        transaction_id: transaction.transaction_id,
      };
    } catch (error: any) {
      await this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
      await this.logPaymentAudit({
        cardId,
        retailerId,
        branchId,
        amount,
        method: 'pin',
        success: false,
        errorMessage: error.message,
        ipAddress,
        userAgent,
      });
      throw error;
    }
  }

  // ==================== METHOD 2: ONE-TIME PAYMENT CODE ====================

  /**
   * Generate 8-digit one-time payment code (10-minute expiry)
   */
  async generatePaymentCode(
    cardId: string,
    amount: number,
    retailerId: string,
    customerPhone?: string,
    branchId?: string
  ): Promise<{ code: string; expires_at: Date }> {
    // Generate random 8-digit code
    const code = crypto.randomInt(10000000, 99999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in database
    await this.db.query(`
      INSERT INTO bigcompany.payment_codes
      (card_id, code, amount, retailer_id, branch_id, customer_phone, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [cardId, code, amount, retailerId, branchId || null, customerPhone || null, expiresAt]);

    // Send SMS to customer if phone provided
    if (customerPhone) {
      try {
        await this.smsService.send({
          to: customerPhone,
          message: `BIG Company Payment Code: ${code}\nAmount: ${amount} RWF\nValid for 10 minutes.\nDo NOT share this code with anyone.`,
        });
      } catch (smsError) {
        console.error('Failed to send payment code SMS:', smsError);
      }
    }

    return { code, expires_at: expiresAt };
  }

  /**
   * Verify payment code and process payment
   */
  async verifyCodeAndCharge(
    cardId: string,
    code: string,
    retailerId: string,
    branchId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<VerificationResult> {
    try {
      // Rate limiting check
      await this.checkRateLimit(cardId, retailerId);

      // Find payment code
      const codeResult = await this.db.query(`
        SELECT id, amount, retailer_id, expires_at, is_used
        FROM bigcompany.payment_codes
        WHERE card_id = $1 AND code = $2
        ORDER BY created_at DESC
        LIMIT 1
      `, [cardId, code]);

      if (codeResult.rows.length === 0) {
        await this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount: 0,
          method: 'code',
          verificationCode: code,
          success: false,
          errorMessage: 'Invalid code',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Invalid payment code' };
      }

      const paymentCode = codeResult.rows[0];

      // Check if already used
      if (paymentCode.is_used) {
        await this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount: paymentCode.amount,
          method: 'code',
          verificationCode: code,
          success: false,
          errorMessage: 'Code already used',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Code already used' };
      }

      // Check if expired
      if (new Date(paymentCode.expires_at) < new Date()) {
        await this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount: paymentCode.amount,
          method: 'code',
          verificationCode: code,
          success: false,
          errorMessage: 'Code expired',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Payment code expired' };
      }

      // Verify retailer matches
      if (paymentCode.retailer_id !== retailerId) {
        await this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount: paymentCode.amount,
          method: 'code',
          verificationCode: code,
          success: false,
          errorMessage: 'Retailer mismatch',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Invalid code for this retailer' };
      }

      const amount = paymentCode.amount;

      // Get card details
      const cardResult = await this.db.query(`
        SELECT id, card_uid, balance, is_active
        FROM bigcompany.nfc_cards
        WHERE card_uid = $1
      `, [cardId]);

      if (cardResult.rows.length === 0) {
        return { success: false, error: 'Card not found' };
      }

      const card = cardResult.rows[0];

      if (!card.is_active) {
        return { success: false, error: 'Card is inactive' };
      }

      // Check balance
      if (card.balance < amount) {
        await this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount,
          method: 'code',
          verificationCode: code,
          success: false,
          errorMessage: 'Insufficient balance',
          ipAddress,
          userAgent,
        });
        return {
          success: false,
          error: 'Insufficient balance',
          card_balance: card.balance,
        };
      }

      // Process payment via Blnk
      const transaction = await this.blnkService.recordTransaction({
        reference: `MANUAL-CODE-${Date.now()}`,
        amount,
        precision: 100,
        source: card.id,
        destination: retailerId,
        currency: 'RWF',
        description: `Manual card payment - Code`,
        meta_data: {
          card_uid: cardId,
          payment_method: 'manual_code',
          payment_code: code,
          retailer_id: retailerId,
          branch_id: branchId,
        },
      });

      // Update card balance and mark code as used
      await this.db.query('BEGIN');
      try {
        await this.db.query(`
          UPDATE bigcompany.nfc_cards
          SET balance = balance - $1,
              last_used_at = NOW()
          WHERE card_uid = $2
        `, [amount, cardId]);

        await this.db.query(`
          UPDATE bigcompany.payment_codes
          SET is_used = true, used_at = NOW()
          WHERE id = $1
        `, [paymentCode.id]);

        await this.db.query('COMMIT');
      } catch (error) {
        await this.db.query('ROLLBACK');
        throw error;
      }

      // Record successful attempt
      await this.recordAttempt(cardId, retailerId, 'code', true, ipAddress, userAgent);
      await this.logPaymentAudit({
        cardId,
        retailerId,
        branchId,
        amount,
        method: 'code',
        verificationCode: code,
        success: true,
        transactionId: transaction.transaction_id,
        ipAddress,
        userAgent,
        metadata: { blnk_reference: transaction.reference },
      });

      return {
        success: true,
        card_balance: card.balance - amount,
        transaction_id: transaction.transaction_id,
      };
    } catch (error: any) {
      await this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
      throw error;
    }
  }

  // ==================== METHOD 3: SMS OTP ====================

  /**
   * Request SMS OTP for payment approval
   */
  async requestPaymentOTP(
    cardId: string,
    amount: number,
    customerPhone: string,
    retailerId: string
  ): Promise<{ otp_sent: boolean; expires_at: Date }> {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in database
    await this.db.query(`
      INSERT INTO bigcompany.otp_codes
      (phone, code, purpose, expires_at, metadata)
      VALUES ($1, $2, 'payment', $3, $4)
    `, [customerPhone, otp, expiresAt, JSON.stringify({
      card_id: cardId,
      amount,
      retailer_id: retailerId,
    })]);

    // Send SMS
    try {
      await this.smsService.send({
        to: customerPhone,
        message: `BIG Company Payment Approval\nOTP: ${otp}\nAmount: ${amount} RWF\nValid for 5 minutes.\nReply with this code to approve payment.`,
      });

      return { otp_sent: true, expires_at: expiresAt };
    } catch (smsError) {
      console.error('Failed to send OTP SMS:', smsError);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        'Failed to send OTP. Please try again.'
      );
    }
  }

  /**
   * Verify OTP and process payment
   */
  async verifyOTPAndCharge(
    cardId: string,
    otp: string,
    customerPhone: string,
    retailerId: string,
    branchId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<VerificationResult> {
    try {
      // Rate limiting check
      await this.checkRateLimit(cardId, retailerId);

      // Find OTP
      const otpResult = await this.db.query(`
        SELECT id, expires_at, is_verified, metadata
        FROM bigcompany.otp_codes
        WHERE phone = $1 AND code = $2 AND purpose = 'payment'
        ORDER BY created_at DESC
        LIMIT 1
      `, [customerPhone, otp]);

      if (otpResult.rows.length === 0) {
        await this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount: 0,
          method: 'otp',
          verificationCode: otp,
          success: false,
          errorMessage: 'Invalid OTP',
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Invalid OTP' };
      }

      const otpData = otpResult.rows[0];
      const metadata = otpData.metadata;

      // Check if already used
      if (otpData.is_verified) {
        await this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
        return { success: false, error: 'OTP already used' };
      }

      // Check if expired
      if (new Date(otpData.expires_at) < new Date()) {
        await this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
        return { success: false, error: 'OTP expired' };
      }

      // Verify metadata matches
      if (metadata.card_id !== cardId || metadata.retailer_id !== retailerId) {
        await this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
        return { success: false, error: 'Invalid OTP for this transaction' };
      }

      const amount = metadata.amount;

      // Get card details
      const cardResult = await this.db.query(`
        SELECT id, card_uid, balance, is_active
        FROM bigcompany.nfc_cards
        WHERE card_uid = $1
      `, [cardId]);

      if (cardResult.rows.length === 0) {
        return { success: false, error: 'Card not found' };
      }

      const card = cardResult.rows[0];

      if (!card.is_active) {
        return { success: false, error: 'Card is inactive' };
      }

      // Check balance
      if (card.balance < amount) {
        await this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
        await this.logPaymentAudit({
          cardId,
          retailerId,
          branchId,
          amount,
          method: 'otp',
          verificationCode: otp,
          success: false,
          errorMessage: 'Insufficient balance',
          ipAddress,
          userAgent,
        });
        return {
          success: false,
          error: 'Insufficient balance',
          card_balance: card.balance,
        };
      }

      // Process payment via Blnk
      const transaction = await this.blnkService.recordTransaction({
        reference: `MANUAL-OTP-${Date.now()}`,
        amount,
        precision: 100,
        source: card.id,
        destination: retailerId,
        currency: 'RWF',
        description: `Manual card payment - OTP`,
        meta_data: {
          card_uid: cardId,
          payment_method: 'manual_otp',
          retailer_id: retailerId,
          branch_id: branchId,
          customer_phone: customerPhone,
        },
      });

      // Update card balance and mark OTP as verified
      await this.db.query('BEGIN');
      try {
        await this.db.query(`
          UPDATE bigcompany.nfc_cards
          SET balance = balance - $1,
              last_used_at = NOW()
          WHERE card_uid = $2
        `, [amount, cardId]);

        await this.db.query(`
          UPDATE bigcompany.otp_codes
          SET is_verified = true, verified_at = NOW()
          WHERE id = $1
        `, [otpData.id]);

        await this.db.query('COMMIT');
      } catch (error) {
        await this.db.query('ROLLBACK');
        throw error;
      }

      // Record successful attempt
      await this.recordAttempt(cardId, retailerId, 'otp', true, ipAddress, userAgent);
      await this.logPaymentAudit({
        cardId,
        retailerId,
        branchId,
        amount,
        method: 'otp',
        verificationCode: otp,
        success: true,
        transactionId: transaction.transaction_id,
        ipAddress,
        userAgent,
        metadata: { blnk_reference: transaction.reference },
      });

      return {
        success: true,
        card_balance: card.balance - amount,
        transaction_id: transaction.transaction_id,
      };
    } catch (error: any) {
      await this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
      throw error;
    }
  }

  // ==================== CLEANUP UTILITIES ====================

  /**
   * Clean up expired codes and OTPs (should be run via cron job)
   */
  async cleanupExpired(): Promise<{ codes_deleted: number; otps_deleted: number; cards_unlocked: number }> {
    const codesResult = await this.db.query('SELECT bigcompany.cleanup_expired_payment_codes()');
    const otpsResult = await this.db.query('SELECT bigcompany.cleanup_expired_otps()');
    const unlocksResult = await this.db.query('SELECT bigcompany.unlock_expired_lockouts()');

    return {
      codes_deleted: codesResult.rows[0]?.cleanup_expired_payment_codes || 0,
      otps_deleted: otpsResult.rows[0]?.cleanup_expired_otps || 0,
      cards_unlocked: unlocksResult.rows[0]?.unlock_expired_lockouts || 0,
    };
  }
}

export default ManualPaymentService;
