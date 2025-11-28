import crypto from 'crypto';
import { Pool } from 'pg';
import SMSService from './sms';

interface OTPRecord {
  id: string;
  phone: string;
  otp_hash: string;
  purpose: string;
  attempts: number;
  verified: boolean;
  expires_at: Date;
  created_at: Date;
}

interface VerifyResult {
  success: boolean;
  message: string;
  customerId?: string;
}

interface SendOTPResult {
  success: boolean;
  message: string;
  otpId?: string;
  expiresIn?: number;
}

class OTPService {
  private db: Pool;
  private smsService: SMSService;
  private otpLength: number = 6;
  private expiryMinutes: number = 10;
  private maxAttempts: number = 3;

  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.smsService = new SMSService();
    this.initializeTable();
  }

  /**
   * Create OTP table if not exists
   */
  private async initializeTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS bigcompany.otp_codes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(20) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        purpose VARCHAR(50) NOT NULL DEFAULT 'registration',
        attempts INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_otp_phone ON bigcompany.otp_codes(phone);
      CREATE INDEX IF NOT EXISTS idx_otp_expires ON bigcompany.otp_codes(expires_at);
    `);
  }

  /**
   * Generate a cryptographically secure OTP
   */
  private generateOTP(): string {
    const digits = '0123456789';
    let otp = '';
    const randomBytes = crypto.randomBytes(this.otpLength);
    for (let i = 0; i < this.otpLength; i++) {
      otp += digits[randomBytes[i] % 10];
    }
    return otp;
  }

  /**
   * Hash OTP for secure storage
   */
  private hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp + process.env.OTP_SECRET || 'bigcompany_otp_secret').digest('hex');
  }

  /**
   * Format phone number to standard format
   */
  private formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '250' + cleaned.substring(1);
    } else if (!cleaned.startsWith('250')) {
      cleaned = '250' + cleaned;
    }
    return '+' + cleaned;
  }

  /**
   * Send OTP for registration or login
   */
  async sendOTP(phone: string, purpose: string = 'registration'): Promise<SendOTPResult> {
    const formattedPhone = this.formatPhone(phone);

    // Check rate limiting (max 5 OTPs per hour)
    const rateCheck = await this.db.query(`
      SELECT COUNT(*) as count FROM bigcompany.otp_codes
      WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'
    `, [formattedPhone]);

    if (parseInt(rateCheck.rows[0].count) >= 5) {
      return {
        success: false,
        message: 'Too many OTP requests. Please try again later.',
      };
    }

    // Invalidate previous OTPs
    await this.db.query(`
      UPDATE bigcompany.otp_codes
      SET expires_at = NOW()
      WHERE phone = $1 AND verified = false AND expires_at > NOW()
    `, [formattedPhone]);

    // Generate and store new OTP
    const otp = this.generateOTP();
    const otpHash = this.hashOTP(otp);
    const expiresAt = new Date(Date.now() + this.expiryMinutes * 60 * 1000);

    const result = await this.db.query(`
      INSERT INTO bigcompany.otp_codes (phone, otp_hash, purpose, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [formattedPhone, otpHash, purpose, expiresAt]);

    // Send SMS
    const smsResult = await this.smsService.sendOTP(formattedPhone, otp);

    if (!smsResult.success) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      // Still return success as OTP was created (for testing without SMS)
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      otpId: result.rows[0].id,
      expiresIn: this.expiryMinutes * 60,
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(phone: string, otp: string, purpose: string = 'registration'): Promise<VerifyResult> {
    const formattedPhone = this.formatPhone(phone);
    const otpHash = this.hashOTP(otp);

    // Find valid OTP
    const result = await this.db.query(`
      SELECT * FROM bigcompany.otp_codes
      WHERE phone = $1 AND purpose = $2 AND verified = false AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [formattedPhone, purpose]);

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'OTP expired or not found. Please request a new one.',
      };
    }

    const otpRecord = result.rows[0] as OTPRecord;

    // Check max attempts
    if (otpRecord.attempts >= this.maxAttempts) {
      await this.db.query(`
        UPDATE bigcompany.otp_codes SET expires_at = NOW() WHERE id = $1
      `, [otpRecord.id]);
      return {
        success: false,
        message: 'Maximum attempts exceeded. Please request a new OTP.',
      };
    }

    // Increment attempts
    await this.db.query(`
      UPDATE bigcompany.otp_codes SET attempts = attempts + 1 WHERE id = $1
    `, [otpRecord.id]);

    // Verify OTP
    if (otpRecord.otp_hash !== otpHash) {
      return {
        success: false,
        message: `Invalid OTP. ${this.maxAttempts - otpRecord.attempts - 1} attempts remaining.`,
      };
    }

    // Mark as verified
    await this.db.query(`
      UPDATE bigcompany.otp_codes
      SET verified = true, verified_at = NOW()
      WHERE id = $1
    `, [otpRecord.id]);

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  }

  /**
   * Send login OTP (for existing users)
   */
  async sendLoginOTP(phone: string): Promise<SendOTPResult> {
    return this.sendOTP(phone, 'login');
  }

  /**
   * Verify login OTP
   */
  async verifyLoginOTP(phone: string, otp: string): Promise<VerifyResult> {
    return this.verifyOTP(phone, otp, 'login');
  }

  /**
   * Send password reset OTP
   */
  async sendResetOTP(phone: string): Promise<SendOTPResult> {
    return this.sendOTP(phone, 'reset');
  }

  /**
   * Verify password reset OTP
   */
  async verifyResetOTP(phone: string, otp: string): Promise<VerifyResult> {
    return this.verifyOTP(phone, otp, 'reset');
  }

  /**
   * Send transaction verification OTP
   */
  async sendTransactionOTP(phone: string, amount: number): Promise<SendOTPResult> {
    const formattedPhone = this.formatPhone(phone);
    const otp = this.generateOTP();
    const otpHash = this.hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes for transactions

    const result = await this.db.query(`
      INSERT INTO bigcompany.otp_codes (phone, otp_hash, purpose, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [formattedPhone, otpHash, 'transaction', expiresAt]);

    // Send transaction OTP with amount
    await this.smsService.send({
      to: formattedPhone,
      message: `BIG: Your verification code for ${amount.toLocaleString()} RWF transaction is: ${otp}. Valid for 5 minutes.`,
    });

    return {
      success: true,
      message: 'Transaction OTP sent',
      otpId: result.rows[0].id,
      expiresIn: 300,
    };
  }

  /**
   * Clean up expired OTPs (call periodically)
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.db.query(`
      DELETE FROM bigcompany.otp_codes
      WHERE expires_at < NOW() - INTERVAL '24 hours'
    `);
    return result.rowCount || 0;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.end();
  }
}

export default OTPService;
