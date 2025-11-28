import { Worker, Job } from 'bullmq';
import { connection, PaymentJobData, SmsJobData, LoanJobData, GasJobData, CreditJobData } from './queue';
import SmsService from '../services/sms';
import BlnkService from '../services/blnk';

const smsService = new SmsService();
const blnkService = new BlnkService();

// Payment Worker - handles MoMo/Airtel callbacks and wallet operations
const paymentWorker = new Worker<PaymentJobData>(
  'payments',
  async (job: Job<PaymentJobData>) => {
    const { type, customerId, amount, reference, provider, phone, status } = job.data;
    console.log(`[Payment Worker] Processing ${type} job:`, job.id);

    if (status !== 'SUCCESSFUL' && status !== 'TS') {
      console.log(`[Payment Worker] Payment failed, logging failure`);
      // Log failure in database
      return { success: false, reason: 'Payment not successful' };
    }

    try {
      // Credit the customer's wallet via Blnk
      const walletId = `wallet_${customerId}`;
      await blnkService.topUpWallet(walletId, amount, reference);

      // Send confirmation SMS
      const message = `Your BIG wallet has been credited with ${amount.toLocaleString()} RWF via ${provider === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'}. Ref: ${reference}`;
      await smsService.sendSms(phone, message);

      console.log(`[Payment Worker] Successfully processed payment for ${customerId}`);
      return { success: true, walletId, amount };
    } catch (error) {
      console.error(`[Payment Worker] Error processing payment:`, error);
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

// SMS Worker - handles all SMS notifications
const smsWorker = new Worker<SmsJobData>(
  'sms',
  async (job: Job<SmsJobData>) => {
    const { type, phone, message } = job.data;
    console.log(`[SMS Worker] Sending ${type} SMS to ${phone}`);

    try {
      await smsService.sendSms(phone, message);
      console.log(`[SMS Worker] SMS sent successfully`);
      return { success: true, phone, type };
    } catch (error) {
      console.error(`[SMS Worker] Error sending SMS:`, error);
      throw error;
    }
  },
  { connection, concurrency: 10 }
);

// Loan Worker - handles loan applications, approvals, disbursements
const loanWorker = new Worker<LoanJobData>(
  'loans',
  async (job: Job<LoanJobData>) => {
    const { type, loanId, customerId, amount, phone, metadata } = job.data;
    console.log(`[Loan Worker] Processing ${type} for loan ${loanId}`);

    try {
      switch (type) {
        case 'application':
          // Check eligibility (simplified - in production, check credit score, history, etc.)
          const eligible = amount <= 100000; // Auto-approve up to 100k RWF

          if (eligible && amount <= 50000) {
            // Auto-approve small loans
            const walletId = `wallet_${customerId}`;
            await blnkService.disburseLoan(walletId, amount, `LOAN-${loanId}`);

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            await smsService.sendLoanApproval(phone, amount, dueDate.toLocaleDateString());
            return { success: true, status: 'approved', disbursed: true };
          } else if (eligible) {
            // Queue for manual review
            await smsService.sendSms(phone, `BIG: Your loan application for ${amount.toLocaleString()} RWF is under review. You'll receive an SMS within 24 hours.`);
            return { success: true, status: 'pending_review' };
          } else {
            await smsService.sendSms(phone, `BIG: Sorry, your loan application was not approved. Please try a smaller amount or contact support.`);
            return { success: true, status: 'rejected' };
          }

        case 'approval':
          // Disburse approved loan
          const walletId = `wallet_${customerId}`;
          await blnkService.disburseLoan(walletId, amount, `LOAN-${loanId}`);

          const due = new Date();
          due.setDate(due.getDate() + 30);
          await smsService.sendLoanApproval(phone, amount, due.toLocaleDateString());
          return { success: true, status: 'disbursed' };

        case 'repayment_reminder':
          const daysUntilDue = metadata?.daysUntilDue || 3;
          await smsService.sendSms(phone, `BIG: Reminder - Your loan of ${amount.toLocaleString()} RWF is due in ${daysUntilDue} days. Dial *939# to repay now.`);
          return { success: true, status: 'reminder_sent' };

        default:
          return { success: false, reason: 'Unknown loan job type' };
      }
    } catch (error) {
      console.error(`[Loan Worker] Error:`, error);
      throw error;
    }
  },
  { connection, concurrency: 3 }
);

// Gas Worker - handles gas top-up requests
const gasWorker = new Worker<GasJobData>(
  'gas',
  async (job: Job<GasJobData>) => {
    const { type, customerId, meterNumber, amount, phone, token, units } = job.data;
    console.log(`[Gas Worker] Processing ${type} for meter ${meterNumber}`);

    try {
      switch (type) {
        case 'topup_request':
          // Debit wallet first
          const walletId = `wallet_${customerId}`;
          await blnkService.payFromWallet(walletId, amount, `GAS-${meterNumber}-${Date.now()}`);

          // In production: Call actual gas provider API here
          // Simulating gas provider response
          const gasToken = `TOKEN-${Math.random().toString(36).substring(7).toUpperCase()}`;
          const gasUnits = Math.floor(amount / 100); // Simplified: 100 RWF per unit

          await smsService.sendGasTopupConfirmation(phone, meterNumber, amount, gasUnits, gasToken);
          return { success: true, token: gasToken, units: gasUnits };

        case 'topup_complete':
          await smsService.sendGasTopupConfirmation(phone, meterNumber, amount, units!, token!);
          return { success: true };

        case 'topup_failed':
          // Refund the customer
          const refundWalletId = `wallet_${customerId}`;
          await blnkService.topUpWallet(refundWalletId, amount, `REFUND-GAS-${meterNumber}`);
          await smsService.sendSms(phone, `BIG: Gas topup failed. Your ${amount.toLocaleString()} RWF has been refunded to your wallet.`);
          return { success: true, refunded: true };

        default:
          return { success: false, reason: 'Unknown gas job type' };
      }
    } catch (error) {
      console.error(`[Gas Worker] Error:`, error);
      throw error;
    }
  },
  { connection, concurrency: 3 }
);

// Credit Worker - handles B2B credit approvals
const creditWorker = new Worker<CreditJobData>(
  'credit',
  async (job: Job<CreditJobData>) => {
    const { type, orderId, retailerId, wholesalerId, amount, retailerPhone, wholesalerPhone, metadata } = job.data;
    console.log(`[Credit Worker] Processing ${type} for order ${orderId}`);

    try {
      switch (type) {
        case 'credit_request':
          // Check retailer's credit score (simplified)
          const creditScore = metadata?.creditScore || 75;
          const autoApproveLimit = metadata?.autoApproveLimit || 200000;

          if (creditScore >= 70 && amount <= autoApproveLimit) {
            // Auto-approve
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);

            await smsService.sendSms(retailerPhone, `BIG: Your credit order #${orderId} for ${amount.toLocaleString()} RWF has been APPROVED! Due: ${dueDate.toLocaleDateString()}`);
            return { success: true, status: 'approved', autoApproved: true };
          } else if (creditScore >= 70) {
            // Needs wholesaler approval
            if (wholesalerPhone) {
              await smsService.sendSms(wholesalerPhone, `BIG: Credit request from retailer for ${amount.toLocaleString()} RWF needs your approval. Check dashboard.`);
            }
            await smsService.sendSms(retailerPhone, `BIG: Your credit order #${orderId} is under review. You'll be notified once approved.`);
            return { success: true, status: 'pending_approval' };
          } else {
            await smsService.sendSms(retailerPhone, `BIG: Sorry, your credit order #${orderId} was declined. Please contact your wholesaler.`);
            return { success: true, status: 'rejected' };
          }

        case 'credit_approved':
          await smsService.sendSms(retailerPhone, `BIG: Great news! Your credit order #${orderId} for ${amount.toLocaleString()} RWF has been approved by the wholesaler!`);
          return { success: true };

        case 'credit_rejected':
          const reason = metadata?.reason || 'Not approved';
          await smsService.sendSms(retailerPhone, `BIG: Your credit order #${orderId} was not approved. Reason: ${reason}`);
          return { success: true };

        case 'payment_due':
          const daysOverdue = metadata?.daysOverdue || 0;
          if (daysOverdue > 0) {
            await smsService.sendSms(retailerPhone, `BIG: URGENT - Your credit payment of ${amount.toLocaleString()} RWF is ${daysOverdue} days overdue. Please pay immediately to maintain your credit standing.`);
          } else {
            await smsService.sendSms(retailerPhone, `BIG: Reminder - Your credit payment of ${amount.toLocaleString()} RWF is due today. Dial *939# or visit the app to pay.`);
          }
          return { success: true };

        default:
          return { success: false, reason: 'Unknown credit job type' };
      }
    } catch (error) {
      console.error(`[Credit Worker] Error:`, error);
      throw error;
    }
  },
  { connection, concurrency: 3 }
);

// Error handlers
[paymentWorker, smsWorker, loanWorker, gasWorker, creditWorker].forEach((worker) => {
  worker.on('failed', (job, err) => {
    console.error(`[${worker.name}] Job ${job?.id} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[${worker.name}] Job ${job.id} completed`);
  });
});

export { paymentWorker, smsWorker, loanWorker, gasWorker, creditWorker };

// Start all workers
export const startWorkers = () => {
  console.log('Starting all job workers...');
  // Workers are already started when instantiated
  console.log('All workers started successfully');
};
