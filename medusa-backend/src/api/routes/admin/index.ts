import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import BlnkService from '../../../services/blnk';
import SMSService from '../../../services/sms';
import MTNMoMoService from '../../../services/momo';
import AirtelMoneyService from '../../../services/airtel';

const router = Router();

// Generate ULID-style ID for Medusa users
function generateUserId(): string {
  // Generate a timestamp-based prefix (similar to ULID)
  const timestamp = Date.now().toString(36).toUpperCase();
  // Generate random suffix
  const random = randomBytes(12).toString('base64')
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 16);
  return `usr_${timestamp}${random}`.substring(0, 32);
}

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize services
let blnkService: BlnkService;
let smsService: SMSService;
let momoService: MTNMoMoService;
let airtelService: AirtelMoneyService;

function initServices(container: any) {
  if (!blnkService) blnkService = new BlnkService(container);
  if (!smsService) smsService = new SMSService();
  if (!momoService) momoService = new MTNMoMoService();
  if (!airtelService) airtelService = new AirtelMoneyService();
}

// Admin users database (in production, store in database table)
const adminUsers: Map<string, any> = new Map([
  ['admin@bigcompany.rw', {
    id: 'admin_001',
    email: 'admin@bigcompany.rw',
    password: bcrypt.hashSync('admin123', 10),
    name: 'Platform Admin',
    role: 'super_admin',
    status: 'active',
    created_at: new Date('2024-01-01'),
  }],
]);

// ==================== AUTHENTICATION ROUTES ====================

/**
 * POST /admin/auth/login
 * Admin login endpoint
 */
router.post('/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = adminUsers.get(email);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ error: 'Admin account is not active' });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        type: 'admin',
        role: admin.role
      },
      process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024',
      { expiresIn: '7d' }
    );

    const { password: _, ...adminData } = admin;
    res.json({
      access_token: token,
      admin: adminData
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/**
 * GET /admin/auth/me
 * Get current admin user info
 */
router.get('/auth/me', async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024') as any;

    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Not authorized for admin access' });
    }

    const admin = Array.from(adminUsers.values()).find(a => a.id === decoded.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const { password: _, ...adminData } = admin;
    res.json(adminData);
  } catch (error: any) {
    console.error('Admin auth/me error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ==================== MIDDLEWARE ====================

/**
 * JWT Authentication Middleware
 * Extracts and verifies JWT token from Authorization header
 * Populates req.user with decoded token data
 */
async function authenticateJWT(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024') as any;

    // Populate req.user with decoded token data
    req.user = {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type,
      role: decoded.role
    };

    next();
  } catch (error: any) {
    console.error('JWT authentication error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Admin Authorization Middleware
 * Verifies that the authenticated user has admin role
 * Requires authenticateJWT to run first
 */
async function requireAdmin(req: any, res: any, next: any) {
  const adminId = req.user?.id;
  if (!adminId) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  // Check if user type is admin
  if (req.user?.type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Verify admin exists in our admin users map
  const admin = Array.from(adminUsers.values()).find(a => a.id === adminId);
  if (!admin || admin.status !== 'active') {
    return res.status(403).json({ error: 'Admin access denied' });
  }

  req.adminRole = admin.role;
  next();
}

// ==================== DASHBOARD STATS ====================

/**
 * GET /admin/dashboard
 * Get comprehensive dashboard statistics
 */
router.get('/dashboard', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  initServices(req.scope);

  try {
    // Customer stats
    const customerStats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
      FROM customer
    `);

    // Order stats
    const orderStats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'requires_action' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'canceled' THEN 1 END) as cancelled,
        0 as total_revenue,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_orders
      FROM "order"
    `);

    // Transaction stats (placeholder - wallet_transactions table doesn't exist yet)
    const transactionStats = {
      rows: [{
        total: 0,
        wallet_topups: 0,
        gas_purchases: 0,
        nfc_payments: 0,
        loan_disbursements: 0,
        total_volume: 0
      }]
    };

    // Loan stats
    const loanStats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'disbursed' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
        COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted,
        COALESCE(SUM(CASE WHEN status = 'disbursed' THEN outstanding_balance END), 0) as outstanding_amount
      FROM bigcompany.loans
    `);

    // Gas stats
    const gasStats = await db.query(`
      SELECT
        COUNT(*) as total_purchases,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(units_purchased), 0) as total_units
      FROM bigcompany.utility_topups
      WHERE status = 'success' AND created_at >= NOW() - INTERVAL '30 days'
    `);

    // NFC card stats
    const nfcStats = await db.query(`
      SELECT
        COUNT(*) as total_cards,
        COUNT(CASE WHEN is_active THEN 1 END) as active_cards,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as linked_cards
      FROM bigcompany.nfc_cards
    `);

    // Retailer stats
    const retailerStats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN approval_status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as verified
      FROM bigcompany.merchant_profiles
      WHERE merchant_type = 'retailer'
    `);

    // Wholesaler stats
    const wholesalerStats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN approval_status = 'active' THEN 1 END) as active
      FROM bigcompany.merchant_profiles
      WHERE merchant_type = 'wholesaler'
    `);

    // Recent activity
    const recentActivity = await db.query(`
      SELECT
        id, user_id, action, entity_type, entity_id, created_at
      FROM bigcompany.audit_logs
      ORDER BY created_at DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      dashboard: {
        customers: {
          total: Number(customerStats.rows[0].total),
          last24h: Number(customerStats.rows[0].last_24h),
          last7d: Number(customerStats.rows[0].last_7d),
          last30d: Number(customerStats.rows[0].last_30d),
        },
        orders: {
          total: Number(orderStats.rows[0].total),
          pending: Number(orderStats.rows[0].pending),
          processing: Number(orderStats.rows[0].processing),
          delivered: Number(orderStats.rows[0].delivered),
          cancelled: Number(orderStats.rows[0].cancelled),
          totalRevenue: Number(orderStats.rows[0].total_revenue),
          todayOrders: Number(orderStats.rows[0].today_orders),
        },
        transactions: {
          total: Number(transactionStats.rows[0].total),
          walletTopups: Number(transactionStats.rows[0].wallet_topups),
          gasPurchases: Number(transactionStats.rows[0].gas_purchases),
          nfcPayments: Number(transactionStats.rows[0].nfc_payments),
          loanDisbursements: Number(transactionStats.rows[0].loan_disbursements),
          totalVolume: Number(transactionStats.rows[0].total_volume),
        },
        loans: {
          total: Number(loanStats.rows[0].total),
          pending: Number(loanStats.rows[0].pending),
          active: Number(loanStats.rows[0].active),
          paid: Number(loanStats.rows[0].paid),
          defaulted: Number(loanStats.rows[0].defaulted),
          outstandingAmount: Number(loanStats.rows[0].outstanding_amount),
        },
        gas: {
          totalPurchases: Number(gasStats.rows[0].total_purchases),
          totalAmount: Number(gasStats.rows[0].total_amount),
          totalUnits: Number(gasStats.rows[0].total_units),
        },
        nfcCards: {
          total: Number(nfcStats.rows[0].total_cards),
          active: Number(nfcStats.rows[0].active_cards),
          linked: Number(nfcStats.rows[0].linked_cards),
        },
        retailers: {
          total: Number(retailerStats.rows[0].total),
          active: Number(retailerStats.rows[0].active),
          verified: Number(retailerStats.rows[0].verified),
        },
        wholesalers: {
          total: Number(wholesalerStats.rows[0].total),
          active: Number(wholesalerStats.rows[0].active),
        },
        recentActivity: recentActivity.rows,
      },
    });
  } catch (error: any) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
}));

// ==================== CUSTOMER MANAGEMENT ====================

/**
 * GET /admin/customers
 * List all customers with pagination and filters
 */
router.get('/customers', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { page = 1, limit = 20, search, status, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (c.email ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length})`;
    }

    const validSortColumns = ['created_at', 'email', 'first_name', 'last_name'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const result = await db.query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM "order" o WHERE o.customer_id = c.id) as order_count,
        0 as total_spent
      FROM customer c
      ${whereClause}
      ORDER BY c.${sortColumn} ${order}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM customer c ${whereClause}
    `, params);

    res.json({
      success: true,
      customers: result.rows.map(row => ({
        id: row.id,
        email: row.email,
        phone: row.phone || row.metadata?.phone || 'N/A',
        first_name: row.first_name || 'Unknown',
        last_name: row.last_name || '',
        has_account: row.has_account !== false,
        status: 'active',
        total_orders: Number(row.order_count),
        total_spent: Number(row.total_spent),
        created_at: row.created_at,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error listing customers:', error);
    res.status(500).json({ error: 'Failed to list customers' });
  }
}));

/**
 * GET /admin/customers/:id
 * Get detailed customer information
 */
router.get('/customers/:id', wrapHandler(async (req: any, res) => {
  const { id } = req.params;

  initServices(req.scope);

  try {
    // Customer basic info
    const customerResult = await db.query(`
      SELECT * FROM customer WHERE id = $1
    `, [id]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    // Wallet balance
    let walletBalance = 0;
    try {
      walletBalance = await blnkService.getCustomerBalance(id, 'customer_wallets');
    } catch (e) {
      console.log('Could not fetch wallet balance');
    }

    // Orders
    const ordersResult = await db.query(`
      SELECT id, status, total, currency_code, created_at
      FROM "order"
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [id]);

    // NFC Cards
    const cardsResult = await db.query(`
      SELECT * FROM bigcompany.nfc_cards WHERE user_id = $1
    `, [id]);

    // Loans
    const loansResult = await db.query(`
      SELECT * FROM bigcompany.customer_loans WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10
    `, [id]);

    // Gas meters
    const metersResult = await db.query(`
      SELECT * FROM bigcompany.utility_meters WHERE user_id = $1
    `, [id]);

    // Recent transactions
    const transactionsResult = await db.query(`
      SELECT * FROM bigcompany.wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20
    `, [id]);

    // Rewards balance
    const rewardsResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as balance
      FROM bigcompany.rewards_ledger WHERE user_id = $1
    `, [id]);

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        phone: customer.phone || customer.metadata?.phone,
        firstName: customer.first_name,
        lastName: customer.last_name,
        createdAt: customer.created_at,
        metadata: customer.metadata,
        walletBalance,
        rewardsBalance: Number(rewardsResult.rows[0].balance),
        orders: ordersResult.rows,
        nfcCards: cardsResult.rows,
        loans: loansResult.rows,
        meters: metersResult.rows,
        recentTransactions: transactionsResult.rows,
      },
    });
  } catch (error: any) {
    console.error('Error getting customer:', error);
    res.status(500).json({ error: 'Failed to get customer details' });
  }
}));

/**
 * PUT /admin/customers/:id/status
 * Update customer status
 */
router.put('/customers/:id/status', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = req.user?.id;

  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (active or inactive) is required' });
  }

  try {
    // Update customer metadata with status
    const result = await db.query(`
      UPDATE customer
      SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('status', $1), updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'update_customer_status', 'customer', $2, $3)
    `, [adminId, id, JSON.stringify({ status })]);

    res.json({
      success: true,
      message: `Customer status updated to ${status}`,
      customer: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating customer status:', error);
    res.status(500).json({ error: 'Failed to update customer status' });
  }
}));

/**
 * POST /admin/customers/:id/credit
 * Credit customer wallet (admin)
 */
router.post('/customers/:id/credit', wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const adminId = req.user?.id;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  if (!reason) {
    return res.status(400).json({ error: 'Reason is required' });
  }

  initServices(req.scope);

  try {
    const reference = `ADMIN-CREDIT-${Date.now()}`;

    await blnkService.creditCustomerWallet(id, amount, reference, reason);

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'admin_credit_wallet', 'customer', $2, $3)
    `, [adminId, id, JSON.stringify({ amount, reason, reference })]);

    // Notify customer
    const customer = await db.query(
      "SELECT phone, metadata FROM customer WHERE id = $1",
      [id]
    );
    const phone = customer.rows[0]?.phone || customer.rows[0]?.metadata?.phone;
    if (phone) {
      await smsService.send({
        to: phone,
        message: `BIG: Your wallet has been credited with ${amount.toLocaleString()} RWF. Reason: ${reason}`,
      });
    }

    res.json({
      success: true,
      message: `Credited ${amount} RWF to customer wallet`,
      reference,
    });
  } catch (error: any) {
    console.error('Error crediting customer:', error);
    res.status(500).json({ error: 'Failed to credit customer' });
  }
}));

// ==================== ACCOUNT CREATION ====================

/**
 * POST /admin/accounts/create-retailer
 * Create a new retailer account (SaaS admin only)
 */
router.post('/accounts/create-retailer', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { email, password, business_name, phone, address, credit_limit = 0 } = req.body;
  const adminId = req.user?.id;

  // Validate required fields
  if (!email || !password || !business_name || !phone) {
    return res.status(400).json({
      error: 'Email, password, business name, and phone are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  initServices(req.scope);

  try {
    // Check if email already exists
    const existingUser = await db.query(
      'SELECT id FROM "user" WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique user ID
    const userId = generateUserId();

    // Create user account
    const userResult = await db.query(`
      INSERT INTO "user" (id, email, password_hash, role, metadata)
      VALUES ($1, $2, $3, 'member', $4)
      RETURNING id
    `, [userId, email.toLowerCase(), hashedPassword, JSON.stringify({
      type: 'retailer',
      account_status: 'pending',
      created_by_admin: true,
      must_change_password: true
    })]);

    // Create retailer profile in merchant_profiles
    const retailerResult = await db.query(`
      INSERT INTO bigcompany.merchant_profiles
      (medusa_vendor_id, merchant_type, business_name, phone, address, credit_limit, approval_status)
      VALUES ($1, 'retailer', $2, $3, $4, $5, 'active')
      RETURNING id
    `, [userId, business_name, phone, address ? JSON.stringify({ full_address: address }) : '{}', credit_limit]);

    const retailerId = retailerResult.rows[0].id;

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'create_retailer_account', 'retailer', $2, $3)
    `, [adminId, retailerId, JSON.stringify({
      email,
      business_name,
      phone,
      credit_limit
    })]);

    // Send activation email (TODO: implement email service)
    // For now, send SMS with temporary credentials
    if (phone) {
      try {
        await smsService.send({
          to: phone,
          message: `BIG Company: Your retailer account has been created. Email: ${email}. Please check your email for activation instructions. Contact support if needed.`,
        });
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Retailer account created successfully',
      retailer: {
        id: retailerId,
        user_id: userId,
        email,
        business_name,
        phone,
        credit_limit,
        status: 'pending',
      },
    });
  } catch (error: any) {
    console.error('Error creating retailer account:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Account already exists' });
    }
    res.status(500).json({ error: 'Failed to create retailer account' });
  }
}));

/**
 * POST /admin/accounts/create-wholesaler
 * Create a new wholesaler account (SaaS admin only)
 */
router.post('/accounts/create-wholesaler', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { email, password, company_name, phone, address } = req.body;
  const adminId = req.user?.id;

  // Validate required fields
  if (!email || !password || !company_name || !phone) {
    return res.status(400).json({
      error: 'Email, password, company name, and phone are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  initServices(req.scope);

  try {
    // Check if email already exists
    const existingUser = await db.query(
      'SELECT id FROM "user" WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique user ID
    const userId = generateUserId();

    // Create user account
    const userResult = await db.query(`
      INSERT INTO "user" (id, email, password_hash, role, metadata)
      VALUES ($1, $2, $3, 'member', $4)
      RETURNING id
    `, [userId, email.toLowerCase(), hashedPassword, JSON.stringify({
      type: 'wholesaler',
      account_status: 'pending',
      created_by_admin: true,
      must_change_password: true
    })]);

    // Create wholesaler profile in merchant_profiles
    const wholesalerResult = await db.query(`
      INSERT INTO bigcompany.merchant_profiles
      (medusa_vendor_id, merchant_type, business_name, phone, address, approval_status)
      VALUES ($1, 'wholesaler', $2, $3, $4, 'active')
      RETURNING id
    `, [userId, company_name, phone, address ? JSON.stringify({ full_address: address }) : '{}']);

    const wholesalerId = wholesalerResult.rows[0].id;

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'create_wholesaler_account', 'wholesaler', $2, $3)
    `, [adminId, wholesalerId, JSON.stringify({
      email,
      company_name,
      phone
    })]);

    // Send activation email (TODO: implement email service)
    // For now, send SMS with temporary credentials
    if (phone) {
      try {
        await smsService.send({
          to: phone,
          message: `BIG Company: Your wholesaler account has been created. Email: ${email}. Please check your email for activation instructions. Contact support if needed.`,
        });
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Wholesaler account created successfully',
      wholesaler: {
        id: wholesalerId,
        user_id: userId,
        email,
        company_name,
        phone,
        status: 'pending',
      },
    });
  } catch (error: any) {
    console.error('Error creating wholesaler account:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Account already exists' });
    }
    res.status(500).json({ error: 'Failed to create wholesaler account' });
  }
}));

// ==================== RETAILER MANAGEMENT ====================

/**
 * GET /admin/retailers
 * List all retailers
 */
router.get('/retailers', wrapHandler(async (req: any, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (r.business_name ILIKE $${params.length} OR r.phone ILIKE $${params.length})`;
    }

    if (status === 'active') {
      whereClause += ` AND r.approval_status = 'active'`;
    } else if (status === 'inactive') {
      whereClause += ` AND r.approval_status = 'pending'`;
    }

    const result = await db.query(`
      SELECT
        r.*,
        u.email,
        (SELECT COUNT(*) FROM "order" o WHERE o.metadata->>'retailer_id' = r.id::text) as order_count,
        0 as total_sales
      FROM bigcompany.merchant_profiles r
      LEFT JOIN "user" u ON r.medusa_vendor_id = u.id
      ${whereClause} AND r.merchant_type = 'retailer'
      ORDER BY r.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bigcompany.merchant_profiles r
      ${whereClause} AND r.merchant_type = 'retailer'
    `, params);

    res.json({
      success: true,
      retailers: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error listing retailers:', error);
    res.status(500).json({ error: 'Failed to list retailers' });
  }
}));

/**
 * POST /admin/retailers/:id/verify
 * Verify a retailer
 */
router.post('/retailers/:id/verify', wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const adminId = req.user?.id;

  try {
    const result = await db.query(`
      UPDATE bigcompany.merchant_profiles
      SET approval_status = 'approved', approved_at = NOW(), approved_by = $1
      WHERE id = $2 AND merchant_type = 'retailer'
      RETURNING *
    `, [adminId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'verify_retailer', 'retailer', $2, $3)
    `, [adminId, id, JSON.stringify({ verified: true })]);

    res.json({
      success: true,
      message: 'Retailer verified successfully',
      retailer: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error verifying retailer:', error);
    res.status(500).json({ error: 'Failed to verify retailer' });
  }
}));

/**
 * POST /admin/retailers/:id/status
 * Update retailer status
 */
router.post('/retailers/:id/status', wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const { isActive, reason } = req.body;
  const adminId = req.user?.id;

  try {
    const newStatus = isActive ? 'active' : 'pending';
    const result = await db.query(`
      UPDATE bigcompany.merchant_profiles
      SET approval_status = $1, updated_at = NOW()
      WHERE id = $2 AND merchant_type = 'retailer'
      RETURNING *
    `, [newStatus, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, $2, 'retailer', $3, $4)
    `, [adminId, isActive ? 'activate_retailer' : 'deactivate_retailer', id, JSON.stringify({ isActive, reason })]);

    res.json({
      success: true,
      message: `Retailer ${isActive ? 'activated' : 'deactivated'} successfully`,
      retailer: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating retailer status:', error);
    res.status(500).json({ error: 'Failed to update retailer status' });
  }
}));

/**
 * POST /admin/retailers/:id/credit-limit
 * Set retailer credit limit
 */
router.post('/retailers/:id/credit-limit', wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const { creditLimit, reason } = req.body;
  const adminId = req.user?.id;

  if (creditLimit === undefined || creditLimit < 0) {
    return res.status(400).json({ error: 'Valid credit limit is required' });
  }

  try {
    const oldResult = await db.query(
      'SELECT credit_limit FROM bigcompany.merchant_profiles WHERE id = $1 AND merchant_type = \'retailer\'',
      [id]
    );

    const result = await db.query(`
      UPDATE bigcompany.merchant_profiles
      SET credit_limit = $1, updated_at = NOW()
      WHERE id = $2 AND merchant_type = 'retailer'
      RETURNING *
    `, [creditLimit, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES ($1, 'update_credit_limit', 'retailer', $2, $3, $4)
    `, [
      adminId,
      id,
      JSON.stringify({ creditLimit: oldResult.rows[0]?.credit_limit }),
      JSON.stringify({ creditLimit, reason }),
    ]);

    res.json({
      success: true,
      message: `Credit limit updated to ${creditLimit.toLocaleString()} RWF`,
      retailer: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating credit limit:', error);
    res.status(500).json({ error: 'Failed to update credit limit' });
  }
}));

// ==================== WHOLESALER MANAGEMENT ====================

/**
 * GET /admin/wholesalers
 * List all wholesalers
 */
router.get('/wholesalers', wrapHandler(async (req: any, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (w.business_name ILIKE $${params.length} OR w.phone ILIKE $${params.length})`;
    }

    if (status === 'active') {
      whereClause += ` AND w.approval_status = 'active'`;
    } else if (status === 'inactive') {
      whereClause += ` AND w.approval_status = 'pending'`;
    }

    const result = await db.query(`
      SELECT
        w.*,
        u.email,
        (SELECT COUNT(*) FROM bigcompany.retailer_orders ro WHERE ro.wholesaler_id = w.id) as order_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bigcompany.retailer_orders ro WHERE ro.wholesaler_id = w.id) as total_sales
      FROM bigcompany.merchant_profiles w
      LEFT JOIN "user" u ON w.medusa_vendor_id = u.id
      ${whereClause} AND w.merchant_type = 'wholesaler'
      ORDER BY w.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bigcompany.merchant_profiles w
      ${whereClause} AND w.merchant_type = 'wholesaler'
    `, params);

    res.json({
      success: true,
      wholesalers: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error listing wholesalers:', error);
    res.status(500).json({ error: 'Failed to list wholesalers' });
  }
}));

/**
 * POST /admin/wholesalers/:id/status
 * Update wholesaler status
 */
router.post('/wholesalers/:id/status', wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const { isActive, reason } = req.body;
  const adminId = req.user?.id;

  try {
    const newStatus = isActive ? 'active' : 'pending';
    const result = await db.query(`
      UPDATE bigcompany.merchant_profiles
      SET approval_status = $1, updated_at = NOW()
      WHERE id = $2 AND merchant_type = 'wholesaler'
      RETURNING *
    `, [newStatus, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wholesaler not found' });
    }

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, $2, 'wholesaler', $3, $4)
    `, [adminId, isActive ? 'activate_wholesaler' : 'deactivate_wholesaler', id, JSON.stringify({ isActive, reason })]);

    res.json({
      success: true,
      message: `Wholesaler ${isActive ? 'activated' : 'deactivated'} successfully`,
      wholesaler: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating wholesaler status:', error);
    res.status(500).json({ error: 'Failed to update wholesaler status' });
  }
}));

// ==================== LOAN MANAGEMENT ====================

/**
 * GET /admin/loans
 * List all loans with filters
 */
router.get('/loans', wrapHandler(async (req: any, res) => {
  const { page = 1, limit = 20, status, type } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      params.push(status);
      whereClause += ` AND l.status = $${params.length}`;
    }

    if (type) {
      params.push(type);
      whereClause += ` AND l.loan_type = $${params.length}`;
    }

    const result = await db.query(`
      SELECT
        l.*,
        c.email as customer_email,
        c.phone as customer_phone,
        c.first_name,
        c.last_name,
        lp.name as product_name
      FROM bigcompany.customer_loans l
      LEFT JOIN customer c ON l.customer_id = c.id
      LEFT JOIN bigcompany.loan_products lp ON l.product_id = lp.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bigcompany.customer_loans l ${whereClause}
    `, params);

    // Get summary stats
    const summaryResult = await db.query(`
      SELECT
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'disbursed' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
        COALESCE(SUM(CASE WHEN status IN ('disbursed', 'overdue') THEN amount END), 0) as outstanding
      FROM bigcompany.customer_loans
    `);

    res.json({
      success: true,
      loans: result.rows,
      summary: {
        pending: Number(summaryResult.rows[0].pending),
        active: Number(summaryResult.rows[0].active),
        overdue: Number(summaryResult.rows[0].overdue),
        outstanding: Number(summaryResult.rows[0].outstanding),
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error listing loans:', error);
    res.status(500).json({ error: 'Failed to list loans' });
  }
}));

/**
 * POST /admin/loans/:id/approve
 * Approve a pending loan
 */
router.post('/loans/:id/approve', wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const adminId = req.user?.id;

  initServices(req.scope);

  try {
    const loanResult = await db.query(
      'SELECT * FROM bigcompany.customer_loans WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pending loan not found' });
    }

    const loan = loanResult.rows[0];

    // Disburse via Blnk
    await blnkService.createLoanCredit(loan.customer_id, loan.amount, loan.loan_number);

    // Update loan status
    await db.query(`
      UPDATE bigcompany.customer_loans
      SET status = 'disbursed', approved_by = $1, approved_at = NOW(), disbursed_at = NOW()
      WHERE id = $2
    `, [adminId, id]);

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'approve_loan', 'loan', $2, $3)
    `, [adminId, id, JSON.stringify({ amount: loan.amount, loanNumber: loan.loan_number })]);

    // Notify customer
    const customer = await db.query(
      "SELECT phone, metadata FROM customer WHERE id = $1",
      [loan.customer_id]
    );
    const phone = customer.rows[0]?.phone || customer.rows[0]?.metadata?.phone;
    if (phone) {
      await smsService.send({
        to: phone,
        message: `BIG: Your loan of ${loan.amount.toLocaleString()} RWF has been approved and credited! Ref: ${loan.loan_number}`,
      });
    }

    res.json({
      success: true,
      message: 'Loan approved and disbursed successfully',
      loanNumber: loan.loan_number,
    });
  } catch (error: any) {
    console.error('Error approving loan:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
}));

/**
 * POST /admin/loans/:id/reject
 * Reject a pending loan
 */
router.post('/loans/:id/reject', wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user?.id;

  if (!reason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  initServices(req.scope);

  try {
    const result = await db.query(`
      UPDATE bigcompany.customer_loans
      SET status = 'rejected', rejection_reason = $1, rejected_by = $2, rejected_at = NOW()
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `, [reason, adminId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending loan not found' });
    }

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'reject_loan', 'loan', $2, $3)
    `, [adminId, id, JSON.stringify({ reason })]);

    // Notify customer
    const customer = await db.query(
      "SELECT phone, metadata FROM customer WHERE id = $1",
      [result.rows[0].customer_id]
    );
    const phone = customer.rows[0]?.phone || customer.rows[0]?.metadata?.phone;
    if (phone) {
      await smsService.send({
        to: phone,
        message: `BIG: Your loan application has been declined. Reason: ${reason}. Please contact support for more info.`,
      });
    }

    res.json({
      success: true,
      message: 'Loan rejected',
      loanNumber: result.rows[0].loan_number,
    });
  } catch (error: any) {
    console.error('Error rejecting loan:', error);
    res.status(500).json({ error: 'Failed to reject loan' });
  }
}));

// ==================== NFC CARD MANAGEMENT ====================

/**
 * GET /admin/nfc-cards
 * List all NFC cards
 */
router.get('/nfc-cards', wrapHandler(async (req: any, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (n.card_uid ILIKE $${params.length} OR n.dashboard_id ILIKE $${params.length})`;
    }

    if (status === 'active') {
      whereClause += ' AND n.is_active = true';
    } else if (status === 'inactive') {
      whereClause += ' AND n.is_active = false';
    } else if (status === 'linked') {
      whereClause += ' AND n.user_id IS NOT NULL';
    } else if (status === 'unlinked') {
      whereClause += ' AND n.user_id IS NULL';
    }

    const result = await db.query(`
      SELECT
        n.*,
        c.email as user_email,
        c.phone as user_phone,
        c.first_name,
        c.last_name
      FROM bigcompany.nfc_cards n
      LEFT JOIN customer c ON n.user_id = c.id
      ${whereClause}
      ORDER BY n.linked_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bigcompany.nfc_cards n ${whereClause}
    `, params);

    res.json({
      success: true,
      cards: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error listing NFC cards:', error);
    res.status(500).json({ error: 'Failed to list NFC cards' });
  }
}));

/**
 * POST /admin/nfc-cards/register
 * Register new NFC card
 */
router.post('/nfc-cards/register', wrapHandler(async (req: any, res) => {
  const { cardUid, dashboardId } = req.body;
  const adminId = req.user?.id;

  if (!cardUid) {
    return res.status(400).json({ error: 'Card UID is required' });
  }

  try {
    const generatedDashboardId = dashboardId || `BIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const result = await db.query(`
      INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, is_active)
      VALUES ($1, $2, false)
      ON CONFLICT (card_uid) DO NOTHING
      RETURNING *
    `, [cardUid.toUpperCase(), generatedDashboardId]);

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Card already registered' });
    }

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'register_nfc_card', 'nfc_card', $2, $3)
    `, [adminId, cardUid, JSON.stringify({ dashboardId: generatedDashboardId })]);

    res.json({
      success: true,
      card: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error registering NFC card:', error);
    res.status(500).json({ error: 'Failed to register card' });
  }
}));

/**
 * POST /admin/nfc-cards/:uid/block
 * Block/unblock NFC card
 */
router.post('/nfc-cards/:uid/block', wrapHandler(async (req: any, res) => {
  const { uid } = req.params;
  const { blocked, reason } = req.body;
  const adminId = req.user?.id;

  try {
    const result = await db.query(`
      UPDATE bigcompany.nfc_cards
      SET is_active = $1, updated_at = NOW()
      WHERE card_uid = $2
      RETURNING *
    `, [!blocked, uid.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, $2, 'nfc_card', $3, $4)
    `, [adminId, blocked ? 'block_nfc_card' : 'unblock_nfc_card', uid, JSON.stringify({ reason })]);

    res.json({
      success: true,
      message: `Card ${blocked ? 'blocked' : 'unblocked'} successfully`,
      card: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error blocking NFC card:', error);
    res.status(500).json({ error: 'Failed to update card status' });
  }
}));

// ==================== REPORTS ====================

/**
 * GET /admin/reports
 * Get summary reports
 */
router.get('/reports', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { range = '7days' } = req.query;

  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    if (range === '7days') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === '30days') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (range === '90days') {
      startDate.setDate(startDate.getDate() - 90);
    }

    res.json({
      success: true,
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalOrders: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        totalTransactions: 0,
      },
    });
  } catch (error: any) {
    console.error('Error generating summary report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}));

/**
 * GET /admin/reports/transactions
 * Get transaction report
 */
router.get('/reports/transactions', wrapHandler(async (req: any, res) => {
  const { startDate, endDate, type, groupBy = 'day' } = req.query;

  try {
    let dateFilter = '';
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      dateFilter += ` AND created_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateFilter += ` AND created_at <= $${params.length}`;
    }

    let typeFilter = '';
    if (type) {
      params.push(type);
      typeFilter = ` AND type = $${params.length}`;
    }

    const dateGroup = groupBy === 'month' ? "DATE_TRUNC('month', created_at)" : "DATE(created_at)";

    const result = await db.query(`
      SELECT
        ${dateGroup} as period,
        type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM bigcompany.wallet_transactions
      WHERE 1=1 ${dateFilter} ${typeFilter}
      GROUP BY ${dateGroup}, type
      ORDER BY period DESC, type
    `, params);

    res.json({
      success: true,
      report: result.rows,
      groupBy,
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}));

/**
 * GET /admin/reports/revenue
 * Get revenue report
 */
router.get('/reports/revenue', wrapHandler(async (req: any, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  try {
    let dateFilter = '';
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      dateFilter += ` AND created_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateFilter += ` AND created_at <= $${params.length}`;
    }

    const dateGroup = groupBy === 'month' ? "DATE_TRUNC('month', o.created_at)" : "DATE(o.created_at)";

    const ordersResult = await db.query(`
      SELECT
        ${dateGroup} as period,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(li.unit_price * li.quantity), 0) as order_revenue
      FROM "order" o
      LEFT JOIN line_item li ON o.id = li.order_id
      WHERE o.status NOT IN ('canceled', 'archived') ${dateFilter.replace(/created_at/g, 'o.created_at')}
      GROUP BY ${dateGroup}
      ORDER BY period DESC
    `, params);

    const gasDateGroup = groupBy === 'month' ? "DATE_TRUNC('month', created_at)" : "DATE(created_at)";
    const gasResult = await db.query(`
      SELECT
        ${gasDateGroup} as period,
        COUNT(*) as gas_count,
        COALESCE(SUM(amount), 0) as gas_revenue
      FROM bigcompany.utility_topups
      WHERE status = 'success' ${dateFilter}
      GROUP BY ${gasDateGroup}
      ORDER BY period DESC
    `, params);

    res.json({
      success: true,
      orders: ordersResult.rows,
      gas: gasResult.rows,
      groupBy,
    });
  } catch (error: any) {
    console.error('Error generating revenue report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}));

// ==================== AUDIT LOGS ====================

/**
 * GET /admin/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', wrapHandler(async (req: any, res) => {
  const { page = 1, limit = 50, action, entityType, userId } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (action) {
      params.push(action);
      whereClause += ` AND action = $${params.length}`;
    }
    if (entityType) {
      params.push(entityType);
      whereClause += ` AND entity_type = $${params.length}`;
    }
    if (userId) {
      params.push(userId);
      whereClause += ` AND user_id = $${params.length}`;
    }

    const result = await db.query(`
      SELECT * FROM bigcompany.audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bigcompany.audit_logs ${whereClause}
    `, params);

    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
}));

// ==================== SETTINGS ====================

/**
 * GET /admin/settings
 * Get platform settings
 */
router.get('/settings', wrapHandler(async (req: any, res) => {
  try {
    const result = await db.query('SELECT * FROM bigcompany.platform_settings');

    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    res.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
}));

/**
 * POST /admin/settings
 * Update platform settings
 */
router.post('/settings', wrapHandler(async (req: any, res) => {
  const { settings } = req.body;
  const adminId = req.user?.id;

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object is required' });
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      await db.query(`
        INSERT INTO bigcompany.platform_settings (key, value, updated_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
      `, [key, JSON.stringify(value), adminId]);
    }

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'update_settings', 'settings', 'platform', $2)
    `, [adminId, JSON.stringify(settings)]);

    res.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}));

// ==================== CATEGORY MANAGEMENT ====================

/**
 * GET /admin/categories
 * List all product categories
 */
router.get('/categories', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { page = 1, limit = 50, search, active } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    if (active === 'true') {
      whereClause += ' AND is_active = true';
    } else if (active === 'false') {
      whereClause += ' AND is_active = false';
    }

    const result = await db.query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM product_category_product pcp WHERE pcp.product_category_id = c.id) as product_count
      FROM product_category c
      ${whereClause}
      ORDER BY c.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM product_category c ${whereClause}
    `, params);

    res.json({
      success: true,
      categories: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error listing categories:', error);
    res.status(500).json({ error: 'Failed to list categories' });
  }
}));

/**
 * POST /admin/categories
 * Create a new category
 */
router.post('/categories', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { name, description } = req.body;
  const adminId = req.user?.id;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  if (name.length > 100) {
    return res.status(400).json({ error: 'Category name must be less than 100 characters' });
  }

  try {
    // Check if category with this name already exists
    const existingCategory = await db.query(
      'SELECT id FROM product_category WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }

    // Generate unique handle from name
    const handle = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Ensure handle is unique
    let finalHandle = handle;
    let counter = 1;
    while (true) {
      const handleCheck = await db.query(
        'SELECT id FROM product_category WHERE handle = $1',
        [finalHandle]
      );
      if (handleCheck.rows.length === 0) break;
      finalHandle = `${handle}-${counter}`;
      counter++;
    }

    // Generate UUID for id
    const id = `pcat_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`;

    // Insert category
    const result = await db.query(`
      INSERT INTO product_category (id, name, handle, description, is_active, rank, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, 0, NOW(), NOW())
      RETURNING *
    `, [id, name.trim(), finalHandle, description || '']);

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'create_category', 'category', $2, $3)
    `, [adminId, result.rows[0].id, JSON.stringify({ name, handle: finalHandle, description })]);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category with this code already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
}));

/**
 * PUT /admin/categories/:id
 * Update a category
 */
router.put('/categories/:id', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const { name, description, is_active } = req.body;
  const adminId = req.user?.id;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  if (name.length > 100) {
    return res.status(400).json({ error: 'Category name must be less than 100 characters' });
  }

  try {
    // Check if category exists
    const existingCategory = await db.query(
      'SELECT * FROM product_category WHERE id = $1',
      [id]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if another category with this name exists
    const duplicateCategory = await db.query(
      'SELECT id FROM product_category WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), id]
    );

    if (duplicateCategory.rows.length > 0) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }

    // Generate new handle if name changed
    const handle = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Update category
    const result = await db.query(`
      UPDATE product_category
      SET name = $1, handle = $2, description = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name.trim(), handle, description || '', is_active !== undefined ? is_active : true, id]);

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES ($1, 'update_category', 'category', $2, $3, $4)
    `, [adminId, id, JSON.stringify(existingCategory.rows[0]), JSON.stringify(result.rows[0])]);

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
}));

/**
 * DELETE /admin/categories/:id
 * Delete a category (only if no products are assigned)
 */
router.delete('/categories/:id', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const adminId = req.user?.id;

  try {
    // Check if category exists
    const categoryResult = await db.query(
      'SELECT * FROM product_category WHERE id = $1',
      [id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = categoryResult.rows[0];

    // Check if category has products
    const hasProductsResult = await db.query(
      'SELECT bigcompany.category_has_products($1) as has_products',
      [id]
    );

    if (hasProductsResult.rows[0].has_products) {
      const productCountResult = await db.query(
        'SELECT bigcompany.get_category_product_count($1) as count',
        [id]
      );
      const productCount = productCountResult.rows[0].count;

      return res.status(409).json({
        error: 'Cannot delete category with assigned products',
        message: `This category has ${productCount} product(s) assigned. Please reassign or delete those products first.`,
        productCount,
      });
    }

    // Delete category
    await db.query(
      'DELETE FROM product_category WHERE id = $1',
      [id]
    );

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, old_values)
      VALUES ($1, 'delete_category', 'category', $2, $3)
    `, [adminId, id, JSON.stringify(category)]);

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
}));

/**
 * POST /admin/categories/:id/toggle
 * Toggle category active status (soft delete)
 */
router.post('/categories/:id/toggle', authenticateJWT, requireAdmin, wrapHandler(async (req: any, res) => {
  const { id } = req.params;
  const adminId = req.user?.id;

  try {
    const result = await db.query(`
      UPDATE product_category
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = result.rows[0];

    // Log audit
    await db.query(`
      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, $2, 'category', $3, $4)
    `, [adminId, category.is_active ? 'activate_category' : 'deactivate_category', id, JSON.stringify({ is_active: category.is_active })]);

    res.json({
      success: true,
      message: `Category ${category.is_active ? 'activated' : 'deactivated'} successfully`,
      category,
    });
  } catch (error: any) {
    console.error('Error toggling category:', error);
    res.status(500).json({ error: 'Failed to toggle category status' });
  }
}));

export default router;
