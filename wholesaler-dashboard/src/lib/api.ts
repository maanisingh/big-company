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
  const token = localStorage.getItem('wholesaler_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('wholesaler_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/wholesaler/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('wholesaler_token', response.data.access_token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('wholesaler_token');
  },

  getProfile: async () => {
    const response = await api.get('/wholesaler/me');
    return response.data;
  },
};

// ==================== DASHBOARD ====================
export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/wholesaler/dashboard/stats');
    return response.data;
  },

  getWeeklySales: async () => {
    const response = await api.get('/wholesaler/dashboard/weekly-sales');
    return response.data;
  },

  getTopRetailers: async (limit = 5) => {
    const response = await api.get('/wholesaler/dashboard/top-retailers', { params: { limit } });
    return response.data;
  },

  getPendingOrders: async (limit = 5) => {
    const response = await api.get('/wholesaler/dashboard/pending-orders', { params: { limit } });
    return response.data;
  },

  getCreditHealth: async () => {
    const response = await api.get('/wholesaler/dashboard/credit-health');
    return response.data;
  },

  getLowStockItems: async (limit = 10) => {
    const response = await api.get('/wholesaler/dashboard/low-stock', { params: { limit } });
    return response.data;
  },
};

// ==================== RETAILER ORDERS (B2B) ====================
export const ordersApi = {
  getOrders: async (params?: {
    status?: string;
    payment_type?: string;
    retailer_id?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) => {
    const response = await api.get('/wholesaler/orders', { params });
    return response.data;
  },

  getOrder: async (id: string) => {
    const response = await api.get(`/wholesaler/orders/${id}`);
    return response.data;
  },

  confirmOrder: async (id: string) => {
    const response = await api.post(`/wholesaler/orders/${id}/confirm`);
    return response.data;
  },

  rejectOrder: async (id: string, reason: string) => {
    const response = await api.post(`/wholesaler/orders/${id}/reject`, { reason });
    return response.data;
  },

  shipOrder: async (id: string, tracking?: string, deliveryNotes?: string) => {
    const response = await api.post(`/wholesaler/orders/${id}/ship`, {
      tracking_number: tracking,
      delivery_notes: deliveryNotes,
    });
    return response.data;
  },

  confirmDelivery: async (id: string, signature?: string) => {
    const response = await api.post(`/wholesaler/orders/${id}/deliver`, { signature });
    return response.data;
  },

  getOrderStats: async () => {
    const response = await api.get('/wholesaler/orders/stats');
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
    const response = await api.get('/wholesaler/inventory', { params });
    return response.data;
  },

  getProduct: async (id: string) => {
    const response = await api.get(`/wholesaler/inventory/${id}`);
    return response.data;
  },

  createProduct: async (data: {
    name: string;
    sku: string;
    category: string;
    cost_price: number;
    wholesale_price: number;
    stock: number;
    low_stock_threshold: number;
    unit: string;
    barcode?: string;
    image?: string;
  }) => {
    const response = await api.post('/wholesaler/inventory', data);
    return response.data;
  },

  updateProduct: async (id: string, data: Partial<{
    name: string;
    category: string;
    cost_price: number;
    wholesale_price: number;
    low_stock_threshold: number;
    unit: string;
    image?: string;
  }>) => {
    const response = await api.patch(`/wholesaler/inventory/${id}`, data);
    return response.data;
  },

  updateStock: async (id: string, quantity: number, type: 'add' | 'remove' | 'set', reason?: string) => {
    const response = await api.post(`/wholesaler/inventory/${id}/stock`, {
      quantity,
      type,
      reason,
    });
    return response.data;
  },

  updatePrice: async (id: string, wholesalePrice: number, costPrice?: number) => {
    const response = await api.post(`/wholesaler/inventory/${id}/price`, {
      wholesale_price: wholesalePrice,
      cost_price: costPrice,
    });
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/wholesaler/inventory/categories');
    return response.data;
  },

  getInventoryStats: async () => {
    const response = await api.get('/wholesaler/inventory/stats');
    return response.data;
  },
};

// ==================== RETAILERS ====================
export const retailersApi = {
  getRetailers: async (params?: {
    status?: 'active' | 'inactive' | 'pending';
    credit_status?: 'good' | 'warning' | 'critical';
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/wholesaler/retailers', { params });
    return response.data;
  },

  getRetailer: async (id: string) => {
    const response = await api.get(`/wholesaler/retailers/${id}`);
    return response.data;
  },

  updateRetailerCreditLimit: async (id: string, creditLimit: number) => {
    const response = await api.post(`/wholesaler/retailers/${id}/credit-limit`, {
      credit_limit: creditLimit,
    });
    return response.data;
  },

  getRetailerOrders: async (id: string, limit = 10) => {
    const response = await api.get(`/wholesaler/retailers/${id}/orders`, { params: { limit } });
    return response.data;
  },

  getRetailerStats: async (id: string) => {
    const response = await api.get(`/wholesaler/retailers/${id}/stats`);
    return response.data;
  },

  blockRetailer: async (id: string, reason: string) => {
    const response = await api.post(`/wholesaler/retailers/${id}/block`, { reason });
    return response.data;
  },

  unblockRetailer: async (id: string) => {
    const response = await api.post(`/wholesaler/retailers/${id}/unblock`);
    return response.data;
  },
};

// ==================== CREDIT APPROVALS ====================
export const creditApi = {
  getCreditRequests: async (params?: {
    status?: 'pending' | 'approved' | 'rejected';
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/wholesaler/credit-requests', { params });
    return response.data;
  },

  getCreditRequest: async (id: string) => {
    const response = await api.get(`/wholesaler/credit-requests/${id}`);
    return response.data;
  },

  approveCreditRequest: async (id: string, creditLimit: number, terms?: string) => {
    const response = await api.post(`/wholesaler/credit-requests/${id}/approve`, {
      credit_limit: creditLimit,
      terms,
    });
    return response.data;
  },

  rejectCreditRequest: async (id: string, reason: string) => {
    const response = await api.post(`/wholesaler/credit-requests/${id}/reject`, { reason });
    return response.data;
  },

  getCreditStats: async () => {
    const response = await api.get('/wholesaler/credit-requests/stats');
    return response.data;
  },
};

// ==================== ANALYTICS ====================
export const analyticsApi = {
  getSalesReport: async (startDate: string, endDate: string) => {
    const response = await api.get('/wholesaler/analytics/sales', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  getRevenueByRetailer: async (period: 'week' | 'month' | 'quarter' = 'month') => {
    const response = await api.get('/wholesaler/analytics/revenue-by-retailer', { params: { period } });
    return response.data;
  },

  getProductPerformance: async (limit = 20) => {
    const response = await api.get('/wholesaler/analytics/product-performance', { params: { limit } });
    return response.data;
  },

  getRetailerGrowth: async () => {
    const response = await api.get('/wholesaler/analytics/retailer-growth');
    return response.data;
  },

  getCreditUtilization: async () => {
    const response = await api.get('/wholesaler/analytics/credit-utilization');
    return response.data;
  },

  exportReport: async (type: 'sales' | 'inventory' | 'retailers', format: 'csv' | 'pdf') => {
    const response = await api.get(`/wholesaler/analytics/${type}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;
