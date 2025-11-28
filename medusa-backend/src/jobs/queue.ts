import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Define queues for different job types
export const paymentQueue = new Queue('payments', { connection });
export const smsQueue = new Queue('sms', { connection });
export const loanQueue = new Queue('loans', { connection });
export const gasQueue = new Queue('gas', { connection });
export const creditQueue = new Queue('credit', { connection });

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

// Helper functions to add jobs
export const addPaymentJob = (data: PaymentJobData) =>
  paymentQueue.add(data.type, data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });

export const addSmsJob = (data: SmsJobData) =>
  smsQueue.add(data.type, data, { attempts: 3, backoff: { type: 'fixed', delay: 2000 } });

export const addLoanJob = (data: LoanJobData) =>
  loanQueue.add(data.type, data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });

export const addGasJob = (data: GasJobData) =>
  gasQueue.add(data.type, data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });

export const addCreditJob = (data: CreditJobData) =>
  creditQueue.add(data.type, data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });

export { connection };
