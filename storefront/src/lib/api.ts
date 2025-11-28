import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Auth token interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('medusa_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('medusa_token');
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH (OTP-based) ====================

export const authApi = {
  // Request OTP for phone number
  requestOTP: async (phone: string) => {
    const response = await api.post('/store/auth/otp/request', { phone });
    return response.data;
  },

  // Verify OTP and get session
  verifyOTP: async (phone: string, otp: string) => {
    const response = await api.post('/store/auth/otp/verify', { phone, otp });
    if (response.data.access_token) {
      localStorage.setItem('medusa_token', response.data.access_token);
    }
    return response.data;
  },

  // Register new customer
  register: async (data: {
    phone: string;
    firstName: string;
    lastName: string;
    email?: string;
    pin: string;
  }) => {
    const response = await api.post('/store/auth/register', {
      phone: data.phone,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      pin: data.pin,
    });
    return response.data;
  },

  // Verify registration OTP
  verifyRegistration: async (phone: string, otp: string) => {
    const response = await api.post('/store/auth/register/verify', { phone, otp });
    if (response.data.access_token) {
      localStorage.setItem('medusa_token', response.data.access_token);
    }
    return response.data;
  },

  // PIN login (after OTP verified once)
  loginWithPIN: async (phone: string, pin: string) => {
    const response = await api.post('/store/auth/pin', { phone, pin });
    if (response.data.access_token) {
      localStorage.setItem('medusa_token', response.data.access_token);
    }
    return response.data;
  },

  // Get current user
  getMe: async () => {
    const response = await api.get('/store/customers/me');
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('medusa_token');
    localStorage.removeItem('auth-storage');
  },

  // Update profile
  updateProfile: async (data: { firstName?: string; lastName?: string; email?: string }) => {
    const response = await api.post('/store/customers/me', data);
    return response.data;
  },

  // Update PIN
  updatePIN: async (currentPin: string, newPin: string) => {
    const response = await api.post('/store/auth/pin/update', {
      current_pin: currentPin,
      new_pin: newPin,
    });
    return response.data;
  },
};

// ==================== WALLET ====================

export const walletApi = {
  getBalance: async () => {
    const response = await api.get('/store/wallet/balance');
    return response.data;
  },

  getTransactions: async (limit?: number, offset?: number) => {
    const response = await api.get('/store/wallet/transactions', {
      params: { limit, offset },
    });
    return response.data;
  },

  topUp: async (amount: number, paymentMethod: 'mtn_momo' | 'airtel_money', phoneNumber?: string) => {
    const response = await api.post('/store/wallet/topup', {
      amount,
      payment_method: paymentMethod,
      phone_number: phoneNumber,
    });
    return response.data;
  },

  checkTopUpStatus: async (reference: string) => {
    const response = await api.get(`/store/wallet/topup/${reference}/status`);
    return response.data;
  },

  transfer: async (toPhone: string, amount: number, pin: string) => {
    const response = await api.post('/store/wallet/transfer', {
      to_phone: toPhone,
      amount,
      pin,
    });
    return response.data;
  },
};

// ==================== GAS ====================

export const gasApi = {
  getMeters: async () => {
    const response = await api.get('/store/gas/meters');
    return response.data;
  },

  validateMeter: async (meterNumber: string) => {
    const response = await api.post('/store/gas/validate', { meter_number: meterNumber });
    return response.data;
  },

  registerMeter: async (meterNumber: string, alias?: string) => {
    const response = await api.post('/store/gas/meters', {
      meter_number: meterNumber,
      alias,
    });
    return response.data;
  },

  topUp: async (meterNumber: string, amount: number, paymentSource: 'wallet' | 'mtn_momo' | 'airtel_money') => {
    const response = await api.post('/store/gas/topup', {
      meter_number: meterNumber,
      amount,
      payment_source: paymentSource,
    });
    return response.data;
  },

  getHistory: async (limit?: number) => {
    const response = await api.get('/store/gas/history', { params: { limit } });
    return response.data;
  },

  getPredefinedAmounts: async () => {
    const response = await api.get('/store/gas/amounts');
    return response.data;
  },
};

// ==================== LOANS ====================

export const loansApi = {
  getProducts: async () => {
    const response = await api.get('/store/loans/products');
    return response.data;
  },

  getEligibility: async () => {
    const response = await api.get('/store/loans/eligibility');
    return response.data;
  },

  getLoans: async () => {
    const response = await api.get('/store/loans');
    return response.data;
  },

  getLoan: async (id: string) => {
    const response = await api.get(`/store/loans/${id}`);
    return response.data;
  },

  apply: async (productId: string, amount: number) => {
    const response = await api.post('/store/loans/apply', {
      product_id: productId,
      amount,
    });
    return response.data;
  },

  repay: async (loanId: string, amount: number, paymentMethod: 'wallet' | 'mtn_momo' | 'airtel_money') => {
    const response = await api.post(`/store/loans/${loanId}/repay`, {
      amount,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  getRepaymentSchedule: async (loanId: string) => {
    const response = await api.get(`/store/loans/${loanId}/schedule`);
    return response.data;
  },
};

// ==================== NFC CARDS ====================

export const nfcApi = {
  getCards: async () => {
    const response = await api.get('/store/nfc/cards');
    return response.data;
  },

  linkCard: async (cardUid: string, pin: string, alias?: string) => {
    const response = await api.post('/store/nfc/link', {
      card_uid: cardUid,
      pin,
      alias,
    });
    return response.data;
  },

  unlinkCard: async (cardUid: string, pin: string) => {
    const response = await api.post('/store/nfc/unlink', { card_uid: cardUid, pin });
    return response.data;
  },

  updateCardPIN: async (cardUid: string, currentPin: string, newPin: string) => {
    const response = await api.post('/store/nfc/pin', {
      card_uid: cardUid,
      current_pin: currentPin,
      new_pin: newPin,
    });
    return response.data;
  },

  blockCard: async (cardUid: string, pin: string) => {
    const response = await api.post('/store/nfc/block', { card_uid: cardUid, pin });
    return response.data;
  },

  unblockCard: async (cardUid: string, pin: string) => {
    const response = await api.post('/store/nfc/unblock', { card_uid: cardUid, pin });
    return response.data;
  },

  getCardTransactions: async (cardUid: string, limit?: number) => {
    const response = await api.get(`/store/nfc/cards/${cardUid}/transactions`, {
      params: { limit },
    });
    return response.data;
  },
};

// ==================== REWARDS ====================

export const rewardsApi = {
  getBalance: async () => {
    const response = await api.get('/store/rewards/balance');
    return response.data;
  },

  getHistory: async (limit?: number, offset?: number, type?: string) => {
    const response = await api.get('/store/rewards/history', {
      params: { limit, offset, type },
    });
    return response.data;
  },

  redeem: async (points: number) => {
    const response = await api.post('/store/rewards/redeem', { points });
    return response.data;
  },

  getReferralCode: async () => {
    const response = await api.get('/store/rewards/referral-code');
    return response.data;
  },

  applyReferral: async (code: string) => {
    const response = await api.post('/store/rewards/apply-referral', { referralCode: code });
    return response.data;
  },

  getLeaderboard: async (period?: 'week' | 'month' | 'year') => {
    const response = await api.get('/store/rewards/leaderboard', { params: { period } });
    return response.data;
  },
};

// ==================== SHOP/PRODUCTS ====================

export const shopApi = {
  getProducts: async (params?: {
    category?: string;
    search?: string;
    retailerId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/store/products', { params });
    return response.data;
  },

  getProduct: async (id: string) => {
    const response = await api.get(`/store/products/${id}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/store/product-categories');
    return response.data;
  },

  getRetailers: async (location?: { lat: number; lng: number }) => {
    const response = await api.get('/store/retailers', { params: location });
    return response.data;
  },

  getRetailer: async (id: string) => {
    const response = await api.get(`/store/retailers/${id}`);
    return response.data;
  },
};

// ==================== ORDERS ====================

export const ordersApi = {
  getOrders: async (limit?: number, offset?: number) => {
    const response = await api.get('/store/orders', { params: { limit, offset } });
    return response.data;
  },

  getOrder: async (id: string) => {
    const response = await api.get(`/store/orders/${id}`);
    return response.data;
  },

  createOrder: async (data: {
    retailerId: string;
    items: Array<{ variantId: string; quantity: number }>;
    paymentMethod: 'wallet' | 'cash_on_delivery' | 'food_loan';
    deliveryAddress?: string;
    notes?: string;
  }) => {
    const response = await api.post('/store/orders', {
      retailer_id: data.retailerId,
      items: data.items,
      payment_method: data.paymentMethod,
      delivery_address: data.deliveryAddress,
      notes: data.notes,
    });
    return response.data;
  },

  cancelOrder: async (id: string, reason?: string) => {
    const response = await api.post(`/store/orders/${id}/cancel`, { reason });
    return response.data;
  },

  trackOrder: async (id: string) => {
    const response = await api.get(`/store/orders/${id}/track`);
    return response.data;
  },
};

// ==================== CART ====================

export const cartApi = {
  getCart: async () => {
    const response = await api.get('/store/carts');
    return response.data;
  },

  createCart: async (retailerId?: string) => {
    const response = await api.post('/store/carts', { retailer_id: retailerId });
    return response.data;
  },

  addItem: async (cartId: string, variantId: string, quantity: number) => {
    const response = await api.post(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity,
    });
    return response.data;
  },

  updateItem: async (cartId: string, itemId: string, quantity: number) => {
    const response = await api.post(`/store/carts/${cartId}/line-items/${itemId}`, {
      quantity,
    });
    return response.data;
  },

  removeItem: async (cartId: string, itemId: string) => {
    const response = await api.delete(`/store/carts/${cartId}/line-items/${itemId}`);
    return response.data;
  },

  checkout: async (cartId: string, paymentMethod: string) => {
    const response = await api.post(`/store/carts/${cartId}/complete`, {
      payment_method: paymentMethod,
    });
    return response.data;
  },
};

export default api;
