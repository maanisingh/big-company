import api, { handleApiError } from './api';
import {
  WalletBalance,
  TransactionHistory,
  TopUpRequest,
  TopUpResponse,
  PaymentMethod,
  TopUpOption,
} from '../types';

// Top-up amount options in RWF
export const TOP_UP_OPTIONS: TopUpOption[] = [
  { amount: 300, label: '300 RWF' },
  { amount: 500, label: '500 RWF' },
  { amount: 1000, label: '1,000 RWF' },
  { amount: 2000, label: '2,000 RWF' },
  { amount: 5000, label: '5,000 RWF', bonus: 100 },
  { amount: 10000, label: '10,000 RWF', bonus: 300 },
];

export const walletService = {
  // Get wallet balance
  async getBalance(): Promise<WalletBalance> {
    try {
      const response = await api.get<WalletBalance>('/store/wallet/balance');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get transaction history
  async getTransactions(page: number = 1, limit: number = 20): Promise<TransactionHistory> {
    try {
      const response = await api.get<TransactionHistory>('/store/wallet/transactions', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Top-up via Mobile Money (MTN MoMo or Airtel)
  async topUp(request: TopUpRequest): Promise<TopUpResponse> {
    try {
      const response = await api.post<TopUpResponse>('/store/wallet/top-up', request);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get available payment methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await api.get<{ methods: PaymentMethod[] }>('/store/wallet/payment-methods');
      return response.data.methods;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Transfer to another user (P2P)
  async transfer(recipientPhone: string, amount: number, pin: string): Promise<TopUpResponse> {
    try {
      const response = await api.post<TopUpResponse>('/store/wallet/transfer', {
        recipient_phone: recipientPhone,
        amount,
        pin,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Check loan balance
  async getLoanBalance(): Promise<{ balance: number; credit_limit: number; due_date?: string }> {
    try {
      const response = await api.get('/store/wallet/loan-balance');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Pay loan
  async payLoan(amount: number): Promise<TopUpResponse> {
    try {
      const response = await api.post<TopUpResponse>('/store/wallet/pay-loan', { amount });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};

export default walletService;
