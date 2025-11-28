import axios from 'axios';

const API_URL = import.meta.env.VITE_MEDUSA_BACKEND_URL || 'http://localhost:9000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('retailer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('retailer_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/retailer/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('retailer_token', response.data.access_token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('retailer_token');
  },

  getProfile: async () => {
    const response = await api.get('/retailer/me');
    return response.data;
  },
};

// ==================== DASHBOARD ====================
export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/retailer/dashboard/stats');
    return response.data;
  },

  getSalesChart: async (period: 'day' | 'week' | 'month' = 'week') => {
    const response = await api.get('/retailer/dashboard/sales', { params: { period } });
    return response.data;
  },

  getLowStockItems: async (limit = 10) => {
    const response = await api.get('/retailer/dashboard/low-stock', { params: { limit } });
    return response.data;
  },

  getRecentOrders: async (limit = 10) => {
    const response = await api.get('/retailer/dashboard/recent-orders', { params: { limit } });
    return response.data;
  },
};

// ==================== ORDERS ====================
export const ordersApi = {
  getOrders: async (params?: {
    status?: string;
    payment_status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) => {
    const response = await api.get('/retailer/orders', { params });
    return response.data;
  },

  getOrder: async (id: string) => {
    const response = await api.get(`/retailer/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string, notes?: string) => {
    const response = await api.post(`/retailer/orders/${id}/status`, { status, notes });
    return response.data;
  },

  fulfillOrder: async (id: string, trackingNumber?: string) => {
    const response = await api.post(`/retailer/orders/${id}/fulfill`, { tracking_number: trackingNumber });
    return response.data;
  },

  cancelOrder: async (id: string, reason: string) => {
    const response = await api.post(`/retailer/orders/${id}/cancel`, { reason });
    return response.data;
  },
};

// ==================== INVENTORY ====================
export const inventoryApi = {
  getProducts: async (params?: {
    category?: string;
    search?: string;
    low_stock?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/retailer/inventory', { params });
    return response.data;
  },

  getProduct: async (id: string) => {
    const response = await api.get(`/retailer/inventory/${id}`);
    return response.data;
  },

  updateStock: async (id: string, quantity: number, type: 'add' | 'remove' | 'set', reason?: string) => {
    const response = await api.post(`/retailer/inventory/${id}/stock`, {
      quantity,
      type,
      reason,
    });
    return response.data;
  },

  updatePrice: async (id: string, sellingPrice: number, costPrice?: number) => {
    const response = await api.post(`/retailer/inventory/${id}/price`, {
      selling_price: sellingPrice,
      cost_price: costPrice,
    });
    return response.data;
  },

  createProduct: async (data: {
    name: string;
    sku: string;
    category: string;
    cost_price: number;
    selling_price: number;
    stock: number;
    low_stock_threshold: number;
    barcode?: string;
    image?: string;
  }) => {
    const response = await api.post('/retailer/inventory', data);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/retailer/inventory/categories');
    return response.data;
  },
};

// ==================== CREDIT ORDERS ====================
export const creditApi = {
  getOrders: async (params?: {
    status?: 'pending' | 'approved' | 'rejected' | 'repaid';
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/retailer/credit-orders', { params });
    return response.data;
  },

  getOrder: async (id: string) => {
    const response = await api.get(`/retailer/credit-orders/${id}`);
    return response.data;
  },

  approveCredit: async (id: string, terms?: string) => {
    const response = await api.post(`/retailer/credit-orders/${id}/approve`, { terms });
    return response.data;
  },

  rejectCredit: async (id: string, reason: string) => {
    const response = await api.post(`/retailer/credit-orders/${id}/reject`, { reason });
    return response.data;
  },

  recordRepayment: async (id: string, amount: number, paymentMethod: string) => {
    const response = await api.post(`/retailer/credit-orders/${id}/repayment`, {
      amount,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  getCreditStats: async () => {
    const response = await api.get('/retailer/credit-orders/stats');
    return response.data;
  },
};

// ==================== POS ====================
export const posApi = {
  searchProducts: async (query: string) => {
    const response = await api.get('/retailer/pos/search', { params: { q: query } });
    return response.data;
  },

  scanBarcode: async (barcode: string) => {
    const response = await api.get('/retailer/pos/scan', { params: { barcode } });
    return response.data;
  },

  createSale: async (data: {
    items: Array<{ product_id: string; quantity: number; price: number }>;
    payment_method: 'cash' | 'wallet' | 'nfc' | 'credit';
    customer_phone?: string;
    discount?: number;
    notes?: string;
  }) => {
    const response = await api.post('/retailer/pos/sale', data);
    return response.data;
  },

  processNFCPayment: async (cardUid: string, amount: number, pin: string) => {
    const response = await api.post('/retailer/pos/nfc-payment', {
      card_uid: cardUid,
      amount,
      pin,
    });
    return response.data;
  },

  validateCustomer: async (phone: string) => {
    const response = await api.get('/retailer/pos/customer', { params: { phone } });
    return response.data;
  },

  getDailySales: async () => {
    const response = await api.get('/retailer/pos/daily-sales');
    return response.data;
  },
};

// ==================== REPORTS ====================
export const reportsApi = {
  getSalesReport: async (startDate: string, endDate: string) => {
    const response = await api.get('/retailer/reports/sales', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  getInventoryReport: async () => {
    const response = await api.get('/retailer/reports/inventory');
    return response.data;
  },

  getCreditReport: async () => {
    const response = await api.get('/retailer/reports/credit');
    return response.data;
  },

  exportReport: async (type: 'sales' | 'inventory' | 'credit', format: 'csv' | 'pdf') => {
    const response = await api.get(`/retailer/reports/${type}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;
