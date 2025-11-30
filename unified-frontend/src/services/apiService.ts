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

// Handle 401 responses - only logout for actual auth failures, not API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only force logout if:
    // 1. It's a 401 AND
    // 2. The error message indicates invalid/expired token (not just missing endpoint auth)
    if (error.response?.status === 401) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || '';
      const isAuthFailure =
        errorMsg.toLowerCase().includes('invalid token') ||
        errorMsg.toLowerCase().includes('token expired') ||
        errorMsg.toLowerCase().includes('jwt') ||
        error.config?.url?.includes('/auth/');

      // Don't auto-logout for general 401s on data endpoints - let the component handle it
      if (isAuthFailure) {
        localStorage.removeItem('bigcompany_token');
        localStorage.removeItem('bigcompany_user');
        window.location.href = '/login';
      }
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

  // Branch Management
  getBranches: () => api.get('/retailer/branches'),
  getBranchStats: () => api.get('/retailer/branches/stats'),
  getBranch: (id: string) => api.get(`/retailer/branches/${id}`),
  createBranch: (data: any) => api.post('/retailer/branches', data),
  updateBranch: (id: string, data: any) => api.put(`/retailer/branches/${id}`, data),
  deleteBranch: (id: string) => api.delete(`/retailer/branches/${id}`),
  getBranchTransactions: (branchId: string, params?: any) =>
    api.get(`/retailer/branches/${branchId}/transactions`, { params }),
  getBranchSummary: (branchId: string, period?: string) =>
    api.get(`/retailer/branches/${branchId}/summary`, { params: { period } }),

  // POS Terminal Management
  getBranchTerminals: (branchId: string) => api.get(`/retailer/branches/${branchId}/terminals`),
  createTerminal: (branchId: string, data: any) =>
    api.post(`/retailer/branches/${branchId}/terminals`, data),
  updateTerminal: (terminalId: string, data: any) =>
    api.put(`/retailer/terminals/${terminalId}`, data),
  deleteTerminal: (terminalId: string) => api.delete(`/retailer/terminals/${terminalId}`),

  // NFC Cards (Retailer)
  getNFCCards: (params?: any) => api.get('/retailer/nfc-cards', { params }),
  getNFCCardStats: () => api.get('/retailer/nfc-cards/stats'),
  issueNFCCard: (data: any) => api.post('/retailer/nfc-cards/issue', data),
  blockNFCCard: (cardId: string, reason: string) =>
    api.post(`/retailer/nfc-cards/${cardId}/block`, { reason }),
  unblockNFCCard: (cardId: string) => api.post(`/retailer/nfc-cards/${cardId}/unblock`),
  topUpNFCCard: (cardId: string, data: any) =>
    api.post(`/retailer/nfc-cards/${cardId}/topup`, data),
  getNFCCardTransactions: (cardId: string, params?: any) =>
    api.get(`/retailer/nfc-cards/${cardId}/transactions`, { params }),
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

// NFC Card APIs - for managing customer NFC cards
export const nfcApi = {
  // Customer's own cards
  getMyCards: () => api.get('/nfc/cards'),
  linkCard: (uid: string, pin: string, nickname?: string) =>
    api.post('/nfc/cards/link', { uid, pin, nickname }),
  unlinkCard: (cardId: string) => api.delete(`/nfc/cards/${cardId}`),
  setCardPin: (cardId: string, oldPin: string, newPin: string) =>
    api.put(`/nfc/cards/${cardId}/pin`, { old_pin: oldPin, new_pin: newPin }),
  setPrimaryCard: (cardId: string) => api.put(`/nfc/cards/${cardId}/primary`),
  updateCardNickname: (cardId: string, nickname: string) =>
    api.put(`/nfc/cards/${cardId}/nickname`, { nickname }),

  // POS NFC operations (for retailers)
  processNFCPayment: (cardUid: string, pin: string, amount: number, description?: string) =>
    api.post('/nfc/pos/payment', { card_uid: cardUid, pin, amount, description }),
  checkCardBalance: (cardUid: string, pin: string) =>
    api.post('/nfc/pos/balance', { card_uid: cardUid, pin }),
  validateCard: (cardUid: string) => api.post('/nfc/pos/validate', { card_uid: cardUid }),

  // Admin NFC operations (for wholesaler admin)
  getAllCards: (params?: any) => api.get('/nfc/admin/cards', { params }),
  getCardDetails: (cardId: string) => api.get(`/nfc/admin/cards/${cardId}`),
  blockCard: (cardId: string, reason: string) =>
    api.post(`/nfc/admin/cards/${cardId}/block`, { reason }),
  unblockCard: (cardId: string) => api.post(`/nfc/admin/cards/${cardId}/unblock`),
  getCardTransactions: (cardId: string, params?: any) =>
    api.get(`/nfc/admin/cards/${cardId}/transactions`, { params }),
  issueNewCard: (customerId: string, uid: string, pin: string) =>
    api.post('/nfc/admin/cards/issue', { customer_id: customerId, uid, pin }),
  getCardStats: () => api.get('/nfc/admin/stats'),
};

// Wallet APIs - for managing customer wallets
export const walletApi = {
  // Customer wallet
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (params?: any) => api.get('/wallet/transactions', { params }),

  // Top-up
  topUpMobileMoney: (amount: number, phone: string, provider: 'mtn' | 'airtel') =>
    api.post('/wallet/topup/mobile-money', { amount, phone, provider }),
  topUpBankTransfer: (amount: number) => api.post('/wallet/topup/bank', { amount }),
  checkTopUpStatus: (transactionId: string) =>
    api.get(`/wallet/topup/status/${transactionId}`),

  // Transfer
  transfer: (recipientPhone: string, amount: number, pin: string, description?: string) =>
    api.post('/wallet/transfer', { recipient_phone: recipientPhone, amount, pin, description }),

  // Admin wallet operations
  getCustomerWallet: (customerId: string) => api.get(`/wallet/admin/customers/${customerId}`),
  adjustBalance: (customerId: string, amount: number, type: 'credit' | 'debit', reason: string) =>
    api.post(`/wallet/admin/customers/${customerId}/adjust`, { amount, type, reason }),
  getWalletStats: () => api.get('/wallet/admin/stats'),
};

// Admin APIs
export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),

  // Customers
  getCustomers: (params?: any) => api.get('/admin/customers', { params }),
  getCustomer: (id: string) => api.get(`/admin/customers/${id}`),
  creditCustomer: (id: string, amount: number, reason: string) =>
    api.post(`/admin/customers/${id}/credit`, { amount, reason }),

  // Retailers
  getRetailers: (params?: any) => api.get('/admin/retailers', { params }),
  verifyRetailer: (id: string) => api.post(`/admin/retailers/${id}/verify`),
  updateRetailerStatus: (id: string, isActive: boolean, reason?: string) =>
    api.post(`/admin/retailers/${id}/status`, { isActive, reason }),
  updateRetailerCreditLimit: (id: string, creditLimit: number, reason?: string) =>
    api.post(`/admin/retailers/${id}/credit-limit`, { creditLimit, reason }),

  // Wholesalers
  getWholesalers: (params?: any) => api.get('/admin/wholesalers', { params }),
  updateWholesalerStatus: (id: string, isActive: boolean, reason?: string) =>
    api.post(`/admin/wholesalers/${id}/status`, { isActive, reason }),

  // Loans
  getLoans: (params?: any) => api.get('/admin/loans', { params }),
  approveLoan: (id: string) => api.post(`/admin/loans/${id}/approve`),
  rejectLoan: (id: string, reason: string) => api.post(`/admin/loans/${id}/reject`, { reason }),

  // NFC Cards
  getNFCCards: (params?: any) => api.get('/admin/nfc-cards', { params }),
  registerNFCCard: (cardUid: string, dashboardId?: string) =>
    api.post('/admin/nfc-cards/register', { cardUid, dashboardId }),
  blockNFCCard: (uid: string, blocked: boolean, reason?: string) =>
    api.post(`/admin/nfc-cards/${uid}/block`, { blocked, reason }),

  // Reports
  getTransactionReport: (params?: { startDate?: string; endDate?: string; type?: string; groupBy?: string }) =>
    api.get('/admin/reports/transactions', { params }),
  getRevenueReport: (params?: { startDate?: string; endDate?: string; groupBy?: string }) =>
    api.get('/admin/reports/revenue', { params }),

  // Audit Logs
  getAuditLogs: (params?: any) => api.get('/admin/audit-logs', { params }),

  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings: Record<string, any>) => api.post('/admin/settings', { settings }),
};

export default api;
