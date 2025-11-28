import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import { Pool } from 'pg';
import BlnkService from '../../../services/blnk';
import SMSService from '../../../services/sms';
import MTNMoMoService from '../../../services/momo';
import AirtelMoneyService from '../../../services/airtel';

const router = Router();

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

// Admin authentication middleware
async function requireAdmin(req: any, res: any, next: any) {
  const adminId = req.user?.id;
  if (!adminId) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  // Verify user is admin
  const result = await db.query(`
    SELECT role FROM bigcompany.admin_users WHERE user_id = $1
  `, [adminId]);

  if (result.rows.length === 0) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  req.adminRole = result.rows[0].role;
  next();
}

// ==================== DASHBOARD STATS ====================

/**
 * GET /admin/dashboard
 * Get comprehensive dashboard statistics
 */
router.get('/dashboard', wrapHandler(async (req: any, res) => {
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
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'refunded') THEN total END), 0) as total_revenue,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_orders
      FROM "order"
    `);

    // Transaction stats
    const transactionStats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN type = 'wallet_topup' THEN 1 END) as wallet_topups,
        COUNT(CASE WHEN type = 'gas_purchase' THEN 1 END) as gas_purchases,
        COUNT(CASE WHEN type = 'nfc_payment' THEN 1 END) as nfc_payments,
        COUNT(CASE WHEN type = 'loan_disbursement' THEN 1 END) as loan_disbursements,
        COALESCE(SUM(amount), 0) as total_volume
      FROM bigcompany.wallet_transactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Loan stats
    const loanStats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'disbursed' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
        COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted,
        COALESCE(SUM(CASE WHEN status = 'disbursed' THEN amount END), 0) as outstanding_amount
      FROM bigcompany.customer_loans
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
        COUNT(CASE WHEN is_active THEN 1 END) as active,
        COUNT(CASE WHEN is_verified THEN 1 END) as verified
      FROM bigcompany.retailer_profiles
    `);

    // Wholesaler stats
    const wholesalerStats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_active THEN 1 END) as active
      FROM bigcompany.wholesaler_profiles
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
router.get('/customers', wrapHandler(async (req: any, res) => {
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
        (SELECT COALESCE(SUM(total), 0) FROM "order" o WHERE o.customer_id = c.id AND o.status NOT IN ('cancelled', 'refunded')) as total_spent
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
        phone: row.phone || row.metadata?.phone,
        firstName: row.first_name,
        lastName: row.last_name,
        createdAt: row.created_at,
        orderCount: Number(row.order_count),
        totalSpent: Number(row.total_spent),
        metadata: row.metadata,
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
      whereClause += ` AND (r.business_name ILIKE $${params.length} OR r.contact_phone ILIKE $${params.length})`;
    }

    if (status === 'active') {
      whereClause += ' AND r.is_active = true';
    } else if (status === 'inactive') {
      whereClause += ' AND r.is_active = false';
    }

    const result = await db.query(`
      SELECT
        r.*,
        u.email,
        (SELECT COUNT(*) FROM "order" o WHERE o.metadata->>'retailer_id' = r.id::text) as order_count,
        (SELECT COALESCE(SUM(total), 0) FROM "order" o WHERE o.metadata->>'retailer_id' = r.id::text) as total_sales
      FROM bigcompany.retailer_profiles r
      LEFT JOIN "user" u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bigcompany.retailer_profiles r ${whereClause}
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
      UPDATE bigcompany.retailer_profiles
      SET is_verified = true, verified_at = NOW(), verified_by = $1
      WHERE id = $2
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
    const result = await db.query(`
      UPDATE bigcompany.retailer_profiles
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [isActive, id]);

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
      'SELECT credit_limit FROM bigcompany.retailer_profiles WHERE id = $1',
      [id]
    );

    const result = await db.query(`
      UPDATE bigcompany.retailer_profiles
      SET credit_limit = $1, updated_at = NOW()
      WHERE id = $2
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
      whereClause += ` AND (w.business_name ILIKE $${params.length} OR w.contact_phone ILIKE $${params.length})`;
    }

    if (status === 'active') {
      whereClause += ' AND w.is_active = true';
    } else if (status === 'inactive') {
      whereClause += ' AND w.is_active = false';
    }

    const result = await db.query(`
      SELECT
        w.*,
        u.email,
        (SELECT COUNT(*) FROM bigcompany.retailer_orders ro WHERE ro.wholesaler_id = w.id) as order_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bigcompany.retailer_orders ro WHERE ro.wholesaler_id = w.id) as total_sales
      FROM bigcompany.wholesaler_profiles w
      LEFT JOIN "user" u ON w.user_id = u.id
      ${whereClause}
      ORDER BY w.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM bigcompany.wholesaler_profiles w ${whereClause}
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
    const result = await db.query(`
      UPDATE bigcompany.wholesaler_profiles
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [isActive, id]);

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
      ORDER BY n.created_at DESC
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

    const dateGroup = groupBy === 'month' ? "DATE_TRUNC('month', created_at)" : "DATE(created_at)";

    const ordersResult = await db.query(`
      SELECT
        ${dateGroup} as period,
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as order_revenue
      FROM "order"
      WHERE status NOT IN ('cancelled', 'refunded') ${dateFilter}
      GROUP BY ${dateGroup}
      ORDER BY period DESC
    `, params);

    const gasResult = await db.query(`
      SELECT
        ${dateGroup} as period,
        COUNT(*) as gas_count,
        COALESCE(SUM(amount), 0) as gas_revenue
      FROM bigcompany.utility_topups
      WHERE status = 'success' ${dateFilter}
      GROUP BY ${dateGroup}
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

export default router;
