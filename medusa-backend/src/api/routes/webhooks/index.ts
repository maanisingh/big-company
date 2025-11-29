import { Router } from 'express';
import { addPaymentJob, addCreditJob } from '../../../workers/queue';

const router = Router();

/**
 * MTN MoMo Payment Callback
 * POST /webhooks/momo
 */
router.post('/momo', async (req, res) => {
  try {
    const {
      financialTransactionId,
      externalId,
      amount,
      currency,
      payer,
      status,
      reason,
    } = req.body;

    console.log('[MoMo Webhook] Received callback:', { financialTransactionId, status, amount });

    // Add job to process the payment
    await addPaymentJob({
      type: 'momo_callback',
      customerId: externalId,
      amount: parseFloat(amount),
      reference: financialTransactionId,
      provider: 'mtn_momo',
      phone: payer?.partyId || '',
      status: status,
      metadata: { currency, reason },
    });

    res.json({ success: true, message: 'Callback received' });
  } catch (error: any) {
    console.error('[MoMo Webhook] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Airtel Money Payment Callback
 * POST /webhooks/airtel
 */
router.post('/airtel', async (req, res) => {
  try {
    const { transaction } = req.body;
    const { id, airtel_money_id, amount, msisdn, status } = transaction || {};

    console.log('[Airtel Webhook] Received callback:', { airtel_money_id, status, amount });

    // Airtel uses 'TS' for successful transactions
    await addPaymentJob({
      type: 'airtel_callback',
      customerId: id,
      amount: parseFloat(amount),
      reference: airtel_money_id,
      provider: 'airtel_money',
      phone: msisdn,
      status: status,
    });

    res.json({ status: 'OK' });
  } catch (error: any) {
    console.error('[Airtel Webhook] Error:', error);
    res.status(500).json({ status: 'FAILED', error: error.message });
  }
});

/**
 * Generic Payment Provider Callback
 * POST /webhooks/payment
 */
router.post('/payment', async (req, res) => {
  try {
    const {
      provider,
      customer_id,
      amount,
      reference,
      phone,
      status,
      metadata,
    } = req.body;

    console.log('[Payment Webhook] Received:', { provider, reference, status });

    await addPaymentJob({
      type: 'wallet_topup',
      customerId: customer_id,
      amount: parseFloat(amount),
      reference,
      provider,
      phone,
      status: status || 'SUCCESSFUL',
      metadata,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Payment Webhook] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * B2B Credit Order Created/Updated
 * POST /webhooks/credit-order
 */
router.post('/credit-order', async (req, res) => {
  try {
    const {
      event, // 'created', 'approved', 'rejected', 'payment_due'
      order_id,
      retailer_id,
      wholesaler_id,
      amount,
      retailer_phone,
      wholesaler_phone,
      credit_score,
      auto_approve_limit,
      reason,
      days_overdue,
    } = req.body;

    console.log('[Credit Webhook] Event:', event, 'Order:', order_id);

    const jobType = event === 'created' ? 'credit_request' :
                    event === 'approved' ? 'credit_approved' :
                    event === 'rejected' ? 'credit_rejected' : 'payment_due';

    await addCreditJob({
      type: jobType,
      orderId: order_id,
      retailerId: retailer_id,
      wholesalerId: wholesaler_id,
      amount: parseFloat(amount),
      retailerPhone: retailer_phone,
      wholesalerPhone: wholesaler_phone,
      metadata: {
        creditScore: credit_score,
        autoApproveLimit: auto_approve_limit,
        reason,
        daysOverdue: days_overdue,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Credit Webhook] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
