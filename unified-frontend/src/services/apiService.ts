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

// Consumer APIs
export const consumerApi = {
  getProducts: () => api.get('/store/products'),
  getProduct: (id: string) => api.get(`/store/products/${id}`),
  getCart: () => api.get('/store/carts'),
  addToCart: (productId: string, quantity: number) =>
    api.post('/store/carts/line-items', { product_id: productId, quantity }),
  checkout: (cartId: string) => api.post(`/store/carts/${cartId}/complete`),
  getOrders: () => api.get('/store/customers/me/orders'),
};

// Retailer APIs
export const retailerApi = {
  getDashboardStats: () => api.get('/retailer/dashboard/stats'),
  getInventory: () => api.get('/retailer/inventory'),
  updateInventory: (id: string, data: any) => api.put(`/retailer/inventory/${id}`, data),
  getOrders: () => api.get('/retailer/orders'),
  createOrder: (data: any) => api.post('/retailer/orders', data),
  getWallet: () => api.get('/retailer/wallet'),
  getWholesalers: () => api.get('/retailer/wholesalers'),
};

// Wholesaler APIs
export const wholesalerApi = {
  getDashboardStats: () => api.get('/wholesaler/dashboard/stats'),
  getInventory: () => api.get('/wholesaler/inventory'),
  addInventory: (data: any) => api.post('/wholesaler/inventory', data),
  updateInventory: (id: string, data: any) => api.put(`/wholesaler/inventory/${id}`, data),
  getRetailerOrders: () => api.get('/wholesaler/retailer-orders'),
  updateOrderStatus: (id: string, status: string) =>
    api.put(`/wholesaler/retailer-orders/${id}/status`, { status }),
  getRetailers: () => api.get('/wholesaler/retailers'),
  approveCreditRequest: (id: string) => api.post(`/wholesaler/credit-requests/${id}/approve`),
  rejectCreditRequest: (id: string) => api.post(`/wholesaler/credit-requests/${id}/reject`),
};

export default api;
