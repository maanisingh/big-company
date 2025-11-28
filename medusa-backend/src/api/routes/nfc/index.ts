import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import { Pool } from 'pg';
import crypto from 'crypto';
import BlnkService from '../../../services/blnk';
import SMSService from '../../../services/sms';
import MTNMoMoService from '../../../services/momo';
import AirtelMoneyService from '../../../services/airtel';

const router = Router();

// Database pool
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Service instances
let blnkService: BlnkService;
let smsService: SMSService;
let momoService: MTNMoMoService;
let airtelService: AirtelMoneyService;

function initServices(container?: any) {
  if (!blnkService) {
    blnkService = new BlnkService(container);
    smsService = new SMSService();
    momoService = new MTNMoMoService();
    airtelService = new AirtelMoneyService();
  }
}

// PIN hashing
const PIN_SECRET = process.env.PIN_SECRET || 'bigcompany_pin_secret_2024';

function hashPin(pin: string): string {
  return crypto
    .createHash('sha256')
    .update(pin + PIN_SECRET)
    .digest('hex');
}

function verifyPin(inputPin: string, storedHash: string): boolean {
  return hashPin(inputPin) === storedHash;
}

// Generate Dashboard ID (printed on physical card)
function generateDashboardId(): string {
  const prefix = 'BIG';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`.substring(0, 15);
}

// Phone number helpers
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '250' + cleaned.substring(1);
  } else if (!cleaned.startsWith('250') && cleaned.length === 9) {
    cleaned = '250' + cleaned;
  }
  return cleaned;
}

function isMTNNumber(phone: string): boolean {
  const cleaned = normalizePhone(phone);
  const prefix = cleaned.substring(3, 5);
  return ['78', '79'].includes(prefix);
}

// ==================== CUSTOMER ENDPOINTS ====================

/**
 * Link NFC card to customer account
 * POST /store/nfc/link
 */
router.post('/link', wrapHandler(async (req, res) => {
  initServices(req.scope);
  const customerId = req.user?.customer_id;
  const { card_uid, alias, pin } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!card_uid) {
    return res.status(400).json({ error: 'Card UID is required' });
  }

  // Validate PIN (4-6 digits)
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be 4-6 digits' });
  }

  try {
    const normalizedUid = card_uid.toUpperCase().trim();

    // Check if card exists in system
    const existingCard = await db.query(`
      SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1
    `, [normalizedUid]);

    let dashboardId: string;

    if (existingCard.rows.length > 0) {
      const card = existingCard.rows[0];

      // Check if already linked to another user
      if (card.user_id && card.user_id !== customerId) {
        return res.status(400).json({ error: 'This card is already linked to another account' });
      }

      // Check if already linked to this user
      if (card.user_id === customerId) {
        return res.status(400).json({ error: 'This card is already linked to your account' });
      }

      dashboardId = card.dashboard_id;

      // Link to user
      await db.query(`
        UPDATE bigcompany.nfc_cards
        SET user_id = $1, card_alias = $2, pin_hash = $3, is_active = true, linked_at = NOW()
        WHERE card_uid = $4
      `, [customerId, alias || 'My Card', hashPin(pin), normalizedUid]);
    } else {
      // Auto-register new card and link
      dashboardId = generateDashboardId();

      await db.query(`
        INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, user_id, card_alias, pin_hash, is_active, linked_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
      `, [normalizedUid, dashboardId, customerId, alias || 'My Card', hashPin(pin)]);
    }

    // Get customer phone for notification
    const customer = await db.query(`
      SELECT phone, email, first_name FROM customer WHERE id = $1
    `, [customerId]);

    if (customer.rows[0]?.phone) {
      await smsService.send({
        to: customer.rows[0].phone,
        message: `BIG Card linked successfully!\nCard ID: ${dashboardId}\nManage at bigcompany.rw or *939#`,
      });
    }

    // Get linked card details
    const result = await db.query(`
      SELECT id, card_uid, dashboard_id, card_alias, is_active, linked_at
      FROM bigcompany.nfc_cards WHERE card_uid = $1
    `, [normalizedUid]);

    res.json({
      success: true,
      message: 'Card linked successfully',
      card: result.rows[0],
    });
  } catch (error: any) {
    console.error('Card link error:', error);
    res.status(500).json({ error: 'Failed to link card' });
  }
}));

/**
 * Get customer's NFC cards
 * GET /store/nfc/cards
 */
router.get('/cards', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const cards = await db.query(`
      SELECT id, card_uid, dashboard_id, card_alias, is_active, linked_at, last_used_at
      FROM bigcompany.nfc_cards
      WHERE user_id = $1
      ORDER BY linked_at DESC
    `, [customerId]);

    res.json({ cards: cards.rows });
  } catch (error: any) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Failed to get cards' });
  }
}));

/**
 * Get single card details
 * GET /store/nfc/cards/:id
 */
router.get('/cards/:id', wrapHandler(async (req, res) => {
  initServices(req.scope);
  const customerId = req.user?.customer_id;
  const cardId = req.params.id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const card = await db.query(`
      SELECT id, card_uid, dashboard_id, card_alias, is_active, linked_at, last_used_at
      FROM bigcompany.nfc_cards
      WHERE id = $1 AND user_id = $2
    `, [cardId, customerId]);

    if (card.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Get transaction history
    const transactions = await db.query(`
      SELECT * FROM bigcompany.nfc_transactions
      WHERE card_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [cardId]);

    res.json({
      card: card.rows[0],
      transactions: transactions.rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get card details' });
  }
}));

/**
 * Update card alias
 * PATCH /store/nfc/cards/:id
 */
router.patch('/cards/:id', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const cardId = req.params.id;
  const { alias } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await db.query(`
      UPDATE bigcompany.nfc_cards
      SET card_alias = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING id, card_uid, dashboard_id, card_alias, is_active
    `, [alias, cardId, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ success: true, card: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update card' });
  }
}));

/**
 * Update card PIN
 * POST /store/nfc/cards/:id/pin
 */
router.post('/cards/:id/pin', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const cardId = req.params.id;
  const { current_pin, new_pin } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate new PIN
  if (!new_pin || !/^\d{4,6}$/.test(new_pin)) {
    return res.status(400).json({ error: 'New PIN must be 4-6 digits' });
  }

  try {
    // Get card and verify current PIN
    const card = await db.query(`
      SELECT * FROM bigcompany.nfc_cards
      WHERE id = $1 AND user_id = $2
    `, [cardId, customerId]);

    if (card.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (!verifyPin(current_pin, card.rows[0].pin_hash)) {
      return res.status(401).json({ error: 'Current PIN is incorrect' });
    }

    // Update PIN
    await db.query(`
      UPDATE bigcompany.nfc_cards SET pin_hash = $1, updated_at = NOW()
      WHERE id = $2
    `, [hashPin(new_pin), cardId]);

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update PIN' });
  }
}));

/**
 * Block/Unblock card
 * POST /store/nfc/cards/:id/status
 */
router.post('/cards/:id/status', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const cardId = req.params.id;
  const { active, pin } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get card and verify PIN for blocking
    const card = await db.query(`
      SELECT * FROM bigcompany.nfc_cards
      WHERE id = $1 AND user_id = $2
    `, [cardId, customerId]);

    if (card.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Require PIN to unblock
    if (active === true && pin) {
      if (!verifyPin(pin, card.rows[0].pin_hash)) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
    }

    await db.query(`
      UPDATE bigcompany.nfc_cards SET is_active = $1, updated_at = NOW()
      WHERE id = $2
    `, [active, cardId]);

    res.json({
      success: true,
      message: active ? 'Card unblocked' : 'Card blocked',
      is_active: active,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update card status' });
  }
}));

/**
 * Unlink NFC card
 * DELETE /store/nfc/cards/:id
 */
router.delete('/cards/:id', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const cardId = req.params.id;
  const { pin } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get card and verify PIN
    const card = await db.query(`
      SELECT * FROM bigcompany.nfc_cards
      WHERE id = $1 AND user_id = $2
    `, [cardId, customerId]);

    if (card.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (pin && !verifyPin(pin, card.rows[0].pin_hash)) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Unlink (keep card in system but remove user association)
    await db.query(`
      UPDATE bigcompany.nfc_cards
      SET user_id = NULL, is_active = false, pin_hash = NULL, card_alias = NULL
      WHERE id = $1
    `, [cardId]);

    res.json({ success: true, message: 'Card unlinked successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to unlink card' });
  }
}));

// ==================== POS ENDPOINTS ====================

/**
 * POS: Validate NFC card (quick check without payment)
 * POST /pos/nfc/validate
 */
router.post('/validate', wrapHandler(async (req, res) => {
  const card_uid = req.body?.card_uid;

  if (!card_uid) {
    return res.status(400).json({
      valid: false,
      error: 'Card UID is required'
    });
  }

  try {
    const normalizedUid = card_uid.toUpperCase().trim();

    // Try to validate card
    let card;
    try {
      card = await db.query(`
        SELECT c.id, c.dashboard_id, c.card_alias, c.is_active, c.user_id,
               u.first_name, u.last_name
        FROM bigcompany.nfc_cards c
        LEFT JOIN customer u ON c.user_id = u.id
        WHERE c.card_uid = $1
      `, [normalizedUid]);
    } catch (dbError: any) {
      // Schema or table doesn't exist - return valid:false with message
      console.error('NFC validate DB error:', dbError.message);
      return res.status(404).json({
        valid: false,
        error: 'Card validation service unavailable',
      });
    }

    if (card.rows.length === 0) {
      return res.status(404).json({
        valid: false,
        error: 'Card not registered',
      });
    }

    const cardData = card.rows[0];

    res.json({
      valid: cardData.is_active && cardData.user_id !== null,
      dashboard_id: cardData.dashboard_id,
      card_alias: cardData.card_alias,
      is_active: cardData.is_active,
      is_linked: cardData.user_id !== null,
      customer_name: cardData.first_name
        ? `${cardData.first_name} ${cardData.last_name || ''}`.trim()
        : null,
    });
  } catch (error: any) {
    console.error('NFC validate error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
}));

/**
 * POS: Process NFC card payment (tap-to-pay)
 * POST /pos/nfc/pay
 *
 * Called by retailer POS terminals when customer taps card
 */
router.post('/pay', wrapHandler(async (req, res) => {
  initServices(req.scope);
  const { card_uid, pin, amount, merchant_id, order_reference, items } = req.body;

  // Validate required fields
  if (!card_uid || !amount || !merchant_id) {
    return res.status(400).json({ error: 'Missing required fields: card_uid, amount, merchant_id' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const normalizedUid = card_uid.toUpperCase().trim();

    // Get card with user details
    const cardResult = await db.query(`
      SELECT c.*, u.phone as customer_phone, u.email as customer_email,
             u.first_name, u.last_name
      FROM bigcompany.nfc_cards c
      JOIN customer u ON c.user_id = u.id
      WHERE c.card_uid = $1
    `, [normalizedUid]);

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found or not linked to an account' });
    }

    const card = cardResult.rows[0];

    // Check if card is active
    if (!card.is_active) {
      return res.status(400).json({ error: 'Card is blocked. Contact support or use *939#' });
    }

    // PIN required for amounts > 5000 RWF (configurable threshold)
    const PIN_THRESHOLD = Number(process.env.NFC_PIN_THRESHOLD) || 5000;

    if (amount > PIN_THRESHOLD) {
      if (!pin) {
        return res.status(400).json({
          error: 'PIN required for transactions over 5,000 RWF',
          requires_pin: true,
        });
      }

      if (!verifyPin(pin, card.pin_hash)) {
        // Log failed PIN attempt
        await db.query(`
          INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, 'nfc_pin_failed', 'nfc_card', $2, $3)
        `, [card.user_id, card.id, JSON.stringify({ merchant_id, amount })]);

        return res.status(401).json({ error: 'Invalid PIN' });
      }
    }

    // Get merchant details
    const merchant = await db.query(`
      SELECT * FROM bigcompany.merchant_profiles WHERE id = $1
    `, [merchant_id]);

    if (merchant.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const merchantData = merchant.rows[0];

    if (!merchantData.blnk_account_id) {
      return res.status(400).json({ error: 'Merchant wallet not configured' });
    }

    // Get customer wallet balance
    const walletBalance = await blnkService.getCustomerBalance(card.user_id, 'customer_wallets');

    // Also check food loan credit
    const loanResult = await db.query(`
      SELECT SUM(outstanding_balance) as credit FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('active', 'disbursed')
      AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')
    `, [card.user_id]);

    const foodCredit = Number(loanResult.rows[0]?.credit || 0);
    const totalAvailable = walletBalance + foodCredit;

    const transactionRef = `NFC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    if (totalAvailable >= amount) {
      // Sufficient balance - process payment
      try {
        // Determine payment source (wallet first, then loan credit)
        let walletDeduction = Math.min(walletBalance, amount);
        let loanDeduction = amount - walletDeduction;

        // Execute wallet transaction via Blnk
        if (walletDeduction > 0) {
          await blnkService.payFromWallet(
            card.user_id,
            merchantData.blnk_account_id,
            walletDeduction,
            transactionRef
          );
        }

        // Deduct from food loan if needed
        if (loanDeduction > 0) {
          await db.query(`
            UPDATE bigcompany.loans
            SET outstanding_balance = outstanding_balance - $1, updated_at = NOW()
            WHERE borrower_id = $2 AND status IN ('active', 'disbursed')
            AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')
            AND outstanding_balance >= $1
          `, [loanDeduction, card.user_id]);
        }

        // Update card last used
        await db.query(`
          UPDATE bigcompany.nfc_cards SET last_used_at = NOW() WHERE id = $1
        `, [card.id]);

        // Record transaction
        await db.query(`
          INSERT INTO bigcompany.nfc_transactions
          (card_id, user_id, merchant_id, amount, currency, transaction_ref, status, payment_source, metadata)
          VALUES ($1, $2, $3, $4, 'RWF', $5, 'success', $6, $7)
        `, [
          card.id,
          card.user_id,
          merchant_id,
          amount,
          transactionRef,
          walletDeduction > 0 && loanDeduction > 0 ? 'wallet+loan' : walletDeduction > 0 ? 'wallet' : 'loan',
          JSON.stringify({
            order_reference,
            items,
            wallet_deduction: walletDeduction,
            loan_deduction: loanDeduction,
          }),
        ]);

        // Calculate new balance
        const newWalletBalance = walletBalance - walletDeduction;
        const newLoanCredit = foodCredit - loanDeduction;

        // Send SMS notification
        if (card.customer_phone) {
          await smsService.send({
            to: card.customer_phone,
            message: `BIG: Payment of ${amount.toLocaleString()} RWF at ${merchantData.business_name} successful. Ref: ${transactionRef.substring(0, 12)}. Balance: ${newWalletBalance.toLocaleString()} RWF`,
          });
        }

        res.json({
          success: true,
          transaction_ref: transactionRef,
          amount,
          currency: 'RWF',
          merchant: merchantData.business_name,
          customer_name: `${card.first_name || ''} ${card.last_name || ''}`.trim() || 'Customer',
          dashboard_id: card.dashboard_id,
          new_balance: newWalletBalance,
          message: 'Payment successful',
        });
      } catch (error: any) {
        console.error('NFC payment processing error:', error);

        // Record failed transaction
        await db.query(`
          INSERT INTO bigcompany.nfc_transactions
          (card_id, user_id, merchant_id, amount, currency, transaction_ref, status, metadata)
          VALUES ($1, $2, $3, $4, 'RWF', $5, 'failed', $6)
        `, [card.id, card.user_id, merchant_id, amount, transactionRef, JSON.stringify({ error: error.message })]);

        return res.status(500).json({ error: 'Payment processing failed' });
      }
    } else {
      // Insufficient balance - trigger MoMo push to top up
      const shortfall = amount - totalAvailable;
      const phone = card.customer_phone;

      if (!phone) {
        return res.status(400).json({
          error: 'Insufficient balance',
          balance: totalAvailable,
          required: amount,
          shortfall,
        });
      }

      // Initiate mobile money collection for shortfall
      const momoRef = `NFC-MOMO-${Date.now()}`;
      let momoResult;

      if (isMTNNumber(phone)) {
        momoResult = await momoService.requestPayment({
          amount: shortfall,
          currency: 'RWF',
          externalId: momoRef,
          payerPhone: phone,
          payerMessage: `BIG Top-up for payment at ${merchantData.business_name}`,
        });
      } else {
        momoResult = await airtelService.requestPayment({
          amount: shortfall,
          phone: phone,
          reference: momoRef,
        });
      }

      if (momoResult?.success) {
        // Store pending transaction for webhook completion
        await db.query(`
          INSERT INTO bigcompany.nfc_transactions
          (card_id, user_id, merchant_id, amount, currency, transaction_ref, status, metadata)
          VALUES ($1, $2, $3, $4, 'RWF', $5, 'pending_momo', $6)
        `, [
          card.id,
          card.user_id,
          merchant_id,
          amount,
          transactionRef,
          JSON.stringify({
            order_reference,
            items,
            shortfall,
            wallet_balance: walletBalance,
            loan_credit: foodCredit,
            momo_reference: momoRef,
            momo_provider: isMTNNumber(phone) ? 'mtn' : 'airtel',
          }),
        ]);

        return res.status(202).json({
          success: false,
          pending_momo: true,
          transaction_ref: transactionRef,
          momo_reference: momoResult.referenceId || momoResult.transactionId,
          shortfall,
          message: `Insufficient balance. MoMo request sent for ${shortfall.toLocaleString()} RWF. Approve on your phone.`,
        });
      }

      // MoMo failed
      return res.status(400).json({
        error: 'Insufficient balance',
        balance: totalAvailable,
        required: amount,
        shortfall,
        message: `Balance: ${totalAvailable.toLocaleString()} RWF. Need: ${amount.toLocaleString()} RWF`,
      });
    }
  } catch (error: any) {
    console.error('NFC pay error:', error);
    res.status(500).json({ error: 'Payment failed' });
  }
}));

/**
 * POS: Check payment status (for pending MoMo payments)
 * GET /pos/nfc/status/:reference
 */
router.get('/status/:reference', wrapHandler(async (req, res) => {
  const reference = req.params.reference;

  try {
    const transaction = await db.query(`
      SELECT t.*, m.business_name as merchant_name
      FROM bigcompany.nfc_transactions t
      LEFT JOIN bigcompany.merchant_profiles m ON t.merchant_id = m.id
      WHERE t.transaction_ref = $1
    `, [reference]);

    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = transaction.rows[0];

    res.json({
      reference: tx.transaction_ref,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      merchant: tx.merchant_name,
      created_at: tx.created_at,
      metadata: tx.metadata,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get status' });
  }
}));

/**
 * POS: Get card balance (for display on POS terminal)
 * POST /pos/nfc/balance
 */
router.post('/balance', wrapHandler(async (req, res) => {
  initServices(req.scope);
  const { card_uid, pin } = req.body;

  if (!card_uid) {
    return res.status(400).json({ error: 'Card UID is required' });
  }

  try {
    const normalizedUid = card_uid.toUpperCase().trim();

    const card = await db.query(`
      SELECT c.*, u.first_name, u.last_name
      FROM bigcompany.nfc_cards c
      JOIN customer u ON c.user_id = u.id
      WHERE c.card_uid = $1 AND c.is_active = true
    `, [normalizedUid]);

    if (card.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found or inactive' });
    }

    const cardData = card.rows[0];

    // Verify PIN if provided
    if (pin && !verifyPin(pin, cardData.pin_hash)) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Get wallet balance
    const walletBalance = await blnkService.getCustomerBalance(cardData.user_id, 'customer_wallets');

    // Get food loan credit
    const loanResult = await db.query(`
      SELECT SUM(outstanding_balance) as credit FROM bigcompany.loans
      WHERE borrower_id = $1 AND status IN ('active', 'disbursed')
      AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')
    `, [cardData.user_id]);

    const foodCredit = Number(loanResult.rows[0]?.credit || 0);

    res.json({
      dashboard_id: cardData.dashboard_id,
      card_alias: cardData.card_alias,
      customer_name: `${cardData.first_name || ''} ${cardData.last_name || ''}`.trim(),
      wallet_balance: walletBalance,
      food_credit: foodCredit,
      total_available: walletBalance + foodCredit,
      currency: 'RWF',
    });
  } catch (error: any) {
    console.error('Balance check error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
}));

// ==================== ADMIN ENDPOINTS ====================

/**
 * Admin: Register new card (for card production/inventory)
 * POST /admin/nfc/register
 */
router.post('/register', wrapHandler(async (req, res) => {
  const { card_uid, batch_id } = req.body;

  if (!card_uid) {
    return res.status(400).json({ error: 'Card UID is required' });
  }

  try {
    const normalizedUid = card_uid.toUpperCase().trim();
    const dashboardId = generateDashboardId();

    await db.query(`
      INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, is_active, metadata)
      VALUES ($1, $2, false, $3)
      ON CONFLICT (card_uid) DO NOTHING
    `, [normalizedUid, dashboardId, JSON.stringify({ batch_id, registered_at: new Date() })]);

    res.json({
      success: true,
      card_uid: normalizedUid,
      dashboard_id: dashboardId,
      message: 'Card registered. Ready for customer linking.',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to register card' });
  }
}));

/**
 * Admin: Bulk register cards
 * POST /admin/nfc/register-bulk
 */
router.post('/register-bulk', wrapHandler(async (req, res) => {
  const { card_uids, batch_id } = req.body;

  if (!card_uids || !Array.isArray(card_uids) || card_uids.length === 0) {
    return res.status(400).json({ error: 'card_uids array is required' });
  }

  try {
    const results = [];

    for (const uid of card_uids) {
      const normalizedUid = uid.toUpperCase().trim();
      const dashboardId = generateDashboardId();

      try {
        await db.query(`
          INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, is_active, metadata)
          VALUES ($1, $2, false, $3)
          ON CONFLICT (card_uid) DO NOTHING
        `, [normalizedUid, dashboardId, JSON.stringify({ batch_id, registered_at: new Date() })]);

        results.push({ card_uid: normalizedUid, dashboard_id: dashboardId, success: true });
      } catch (error) {
        results.push({ card_uid: normalizedUid, success: false, error: 'Failed to register' });
      }
    }

    res.json({
      success: true,
      registered: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Bulk registration failed' });
  }
}));

export default router;
