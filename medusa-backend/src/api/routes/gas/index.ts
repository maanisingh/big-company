import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import axios from 'axios';

const router = Router();

/**
 * Register a gas meter
 * POST /store/gas/meters
 */
router.post('/meters', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const { meter_number, alias } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!meter_number) {
    return res.status(400).json({ error: 'Meter number is required' });
  }

  try {
    // TODO: Verify meter with provider API
    // For now, just register it

    // Store in database via raw query (simplified)
    const manager = req.scope.resolve('manager');
    const result = await manager.query(`
      INSERT INTO bigcompany.utility_meters (user_id, meter_type, meter_number, alias, is_verified)
      VALUES ($1, 'gas', $2, $3, true)
      ON CONFLICT (meter_number, provider) DO UPDATE SET alias = $3
      RETURNING *
    `, [customerId, meter_number, alias || `Gas Meter ${meter_number}`]);

    res.json({
      success: true,
      meter: result[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get customer's gas meters
 * GET /store/gas/meters
 */
router.get('/meters', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const manager = req.scope.resolve('manager');
    const meters = await manager.query(`
      SELECT * FROM bigcompany.utility_meters
      WHERE user_id = $1 AND meter_type = 'gas'
      ORDER BY created_at DESC
    `, [customerId]);

    res.json({ meters });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Purchase gas top-up
 * POST /store/gas/topup
 */
router.post('/topup', wrapHandler(async (req, res) => {
  const blnkService = req.scope.resolve('blnkService');
  const smsService = req.scope.resolve('smsService');
  const customerId = req.user?.customer_id;
  const { meter_id, amount } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate amount (predefined amounts)
  const validAmounts = [300, 500, 1000, 2000, 5000, 10000];
  if (!validAmounts.includes(amount)) {
    return res.status(400).json({
      error: 'Invalid amount',
      valid_amounts: validAmounts
    });
  }

  try {
    const manager = req.scope.resolve('manager');

    // Get meter details
    const meters = await manager.query(`
      SELECT * FROM bigcompany.utility_meters WHERE id = $1 AND user_id = $2
    `, [meter_id, customerId]);

    if (meters.length === 0) {
      return res.status(404).json({ error: 'Meter not found' });
    }

    const meter = meters[0];

    // Check wallet balance
    const balance = await blnkService.getCustomerBalance(customerId, 'customer_wallets');
    if (balance < amount) {
      return res.status(400).json({
        error: 'Insufficient wallet balance',
        balance,
        required: amount,
      });
    }

    // Generate reference
    const reference = `GAS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // TODO: Call gas provider API to get token
    // For now, simulate token generation
    const token = `${Math.random().toString().substr(2, 4)}-${Math.random().toString().substr(2, 4)}-${Math.random().toString().substr(2, 4)}-${Math.random().toString().substr(2, 4)}-${Math.random().toString().substr(2, 4)}`;
    const units = Math.round(amount / 50); // Simulated conversion rate

    // Deduct from wallet (via Blnk)
    // const transaction = await blnkService.payFromWallet(customerWalletId, systemWalletId, amount, reference);

    // Record top-up
    const topupResult = await manager.query(`
      INSERT INTO bigcompany.utility_topups (user_id, meter_id, amount, currency, token, units_purchased, status, provider_reference)
      VALUES ($1, $2, $3, 'RWF', $4, $5, 'success', $6)
      RETURNING *
    `, [customerId, meter_id, amount, token, units, reference]);

    // Send SMS confirmation
    // await smsService.sendGasTopupConfirmation(customerPhone, meter.meter_number, token, units);

    res.json({
      success: true,
      topup: topupResult[0],
      token,
      units,
      meter_number: meter.meter_number,
      message: `Gas top-up successful. ${units} units credited to meter ${meter.meter_number}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get gas top-up history
 * GET /store/gas/history
 */
router.get('/history', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const manager = req.scope.resolve('manager');
    const history = await manager.query(`
      SELECT t.*, m.meter_number, m.alias as meter_alias
      FROM bigcompany.utility_topups t
      JOIN bigcompany.utility_meters m ON t.meter_id = m.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT 50
    `, [customerId]);

    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

export default router;
