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

// ==================== WALLET ====================

export const walletApi = {
  getBalance: async () => {
    const response = await api.get('/store/wallet/balance');
    return response.data;
  },

  getTransactions: async () => {
    const response = await api.get('/store/wallet/transactions');
    return response.data;
  },

  topUp: async (amount: number, paymentMethod: string, phoneNumber: string) => {
    const response = await api.post('/store/wallet/topup', {
      amount,
      payment_method: paymentMethod,
      phone_number: phoneNumber,
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

  registerMeter: async (meterNumber: string, alias?: string) => {
    const response = await api.post('/store/gas/meters', {
      meter_number: meterNumber,
      alias,
    });
    return response.data;
  },

  topUp: async (meterId: string, amount: number) => {
    const response = await api.post('/store/gas/topup', {
      meter_id: meterId,
      amount,
    });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/store/gas/history');
    return response.data;
  },
};

// ==================== LOANS ====================

export const loansApi = {
  getProducts: async () => {
    const response = await api.get('/store/loans/products');
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

  apply: async (loanProductId: string, amount: number) => {
    const response = await api.post('/store/loans/apply', {
      loan_product_id: loanProductId,
      amount,
    });
    return response.data;
  },

  repay: async (loanId: string, amount: number, paymentMethod: string) => {
    const response = await api.post(`/store/loans/${loanId}/repay`, {
      amount,
      payment_method: paymentMethod,
    });
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

  unlinkCard: async (cardId: string) => {
    const response = await api.delete(`/store/nfc/cards/${cardId}`);
    return response.data;
  },
};

// ==================== AUTH ====================

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/store/auth/token', {
      email,
      password,
    });
    if (response.data.access_token) {
      localStorage.setItem('medusa_token', response.data.access_token);
    }
    return response.data;
  },

  register: async (email: string, password: string, firstName: string, lastName: string, phone: string) => {
    const response = await api.post('/store/customers', {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('medusa_token');
  },

  getMe: async () => {
    const response = await api.get('/store/customers/me');
    return response.data;
  },
};

export default api;
