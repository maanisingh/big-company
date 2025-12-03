"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _medusa = require("@medusajs/medusa");
var _pg = require("pg");
var _blnk = _interopRequireDefault(require("../../../services/blnk"));
var _sms = _interopRequireDefault(require("../../../services/sms"));
var _momo = _interopRequireDefault(require("../../../services/momo"));
var _airtel = _interopRequireDefault(require("../../../services/airtel"));
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
var router = (0, _express.Router)();

// Database connection
var db = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Initialize services
var blnkService;
var smsService;
var momoService;
var airtelService;
function initServices(container) {
  if (!blnkService) blnkService = new _blnk["default"](container);
  if (!smsService) smsService = new _sms["default"]();
  if (!momoService) momoService = new _momo["default"]();
  if (!airtelService) airtelService = new _airtel["default"]();
}

// Admin authentication middleware
function requireAdmin(_x, _x2, _x3) {
  return _requireAdmin.apply(this, arguments);
} // ==================== DASHBOARD STATS ====================
/**
 * GET /admin/dashboard
 * Get comprehensive dashboard statistics
 */
function _requireAdmin() {
  _requireAdmin = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee22(req, res, next) {
    var _req$user11;
    var adminId, result;
    return _regenerator["default"].wrap(function (_context22) {
      while (1) switch (_context22.prev = _context22.next) {
        case 0:
          adminId = (_req$user11 = req.user) === null || _req$user11 === void 0 ? void 0 : _req$user11.id;
          if (adminId) {
            _context22.next = 1;
            break;
          }
          return _context22.abrupt("return", res.status(401).json({
            error: 'Admin authentication required'
          }));
        case 1:
          _context22.next = 2;
          return db.query("\n    SELECT role FROM bigcompany.admin_users WHERE user_id = $1\n  ", [adminId]);
        case 2:
          result = _context22.sent;
          if (!(result.rows.length === 0)) {
            _context22.next = 3;
            break;
          }
          return _context22.abrupt("return", res.status(403).json({
            error: 'Admin access required'
          }));
        case 3:
          req.adminRole = result.rows[0].role;
          next();
        case 4:
        case "end":
          return _context22.stop();
      }
    }, _callee22);
  }));
  return _requireAdmin.apply(this, arguments);
}
router.get('/dashboard', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var customerStats, orderStats, transactionStats, loanStats, gasStats, nfcStats, retailerStats, wholesalerStats, recentActivity, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          initServices(req.scope);
          _context.prev = 1;
          _context.next = 2;
          return db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,\n        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,\n        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d\n      FROM customer\n    ");
        case 2:
          customerStats = _context.sent;
          _context.next = 3;
          return db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,\n        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,\n        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,\n        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,\n        COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'refunded') THEN total END), 0) as total_revenue,\n        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_orders\n      FROM \"order\"\n    ");
        case 3:
          orderStats = _context.sent;
          _context.next = 4;
          return db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN type = 'wallet_topup' THEN 1 END) as wallet_topups,\n        COUNT(CASE WHEN type = 'gas_purchase' THEN 1 END) as gas_purchases,\n        COUNT(CASE WHEN type = 'nfc_payment' THEN 1 END) as nfc_payments,\n        COUNT(CASE WHEN type = 'loan_disbursement' THEN 1 END) as loan_disbursements,\n        COALESCE(SUM(amount), 0) as total_volume\n      FROM bigcompany.wallet_transactions\n      WHERE created_at >= NOW() - INTERVAL '30 days'\n    ");
        case 4:
          transactionStats = _context.sent;
          _context.next = 5;
          return db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,\n        COUNT(CASE WHEN status = 'disbursed' THEN 1 END) as active,\n        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,\n        COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted,\n        COALESCE(SUM(CASE WHEN status = 'disbursed' THEN amount END), 0) as outstanding_amount\n      FROM bigcompany.customer_loans\n    ");
        case 5:
          loanStats = _context.sent;
          _context.next = 6;
          return db.query("\n      SELECT\n        COUNT(*) as total_purchases,\n        COALESCE(SUM(amount), 0) as total_amount,\n        COALESCE(SUM(units_purchased), 0) as total_units\n      FROM bigcompany.utility_topups\n      WHERE status = 'success' AND created_at >= NOW() - INTERVAL '30 days'\n    ");
        case 6:
          gasStats = _context.sent;
          _context.next = 7;
          return db.query("\n      SELECT\n        COUNT(*) as total_cards,\n        COUNT(CASE WHEN is_active THEN 1 END) as active_cards,\n        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as linked_cards\n      FROM bigcompany.nfc_cards\n    ");
        case 7:
          nfcStats = _context.sent;
          _context.next = 8;
          return db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN is_active THEN 1 END) as active,\n        COUNT(CASE WHEN is_verified THEN 1 END) as verified\n      FROM bigcompany.retailer_profiles\n    ");
        case 8:
          retailerStats = _context.sent;
          _context.next = 9;
          return db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN is_active THEN 1 END) as active\n      FROM bigcompany.wholesaler_profiles\n    ");
        case 9:
          wholesalerStats = _context.sent;
          _context.next = 10;
          return db.query("\n      SELECT\n        id, user_id, action, entity_type, entity_id, created_at\n      FROM bigcompany.audit_logs\n      ORDER BY created_at DESC\n      LIMIT 20\n    ");
        case 10:
          recentActivity = _context.sent;
          res.json({
            success: true,
            dashboard: {
              customers: {
                total: Number(customerStats.rows[0].total),
                last24h: Number(customerStats.rows[0].last_24h),
                last7d: Number(customerStats.rows[0].last_7d),
                last30d: Number(customerStats.rows[0].last_30d)
              },
              orders: {
                total: Number(orderStats.rows[0].total),
                pending: Number(orderStats.rows[0].pending),
                processing: Number(orderStats.rows[0].processing),
                delivered: Number(orderStats.rows[0].delivered),
                cancelled: Number(orderStats.rows[0].cancelled),
                totalRevenue: Number(orderStats.rows[0].total_revenue),
                todayOrders: Number(orderStats.rows[0].today_orders)
              },
              transactions: {
                total: Number(transactionStats.rows[0].total),
                walletTopups: Number(transactionStats.rows[0].wallet_topups),
                gasPurchases: Number(transactionStats.rows[0].gas_purchases),
                nfcPayments: Number(transactionStats.rows[0].nfc_payments),
                loanDisbursements: Number(transactionStats.rows[0].loan_disbursements),
                totalVolume: Number(transactionStats.rows[0].total_volume)
              },
              loans: {
                total: Number(loanStats.rows[0].total),
                pending: Number(loanStats.rows[0].pending),
                active: Number(loanStats.rows[0].active),
                paid: Number(loanStats.rows[0].paid),
                defaulted: Number(loanStats.rows[0].defaulted),
                outstandingAmount: Number(loanStats.rows[0].outstanding_amount)
              },
              gas: {
                totalPurchases: Number(gasStats.rows[0].total_purchases),
                totalAmount: Number(gasStats.rows[0].total_amount),
                totalUnits: Number(gasStats.rows[0].total_units)
              },
              nfcCards: {
                total: Number(nfcStats.rows[0].total_cards),
                active: Number(nfcStats.rows[0].active_cards),
                linked: Number(nfcStats.rows[0].linked_cards)
              },
              retailers: {
                total: Number(retailerStats.rows[0].total),
                active: Number(retailerStats.rows[0].active),
                verified: Number(retailerStats.rows[0].verified)
              },
              wholesalers: {
                total: Number(wholesalerStats.rows[0].total),
                active: Number(wholesalerStats.rows[0].active)
              },
              recentActivity: recentActivity.rows
            }
          });
          _context.next = 12;
          break;
        case 11:
          _context.prev = 11;
          _t = _context["catch"](1);
          console.error('Error getting dashboard:', _t);
          res.status(500).json({
            error: 'Failed to get dashboard stats'
          });
        case 12:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[1, 11]]);
  }));
  return function (_x4, _x5) {
    return _ref.apply(this, arguments);
  };
}()));

// ==================== CUSTOMER MANAGEMENT ====================

/**
 * GET /admin/customers
 * List all customers with pagination and filters
 */
router.get('/customers', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _req$query, _req$query$page, page, _req$query$limit, limit, search, status, _req$query$sortBy, sortBy, _req$query$sortOrder, sortOrder, offset, whereClause, params, validSortColumns, sortColumn, order, result, countResult, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _req$query = req.query, _req$query$page = _req$query.page, page = _req$query$page === void 0 ? 1 : _req$query$page, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 20 : _req$query$limit, search = _req$query.search, status = _req$query.status, _req$query$sortBy = _req$query.sortBy, sortBy = _req$query$sortBy === void 0 ? 'created_at' : _req$query$sortBy, _req$query$sortOrder = _req$query.sortOrder, sortOrder = _req$query$sortOrder === void 0 ? 'desc' : _req$query$sortOrder;
          offset = (Number(page) - 1) * Number(limit);
          _context2.prev = 1;
          whereClause = 'WHERE 1=1';
          params = [];
          if (search) {
            params.push("%".concat(search, "%"));
            whereClause += " AND (c.email ILIKE $".concat(params.length, " OR c.phone ILIKE $").concat(params.length, " OR c.first_name ILIKE $").concat(params.length, " OR c.last_name ILIKE $").concat(params.length, ")");
          }
          validSortColumns = ['created_at', 'email', 'first_name', 'last_name'];
          sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
          order = sortOrder === 'asc' ? 'ASC' : 'DESC';
          _context2.next = 2;
          return db.query("\n      SELECT\n        c.*,\n        (SELECT COUNT(*) FROM \"order\" o WHERE o.customer_id = c.id) as order_count,\n        (SELECT COALESCE(SUM(total), 0) FROM \"order\" o WHERE o.customer_id = c.id AND o.status NOT IN ('cancelled', 'refunded')) as total_spent\n      FROM customer c\n      ".concat(whereClause, "\n      ORDER BY c.").concat(sortColumn, " ").concat(order, "\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), [].concat(params, [Number(limit), offset]));
        case 2:
          result = _context2.sent;
          _context2.next = 3;
          return db.query("\n      SELECT COUNT(*) as total FROM customer c ".concat(whereClause, "\n    "), params);
        case 3:
          countResult = _context2.sent;
          res.json({
            success: true,
            customers: result.rows.map(function (row) {
              var _row$metadata;
              return {
                id: row.id,
                email: row.email,
                phone: row.phone || ((_row$metadata = row.metadata) === null || _row$metadata === void 0 ? void 0 : _row$metadata.phone),
                firstName: row.first_name,
                lastName: row.last_name,
                createdAt: row.created_at,
                orderCount: Number(row.order_count),
                totalSpent: Number(row.total_spent),
                metadata: row.metadata
              };
            }),
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: Number(countResult.rows[0].total),
              totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
            }
          });
          _context2.next = 5;
          break;
        case 4:
          _context2.prev = 4;
          _t2 = _context2["catch"](1);
          console.error('Error listing customers:', _t2);
          res.status(500).json({
            error: 'Failed to list customers'
          });
        case 5:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[1, 4]]);
  }));
  return function (_x6, _x7) {
    return _ref2.apply(this, arguments);
  };
}()));

/**
 * GET /admin/customers/:id
 * Get detailed customer information
 */
router.get('/customers/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var id, _customer$metadata, customerResult, customer, walletBalance, ordersResult, cardsResult, loansResult, metersResult, transactionsResult, rewardsResult, _t3, _t4;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          id = req.params.id;
          initServices(req.scope);
          _context3.prev = 1;
          _context3.next = 2;
          return db.query("\n      SELECT * FROM customer WHERE id = $1\n    ", [id]);
        case 2:
          customerResult = _context3.sent;
          if (!(customerResult.rows.length === 0)) {
            _context3.next = 3;
            break;
          }
          return _context3.abrupt("return", res.status(404).json({
            error: 'Customer not found'
          }));
        case 3:
          customer = customerResult.rows[0]; // Wallet balance
          walletBalance = 0;
          _context3.prev = 4;
          _context3.next = 5;
          return blnkService.getCustomerBalance(id, 'customer_wallets');
        case 5:
          walletBalance = _context3.sent;
          _context3.next = 7;
          break;
        case 6:
          _context3.prev = 6;
          _t3 = _context3["catch"](4);
          console.log('Could not fetch wallet balance');
        case 7:
          _context3.next = 8;
          return db.query("\n      SELECT id, status, total, currency_code, created_at\n      FROM \"order\"\n      WHERE customer_id = $1\n      ORDER BY created_at DESC\n      LIMIT 10\n    ", [id]);
        case 8:
          ordersResult = _context3.sent;
          _context3.next = 9;
          return db.query("\n      SELECT * FROM bigcompany.nfc_cards WHERE user_id = $1\n    ", [id]);
        case 9:
          cardsResult = _context3.sent;
          _context3.next = 10;
          return db.query("\n      SELECT * FROM bigcompany.customer_loans WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10\n    ", [id]);
        case 10:
          loansResult = _context3.sent;
          _context3.next = 11;
          return db.query("\n      SELECT * FROM bigcompany.utility_meters WHERE user_id = $1\n    ", [id]);
        case 11:
          metersResult = _context3.sent;
          _context3.next = 12;
          return db.query("\n      SELECT * FROM bigcompany.wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20\n    ", [id]);
        case 12:
          transactionsResult = _context3.sent;
          _context3.next = 13;
          return db.query("\n      SELECT\n        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) -\n        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as balance\n      FROM bigcompany.rewards_ledger WHERE user_id = $1\n    ", [id]);
        case 13:
          rewardsResult = _context3.sent;
          res.json({
            success: true,
            customer: {
              id: customer.id,
              email: customer.email,
              phone: customer.phone || ((_customer$metadata = customer.metadata) === null || _customer$metadata === void 0 ? void 0 : _customer$metadata.phone),
              firstName: customer.first_name,
              lastName: customer.last_name,
              createdAt: customer.created_at,
              metadata: customer.metadata,
              walletBalance: walletBalance,
              rewardsBalance: Number(rewardsResult.rows[0].balance),
              orders: ordersResult.rows,
              nfcCards: cardsResult.rows,
              loans: loansResult.rows,
              meters: metersResult.rows,
              recentTransactions: transactionsResult.rows
            }
          });
          _context3.next = 15;
          break;
        case 14:
          _context3.prev = 14;
          _t4 = _context3["catch"](1);
          console.error('Error getting customer:', _t4);
          res.status(500).json({
            error: 'Failed to get customer details'
          });
        case 15:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[1, 14], [4, 6]]);
  }));
  return function (_x8, _x9) {
    return _ref3.apply(this, arguments);
  };
}()));

/**
 * POST /admin/customers/:id/credit
 * Credit customer wallet (admin)
 */
router.post('/customers/:id/credit', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$user;
    var id, _req$body, amount, reason, adminId, _customer$rows$, _customer$rows$2, _customer$rows$2$meta, reference, customer, phone, _t5;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          id = req.params.id;
          _req$body = req.body, amount = _req$body.amount, reason = _req$body.reason;
          adminId = (_req$user = req.user) === null || _req$user === void 0 ? void 0 : _req$user.id;
          if (!(!amount || amount <= 0)) {
            _context4.next = 1;
            break;
          }
          return _context4.abrupt("return", res.status(400).json({
            error: 'Valid amount is required'
          }));
        case 1:
          if (reason) {
            _context4.next = 2;
            break;
          }
          return _context4.abrupt("return", res.status(400).json({
            error: 'Reason is required'
          }));
        case 2:
          initServices(req.scope);
          _context4.prev = 3;
          reference = "ADMIN-CREDIT-".concat(Date.now());
          _context4.next = 4;
          return blnkService.creditCustomerWallet(id, amount, reference, reason);
        case 4:
          _context4.next = 5;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'admin_credit_wallet', 'customer', $2, $3)\n    ", [adminId, id, JSON.stringify({
            amount: amount,
            reason: reason,
            reference: reference
          })]);
        case 5:
          _context4.next = 6;
          return db.query("SELECT phone, metadata FROM customer WHERE id = $1", [id]);
        case 6:
          customer = _context4.sent;
          phone = ((_customer$rows$ = customer.rows[0]) === null || _customer$rows$ === void 0 ? void 0 : _customer$rows$.phone) || ((_customer$rows$2 = customer.rows[0]) === null || _customer$rows$2 === void 0 ? void 0 : (_customer$rows$2$meta = _customer$rows$2.metadata) === null || _customer$rows$2$meta === void 0 ? void 0 : _customer$rows$2$meta.phone);
          if (!phone) {
            _context4.next = 7;
            break;
          }
          _context4.next = 7;
          return smsService.send({
            to: phone,
            message: "BIG: Your wallet has been credited with ".concat(amount.toLocaleString(), " RWF. Reason: ").concat(reason)
          });
        case 7:
          res.json({
            success: true,
            message: "Credited ".concat(amount, " RWF to customer wallet"),
            reference: reference
          });
          _context4.next = 9;
          break;
        case 8:
          _context4.prev = 8;
          _t5 = _context4["catch"](3);
          console.error('Error crediting customer:', _t5);
          res.status(500).json({
            error: 'Failed to credit customer'
          });
        case 9:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[3, 8]]);
  }));
  return function (_x0, _x1) {
    return _ref4.apply(this, arguments);
  };
}()));

// ==================== ACCOUNT CREATION ====================

/**
 * POST /admin/accounts/create-retailer
 * Create a new retailer account (SaaS admin only)
 */
router.post('/accounts/create-retailer', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$user2;
    var _req$body2, email, password, business_name, phone, address, _req$body2$credit_lim, credit_limit, adminId, emailRegex, existingUser, bcrypt, hashedPassword, userResult, userId, retailerResult, retailerId, _t6, _t7;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _req$body2 = req.body, email = _req$body2.email, password = _req$body2.password, business_name = _req$body2.business_name, phone = _req$body2.phone, address = _req$body2.address, _req$body2$credit_lim = _req$body2.credit_limit, credit_limit = _req$body2$credit_lim === void 0 ? 0 : _req$body2$credit_lim;
          adminId = (_req$user2 = req.user) === null || _req$user2 === void 0 ? void 0 : _req$user2.id; // Validate required fields
          if (!(!email || !password || !business_name || !phone)) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'Email, password, business name, and phone are required'
          }));
        case 1:
          // Validate email format
          emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(email)) {
            _context5.next = 2;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'Invalid email format'
          }));
        case 2:
          if (!(password.length < 8)) {
            _context5.next = 3;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'Password must be at least 8 characters'
          }));
        case 3:
          initServices(req.scope);
          _context5.prev = 4;
          _context5.next = 5;
          return db.query('SELECT id FROM "user" WHERE email = $1', [email.toLowerCase()]);
        case 5:
          existingUser = _context5.sent;
          if (!(existingUser.rows.length > 0)) {
            _context5.next = 6;
            break;
          }
          return _context5.abrupt("return", res.status(409).json({
            error: 'Email already registered'
          }));
        case 6:
          // Hash password
          bcrypt = require('bcryptjs');
          _context5.next = 7;
          return bcrypt.hash(password, 10);
        case 7:
          hashedPassword = _context5.sent;
          _context5.next = 8;
          return db.query("\n      INSERT INTO \"user\" (email, password_hash, role, metadata)\n      VALUES ($1, $2, 'retailer', $3)\n      RETURNING id\n    ", [email.toLowerCase(), hashedPassword, JSON.stringify({
            account_status: 'pending',
            created_by_admin: true,
            must_change_password: true
          })]);
        case 8:
          userResult = _context5.sent;
          userId = userResult.rows[0].id; // Create retailer profile
          _context5.next = 9;
          return db.query("\n      INSERT INTO bigcompany.retailer_profiles\n      (user_id, business_name, contact_phone, business_address, credit_limit, is_active, is_verified)\n      VALUES ($1, $2, $3, $4, $5, false, false)\n      RETURNING id\n    ", [userId, business_name, phone, address || null, credit_limit]);
        case 9:
          retailerResult = _context5.sent;
          retailerId = retailerResult.rows[0].id; // Log audit
          _context5.next = 10;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'create_retailer_account', 'retailer', $2, $3)\n    ", [adminId, retailerId, JSON.stringify({
            email: email,
            business_name: business_name,
            phone: phone,
            credit_limit: credit_limit
          })]);
        case 10:
          if (!phone) {
            _context5.next = 14;
            break;
          }
          _context5.prev = 11;
          _context5.next = 12;
          return smsService.send({
            to: phone,
            message: "BIG Company: Your retailer account has been created. Email: ".concat(email, ". Please check your email for activation instructions. Contact support if needed.")
          });
        case 12:
          _context5.next = 14;
          break;
        case 13:
          _context5.prev = 13;
          _t6 = _context5["catch"](11);
          console.error('Failed to send SMS:', _t6);
        case 14:
          res.status(201).json({
            success: true,
            message: 'Retailer account created successfully',
            retailer: {
              id: retailerId,
              user_id: userId,
              email: email,
              business_name: business_name,
              phone: phone,
              credit_limit: credit_limit,
              status: 'pending'
            }
          });
          _context5.next = 17;
          break;
        case 15:
          _context5.prev = 15;
          _t7 = _context5["catch"](4);
          console.error('Error creating retailer account:', _t7);
          if (!(_t7.code === '23505')) {
            _context5.next = 16;
            break;
          }
          return _context5.abrupt("return", res.status(409).json({
            error: 'Account already exists'
          }));
        case 16:
          res.status(500).json({
            error: 'Failed to create retailer account'
          });
        case 17:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[4, 15], [11, 13]]);
  }));
  return function (_x10, _x11) {
    return _ref5.apply(this, arguments);
  };
}()));

/**
 * POST /admin/accounts/create-wholesaler
 * Create a new wholesaler account (SaaS admin only)
 */
router.post('/accounts/create-wholesaler', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var _req$user3;
    var _req$body3, email, password, company_name, phone, address, adminId, emailRegex, existingUser, bcrypt, hashedPassword, userResult, userId, wholesalerResult, wholesalerId, _t8, _t9;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          _req$body3 = req.body, email = _req$body3.email, password = _req$body3.password, company_name = _req$body3.company_name, phone = _req$body3.phone, address = _req$body3.address;
          adminId = (_req$user3 = req.user) === null || _req$user3 === void 0 ? void 0 : _req$user3.id; // Validate required fields
          if (!(!email || !password || !company_name || !phone)) {
            _context6.next = 1;
            break;
          }
          return _context6.abrupt("return", res.status(400).json({
            error: 'Email, password, company name, and phone are required'
          }));
        case 1:
          // Validate email format
          emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(email)) {
            _context6.next = 2;
            break;
          }
          return _context6.abrupt("return", res.status(400).json({
            error: 'Invalid email format'
          }));
        case 2:
          if (!(password.length < 8)) {
            _context6.next = 3;
            break;
          }
          return _context6.abrupt("return", res.status(400).json({
            error: 'Password must be at least 8 characters'
          }));
        case 3:
          initServices(req.scope);
          _context6.prev = 4;
          _context6.next = 5;
          return db.query('SELECT id FROM "user" WHERE email = $1', [email.toLowerCase()]);
        case 5:
          existingUser = _context6.sent;
          if (!(existingUser.rows.length > 0)) {
            _context6.next = 6;
            break;
          }
          return _context6.abrupt("return", res.status(409).json({
            error: 'Email already registered'
          }));
        case 6:
          // Hash password
          bcrypt = require('bcryptjs');
          _context6.next = 7;
          return bcrypt.hash(password, 10);
        case 7:
          hashedPassword = _context6.sent;
          _context6.next = 8;
          return db.query("\n      INSERT INTO \"user\" (email, password_hash, role, metadata)\n      VALUES ($1, $2, 'wholesaler', $3)\n      RETURNING id\n    ", [email.toLowerCase(), hashedPassword, JSON.stringify({
            account_status: 'pending',
            created_by_admin: true,
            must_change_password: true
          })]);
        case 8:
          userResult = _context6.sent;
          userId = userResult.rows[0].id; // Create wholesaler profile
          _context6.next = 9;
          return db.query("\n      INSERT INTO bigcompany.wholesaler_profiles\n      (user_id, business_name, contact_phone, business_address, is_active)\n      VALUES ($1, $2, $3, $4, false)\n      RETURNING id\n    ", [userId, company_name, phone, address || null]);
        case 9:
          wholesalerResult = _context6.sent;
          wholesalerId = wholesalerResult.rows[0].id; // Log audit
          _context6.next = 10;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'create_wholesaler_account', 'wholesaler', $2, $3)\n    ", [adminId, wholesalerId, JSON.stringify({
            email: email,
            company_name: company_name,
            phone: phone
          })]);
        case 10:
          if (!phone) {
            _context6.next = 14;
            break;
          }
          _context6.prev = 11;
          _context6.next = 12;
          return smsService.send({
            to: phone,
            message: "BIG Company: Your wholesaler account has been created. Email: ".concat(email, ". Please check your email for activation instructions. Contact support if needed.")
          });
        case 12:
          _context6.next = 14;
          break;
        case 13:
          _context6.prev = 13;
          _t8 = _context6["catch"](11);
          console.error('Failed to send SMS:', _t8);
        case 14:
          res.status(201).json({
            success: true,
            message: 'Wholesaler account created successfully',
            wholesaler: {
              id: wholesalerId,
              user_id: userId,
              email: email,
              company_name: company_name,
              phone: phone,
              status: 'pending'
            }
          });
          _context6.next = 17;
          break;
        case 15:
          _context6.prev = 15;
          _t9 = _context6["catch"](4);
          console.error('Error creating wholesaler account:', _t9);
          if (!(_t9.code === '23505')) {
            _context6.next = 16;
            break;
          }
          return _context6.abrupt("return", res.status(409).json({
            error: 'Account already exists'
          }));
        case 16:
          res.status(500).json({
            error: 'Failed to create wholesaler account'
          });
        case 17:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[4, 15], [11, 13]]);
  }));
  return function (_x12, _x13) {
    return _ref6.apply(this, arguments);
  };
}()));

// ==================== RETAILER MANAGEMENT ====================

/**
 * GET /admin/retailers
 * List all retailers
 */
router.get('/retailers', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var _req$query2, _req$query2$page, page, _req$query2$limit, limit, search, status, offset, whereClause, params, result, countResult, _t0;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          _req$query2 = req.query, _req$query2$page = _req$query2.page, page = _req$query2$page === void 0 ? 1 : _req$query2$page, _req$query2$limit = _req$query2.limit, limit = _req$query2$limit === void 0 ? 20 : _req$query2$limit, search = _req$query2.search, status = _req$query2.status;
          offset = (Number(page) - 1) * Number(limit);
          _context7.prev = 1;
          whereClause = 'WHERE 1=1';
          params = [];
          if (search) {
            params.push("%".concat(search, "%"));
            whereClause += " AND (r.business_name ILIKE $".concat(params.length, " OR r.contact_phone ILIKE $").concat(params.length, ")");
          }
          if (status === 'active') {
            whereClause += ' AND r.is_active = true';
          } else if (status === 'inactive') {
            whereClause += ' AND r.is_active = false';
          }
          _context7.next = 2;
          return db.query("\n      SELECT\n        r.*,\n        u.email,\n        (SELECT COUNT(*) FROM \"order\" o WHERE o.metadata->>'retailer_id' = r.id::text) as order_count,\n        (SELECT COALESCE(SUM(total), 0) FROM \"order\" o WHERE o.metadata->>'retailer_id' = r.id::text) as total_sales\n      FROM bigcompany.retailer_profiles r\n      LEFT JOIN \"user\" u ON r.user_id = u.id\n      ".concat(whereClause, "\n      ORDER BY r.created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), [].concat(params, [Number(limit), offset]));
        case 2:
          result = _context7.sent;
          _context7.next = 3;
          return db.query("\n      SELECT COUNT(*) as total FROM bigcompany.retailer_profiles r ".concat(whereClause, "\n    "), params);
        case 3:
          countResult = _context7.sent;
          res.json({
            success: true,
            retailers: result.rows,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: Number(countResult.rows[0].total),
              totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
            }
          });
          _context7.next = 5;
          break;
        case 4:
          _context7.prev = 4;
          _t0 = _context7["catch"](1);
          console.error('Error listing retailers:', _t0);
          res.status(500).json({
            error: 'Failed to list retailers'
          });
        case 5:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[1, 4]]);
  }));
  return function (_x14, _x15) {
    return _ref7.apply(this, arguments);
  };
}()));

/**
 * POST /admin/retailers/:id/verify
 * Verify a retailer
 */
router.post('/retailers/:id/verify', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref8 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(req, res) {
    var _req$user4;
    var id, adminId, result, _t1;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          id = req.params.id;
          adminId = (_req$user4 = req.user) === null || _req$user4 === void 0 ? void 0 : _req$user4.id;
          _context8.prev = 1;
          _context8.next = 2;
          return db.query("\n      UPDATE bigcompany.retailer_profiles\n      SET is_verified = true, verified_at = NOW(), verified_by = $1\n      WHERE id = $2\n      RETURNING *\n    ", [adminId, id]);
        case 2:
          result = _context8.sent;
          if (!(result.rows.length === 0)) {
            _context8.next = 3;
            break;
          }
          return _context8.abrupt("return", res.status(404).json({
            error: 'Retailer not found'
          }));
        case 3:
          _context8.next = 4;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'verify_retailer', 'retailer', $2, $3)\n    ", [adminId, id, JSON.stringify({
            verified: true
          })]);
        case 4:
          res.json({
            success: true,
            message: 'Retailer verified successfully',
            retailer: result.rows[0]
          });
          _context8.next = 6;
          break;
        case 5:
          _context8.prev = 5;
          _t1 = _context8["catch"](1);
          console.error('Error verifying retailer:', _t1);
          res.status(500).json({
            error: 'Failed to verify retailer'
          });
        case 6:
        case "end":
          return _context8.stop();
      }
    }, _callee8, null, [[1, 5]]);
  }));
  return function (_x16, _x17) {
    return _ref8.apply(this, arguments);
  };
}()));

/**
 * POST /admin/retailers/:id/status
 * Update retailer status
 */
router.post('/retailers/:id/status', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref9 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(req, res) {
    var _req$user5;
    var id, _req$body4, isActive, reason, adminId, result, _t10;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          id = req.params.id;
          _req$body4 = req.body, isActive = _req$body4.isActive, reason = _req$body4.reason;
          adminId = (_req$user5 = req.user) === null || _req$user5 === void 0 ? void 0 : _req$user5.id;
          _context9.prev = 1;
          _context9.next = 2;
          return db.query("\n      UPDATE bigcompany.retailer_profiles\n      SET is_active = $1, updated_at = NOW()\n      WHERE id = $2\n      RETURNING *\n    ", [isActive, id]);
        case 2:
          result = _context9.sent;
          if (!(result.rows.length === 0)) {
            _context9.next = 3;
            break;
          }
          return _context9.abrupt("return", res.status(404).json({
            error: 'Retailer not found'
          }));
        case 3:
          _context9.next = 4;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, $2, 'retailer', $3, $4)\n    ", [adminId, isActive ? 'activate_retailer' : 'deactivate_retailer', id, JSON.stringify({
            isActive: isActive,
            reason: reason
          })]);
        case 4:
          res.json({
            success: true,
            message: "Retailer ".concat(isActive ? 'activated' : 'deactivated', " successfully"),
            retailer: result.rows[0]
          });
          _context9.next = 6;
          break;
        case 5:
          _context9.prev = 5;
          _t10 = _context9["catch"](1);
          console.error('Error updating retailer status:', _t10);
          res.status(500).json({
            error: 'Failed to update retailer status'
          });
        case 6:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[1, 5]]);
  }));
  return function (_x18, _x19) {
    return _ref9.apply(this, arguments);
  };
}()));

/**
 * POST /admin/retailers/:id/credit-limit
 * Set retailer credit limit
 */
router.post('/retailers/:id/credit-limit', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref0 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(req, res) {
    var _req$user6;
    var id, _req$body5, creditLimit, reason, adminId, _oldResult$rows$, oldResult, result, _t11;
    return _regenerator["default"].wrap(function (_context0) {
      while (1) switch (_context0.prev = _context0.next) {
        case 0:
          id = req.params.id;
          _req$body5 = req.body, creditLimit = _req$body5.creditLimit, reason = _req$body5.reason;
          adminId = (_req$user6 = req.user) === null || _req$user6 === void 0 ? void 0 : _req$user6.id;
          if (!(creditLimit === undefined || creditLimit < 0)) {
            _context0.next = 1;
            break;
          }
          return _context0.abrupt("return", res.status(400).json({
            error: 'Valid credit limit is required'
          }));
        case 1:
          _context0.prev = 1;
          _context0.next = 2;
          return db.query('SELECT credit_limit FROM bigcompany.retailer_profiles WHERE id = $1', [id]);
        case 2:
          oldResult = _context0.sent;
          _context0.next = 3;
          return db.query("\n      UPDATE bigcompany.retailer_profiles\n      SET credit_limit = $1, updated_at = NOW()\n      WHERE id = $2\n      RETURNING *\n    ", [creditLimit, id]);
        case 3:
          result = _context0.sent;
          if (!(result.rows.length === 0)) {
            _context0.next = 4;
            break;
          }
          return _context0.abrupt("return", res.status(404).json({
            error: 'Retailer not found'
          }));
        case 4:
          _context0.next = 5;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)\n      VALUES ($1, 'update_credit_limit', 'retailer', $2, $3, $4)\n    ", [adminId, id, JSON.stringify({
            creditLimit: (_oldResult$rows$ = oldResult.rows[0]) === null || _oldResult$rows$ === void 0 ? void 0 : _oldResult$rows$.credit_limit
          }), JSON.stringify({
            creditLimit: creditLimit,
            reason: reason
          })]);
        case 5:
          res.json({
            success: true,
            message: "Credit limit updated to ".concat(creditLimit.toLocaleString(), " RWF"),
            retailer: result.rows[0]
          });
          _context0.next = 7;
          break;
        case 6:
          _context0.prev = 6;
          _t11 = _context0["catch"](1);
          console.error('Error updating credit limit:', _t11);
          res.status(500).json({
            error: 'Failed to update credit limit'
          });
        case 7:
        case "end":
          return _context0.stop();
      }
    }, _callee0, null, [[1, 6]]);
  }));
  return function (_x20, _x21) {
    return _ref0.apply(this, arguments);
  };
}()));

// ==================== WHOLESALER MANAGEMENT ====================

/**
 * GET /admin/wholesalers
 * List all wholesalers
 */
router.get('/wholesalers', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref1 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(req, res) {
    var _req$query3, _req$query3$page, page, _req$query3$limit, limit, search, status, offset, whereClause, params, result, countResult, _t12;
    return _regenerator["default"].wrap(function (_context1) {
      while (1) switch (_context1.prev = _context1.next) {
        case 0:
          _req$query3 = req.query, _req$query3$page = _req$query3.page, page = _req$query3$page === void 0 ? 1 : _req$query3$page, _req$query3$limit = _req$query3.limit, limit = _req$query3$limit === void 0 ? 20 : _req$query3$limit, search = _req$query3.search, status = _req$query3.status;
          offset = (Number(page) - 1) * Number(limit);
          _context1.prev = 1;
          whereClause = 'WHERE 1=1';
          params = [];
          if (search) {
            params.push("%".concat(search, "%"));
            whereClause += " AND (w.business_name ILIKE $".concat(params.length, " OR w.contact_phone ILIKE $").concat(params.length, ")");
          }
          if (status === 'active') {
            whereClause += ' AND w.is_active = true';
          } else if (status === 'inactive') {
            whereClause += ' AND w.is_active = false';
          }
          _context1.next = 2;
          return db.query("\n      SELECT\n        w.*,\n        u.email,\n        (SELECT COUNT(*) FROM bigcompany.retailer_orders ro WHERE ro.wholesaler_id = w.id) as order_count,\n        (SELECT COALESCE(SUM(total_amount), 0) FROM bigcompany.retailer_orders ro WHERE ro.wholesaler_id = w.id) as total_sales\n      FROM bigcompany.wholesaler_profiles w\n      LEFT JOIN \"user\" u ON w.user_id = u.id\n      ".concat(whereClause, "\n      ORDER BY w.created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), [].concat(params, [Number(limit), offset]));
        case 2:
          result = _context1.sent;
          _context1.next = 3;
          return db.query("\n      SELECT COUNT(*) as total FROM bigcompany.wholesaler_profiles w ".concat(whereClause, "\n    "), params);
        case 3:
          countResult = _context1.sent;
          res.json({
            success: true,
            wholesalers: result.rows,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: Number(countResult.rows[0].total),
              totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
            }
          });
          _context1.next = 5;
          break;
        case 4:
          _context1.prev = 4;
          _t12 = _context1["catch"](1);
          console.error('Error listing wholesalers:', _t12);
          res.status(500).json({
            error: 'Failed to list wholesalers'
          });
        case 5:
        case "end":
          return _context1.stop();
      }
    }, _callee1, null, [[1, 4]]);
  }));
  return function (_x22, _x23) {
    return _ref1.apply(this, arguments);
  };
}()));

/**
 * POST /admin/wholesalers/:id/status
 * Update wholesaler status
 */
router.post('/wholesalers/:id/status', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref10 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(req, res) {
    var _req$user7;
    var id, _req$body6, isActive, reason, adminId, result, _t13;
    return _regenerator["default"].wrap(function (_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          id = req.params.id;
          _req$body6 = req.body, isActive = _req$body6.isActive, reason = _req$body6.reason;
          adminId = (_req$user7 = req.user) === null || _req$user7 === void 0 ? void 0 : _req$user7.id;
          _context10.prev = 1;
          _context10.next = 2;
          return db.query("\n      UPDATE bigcompany.wholesaler_profiles\n      SET is_active = $1, updated_at = NOW()\n      WHERE id = $2\n      RETURNING *\n    ", [isActive, id]);
        case 2:
          result = _context10.sent;
          if (!(result.rows.length === 0)) {
            _context10.next = 3;
            break;
          }
          return _context10.abrupt("return", res.status(404).json({
            error: 'Wholesaler not found'
          }));
        case 3:
          _context10.next = 4;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, $2, 'wholesaler', $3, $4)\n    ", [adminId, isActive ? 'activate_wholesaler' : 'deactivate_wholesaler', id, JSON.stringify({
            isActive: isActive,
            reason: reason
          })]);
        case 4:
          res.json({
            success: true,
            message: "Wholesaler ".concat(isActive ? 'activated' : 'deactivated', " successfully"),
            wholesaler: result.rows[0]
          });
          _context10.next = 6;
          break;
        case 5:
          _context10.prev = 5;
          _t13 = _context10["catch"](1);
          console.error('Error updating wholesaler status:', _t13);
          res.status(500).json({
            error: 'Failed to update wholesaler status'
          });
        case 6:
        case "end":
          return _context10.stop();
      }
    }, _callee10, null, [[1, 5]]);
  }));
  return function (_x24, _x25) {
    return _ref10.apply(this, arguments);
  };
}()));

// ==================== LOAN MANAGEMENT ====================

/**
 * GET /admin/loans
 * List all loans with filters
 */
router.get('/loans', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref11 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(req, res) {
    var _req$query4, _req$query4$page, page, _req$query4$limit, limit, status, type, offset, whereClause, params, result, countResult, summaryResult, _t14;
    return _regenerator["default"].wrap(function (_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          _req$query4 = req.query, _req$query4$page = _req$query4.page, page = _req$query4$page === void 0 ? 1 : _req$query4$page, _req$query4$limit = _req$query4.limit, limit = _req$query4$limit === void 0 ? 20 : _req$query4$limit, status = _req$query4.status, type = _req$query4.type;
          offset = (Number(page) - 1) * Number(limit);
          _context11.prev = 1;
          whereClause = 'WHERE 1=1';
          params = [];
          if (status) {
            params.push(status);
            whereClause += " AND l.status = $".concat(params.length);
          }
          if (type) {
            params.push(type);
            whereClause += " AND l.loan_type = $".concat(params.length);
          }
          _context11.next = 2;
          return db.query("\n      SELECT\n        l.*,\n        c.email as customer_email,\n        c.phone as customer_phone,\n        c.first_name,\n        c.last_name,\n        lp.name as product_name\n      FROM bigcompany.customer_loans l\n      LEFT JOIN customer c ON l.customer_id = c.id\n      LEFT JOIN bigcompany.loan_products lp ON l.product_id = lp.id\n      ".concat(whereClause, "\n      ORDER BY l.created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), [].concat(params, [Number(limit), offset]));
        case 2:
          result = _context11.sent;
          _context11.next = 3;
          return db.query("\n      SELECT COUNT(*) as total FROM bigcompany.customer_loans l ".concat(whereClause, "\n    "), params);
        case 3:
          countResult = _context11.sent;
          _context11.next = 4;
          return db.query("\n      SELECT\n        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,\n        COUNT(CASE WHEN status = 'disbursed' THEN 1 END) as active,\n        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,\n        COALESCE(SUM(CASE WHEN status IN ('disbursed', 'overdue') THEN amount END), 0) as outstanding\n      FROM bigcompany.customer_loans\n    ");
        case 4:
          summaryResult = _context11.sent;
          res.json({
            success: true,
            loans: result.rows,
            summary: {
              pending: Number(summaryResult.rows[0].pending),
              active: Number(summaryResult.rows[0].active),
              overdue: Number(summaryResult.rows[0].overdue),
              outstanding: Number(summaryResult.rows[0].outstanding)
            },
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: Number(countResult.rows[0].total),
              totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
            }
          });
          _context11.next = 6;
          break;
        case 5:
          _context11.prev = 5;
          _t14 = _context11["catch"](1);
          console.error('Error listing loans:', _t14);
          res.status(500).json({
            error: 'Failed to list loans'
          });
        case 6:
        case "end":
          return _context11.stop();
      }
    }, _callee11, null, [[1, 5]]);
  }));
  return function (_x26, _x27) {
    return _ref11.apply(this, arguments);
  };
}()));

/**
 * POST /admin/loans/:id/approve
 * Approve a pending loan
 */
router.post('/loans/:id/approve', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref12 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12(req, res) {
    var _req$user8;
    var id, adminId, _customer$rows$3, _customer$rows$4, _customer$rows$4$meta, loanResult, loan, customer, phone, _t15;
    return _regenerator["default"].wrap(function (_context12) {
      while (1) switch (_context12.prev = _context12.next) {
        case 0:
          id = req.params.id;
          adminId = (_req$user8 = req.user) === null || _req$user8 === void 0 ? void 0 : _req$user8.id;
          initServices(req.scope);
          _context12.prev = 1;
          _context12.next = 2;
          return db.query('SELECT * FROM bigcompany.customer_loans WHERE id = $1 AND status = $2', [id, 'pending']);
        case 2:
          loanResult = _context12.sent;
          if (!(loanResult.rows.length === 0)) {
            _context12.next = 3;
            break;
          }
          return _context12.abrupt("return", res.status(404).json({
            error: 'Pending loan not found'
          }));
        case 3:
          loan = loanResult.rows[0]; // Disburse via Blnk
          _context12.next = 4;
          return blnkService.createLoanCredit(loan.customer_id, loan.amount, loan.loan_number);
        case 4:
          _context12.next = 5;
          return db.query("\n      UPDATE bigcompany.customer_loans\n      SET status = 'disbursed', approved_by = $1, approved_at = NOW(), disbursed_at = NOW()\n      WHERE id = $2\n    ", [adminId, id]);
        case 5:
          _context12.next = 6;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'approve_loan', 'loan', $2, $3)\n    ", [adminId, id, JSON.stringify({
            amount: loan.amount,
            loanNumber: loan.loan_number
          })]);
        case 6:
          _context12.next = 7;
          return db.query("SELECT phone, metadata FROM customer WHERE id = $1", [loan.customer_id]);
        case 7:
          customer = _context12.sent;
          phone = ((_customer$rows$3 = customer.rows[0]) === null || _customer$rows$3 === void 0 ? void 0 : _customer$rows$3.phone) || ((_customer$rows$4 = customer.rows[0]) === null || _customer$rows$4 === void 0 ? void 0 : (_customer$rows$4$meta = _customer$rows$4.metadata) === null || _customer$rows$4$meta === void 0 ? void 0 : _customer$rows$4$meta.phone);
          if (!phone) {
            _context12.next = 8;
            break;
          }
          _context12.next = 8;
          return smsService.send({
            to: phone,
            message: "BIG: Your loan of ".concat(loan.amount.toLocaleString(), " RWF has been approved and credited! Ref: ").concat(loan.loan_number)
          });
        case 8:
          res.json({
            success: true,
            message: 'Loan approved and disbursed successfully',
            loanNumber: loan.loan_number
          });
          _context12.next = 10;
          break;
        case 9:
          _context12.prev = 9;
          _t15 = _context12["catch"](1);
          console.error('Error approving loan:', _t15);
          res.status(500).json({
            error: 'Failed to approve loan'
          });
        case 10:
        case "end":
          return _context12.stop();
      }
    }, _callee12, null, [[1, 9]]);
  }));
  return function (_x28, _x29) {
    return _ref12.apply(this, arguments);
  };
}()));

/**
 * POST /admin/loans/:id/reject
 * Reject a pending loan
 */
router.post('/loans/:id/reject', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref13 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee13(req, res) {
    var _req$user9;
    var id, reason, adminId, _customer$rows$5, _customer$rows$6, _customer$rows$6$meta, result, customer, phone, _t16;
    return _regenerator["default"].wrap(function (_context13) {
      while (1) switch (_context13.prev = _context13.next) {
        case 0:
          id = req.params.id;
          reason = req.body.reason;
          adminId = (_req$user9 = req.user) === null || _req$user9 === void 0 ? void 0 : _req$user9.id;
          if (reason) {
            _context13.next = 1;
            break;
          }
          return _context13.abrupt("return", res.status(400).json({
            error: 'Rejection reason is required'
          }));
        case 1:
          initServices(req.scope);
          _context13.prev = 2;
          _context13.next = 3;
          return db.query("\n      UPDATE bigcompany.customer_loans\n      SET status = 'rejected', rejection_reason = $1, rejected_by = $2, rejected_at = NOW()\n      WHERE id = $3 AND status = 'pending'\n      RETURNING *\n    ", [reason, adminId, id]);
        case 3:
          result = _context13.sent;
          if (!(result.rows.length === 0)) {
            _context13.next = 4;
            break;
          }
          return _context13.abrupt("return", res.status(404).json({
            error: 'Pending loan not found'
          }));
        case 4:
          _context13.next = 5;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'reject_loan', 'loan', $2, $3)\n    ", [adminId, id, JSON.stringify({
            reason: reason
          })]);
        case 5:
          _context13.next = 6;
          return db.query("SELECT phone, metadata FROM customer WHERE id = $1", [result.rows[0].customer_id]);
        case 6:
          customer = _context13.sent;
          phone = ((_customer$rows$5 = customer.rows[0]) === null || _customer$rows$5 === void 0 ? void 0 : _customer$rows$5.phone) || ((_customer$rows$6 = customer.rows[0]) === null || _customer$rows$6 === void 0 ? void 0 : (_customer$rows$6$meta = _customer$rows$6.metadata) === null || _customer$rows$6$meta === void 0 ? void 0 : _customer$rows$6$meta.phone);
          if (!phone) {
            _context13.next = 7;
            break;
          }
          _context13.next = 7;
          return smsService.send({
            to: phone,
            message: "BIG: Your loan application has been declined. Reason: ".concat(reason, ". Please contact support for more info.")
          });
        case 7:
          res.json({
            success: true,
            message: 'Loan rejected',
            loanNumber: result.rows[0].loan_number
          });
          _context13.next = 9;
          break;
        case 8:
          _context13.prev = 8;
          _t16 = _context13["catch"](2);
          console.error('Error rejecting loan:', _t16);
          res.status(500).json({
            error: 'Failed to reject loan'
          });
        case 9:
        case "end":
          return _context13.stop();
      }
    }, _callee13, null, [[2, 8]]);
  }));
  return function (_x30, _x31) {
    return _ref13.apply(this, arguments);
  };
}()));

// ==================== NFC CARD MANAGEMENT ====================

/**
 * GET /admin/nfc-cards
 * List all NFC cards
 */
router.get('/nfc-cards', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref14 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee14(req, res) {
    var _req$query5, _req$query5$page, page, _req$query5$limit, limit, status, search, offset, whereClause, params, result, countResult, _t17;
    return _regenerator["default"].wrap(function (_context14) {
      while (1) switch (_context14.prev = _context14.next) {
        case 0:
          _req$query5 = req.query, _req$query5$page = _req$query5.page, page = _req$query5$page === void 0 ? 1 : _req$query5$page, _req$query5$limit = _req$query5.limit, limit = _req$query5$limit === void 0 ? 20 : _req$query5$limit, status = _req$query5.status, search = _req$query5.search;
          offset = (Number(page) - 1) * Number(limit);
          _context14.prev = 1;
          whereClause = 'WHERE 1=1';
          params = [];
          if (search) {
            params.push("%".concat(search, "%"));
            whereClause += " AND (n.card_uid ILIKE $".concat(params.length, " OR n.dashboard_id ILIKE $").concat(params.length, ")");
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
          _context14.next = 2;
          return db.query("\n      SELECT\n        n.*,\n        c.email as user_email,\n        c.phone as user_phone,\n        c.first_name,\n        c.last_name\n      FROM bigcompany.nfc_cards n\n      LEFT JOIN customer c ON n.user_id = c.id\n      ".concat(whereClause, "\n      ORDER BY n.created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), [].concat(params, [Number(limit), offset]));
        case 2:
          result = _context14.sent;
          _context14.next = 3;
          return db.query("\n      SELECT COUNT(*) as total FROM bigcompany.nfc_cards n ".concat(whereClause, "\n    "), params);
        case 3:
          countResult = _context14.sent;
          res.json({
            success: true,
            cards: result.rows,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: Number(countResult.rows[0].total),
              totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
            }
          });
          _context14.next = 5;
          break;
        case 4:
          _context14.prev = 4;
          _t17 = _context14["catch"](1);
          console.error('Error listing NFC cards:', _t17);
          res.status(500).json({
            error: 'Failed to list NFC cards'
          });
        case 5:
        case "end":
          return _context14.stop();
      }
    }, _callee14, null, [[1, 4]]);
  }));
  return function (_x32, _x33) {
    return _ref14.apply(this, arguments);
  };
}()));

/**
 * POST /admin/nfc-cards/register
 * Register new NFC card
 */
router.post('/nfc-cards/register', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref15 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee15(req, res) {
    var _req$user0;
    var _req$body7, cardUid, dashboardId, adminId, generatedDashboardId, result, _t18;
    return _regenerator["default"].wrap(function (_context15) {
      while (1) switch (_context15.prev = _context15.next) {
        case 0:
          _req$body7 = req.body, cardUid = _req$body7.cardUid, dashboardId = _req$body7.dashboardId;
          adminId = (_req$user0 = req.user) === null || _req$user0 === void 0 ? void 0 : _req$user0.id;
          if (cardUid) {
            _context15.next = 1;
            break;
          }
          return _context15.abrupt("return", res.status(400).json({
            error: 'Card UID is required'
          }));
        case 1:
          _context15.prev = 1;
          generatedDashboardId = dashboardId || "BIG-".concat(Date.now().toString(36).toUpperCase(), "-").concat(Math.random().toString(36).substring(2, 8).toUpperCase());
          _context15.next = 2;
          return db.query("\n      INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, is_active)\n      VALUES ($1, $2, false)\n      ON CONFLICT (card_uid) DO NOTHING\n      RETURNING *\n    ", [cardUid.toUpperCase(), generatedDashboardId]);
        case 2:
          result = _context15.sent;
          if (!(result.rows.length === 0)) {
            _context15.next = 3;
            break;
          }
          return _context15.abrupt("return", res.status(409).json({
            error: 'Card already registered'
          }));
        case 3:
          _context15.next = 4;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'register_nfc_card', 'nfc_card', $2, $3)\n    ", [adminId, cardUid, JSON.stringify({
            dashboardId: generatedDashboardId
          })]);
        case 4:
          res.json({
            success: true,
            card: result.rows[0]
          });
          _context15.next = 6;
          break;
        case 5:
          _context15.prev = 5;
          _t18 = _context15["catch"](1);
          console.error('Error registering NFC card:', _t18);
          res.status(500).json({
            error: 'Failed to register card'
          });
        case 6:
        case "end":
          return _context15.stop();
      }
    }, _callee15, null, [[1, 5]]);
  }));
  return function (_x34, _x35) {
    return _ref15.apply(this, arguments);
  };
}()));

/**
 * POST /admin/nfc-cards/:uid/block
 * Block/unblock NFC card
 */
router.post('/nfc-cards/:uid/block', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref16 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee16(req, res) {
    var _req$user1;
    var uid, _req$body8, blocked, reason, adminId, result, _t19;
    return _regenerator["default"].wrap(function (_context16) {
      while (1) switch (_context16.prev = _context16.next) {
        case 0:
          uid = req.params.uid;
          _req$body8 = req.body, blocked = _req$body8.blocked, reason = _req$body8.reason;
          adminId = (_req$user1 = req.user) === null || _req$user1 === void 0 ? void 0 : _req$user1.id;
          _context16.prev = 1;
          _context16.next = 2;
          return db.query("\n      UPDATE bigcompany.nfc_cards\n      SET is_active = $1, updated_at = NOW()\n      WHERE card_uid = $2\n      RETURNING *\n    ", [!blocked, uid.toUpperCase()]);
        case 2:
          result = _context16.sent;
          if (!(result.rows.length === 0)) {
            _context16.next = 3;
            break;
          }
          return _context16.abrupt("return", res.status(404).json({
            error: 'Card not found'
          }));
        case 3:
          _context16.next = 4;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, $2, 'nfc_card', $3, $4)\n    ", [adminId, blocked ? 'block_nfc_card' : 'unblock_nfc_card', uid, JSON.stringify({
            reason: reason
          })]);
        case 4:
          res.json({
            success: true,
            message: "Card ".concat(blocked ? 'blocked' : 'unblocked', " successfully"),
            card: result.rows[0]
          });
          _context16.next = 6;
          break;
        case 5:
          _context16.prev = 5;
          _t19 = _context16["catch"](1);
          console.error('Error blocking NFC card:', _t19);
          res.status(500).json({
            error: 'Failed to update card status'
          });
        case 6:
        case "end":
          return _context16.stop();
      }
    }, _callee16, null, [[1, 5]]);
  }));
  return function (_x36, _x37) {
    return _ref16.apply(this, arguments);
  };
}()));

// ==================== REPORTS ====================

/**
 * GET /admin/reports/transactions
 * Get transaction report
 */
router.get('/reports/transactions', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref17 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee17(req, res) {
    var _req$query6, startDate, endDate, type, _req$query6$groupBy, groupBy, dateFilter, params, typeFilter, dateGroup, result, _t20;
    return _regenerator["default"].wrap(function (_context17) {
      while (1) switch (_context17.prev = _context17.next) {
        case 0:
          _req$query6 = req.query, startDate = _req$query6.startDate, endDate = _req$query6.endDate, type = _req$query6.type, _req$query6$groupBy = _req$query6.groupBy, groupBy = _req$query6$groupBy === void 0 ? 'day' : _req$query6$groupBy;
          _context17.prev = 1;
          dateFilter = '';
          params = [];
          if (startDate) {
            params.push(startDate);
            dateFilter += " AND created_at >= $".concat(params.length);
          }
          if (endDate) {
            params.push(endDate);
            dateFilter += " AND created_at <= $".concat(params.length);
          }
          typeFilter = '';
          if (type) {
            params.push(type);
            typeFilter = " AND type = $".concat(params.length);
          }
          dateGroup = groupBy === 'month' ? "DATE_TRUNC('month', created_at)" : "DATE(created_at)";
          _context17.next = 2;
          return db.query("\n      SELECT\n        ".concat(dateGroup, " as period,\n        type,\n        COUNT(*) as count,\n        COALESCE(SUM(amount), 0) as total_amount\n      FROM bigcompany.wallet_transactions\n      WHERE 1=1 ").concat(dateFilter, " ").concat(typeFilter, "\n      GROUP BY ").concat(dateGroup, ", type\n      ORDER BY period DESC, type\n    "), params);
        case 2:
          result = _context17.sent;
          res.json({
            success: true,
            report: result.rows,
            groupBy: groupBy
          });
          _context17.next = 4;
          break;
        case 3:
          _context17.prev = 3;
          _t20 = _context17["catch"](1);
          console.error('Error generating report:', _t20);
          res.status(500).json({
            error: 'Failed to generate report'
          });
        case 4:
        case "end":
          return _context17.stop();
      }
    }, _callee17, null, [[1, 3]]);
  }));
  return function (_x38, _x39) {
    return _ref17.apply(this, arguments);
  };
}()));

/**
 * GET /admin/reports/revenue
 * Get revenue report
 */
router.get('/reports/revenue', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref18 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee18(req, res) {
    var _req$query7, startDate, endDate, _req$query7$groupBy, groupBy, dateFilter, params, dateGroup, ordersResult, gasResult, _t21;
    return _regenerator["default"].wrap(function (_context18) {
      while (1) switch (_context18.prev = _context18.next) {
        case 0:
          _req$query7 = req.query, startDate = _req$query7.startDate, endDate = _req$query7.endDate, _req$query7$groupBy = _req$query7.groupBy, groupBy = _req$query7$groupBy === void 0 ? 'day' : _req$query7$groupBy;
          _context18.prev = 1;
          dateFilter = '';
          params = [];
          if (startDate) {
            params.push(startDate);
            dateFilter += " AND created_at >= $".concat(params.length);
          }
          if (endDate) {
            params.push(endDate);
            dateFilter += " AND created_at <= $".concat(params.length);
          }
          dateGroup = groupBy === 'month' ? "DATE_TRUNC('month', created_at)" : "DATE(created_at)";
          _context18.next = 2;
          return db.query("\n      SELECT\n        ".concat(dateGroup, " as period,\n        COUNT(*) as order_count,\n        COALESCE(SUM(total), 0) as order_revenue\n      FROM \"order\"\n      WHERE status NOT IN ('cancelled', 'refunded') ").concat(dateFilter, "\n      GROUP BY ").concat(dateGroup, "\n      ORDER BY period DESC\n    "), params);
        case 2:
          ordersResult = _context18.sent;
          _context18.next = 3;
          return db.query("\n      SELECT\n        ".concat(dateGroup, " as period,\n        COUNT(*) as gas_count,\n        COALESCE(SUM(amount), 0) as gas_revenue\n      FROM bigcompany.utility_topups\n      WHERE status = 'success' ").concat(dateFilter, "\n      GROUP BY ").concat(dateGroup, "\n      ORDER BY period DESC\n    "), params);
        case 3:
          gasResult = _context18.sent;
          res.json({
            success: true,
            orders: ordersResult.rows,
            gas: gasResult.rows,
            groupBy: groupBy
          });
          _context18.next = 5;
          break;
        case 4:
          _context18.prev = 4;
          _t21 = _context18["catch"](1);
          console.error('Error generating revenue report:', _t21);
          res.status(500).json({
            error: 'Failed to generate report'
          });
        case 5:
        case "end":
          return _context18.stop();
      }
    }, _callee18, null, [[1, 4]]);
  }));
  return function (_x40, _x41) {
    return _ref18.apply(this, arguments);
  };
}()));

// ==================== AUDIT LOGS ====================

/**
 * GET /admin/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref19 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee19(req, res) {
    var _req$query8, _req$query8$page, page, _req$query8$limit, limit, action, entityType, userId, offset, whereClause, params, result, countResult, _t22;
    return _regenerator["default"].wrap(function (_context19) {
      while (1) switch (_context19.prev = _context19.next) {
        case 0:
          _req$query8 = req.query, _req$query8$page = _req$query8.page, page = _req$query8$page === void 0 ? 1 : _req$query8$page, _req$query8$limit = _req$query8.limit, limit = _req$query8$limit === void 0 ? 50 : _req$query8$limit, action = _req$query8.action, entityType = _req$query8.entityType, userId = _req$query8.userId;
          offset = (Number(page) - 1) * Number(limit);
          _context19.prev = 1;
          whereClause = 'WHERE 1=1';
          params = [];
          if (action) {
            params.push(action);
            whereClause += " AND action = $".concat(params.length);
          }
          if (entityType) {
            params.push(entityType);
            whereClause += " AND entity_type = $".concat(params.length);
          }
          if (userId) {
            params.push(userId);
            whereClause += " AND user_id = $".concat(params.length);
          }
          _context19.next = 2;
          return db.query("\n      SELECT * FROM bigcompany.audit_logs\n      ".concat(whereClause, "\n      ORDER BY created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), [].concat(params, [Number(limit), offset]));
        case 2:
          result = _context19.sent;
          _context19.next = 3;
          return db.query("\n      SELECT COUNT(*) as total FROM bigcompany.audit_logs ".concat(whereClause, "\n    "), params);
        case 3:
          countResult = _context19.sent;
          res.json({
            success: true,
            logs: result.rows,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: Number(countResult.rows[0].total),
              totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
            }
          });
          _context19.next = 5;
          break;
        case 4:
          _context19.prev = 4;
          _t22 = _context19["catch"](1);
          console.error('Error getting audit logs:', _t22);
          res.status(500).json({
            error: 'Failed to get audit logs'
          });
        case 5:
        case "end":
          return _context19.stop();
      }
    }, _callee19, null, [[1, 4]]);
  }));
  return function (_x42, _x43) {
    return _ref19.apply(this, arguments);
  };
}()));

// ==================== SETTINGS ====================

/**
 * GET /admin/settings
 * Get platform settings
 */
router.get('/settings', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref20 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee20(req, res) {
    var result, settings, _iterator, _step, row, _t23;
    return _regenerator["default"].wrap(function (_context20) {
      while (1) switch (_context20.prev = _context20.next) {
        case 0:
          _context20.prev = 0;
          _context20.next = 1;
          return db.query('SELECT * FROM bigcompany.platform_settings');
        case 1:
          result = _context20.sent;
          settings = {};
          _iterator = _createForOfIteratorHelper(result.rows);
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              row = _step.value;
              settings[row.key] = row.value;
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
          res.json({
            success: true,
            settings: settings
          });
          _context20.next = 3;
          break;
        case 2:
          _context20.prev = 2;
          _t23 = _context20["catch"](0);
          console.error('Error getting settings:', _t23);
          res.status(500).json({
            error: 'Failed to get settings'
          });
        case 3:
        case "end":
          return _context20.stop();
      }
    }, _callee20, null, [[0, 2]]);
  }));
  return function (_x44, _x45) {
    return _ref20.apply(this, arguments);
  };
}()));

/**
 * POST /admin/settings
 * Update platform settings
 */
router.post('/settings', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref21 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee21(req, res) {
    var _req$user10;
    var settings, adminId, _i, _Object$entries, _Object$entries$_i, key, value, _t24;
    return _regenerator["default"].wrap(function (_context21) {
      while (1) switch (_context21.prev = _context21.next) {
        case 0:
          settings = req.body.settings;
          adminId = (_req$user10 = req.user) === null || _req$user10 === void 0 ? void 0 : _req$user10.id;
          if (!(!settings || (0, _typeof2["default"])(settings) !== 'object')) {
            _context21.next = 1;
            break;
          }
          return _context21.abrupt("return", res.status(400).json({
            error: 'Settings object is required'
          }));
        case 1:
          _context21.prev = 1;
          _i = 0, _Object$entries = Object.entries(settings);
        case 2:
          if (!(_i < _Object$entries.length)) {
            _context21.next = 4;
            break;
          }
          _Object$entries$_i = (0, _slicedToArray2["default"])(_Object$entries[_i], 2), key = _Object$entries$_i[0], value = _Object$entries$_i[1];
          _context21.next = 3;
          return db.query("\n        INSERT INTO bigcompany.platform_settings (key, value, updated_by)\n        VALUES ($1, $2, $3)\n        ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()\n      ", [key, JSON.stringify(value), adminId]);
        case 3:
          _i++;
          _context21.next = 2;
          break;
        case 4:
          _context21.next = 5;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'update_settings', 'settings', 'platform', $2)\n    ", [adminId, JSON.stringify(settings)]);
        case 5:
          res.json({
            success: true,
            message: 'Settings updated successfully'
          });
          _context21.next = 7;
          break;
        case 6:
          _context21.prev = 6;
          _t24 = _context21["catch"](1);
          console.error('Error updating settings:', _t24);
          res.status(500).json({
            error: 'Failed to update settings'
          });
        case 7:
        case "end":
          return _context21.stop();
      }
    }, _callee21, null, [[1, 6]]);
  }));
  return function (_x46, _x47) {
    return _ref21.apply(this, arguments);
  };
}()));
var _default = exports["default"] = router;