import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';

const router = Router();

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

    res.json({
      customer_id: customerId,
      balance,
      currency: 'RWF',
    });
  } catch (error: any) {
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

  if (!customerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const transactions = await blnkService.listTransactions(customerId);
    res.json({ transactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Initiate wallet top-up (triggers mobile money push)
 * POST /store/wallet/topup
 */
router.post('/topup', wrapHandler(async (req, res) => {
  const blnkService = req.scope.resolve('blnkService');
  const smsService = req.scope.resolve('smsService');
  const customerId = req.user?.customer_id;
  const { amount, payment_method, phone_number } = req.body;

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
    // Generate reference
    const reference = `TOP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // TODO: Trigger mobile money collection via n8n webhook
    // For now, return pending status

    res.json({
      status: 'pending',
      reference,
      amount,
      currency: 'RWF',
      payment_method,
      message: 'Please approve the payment request on your phone',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}));

export default router;
