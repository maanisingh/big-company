import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import GasService from '../../../services/gas';
import RewardsService from '../../../services/rewards';
import SMSService from '../../../services/sms';
import { Pool } from 'pg';
import crypto from 'crypto';

const router = Router();

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const gasService = new GasService();
const rewardsService = new RewardsService();
const smsService = new SMSService();

const VALID_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];

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
    // Validate meter with provider
    const meterInfo = await gasService.validateMeter(meter_number);

    if (!meterInfo) {
      return res.status(400).json({ error: 'Invalid meter number. Please check and try again.' });
    }

    // Check if meter already linked to another user
    const existingMeter = await db.query(`
      SELECT user_id FROM bigcompany.utility_meters
      WHERE meter_number = $1 AND user_id IS NOT NULL AND user_id != $2
    `, [meterInfo.meterNumber, customerId]);

    if (existingMeter.rows.length > 0) {
      return res.status(400).json({ error: 'This meter is already linked to another account' });
    }

    // Register meter
    const result = await db.query(`
      INSERT INTO bigcompany.utility_meters (user_id, meter_type, meter_number, alias, provider, is_verified, metadata)
      VALUES ($1, 'gas', $2, $3, 'sts', true, $4)
      ON CONFLICT (meter_number, provider) DO UPDATE
      SET user_id = $1, alias = COALESCE($3, bigcompany.utility_meters.alias), is_verified = true, updated_at = NOW()
      RETURNING *
    `, [
      customerId,
      meterInfo.meterNumber,
      alias || meterInfo.customerName || `Gas Meter ${meterInfo.meterNumber}`,
      JSON.stringify(meterInfo),
    ]);

    res.json({
      success: true,
      meter: {
        id: result.rows[0].id,
        meter_number: result.rows[0].meter_number,
        alias: result.rows[0].alias,
        customer_name: meterInfo.customerName,
        address: meterInfo.address,
        tariff: meterInfo.tariff,
        is_verified: true,
      },
    });
  } catch (error: any) {
    console.error('Meter registration error:', error);
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
    const meters = await db.query(`
      SELECT
        id,
        meter_number,
        alias,
        provider,
        is_verified,
        is_default,
        metadata,
        created_at
      FROM bigcompany.utility_meters
      WHERE user_id = $1 AND meter_type = 'gas'
      ORDER BY is_default DESC, created_at DESC
    `, [customerId]);

    // Also get recent topups for each meter
    const metersWithHistory = await Promise.all(meters.rows.map(async (meter: any) => {
      const lastTopup = await db.query(`
        SELECT amount, token, units_purchased, created_at
        FROM bigcompany.utility_topups
        WHERE meter_id = $1 AND status = 'success'
        ORDER BY created_at DESC
        LIMIT 1
      `, [meter.id]);

      return {
        ...meter,
        last_topup: lastTopup.rows[0] || null,
      };
    }));

    res.json({ meters: metersWithHistory });
  } catch (error: any) {
    console.error('Get meters error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Set default meter
 * POST /store/gas/meters/:id/default
 */
router.post('/meters/:id/default', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const meterId = req.params.id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Clear current default
    await db.query(`
      UPDATE bigcompany.utility_meters
      SET is_default = false
      WHERE user_id = $1 AND meter_type = 'gas'
    `, [customerId]);

    // Set new default
    const result = await db.query(`
      UPDATE bigcompany.utility_meters
      SET is_default = true, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [meterId, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meter not found' });
    }

    res.json({ success: true, meter: result.rows[0] });
  } catch (error: any) {
    console.error('Set default meter error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Delete meter
 * DELETE /store/gas/meters/:id
 */
router.delete('/meters/:id', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const meterId = req.params.id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await db.query(`
      DELETE FROM bigcompany.utility_meters
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [meterId, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meter not found' });
    }

    res.json({ success: true, message: 'Meter removed successfully' });
  } catch (error: any) {
    console.error('Delete meter error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Validate meter number (without registering)
 * POST /store/gas/validate
 */
router.post('/validate', wrapHandler(async (req, res) => {
  const { meter_number } = req.body;

  if (!meter_number) {
    return res.status(400).json({ error: 'Meter number is required' });
  }

  try {
    const meterInfo = await gasService.validateMeter(meter_number);

    if (meterInfo) {
      res.json({
        valid: true,
        meter: meterInfo,
      });
    } else {
      res.json({
        valid: false,
        error: 'Invalid meter number',
      });
    }
  } catch (error: any) {
    console.error('Meter validation error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Purchase gas top-up
 * POST /store/gas/topup
 */
router.post('/topup', wrapHandler(async (req, res) => {
  const blnkService = req.scope.resolve('blnkService');
  const customerId = req.user?.customer_id;
  const { meter_id, meter_number, amount } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate amount
  if (!VALID_AMOUNTS.includes(amount)) {
    return res.status(400).json({
      error: 'Invalid amount',
      valid_amounts: VALID_AMOUNTS,
    });
  }

  try {
    let targetMeterNumber: string;
    let targetMeterId: string | null = null;

    // Get meter details
    if (meter_id) {
      const meters = await db.query(`
        SELECT * FROM bigcompany.utility_meters WHERE id = $1 AND user_id = $2
      `, [meter_id, customerId]);

      if (meters.rows.length === 0) {
        return res.status(404).json({ error: 'Meter not found' });
      }

      targetMeterNumber = meters.rows[0].meter_number;
      targetMeterId = meters.rows[0].id;
    } else if (meter_number) {
      // Direct meter number (for unregistered meters)
      const meterInfo = await gasService.validateMeter(meter_number);
      if (!meterInfo) {
        return res.status(400).json({ error: 'Invalid meter number' });
      }
      targetMeterNumber = meterInfo.meterNumber;
    } else {
      // Use default meter
      const defaultMeter = await db.query(`
        SELECT * FROM bigcompany.utility_meters
        WHERE user_id = $1 AND meter_type = 'gas' AND is_default = true
      `, [customerId]);

      if (defaultMeter.rows.length === 0) {
        return res.status(400).json({ error: 'No meter specified and no default meter set' });
      }

      targetMeterNumber = defaultMeter.rows[0].meter_number;
      targetMeterId = defaultMeter.rows[0].id;
    }

    // Check wallet balance
    const balance = await blnkService.getCustomerBalance(customerId, 'customer_wallets');

    // Also check food loan credit
    const foodLoanResult = await db.query(`
      SELECT principal, used_amount
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.borrower_id = $1 AND l.status IN ('disbursed', 'active') AND lp.loan_type = 'food_loan'
    `, [customerId]);

    const foodLoanCredit = foodLoanResult.rows.length > 0
      ? (foodLoanResult.rows[0].principal - (foodLoanResult.rows[0].used_amount || 0))
      : 0;

    const totalAvailable = balance + foodLoanCredit;

    if (totalAvailable < amount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        balance,
        food_loan_credit: foodLoanCredit,
        total_available: totalAvailable,
        required: amount,
      });
    }

    // Get customer phone for SMS
    const customer = await db.query(
      "SELECT phone, metadata->>'phone' as meta_phone FROM customer WHERE id = $1",
      [customerId]
    );
    const phone = customer.rows[0]?.phone || customer.rows[0]?.meta_phone;

    // Process purchase
    const purchaseResult = await gasService.purchaseUnits({
      meterNumber: targetMeterNumber,
      amount,
      customerId,
      phone: phone || '',
    });

    if (purchaseResult.success) {
      // Deduct from wallet (or loan credit)
      let paymentSource = 'wallet';
      if (balance >= amount) {
        await blnkService.debitCustomerWallet(
          customerId,
          amount,
          purchaseResult.transactionId || '',
          `Gas purchase - ${targetMeterNumber}`
        );
      } else {
        // Use loan credit first, then wallet
        const loanUsage = Math.min(foodLoanCredit, amount - balance);
        const walletUsage = amount - loanUsage;

        if (walletUsage > 0) {
          await blnkService.debitCustomerWallet(
            customerId,
            walletUsage,
            purchaseResult.transactionId || '',
            `Gas purchase - ${targetMeterNumber}`
          );
        }

        if (loanUsage > 0) {
          // Update loan used amount
          await db.query(`
            UPDATE bigcompany.loans
            SET used_amount = COALESCE(used_amount, 0) + $1, updated_at = NOW()
            WHERE borrower_id = $2 AND status IN ('disbursed', 'active')
          `, [loanUsage, customerId]);
          paymentSource = 'loan_credit';
        }
      }

      // Record topup
      await db.query(`
        INSERT INTO bigcompany.utility_topups
        (user_id, meter_id, amount, currency, token, units_purchased, status, provider_reference, metadata)
        VALUES ($1, $2, $3, 'RWF', $4, $5, 'success', $6, $7)
      `, [
        customerId,
        targetMeterId,
        amount,
        purchaseResult.token,
        purchaseResult.units,
        purchaseResult.transactionId,
        JSON.stringify({
          meter_number: targetMeterNumber,
          payment_source: paymentSource,
        }),
      ]);

      // Process reward eligibility
      if (amount >= 1000) {
        try {
          await rewardsService.processOrderReward(
            customerId,
            purchaseResult.transactionId || `GAS-${Date.now()}`,
            amount * 0.1, // Assume 10% profit margin for gas
            targetMeterNumber
          );
        } catch (rewardError) {
          console.error('Reward processing error:', rewardError);
        }
      }

      // Send SMS with token
      if (phone && purchaseResult.token) {
        await smsService.send({
          to: phone,
          message: `BIG Gas: ${purchaseResult.units} units purchased for meter ${targetMeterNumber}.\n\nTOKEN: ${purchaseResult.token}\n\nRef: ${purchaseResult.transactionId}`,
        });
      }

      res.json({
        success: true,
        topup: {
          transaction_id: purchaseResult.transactionId,
          meter_number: targetMeterNumber,
          amount,
          currency: 'RWF',
          units: purchaseResult.units,
          token: purchaseResult.token,
          payment_source: paymentSource,
        },
        message: purchaseResult.message,
      });
    } else {
      res.status(400).json({
        success: false,
        error: purchaseResult.error || 'Failed to purchase gas units',
      });
    }
  } catch (error: any) {
    console.error('Gas topup error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get gas top-up history
 * GET /store/gas/history
 */
router.get('/history', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const { limit = 20, offset = 0 } = req.query;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const history = await db.query(`
      SELECT
        t.id,
        t.amount,
        t.currency,
        t.token,
        t.units_purchased,
        t.status,
        t.provider_reference,
        t.created_at,
        t.metadata,
        m.meter_number,
        m.alias as meter_alias
      FROM bigcompany.utility_topups t
      LEFT JOIN bigcompany.utility_meters m ON t.meter_id = m.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [customerId, limit, offset]);

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bigcompany.utility_topups WHERE user_id = $1
    `, [customerId]);

    res.json({
      history: history.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Resend gas token via SMS
 * POST /store/gas/resend-token/:id
 */
router.post('/resend-token/:id', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const topupId = req.params.id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get topup details
    const topup = await db.query(`
      SELECT t.*, m.meter_number
      FROM bigcompany.utility_topups t
      LEFT JOIN bigcompany.utility_meters m ON t.meter_id = m.id
      WHERE t.id = $1 AND t.user_id = $2 AND t.status = 'success'
    `, [topupId, customerId]);

    if (topup.rows.length === 0) {
      return res.status(404).json({ error: 'Top-up not found' });
    }

    const record = topup.rows[0];

    if (!record.token) {
      return res.status(400).json({ error: 'No token available for this purchase' });
    }

    // Get customer phone
    const customer = await db.query(
      "SELECT phone, metadata->>'phone' as meta_phone FROM customer WHERE id = $1",
      [customerId]
    );
    const phone = customer.rows[0]?.phone || customer.rows[0]?.meta_phone;

    if (!phone) {
      return res.status(400).json({ error: 'No phone number on file' });
    }

    // Send SMS
    await smsService.send({
      to: phone,
      message: `BIG Gas Token Resend\n\nMeter: ${record.meter_number || record.metadata?.meter_number}\nTOKEN: ${record.token}\nUnits: ${record.units_purchased}\n\nRef: ${record.provider_reference}`,
    });

    res.json({
      success: true,
      message: 'Token sent to your phone',
    });
  } catch (error: any) {
    console.error('Resend token error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get predefined amounts
 * GET /store/gas/amounts
 */
router.get('/amounts', wrapHandler(async (_req, res) => {
  res.json({
    amounts: VALID_AMOUNTS,
    currency: 'RWF',
    conversion_note: 'Actual units depend on current tariff rates',
  });
}));

export default router;
