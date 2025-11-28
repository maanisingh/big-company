import { Router, Request, Response, NextFunction, json } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// CORS Middleware for wholesaler routes
const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    'https://bigcompany-wholesaler.alexandratechlab.com',
    'https://bigcompany-retailer.alexandratechlab.com',
    'http://localhost:3002',
    'http://localhost:3005',
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

    if (decoded.type !== 'wholesaler' && decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Not authorized for wholesaler access' });
    }

    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Mock wholesaler database
const wholesalers: Map<string, any> = new Map([
  ['wholesaler@bigcompany.rw', {
    id: 'whl_001',
    email: 'wholesaler@bigcompany.rw',
    password: bcrypt.hashSync('wholesaler123', 10),
    name: 'BIG Company Wholesale',
    company_name: 'BIG Company Rwanda Ltd',
    phone: '+250788999888',
    location: 'Kigali Industrial Zone, Rwanda',
    type: 'wholesaler',
    status: 'active',
    tier: 'premium',
    credit_limit: 50000000,
    created_at: new Date('2024-01-01'),
  }],
]);

const router = Router();

// JSON body parser middleware
router.use(json());

// Apply CORS to all wholesaler routes
router.use(corsMiddleware);

// ==================== AUTH ROUTES ====================

  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const wholesaler = wholesalers.get(email);
      if (!wholesaler) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, wholesaler.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: wholesaler.id, email: wholesaler.email, type: 'wholesaler', company_name: wholesaler.company_name },
        process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024',
        { expiresIn: '7d' }
      );

      const { password: _, ...wholesalerData } = wholesaler;
      res.json({ access_token: token, wholesaler: wholesalerData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const wholesaler = Array.from(wholesalers.values()).find(w => w.id === user.id);
      if (!wholesaler) {
        return res.status(404).json({ error: 'Wholesaler not found' });
      }
      const { password: _, ...wholesalerData } = wholesaler;
      res.json(wholesalerData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== DASHBOARD ROUTES ====================

  router.get('/dashboard/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        totalOrders: 892,
        totalRevenue: 156000000, // RWF
        pendingOrders: 45,
        activeRetailers: 156,
        totalProducts: 248,
        lowStockItems: 12,
        todayOrders: 34,
        todayRevenue: 8500000,
        creditUsed: 12500000,
        creditLimit: 50000000,
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/dashboard/sales', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { period = 'week' } = req.query;

      const salesData = {
        week: [
          { date: '2024-11-22', sales: 4500000, orders: 45 },
          { date: '2024-11-23', sales: 7800000, orders: 78 },
          { date: '2024-11-24', sales: 5600000, orders: 56 },
          { date: '2024-11-25', sales: 9200000, orders: 92 },
          { date: '2024-11-26', sales: 6700000, orders: 67 },
          { date: '2024-11-27', sales: 8400000, orders: 84 },
          { date: '2024-11-28', sales: 8500000, orders: 85 },
        ],
        month: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(2024, 10, i + 1).toISOString().split('T')[0],
          sales: Math.floor(Math.random() * 10000000) + 3000000,
          orders: Math.floor(Math.random() * 100) + 30,
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
        { id: 'prod_w1', name: 'Inyange Milk 500ml (Case/24)', stock: 15, threshold: 50, category: 'Dairy' },
        { id: 'prod_w2', name: 'Bralirwa Primus 500ml (Crate/24)', stock: 8, threshold: 30, category: 'Beverages' },
        { id: 'prod_w3', name: 'Akabanga Chili Oil (Box/48)', stock: 5, threshold: 20, category: 'Cooking' },
        { id: 'prod_w4', name: 'Isombe Mix 1kg (Bag/25)', stock: 12, threshold: 25, category: 'Food' },
        { id: 'prod_w5', name: 'Urwagwa Traditional 1L (Case/12)', stock: 3, threshold: 15, category: 'Beverages' },
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
        { id: 'whl_ord_001', retailer: 'Kigali Shop', total: 1500000, status: 'pending', items: 45, created_at: '2024-11-28T10:30:00Z' },
        { id: 'whl_ord_002', retailer: 'Musanze Mart', total: 2850000, status: 'processing', items: 82, created_at: '2024-11-28T09:15:00Z' },
        { id: 'whl_ord_003', retailer: 'Rubavu Store', total: 820000, status: 'shipped', items: 28, created_at: '2024-11-28T08:45:00Z' },
        { id: 'whl_ord_004', retailer: 'Huye Traders', total: 4200000, status: 'delivered', items: 120, created_at: '2024-11-27T16:20:00Z' },
        { id: 'whl_ord_005', retailer: 'Nyagatare Supplies', total: 1980000, status: 'pending', items: 56, created_at: '2024-11-27T14:50:00Z' },
      ];

      res.json(recentOrders.slice(0, Number(limit)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/dashboard/top-retailers', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 5 } = req.query;

      const topRetailers = [
        { id: 'ret_001', name: 'Kigali Shop', orders: 156, revenue: 24500000, location: 'Kigali' },
        { id: 'ret_002', name: 'Musanze Mart', orders: 142, revenue: 22800000, location: 'Musanze' },
        { id: 'ret_003', name: 'Rubavu Store', orders: 128, revenue: 19200000, location: 'Rubavu' },
        { id: 'ret_004', name: 'Huye Traders', orders: 115, revenue: 17800000, location: 'Huye' },
        { id: 'ret_005', name: 'Nyagatare Supplies', orders: 98, revenue: 15600000, location: 'Nyagatare' },
      ];

      res.json(topRetailers.slice(0, Number(limit)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Weekly sales endpoint (alias for dashboard/sales with week period)
  router.get('/dashboard/weekly-sales', authMiddleware, async (req: Request, res: Response) => {
    try {
      const weeklySales = [
        { date: '2024-11-22', sales: 4500000, orders: 45, day: 'Fri' },
        { date: '2024-11-23', sales: 7800000, orders: 78, day: 'Sat' },
        { date: '2024-11-24', sales: 5600000, orders: 56, day: 'Sun' },
        { date: '2024-11-25', sales: 9200000, orders: 92, day: 'Mon' },
        { date: '2024-11-26', sales: 6700000, orders: 67, day: 'Tue' },
        { date: '2024-11-27', sales: 8400000, orders: 84, day: 'Wed' },
        { date: '2024-11-28', sales: 8500000, orders: 85, day: 'Thu' },
      ];
      res.json(weeklySales);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pending orders for dashboard
  router.get('/dashboard/pending-orders', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 5 } = req.query;
      const pendingOrders = [
        { id: 'whl_ord_001', retailer: 'Kigali Shop', total: 1500000, items: 45, created_at: '2024-11-28T10:30:00Z', priority: 'high' },
        { id: 'whl_ord_005', retailer: 'Nyagatare Supplies', total: 1980000, items: 56, created_at: '2024-11-27T14:50:00Z', priority: 'normal' },
        { id: 'whl_ord_006', retailer: 'Muhanga Store', total: 2350000, items: 68, created_at: '2024-11-27T11:20:00Z', priority: 'normal' },
        { id: 'whl_ord_007', retailer: 'Rwamagana Market', total: 890000, items: 24, created_at: '2024-11-27T09:45:00Z', priority: 'low' },
        { id: 'whl_ord_008', retailer: 'Karongi Traders', total: 3200000, items: 92, created_at: '2024-11-26T16:30:00Z', priority: 'high' },
      ];
      res.json(pendingOrders.slice(0, Number(limit)));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Credit health dashboard endpoint
  router.get('/dashboard/credit-health', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        total_credit_limit: 50000000,
        total_credit_used: 35000000,
        available_credit: 15000000,
        utilization_rate: 70,
        retailers_with_credit: 45,
        overdue_amount: 5200000,
        overdue_count: 8,
        on_time_payments_rate: 92,
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== RETAILERS MANAGEMENT ====================

  router.get('/retailers', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, status, search } = req.query;

      let retailers = [
        { id: 'ret_001', name: 'Kigali Shop', email: 'kigali@shop.rw', phone: '+250788123456', location: 'Kigali', status: 'active', tier: 'gold', total_orders: 156, total_spent: 24500000 },
        { id: 'ret_002', name: 'Musanze Mart', email: 'musanze@mart.rw', phone: '+250788234567', location: 'Musanze', status: 'active', tier: 'silver', total_orders: 142, total_spent: 22800000 },
        { id: 'ret_003', name: 'Rubavu Store', email: 'rubavu@store.rw', phone: '+250788345678', location: 'Rubavu', status: 'active', tier: 'bronze', total_orders: 128, total_spent: 19200000 },
        { id: 'ret_004', name: 'Huye Traders', email: 'huye@traders.rw', phone: '+250788456789', location: 'Huye', status: 'active', tier: 'silver', total_orders: 115, total_spent: 17800000 },
        { id: 'ret_005', name: 'Nyagatare Supplies', email: 'nyagatare@supplies.rw', phone: '+250788567890', location: 'Nyagatare', status: 'pending', tier: 'bronze', total_orders: 98, total_spent: 15600000 },
      ];

      if (status) {
        retailers = retailers.filter(r => r.status === status);
      }

      if (search) {
        const searchLower = (search as string).toLowerCase();
        retailers = retailers.filter(r =>
          r.name.toLowerCase().includes(searchLower) ||
          r.email.toLowerCase().includes(searchLower) ||
          r.location.toLowerCase().includes(searchLower)
        );
      }

      res.json({
        retailers: retailers.slice(Number(offset), Number(offset) + Number(limit)),
        count: retailers.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/retailers/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const retailer = {
        id,
        name: 'Kigali Shop',
        email: 'kigali@shop.rw',
        phone: '+250788123456',
        address: { line1: 'KG 123 St', city: 'Kigali', district: 'Gasabo', country: 'Rwanda' },
        status: 'active',
        tier: 'gold',
        credit_limit: 5000000,
        credit_used: 1200000,
        total_orders: 156,
        total_spent: 24500000,
        reward_balance: 245000,
        created_at: '2024-01-15T08:00:00Z',
      };

      res.json(retailer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/retailers/:id/approve', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      res.json({ id, status: 'active', approved_at: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/retailers/:id/credit', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { credit_limit } = req.body;
      res.json({ id, credit_limit, updated_at: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ORDERS ROUTES ====================

  // Orders stats endpoint
  router.get('/orders/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        total_orders: 892,
        pending: 45,
        processing: 38,
        shipped: 52,
        delivered: 745,
        cancelled: 12,
        total_revenue: 156000000,
        average_order_value: 174888,
        orders_today: 34,
        revenue_today: 8500000,
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/orders', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, status } = req.query;

      let orders = [
        { id: 'whl_ord_001', retailer: 'Kigali Shop', retailer_id: 'ret_001', total: 1500000, status: 'pending', items: 45, payment_status: 'paid', created_at: '2024-11-28T10:30:00Z' },
        { id: 'whl_ord_002', retailer: 'Musanze Mart', retailer_id: 'ret_002', total: 2850000, status: 'processing', items: 82, payment_status: 'partial', created_at: '2024-11-28T09:15:00Z' },
        { id: 'whl_ord_003', retailer: 'Rubavu Store', retailer_id: 'ret_003', total: 820000, status: 'shipped', items: 28, payment_status: 'paid', created_at: '2024-11-28T08:45:00Z' },
        { id: 'whl_ord_004', retailer: 'Huye Traders', retailer_id: 'ret_004', total: 4200000, status: 'delivered', items: 120, payment_status: 'paid', created_at: '2024-11-27T16:20:00Z' },
        { id: 'whl_ord_005', retailer: 'Nyagatare Supplies', retailer_id: 'ret_005', total: 1980000, status: 'pending', items: 56, payment_status: 'credit', created_at: '2024-11-27T14:50:00Z' },
      ];

      if (status) {
        orders = orders.filter(o => o.status === status);
      }

      res.json({
        orders: orders.slice(Number(offset), Number(offset) + Number(limit)),
        count: orders.length,
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
        retailer: { id: 'ret_001', name: 'Kigali Shop', email: 'kigali@shop.rw', phone: '+250788123456' },
        items: [
          { id: 'item_1', product_id: 'prod_w1', name: 'Inyange Milk 500ml (Case/24)', quantity: 20, unit_price: 18000, total: 360000 },
          { id: 'item_2', product_id: 'prod_w2', name: 'Bralirwa Primus 500ml (Crate/24)', quantity: 30, unit_price: 28000, total: 840000 },
          { id: 'item_3', product_id: 'prod_w4', name: 'Isombe Mix 1kg (Bag/25)', quantity: 10, unit_price: 85000, total: 850000 },
        ],
        subtotal: 2050000,
        discount: 50000,
        tax: 0,
        total: 2000000,
        status: 'processing',
        payment_status: 'partial',
        payment_method: 'credit',
        amount_paid: 1000000,
        amount_due: 1000000,
        shipping_address: { line1: 'KG 123 St', city: 'Kigali', district: 'Gasabo', country: 'Rwanda' },
        notes: 'Urgent delivery requested',
        created_at: '2024-11-28T09:15:00Z',
        updated_at: '2024-11-28T10:00:00Z',
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

  router.post('/orders/:id/ship', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { tracking_number, carrier, estimated_delivery } = req.body;
      res.json({ id, status: 'shipped', tracking_number, carrier, estimated_delivery, shipped_at: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== INVENTORY ROUTES ====================

  router.get('/inventory', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, low_stock, search, category } = req.query;

      let products = [
        { id: 'prod_w1', name: 'Inyange Milk 500ml (Case/24)', sku: 'INY-MLK-500-C24', category: 'Dairy', wholesale_price: 18000, retail_price: 19200, stock: 250, threshold: 50, status: 'active' },
        { id: 'prod_w2', name: 'Bralirwa Primus 500ml (Crate/24)', sku: 'BRL-PRM-500-C24', category: 'Beverages', wholesale_price: 28000, retail_price: 28800, stock: 8, threshold: 30, status: 'active' },
        { id: 'prod_w3', name: 'Akabanga Chili Oil (Box/48)', sku: 'AKB-CHI-100-B48', category: 'Cooking', wholesale_price: 290000, retail_price: 297600, stock: 5, threshold: 20, status: 'active' },
        { id: 'prod_w4', name: 'Isombe Mix 1kg (Bag/25)', sku: 'ISB-MIX-1KG-B25', category: 'Food', wholesale_price: 85000, retail_price: 87500, stock: 180, threshold: 25, status: 'active' },
        { id: 'prod_w5', name: 'Urwagwa Traditional 1L (Case/12)', sku: 'URW-TRD-1L-C12', category: 'Beverages', wholesale_price: 92000, retail_price: 96000, stock: 3, threshold: 15, status: 'active' },
        { id: 'prod_w6', name: 'Inyange Water 1.5L (Pack/6)', sku: 'INY-WTR-1.5-P6', category: 'Beverages', wholesale_price: 2800, retail_price: 3000, stock: 500, threshold: 100, status: 'active' },
        { id: 'prod_w7', name: 'Ikivuguto 1L (Case/12)', sku: 'IKV-YOG-1L-C12', category: 'Dairy', wholesale_price: 22000, retail_price: 24000, stock: 85, threshold: 30, status: 'active' },
        { id: 'prod_w8', name: 'Ubuki Honey 500g (Box/24)', sku: 'UBK-HNY-500-B24', category: 'Food', wholesale_price: 280000, retail_price: 288000, stock: 45, threshold: 15, status: 'active' },
      ];

      if (low_stock === 'true') {
        products = products.filter(p => p.stock <= p.threshold);
      }

      if (category) {
        products = products.filter(p => p.category === category);
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
        name: 'Inyange Milk 500ml (Case/24)',
        sku: 'INY-MLK-500-C24',
        description: 'Fresh pasteurized milk from Inyange Industries - wholesale case of 24 bottles',
        category: 'Dairy',
        wholesale_price: 18000,
        retail_price: 19200,
        cost: 15000,
        stock: 250,
        threshold: 50,
        unit: 'case',
        items_per_unit: 24,
        status: 'active',
        images: ['/images/products/inyange-milk-case.jpg'],
        supplier: { id: 'sup_001', name: 'Inyange Industries', contact: '+250788111000' },
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
      const { quantity, adjustment_type, reason, batch_number, expiry_date } = req.body;

      res.json({
        id,
        new_stock: 300,
        adjustment: quantity,
        adjustment_type,
        reason,
        batch_number,
        expiry_date,
        updated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/inventory/:id/price', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wholesale_price, retail_price } = req.body;

      res.json({
        id,
        wholesale_price,
        retail_price,
        margin: retail_price - wholesale_price,
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
        id: `prod_w${Date.now()}`,
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

  // ==================== FINANCE ROUTES ====================

  router.get('/finance/summary', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        total_revenue: 156000000,
        total_receivables: 28500000,
        total_payables: 12000000,
        cash_balance: 45000000,
        credit_extended: 35000000,
        credit_limit: 50000000,
        profit_this_month: 18500000,
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/finance/receivables', authMiddleware, async (req: Request, res: Response) => {
    try {
      const receivables = [
        { retailer_id: 'ret_001', retailer_name: 'Kigali Shop', amount: 1200000, due_date: '2024-12-05', days_overdue: 0 },
        { retailer_id: 'ret_002', retailer_name: 'Musanze Mart', amount: 850000, due_date: '2024-11-25', days_overdue: 3 },
        { retailer_id: 'ret_003', retailer_name: 'Rubavu Store', amount: 2100000, due_date: '2024-12-10', days_overdue: 0 },
        { retailer_id: 'ret_005', retailer_name: 'Nyagatare Supplies', amount: 980000, due_date: '2024-11-20', days_overdue: 8 },
      ];

      res.json({
        receivables,
        total: receivables.reduce((sum, r) => sum + r.amount, 0),
        overdue: receivables.filter(r => r.days_overdue > 0).reduce((sum, r) => sum + r.amount, 0),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/finance/transactions', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, type } = req.query;

      let transactions = [
        { id: 'txn_w1', type: 'income', amount: 2850000, description: 'Order payment - whl_ord_002', retailer: 'Musanze Mart', status: 'completed', created_at: '2024-11-28T09:15:00Z' },
        { id: 'txn_w2', type: 'expense', amount: 15000000, description: 'Supplier payment - Inyange Industries', status: 'completed', created_at: '2024-11-27T14:30:00Z' },
        { id: 'txn_w3', type: 'income', amount: 4200000, description: 'Order payment - whl_ord_004', retailer: 'Huye Traders', status: 'completed', created_at: '2024-11-27T16:20:00Z' },
        { id: 'txn_w4', type: 'credit', amount: 1980000, description: 'Credit sale - whl_ord_005', retailer: 'Nyagatare Supplies', status: 'pending', created_at: '2024-11-27T14:50:00Z' },
      ];

      if (type) {
        transactions = transactions.filter(t => t.type === type);
      }

      res.json({
        transactions: transactions.slice(Number(offset), Number(offset) + Number(limit)),
        count: transactions.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== REPORTS ROUTES ====================

  router.get('/reports/sales', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { start_date, end_date, group_by = 'day' } = req.query;

      res.json({
        period: { start: start_date || '2024-11-01', end: end_date || '2024-11-28' },
        total_sales: 156000000,
        total_orders: 892,
        average_order_value: 174888,
        top_products: [
          { name: 'Inyange Milk 500ml (Case/24)', quantity: 1250, revenue: 22500000 },
          { name: 'Bralirwa Primus 500ml (Crate/24)', quantity: 980, revenue: 27440000 },
          { name: 'Isombe Mix 1kg (Bag/25)', quantity: 450, revenue: 38250000 },
        ],
        top_retailers: [
          { name: 'Kigali Shop', orders: 156, revenue: 24500000 },
          { name: 'Musanze Mart', orders: 142, revenue: 22800000 },
          { name: 'Rubavu Store', orders: 128, revenue: 19200000 },
        ],
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/reports/inventory', authMiddleware, async (req: Request, res: Response) => {
    try {
      res.json({
        total_products: 248,
        total_value: 125000000,
        low_stock_count: 12,
        out_of_stock_count: 3,
        categories: [
          { name: 'Dairy', products: 45, value: 28000000 },
          { name: 'Beverages', products: 78, value: 45000000 },
          { name: 'Food', products: 65, value: 32000000 },
          { name: 'Cooking', products: 60, value: 20000000 },
        ],
        currency: 'RWF',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

export default router;
