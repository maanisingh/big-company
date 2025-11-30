import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://bigcompany-api.alexandratechlab.com';

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bigcompany_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bigcompany_token');
      localStorage.removeItem('bigcompany_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Consumer/Shop APIs
export const consumerApi = {
  // Retailers
  getRetailers: (params?: { lat?: number; lng?: number }) =>
    api.get('/store/retailers', { params }),

  // Categories
  getCategories: () => api.get('/store/categories'),

  // Products
  getProducts: (params?: { retailerId?: string; category?: string; search?: string; limit?: number }) =>
    api.get('/store/products', { params }),
  getProduct: (id: string) => api.get(`/store/products/${id}`),

  // Cart
  getCart: () => api.get('/store/carts'),
  createCart: (retailerId: string) => api.post('/store/carts', { retailer_id: retailerId }),
  addToCart: (cartId: string, productId: string, quantity: number) =>
    api.post(`/store/carts/${cartId}/line-items`, { product_id: productId, quantity }),
  updateCartItem: (cartId: string, itemId: string, quantity: number) =>
    api.put(`/store/carts/${cartId}/line-items/${itemId}`, { quantity }),
  removeCartItem: (cartId: string, itemId: string) =>
    api.delete(`/store/carts/${cartId}/line-items/${itemId}`),
  clearCart: (cartId: string) => api.delete(`/store/carts/${cartId}`),

  // Checkout
  checkout: (cartId: string, data?: { delivery_address?: string; notes?: string }) =>
    api.post(`/store/carts/${cartId}/complete`, data),

  // Orders
  getOrders: (params?: any) => api.get('/store/customers/me/orders', { params }),
  getOrder: (id: string) => api.get(`/store/customers/me/orders/${id}`),
  trackOrder: (id: string) => api.get(`/store/customers/me/orders/${id}/track`),
};

// Retailer APIs
export const retailerApi = {
  // Dashboard
  getDashboardStats: () => api.get('/retailer/dashboard/stats'),

  // Inventory
  getInventory: (params?: any) => api.get('/retailer/inventory', { params }),
  getProducts: (params?: any) => api.get('/retailer/inventory', { params }),
  getCategories: () => api.get('/retailer/inventory/categories'),
  createProduct: (data: any) => api.post('/retailer/inventory', data),
  updateProduct: (id: string, data: any) => api.put(`/retailer/inventory/${id}`, data),
  updateInventory: (id: string, data: any) => api.put(`/retailer/inventory/${id}`, data),
  updateStock: (id: string, quantity: number, type: string, reason?: string) =>
    api.post(`/retailer/inventory/${id}/stock`, { quantity, type, reason }),
  updatePrice: (id: string, sellingPrice: number, costPrice?: number) =>
    api.put(`/retailer/inventory/${id}/price`, { selling_price: sellingPrice, cost_price: costPrice }),

  // Orders
  getOrders: (params?: any) => api.get('/retailer/orders', { params }),
  getOrder: (id: string) => api.get(`/retailer/orders/${id}`),
  createOrder: (data: any) => api.post('/retailer/orders', data),
  updateOrderStatus: (id: string, status: string, notes?: string) =>
    api.put(`/retailer/orders/${id}/status`, { status, notes }),
  cancelOrder: (id: string, reason: string) =>
    api.post(`/retailer/orders/${id}/cancel`, { reason }),
  fulfillOrder: (id: string) => api.post(`/retailer/orders/${id}/fulfill`),

  // POS
  getPOSProducts: (params?: any) => api.get('/retailer/pos/products', { params }),
  scanBarcode: (barcode: string) => api.post('/retailer/pos/scan', { barcode }),
  createSale: (data: any) => api.post('/retailer/pos/sale', data),
  getDailySales: () => api.get('/retailer/pos/daily-sales'),

  // Wallet & Credit
  getWallet: () => api.get('/retailer/wallet'),
  getWalletBalance: () => api.get('/retailer/wallet/balance'),
  getWalletTransactions: (params?: any) => api.get('/retailer/wallet/transactions', { params }),
  getCreditInfo: () => api.get('/retailer/credit'),
  getCreditOrders: (params?: any) => api.get('/retailer/credit/orders', { params }),
  getCreditOrder: (id: string) => api.get(`/retailer/credit/orders/${id}`),
  requestCredit: (data: any) => api.post('/retailer/credit/request', data),
  makeRepayment: (orderId: string, amount: number) =>
    api.post(`/retailer/credit/orders/${orderId}/repay`, { amount }),

  // Wholesalers
  getWholesalers: () => api.get('/retailer/wholesalers'),
  getWholesalerProducts: (wholesalerId: string) =>
    api.get(`/retailer/wholesalers/${wholesalerId}/products`),
};

// Wholesaler APIs
export const wholesalerApi = {
  // Dashboard
  getDashboardStats: () => api.get('/wholesaler/dashboard/stats'),

  // Inventory
  getInventory: (params?: any) => api.get('/wholesaler/inventory', { params }),
  getProducts: (params?: any) => api.get('/wholesaler/inventory', { params }),
  getCategories: () => api.get('/wholesaler/inventory/categories'),
  getInventoryStats: () => api.get('/wholesaler/inventory/stats'),
  createProduct: (data: any) => api.post('/wholesaler/inventory', data),
  addInventory: (data: any) => api.post('/wholesaler/inventory', data),
  updateProduct: (id: string, data: any) => api.put(`/wholesaler/inventory/${id}`, data),
  updateInventory: (id: string, data: any) => api.put(`/wholesaler/inventory/${id}`, data),
  updateStock: (id: string, quantity: number, type: string, reason?: string) =>
    api.post(`/wholesaler/inventory/${id}/stock`, { quantity, type, reason }),
  updatePrice: (id: string, wholesalePrice: number, costPrice?: number) =>
    api.put(`/wholesaler/inventory/${id}/price`, { wholesale_price: wholesalePrice, cost_price: costPrice }),

  // Retailer Orders
  getRetailerOrders: (params?: any) => api.get('/wholesaler/retailer-orders', { params }),
  getOrders: (params?: any) => api.get('/wholesaler/retailer-orders', { params }),
  getOrder: (id: string) => api.get(`/wholesaler/retailer-orders/${id}`),
  getOrderStats: () => api.get('/wholesaler/retailer-orders/stats'),
  updateOrderStatus: (id: string, status: string) =>
    api.put(`/wholesaler/retailer-orders/${id}/status`, { status }),
  confirmOrder: (id: string) => api.post(`/wholesaler/retailer-orders/${id}/confirm`),
  rejectOrder: (id: string, reason: string) =>
    api.post(`/wholesaler/retailer-orders/${id}/reject`, { reason }),
  shipOrder: (id: string, trackingNumber?: string, deliveryNotes?: string) =>
    api.post(`/wholesaler/retailer-orders/${id}/ship`, { tracking_number: trackingNumber, delivery_notes: deliveryNotes }),
  confirmDelivery: (id: string) => api.post(`/wholesaler/retailer-orders/${id}/deliver`),

  // Retailers Management
  getRetailers: (params?: any) => api.get('/wholesaler/retailers', { params }),
  getRetailer: (id: string) => api.get(`/wholesaler/retailers/${id}`),
  getRetailerOrdersById: (id: string, limit?: number) =>
    api.get(`/wholesaler/retailers/${id}/orders`, { params: { limit } }),
  getRetailerStats: (id: string) => api.get(`/wholesaler/retailers/${id}/stats`),
  updateRetailerCreditLimit: (id: string, creditLimit: number) =>
    api.put(`/wholesaler/retailers/${id}/credit-limit`, { credit_limit: creditLimit }),
  blockRetailer: (id: string, reason: string) =>
    api.post(`/wholesaler/retailers/${id}/block`, { reason }),
  unblockRetailer: (id: string) => api.post(`/wholesaler/retailers/${id}/unblock`),

  // Credit Management
  getCreditRequests: (params?: any) => api.get('/wholesaler/credit-requests', { params }),
  approveCreditRequest: (id: string) => api.post(`/wholesaler/credit-requests/${id}/approve`),
  rejectCreditRequest: (id: string, reason?: string) =>
    api.post(`/wholesaler/credit-requests/${id}/reject`, { reason }),
};

export default api;
