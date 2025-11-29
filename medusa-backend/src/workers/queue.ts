import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection - only initialize if REDIS_URL is properly set
const REDIS_URL = process.env.REDIS_URL;
const shouldConnectRedis = REDIS_URL && REDIS_URL !== 'redis://localhost:6379' && REDIS_URL.includes('://');

let connection: IORedis | null = null;
let paymentQueue: Queue | null = null;
let smsQueue: Queue | null = null;
let loanQueue: Queue | null = null;
let gasQueue: Queue | null = null;
let creditQueue: Queue | null = null;

if (shouldConnectRedis) {
  console.log('[Queue] Initializing Redis connection...');
  connection = new IORedis(REDIS_URL!, {
    maxRetriesPerRequest: null,
    lazyConnect: true, // Don't connect until needed
  });

  // Define queues for different job types
  paymentQueue = new Queue('payments', { connection });
  smsQueue = new Queue('sms', { connection });
  loanQueue = new Queue('loans', { connection });
  gasQueue = new Queue('gas', { connection });
  creditQueue = new Queue('credit', { connection });
  console.log('[Queue] Redis queues initialized');
} else {
  console.log('[Queue] Skipping Redis initialization - REDIS_URL not configured');
}

// Job types
export type PaymentJobData = {
  type: 'momo_callback' | 'airtel_callback' | 'wallet_topup';
  customerId: string;
  amount: number;
  reference: string;
  provider: string;
  phone: string;
  status: string;
  metadata?: Record<string, any>;
};

export type SmsJobData = {
  type: 'order_confirmation' | 'payment_confirmation' | 'loan_update' | 'gas_topup' | 'credit_update' | 'otp';
  phone: string;
  message: string;
  metadata?: Record<string, any>;
};

export type LoanJobData = {
  type: 'application' | 'approval' | 'disbursement' | 'repayment_reminder';
  loanId: string;
  customerId: string;
  amount: number;
  phone: string;
  metadata?: Record<string, any>;
};

export type GasJobData = {
  type: 'topup_request' | 'topup_complete' | 'topup_failed';
  customerId: string;
  meterNumber: string;
  amount: number;
  phone: string;
  token?: string;
  units?: number;
  metadata?: Record<string, any>;
};

export type CreditJobData = {
  type: 'credit_request' | 'credit_approved' | 'credit_rejected' | 'payment_due';
  orderId: string;
  retailerId: string;
  wholesalerId: string;
  amount: number;
  retailerPhone: string;
  wholesalerPhone?: string;
  metadata?: Record<string, any>;
};

// Helper functions to add jobs - they return null if queues aren't initialized
export const addPaymentJob = (data: PaymentJobData) => {
  if (!paymentQueue) {
    console.warn('[Queue] Payment queue not available - job not added');
    return Promise.resolve(null);
  }
  return paymentQueue.add(data.type, data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
};

export const addSmsJob = (data: SmsJobData) => {
  if (!smsQueue) {
    console.warn('[Queue] SMS queue not available - job not added');
    return Promise.resolve(null);
  }
  return smsQueue.add(data.type, data, { attempts: 3, backoff: { type: 'fixed', delay: 2000 } });
};

export const addLoanJob = (data: LoanJobData) => {
  if (!loanQueue) {
    console.warn('[Queue] Loan queue not available - job not added');
    return Promise.resolve(null);
  }
  return loanQueue.add(data.type, data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
};

export const addGasJob = (data: GasJobData) => {
  if (!gasQueue) {
    console.warn('[Queue] Gas queue not available - job not added');
    return Promise.resolve(null);
  }
  return gasQueue.add(data.type, data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
};

export const addCreditJob = (data: CreditJobData) => {
  if (!creditQueue) {
    console.warn('[Queue] Credit queue not available - job not added');
    return Promise.resolve(null);
  }
  return creditQueue.add(data.type, data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
};

export { connection, paymentQueue, smsQueue, loanQueue, gasQueue, creditQueue };
