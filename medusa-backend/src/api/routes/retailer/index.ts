import { Router, Request, Response, NextFunction, json } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { WalletBalanceService } from '../../../services/wallet-balance';
import { RewardsService } from '../../../services/rewards';

const router = Router();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

// JSON body parser middleware
router.use(json());

// CORS Middleware for retailer routes
const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    'https://bigcompany-retailer.alexandratechlab.com',
    'https://bigcompany-wholesaler.alexandratechlab.com',
    'http://localhost:3001',
    'http://localhost:3004',
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

// Auth middleware
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024') as any;

    if (decoded.type !== 'retailer' && decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Not authorized for retailer access' });
    }

    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Mock retailer database (in production, use a proper database table)
const retailers: Map<string, any> = new Map([
  ['retailer@bigcompany.rw', {
    id: 'ret_001',
    email: 'retailer@bigcompany.rw',
    password: bcrypt.hashSync('retailer123', 10),
    name: 'Demo Retailer',
    shop_name: 'Kigali Shop',
    phone: '+250788123456',
    location: 'Kigali, Rwanda',
    type: 'retailer',
    status: 'active',
    created_at: new Date('2024-01-15'),
  }],
]);

// Apply CORS to all retailer routes
router.use(corsMiddleware);

// ==================== AUTH ROUTES ====================

  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const retailer = retailers.get(email);
      if (!retailer) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, retailer.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: retailer.id, email: retailer.email, type: 'retailer', shop_name: retailer.shop_name },
        process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024',
        { expiresIn: '7d' }
      );

      const { password: _, ...retailerData } = retailer;
      res.json({ access_token: token, retailer: retailerData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const retailer = Array.from(retailers.values()).find(r => r.id === user.id);
      if (!retailer) {
        return res.status(404).json({ error: 'Retailer not found' });
      }
      const { password: _, ...retailerData } = retailer;
      res.json(retailerData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== DASHBOARD ROUTES ====================

  router.get('/dashboard/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      // In production, fetch real data from Medusa services
      res.json({
        totalOrders: 156,
        totalRevenue: 2450000, // RWF
        pendingOrders: 12,
        totalProducts: 48,
        lowStockItems: 5,
        todayOrders: 8,
        todayRevenue: 125000,
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/dashboard/sales', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { period = 'week' } = req.query;

      // Mock sales data
      const salesData = {
        week: [
          { date: '2024-11-22', sales: 45000, orders: 5 },
          { date: '2024-11-23', sales: 78000, orders: 8 },
          { date: '2024-11-24', sales: 56000, orders: 6 },
          { date: '2024-11-25', sales: 92000, orders: 10 },
          { date: '2024-11-26', sales: 67000, orders: 7 },
          { date: '2024-11-27', sales: 84000, orders: 9 },
          { date: '2024-11-28', sales: 125000, orders: 12 },
        ],
        month: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(2024, 10, i + 1).toISOString().split('T')[0],
          sales: Math.floor(Math.random() * 100000) + 30000,
          orders: Math.floor(Math.random() * 15) + 3,
        })),
      };

      res.json(salesData[period as keyof typeof salesData] || salesData.week);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/dashboard/low-stock', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 5 } = req.query;

      const lowStockItems = [
        { id: 'prod_1', name: 'Inyange Milk 500ml', stock: 3, threshold: 10, category: 'Dairy' },
        { id: 'prod_2', name: 'Bralirwa Primus 500ml', stock: 5, threshold: 20, category: 'Beverages' },
        { id: 'prod_3', name: 'Akabanga Chili Oil', stock: 2, threshold: 15, category: 'Cooking' },
        { id: 'prod_4', name: 'Isombe Mix 1kg', stock: 4, threshold: 10, category: 'Food' },
        { id: 'prod_5', name: 'Urwagwa Traditional 1L', stock: 1, threshold: 5, category: 'Beverages' },
      ];

      res.json(lowStockItems.slice(0, Number(limit)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/dashboard/recent-orders', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 5 } = req.query;

      const recentOrders = [
        { id: 'ord_001', customer: 'Jean Uwimana', total: 15000, status: 'pending', created_at: '2024-11-28T10:30:00Z' },
        { id: 'ord_002', customer: 'Marie Mukamana', total: 28500, status: 'processing', created_at: '2024-11-28T09:15:00Z' },
        { id: 'ord_003', customer: 'Emmanuel Habimana', total: 8200, status: 'completed', created_at: '2024-11-28T08:45:00Z' },
        { id: 'ord_004', customer: 'Alice Uwase', total: 42000, status: 'shipped', created_at: '2024-11-27T16:20:00Z' },
        { id: 'ord_005', customer: 'Patrick Niyonzima', total: 19800, status: 'completed', created_at: '2024-11-27T14:50:00Z' },
      ];

      res.json(recentOrders.slice(0, Number(limit)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ORDERS ROUTES ====================

  router.get('/orders', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, status } = req.query;

      let orders = [
        { id: 'ord_001', customer: 'Jean Uwimana', email: 'jean@example.com', total: 15000, status: 'pending', items: 3, created_at: '2024-11-28T10:30:00Z' },
        { id: 'ord_002', customer: 'Marie Mukamana', email: 'marie@example.com', total: 28500, status: 'processing', items: 5, created_at: '2024-11-28T09:15:00Z' },
        { id: 'ord_003', customer: 'Emmanuel Habimana', email: 'emmanuel@example.com', total: 8200, status: 'completed', items: 2, created_at: '2024-11-28T08:45:00Z' },
        { id: 'ord_004', customer: 'Alice Uwase', email: 'alice@example.com', total: 42000, status: 'shipped', items: 7, created_at: '2024-11-27T16:20:00Z' },
        { id: 'ord_005', customer: 'Patrick Niyonzima', email: 'patrick@example.com', total: 19800, status: 'completed', items: 4, created_at: '2024-11-27T14:50:00Z' },
      ];

      if (status) {
        orders = orders.filter(o => o.status === status);
      }

      res.json({
        orders: orders.slice(Number(offset), Number(offset) + Number(limit)),
        count: orders.length,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/orders/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const order = {
        id,
        customer: { name: 'Jean Uwimana', email: 'jean@example.com', phone: '+250788111222' },
        items: [
          { id: 'item_1', product_id: 'prod_1', name: 'Inyange Milk 500ml', quantity: 2, unit_price: 800, total: 1600 },
          { id: 'item_2', product_id: 'prod_2', name: 'Bralirwa Primus 500ml', quantity: 6, unit_price: 1200, total: 7200 },
          { id: 'item_3', product_id: 'prod_3', name: 'Akabanga Chili Oil', quantity: 1, unit_price: 6200, total: 6200 },
        ],
        subtotal: 15000,
        shipping: 0,
        tax: 0,
        total: 15000,
        status: 'pending',
        payment_status: 'paid',
        payment_method: 'mtn_momo',
        shipping_address: { line1: 'KG 123 St', city: 'Kigali', district: 'Gasabo', country: 'Rwanda' },
        created_at: '2024-11-28T10:30:00Z',
        updated_at: '2024-11-28T10:30:00Z',
      };

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/orders/:id/status', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      res.json({ id, status, notes, updated_at: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/orders/:id/fulfill', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { tracking_number } = req.body;

      res.json({ id, status: 'shipped', tracking_number, fulfilled_at: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/orders/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      res.json({ id, status: 'cancelled', reason, cancelled_at: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== INVENTORY ROUTES ====================

  router.get('/inventory', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, low_stock, search } = req.query;

      let products = [
        { id: 'prod_1', name: 'Inyange Milk 500ml', sku: 'INY-MLK-500', category: 'Dairy', price: 800, cost: 600, stock: 45, threshold: 10, status: 'active' },
        { id: 'prod_2', name: 'Bralirwa Primus 500ml', sku: 'BRL-PRM-500', category: 'Beverages', price: 1200, cost: 900, stock: 5, threshold: 20, status: 'active' },
        { id: 'prod_3', name: 'Akabanga Chili Oil 100ml', sku: 'AKB-CHI-100', category: 'Cooking', price: 6200, cost: 4500, stock: 2, threshold: 15, status: 'active' },
        { id: 'prod_4', name: 'Isombe Mix 1kg', sku: 'ISB-MIX-1KG', category: 'Food', price: 3500, cost: 2500, stock: 78, threshold: 10, status: 'active' },
        { id: 'prod_5', name: 'Urwagwa Traditional 1L', sku: 'URW-TRD-1L', category: 'Beverages', price: 8000, cost: 6000, stock: 1, threshold: 5, status: 'active' },
        { id: 'prod_6', name: 'Inyange Water 1.5L', sku: 'INY-WTR-1.5', category: 'Beverages', price: 500, cost: 350, stock: 120, threshold: 30, status: 'active' },
        { id: 'prod_7', name: 'Ikivuguto 1L', sku: 'IKV-YOG-1L', category: 'Dairy', price: 2000, cost: 1400, stock: 35, threshold: 15, status: 'active' },
        { id: 'prod_8', name: 'Ubuki Honey 500g', sku: 'UBK-HNY-500', category: 'Food', price: 12000, cost: 8500, stock: 18, threshold: 10, status: 'active' },
      ];

      if (low_stock === 'true') {
        products = products.filter(p => p.stock <= p.threshold);
      }

      if (search) {
        const searchLower = (search as string).toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower)
        );
      }

      res.json({
        products: products.slice(Number(offset), Number(offset) + Number(limit)),
        count: products.length,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/inventory/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const product = {
        id,
        name: 'Inyange Milk 500ml',
        sku: 'INY-MLK-500',
        description: 'Fresh pasteurized milk from Inyange Industries',
        category: 'Dairy',
        price: 800,
        cost: 600,
        stock: 45,
        threshold: 10,
        unit: 'bottle',
        status: 'active',
        images: ['/images/products/inyange-milk.jpg'],
        variants: [],
        created_at: '2024-01-15T08:00:00Z',
        updated_at: '2024-11-28T10:00:00Z',
      };

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/inventory/:id/stock', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { quantity, adjustment_type, reason } = req.body;

      res.json({
        id,
        new_stock: 50,
        adjustment: quantity,
        adjustment_type,
        reason,
        updated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/inventory/:id/price', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { price, cost } = req.body;

      res.json({
        id,
        price,
        cost,
        margin: price - cost,
        margin_percentage: ((price - cost) / price * 100).toFixed(2),
        updated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/inventory', authMiddleware, async (req: Request, res: Response) => {
    try {
      const productData = req.body;

      const newProduct = {
        id: `prod_${Date.now()}`,
        ...productData,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      res.status(201).json(newProduct);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== WALLET ROUTES ====================

  // GET /retailer/wallet - returns full wallet info (alias for dashboard compatibility)
  router.get('/wallet', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        balance: 245000,
        pending: 15000,
        available: 230000,
        currency: 'RWF',
        credit_limit: 500000,
        credit_used: 125000,
        last_updated: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/wallet/balance', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        balance: 245000,
        pending: 15000,
        available: 230000,
        currency: 'RWF',
        last_updated: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/wallet/transactions', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const transactions = [
        { id: 'txn_1', type: 'credit', amount: 28500, description: 'Order payment - ord_002', status: 'completed', created_at: '2024-11-28T09:15:00Z' },
        { id: 'txn_2', type: 'debit', amount: 50000, description: 'Withdrawal to MTN MoMo', status: 'completed', created_at: '2024-11-27T14:30:00Z' },
        { id: 'txn_3', type: 'credit', amount: 42000, description: 'Order payment - ord_004', status: 'completed', created_at: '2024-11-27T16:20:00Z' },
        { id: 'txn_4', type: 'credit', amount: 15000, description: 'Order payment - ord_001', status: 'pending', created_at: '2024-11-28T10:30:00Z' },
      ];

      res.json({
        transactions: transactions.slice(Number(offset), Number(offset) + Number(limit)),
        count: transactions.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/wallet/withdraw', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { amount, method, phone } = req.body;

      res.json({
        id: `wth_${Date.now()}`,
        amount,
        method,
        phone,
        status: 'processing',
        fee: Math.floor(amount * 0.01),
        net_amount: amount - Math.floor(amount * 0.01),
        created_at: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== REWARDS/GAS ROUTES ====================

  router.get('/rewards', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        total_earned: 156000,
        available: 45000,
        redeemed: 111000,
        pending: 12000,
        currency: 'RWF',
        reward_rate: '12%',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/rewards/history', authMiddleware, async (req: Request, res: Response) => {
    try {
      const rewards = [
        { id: 'rwd_1', type: 'earned', amount: 3420, source: 'Order ord_002 profit', created_at: '2024-11-28T09:15:00Z' },
        { id: 'rwd_2', type: 'redeemed', amount: 25000, redemption: 'Gas Top-up 15L', created_at: '2024-11-27T12:00:00Z' },
        { id: 'rwd_3', type: 'earned', amount: 5040, source: 'Order ord_004 profit', created_at: '2024-11-27T16:20:00Z' },
      ];

      res.json(rewards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== POS ROUTES ====================

  // GET /retailer/pos/products - products available for POS sale
  router.get('/pos/products', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { category, search, limit = 50, offset = 0 } = req.query;

      let products = [
        { id: 'prod_001', name: 'Inyange Milk 1L', barcode: '6000000000001', category: 'beverages', price: 900, stock: 50, unit: 'Liter' },
        { id: 'prod_002', name: 'Bralirwa Beer 500ml', barcode: '6000000000002', category: 'beverages', price: 900, stock: 100, unit: 'Bottle' },
        { id: 'prod_003', name: 'Bread (Large)', barcode: '6000000000003', category: 'food', price: 500, stock: 30, unit: 'Loaf' },
        { id: 'prod_004', name: 'Sugar 1kg', barcode: '6000000000004', category: 'food', price: 1000, stock: 45, unit: 'Kg' },
        { id: 'prod_005', name: 'Cooking Oil 1L', barcode: '6000000000005', category: 'food', price: 2000, stock: 25, unit: 'Liter' },
        { id: 'prod_006', name: 'Rice 5kg', barcode: '6000000000006', category: 'food', price: 5500, stock: 40, unit: 'Kg' },
        { id: 'prod_007', name: 'Soap Bar', barcode: '6000000000007', category: 'personal_care', price: 300, stock: 80, unit: 'Piece' },
        { id: 'prod_008', name: 'Toothpaste', barcode: '6000000000008', category: 'personal_care', price: 1200, stock: 35, unit: 'Tube' },
        { id: 'prod_009', name: 'Detergent 1kg', barcode: '6000000000009', category: 'cleaning', price: 1500, stock: 60, unit: 'Kg' },
        { id: 'prod_010', name: 'Bottled Water 500ml', barcode: '6000000000010', category: 'beverages', price: 300, stock: 200, unit: 'Bottle' },
        { id: 'prod_011', name: 'Eggs (Tray of 30)', barcode: '6000000000011', category: 'food', price: 4500, stock: 20, unit: 'Tray' },
        { id: 'prod_012', name: 'Tomatoes 1kg', barcode: '6000000000012', category: 'food', price: 800, stock: 50, unit: 'Kg' },
        { id: 'prod_013', name: 'Onions 1kg', barcode: '6000000000013', category: 'food', price: 600, stock: 55, unit: 'Kg' },
        { id: 'prod_014', name: 'Soda (Fanta 500ml)', barcode: '6000000000014', category: 'beverages', price: 500, stock: 120, unit: 'Bottle' },
        { id: 'prod_015', name: 'Tissue Paper (Pack)', barcode: '6000000000015', category: 'household', price: 800, stock: 40, unit: 'Pack' },
      ];

      // Filter by category
      if (category) {
        products = products.filter(p => p.category === String(category).toLowerCase());
      }

      // Filter by search term
      if (search) {
        const searchTerm = String(search).toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(searchTerm) ||
          p.barcode.includes(searchTerm)
        );
      }

      const total = products.length;

      // Apply pagination
      const start = Number(offset);
      const end = start + Number(limit);
      products = products.slice(start, end);

      res.json({
        products,
        count: products.length,
        total,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/pos/daily-sales', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        date: new Date().toISOString().split('T')[0],
        total_sales: 125000,
        total_orders: 12,
        cash_sales: 85000,
        mobile_money_sales: 40000,
        average_order_value: 10417,
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get customer details for POS including wallet and loan balances
   * GET /retailer/pos/customer?phone=250788123456
   */
  router.get('/pos/customer', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { phone } = req.query;

      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      // Find customer by phone number
      const customerQuery = `
        SELECT id, phone, email, first_name, last_name
        FROM bigcompany.customers
        WHERE phone = $1
        LIMIT 1
      `;
      const customerResult = await db.query(customerQuery, [phone]);

      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customer = customerResult.rows[0];

      // Get wallet and loan balances using WalletBalanceService
      const walletService = new WalletBalanceService();
      const balances = await walletService.getBalanceDetails(customer.id);

      if (!balances) {
        // Customer exists but no wallet record - return zero balances
        return res.json({
          id: customer.id,
          phone: customer.phone,
          email: customer.email,
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
          wallet_balance: 0,
          loan_balance: 0,
          total_balance: 0,
          available_for_purchase: 0,
          credit_limit: 0,
          credit_used: 0,
        });
      }

      // Return customer with dual balances
      res.json({
        id: customer.id,
        phone: customer.phone,
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
        wallet_balance: balances.walletBalance,
        loan_balance: balances.loanBalance,
        total_balance: balances.totalBalance,
        available_for_purchase: balances.availableForPurchase,
        credit_limit: balances.loanLimit,
        credit_used: balances.loanLimit - balances.loanBalance, // Calculate used portion
      });
    } catch (error: any) {
      console.error('Error fetching customer for POS:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch customer details' });
    }
  });

  /**
   * Process POS sale with multi-source payment support
   * POST /retailer/pos/sale
   *
   * Automatically splits payment between wallet and loan balance when needed.
   * Uses wallet balance first (for gas rewards eligibility), then loan balance.
   */
  router.post('/pos/sale', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { items, payment_method, customer_phone, customer_name, customer_id, discount = 0, notes } = req.body;

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      if (payment_method !== 'wallet' && payment_method !== 'nfc' && payment_method !== 'credit') {
        return res.status(400).json({ error: 'Invalid payment method. Only wallet, nfc, or credit allowed.' });
      }

      // Calculate total
      const subtotal = items.reduce((sum: number, item: any) => {
        if (!item.product_id || !item.quantity || !item.price) {
          throw new Error('Invalid item format. Each item must have product_id, quantity, and price.');
        }
        return sum + (item.price * item.quantity);
      }, 0);

      const total = subtotal - discount;

      if (total <= 0) {
        return res.status(400).json({ error: 'Total must be greater than zero' });
      }

      // For wallet payment, we need customer_id
      if ((payment_method === 'wallet' || payment_method === 'nfc') && !customer_id) {
        return res.status(400).json({ error: 'customer_id is required for wallet/NFC payments' });
      }

      let paymentDetails: any = {
        method: payment_method,
      };

      // Process wallet/NFC payment with multi-source support
      if (payment_method === 'wallet' || payment_method === 'nfc') {
        const walletService = new WalletBalanceService();

        // Validate purchase possibility
        const validation = await walletService.validatePurchase(customer_id, total);

        if (!validation.canPurchase) {
          return res.status(400).json({
            error: validation.reason,
            totalBalance: validation.totalBalance,
            requiredAmount: validation.requiredAmount,
            shortfall: validation.shortfall,
          });
        }

        // Process the purchase (automatically handles split payment)
        const purchaseResult = await walletService.processPurchase(
          customer_id,
          total,
          `pos_${Date.now()}`, // orderId
          `POS Sale - ${items.length} items`
        );

        paymentDetails = {
          method: payment_method,
          totalPaid: purchaseResult.totalPaid,
          fromWallet: purchaseResult.fromWallet,
          fromLoan: purchaseResult.fromLoan,
          splitPayment: purchaseResult.fromWallet > 0 && purchaseResult.fromLoan > 0,
          walletTransaction: purchaseResult.walletTransaction,
          loanTransaction: purchaseResult.loanTransaction,
        };

        // Calculate and process gas rewards for wallet-funded portion only
        // Only wallet balance earns rewards, loan balance does not
        if (purchaseResult.fromWallet > 0) {
          try {
            // Calculate total profit from all items
            let totalProfit = 0;

            for (const item of items) {
              // Fetch cost price from inventory
              const productQuery = `
                SELECT cost_price
                FROM bigcompany.retailer_inventory
                WHERE product_id = $1
                LIMIT 1
              `;
              const productResult = await db.query(productQuery, [item.product_id]);

              if (productResult.rows.length > 0) {
                const costPrice = parseFloat(productResult.rows[0].cost_price) || 0;
                const sellingPrice = parseFloat(item.price);
                const quantity = parseInt(item.quantity);
                const itemProfit = (sellingPrice - costPrice) * quantity;
                totalProfit += itemProfit;
              }
            }

            // Only process rewards if there's actual profit
            if (totalProfit > 0) {
              const rewardsService = new RewardsService();
              const orderId = `pos_${Date.now()}`;

              // Process reward with wallet-funded amount
              // meterId is optional - if not provided, reward is pending until customer claims
              const rewardResult = await rewardsService.processOrderReward(
                customer_id,
                orderId,
                totalProfit,
                purchaseResult.fromWallet,
                undefined // meterId optional - customer can add later
              );

              // Add reward info to payment details
              if (rewardResult.success) {
                paymentDetails.gasReward = {
                  eligible: true,
                  rewardAmount: rewardResult.reward?.reward_amount || 0,
                  status: rewardResult.reward?.status || 'pending',
                  message: rewardResult.reward?.meter_id
                    ? 'Gas reward credited to your meter'
                    : 'Gas reward pending - add meter ID to claim',
                };
              } else {
                paymentDetails.gasReward = {
                  eligible: false,
                  message: rewardResult.error || 'Not eligible for gas rewards',
                };
              }
            }
          } catch (rewardError: any) {
            console.error('Error processing gas rewards:', rewardError);
            // Don't fail the sale if rewards processing fails
            paymentDetails.gasReward = {
              eligible: false,
              message: 'Gas rewards processing failed - contact support',
            };
          }
        } else {
          // Payment was fully from loan - no gas rewards
          paymentDetails.gasReward = {
            eligible: false,
            message: 'Loan-funded purchases do not earn gas rewards',
          };
        }
      }

      // Create order record in database
      const orderId = `pos_${Date.now()}`;
      const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;

      const insertOrderQuery = `
        INSERT INTO bigcompany.orders (
          id, receipt_number, customer_phone, customer_name, customer_id,
          items, subtotal, discount, total, payment_method, payment_details,
          status, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING *
      `;

      const orderResult = await db.query(insertOrderQuery, [
        orderId,
        receiptNumber,
        customer_phone || null,
        customer_name || 'Walk-in Customer',
        customer_id || null,
        JSON.stringify(items),
        subtotal,
        discount,
        total,
        payment_method,
        JSON.stringify(paymentDetails),
        'completed',
        notes || null,
      ]);

      const order = orderResult.rows[0];

      res.status(201).json({
        id: order.id,
        receipt_number: order.receipt_number,
        items: JSON.parse(order.items),
        subtotal: parseFloat(order.subtotal),
        discount: parseFloat(order.discount),
        total: parseFloat(order.total),
        payment_method: order.payment_method,
        payment_details: paymentDetails,
        customer_phone: order.customer_phone,
        customer_name: order.customer_name,
        status: order.status,
        notes: order.notes,
        created_at: order.created_at,
      });
    } catch (error: any) {
      console.error('Error processing POS sale:', error);
      res.status(500).json({ error: error.message || 'Failed to process sale' });
    }
  });

  router.get('/pos/history', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, date } = req.query;

      const sales = [
        { id: 'pos_001', total: 15000, items: 3, payment_method: 'cash', created_at: '2024-11-28T10:30:00Z' },
        { id: 'pos_002', total: 8500, items: 2, payment_method: 'mtn_momo', created_at: '2024-11-28T10:15:00Z' },
        { id: 'pos_003', total: 22000, items: 5, payment_method: 'cash', created_at: '2024-11-28T09:45:00Z' },
        { id: 'pos_004', total: 6500, items: 1, payment_method: 'airtel_money', created_at: '2024-11-28T09:30:00Z' },
      ];

      res.json({
        sales: sales.slice(Number(offset), Number(offset) + Number(limit)),
        count: sales.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CREDIT ROUTES ====================

  // Credit summary endpoint
  router.get('/credit', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        total_credit_given: 450000,
        total_collected: 285000,
        total_outstanding: 165000,
        overdue_amount: 32000,
        active_credit_customers: 12,
        collection_rate: 63.3,
        currency: 'RWF',
        recent_orders: [
          { id: 'crd_001', customer: 'Jean Uwimana', phone: '+250788111222', total: 45000, paid: 20000, balance: 25000, due_date: '2024-12-05', status: 'partial', created_at: '2024-11-20T10:30:00Z' },
          { id: 'crd_002', customer: 'Marie Mukamana', phone: '+250788222333', total: 28000, paid: 0, balance: 28000, due_date: '2024-12-01', status: 'pending', created_at: '2024-11-22T09:15:00Z' },
          { id: 'crd_003', customer: 'Emmanuel Habimana', phone: '+250788333444', total: 15000, paid: 15000, balance: 0, due_date: '2024-11-28', status: 'paid', created_at: '2024-11-15T08:45:00Z' },
        ],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Credit orders endpoint (alias for /credit-orders for backward compatibility)
  router.get('/credit/orders', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 10, offset = 0, status } = req.query;

      let creditOrders = [
        { id: 'crd_001', customer: 'Jean Uwimana', phone: '+250788111222', total: 45000, paid: 20000, balance: 25000, due_date: '2024-12-05', status: 'partial', created_at: '2024-11-20T10:30:00Z' },
        { id: 'crd_002', customer: 'Marie Mukamana', phone: '+250788222333', total: 28000, paid: 0, balance: 28000, due_date: '2024-12-01', status: 'pending', created_at: '2024-11-22T09:15:00Z' },
        { id: 'crd_003', customer: 'Emmanuel Habimana', phone: '+250788333444', total: 15000, paid: 15000, balance: 0, due_date: '2024-11-28', status: 'paid', created_at: '2024-11-15T08:45:00Z' },
        { id: 'crd_004', customer: 'Alice Uwase', phone: '+250788444555', total: 62000, paid: 30000, balance: 32000, due_date: '2024-11-25', status: 'overdue', created_at: '2024-11-10T16:20:00Z' },
      ];

      if (status) {
        creditOrders = creditOrders.filter(o => o.status === status);
      }

      res.json({
        credit_orders: creditOrders.slice(Number(offset), Number(offset) + Number(limit)),
        count: creditOrders.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CREDIT ORDERS ROUTES ====================

  router.get('/credit-orders', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 10, offset = 0, status } = req.query;

      let creditOrders = [
        { id: 'crd_001', customer: 'Jean Uwimana', phone: '+250788111222', total: 45000, paid: 20000, balance: 25000, due_date: '2024-12-05', status: 'partial', created_at: '2024-11-20T10:30:00Z' },
        { id: 'crd_002', customer: 'Marie Mukamana', phone: '+250788222333', total: 28000, paid: 0, balance: 28000, due_date: '2024-12-01', status: 'pending', created_at: '2024-11-22T09:15:00Z' },
        { id: 'crd_003', customer: 'Emmanuel Habimana', phone: '+250788333444', total: 15000, paid: 15000, balance: 0, due_date: '2024-11-28', status: 'paid', created_at: '2024-11-15T08:45:00Z' },
        { id: 'crd_004', customer: 'Alice Uwase', phone: '+250788444555', total: 62000, paid: 30000, balance: 32000, due_date: '2024-11-25', status: 'overdue', created_at: '2024-11-10T16:20:00Z' },
      ];

      if (status) {
        creditOrders = creditOrders.filter(o => o.status === status);
      }

      res.json({
        credit_orders: creditOrders.slice(Number(offset), Number(offset) + Number(limit)),
        count: creditOrders.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/credit-orders/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        total_credit_given: 450000,
        total_collected: 285000,
        total_outstanding: 165000,
        overdue_amount: 32000,
        active_credit_customers: 12,
        collection_rate: 63.3,
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/credit-orders/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const creditOrder = {
        id,
        customer: { name: 'Jean Uwimana', phone: '+250788111222', address: 'KG 123 St, Kigali' },
        items: [
          { id: 'item_1', name: 'Inyange Milk 500ml', quantity: 10, unit_price: 800, total: 8000 },
          { id: 'item_2', name: 'Bralirwa Primus 500ml', quantity: 20, unit_price: 1200, total: 24000 },
          { id: 'item_3', name: 'Akabanga Chili Oil', quantity: 2, unit_price: 6500, total: 13000 },
        ],
        total: 45000,
        paid: 20000,
        balance: 25000,
        due_date: '2024-12-05',
        status: 'partial',
        payments: [
          { id: 'pay_1', amount: 20000, method: 'cash', date: '2024-11-25T14:00:00Z' },
        ],
        created_at: '2024-11-20T10:30:00Z',
      };

      res.json(creditOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/credit-orders', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { customer_name, customer_phone, items, due_date } = req.body;

      const total = items.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0);

      res.status(201).json({
        id: `crd_${Date.now()}`,
        customer: { name: customer_name, phone: customer_phone },
        items,
        total,
        paid: 0,
        balance: total,
        due_date,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/credit-orders/:id/payment', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { amount, method } = req.body;

      res.json({
        id,
        payment: {
          id: `pay_${Date.now()}`,
          amount,
          method,
          date: new Date().toISOString(),
        },
        new_balance: 25000 - amount,
        status: amount >= 25000 ? 'paid' : 'partial',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== BRANCH MANAGEMENT ROUTES ====================

  // Mock branch data (in production, use database)
  const branches: Map<string, any> = new Map([
    ['br_001', {
      id: 'br_001',
      retailer_id: 'ret_001',
      branch_code: 'KGL-MAIN',
      branch_name: 'Kigali Main Branch',
      address: 'KN 4 Ave, Kigali',
      city: 'Kigali',
      district: 'Nyarugenge',
      phone: '+250788123456',
      manager_name: 'Jean Baptiste',
      manager_phone: '+250788111222',
      location_lat: -1.9403,
      location_lng: 29.8739,
      is_active: true,
      is_main_branch: true,
      operating_hours: { mon: '08:00-20:00', tue: '08:00-20:00', wed: '08:00-20:00', thu: '08:00-20:00', fri: '08:00-20:00', sat: '09:00-18:00', sun: '10:00-16:00' },
      created_at: '2024-01-15T08:00:00Z',
      updated_at: '2024-11-28T10:00:00Z',
    }],
    ['br_002', {
      id: 'br_002',
      retailer_id: 'ret_001',
      branch_code: 'KGL-KIMH',
      branch_name: 'Kimihurura Branch',
      address: 'KG 9 Ave, Kimihurura',
      city: 'Kigali',
      district: 'Gasabo',
      phone: '+250788234567',
      manager_name: 'Marie Claire',
      manager_phone: '+250788222333',
      location_lat: -1.9537,
      location_lng: 30.0912,
      is_active: true,
      is_main_branch: false,
      operating_hours: { mon: '08:00-20:00', tue: '08:00-20:00', wed: '08:00-20:00', thu: '08:00-20:00', fri: '08:00-20:00', sat: '09:00-18:00', sun: 'closed' },
      created_at: '2024-03-10T08:00:00Z',
      updated_at: '2024-11-25T14:00:00Z',
    }],
    ['br_003', {
      id: 'br_003',
      retailer_id: 'ret_001',
      branch_code: 'HYE-001',
      branch_name: 'Huye Branch',
      address: 'NR 2, Huye Town',
      city: 'Huye',
      district: 'Huye',
      phone: '+250788345678',
      manager_name: 'Emmanuel Nkurunziza',
      manager_phone: '+250788333444',
      location_lat: -2.5912,
      location_lng: 29.7425,
      is_active: true,
      is_main_branch: false,
      operating_hours: { mon: '07:30-19:00', tue: '07:30-19:00', wed: '07:30-19:00', thu: '07:30-19:00', fri: '07:30-19:00', sat: '08:00-17:00', sun: 'closed' },
      created_at: '2024-06-15T08:00:00Z',
      updated_at: '2024-11-20T10:00:00Z',
    }],
  ]);

  // Mock POS terminals data
  const posTerminals: Map<string, any> = new Map([
    ['term_001', { id: 'term_001', branch_id: 'br_001', terminal_code: 'POS-KGL-001', terminal_name: 'Main Counter 1', device_type: 'standard', serial_number: 'SN-2024-001', is_active: true, last_seen_at: new Date().toISOString() }],
    ['term_002', { id: 'term_002', branch_id: 'br_001', terminal_code: 'POS-KGL-002', terminal_name: 'Main Counter 2', device_type: 'standard', serial_number: 'SN-2024-002', is_active: true, last_seen_at: new Date().toISOString() }],
    ['term_003', { id: 'term_003', branch_id: 'br_002', terminal_code: 'POS-KIM-001', terminal_name: 'Checkout 1', device_type: 'mobile', serial_number: 'SN-2024-003', is_active: true, last_seen_at: new Date().toISOString() }],
    ['term_004', { id: 'term_004', branch_id: 'br_003', terminal_code: 'POS-HYE-001', terminal_name: 'Counter 1', device_type: 'standard', serial_number: 'SN-2024-004', is_active: true, last_seen_at: new Date().toISOString() }],
  ]);

  // GET /retailer/branches - list all branches for the retailer
  router.get('/branches', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { is_active, limit = 20, offset = 0 } = req.query;

      let branchList = Array.from(branches.values()).filter(b => b.retailer_id === user.id || user.id === 'ret_001');

      if (is_active !== undefined) {
        branchList = branchList.filter(b => b.is_active === (is_active === 'true'));
      }

      // Add stats for each branch
      const branchesWithStats = branchList.map(branch => ({
        ...branch,
        terminals_count: Array.from(posTerminals.values()).filter(t => t.branch_id === branch.id).length,
        today_sales: Math.floor(Math.random() * 200000) + 50000,
        today_transactions: Math.floor(Math.random() * 30) + 5,
      }));

      res.json({
        branches: branchesWithStats.slice(Number(offset), Number(offset) + Number(limit)),
        count: branchesWithStats.length,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /retailer/branches/stats - aggregate branch statistics
  router.get('/branches/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const branchList = Array.from(branches.values()).filter(b => b.retailer_id === user.id || user.id === 'ret_001');

      res.json({
        total_branches: branchList.length,
        active_branches: branchList.filter(b => b.is_active).length,
        inactive_branches: branchList.filter(b => !b.is_active).length,
        total_terminals: Array.from(posTerminals.values()).filter(t => branchList.some(b => b.id === t.branch_id)).length,
        cities_covered: [...new Set(branchList.map(b => b.city))].length,
        today_total_sales: 485000,
        today_total_transactions: 67,
        best_performing_branch: 'Kigali Main Branch',
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /retailer/branches - create new branch
  router.post('/branches', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { branch_name, branch_code, address, city, district, phone, manager_name, manager_phone, location_lat, location_lng, operating_hours } = req.body;

      if (!branch_name || !branch_code) {
        return res.status(400).json({ error: 'branch_name and branch_code are required' });
      }

      const newBranch = {
        id: `br_${Date.now()}`,
        retailer_id: user.id,
        branch_code,
        branch_name,
        address: address || '',
        city: city || '',
        district: district || '',
        phone: phone || '',
        manager_name: manager_name || '',
        manager_phone: manager_phone || '',
        location_lat: location_lat || null,
        location_lng: location_lng || null,
        is_active: true,
        is_main_branch: false,
        operating_hours: operating_hours || { mon: '08:00-20:00', tue: '08:00-20:00', wed: '08:00-20:00', thu: '08:00-20:00', fri: '08:00-20:00', sat: '09:00-18:00', sun: 'closed' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      branches.set(newBranch.id, newBranch);
      res.status(201).json(newBranch);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /retailer/branches/:id - get branch details
  router.get('/branches/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const branch = branches.get(id);

      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Get terminals for this branch
      const branchTerminals = Array.from(posTerminals.values()).filter(t => t.branch_id === id);

      res.json({
        ...branch,
        terminals: branchTerminals,
        terminals_count: branchTerminals.length,
        active_terminals: branchTerminals.filter(t => t.is_active).length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /retailer/branches/:id - update branch
  router.put('/branches/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const branch = branches.get(id);

      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      const updateData = req.body;
      const updatedBranch = {
        ...branch,
        ...updateData,
        id: branch.id, // Prevent ID override
        retailer_id: branch.retailer_id, // Prevent retailer_id override
        updated_at: new Date().toISOString(),
      };

      branches.set(id, updatedBranch);
      res.json(updatedBranch);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /retailer/branches/:id - deactivate branch (soft delete)
  router.delete('/branches/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const branch = branches.get(id);

      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      if (branch.is_main_branch) {
        return res.status(400).json({ error: 'Cannot deactivate the main branch' });
      }

      branch.is_active = false;
      branch.updated_at = new Date().toISOString();
      branches.set(id, branch);

      res.json({ message: 'Branch deactivated successfully', branch });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== POS TERMINAL MANAGEMENT ROUTES ====================

  // GET /retailer/branches/:id/terminals - list POS terminals for a branch
  router.get('/branches/:id/terminals', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { is_active } = req.query;

      const branch = branches.get(id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      let terminals = Array.from(posTerminals.values()).filter(t => t.branch_id === id);

      if (is_active !== undefined) {
        terminals = terminals.filter(t => t.is_active === (is_active === 'true'));
      }

      res.json({
        branch_id: id,
        branch_name: branch.branch_name,
        terminals,
        count: terminals.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /retailer/branches/:id/terminals - register new POS terminal
  router.post('/branches/:id/terminals', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { terminal_code, terminal_name, device_type, serial_number } = req.body;

      const branch = branches.get(id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      if (!terminal_code) {
        return res.status(400).json({ error: 'terminal_code is required' });
      }

      const newTerminal = {
        id: `term_${Date.now()}`,
        branch_id: id,
        terminal_code,
        terminal_name: terminal_name || `Terminal ${terminal_code}`,
        device_type: device_type || 'standard',
        serial_number: serial_number || '',
        is_active: true,
        last_seen_at: null,
        created_at: new Date().toISOString(),
      };

      posTerminals.set(newTerminal.id, newTerminal);
      res.status(201).json(newTerminal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /retailer/terminals/:id - update POS terminal
  router.put('/terminals/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const terminal = posTerminals.get(id);

      if (!terminal) {
        return res.status(404).json({ error: 'Terminal not found' });
      }

      const updateData = req.body;
      const updatedTerminal = {
        ...terminal,
        ...updateData,
        id: terminal.id, // Prevent ID override
        branch_id: terminal.branch_id, // Prevent branch_id override
      };

      posTerminals.set(id, updatedTerminal);
      res.json(updatedTerminal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /retailer/terminals/:id - deactivate POS terminal
  router.delete('/terminals/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const terminal = posTerminals.get(id);

      if (!terminal) {
        return res.status(404).json({ error: 'Terminal not found' });
      }

      terminal.is_active = false;
      posTerminals.set(id, terminal);

      res.json({ message: 'Terminal deactivated successfully', terminal });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== BRANCH TRANSACTION & SUMMARY ROUTES ====================

  // GET /retailer/branches/:id/transactions - branch transaction history
  router.get('/branches/:id/transactions', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 20, offset = 0, start_date, end_date, payment_method } = req.query;

      const branch = branches.get(id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Mock transaction data for the branch
      const transactions = [
        { id: 'txn_001', transaction_ref: 'TXN-2024-001', terminal_id: 'term_001', card_uid: 'NFC-001', customer_name: 'Jean Uwimana', amount: 15000, payment_method: 'nfc_card', pin_used: false, status: 'completed', cashier_name: 'Alice', receipt_number: 'RCP-001', created_at: '2024-11-28T10:30:00Z' },
        { id: 'txn_002', transaction_ref: 'TXN-2024-002', terminal_id: 'term_001', card_uid: 'NFC-002', customer_name: 'Marie Claire', amount: 28500, payment_method: 'nfc_card', pin_used: true, status: 'completed', cashier_name: 'Bob', receipt_number: 'RCP-002', created_at: '2024-11-28T09:45:00Z' },
        { id: 'txn_003', transaction_ref: 'TXN-2024-003', terminal_id: 'term_002', card_uid: null, customer_name: 'Emmanuel H.', amount: 8500, payment_method: 'mtn_momo', pin_used: false, status: 'completed', cashier_name: 'Alice', receipt_number: 'RCP-003', created_at: '2024-11-28T09:15:00Z' },
        { id: 'txn_004', transaction_ref: 'TXN-2024-004', terminal_id: 'term_001', card_uid: 'NFC-003', customer_name: 'Patrick N.', amount: 42000, payment_method: 'nfc_card', pin_used: true, status: 'completed', cashier_name: 'Charlie', receipt_number: 'RCP-004', created_at: '2024-11-28T08:30:00Z' },
        { id: 'txn_005', transaction_ref: 'TXN-2024-005', terminal_id: 'term_001', card_uid: null, customer_name: 'Alice U.', amount: 6200, payment_method: 'cash', pin_used: false, status: 'completed', cashier_name: 'Alice', receipt_number: 'RCP-005', created_at: '2024-11-27T17:45:00Z' },
      ];

      res.json({
        branch_id: id,
        branch_name: branch.branch_name,
        transactions: transactions.slice(Number(offset), Number(offset) + Number(limit)),
        count: transactions.length,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /retailer/branches/:id/summary - branch daily/weekly/monthly summary
  router.get('/branches/:id/summary', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { period = 'daily' } = req.query;

      const branch = branches.get(id);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      const summaryData = {
        daily: {
          period: 'daily',
          date: new Date().toISOString().split('T')[0],
          total_transactions: 45,
          total_amount: 485000,
          total_refunds: 12000,
          card_payments: { count: 32, amount: 380000 },
          wallet_payments: { count: 8, amount: 75000 },
          cash_payments: { count: 5, amount: 30000 },
          average_transaction: 10778,
          peak_hour: 14,
          unique_customers: 38,
          currency: 'RWF',
        },
        weekly: {
          period: 'weekly',
          start_date: '2024-11-22',
          end_date: '2024-11-28',
          total_transactions: 287,
          total_amount: 3250000,
          total_refunds: 45000,
          card_payments: { count: 198, amount: 2450000 },
          wallet_payments: { count: 62, amount: 580000 },
          cash_payments: { count: 27, amount: 220000 },
          average_transaction: 11324,
          busiest_day: 'Saturday',
          unique_customers: 215,
          currency: 'RWF',
        },
        monthly: {
          period: 'monthly',
          month: 'November 2024',
          total_transactions: 1156,
          total_amount: 12450000,
          total_refunds: 185000,
          card_payments: { count: 812, amount: 9800000 },
          wallet_payments: { count: 245, amount: 1950000 },
          cash_payments: { count: 99, amount: 700000 },
          average_transaction: 10769,
          growth_vs_last_month: 12.5,
          unique_customers: 645,
          currency: 'RWF',
        },
      };

      res.json({
        branch_id: id,
        branch_name: branch.branch_name,
        summary: summaryData[period as keyof typeof summaryData] || summaryData.daily,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== NFC CARD MANAGEMENT ROUTES ====================

  // GET /retailer/nfc-cards - list NFC cards issued by this retailer (only used/registered cards)
  router.get('/nfc-cards', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, status, search } = req.query;

      // Mock NFC cards data - only showing used/registered cards
      let cards = [
        { id: 'card_001', card_uid: 'NFC-A1B2C3D4', customer_name: 'Jean Uwimana', customer_phone: '+250788111222', balance: 15000, status: 'active', is_registered: true, pin_set: true, branch_issued: 'Kigali Main Branch', issued_at: '2024-10-15T10:00:00Z', last_used: '2024-11-28T10:30:00Z' },
        { id: 'card_002', card_uid: 'NFC-E5F6G7H8', customer_name: 'Marie Claire', customer_phone: '+250788222333', balance: 28500, status: 'active', is_registered: true, pin_set: true, branch_issued: 'Kimihurura Branch', issued_at: '2024-10-20T14:00:00Z', last_used: '2024-11-28T09:45:00Z' },
        { id: 'card_003', card_uid: 'NFC-I9J0K1L2', customer_name: 'Emmanuel Habimana', customer_phone: '+250788333444', balance: 5200, status: 'active', is_registered: true, pin_set: false, branch_issued: 'Kigali Main Branch', issued_at: '2024-11-01T09:00:00Z', last_used: '2024-11-27T16:20:00Z' },
        { id: 'card_005', card_uid: 'NFC-Q7R8S9T0', customer_name: 'Alice Uwase', customer_phone: '+250788444555', balance: 0, status: 'blocked', is_registered: true, pin_set: true, branch_issued: 'Kigali Main Branch', issued_at: '2024-09-05T08:00:00Z', last_used: '2024-11-15T14:00:00Z', blocked_reason: 'Lost card reported' },
      ];

      // Filter to show only registered cards (used cards)
      cards = cards.filter(c => c.is_registered === true);

      if (status) {
        cards = cards.filter(c => c.status === status);
      }

      if (search) {
        const searchLower = (search as string).toLowerCase();
        cards = cards.filter(c =>
          c.card_uid.toLowerCase().includes(searchLower) ||
          (c.customer_name && c.customer_name.toLowerCase().includes(searchLower)) ||
          (c.customer_phone && c.customer_phone.includes(searchLower))
        );
      }

      res.json({
        cards: cards.slice(Number(offset), Number(offset) + Number(limit)),
        count: cards.length,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /retailer/nfc-cards/stats - NFC card statistics
  router.get('/nfc-cards/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        total_cards_issued: 156,
        active_cards: 142,
        inactive_cards: 8,
        blocked_cards: 6,
        registered_cards: 148,
        cards_with_pin: 135,
        total_card_balance: 2850000,
        cards_used_today: 45,
        cards_used_this_week: 128,
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /retailer/nfc-cards/issue - issue new NFC card
  router.post('/nfc-cards/issue', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { card_uid, customer_name, customer_phone, initial_balance, branch_id } = req.body;

      if (!card_uid) {
        return res.status(400).json({ error: 'card_uid is required' });
      }

      const branch = branch_id ? branches.get(branch_id) : null;

      const newCard = {
        id: `card_${Date.now()}`,
        card_uid,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        balance: initial_balance || 0,
        status: 'active',
        is_registered: !!customer_phone,
        pin_set: false,
        branch_issued: branch?.branch_name || user.shop_name || 'Main Branch',
        issued_by: user.id,
        issued_at: new Date().toISOString(),
        last_used: null,
      };

      res.status(201).json(newCard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /retailer/nfc-cards/:id/block - block NFC card
  router.post('/nfc-cards/:id/block', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      res.json({
        id,
        status: 'blocked',
        blocked_reason: reason || 'Blocked by retailer',
        blocked_at: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /retailer/nfc-cards/:id/unblock - unblock NFC card
  router.post('/nfc-cards/:id/unblock', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      res.json({
        id,
        status: 'active',
        unblocked_at: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /retailer/nfc-cards/:id/topup - top up NFC card balance
  router.post('/nfc-cards/:id/topup', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { amount, payment_method, reference } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      res.json({
        id,
        topup_amount: amount,
        new_balance: 15000 + amount, // Mock: previous balance + topup
        payment_method: payment_method || 'cash',
        reference: reference || `TOPUP-${Date.now()}`,
        transaction_id: `txn_${Date.now()}`,
        topped_up_at: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /retailer/nfc-cards/:id/transactions - NFC card transaction history
  router.get('/nfc-cards/:id/transactions', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const transactions = [
        { id: 'txn_001', type: 'payment', amount: -2500, balance_after: 15000, merchant: 'Kigali Main Branch', description: 'POS Payment', created_at: '2024-11-28T10:30:00Z' },
        { id: 'txn_002', type: 'topup', amount: 10000, balance_after: 17500, method: 'MTN MoMo', description: 'Wallet Top-up', created_at: '2024-11-27T14:00:00Z' },
        { id: 'txn_003', type: 'payment', amount: -7500, balance_after: 7500, merchant: 'Kimihurura Branch', description: 'POS Payment (PIN verified)', created_at: '2024-11-26T11:45:00Z' },
        { id: 'txn_004', type: 'topup', amount: 5000, balance_after: 15000, method: 'USSD *939#', description: 'USSD Top-up', created_at: '2024-11-25T09:30:00Z' },
      ];

      res.json({
        card_id: id,
        transactions: transactions.slice(Number(offset), Number(offset) + Number(limit)),
        count: transactions.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

// ==================== MANUAL CARD PAYMENT ====================

/**
 * POST /retailer/manual-payment/verify-pin
 * Method 1: Direct PIN entry and charge
 */
router.post('/manual-payment/verify-pin', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { card_id, pin, amount, branch_id } = req.body;
    const retailerId = (req as any).user?.id;

    if (!card_id || !pin || !amount) {
      return res.status(400).json({ error: 'Card ID, PIN, and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Get service from request scope
    const manualPaymentService = (req as any).scope.resolve('manualPaymentService');

    const result = await manualPaymentService.verifyPinAndCharge(
      card_id,
      pin,
      amount,
      retailerId,
      branch_id,
      req.ip,
      req.headers['user-agent']
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      transaction_id: result.transaction_id,
      card_balance: result.card_balance,
    });
  } catch (error: any) {
    console.error('Error processing PIN payment:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
});

/**
 * POST /retailer/manual-payment/generate-code
 * Method 2: Generate one-time 8-digit payment code
 */
router.post('/manual-payment/generate-code', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { card_id, amount, customer_phone, branch_id } = req.body;
    const retailerId = (req as any).user?.id;

    if (!card_id || !amount) {
      return res.status(400).json({ error: 'Card ID and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Get service from request scope
    const manualPaymentService = (req as any).scope.resolve('manualPaymentService');

    const result = await manualPaymentService.generatePaymentCode(
      card_id,
      amount,
      retailerId,
      customer_phone,
      branch_id
    );

    res.json({
      success: true,
      message: customer_phone
        ? 'Payment code sent to customer via SMS'
        : 'Payment code generated',
      code: result.code,
      expires_at: result.expires_at,
      valid_for_minutes: 10,
    });
  } catch (error: any) {
    console.error('Error generating payment code:', error);
    res.status(500).json({ error: error.message || 'Failed to generate code' });
  }
});

/**
 * POST /retailer/manual-payment/verify-code
 * Method 2: Verify payment code and charge
 */
router.post('/manual-payment/verify-code', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { card_id, code, branch_id } = req.body;
    const retailerId = (req as any).user?.id;

    if (!card_id || !code) {
      return res.status(400).json({ error: 'Card ID and code are required' });
    }

    if (code.length !== 8) {
      return res.status(400).json({ error: 'Code must be 8 digits' });
    }

    // Get service from request scope
    const manualPaymentService = (req as any).scope.resolve('manualPaymentService');

    const result = await manualPaymentService.verifyCodeAndCharge(
      card_id,
      code,
      retailerId,
      branch_id,
      req.ip,
      req.headers['user-agent']
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      transaction_id: result.transaction_id,
      card_balance: result.card_balance,
    });
  } catch (error: any) {
    console.error('Error verifying payment code:', error);
    res.status(500).json({ error: error.message || 'Failed to verify code' });
  }
});

/**
 * POST /retailer/manual-payment/request-otp
 * Method 3: Request SMS OTP for payment approval
 */
router.post('/manual-payment/request-otp', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { card_id, amount, customer_phone } = req.body;
    const retailerId = (req as any).user?.id;

    if (!card_id || !amount || !customer_phone) {
      return res.status(400).json({ error: 'Card ID, amount, and customer phone are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Validate phone format (Rwanda: +250 or 250)
    const phoneRegex = /^(\+?250|0)?[7][0-9]{8}$/;
    if (!phoneRegex.test(customer_phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Get service from request scope
    const manualPaymentService = (req as any).scope.resolve('manualPaymentService');

    const result = await manualPaymentService.requestPaymentOTP(
      card_id,
      amount,
      customer_phone,
      retailerId
    );

    res.json({
      success: true,
      message: 'OTP sent to customer via SMS',
      otp_sent: result.otp_sent,
      expires_at: result.expires_at,
      valid_for_minutes: 5,
    });
  } catch (error: any) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
});

/**
 * POST /retailer/manual-payment/verify-otp
 * Method 3: Verify OTP and charge
 */
router.post('/manual-payment/verify-otp', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { card_id, otp, customer_phone, branch_id } = req.body;
    const retailerId = (req as any).user?.id;

    if (!card_id || !otp || !customer_phone) {
      return res.status(400).json({ error: 'Card ID, OTP, and customer phone are required' });
    }

    if (otp.length !== 6) {
      return res.status(400).json({ error: 'OTP must be 6 digits' });
    }

    // Get service from request scope
    const manualPaymentService = (req as any).scope.resolve('manualPaymentService');

    const result = await manualPaymentService.verifyOTPAndCharge(
      card_id,
      otp,
      customer_phone,
      retailerId,
      branch_id,
      req.ip,
      req.headers['user-agent']
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      transaction_id: result.transaction_id,
      card_balance: result.card_balance,
    });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: error.message || 'Failed to verify OTP' });
  }
});

/**
 * GET /retailer/manual-payment/audit
 * Get manual payment audit logs (admin/retailer review)
 */
router.get('/manual-payment/audit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const retailerId = (req as any).user?.id;
    const { limit = 50, offset = 0, card_id, method, success } = req.query;

    const db = (req as any).scope.resolve('db');

    let query = `
      SELECT id, card_id, amount, verification_method, success,
             error_message, transaction_id, created_at
      FROM bigcompany.manual_payment_audit
      WHERE retailer_id = $1
    `;
    const params: any[] = [retailerId];
    let paramIndex = 2;

    if (card_id) {
      query += ` AND card_id = $${paramIndex}`;
      params.push(card_id);
      paramIndex++;
    }

    if (method) {
      query += ` AND verification_method = $${paramIndex}`;
      params.push(method);
      paramIndex++;
    }

    if (success !== undefined) {
      query += ` AND success = $${paramIndex}`;
      params.push(success === 'true');
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM bigcompany.manual_payment_audit
      WHERE retailer_id = $1
    `;
    const countParams: any[] = [retailerId];
    let countParamIndex = 2;

    if (card_id) {
      countQuery += ` AND card_id = $${countParamIndex}`;
      countParams.push(card_id);
      countParamIndex++;
    }

    if (method) {
      countQuery += ` AND verification_method = $${countParamIndex}`;
      countParams.push(method);
      countParamIndex++;
    }

    if (success !== undefined) {
      countQuery += ` AND success = $${countParamIndex}`;
      countParams.push(success === 'true');
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      audit_logs: result.rows,
      total: parseInt(countResult.rows[0]?.total || '0'),
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * POST /retailer/manual-payment/cleanup
 * Trigger cleanup of expired codes/OTPs (admin only, or scheduled job)
 */
router.post('/manual-payment/cleanup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userType = (req as any).user?.type;

    if (userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const manualPaymentService = (req as any).scope.resolve('manualPaymentService');
    const result = await manualPaymentService.cleanupExpired();

    res.json({
      success: true,
      message: 'Cleanup completed',
      codes_deleted: result.codes_deleted,
      otps_deleted: result.otps_deleted,
      cards_unlocked: result.cards_unlocked,
    });
  } catch (error: any) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// ==================== CATEGORIES MANAGEMENT ====================

/**
 * GET /retailer/categories
 * List all categories with product counts
 */
router.get('/categories', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { search, is_active, limit = 50, offset = 0 } = req.query;
    const db = (req as any).scope.resolve('db');

    let query = `
      SELECT
        c.*,
        bigcompany.get_category_product_count(c.id) as product_count
      FROM bigcompany.product_categories c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (c.name ILIKE $${params.length + 1} OR c.code ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (is_active !== undefined) {
      query += ` AND c.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY c.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), Number(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM bigcompany.product_categories c WHERE 1=1';
    const countParams: any[] = [];

    if (search) {
      countQuery += ` AND (c.name ILIKE $${countParams.length + 1} OR c.code ILIKE $${countParams.length + 1})`;
      countParams.push(`%${search}%`);
    }

    if (is_active !== undefined) {
      countQuery += ` AND c.is_active = $${countParams.length + 1}`;
      countParams.push(is_active === 'true');
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      categories: result.rows,
      total: parseInt(countResult.rows[0]?.total || '0'),
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /retailer/categories/:id
 * Get single category with details
 */
router.get('/categories/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = (req as any).scope.resolve('db');

    const result = await db.query(`
      SELECT
        c.*,
        bigcompany.get_category_product_count(c.id) as product_count
      FROM bigcompany.product_categories c
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get sample products in this category
    const productsResult = await db.query(`
      SELECT id, name, sku, price
      FROM bigcompany.products
      WHERE category_id = $1
      LIMIT 5
    `, [id]);

    res.json({
      category: result.rows[0],
      sample_products: productsResult.rows,
    });
  } catch (error: any) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

/**
 * POST /retailer/categories
 * Create new category
 */
router.post('/categories', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, code } = req.body;
    const retailerId = (req as any).user?.id;
    const db = (req as any).scope.resolve('db');

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Category name must be less than 100 characters' });
    }

    // Check if name already exists
    const existingName = await db.query(`
      SELECT id FROM bigcompany.product_categories
      WHERE LOWER(name) = LOWER($1) AND is_active = true
    `, [name.trim()]);

    if (existingName.rows.length > 0) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }

    // Generate or validate code
    let categoryCode = code;
    if (!categoryCode) {
      const codeResult = await db.query(`
        SELECT bigcompany.generate_category_code($1) as code
      `, [name]);
      categoryCode = codeResult.rows[0].code;
    } else {
      // Validate custom code format (3 letters + hyphen + 4 digits)
      if (!/^[A-Z]{3}-\d{4}$/.test(categoryCode)) {
        return res.status(400).json({
          error: 'Invalid code format. Must be 3 uppercase letters, hyphen, and 4 digits (e.g., BEV-1234)'
        });
      }

      // Check if code already exists
      const existingCode = await db.query(`
        SELECT id FROM bigcompany.product_categories WHERE code = $1
      `, [categoryCode]);

      if (existingCode.rows.length > 0) {
        return res.status(400).json({ error: 'A category with this code already exists' });
      }
    }

    // Create category
    const result = await db.query(`
      INSERT INTO bigcompany.product_categories
      (code, name, description, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [categoryCode, name.trim(), description?.trim() || null, retailerId]);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category code or name already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /retailer/categories/:id
 * Update existing category
 */
router.put('/categories/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    const db = (req as any).scope.resolve('db');

    // Check if category exists
    const existing = await db.query(`
      SELECT id FROM bigcompany.product_categories WHERE id = $1
    `, [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Category name cannot be empty' });
      }

      if (name.length > 100) {
        return res.status(400).json({ error: 'Category name must be less than 100 characters' });
      }

      // Check if name already exists (excluding current category)
      const existingName = await db.query(`
        SELECT id FROM bigcompany.product_categories
        WHERE LOWER(name) = LOWER($1) AND id != $2 AND is_active = true
      `, [name.trim(), id]);

      if (existingName.rows.length > 0) {
        return res.status(400).json({ error: 'A category with this name already exists' });
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push(`name = $${params.length + 1}`);
      params.push(name.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${params.length + 1}`);
      params.push(description?.trim() || null);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${params.length + 1}`);
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    const result = await db.query(`
      UPDATE bigcompany.product_categories
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING *
    `, params);

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /retailer/categories/:id
 * Delete category (soft delete if has products, hard delete otherwise)
 */
router.delete('/categories/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force } = req.query;
    const db = (req as any).scope.resolve('db');

    // Check if category exists
    const existing = await db.query(`
      SELECT id FROM bigcompany.product_categories WHERE id = $1
    `, [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has products
    const hasProducts = await db.query(`
      SELECT bigcompany.category_has_products($1) as has_products
    `, [id]);

    if (hasProducts.rows[0].has_products) {
      if (force === 'true') {
        // Soft delete - set is_active to false
        await db.query(`
          UPDATE bigcompany.product_categories
          SET is_active = false
          WHERE id = $1
        `, [id]);

        return res.json({
          success: true,
          message: 'Category deactivated (has associated products)',
          soft_deleted: true,
        });
      } else {
        const productCount = await db.query(`
          SELECT bigcompany.get_category_product_count($1) as count
        `, [id]);

        return res.status(400).json({
          error: 'Cannot delete category with associated products',
          product_count: productCount.rows[0].count,
          hint: 'Use force=true to deactivate instead of deleting',
        });
      }
    }

    // Hard delete - no products associated
    await db.query(`
      DELETE FROM bigcompany.product_categories WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Category deleted successfully',
      soft_deleted: false,
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * GET /retailer/categories/stats/summary
 * Get category statistics
 */
router.get('/categories/stats/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = (req as any).scope.resolve('db');

    const result = await db.query(`
      SELECT
        COUNT(*) as total_categories,
        COUNT(*) FILTER (WHERE is_active = true) as active_categories,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_categories,
        (SELECT COUNT(DISTINCT category_id) FROM bigcompany.products WHERE category_id IS NOT NULL) as categories_with_products
      FROM bigcompany.product_categories
    `);

    res.json({
      stats: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ==================== REPORTS - PROFIT MARGIN ====================

// GET /retailer/reports/profit-margin - Profit margin analysis with date filters
router.get('/reports/profit-margin', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { period = 'today', start_date, end_date } = req.query;
    const user = (req as any).user;

    // Mock order data with cost and profit calculations
    const mockOrderData = [
      // Today
      { date: '2024-12-02', order_id: 'ord_101', items_sold: 15, revenue: 28500, cost: 21500, profit: 7000, margin: 24.56 },
      { date: '2024-12-02', order_id: 'ord_102', items_sold: 8, revenue: 15000, cost: 11200, profit: 3800, margin: 25.33 },
      { date: '2024-12-02', order_id: 'ord_103', items_sold: 22, revenue: 42000, cost: 31500, profit: 10500, margin: 25.0 },

      // Yesterday
      { date: '2024-12-01', order_id: 'ord_091', items_sold: 12, revenue: 19800, cost: 14600, profit: 5200, margin: 26.26 },
      { date: '2024-12-01', order_id: 'ord_092', items_sold: 18, revenue: 33200, cost: 25100, profit: 8100, margin: 24.40 },

      // Last week
      { date: '2024-11-30', order_id: 'ord_085', items_sold: 25, revenue: 51000, cost: 38400, profit: 12600, margin: 24.71 },
      { date: '2024-11-29', order_id: 'ord_078', items_sold: 14, revenue: 22400, cost: 16500, profit: 5900, margin: 26.34 },
      { date: '2024-11-28', order_id: 'ord_071', items_sold: 19, revenue: 36800, cost: 27900, profit: 8900, margin: 24.18 },
      { date: '2024-11-27', order_id: 'ord_065', items_sold: 11, revenue: 18200, cost: 13400, profit: 4800, margin: 26.37 },
      { date: '2024-11-26', order_id: 'ord_058', items_sold: 16, revenue: 28900, cost: 21700, profit: 7200, margin: 24.91 },

      // Last month
      { date: '2024-11-15', order_id: 'ord_045', items_sold: 21, revenue: 45000, cost: 33800, profit: 11200, margin: 24.89 },
      { date: '2024-11-10', order_id: 'ord_032', items_sold: 17, revenue: 31500, cost: 23600, profit: 7900, margin: 25.08 },
      { date: '2024-11-05', order_id: 'ord_021', items_sold: 13, revenue: 24800, cost: 18300, profit: 6500, margin: 26.21 },
    ];

    // Filter data based on period
    let filteredData = mockOrderData;
    const today = new Date('2024-12-02');

    if (period === 'today') {
      filteredData = mockOrderData.filter(o => o.date === '2024-12-02');
    } else if (period === 'yesterday') {
      filteredData = mockOrderData.filter(o => o.date === '2024-12-01');
    } else if (period === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredData = mockOrderData.filter(o => new Date(o.date) >= weekAgo);
    } else if (period === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filteredData = mockOrderData.filter(o => new Date(o.date) >= monthAgo);
    } else if (period === 'custom' && start_date && end_date) {
      filteredData = mockOrderData.filter(o =>
        o.date >= start_date && o.date <= end_date
      );
    }

    // Calculate summary statistics
    const total_orders = filteredData.length;
    const total_items = filteredData.reduce((sum, o) => sum + o.items_sold, 0);
    const total_revenue = filteredData.reduce((sum, o) => sum + o.revenue, 0);
    const total_cost = filteredData.reduce((sum, o) => sum + o.cost, 0);
    const total_profit = total_revenue - total_cost;
    const average_margin = total_revenue > 0 ? (total_profit / total_revenue) * 100 : 0;

    // Group by date for daily breakdown
    const dailyBreakdown = filteredData.reduce((acc: any, order) => {
      if (!acc[order.date]) {
        acc[order.date] = {
          date: order.date,
          orders: 0,
          items: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }
      acc[order.date].orders += 1;
      acc[order.date].items += order.items_sold;
      acc[order.date].revenue += order.revenue;
      acc[order.date].cost += order.cost;
      acc[order.date].profit += order.profit;
      return acc;
    }, {});

    const breakdown = Object.values(dailyBreakdown).map((day: any) => ({
      ...day,
      margin: day.revenue > 0 ? ((day.profit / day.revenue) * 100).toFixed(2) : '0.00',
    }));

    res.json({
      period,
      start_date: start_date || filteredData[filteredData.length - 1]?.date,
      end_date: end_date || filteredData[0]?.date,
      summary: {
        total_orders,
        total_items,
        total_revenue,
        total_cost,
        total_profit,
        average_margin: average_margin.toFixed(2),
        currency: 'RWF',
      },
      breakdown,
      orders: filteredData,
    });
  } catch (error: any) {
    console.error('Error calculating profit margin:', error);
    res.status(500).json({ error: 'Failed to calculate profit margin' });
  }
});

// ==================== ESCROW ENDPOINTS ====================

/**
 * GET /retailer/escrow/summary
 * Get retailer's escrow summary (outstanding debt, active escrows, etc.)
 */
router.get('/escrow/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const retailer_id = user.id;

    const escrowService = req.scope.resolve('escrowService');
    const summary = await escrowService.getRetailerSummary(retailer_id);

    if (!summary) {
      return res.json({
        retailer_id,
        total_escrow_transactions: 0,
        active_escrow_count: 0,
        total_held_amount: 0,
        total_released_amount: 0,
        total_disputed_amount: 0,
        total_repaid_amount: 0,
        outstanding_debt: 0,
        last_escrow_date: null,
        last_repayment_date: null,
      });
    }

    res.json(summary);
  } catch (error: any) {
    console.error('Error fetching escrow summary:', error);
    res.status(500).json({ error: 'Failed to fetch escrow summary' });
  }
});

/**
 * GET /retailer/escrow/transactions
 * Get all escrow transactions for retailer
 */
router.get('/escrow/transactions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const retailer_id = user.id;
    const status = req.query.status as string;

    const escrowService = req.scope.resolve('escrowService');
    const transactions = await escrowService.getRetailerEscrows(retailer_id, status);

    res.json({
      count: transactions.length,
      transactions,
    });
  } catch (error: any) {
    console.error('Error fetching escrow transactions:', error);
    res.status(500).json({ error: 'Failed to fetch escrow transactions' });
  }
});

/**
 * GET /retailer/escrow/transactions/:id
 * Get specific escrow transaction details
 */
router.get('/escrow/transactions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const escrow_id = req.params.id;

    const escrowService = req.scope.resolve('escrowService');
    const transaction = await escrowService.getEscrowById(escrow_id);

    if (!transaction) {
      return res.status(404).json({ error: 'Escrow transaction not found' });
    }

    // Verify retailer owns this transaction
    if (transaction.retailer_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to view this transaction' });
    }

    res.json(transaction);
  } catch (error: any) {
    console.error('Error fetching escrow transaction:', error);
    res.status(500).json({ error: 'Failed to fetch escrow transaction' });
  }
});

/**
 * POST /retailer/escrow/repayment
 * Record a manual repayment from retailer
 */
router.post('/escrow/repayment', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      escrow_transaction_id,
      repayment_amount,
      repayment_method,
      payment_reference,
      notes,
    } = req.body;

    if (!escrow_transaction_id || !repayment_amount || !repayment_method) {
      return res.status(400).json({
        error: 'Missing required fields: escrow_transaction_id, repayment_amount, repayment_method',
      });
    }

    if (!['mobile_money', 'bank_transfer', 'wallet'].includes(repayment_method)) {
      return res.status(400).json({
        error: 'Invalid repayment_method. Must be: mobile_money, bank_transfer, or wallet',
      });
    }

    const escrowService = req.scope.resolve('escrowService');

    // Verify escrow belongs to retailer
    const escrow = await escrowService.getEscrowById(escrow_transaction_id);
    if (!escrow || escrow.retailer_id !== user.id) {
      return res.status(404).json({ error: 'Escrow transaction not found' });
    }

    const repayment = await escrowService.recordRepayment({
      escrow_transaction_id,
      retailer_id: user.id,
      repayment_amount: parseFloat(repayment_amount),
      repayment_method,
      payment_reference,
      notes,
    });

    res.status(201).json({
      message: 'Repayment recorded successfully',
      repayment,
    });
  } catch (error: any) {
    console.error('Error recording repayment:', error);
    res.status(500).json({ error: error.message || 'Failed to record repayment' });
  }
});

/**
 * GET /retailer/escrow/auto-deduct-settings
 * Get retailer's auto-deduct settings
 */
router.get('/escrow/auto-deduct-settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const retailer_id = user.id;

    const result = await db.query(
      'SELECT * FROM bigcompany.escrow_auto_deductions WHERE retailer_id = $1',
      [retailer_id]
    );

    if (result.rows.length === 0) {
      // Return default settings
      return res.json({
        retailer_id,
        enabled: true,
        deduction_percentage: 30.00,
        minimum_balance_rwf: 10000.00,
        max_daily_deduction_rwf: null,
        max_total_outstanding_rwf: 5000000.00,
        suspended: false,
      });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching auto-deduct settings:', error);
    res.status(500).json({ error: 'Failed to fetch auto-deduct settings' });
  }
});

/**
 * PATCH /retailer/escrow/auto-deduct-settings
 * Update retailer's auto-deduct settings
 */
router.patch('/escrow/auto-deduct-settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const retailer_id = user.id;
    const { enabled, deduction_percentage, minimum_balance_rwf, max_daily_deduction_rwf } = req.body;

    const escrowService = req.scope.resolve('escrowService');
    const updated = await escrowService.updateAutoDeductSettings(retailer_id, {
      enabled,
      deduction_percentage,
      minimum_balance_rwf,
      max_daily_deduction_rwf,
    });

    res.json({
      message: 'Auto-deduct settings updated successfully',
      settings: updated,
    });
  } catch (error: any) {
    console.error('Error updating auto-deduct settings:', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

/**
 * POST /retailer/escrow/dispute/:id
 * Raise a dispute on an escrow transaction
 */
router.post('/escrow/dispute/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const escrow_id = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Dispute reason is required' });
    }

    const escrowService = req.scope.resolve('escrowService');

    // Verify escrow belongs to retailer
    const escrow = await escrowService.getEscrowById(escrow_id);
    if (!escrow || escrow.retailer_id !== user.id) {
      return res.status(404).json({ error: 'Escrow transaction not found' });
    }

    if (escrow.status !== 'held') {
      return res.status(400).json({
        error: 'Can only dispute escrows in "held" status',
      });
    }

    await escrowService.raiseDispute(escrow_id, reason, user.id);

    res.json({
      message: 'Dispute raised successfully. Our team will review it shortly.',
      escrow_id,
    });
  } catch (error: any) {
    console.error('Error raising dispute:', error);
    res.status(500).json({ error: error.message || 'Failed to raise dispute' });
  }
});

export default router;
