import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import crypto from 'crypto';

const router = Router();

/**
 * Link NFC card to customer account
 * POST /store/nfc/link
 */
router.post('/link', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const { card_uid, alias, pin } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!card_uid) {
    return res.status(400).json({ error: 'Card UID is required' });
  }

  if (!pin || pin.length !== 4) {
    return res.status(400).json({ error: 'A 4-digit PIN is required' });
  }

  try {
    const manager = req.scope.resolve('manager');

    // Check if card already linked
    const existingCards = await manager.query(`
      SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1
    `, [card_uid]);

    if (existingCards.length > 0) {
      return res.status(400).json({ error: 'This card is already linked to an account' });
    }

    // Generate dashboard ID (printed on card)
    const dashboardId = `BC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Hash PIN
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    // Create card record
    const result = await manager.query(`
      INSERT INTO bigcompany.nfc_cards (user_id, card_uid, dashboard_id, card_alias, pin_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, card_uid, dashboard_id, card_alias, is_active, linked_at
    `, [customerId, card_uid, dashboardId, alias || 'My Card', pinHash]);

    res.json({
      success: true,
      message: 'Card linked successfully',
      card: result[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    const manager = req.scope.resolve('manager');
    const cards = await manager.query(`
      SELECT id, card_uid, dashboard_id, card_alias, is_active, linked_at, last_used_at
      FROM bigcompany.nfc_cards
      WHERE user_id = $1
      ORDER BY linked_at DESC
    `, [customerId]);

    res.json({ cards });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Unlink NFC card
 * DELETE /store/nfc/cards/:id
 */
router.delete('/cards/:id', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const cardId = req.params.id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const manager = req.scope.resolve('manager');
    const result = await manager.query(`
      DELETE FROM bigcompany.nfc_cards
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [cardId, customerId]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ success: true, message: 'Card unlinked successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * POS: Process NFC card payment
 * POST /pos/nfc/pay
 *
 * Used by retailer POS app to process card payments
 */
router.post('/pay', wrapHandler(async (req, res) => {
  const blnkService = req.scope.resolve('blnkService');
  const { card_uid, pin, amount, merchant_id, order_reference } = req.body;

  if (!card_uid || !pin || !amount || !merchant_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const manager = req.scope.resolve('manager');

    // Find card
    const cards = await manager.query(`
      SELECT c.*, u.email as customer_email, u.phone as customer_phone
      FROM bigcompany.nfc_cards c
      JOIN customer u ON c.user_id = u.id
      WHERE c.card_uid = $1 AND c.is_active = true
    `, [card_uid]);

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found or inactive' });
    }

    const card = cards[0];

    // Verify PIN
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
    if (pinHash !== card.pin_hash) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Check wallet balance
    const balance = await blnkService.getCustomerBalance(card.user_id, 'customer_wallets');
    if (balance < amount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        balance,
        required: amount,
      });
    }

    // Process payment
    // TODO: Get merchant wallet ID and process via Blnk
    const transactionRef = `NFC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update last used
    await manager.query(`
      UPDATE bigcompany.nfc_cards SET last_used_at = NOW() WHERE id = $1
    `, [card.id]);

    res.json({
      success: true,
      transaction_ref: transactionRef,
      amount,
      customer_name: card.customer_email,
      dashboard_id: card.dashboard_id,
      message: 'Payment successful',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * POS: Validate NFC card (check if valid without payment)
 * POST /pos/nfc/validate
 */
router.post('/validate', wrapHandler(async (req, res) => {
  const { card_uid } = req.body;

  if (!card_uid) {
    return res.status(400).json({ error: 'Card UID is required' });
  }

  try {
    const manager = req.scope.resolve('manager');

    const cards = await manager.query(`
      SELECT c.dashboard_id, c.card_alias, c.is_active
      FROM bigcompany.nfc_cards c
      WHERE c.card_uid = $1
    `, [card_uid]);

    if (cards.length === 0) {
      return res.status(404).json({
        valid: false,
        error: 'Card not registered',
      });
    }

    const card = cards[0];

    res.json({
      valid: card.is_active,
      dashboard_id: card.dashboard_id,
      card_alias: card.card_alias,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

export default router;
