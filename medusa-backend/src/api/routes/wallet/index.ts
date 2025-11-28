import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import MTNMoMoService from '../../../services/momo';
import AirtelMoneyService from '../../../services/airtel';
import SMSService from '../../../services/sms';
import { Pool } from 'pg';
import crypto from 'crypto';

const router = Router();

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const momoService = new MTNMoMoService();
const airtelService = new AirtelMoneyService();
const smsService = new SMSService();

const VALID_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];

/**
 * Detect if phone number is MTN or Airtel
 */
function detectCarrier(phone: string): 'mtn' | 'airtel' | 'unknown' {
  const cleaned = phone.replace(/\D/g, '');
  const prefix = cleaned.substring(cleaned.length - 9, cleaned.length - 6);

  // MTN Rwanda: 078, 079
  if (prefix.startsWith('78') || prefix.startsWith('79')) {
    return 'mtn';
  }
  // Airtel Rwanda: 072, 073
  if (prefix.startsWith('72') || prefix.startsWith('73')) {
    return 'airtel';
  }
  return 'unknown';
}

/**
 * Get customer wallet balance
 * GET /store/wallet/balance
 */
router.get('/balance', wrapHandler(async (req, res) => {
  const blnkService = req.scope.resolve('blnkService');
  const customerId = req.user?.customer_id;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get customer's wallet balance from Blnk
    const balance = await blnkService.getCustomerBalance(customerId, 'customer_wallets');

    // Also get pending top-ups
    const pendingTopups = await db.query(`
      SELECT SUM(amount) as pending_amount
      FROM bigcompany.wallet_topups
      WHERE user_id = $1 AND status = 'pending'
    `, [customerId]);

    // Get loan credit (food loan available for spending)
    const activeLoan = await db.query(`
      SELECT l.*, lp.loan_type
      FROM bigcompany.loans l
      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id
      WHERE l.borrower_id = $1 AND l.status IN ('disbursed', 'active') AND lp.loan_type = 'food_loan'
    `, [customerId]);

    const foodLoanCredit = activeLoan.rows.length > 0
      ? (activeLoan.rows[0].principal - (activeLoan.rows[0].used_amount || 0))
      : 0;

    res.json({
      customer_id: customerId,
      balance: balance,
      currency: 'RWF',
      pending_topup: parseFloat(pendingTopups.rows[0]?.pending_amount) || 0,
      food_loan_credit: foodLoanCredit,
      total_available: balance + foodLoanCredit,
    });
  } catch (error: any) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get wallet transaction history
 * GET /store/wallet/transactions
 */
router.get('/transactions', wrapHandler(async (req, res) => {
  const blnkService = req.scope.resolve('blnkService');
  const customerId = req.user?.customer_id;
  const { limit = 50, offset = 0 } = req.query;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get transactions from Blnk
    const blnkTransactions = await blnkService.listTransactions(customerId);

    // Get additional local transactions (gas, loans, etc.)
    const localTransactions = await db.query(`
      SELECT
        'topup' as source,
        id,
        amount,
        'credit' as type,
        status,
        provider,
        provider_reference as reference,
        created_at,
        metadata
      FROM bigcompany.wallet_topups
      WHERE user_id = $1
      UNION ALL
      SELECT
        'gas' as source,
        id,
        amount,
        'debit' as type,
        status,
        'gas_provider' as provider,
        provider_reference as reference,
        created_at,
        metadata
      FROM bigcompany.utility_topups
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [customerId, limit, offset]);

    // Merge and format transactions
    const transactions = [
      ...blnkTransactions.map((tx: any) => ({
        id: tx.transaction_id,
        type: tx.source?.includes(customerId) ? 'debit' : 'credit',
        amount: parseFloat(tx.amount),
        description: tx.description || (tx.source?.includes(customerId) ? 'Payment' : 'Top-up'),
        status: tx.status,
        created_at: tx.created_at,
        reference: tx.reference,
      })),
      ...localTransactions.rows.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount),
        description: tx.source === 'topup' ? 'Wallet Top-up' : 'Gas Purchase',
        status: tx.status,
        created_at: tx.created_at,
        reference: tx.reference,
        metadata: tx.metadata,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      transactions: transactions.slice(0, parseInt(limit as string)),
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Initiate wallet top-up via mobile money
 * POST /store/wallet/topup
 */
router.post('/topup', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const { amount, payment_method, phone_number } = req.body;

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

  // Validate phone
  if (!phone_number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Normalize phone
  let normalizedPhone = phone_number.replace(/\D/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '250' + normalizedPhone.substring(1);
  } else if (!normalizedPhone.startsWith('250')) {
    normalizedPhone = '250' + normalizedPhone;
  }

  try {
    // Detect carrier if not specified
    const carrier = payment_method || detectCarrier(normalizedPhone);

    if (carrier === 'unknown') {
      return res.status(400).json({
        error: 'Could not detect mobile money provider. Please specify payment_method (mtn_momo or airtel_money)',
      });
    }

    // Generate reference
    const reference = `TOP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Create pending topup record
    await db.query(`
      INSERT INTO bigcompany.wallet_topups (user_id, amount, currency, status, provider, provider_reference, metadata)
      VALUES ($1, $2, 'RWF', 'pending', $3, $4, $5)
    `, [
      customerId,
      amount,
      carrier === 'mtn' || carrier === 'mtn_momo' ? 'mtn_momo' : 'airtel_money',
      reference,
      JSON.stringify({ phone: normalizedPhone }),
    ]);

    let paymentResult;

    // Initiate mobile money payment
    if (carrier === 'mtn' || carrier === 'mtn_momo') {
      paymentResult = await momoService.requestPayment({
        amount,
        currency: 'RWF',
        externalId: reference,
        payerPhone: normalizedPhone,
        payerMessage: `BIG Wallet Top-up - ${amount} RWF`,
        payeeNote: `Customer ${customerId} wallet topup`,
      });
    } else {
      paymentResult = await airtelService.requestPayment({
        amount,
        phone: normalizedPhone,
        reference,
        description: `BIG Wallet Top-up - ${amount} RWF`,
      });
    }

    if (paymentResult.success) {
      // Update with provider reference
      await db.query(`
        UPDATE bigcompany.wallet_topups
        SET metadata = metadata || $1
        WHERE provider_reference = $2
      `, [
        JSON.stringify({
          momo_reference: paymentResult.referenceId || paymentResult.transactionId,
        }),
        reference,
      ]);

      res.json({
        success: true,
        status: 'pending',
        reference,
        momo_reference: paymentResult.referenceId || paymentResult.transactionId,
        amount,
        currency: 'RWF',
        payment_method: carrier === 'mtn' || carrier === 'mtn_momo' ? 'mtn_momo' : 'airtel_money',
        message: 'Please approve the payment request on your phone',
      });
    } else {
      // Mark as failed
      await db.query(`
        UPDATE bigcompany.wallet_topups
        SET status = 'failed', metadata = metadata || $1
        WHERE provider_reference = $2
      `, [JSON.stringify({ error: paymentResult.error }), reference]);

      res.status(400).json({
        success: false,
        error: paymentResult.error || 'Failed to initiate payment',
      });
    }
  } catch (error: any) {
    console.error('Top-up initiation error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Check top-up status
 * GET /store/wallet/topup/:reference/status
 */
router.get('/topup/:reference/status', wrapHandler(async (req, res) => {
  const customerId = req.user?.customer_id;
  const { reference } = req.params;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const topup = await db.query(`
      SELECT * FROM bigcompany.wallet_topups
      WHERE provider_reference = $1 AND user_id = $2
    `, [reference, customerId]);

    if (topup.rows.length === 0) {
      return res.status(404).json({ error: 'Top-up not found' });
    }

    const record = topup.rows[0];

    // If still pending, check with provider
    if (record.status === 'pending') {
      let providerStatus;

      if (record.provider === 'mtn_momo') {
        providerStatus = await momoService.checkPaymentStatus(
          record.metadata?.momo_reference || reference
        );
      } else {
        providerStatus = await airtelService.checkPaymentStatus(
          record.metadata?.momo_reference || reference
        );
      }

      // Update status if changed
      if (providerStatus.status === 'SUCCESSFUL' || providerStatus.status === 'completed') {
        await db.query(`
          UPDATE bigcompany.wallet_topups
          SET status = 'success', completed_at = NOW()
          WHERE provider_reference = $1
        `, [reference]);

        // Credit wallet via Blnk
        const blnkService = req.scope.resolve('blnkService');
        try {
          await blnkService.creditCustomerWallet(
            customerId,
            record.amount,
            reference,
            `Wallet top-up via ${record.provider}`
          );

          // Send SMS notification
          const customer = await db.query(
            "SELECT phone, metadata->>'phone' as meta_phone FROM customer WHERE id = $1",
            [customerId]
          );
          const phone = customer.rows[0]?.phone || customer.rows[0]?.meta_phone;

          if (phone) {
            const balance = await blnkService.getCustomerBalance(customerId, 'customer_wallets');
            await smsService.send({
              to: phone,
              message: `BIG: Wallet topped up with ${record.amount.toLocaleString()} RWF. New balance: ${balance.toLocaleString()} RWF. Ref: ${reference}`,
            });
          }
        } catch (blnkError) {
          console.error('Blnk credit error:', blnkError);
        }

        return res.json({
          reference,
          status: 'success',
          amount: record.amount,
          currency: 'RWF',
          message: 'Top-up successful',
        });
      } else if (providerStatus.status === 'FAILED' || providerStatus.status === 'failed') {
        await db.query(`
          UPDATE bigcompany.wallet_topups
          SET status = 'failed', metadata = metadata || $1
          WHERE provider_reference = $2
        `, [JSON.stringify({ failure_reason: providerStatus.reason }), reference]);

        return res.json({
          reference,
          status: 'failed',
          amount: record.amount,
          currency: 'RWF',
          error: providerStatus.reason || 'Payment failed',
        });
      }
    }

    res.json({
      reference,
      status: record.status,
      amount: record.amount,
      currency: 'RWF',
      created_at: record.created_at,
      completed_at: record.completed_at,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Transfer to another BIG customer
 * POST /store/wallet/transfer
 */
router.post('/transfer', wrapHandler(async (req, res) => {
  const blnkService = req.scope.resolve('blnkService');
  const customerId = req.user?.customer_id;
  const { recipient_phone, amount, pin, note } = req.body;

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!recipient_phone || !amount || !pin) {
    return res.status(400).json({ error: 'Recipient phone, amount, and PIN are required' });
  }

  if (amount < 100) {
    return res.status(400).json({ error: 'Minimum transfer amount is 100 RWF' });
  }

  // Normalize recipient phone
  let normalizedPhone = recipient_phone.replace(/\D/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '250' + normalizedPhone.substring(1);
  } else if (!normalizedPhone.startsWith('250')) {
    normalizedPhone = '250' + normalizedPhone;
  }

  try {
    // Verify sender's PIN
    const sender = await db.query(
      'SELECT id, metadata, first_name, last_name FROM customer WHERE id = $1',
      [customerId]
    );

    const storedPinHash = sender.rows[0]?.metadata?.pin_hash;
    const crypto = await import('crypto');
    const inputPinHash = crypto
      .createHash('sha256')
      .update(pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret'))
      .digest('hex');

    if (inputPinHash !== storedPinHash) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Find recipient
    const recipient = await db.query(`
      SELECT id, first_name, last_name, phone, metadata->>'phone' as meta_phone
      FROM customer
      WHERE phone = $1 OR metadata->>'phone' = $1
    `, [normalizedPhone]);

    if (recipient.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found. They must have a BIG account.' });
    }

    const recipientData = recipient.rows[0];

    if (recipientData.id === customerId) {
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

    // Check sender balance
    const balance = await blnkService.getCustomerBalance(customerId, 'customer_wallets');
    if (balance < amount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        balance,
        required: amount,
      });
    }

    // Generate reference
    const reference = `TRF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Execute transfer via Blnk
    await blnkService.transfer(
      customerId,
      recipientData.id,
      amount,
      reference,
      note || `Transfer to ${recipientData.first_name}`
    );

    // Send SMS to both parties
    const senderPhone = sender.rows[0]?.metadata?.phone;
    const recipientPhone = recipientData.phone || recipientData.meta_phone;

    if (senderPhone) {
      await smsService.send({
        to: senderPhone,
        message: `BIG: You sent ${amount.toLocaleString()} RWF to ${recipientData.first_name}. Ref: ${reference}`,
      });
    }

    if (recipientPhone) {
      const senderName = `${sender.rows[0].first_name} ${sender.rows[0].last_name}`.trim();
      await smsService.send({
        to: recipientPhone,
        message: `BIG: You received ${amount.toLocaleString()} RWF from ${senderName}. Ref: ${reference}`,
      });
    }

    // Log transfer
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'wallet_transfer', 'transfer', $2, $3)
    `, [customerId, reference, JSON.stringify({
      from: customerId,
      to: recipientData.id,
      amount,
      note,
    })]);

    res.json({
      success: true,
      reference,
      amount,
      currency: 'RWF',
      recipient: {
        name: `${recipientData.first_name} ${recipientData.last_name}`.trim(),
        phone: normalizedPhone.slice(0, 6) + '***' + normalizedPhone.slice(-2),
      },
      message: 'Transfer successful',
    });
  } catch (error: any) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get predefined top-up amounts
 * GET /store/wallet/amounts
 */
router.get('/amounts', wrapHandler(async (_req, res) => {
  res.json({
    amounts: VALID_AMOUNTS,
    currency: 'RWF',
    payment_methods: [
      { id: 'mtn_momo', name: 'MTN Mobile Money', prefixes: ['078', '079'] },
      { id: 'airtel_money', name: 'Airtel Money', prefixes: ['072', '073'] },
    ],
  });
}));

export default router;
