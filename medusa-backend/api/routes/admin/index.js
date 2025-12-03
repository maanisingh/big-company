"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var medusa_1 = require("@medusajs/medusa");
var pg_1 = require("pg");
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var crypto_1 = require("crypto");
var blnk_1 = __importDefault(require("../../../services/blnk"));
var sms_1 = __importDefault(require("../../../services/sms"));
var momo_1 = __importDefault(require("../../../services/momo"));
var airtel_1 = __importDefault(require("../../../services/airtel"));
var router = (0, express_1.Router)();
// Generate ULID-style ID for Medusa users
function generateUserId() {
    // Generate a timestamp-based prefix (similar to ULID)
    var timestamp = Date.now().toString(36).toUpperCase();
    // Generate random suffix
    var random = (0, crypto_1.randomBytes)(12).toString('base64')
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 16);
    return "usr_".concat(timestamp).concat(random).substring(0, 32);
}
// Database connection
var db = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
// Initialize services
var blnkService;
var smsService;
var momoService;
var airtelService;
function initServices(container) {
    if (!blnkService)
        blnkService = new blnk_1.default(container);
    if (!smsService)
        smsService = new sms_1.default();
    if (!momoService)
        momoService = new momo_1.default();
    if (!airtelService)
        airtelService = new airtel_1.default();
}
// Admin users database (in production, store in database table)
var adminUsers = new Map([
    ['admin@bigcompany.rw', {
            id: 'admin_001',
            email: 'admin@bigcompany.rw',
            password: bcryptjs_1.default.hashSync('admin123', 10),
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
router.post('/auth/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, admin, validPassword, token, _, adminData, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, email = _a.email, password = _a.password;
                if (!email || !password) {
                    return [2 /*return*/, res.status(400).json({ error: 'Email and password are required' })];
                }
                admin = adminUsers.get(email);
                if (!admin) {
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                }
                return [4 /*yield*/, bcryptjs_1.default.compare(password, admin.password)];
            case 1:
                validPassword = _b.sent();
                if (!validPassword) {
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                }
                if (admin.status !== 'active') {
                    return [2 /*return*/, res.status(403).json({ error: 'Admin account is not active' })];
                }
                token = jsonwebtoken_1.default.sign({
                    id: admin.id,
                    email: admin.email,
                    type: 'admin',
                    role: admin.role
                }, process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024', { expiresIn: '7d' });
                _ = admin.password, adminData = __rest(admin, ["password"]);
                res.json({
                    access_token: token,
                    admin: adminData
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('Admin login error:', error_1);
                res.status(500).json({ error: 'Login failed. Please try again.' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * GET /admin/auth/me
 * Get current admin user info
 */
router.get('/auth/me', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, token, decoded_1, admin, _, adminData;
    return __generator(this, function (_a) {
        try {
            authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return [2 /*return*/, res.status(401).json({ error: 'No token provided' })];
            }
            token = authHeader.split(' ')[1];
            decoded_1 = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024');
            if (decoded_1.type !== 'admin') {
                return [2 /*return*/, res.status(403).json({ error: 'Not authorized for admin access' })];
            }
            admin = Array.from(adminUsers.values()).find(function (a) { return a.id === decoded_1.id; });
            if (!admin) {
                return [2 /*return*/, res.status(404).json({ error: 'Admin not found' })];
            }
            _ = admin.password, adminData = __rest(admin, ["password"]);
            res.json(adminData);
        }
        catch (error) {
            console.error('Admin auth/me error:', error);
            res.status(401).json({ error: 'Invalid token' });
        }
        return [2 /*return*/];
    });
}); });
// ==================== MIDDLEWARE ====================
/**
 * JWT Authentication Middleware
 * Extracts and verifies JWT token from Authorization header
 * Populates req.user with decoded token data
 */
function authenticateJWT(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, token, decoded;
        return __generator(this, function (_a) {
            try {
                authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return [2 /*return*/, res.status(401).json({ error: 'No authentication token provided' })];
                }
                token = authHeader.split(' ')[1];
                decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024');
                // Populate req.user with decoded token data
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    type: decoded.type,
                    role: decoded.role
                };
                next();
            }
            catch (error) {
                console.error('JWT authentication error:', error.message);
                return [2 /*return*/, res.status(401).json({ error: 'Invalid or expired token' })];
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Admin Authorization Middleware
 * Verifies that the authenticated user has admin role
 * Requires authenticateJWT to run first
 */
function requireAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        var adminId, admin;
        var _a, _b;
        return __generator(this, function (_c) {
            adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!adminId) {
                return [2 /*return*/, res.status(401).json({ error: 'Admin authentication required' })];
            }
            // Check if user type is admin
            if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.type) !== 'admin') {
                return [2 /*return*/, res.status(403).json({ error: 'Admin access required' })];
            }
            admin = Array.from(adminUsers.values()).find(function (a) { return a.id === adminId; });
            if (!admin || admin.status !== 'active') {
                return [2 /*return*/, res.status(403).json({ error: 'Admin access denied' })];
            }
            req.adminRole = admin.role;
            next();
            return [2 /*return*/];
        });
    });
}
// ==================== DASHBOARD STATS ====================
/**
 * GET /admin/dashboard
 * Get comprehensive dashboard statistics
 */
router.get('/dashboard', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var customerStats, orderStats, transactionStats, loanStats, gasStats, nfcStats, retailerStats, wholesalerStats, recentActivity, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                initServices(req.scope);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 10, , 11]);
                return [4 /*yield*/, db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,\n        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,\n        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d\n      FROM customer\n    ")];
            case 2:
                customerStats = _a.sent();
                return [4 /*yield*/, db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,\n        COUNT(CASE WHEN status = 'requires_action' THEN 1 END) as processing,\n        COUNT(CASE WHEN status = 'completed' THEN 1 END) as delivered,\n        COUNT(CASE WHEN status = 'canceled' THEN 1 END) as cancelled,\n        0 as total_revenue,\n        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today_orders\n      FROM \"order\"\n    ")];
            case 3:
                orderStats = _a.sent();
                transactionStats = {
                    rows: [{
                            total: 0,
                            wallet_topups: 0,
                            gas_purchases: 0,
                            nfc_payments: 0,
                            loan_disbursements: 0,
                            total_volume: 0
                        }]
                };
                return [4 /*yield*/, db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,\n        COUNT(CASE WHEN status = 'disbursed' THEN 1 END) as active,\n        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,\n        COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted,\n        COALESCE(SUM(CASE WHEN status = 'disbursed' THEN outstanding_balance END), 0) as outstanding_amount\n      FROM bigcompany.loans\n    ")];
            case 4:
                loanStats = _a.sent();
                return [4 /*yield*/, db.query("\n      SELECT\n        COUNT(*) as total_purchases,\n        COALESCE(SUM(amount), 0) as total_amount,\n        COALESCE(SUM(units_purchased), 0) as total_units\n      FROM bigcompany.utility_topups\n      WHERE status = 'success' AND created_at >= NOW() - INTERVAL '30 days'\n    ")];
            case 5:
                gasStats = _a.sent();
                return [4 /*yield*/, db.query("\n      SELECT\n        COUNT(*) as total_cards,\n        COUNT(CASE WHEN is_active THEN 1 END) as active_cards,\n        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as linked_cards\n      FROM bigcompany.nfc_cards\n    ")];
            case 6:
                nfcStats = _a.sent();
                return [4 /*yield*/, db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN approval_status = 'active' THEN 1 END) as active,\n        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as verified\n      FROM bigcompany.merchant_profiles\n      WHERE merchant_type = 'retailer'\n    ")];
            case 7:
                retailerStats = _a.sent();
                return [4 /*yield*/, db.query("\n      SELECT\n        COUNT(*) as total,\n        COUNT(CASE WHEN approval_status = 'active' THEN 1 END) as active\n      FROM bigcompany.merchant_profiles\n      WHERE merchant_type = 'wholesaler'\n    ")];
            case 8:
                wholesalerStats = _a.sent();
                return [4 /*yield*/, db.query("\n      SELECT\n        id, user_id, action, entity_type, entity_id, created_at\n      FROM bigcompany.audit_logs\n      ORDER BY created_at DESC\n      LIMIT 20\n    ")];
            case 9:
                recentActivity = _a.sent();
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
                return [3 /*break*/, 11];
            case 10:
                error_2 = _a.sent();
                console.error('Error getting dashboard:', error_2);
                res.status(500).json({ error: 'Failed to get dashboard stats' });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); }));
// ==================== CUSTOMER MANAGEMENT ====================
/**
 * GET /admin/customers
 * List all customers with pagination and filters
 */
router.get('/customers', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, search, status, _d, sortBy, _e, sortOrder, offset, whereClause, params, validSortColumns, sortColumn, order, result, countResult, error_3;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, search = _a.search, status = _a.status, _d = _a.sortBy, sortBy = _d === void 0 ? 'created_at' : _d, _e = _a.sortOrder, sortOrder = _e === void 0 ? 'desc' : _e;
                offset = (Number(page) - 1) * Number(limit);
                _f.label = 1;
            case 1:
                _f.trys.push([1, 4, , 5]);
                whereClause = 'WHERE 1=1';
                params = [];
                if (search) {
                    params.push("%".concat(search, "%"));
                    whereClause += " AND (c.email ILIKE $".concat(params.length, " OR c.phone ILIKE $").concat(params.length, " OR c.first_name ILIKE $").concat(params.length, " OR c.last_name ILIKE $").concat(params.length, ")");
                }
                validSortColumns = ['created_at', 'email', 'first_name', 'last_name'];
                sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
                order = sortOrder === 'asc' ? 'ASC' : 'DESC';
                return [4 /*yield*/, db.query("\n      SELECT\n        c.*,\n        (SELECT COUNT(*) FROM \"order\" o WHERE o.customer_id = c.id) as order_count,\n        0 as total_spent\n      FROM customer c\n      ".concat(whereClause, "\n      ORDER BY c.").concat(sortColumn, " ").concat(order, "\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), __spreadArray(__spreadArray([], params, true), [Number(limit), offset], false))];
            case 2:
                result = _f.sent();
                return [4 /*yield*/, db.query("\n      SELECT COUNT(*) as total FROM customer c ".concat(whereClause, "\n    "), params)];
            case 3:
                countResult = _f.sent();
                res.json({
                    success: true,
                    customers: result.rows.map(function (row) {
                        var _a;
                        return ({
                            id: row.id,
                            email: row.email,
                            phone: row.phone || ((_a = row.metadata) === null || _a === void 0 ? void 0 : _a.phone) || 'N/A',
                            first_name: row.first_name || 'Unknown',
                            last_name: row.last_name || '',
                            has_account: row.has_account !== false,
                            status: 'active',
                            total_orders: Number(row.order_count),
                            total_spent: Number(row.total_spent),
                            created_at: row.created_at,
                        });
                    }),
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: Number(countResult.rows[0].total),
                        totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit)),
                    },
                });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _f.sent();
                console.error('Error listing customers:', error_3);
                res.status(500).json({ error: 'Failed to list customers' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
/**
 * GET /admin/customers/:id
 * Get detailed customer information
 */
router.get('/customers/:id', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, customerResult, customer, walletBalance, e_1, ordersResult, cardsResult, loansResult, metersResult, transactionsResult, rewardsResult, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                initServices(req.scope);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 13, , 14]);
                return [4 /*yield*/, db.query("\n      SELECT * FROM customer WHERE id = $1\n    ", [id])];
            case 2:
                customerResult = _b.sent();
                if (customerResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Customer not found' })];
                }
                customer = customerResult.rows[0];
                walletBalance = 0;
                _b.label = 3;
            case 3:
                _b.trys.push([3, 5, , 6]);
                return [4 /*yield*/, blnkService.getCustomerBalance(id, 'customer_wallets')];
            case 4:
                walletBalance = _b.sent();
                return [3 /*break*/, 6];
            case 5:
                e_1 = _b.sent();
                console.log('Could not fetch wallet balance');
                return [3 /*break*/, 6];
            case 6: return [4 /*yield*/, db.query("\n      SELECT id, status, total, currency_code, created_at\n      FROM \"order\"\n      WHERE customer_id = $1\n      ORDER BY created_at DESC\n      LIMIT 10\n    ", [id])];
            case 7:
                ordersResult = _b.sent();
                return [4 /*yield*/, db.query("\n      SELECT * FROM bigcompany.nfc_cards WHERE user_id = $1\n    ", [id])];
            case 8:
                cardsResult = _b.sent();
                return [4 /*yield*/, db.query("\n      SELECT * FROM bigcompany.customer_loans WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10\n    ", [id])];
            case 9:
                loansResult = _b.sent();
                return [4 /*yield*/, db.query("\n      SELECT * FROM bigcompany.utility_meters WHERE user_id = $1\n    ", [id])];
            case 10:
                metersResult = _b.sent();
                return [4 /*yield*/, db.query("\n      SELECT * FROM bigcompany.wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20\n    ", [id])];
            case 11:
                transactionsResult = _b.sent();
                return [4 /*yield*/, db.query("\n      SELECT\n        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) -\n        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as balance\n      FROM bigcompany.rewards_ledger WHERE user_id = $1\n    ", [id])];
            case 12:
                rewardsResult = _b.sent();
                res.json({
                    success: true,
                    customer: {
                        id: customer.id,
                        email: customer.email,
                        phone: customer.phone || ((_a = customer.metadata) === null || _a === void 0 ? void 0 : _a.phone),
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
                        recentTransactions: transactionsResult.rows,
                    },
                });
                return [3 /*break*/, 14];
            case 13:
                error_4 = _b.sent();
                console.error('Error getting customer:', error_4);
                res.status(500).json({ error: 'Failed to get customer details' });
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/];
        }
    });
}); }));
/**
 * PUT /admin/customers/:id/status
 * Update customer status
 */
router.put('/customers/:id/status', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, status, adminId, result, error_5;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                status = req.body.status;
                adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!status || !['active', 'inactive'].includes(status)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Valid status (active or inactive) is required' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, db.query("\n      UPDATE customer\n      SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('status', $1), updated_at = NOW()\n      WHERE id = $2\n      RETURNING *\n    ", [status, id])];
            case 2:
                result = _b.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Customer not found' })];
                }
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'update_customer_status', 'customer', $2, $3)\n    ", [adminId, id, JSON.stringify({ status: status })])];
            case 3:
                // Log audit
                _b.sent();
                res.json({
                    success: true,
                    message: "Customer status updated to ".concat(status),
                    customer: result.rows[0],
                });
                return [3 /*break*/, 5];
            case 4:
                error_5 = _b.sent();
                console.error('Error updating customer status:', error_5);
                res.status(500).json({ error: 'Failed to update customer status' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/customers/:id/credit
 * Credit customer wallet (admin)
 */
router.post('/customers/:id/credit', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, amount, reason, adminId, reference, customer, phone, error_6;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                id = req.params.id;
                _a = req.body, amount = _a.amount, reason = _a.reason;
                adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (!amount || amount <= 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'Valid amount is required' })];
                }
                if (!reason) {
                    return [2 /*return*/, res.status(400).json({ error: 'Reason is required' })];
                }
                initServices(req.scope);
                _f.label = 1;
            case 1:
                _f.trys.push([1, 7, , 8]);
                reference = "ADMIN-CREDIT-".concat(Date.now());
                return [4 /*yield*/, blnkService.creditCustomerWallet(id, amount, reference, reason)];
            case 2:
                _f.sent();
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'admin_credit_wallet', 'customer', $2, $3)\n    ", [adminId, id, JSON.stringify({ amount: amount, reason: reason, reference: reference })])];
            case 3:
                // Log audit
                _f.sent();
                return [4 /*yield*/, db.query("SELECT phone, metadata FROM customer WHERE id = $1", [id])];
            case 4:
                customer = _f.sent();
                phone = ((_c = customer.rows[0]) === null || _c === void 0 ? void 0 : _c.phone) || ((_e = (_d = customer.rows[0]) === null || _d === void 0 ? void 0 : _d.metadata) === null || _e === void 0 ? void 0 : _e.phone);
                if (!phone) return [3 /*break*/, 6];
                return [4 /*yield*/, smsService.send({
                        to: phone,
                        message: "BIG: Your wallet has been credited with ".concat(amount.toLocaleString(), " RWF. Reason: ").concat(reason),
                    })];
            case 5:
                _f.sent();
                _f.label = 6;
            case 6:
                res.json({
                    success: true,
                    message: "Credited ".concat(amount, " RWF to customer wallet"),
                    reference: reference,
                });
                return [3 /*break*/, 8];
            case 7:
                error_6 = _f.sent();
                console.error('Error crediting customer:', error_6);
                res.status(500).json({ error: 'Failed to credit customer' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); }));
// ==================== ACCOUNT CREATION ====================
/**
 * POST /admin/accounts/create-retailer
 * Create a new retailer account (SaaS admin only)
 */
router.post('/accounts/create-retailer', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, business_name, phone, address, _b, credit_limit, adminId, emailRegex, existingUser, bcrypt_1, hashedPassword, userId, userResult, retailerResult, retailerId, smsError_1, error_7;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password, business_name = _a.business_name, phone = _a.phone, address = _a.address, _b = _a.credit_limit, credit_limit = _b === void 0 ? 0 : _b;
                adminId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.id;
                // Validate required fields
                if (!email || !password || !business_name || !phone) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Email, password, business name, and phone are required'
                        })];
                }
                emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid email format' })];
                }
                // Validate password length
                if (password.length < 8) {
                    return [2 /*return*/, res.status(400).json({ error: 'Password must be at least 8 characters' })];
                }
                initServices(req.scope);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 11, , 12]);
                return [4 /*yield*/, db.query('SELECT id FROM "user" WHERE email = $1', [email.toLowerCase()])];
            case 2:
                existingUser = _d.sent();
                if (existingUser.rows.length > 0) {
                    return [2 /*return*/, res.status(409).json({ error: 'Email already registered' })];
                }
                bcrypt_1 = require('bcryptjs');
                return [4 /*yield*/, bcrypt_1.hash(password, 10)];
            case 3:
                hashedPassword = _d.sent();
                userId = generateUserId();
                return [4 /*yield*/, db.query("\n      INSERT INTO \"user\" (id, email, password_hash, role, metadata)\n      VALUES ($1, $2, $3, 'member', $4)\n      RETURNING id\n    ", [userId, email.toLowerCase(), hashedPassword, JSON.stringify({
                            type: 'retailer',
                            account_status: 'pending',
                            created_by_admin: true,
                            must_change_password: true
                        })])];
            case 4:
                userResult = _d.sent();
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.merchant_profiles\n      (medusa_vendor_id, merchant_type, business_name, phone, address, credit_limit, approval_status)\n      VALUES ($1, 'retailer', $2, $3, $4, $5, 'active')\n      RETURNING id\n    ", [userId, business_name, phone, address ? JSON.stringify({ full_address: address }) : '{}', credit_limit])];
            case 5:
                retailerResult = _d.sent();
                retailerId = retailerResult.rows[0].id;
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'create_retailer_account', 'retailer', $2, $3)\n    ", [adminId, retailerId, JSON.stringify({
                            email: email,
                            business_name: business_name,
                            phone: phone,
                            credit_limit: credit_limit
                        })])];
            case 6:
                // Log audit
                _d.sent();
                if (!phone) return [3 /*break*/, 10];
                _d.label = 7;
            case 7:
                _d.trys.push([7, 9, , 10]);
                return [4 /*yield*/, smsService.send({
                        to: phone,
                        message: "BIG Company: Your retailer account has been created. Email: ".concat(email, ". Please check your email for activation instructions. Contact support if needed."),
                    })];
            case 8:
                _d.sent();
                return [3 /*break*/, 10];
            case 9:
                smsError_1 = _d.sent();
                console.error('Failed to send SMS:', smsError_1);
                return [3 /*break*/, 10];
            case 10:
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
                        status: 'pending',
                    },
                });
                return [3 /*break*/, 12];
            case 11:
                error_7 = _d.sent();
                console.error('Error creating retailer account:', error_7);
                if (error_7.code === '23505') {
                    return [2 /*return*/, res.status(409).json({ error: 'Account already exists' })];
                }
                res.status(500).json({ error: 'Failed to create retailer account' });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/accounts/create-wholesaler
 * Create a new wholesaler account (SaaS admin only)
 */
router.post('/accounts/create-wholesaler', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, company_name, phone, address, adminId, emailRegex, existingUser, bcrypt_2, hashedPassword, userId, userResult, wholesalerResult, wholesalerId, smsError_2, error_8;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password, company_name = _a.company_name, phone = _a.phone, address = _a.address;
                adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                // Validate required fields
                if (!email || !password || !company_name || !phone) {
                    return [2 /*return*/, res.status(400).json({
                            error: 'Email, password, company name, and phone are required'
                        })];
                }
                emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid email format' })];
                }
                // Validate password length
                if (password.length < 8) {
                    return [2 /*return*/, res.status(400).json({ error: 'Password must be at least 8 characters' })];
                }
                initServices(req.scope);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 11, , 12]);
                return [4 /*yield*/, db.query('SELECT id FROM "user" WHERE email = $1', [email.toLowerCase()])];
            case 2:
                existingUser = _c.sent();
                if (existingUser.rows.length > 0) {
                    return [2 /*return*/, res.status(409).json({ error: 'Email already registered' })];
                }
                bcrypt_2 = require('bcryptjs');
                return [4 /*yield*/, bcrypt_2.hash(password, 10)];
            case 3:
                hashedPassword = _c.sent();
                userId = generateUserId();
                return [4 /*yield*/, db.query("\n      INSERT INTO \"user\" (id, email, password_hash, role, metadata)\n      VALUES ($1, $2, $3, 'member', $4)\n      RETURNING id\n    ", [userId, email.toLowerCase(), hashedPassword, JSON.stringify({
                            type: 'wholesaler',
                            account_status: 'pending',
                            created_by_admin: true,
                            must_change_password: true
                        })])];
            case 4:
                userResult = _c.sent();
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.merchant_profiles\n      (medusa_vendor_id, merchant_type, business_name, phone, address, approval_status)\n      VALUES ($1, 'wholesaler', $2, $3, $4, 'active')\n      RETURNING id\n    ", [userId, company_name, phone, address ? JSON.stringify({ full_address: address }) : '{}'])];
            case 5:
                wholesalerResult = _c.sent();
                wholesalerId = wholesalerResult.rows[0].id;
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'create_wholesaler_account', 'wholesaler', $2, $3)\n    ", [adminId, wholesalerId, JSON.stringify({
                            email: email,
                            company_name: company_name,
                            phone: phone
                        })])];
            case 6:
                // Log audit
                _c.sent();
                if (!phone) return [3 /*break*/, 10];
                _c.label = 7;
            case 7:
                _c.trys.push([7, 9, , 10]);
                return [4 /*yield*/, smsService.send({
                        to: phone,
                        message: "BIG Company: Your wholesaler account has been created. Email: ".concat(email, ". Please check your email for activation instructions. Contact support if needed."),
                    })];
            case 8:
                _c.sent();
                return [3 /*break*/, 10];
            case 9:
                smsError_2 = _c.sent();
                console.error('Failed to send SMS:', smsError_2);
                return [3 /*break*/, 10];
            case 10:
                res.status(201).json({
                    success: true,
                    message: 'Wholesaler account created successfully',
                    wholesaler: {
                        id: wholesalerId,
                        user_id: userId,
                        email: email,
                        company_name: company_name,
                        phone: phone,
                        status: 'pending',
                    },
                });
                return [3 /*break*/, 12];
            case 11:
                error_8 = _c.sent();
                console.error('Error creating wholesaler account:', error_8);
                if (error_8.code === '23505') {
                    return [2 /*return*/, res.status(409).json({ error: 'Account already exists' })];
                }
                res.status(500).json({ error: 'Failed to create wholesaler account' });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); }));
// ==================== RETAILER MANAGEMENT ====================
/**
 * GET /admin/retailers
 * List all retailers
 */
router.get('/retailers', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, search, status, offset, whereClause, params, result, countResult, error_9;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, search = _a.search, status = _a.status;
                offset = (Number(page) - 1) * Number(limit);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
                whereClause = 'WHERE 1=1';
                params = [];
                if (search) {
                    params.push("%".concat(search, "%"));
                    whereClause += " AND (r.business_name ILIKE $".concat(params.length, " OR r.phone ILIKE $").concat(params.length, ")");
                }
                if (status === 'active') {
                    whereClause += " AND r.approval_status = 'active'";
                }
                else if (status === 'inactive') {
                    whereClause += " AND r.approval_status = 'pending'";
                }
                return [4 /*yield*/, db.query("\n      SELECT\n        r.*,\n        u.email,\n        (SELECT COUNT(*) FROM \"order\" o WHERE o.metadata->>'retailer_id' = r.id::text) as order_count,\n        0 as total_sales\n      FROM bigcompany.merchant_profiles r\n      LEFT JOIN \"user\" u ON r.medusa_vendor_id = u.id\n      ".concat(whereClause, " AND r.merchant_type = 'retailer'\n      ORDER BY r.created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), __spreadArray(__spreadArray([], params, true), [Number(limit), offset], false))];
            case 2:
                result = _d.sent();
                return [4 /*yield*/, db.query("\n      SELECT COUNT(*) as total FROM bigcompany.merchant_profiles r\n      ".concat(whereClause, " AND r.merchant_type = 'retailer'\n    "), params)];
            case 3:
                countResult = _d.sent();
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
                return [3 /*break*/, 5];
            case 4:
                error_9 = _d.sent();
                console.error('Error listing retailers:', error_9);
                res.status(500).json({ error: 'Failed to list retailers' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/retailers/:id/verify
 * Verify a retailer
 */
router.post('/retailers/:id/verify', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, adminId, result, error_10;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, db.query("\n      UPDATE bigcompany.merchant_profiles\n      SET approval_status = 'approved', approved_at = NOW(), approved_by = $1\n      WHERE id = $2 AND merchant_type = 'retailer'\n      RETURNING *\n    ", [adminId, id])];
            case 2:
                result = _b.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Retailer not found' })];
                }
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'verify_retailer', 'retailer', $2, $3)\n    ", [adminId, id, JSON.stringify({ verified: true })])];
            case 3:
                // Log audit
                _b.sent();
                res.json({
                    success: true,
                    message: 'Retailer verified successfully',
                    retailer: result.rows[0],
                });
                return [3 /*break*/, 5];
            case 4:
                error_10 = _b.sent();
                console.error('Error verifying retailer:', error_10);
                res.status(500).json({ error: 'Failed to verify retailer' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/retailers/:id/status
 * Update retailer status
 */
router.post('/retailers/:id/status', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, isActive, reason, adminId, newStatus, result, error_11;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = req.params.id;
                _a = req.body, isActive = _a.isActive, reason = _a.reason;
                adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                newStatus = isActive ? 'active' : 'pending';
                return [4 /*yield*/, db.query("\n      UPDATE bigcompany.merchant_profiles\n      SET approval_status = $1, updated_at = NOW()\n      WHERE id = $2 AND merchant_type = 'retailer'\n      RETURNING *\n    ", [newStatus, id])];
            case 2:
                result = _c.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Retailer not found' })];
                }
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, $2, 'retailer', $3, $4)\n    ", [adminId, isActive ? 'activate_retailer' : 'deactivate_retailer', id, JSON.stringify({ isActive: isActive, reason: reason })])];
            case 3:
                // Log audit
                _c.sent();
                res.json({
                    success: true,
                    message: "Retailer ".concat(isActive ? 'activated' : 'deactivated', " successfully"),
                    retailer: result.rows[0],
                });
                return [3 /*break*/, 5];
            case 4:
                error_11 = _c.sent();
                console.error('Error updating retailer status:', error_11);
                res.status(500).json({ error: 'Failed to update retailer status' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/retailers/:id/credit-limit
 * Set retailer credit limit
 */
router.post('/retailers/:id/credit-limit', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, creditLimit, reason, adminId, oldResult, result, error_12;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                id = req.params.id;
                _a = req.body, creditLimit = _a.creditLimit, reason = _a.reason;
                adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (creditLimit === undefined || creditLimit < 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'Valid credit limit is required' })];
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 5, , 6]);
                return [4 /*yield*/, db.query('SELECT credit_limit FROM bigcompany.merchant_profiles WHERE id = $1 AND merchant_type = \'retailer\'', [id])];
            case 2:
                oldResult = _d.sent();
                return [4 /*yield*/, db.query("\n      UPDATE bigcompany.merchant_profiles\n      SET credit_limit = $1, updated_at = NOW()\n      WHERE id = $2 AND merchant_type = 'retailer'\n      RETURNING *\n    ", [creditLimit, id])];
            case 3:
                result = _d.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Retailer not found' })];
                }
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)\n      VALUES ($1, 'update_credit_limit', 'retailer', $2, $3, $4)\n    ", [
                        adminId,
                        id,
                        JSON.stringify({ creditLimit: (_c = oldResult.rows[0]) === null || _c === void 0 ? void 0 : _c.credit_limit }),
                        JSON.stringify({ creditLimit: creditLimit, reason: reason }),
                    ])];
            case 4:
                // Log audit
                _d.sent();
                res.json({
                    success: true,
                    message: "Credit limit updated to ".concat(creditLimit.toLocaleString(), " RWF"),
                    retailer: result.rows[0],
                });
                return [3 /*break*/, 6];
            case 5:
                error_12 = _d.sent();
                console.error('Error updating credit limit:', error_12);
                res.status(500).json({ error: 'Failed to update credit limit' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); }));
// ==================== WHOLESALER MANAGEMENT ====================
/**
 * GET /admin/wholesalers
 * List all wholesalers
 */
router.get('/wholesalers', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, search, status, offset, whereClause, params, result, countResult, error_13;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, search = _a.search, status = _a.status;
                offset = (Number(page) - 1) * Number(limit);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
                whereClause = 'WHERE 1=1';
                params = [];
                if (search) {
                    params.push("%".concat(search, "%"));
                    whereClause += " AND (w.business_name ILIKE $".concat(params.length, " OR w.phone ILIKE $").concat(params.length, ")");
                }
                if (status === 'active') {
                    whereClause += " AND w.approval_status = 'active'";
                }
                else if (status === 'inactive') {
                    whereClause += " AND w.approval_status = 'pending'";
                }
                return [4 /*yield*/, db.query("\n      SELECT\n        w.*,\n        u.email,\n        (SELECT COUNT(*) FROM bigcompany.retailer_orders ro WHERE ro.wholesaler_id = w.id) as order_count,\n        (SELECT COALESCE(SUM(total_amount), 0) FROM bigcompany.retailer_orders ro WHERE ro.wholesaler_id = w.id) as total_sales\n      FROM bigcompany.merchant_profiles w\n      LEFT JOIN \"user\" u ON w.medusa_vendor_id = u.id\n      ".concat(whereClause, " AND w.merchant_type = 'wholesaler'\n      ORDER BY w.created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), __spreadArray(__spreadArray([], params, true), [Number(limit), offset], false))];
            case 2:
                result = _d.sent();
                return [4 /*yield*/, db.query("\n      SELECT COUNT(*) as total FROM bigcompany.merchant_profiles w\n      ".concat(whereClause, " AND w.merchant_type = 'wholesaler'\n    "), params)];
            case 3:
                countResult = _d.sent();
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
                return [3 /*break*/, 5];
            case 4:
                error_13 = _d.sent();
                console.error('Error listing wholesalers:', error_13);
                res.status(500).json({ error: 'Failed to list wholesalers' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/wholesalers/:id/status
 * Update wholesaler status
 */
router.post('/wholesalers/:id/status', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, isActive, reason, adminId, newStatus, result, error_14;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = req.params.id;
                _a = req.body, isActive = _a.isActive, reason = _a.reason;
                adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                newStatus = isActive ? 'active' : 'pending';
                return [4 /*yield*/, db.query("\n      UPDATE bigcompany.merchant_profiles\n      SET approval_status = $1, updated_at = NOW()\n      WHERE id = $2 AND merchant_type = 'wholesaler'\n      RETURNING *\n    ", [newStatus, id])];
            case 2:
                result = _c.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Wholesaler not found' })];
                }
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, $2, 'wholesaler', $3, $4)\n    ", [adminId, isActive ? 'activate_wholesaler' : 'deactivate_wholesaler', id, JSON.stringify({ isActive: isActive, reason: reason })])];
            case 3:
                // Log audit
                _c.sent();
                res.json({
                    success: true,
                    message: "Wholesaler ".concat(isActive ? 'activated' : 'deactivated', " successfully"),
                    wholesaler: result.rows[0],
                });
                return [3 /*break*/, 5];
            case 4:
                error_14 = _c.sent();
                console.error('Error updating wholesaler status:', error_14);
                res.status(500).json({ error: 'Failed to update wholesaler status' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
// ==================== LOAN MANAGEMENT ====================
/**
 * GET /admin/loans
 * List all loans with filters
 */
router.get('/loans', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, status, type, offset, whereClause, params, result, countResult, summaryResult, error_15;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, status = _a.status, type = _a.type;
                offset = (Number(page) - 1) * Number(limit);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 5, , 6]);
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
                return [4 /*yield*/, db.query("\n      SELECT\n        l.*,\n        c.email as customer_email,\n        c.phone as customer_phone,\n        c.first_name,\n        c.last_name,\n        lp.name as product_name\n      FROM bigcompany.customer_loans l\n      LEFT JOIN customer c ON l.customer_id = c.id\n      LEFT JOIN bigcompany.loan_products lp ON l.product_id = lp.id\n      ".concat(whereClause, "\n      ORDER BY l.created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), __spreadArray(__spreadArray([], params, true), [Number(limit), offset], false))];
            case 2:
                result = _d.sent();
                return [4 /*yield*/, db.query("\n      SELECT COUNT(*) as total FROM bigcompany.customer_loans l ".concat(whereClause, "\n    "), params)];
            case 3:
                countResult = _d.sent();
                return [4 /*yield*/, db.query("\n      SELECT\n        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,\n        COUNT(CASE WHEN status = 'disbursed' THEN 1 END) as active,\n        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,\n        COALESCE(SUM(CASE WHEN status IN ('disbursed', 'overdue') THEN amount END), 0) as outstanding\n      FROM bigcompany.customer_loans\n    ")];
            case 4:
                summaryResult = _d.sent();
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
                return [3 /*break*/, 6];
            case 5:
                error_15 = _d.sent();
                console.error('Error listing loans:', error_15);
                res.status(500).json({ error: 'Failed to list loans' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/loans/:id/approve
 * Approve a pending loan
 */
router.post('/loans/:id/approve', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, adminId, loanResult, loan, customer, phone, error_16;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                id = req.params.id;
                adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                initServices(req.scope);
                _e.label = 1;
            case 1:
                _e.trys.push([1, 9, , 10]);
                return [4 /*yield*/, db.query('SELECT * FROM bigcompany.customer_loans WHERE id = $1 AND status = $2', [id, 'pending'])];
            case 2:
                loanResult = _e.sent();
                if (loanResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Pending loan not found' })];
                }
                loan = loanResult.rows[0];
                // Disburse via Blnk
                return [4 /*yield*/, blnkService.createLoanCredit(loan.customer_id, loan.amount, loan.loan_number)];
            case 3:
                // Disburse via Blnk
                _e.sent();
                // Update loan status
                return [4 /*yield*/, db.query("\n      UPDATE bigcompany.customer_loans\n      SET status = 'disbursed', approved_by = $1, approved_at = NOW(), disbursed_at = NOW()\n      WHERE id = $2\n    ", [adminId, id])];
            case 4:
                // Update loan status
                _e.sent();
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'approve_loan', 'loan', $2, $3)\n    ", [adminId, id, JSON.stringify({ amount: loan.amount, loanNumber: loan.loan_number })])];
            case 5:
                // Log audit
                _e.sent();
                return [4 /*yield*/, db.query("SELECT phone, metadata FROM customer WHERE id = $1", [loan.customer_id])];
            case 6:
                customer = _e.sent();
                phone = ((_b = customer.rows[0]) === null || _b === void 0 ? void 0 : _b.phone) || ((_d = (_c = customer.rows[0]) === null || _c === void 0 ? void 0 : _c.metadata) === null || _d === void 0 ? void 0 : _d.phone);
                if (!phone) return [3 /*break*/, 8];
                return [4 /*yield*/, smsService.send({
                        to: phone,
                        message: "BIG: Your loan of ".concat(loan.amount.toLocaleString(), " RWF has been approved and credited! Ref: ").concat(loan.loan_number),
                    })];
            case 7:
                _e.sent();
                _e.label = 8;
            case 8:
                res.json({
                    success: true,
                    message: 'Loan approved and disbursed successfully',
                    loanNumber: loan.loan_number,
                });
                return [3 /*break*/, 10];
            case 9:
                error_16 = _e.sent();
                console.error('Error approving loan:', error_16);
                res.status(500).json({ error: 'Failed to approve loan' });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/loans/:id/reject
 * Reject a pending loan
 */
router.post('/loans/:id/reject', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, reason, adminId, result, customer, phone, error_17;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                id = req.params.id;
                reason = req.body.reason;
                adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!reason) {
                    return [2 /*return*/, res.status(400).json({ error: 'Rejection reason is required' })];
                }
                initServices(req.scope);
                _e.label = 1;
            case 1:
                _e.trys.push([1, 7, , 8]);
                return [4 /*yield*/, db.query("\n      UPDATE bigcompany.customer_loans\n      SET status = 'rejected', rejection_reason = $1, rejected_by = $2, rejected_at = NOW()\n      WHERE id = $3 AND status = 'pending'\n      RETURNING *\n    ", [reason, adminId, id])];
            case 2:
                result = _e.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Pending loan not found' })];
                }
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'reject_loan', 'loan', $2, $3)\n    ", [adminId, id, JSON.stringify({ reason: reason })])];
            case 3:
                // Log audit
                _e.sent();
                return [4 /*yield*/, db.query("SELECT phone, metadata FROM customer WHERE id = $1", [result.rows[0].customer_id])];
            case 4:
                customer = _e.sent();
                phone = ((_b = customer.rows[0]) === null || _b === void 0 ? void 0 : _b.phone) || ((_d = (_c = customer.rows[0]) === null || _c === void 0 ? void 0 : _c.metadata) === null || _d === void 0 ? void 0 : _d.phone);
                if (!phone) return [3 /*break*/, 6];
                return [4 /*yield*/, smsService.send({
                        to: phone,
                        message: "BIG: Your loan application has been declined. Reason: ".concat(reason, ". Please contact support for more info."),
                    })];
            case 5:
                _e.sent();
                _e.label = 6;
            case 6:
                res.json({
                    success: true,
                    message: 'Loan rejected',
                    loanNumber: result.rows[0].loan_number,
                });
                return [3 /*break*/, 8];
            case 7:
                error_17 = _e.sent();
                console.error('Error rejecting loan:', error_17);
                res.status(500).json({ error: 'Failed to reject loan' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); }));
// ==================== NFC CARD MANAGEMENT ====================
/**
 * GET /admin/nfc-cards
 * List all NFC cards
 */
router.get('/nfc-cards', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, status, search, offset, whereClause, params, result, countResult, error_18;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, status = _a.status, search = _a.search;
                offset = (Number(page) - 1) * Number(limit);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
                whereClause = 'WHERE 1=1';
                params = [];
                if (search) {
                    params.push("%".concat(search, "%"));
                    whereClause += " AND (n.card_uid ILIKE $".concat(params.length, " OR n.dashboard_id ILIKE $").concat(params.length, ")");
                }
                if (status === 'active') {
                    whereClause += ' AND n.is_active = true';
                }
                else if (status === 'inactive') {
                    whereClause += ' AND n.is_active = false';
                }
                else if (status === 'linked') {
                    whereClause += ' AND n.user_id IS NOT NULL';
                }
                else if (status === 'unlinked') {
                    whereClause += ' AND n.user_id IS NULL';
                }
                return [4 /*yield*/, db.query("\n      SELECT\n        n.*,\n        c.email as user_email,\n        c.phone as user_phone,\n        c.first_name,\n        c.last_name\n      FROM bigcompany.nfc_cards n\n      LEFT JOIN customer c ON n.user_id = c.id\n      ".concat(whereClause, "\n      ORDER BY n.created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), __spreadArray(__spreadArray([], params, true), [Number(limit), offset], false))];
            case 2:
                result = _d.sent();
                return [4 /*yield*/, db.query("\n      SELECT COUNT(*) as total FROM bigcompany.nfc_cards n ".concat(whereClause, "\n    "), params)];
            case 3:
                countResult = _d.sent();
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
                return [3 /*break*/, 5];
            case 4:
                error_18 = _d.sent();
                console.error('Error listing NFC cards:', error_18);
                res.status(500).json({ error: 'Failed to list NFC cards' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/nfc-cards/register
 * Register new NFC card
 */
router.post('/nfc-cards/register', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, cardUid, dashboardId, adminId, generatedDashboardId, result, error_19;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, cardUid = _a.cardUid, dashboardId = _a.dashboardId;
                adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (!cardUid) {
                    return [2 /*return*/, res.status(400).json({ error: 'Card UID is required' })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                generatedDashboardId = dashboardId || "BIG-".concat(Date.now().toString(36).toUpperCase(), "-").concat(Math.random().toString(36).substring(2, 8).toUpperCase());
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, is_active)\n      VALUES ($1, $2, false)\n      ON CONFLICT (card_uid) DO NOTHING\n      RETURNING *\n    ", [cardUid.toUpperCase(), generatedDashboardId])];
            case 2:
                result = _c.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(409).json({ error: 'Card already registered' })];
                }
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'register_nfc_card', 'nfc_card', $2, $3)\n    ", [adminId, cardUid, JSON.stringify({ dashboardId: generatedDashboardId })])];
            case 3:
                // Log audit
                _c.sent();
                res.json({
                    success: true,
                    card: result.rows[0],
                });
                return [3 /*break*/, 5];
            case 4:
                error_19 = _c.sent();
                console.error('Error registering NFC card:', error_19);
                res.status(500).json({ error: 'Failed to register card' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/nfc-cards/:uid/block
 * Block/unblock NFC card
 */
router.post('/nfc-cards/:uid/block', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, _a, blocked, reason, adminId, result, error_20;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                uid = req.params.uid;
                _a = req.body, blocked = _a.blocked, reason = _a.reason;
                adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                return [4 /*yield*/, db.query("\n      UPDATE bigcompany.nfc_cards\n      SET is_active = $1, updated_at = NOW()\n      WHERE card_uid = $2\n      RETURNING *\n    ", [!blocked, uid.toUpperCase()])];
            case 2:
                result = _c.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Card not found' })];
                }
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, $2, 'nfc_card', $3, $4)\n    ", [adminId, blocked ? 'block_nfc_card' : 'unblock_nfc_card', uid, JSON.stringify({ reason: reason })])];
            case 3:
                // Log audit
                _c.sent();
                res.json({
                    success: true,
                    message: "Card ".concat(blocked ? 'blocked' : 'unblocked', " successfully"),
                    card: result.rows[0],
                });
                return [3 /*break*/, 5];
            case 4:
                error_20 = _c.sent();
                console.error('Error blocking NFC card:', error_20);
                res.status(500).json({ error: 'Failed to update card status' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
// ==================== REPORTS ====================
/**
 * GET /admin/reports/transactions
 * Get transaction report
 */
router.get('/reports/transactions', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, startDate, endDate, type, _b, groupBy, dateFilter, params, typeFilter, dateGroup, result, error_21;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.query, startDate = _a.startDate, endDate = _a.endDate, type = _a.type, _b = _a.groupBy, groupBy = _b === void 0 ? 'day' : _b;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
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
                return [4 /*yield*/, db.query("\n      SELECT\n        ".concat(dateGroup, " as period,\n        type,\n        COUNT(*) as count,\n        COALESCE(SUM(amount), 0) as total_amount\n      FROM bigcompany.wallet_transactions\n      WHERE 1=1 ").concat(dateFilter, " ").concat(typeFilter, "\n      GROUP BY ").concat(dateGroup, ", type\n      ORDER BY period DESC, type\n    "), params)];
            case 2:
                result = _c.sent();
                res.json({
                    success: true,
                    report: result.rows,
                    groupBy: groupBy,
                });
                return [3 /*break*/, 4];
            case 3:
                error_21 = _c.sent();
                console.error('Error generating report:', error_21);
                res.status(500).json({ error: 'Failed to generate report' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); }));
/**
 * GET /admin/reports/revenue
 * Get revenue report
 */
router.get('/reports/revenue', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, startDate, endDate, _b, groupBy, dateFilter, params, dateGroup, ordersResult, gasResult, error_22;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.query, startDate = _a.startDate, endDate = _a.endDate, _b = _a.groupBy, groupBy = _b === void 0 ? 'day' : _b;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
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
                return [4 /*yield*/, db.query("\n      SELECT\n        ".concat(dateGroup, " as period,\n        COUNT(*) as order_count,\n        COALESCE(SUM(total), 0) as order_revenue\n      FROM \"order\"\n      WHERE status NOT IN ('cancelled', 'refunded') ").concat(dateFilter, "\n      GROUP BY ").concat(dateGroup, "\n      ORDER BY period DESC\n    "), params)];
            case 2:
                ordersResult = _c.sent();
                return [4 /*yield*/, db.query("\n      SELECT\n        ".concat(dateGroup, " as period,\n        COUNT(*) as gas_count,\n        COALESCE(SUM(amount), 0) as gas_revenue\n      FROM bigcompany.utility_topups\n      WHERE status = 'success' ").concat(dateFilter, "\n      GROUP BY ").concat(dateGroup, "\n      ORDER BY period DESC\n    "), params)];
            case 3:
                gasResult = _c.sent();
                res.json({
                    success: true,
                    orders: ordersResult.rows,
                    gas: gasResult.rows,
                    groupBy: groupBy,
                });
                return [3 /*break*/, 5];
            case 4:
                error_22 = _c.sent();
                console.error('Error generating revenue report:', error_22);
                res.status(500).json({ error: 'Failed to generate report' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
// ==================== AUDIT LOGS ====================
/**
 * GET /admin/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, action, entityType, userId, offset, whereClause, params, result, countResult, error_23;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 50 : _c, action = _a.action, entityType = _a.entityType, userId = _a.userId;
                offset = (Number(page) - 1) * Number(limit);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
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
                return [4 /*yield*/, db.query("\n      SELECT * FROM bigcompany.audit_logs\n      ".concat(whereClause, "\n      ORDER BY created_at DESC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), __spreadArray(__spreadArray([], params, true), [Number(limit), offset], false))];
            case 2:
                result = _d.sent();
                return [4 /*yield*/, db.query("\n      SELECT COUNT(*) as total FROM bigcompany.audit_logs ".concat(whereClause, "\n    "), params)];
            case 3:
                countResult = _d.sent();
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
                return [3 /*break*/, 5];
            case 4:
                error_23 = _d.sent();
                console.error('Error getting audit logs:', error_23);
                res.status(500).json({ error: 'Failed to get audit logs' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
// ==================== SETTINGS ====================
/**
 * GET /admin/settings
 * Get platform settings
 */
router.get('/settings', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, settings, _i, _a, row, error_24;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db.query('SELECT * FROM bigcompany.platform_settings')];
            case 1:
                result = _b.sent();
                settings = {};
                for (_i = 0, _a = result.rows; _i < _a.length; _i++) {
                    row = _a[_i];
                    settings[row.key] = row.value;
                }
                res.json({
                    success: true,
                    settings: settings,
                });
                return [3 /*break*/, 3];
            case 2:
                error_24 = _b.sent();
                console.error('Error getting settings:', error_24);
                res.status(500).json({ error: 'Failed to get settings' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/settings
 * Update platform settings
 */
router.post('/settings', (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var settings, adminId, _i, _a, _b, key, value, error_25;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                settings = req.body.settings;
                adminId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.id;
                if (!settings || typeof settings !== 'object') {
                    return [2 /*return*/, res.status(400).json({ error: 'Settings object is required' })];
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 7, , 8]);
                _i = 0, _a = Object.entries(settings);
                _d.label = 2;
            case 2:
                if (!(_i < _a.length)) return [3 /*break*/, 5];
                _b = _a[_i], key = _b[0], value = _b[1];
                return [4 /*yield*/, db.query("\n        INSERT INTO bigcompany.platform_settings (key, value, updated_by)\n        VALUES ($1, $2, $3)\n        ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()\n      ", [key, JSON.stringify(value), adminId])];
            case 3:
                _d.sent();
                _d.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5: 
            // Log audit
            return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'update_settings', 'settings', 'platform', $2)\n    ", [adminId, JSON.stringify(settings)])];
            case 6:
                // Log audit
                _d.sent();
                res.json({
                    success: true,
                    message: 'Settings updated successfully',
                });
                return [3 /*break*/, 8];
            case 7:
                error_25 = _d.sent();
                console.error('Error updating settings:', error_25);
                res.status(500).json({ error: 'Failed to update settings' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); }));
// ==================== CATEGORY MANAGEMENT ====================
/**
 * GET /admin/categories
 * List all product categories
 */
router.get('/categories', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, search, active, offset, whereClause, params, result, countResult, error_26;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 50 : _c, search = _a.search, active = _a.active;
                offset = (Number(page) - 1) * Number(limit);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 4, , 5]);
                whereClause = 'WHERE 1=1';
                params = [];
                if (search) {
                    params.push("%".concat(search, "%"));
                    whereClause += " AND (name ILIKE $".concat(params.length, " OR code ILIKE $").concat(params.length, " OR description ILIKE $").concat(params.length, ")");
                }
                if (active === 'true') {
                    whereClause += ' AND is_active = true';
                }
                else if (active === 'false') {
                    whereClause += ' AND is_active = false';
                }
                return [4 /*yield*/, db.query("\n      SELECT\n        c.*,\n        bigcompany.get_category_product_count(c.id) as product_count\n      FROM bigcompany.product_categories c\n      ".concat(whereClause, "\n      ORDER BY c.name ASC\n      LIMIT $").concat(params.length + 1, " OFFSET $").concat(params.length + 2, "\n    "), __spreadArray(__spreadArray([], params, true), [Number(limit), offset], false))];
            case 2:
                result = _d.sent();
                return [4 /*yield*/, db.query("\n      SELECT COUNT(*) as total FROM bigcompany.product_categories c ".concat(whereClause, "\n    "), params)];
            case 3:
                countResult = _d.sent();
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
                return [3 /*break*/, 5];
            case 4:
                error_26 = _d.sent();
                console.error('Error listing categories:', error_26);
                res.status(500).json({ error: 'Failed to list categories' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/categories
 * Create a new category
 */
router.post('/categories', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, description, adminId, existingCategory, codeResult, code, result, error_27;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, name = _a.name, description = _a.description;
                adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (!name || name.trim().length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'Category name is required' })];
                }
                if (name.length > 100) {
                    return [2 /*return*/, res.status(400).json({ error: 'Category name must be less than 100 characters' })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 6, , 7]);
                return [4 /*yield*/, db.query('SELECT id FROM bigcompany.product_categories WHERE LOWER(name) = LOWER($1)', [name.trim()])];
            case 2:
                existingCategory = _c.sent();
                if (existingCategory.rows.length > 0) {
                    return [2 /*return*/, res.status(409).json({ error: 'A category with this name already exists' })];
                }
                return [4 /*yield*/, db.query('SELECT bigcompany.generate_category_code($1) as code', [name.trim()])];
            case 3:
                codeResult = _c.sent();
                code = codeResult.rows[0].code;
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.product_categories (code, name, description, created_by, is_active)\n      VALUES ($1, $2, $3, $4, true)\n      RETURNING *\n    ", [code, name.trim(), description || null, adminId])];
            case 4:
                result = _c.sent();
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'create_category', 'category', $2, $3)\n    ", [adminId, result.rows[0].id, JSON.stringify({ name: name, code: code, description: description })])];
            case 5:
                // Log audit
                _c.sent();
                res.status(201).json({
                    success: true,
                    message: 'Category created successfully',
                    category: result.rows[0],
                });
                return [3 /*break*/, 7];
            case 6:
                error_27 = _c.sent();
                console.error('Error creating category:', error_27);
                if (error_27.code === '23505') {
                    return [2 /*return*/, res.status(409).json({ error: 'Category with this code already exists' })];
                }
                res.status(500).json({ error: 'Failed to create category' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); }));
/**
 * PUT /admin/categories/:id
 * Update a category
 */
router.put('/categories/:id', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, name, description, is_active, adminId, existingCategory, duplicateCategory, result, error_28;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = req.params.id;
                _a = req.body, name = _a.name, description = _a.description, is_active = _a.is_active;
                adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (!name || name.trim().length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'Category name is required' })];
                }
                if (name.length > 100) {
                    return [2 /*return*/, res.status(400).json({ error: 'Category name must be less than 100 characters' })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 6, , 7]);
                return [4 /*yield*/, db.query('SELECT * FROM bigcompany.product_categories WHERE id = $1', [id])];
            case 2:
                existingCategory = _c.sent();
                if (existingCategory.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Category not found' })];
                }
                return [4 /*yield*/, db.query('SELECT id FROM bigcompany.product_categories WHERE LOWER(name) = LOWER($1) AND id != $2', [name.trim(), id])];
            case 3:
                duplicateCategory = _c.sent();
                if (duplicateCategory.rows.length > 0) {
                    return [2 /*return*/, res.status(409).json({ error: 'A category with this name already exists' })];
                }
                return [4 /*yield*/, db.query("\n      UPDATE bigcompany.product_categories\n      SET name = $1, description = $2, is_active = $3, updated_at = NOW()\n      WHERE id = $4\n      RETURNING *\n    ", [name.trim(), description || null, is_active !== undefined ? is_active : true, id])];
            case 4:
                result = _c.sent();
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)\n      VALUES ($1, 'update_category', 'category', $2, $3, $4)\n    ", [adminId, id, JSON.stringify(existingCategory.rows[0]), JSON.stringify(result.rows[0])])];
            case 5:
                // Log audit
                _c.sent();
                res.json({
                    success: true,
                    message: 'Category updated successfully',
                    category: result.rows[0],
                });
                return [3 /*break*/, 7];
            case 6:
                error_28 = _c.sent();
                console.error('Error updating category:', error_28);
                res.status(500).json({ error: 'Failed to update category' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); }));
/**
 * DELETE /admin/categories/:id
 * Delete a category (only if no products are assigned)
 */
router.delete('/categories/:id', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, adminId, categoryResult, category, hasProductsResult, productCountResult, productCount, error_29;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 8, , 9]);
                return [4 /*yield*/, db.query('SELECT * FROM bigcompany.product_categories WHERE id = $1', [id])];
            case 2:
                categoryResult = _b.sent();
                if (categoryResult.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Category not found' })];
                }
                category = categoryResult.rows[0];
                return [4 /*yield*/, db.query('SELECT bigcompany.category_has_products($1) as has_products', [id])];
            case 3:
                hasProductsResult = _b.sent();
                if (!hasProductsResult.rows[0].has_products) return [3 /*break*/, 5];
                return [4 /*yield*/, db.query('SELECT bigcompany.get_category_product_count($1) as count', [id])];
            case 4:
                productCountResult = _b.sent();
                productCount = productCountResult.rows[0].count;
                return [2 /*return*/, res.status(409).json({
                        error: 'Cannot delete category with assigned products',
                        message: "This category has ".concat(productCount, " product(s) assigned. Please reassign or delete those products first."),
                        productCount: productCount,
                    })];
            case 5: 
            // Delete category
            return [4 /*yield*/, db.query('DELETE FROM bigcompany.product_categories WHERE id = $1', [id])];
            case 6:
                // Delete category
                _b.sent();
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, old_values)\n      VALUES ($1, 'delete_category', 'category', $2, $3)\n    ", [adminId, id, JSON.stringify(category)])];
            case 7:
                // Log audit
                _b.sent();
                res.json({
                    success: true,
                    message: 'Category deleted successfully',
                });
                return [3 /*break*/, 9];
            case 8:
                error_29 = _b.sent();
                console.error('Error deleting category:', error_29);
                res.status(500).json({ error: 'Failed to delete category' });
                return [3 /*break*/, 9];
            case 9: return [2 /*return*/];
        }
    });
}); }));
/**
 * POST /admin/categories/:id/toggle
 * Toggle category active status (soft delete)
 */
router.post('/categories/:id/toggle', authenticateJWT, requireAdmin, (0, medusa_1.wrapHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, adminId, result, category, error_30;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, db.query("\n      UPDATE bigcompany.product_categories\n      SET is_active = NOT is_active, updated_at = NOW()\n      WHERE id = $1\n      RETURNING *\n    ", [id])];
            case 2:
                result = _b.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Category not found' })];
                }
                category = result.rows[0];
                // Log audit
                return [4 /*yield*/, db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, $2, 'category', $3, $4)\n    ", [adminId, category.is_active ? 'activate_category' : 'deactivate_category', id, JSON.stringify({ is_active: category.is_active })])];
            case 3:
                // Log audit
                _b.sent();
                res.json({
                    success: true,
                    message: "Category ".concat(category.is_active ? 'activated' : 'deactivated', " successfully"),
                    category: category,
                });
                return [3 /*break*/, 5];
            case 4:
                error_30 = _b.sent();
                console.error('Error toggling category:', error_30);
                res.status(500).json({ error: 'Failed to toggle category status' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); }));
exports.default = router;
