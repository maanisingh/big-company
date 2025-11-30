import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import OTPService from '../../../services/otp';
import { Pool } from 'pg';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();

// Initialize OTP service
const otpService = new OTPService();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

const JWT_SECRET = process.env.JWT_SECRET || 'bigcompany_jwt_secret_change_in_production';

/**
 * Send OTP for registration
 * POST /store/auth/send-otp
 */
router.post('/send-otp', wrapHandler(async (req, res) => {
  const { phone, purpose = 'registration' } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Validate Rwandan phone number format
  const cleanPhone = phone.replace(/\D/g, '');
  if (!/^(250|0)?(78|79|72|73)\d{7}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'Invalid Rwandan phone number format' });
  }

  // Normalize to international format
  let normalizedPhone = cleanPhone;
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '250' + normalizedPhone.substring(1);
  } else if (!normalizedPhone.startsWith('250')) {
    normalizedPhone = '250' + normalizedPhone;
  }

  try {
    // Check if phone already registered (for registration purpose)
    if (purpose === 'registration') {
      const existing = await db.query(
        "SELECT id FROM customer WHERE phone = $1 OR metadata->>'phone' = $1",
        [normalizedPhone]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }

    // Send OTP
    const result = await otpService.sendOTP(normalizedPhone, purpose);

    if (result.success) {
      res.json({
        success: true,
        message: 'OTP sent successfully',
        phone: normalizedPhone,
        expires_in: 300, // 5 minutes
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to send OTP' });
    }
  } catch (error: any) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Verify OTP
 * POST /store/auth/verify-otp
 */
router.post('/verify-otp', wrapHandler(async (req, res) => {
  const { phone, otp, purpose = 'registration' } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  // Normalize phone
  let normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '250' + normalizedPhone.substring(1);
  } else if (!normalizedPhone.startsWith('250')) {
    normalizedPhone = '250' + normalizedPhone;
  }

  try {
    const result = await otpService.verifyOTP(normalizedPhone, otp, purpose);

    if (result.valid) {
      // Generate a verification token for registration flow
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Store verification token temporarily (valid for 10 minutes)
      await db.query(`
        INSERT INTO bigcompany.audit_logs (action, entity_type, entity_id, new_values)
        VALUES ('phone_verified', 'auth', $1, $2)
      `, [
        verificationToken,
        JSON.stringify({
          phone: normalizedPhone,
          purpose,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      ]);

      res.json({
        success: true,
        message: 'Phone verified successfully',
        verification_token: verificationToken,
        phone: normalizedPhone,
      });
    } else {
      res.status(400).json({ error: result.error || 'Invalid OTP' });
    }
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Register new customer with verified phone
 * POST /store/auth/register
 */
router.post('/register', wrapHandler(async (req, res) => {
  const { verification_token, first_name, last_name, email, pin } = req.body;

  if (!verification_token || !first_name || !pin) {
    return res.status(400).json({ error: 'Verification token, first name, and PIN are required' });
  }

  // Validate PIN (4-6 digits)
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be 4-6 digits' });
  }

  try {
    // Get verified phone from token
    const verification = await db.query(`
      SELECT new_values FROM bigcompany.audit_logs
      WHERE action = 'phone_verified' AND entity_type = 'auth' AND entity_id = $1
      ORDER BY created_at DESC LIMIT 1
    `, [verification_token]);

    if (verification.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const verificationData = verification.rows[0].new_values;

    // Check expiry
    if (new Date(verificationData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification token expired. Please verify your phone again.' });
    }

    const phone = verificationData.phone;

    // Check if already registered
    const existing = await db.query(
      "SELECT id FROM customer WHERE phone = $1 OR metadata->>'phone' = $1",
      [phone]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Hash PIN
    const pinHash = crypto
      .createHash('sha256')
      .update(pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret'))
      .digest('hex');

    // Generate customer email if not provided
    const customerEmail = email || `${phone}@bigcompany.rw`;

    // Create customer in Medusa
    const customerId = `cus_${crypto.randomBytes(12).toString('hex')}`;

    await db.query(`
      INSERT INTO customer (id, email, first_name, last_name, phone, metadata, has_account, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
    `, [
      customerId,
      customerEmail,
      first_name,
      last_name || '',
      phone,
      JSON.stringify({
        phone: phone,
        pin_hash: pinHash,
        registered_via: 'mobile_app',
        kyc_status: 'pending',
      }),
    ]);

    // Create Blnk wallet for customer
    const blnkService = req.scope.resolve('blnkService');
    try {
      await blnkService.createCustomerWallet(customerId, {
        name: `${first_name} ${last_name || ''}`.trim(),
        phone: phone,
      });
    } catch (blnkError: any) {
      console.error('Blnk wallet creation error:', blnkError);
      // Continue even if Blnk fails - can be created later
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        customer_id: customerId,
        phone: phone,
        email: customerEmail,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Delete verification token
    await db.query(`
      DELETE FROM bigcompany.audit_logs
      WHERE action = 'phone_verified' AND entity_type = 'auth' AND entity_id = $1
    `, [verification_token]);

    // Log registration
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'customer_registered', 'customer', $1, $2)
    `, [customerId, JSON.stringify({ phone, method: 'otp' })]);

    res.json({
      success: true,
      message: 'Registration successful',
      customer: {
        id: customerId,
        email: customerEmail,
        first_name,
        last_name: last_name || '',
        phone,
      },
      access_token: token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Login with phone and PIN
 * POST /store/auth/login
 */
router.post('/login', wrapHandler(async (req, res) => {
  // Ensure body exists
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const phone = req.body.phone;
  const pin = req.body.pin;

  if (!phone || !pin) {
    return res.status(400).json({ error: 'Phone number and PIN are required' });
  }

  // Ensure phone is a string before calling replace
  if (typeof phone !== 'string') {
    return res.status(400).json({ error: 'Phone must be a string' });
  }

  // Normalize phone
  let normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '250' + normalizedPhone.substring(1);
  } else if (!normalizedPhone.startsWith('250')) {
    normalizedPhone = '250' + normalizedPhone;
  }

  try {
    // Find customer
    const result = await db.query(`
      SELECT id, email, first_name, last_name, phone, metadata
      FROM customer
      WHERE phone = $1 OR metadata->>'phone' = $1
    `, [normalizedPhone]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone number or PIN' });
    }

    const customer = result.rows[0];
    const storedPinHash = customer.metadata?.pin_hash;

    if (!storedPinHash) {
      return res.status(401).json({ error: 'Account not properly set up. Please register again.' });
    }

    // Verify PIN
    const inputPinHash = crypto
      .createHash('sha256')
      .update(pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret'))
      .digest('hex');

    if (inputPinHash !== storedPinHash) {
      // Log failed attempt
      await db.query(`
        INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES ($1, 'login_failed', 'customer', $1, $2)
      `, [customer.id, JSON.stringify({ phone: normalizedPhone, reason: 'invalid_pin' })]);

      return res.status(401).json({ error: 'Invalid phone number or PIN' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        customer_id: customer.id,
        phone: normalizedPhone,
        email: customer.email,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Log successful login
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'login_success', 'customer', $1, $2)
    `, [customer.id, JSON.stringify({ phone: normalizedPhone })]);

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: normalizedPhone,
      },
      access_token: token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Login with OTP (passwordless)
 * POST /store/auth/login-otp
 */
router.post('/login-otp', wrapHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  // Normalize phone
  let normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '250' + normalizedPhone.substring(1);
  } else if (!normalizedPhone.startsWith('250')) {
    normalizedPhone = '250' + normalizedPhone;
  }

  try {
    // Verify OTP
    const otpResult = await otpService.verifyOTP(normalizedPhone, otp, 'login');

    if (!otpResult.valid) {
      return res.status(400).json({ error: otpResult.error || 'Invalid OTP' });
    }

    // Find customer
    const result = await db.query(`
      SELECT id, email, first_name, last_name, phone, metadata
      FROM customer
      WHERE phone = $1 OR metadata->>'phone' = $1
    `, [normalizedPhone]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Phone number not registered' });
    }

    const customer = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        customer_id: customer.id,
        phone: normalizedPhone,
        email: customer.email,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Log successful login
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'login_success', 'customer', $1, $2)
    `, [customer.id, JSON.stringify({ phone: normalizedPhone, method: 'otp' })]);

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: normalizedPhone,
      },
      access_token: token,
    });
  } catch (error: any) {
    console.error('OTP Login error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Change PIN
 * POST /store/auth/change-pin
 */
router.post('/change-pin', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const { current_pin, new_pin } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!current_pin || !new_pin) {
    return res.status(400).json({ error: 'Current PIN and new PIN are required' });
  }

  if (!/^\d{4,6}$/.test(new_pin)) {
    return res.status(400).json({ error: 'New PIN must be 4-6 digits' });
  }

  try {
    // Get customer
    const result = await db.query(
      'SELECT metadata FROM customer WHERE id = $1',
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const storedPinHash = result.rows[0].metadata?.pin_hash;

    // Verify current PIN
    const currentPinHash = crypto
      .createHash('sha256')
      .update(current_pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret'))
      .digest('hex');

    if (currentPinHash !== storedPinHash) {
      return res.status(401).json({ error: 'Current PIN is incorrect' });
    }

    // Hash new PIN
    const newPinHash = crypto
      .createHash('sha256')
      .update(new_pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret'))
      .digest('hex');

    // Update PIN
    await db.query(`
      UPDATE customer
      SET metadata = metadata || $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify({ pin_hash: newPinHash }), customerId]);

    // Log PIN change
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'pin_changed', 'customer', $1)
    `, [customerId]);

    res.json({ success: true, message: 'PIN changed successfully' });
  } catch (error: any) {
    console.error('Change PIN error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Reset PIN (with OTP verification)
 * POST /store/auth/reset-pin
 */
router.post('/reset-pin', wrapHandler(async (req, res) => {
  const { verification_token, new_pin } = req.body;

  if (!verification_token || !new_pin) {
    return res.status(400).json({ error: 'Verification token and new PIN are required' });
  }

  if (!/^\d{4,6}$/.test(new_pin)) {
    return res.status(400).json({ error: 'PIN must be 4-6 digits' });
  }

  try {
    // Get verified phone from token
    const verification = await db.query(`
      SELECT new_values FROM bigcompany.audit_logs
      WHERE action = 'phone_verified' AND entity_type = 'auth' AND entity_id = $1
      ORDER BY created_at DESC LIMIT 1
    `, [verification_token]);

    if (verification.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const verificationData = verification.rows[0].new_values;

    // Check expiry
    if (new Date(verificationData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification token expired' });
    }

    const phone = verificationData.phone;

    // Find customer
    const customer = await db.query(`
      SELECT id FROM customer WHERE phone = $1 OR metadata->>'phone' = $1
    `, [phone]);

    if (customer.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Hash new PIN
    const newPinHash = crypto
      .createHash('sha256')
      .update(new_pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret'))
      .digest('hex');

    // Update PIN
    await db.query(`
      UPDATE customer
      SET metadata = metadata || $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify({ pin_hash: newPinHash }), customer.rows[0].id]);

    // Delete verification token
    await db.query(`
      DELETE FROM bigcompany.audit_logs
      WHERE action = 'phone_verified' AND entity_type = 'auth' AND entity_id = $1
    `, [verification_token]);

    // Log PIN reset
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'pin_reset', 'customer', $1)
    `, [customer.rows[0].id]);

    res.json({ success: true, message: 'PIN reset successfully' });
  } catch (error: any) {
    console.error('Reset PIN error:', error);
    res.status(500).json({ error: error.message });
  }
}));

export default router;
