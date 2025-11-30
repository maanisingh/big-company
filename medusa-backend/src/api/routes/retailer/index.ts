import { Router, Request, Response, NextFunction, json } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

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

  router.post('/pos/sale', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { items, payment_method, customer_phone, customer_name } = req.body;

      const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

      res.status(201).json({
        id: `pos_${Date.now()}`,
        items,
        total,
        payment_method,
        customer_phone,
        customer_name,
        status: 'completed',
        receipt_number: `RCP-${Date.now()}`,
        created_at: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

export default router;
