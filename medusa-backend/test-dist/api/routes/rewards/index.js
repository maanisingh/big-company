"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _medusa = require("@medusajs/medusa");
var _pg = require("pg");
var _blnk = _interopRequireDefault(require("../../../services/blnk"));
var _sms = _interopRequireDefault(require("../../../services/sms"));
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
function initServices(container) {
  if (!blnkService) {
    blnkService = new _blnk["default"](container);
  }
  if (!smsService) {
    smsService = new _sms["default"]();
  }
}

// ==================== REWARDS CONSTANTS ====================

// Gas rewards: 12% of profit when profit >= 1000 RWF
var REWARDS_CONFIG = {
  GAS_REWARD_PERCENTAGE: 0.12,
  // 12% of profit
  MIN_PROFIT_FOR_REWARD: 1000,
  // Minimum 1000 RWF profit to earn rewards
  GAS_COST_PER_UNIT: 100,
  // Cost price per gas unit (RWF)
  GAS_PRICE_PER_UNIT: 120,
  // Selling price per gas unit (RWF)
  PROFIT_PER_UNIT: 20,
  // Profit per gas unit (RWF)
  REFERRAL_REWARD: 500,
  // Reward for referring new customer (RWF)
  SIGNUP_BONUS: 200,
  // Bonus for new customer signup (RWF)
  LOYALTY_TIERS: {
    BRONZE: {
      minPoints: 0,
      multiplier: 1.0,
      name: 'Bronze'
    },
    SILVER: {
      minPoints: 1000,
      multiplier: 1.25,
      name: 'Silver'
    },
    GOLD: {
      minPoints: 5000,
      multiplier: 1.5,
      name: 'Gold'
    },
    PLATINUM: {
      minPoints: 15000,
      multiplier: 2.0,
      name: 'Platinum'
    }
  }
};

// ==================== CUSTOMER REWARDS ENDPOINTS ====================

/**
 * GET /rewards/balance
 * Get customer's rewards balance and tier
 */
router.get('/balance', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _req$user, _req$user$customer;
    var customerId, balanceResult, _balanceResult$rows$, total_earned, total_redeemed, total_expired, availablePoints, tier, pendingResult, statsResult, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          customerId = (_req$user = req.user) === null || _req$user === void 0 ? void 0 : (_req$user$customer = _req$user.customer) === null || _req$user$customer === void 0 ? void 0 : _req$user$customer.id;
          if (customerId) {
            _context.next = 1;
            break;
          }
          return _context.abrupt("return", res.status(401).json({
            error: 'Authentication required'
          }));
        case 1:
          initServices(req.scope);
          _context.prev = 2;
          _context.next = 3;
          return db.query("\n      SELECT\n        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) as total_earned,\n        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as total_redeemed,\n        COALESCE(SUM(CASE WHEN type = 'expired' THEN points ELSE 0 END), 0) as total_expired\n      FROM bigcompany.rewards_ledger\n      WHERE user_id = $1\n    ", [customerId]);
        case 3:
          balanceResult = _context.sent;
          _balanceResult$rows$ = balanceResult.rows[0], total_earned = _balanceResult$rows$.total_earned, total_redeemed = _balanceResult$rows$.total_redeemed, total_expired = _balanceResult$rows$.total_expired;
          availablePoints = Number(total_earned) - Number(total_redeemed) - Number(total_expired); // Determine tier
          tier = determineTier(availablePoints); // Get pending rewards (not yet credited)
          _context.next = 4;
          return db.query("\n      SELECT COALESCE(SUM(points), 0) as pending\n      FROM bigcompany.rewards_ledger\n      WHERE user_id = $1 AND status = 'pending'\n    ", [customerId]);
        case 4:
          pendingResult = _context.sent;
          _context.next = 5;
          return db.query("\n      SELECT\n        COUNT(DISTINCT transaction_ref) as total_transactions,\n        COALESCE(SUM(CASE WHEN source = 'gas_purchase' THEN points ELSE 0 END), 0) as gas_rewards,\n        COALESCE(SUM(CASE WHEN source = 'referral' THEN points ELSE 0 END), 0) as referral_rewards,\n        COALESCE(SUM(CASE WHEN source = 'bonus' THEN points ELSE 0 END), 0) as bonus_rewards\n      FROM bigcompany.rewards_ledger\n      WHERE user_id = $1 AND type = 'earned'\n    ", [customerId]);
        case 5:
          statsResult = _context.sent;
          res.json({
            success: true,
            balance: {
              available: availablePoints,
              pending: Number(pendingResult.rows[0].pending),
              totalEarned: Number(total_earned),
              totalRedeemed: Number(total_redeemed),
              totalExpired: Number(total_expired)
            },
            tier: {
              name: tier.name,
              multiplier: tier.multiplier,
              nextTier: getNextTier(availablePoints),
              pointsToNextTier: getPointsToNextTier(availablePoints)
            },
            stats: {
              totalTransactions: Number(statsResult.rows[0].total_transactions),
              gasRewards: Number(statsResult.rows[0].gas_rewards),
              referralRewards: Number(statsResult.rows[0].referral_rewards),
              bonusRewards: Number(statsResult.rows[0].bonus_rewards)
            },
            // Rewards value in RWF (1 point = 1 RWF)
            valueRwf: availablePoints
          });
          _context.next = 7;
          break;
        case 6:
          _context.prev = 6;
          _t = _context["catch"](2);
          console.error('Error getting rewards balance:', _t);
          res.status(500).json({
            error: 'Failed to get rewards balance'
          });
        case 7:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[2, 6]]);
  }));
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}()));

/**
 * GET /rewards/history
 * Get rewards transaction history
 */
router.get('/history', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _req$user2, _req$user2$customer;
    var customerId, _req$query, _req$query$limit, limit, _req$query$offset, offset, type, query, params, result, countResult, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          customerId = (_req$user2 = req.user) === null || _req$user2 === void 0 ? void 0 : (_req$user2$customer = _req$user2.customer) === null || _req$user2$customer === void 0 ? void 0 : _req$user2$customer.id;
          _req$query = req.query, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 50 : _req$query$limit, _req$query$offset = _req$query.offset, offset = _req$query$offset === void 0 ? 0 : _req$query$offset, type = _req$query.type;
          if (customerId) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", res.status(401).json({
            error: 'Authentication required'
          }));
        case 1:
          _context2.prev = 1;
          query = "\n      SELECT\n        id, type, source, points, description, transaction_ref,\n        status, created_at, expires_at\n      FROM bigcompany.rewards_ledger\n      WHERE user_id = $1\n    ";
          params = [customerId];
          if (type && ['earned', 'redeemed', 'expired'].includes(type)) {
            query += " AND type = $".concat(params.length + 1);
            params.push(type);
          }
          query += " ORDER BY created_at DESC LIMIT $".concat(params.length + 1, " OFFSET $").concat(params.length + 2);
          params.push(Number(limit), Number(offset));
          _context2.next = 2;
          return db.query(query, params);
        case 2:
          result = _context2.sent;
          _context2.next = 3;
          return db.query("\n      SELECT COUNT(*) as total FROM bigcompany.rewards_ledger WHERE user_id = $1\n    ", [customerId]);
        case 3:
          countResult = _context2.sent;
          res.json({
            success: true,
            transactions: result.rows.map(function (row) {
              return {
                id: row.id,
                type: row.type,
                source: row.source,
                points: row.points,
                description: row.description,
                transactionRef: row.transaction_ref,
                status: row.status,
                createdAt: row.created_at,
                expiresAt: row.expires_at
              };
            }),
            pagination: {
              total: Number(countResult.rows[0].total),
              limit: Number(limit),
              offset: Number(offset)
            }
          });
          _context2.next = 5;
          break;
        case 4:
          _context2.prev = 4;
          _t2 = _context2["catch"](1);
          console.error('Error getting rewards history:', _t2);
          res.status(500).json({
            error: 'Failed to get rewards history'
          });
        case 5:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[1, 4]]);
  }));
  return function (_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}()));

/**
 * POST /rewards/redeem
 * Redeem rewards points for wallet credit
 */
router.post('/redeem', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$user3, _req$user3$customer;
    var customerId, points, balanceResult, available, client, _customerResult$rows$, _customerResult$rows$2, _customerResult$rows$3, redemptionRef, customerResult, phone, _t3, _t4;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          customerId = (_req$user3 = req.user) === null || _req$user3 === void 0 ? void 0 : (_req$user3$customer = _req$user3.customer) === null || _req$user3$customer === void 0 ? void 0 : _req$user3$customer.id;
          points = req.body.points;
          if (customerId) {
            _context3.next = 1;
            break;
          }
          return _context3.abrupt("return", res.status(401).json({
            error: 'Authentication required'
          }));
        case 1:
          if (!(!points || points < 100)) {
            _context3.next = 2;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            error: 'Minimum redemption is 100 points'
          }));
        case 2:
          initServices(req.scope);
          _context3.prev = 3;
          _context3.next = 4;
          return db.query("\n      SELECT\n        COALESCE(SUM(CASE WHEN type = 'earned' AND status = 'credited' THEN points ELSE 0 END), 0) -\n        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) -\n        COALESCE(SUM(CASE WHEN type = 'expired' THEN points ELSE 0 END), 0) as available\n      FROM bigcompany.rewards_ledger\n      WHERE user_id = $1\n    ", [customerId]);
        case 4:
          balanceResult = _context3.sent;
          available = Number(balanceResult.rows[0].available);
          if (!(points > available)) {
            _context3.next = 5;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            error: "Insufficient points. Available: ".concat(available),
            available: available
          }));
        case 5:
          _context3.next = 6;
          return db.connect();
        case 6:
          client = _context3.sent;
          _context3.prev = 7;
          _context3.next = 8;
          return client.query('BEGIN');
        case 8:
          // Create redemption record
          redemptionRef = "REDEEM-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(2, 8));
          _context3.next = 9;
          return client.query("\n        INSERT INTO bigcompany.rewards_ledger\n        (user_id, type, source, points, description, transaction_ref, status)\n        VALUES ($1, 'redeemed', 'wallet_credit', $2, $3, $4, 'credited')\n      ", [customerId, points, "Redeemed ".concat(points, " points for ").concat(points, " RWF wallet credit"), redemptionRef]);
        case 9:
          _context3.next = 10;
          return blnkService.creditCustomerWallet(customerId, points,
          // 1 point = 1 RWF
          redemptionRef, 'Rewards redemption');
        case 10:
          _context3.next = 11;
          return client.query('COMMIT');
        case 11:
          _context3.next = 12;
          return db.query("SELECT phone, metadata FROM customer WHERE id = $1", [customerId]);
        case 12:
          customerResult = _context3.sent;
          phone = ((_customerResult$rows$ = customerResult.rows[0]) === null || _customerResult$rows$ === void 0 ? void 0 : _customerResult$rows$.phone) || ((_customerResult$rows$2 = customerResult.rows[0]) === null || _customerResult$rows$2 === void 0 ? void 0 : (_customerResult$rows$3 = _customerResult$rows$2.metadata) === null || _customerResult$rows$3 === void 0 ? void 0 : _customerResult$rows$3.phone);
          if (!phone) {
            _context3.next = 13;
            break;
          }
          _context3.next = 13;
          return smsService.send({
            to: phone,
            message: "BIG: You've redeemed ".concat(points, " reward points for ").concat(points, " RWF wallet credit! Ref: ").concat(redemptionRef)
          });
        case 13:
          res.json({
            success: true,
            redemption: {
              points: points,
              valueRwf: points,
              reference: redemptionRef,
              newBalance: available - points
            },
            message: "Successfully redeemed ".concat(points, " points for ").concat(points, " RWF")
          });
          _context3.next = 16;
          break;
        case 14:
          _context3.prev = 14;
          _t3 = _context3["catch"](7);
          _context3.next = 15;
          return client.query('ROLLBACK');
        case 15:
          throw _t3;
        case 16:
          _context3.prev = 16;
          client.release();
          return _context3.finish(16);
        case 17:
          _context3.next = 19;
          break;
        case 18:
          _context3.prev = 18;
          _t4 = _context3["catch"](3);
          console.error('Error redeeming rewards:', _t4);
          res.status(500).json({
            error: 'Failed to redeem rewards'
          });
        case 19:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[3, 18], [7, 14, 16, 17]]);
  }));
  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}()));

/**
 * GET /rewards/referral-code
 * Get or generate referral code
 */
router.get('/referral-code', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$user4, _req$user4$customer;
    var customerId, _existingResult$rows$, existingResult, referralCode, statsResult, _t5;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          customerId = (_req$user4 = req.user) === null || _req$user4 === void 0 ? void 0 : (_req$user4$customer = _req$user4.customer) === null || _req$user4$customer === void 0 ? void 0 : _req$user4$customer.id;
          if (customerId) {
            _context4.next = 1;
            break;
          }
          return _context4.abrupt("return", res.status(401).json({
            error: 'Authentication required'
          }));
        case 1:
          _context4.prev = 1;
          _context4.next = 2;
          return db.query("\n      SELECT referral_code FROM bigcompany.user_referrals WHERE user_id = $1\n    ", [customerId]);
        case 2:
          existingResult = _context4.sent;
          referralCode = (_existingResult$rows$ = existingResult.rows[0]) === null || _existingResult$rows$ === void 0 ? void 0 : _existingResult$rows$.referral_code;
          if (referralCode) {
            _context4.next = 3;
            break;
          }
          // Generate new referral code
          referralCode = generateReferralCode();
          _context4.next = 3;
          return db.query("\n        INSERT INTO bigcompany.user_referrals (user_id, referral_code)\n        VALUES ($1, $2)\n        ON CONFLICT (user_id) DO UPDATE SET referral_code = $2\n      ", [customerId, referralCode]);
        case 3:
          _context4.next = 4;
          return db.query("\n      SELECT\n        COUNT(*) as total_referrals,\n        COUNT(CASE WHEN is_converted THEN 1 END) as converted_referrals,\n        COALESCE(SUM(reward_paid), 0) as total_rewards_earned\n      FROM bigcompany.referral_tracking\n      WHERE referrer_id = $1\n    ", [customerId]);
        case 4:
          statsResult = _context4.sent;
          res.json({
            success: true,
            referralCode: referralCode,
            shareLink: "https://big.rw/r/".concat(referralCode),
            ussdCode: "*939*REF*".concat(referralCode, "#"),
            rewardPerReferral: REWARDS_CONFIG.REFERRAL_REWARD,
            stats: {
              totalReferrals: Number(statsResult.rows[0].total_referrals),
              convertedReferrals: Number(statsResult.rows[0].converted_referrals),
              totalRewardsEarned: Number(statsResult.rows[0].total_rewards_earned)
            }
          });
          _context4.next = 6;
          break;
        case 5:
          _context4.prev = 5;
          _t5 = _context4["catch"](1);
          console.error('Error getting referral code:', _t5);
          res.status(500).json({
            error: 'Failed to get referral code'
          });
        case 6:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[1, 5]]);
  }));
  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}()));

/**
 * POST /rewards/apply-referral
 * Apply a referral code (for new users)
 */
router.post('/apply-referral', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$user5, _req$user5$customer;
    var customerId, referralCode, existingResult, referrerResult, referrerId, client, referrerRef, signupRef, _t6, _t7;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          customerId = (_req$user5 = req.user) === null || _req$user5 === void 0 ? void 0 : (_req$user5$customer = _req$user5.customer) === null || _req$user5$customer === void 0 ? void 0 : _req$user5$customer.id;
          referralCode = req.body.referralCode;
          if (customerId) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", res.status(401).json({
            error: 'Authentication required'
          }));
        case 1:
          if (referralCode) {
            _context5.next = 2;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'Referral code is required'
          }));
        case 2:
          initServices(req.scope);
          _context5.prev = 3;
          _context5.next = 4;
          return db.query("\n      SELECT id FROM bigcompany.referral_tracking WHERE referred_id = $1\n    ", [customerId]);
        case 4:
          existingResult = _context5.sent;
          if (!(existingResult.rows.length > 0)) {
            _context5.next = 5;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'You have already used a referral code'
          }));
        case 5:
          _context5.next = 6;
          return db.query("\n      SELECT user_id FROM bigcompany.user_referrals WHERE referral_code = $1\n    ", [referralCode.toUpperCase()]);
        case 6:
          referrerResult = _context5.sent;
          if (!(referrerResult.rows.length === 0)) {
            _context5.next = 7;
            break;
          }
          return _context5.abrupt("return", res.status(404).json({
            error: 'Invalid referral code'
          }));
        case 7:
          referrerId = referrerResult.rows[0].user_id; // Can't refer yourself
          if (!(referrerId === customerId)) {
            _context5.next = 8;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'You cannot use your own referral code'
          }));
        case 8:
          _context5.next = 9;
          return db.connect();
        case 9:
          client = _context5.sent;
          _context5.prev = 10;
          _context5.next = 11;
          return client.query('BEGIN');
        case 11:
          _context5.next = 12;
          return client.query("\n        INSERT INTO bigcompany.referral_tracking\n        (referrer_id, referred_id, referral_code, is_converted, reward_paid)\n        VALUES ($1, $2, $3, true, $4)\n      ", [referrerId, customerId, referralCode.toUpperCase(), REWARDS_CONFIG.REFERRAL_REWARD]);
        case 12:
          // Award referrer
          referrerRef = "REF-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(2, 6));
          _context5.next = 13;
          return client.query("\n        INSERT INTO bigcompany.rewards_ledger\n        (user_id, type, source, points, description, transaction_ref, status)\n        VALUES ($1, 'earned', 'referral', $2, $3, $4, 'credited')\n      ", [referrerId, REWARDS_CONFIG.REFERRAL_REWARD, "Referral bonus for inviting new customer", referrerRef]);
        case 13:
          // Award new user (signup bonus)
          signupRef = "SIGNUP-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(2, 6));
          _context5.next = 14;
          return client.query("\n        INSERT INTO bigcompany.rewards_ledger\n        (user_id, type, source, points, description, transaction_ref, status)\n        VALUES ($1, 'earned', 'bonus', $2, $3, $4, 'credited')\n      ", [customerId, REWARDS_CONFIG.SIGNUP_BONUS, "Welcome bonus for joining via referral", signupRef]);
        case 14:
          _context5.next = 15;
          return client.query('COMMIT');
        case 15:
          res.json({
            success: true,
            message: "Referral code applied! You received ".concat(REWARDS_CONFIG.SIGNUP_BONUS, " bonus points."),
            bonusAwarded: REWARDS_CONFIG.SIGNUP_BONUS
          });
          _context5.next = 18;
          break;
        case 16:
          _context5.prev = 16;
          _t6 = _context5["catch"](10);
          _context5.next = 17;
          return client.query('ROLLBACK');
        case 17:
          throw _t6;
        case 18:
          _context5.prev = 18;
          client.release();
          return _context5.finish(18);
        case 19:
          _context5.next = 21;
          break;
        case 20:
          _context5.prev = 20;
          _t7 = _context5["catch"](3);
          console.error('Error applying referral:', _t7);
          res.status(500).json({
            error: 'Failed to apply referral code'
          });
        case 21:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[3, 20], [10, 16, 18, 19]]);
  }));
  return function (_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}()));

/**
 * GET /rewards/leaderboard
 * Get rewards leaderboard
 */
router.get('/leaderboard', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var _req$query2, _req$query2$period, period, _req$query2$limit, limit, dateFilter, result, _t8;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          _req$query2 = req.query, _req$query2$period = _req$query2.period, period = _req$query2$period === void 0 ? 'month' : _req$query2$period, _req$query2$limit = _req$query2.limit, limit = _req$query2$limit === void 0 ? 10 : _req$query2$limit;
          _context6.prev = 1;
          dateFilter = '';
          if (period === 'week') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
          } else if (period === 'month') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
          } else if (period === 'year') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '365 days'";
          }
          _context6.next = 2;
          return db.query("\n      SELECT\n        r.user_id,\n        c.first_name,\n        c.last_name,\n        SUM(CASE WHEN r.type = 'earned' THEN r.points ELSE 0 END) as total_earned\n      FROM bigcompany.rewards_ledger r\n      JOIN customer c ON r.user_id = c.id\n      WHERE r.type = 'earned' ".concat(dateFilter, "\n      GROUP BY r.user_id, c.first_name, c.last_name\n      ORDER BY total_earned DESC\n      LIMIT $1\n    "), [Number(limit)]);
        case 2:
          result = _context6.sent;
          res.json({
            success: true,
            period: period,
            leaderboard: result.rows.map(function (row, index) {
              return {
                rank: index + 1,
                userId: row.user_id,
                name: "".concat(row.first_name || '', " ").concat(row.last_name || '').trim() || 'Anonymous',
                totalEarned: Number(row.total_earned),
                tier: determineTier(Number(row.total_earned)).name
              };
            })
          });
          _context6.next = 4;
          break;
        case 3:
          _context6.prev = 3;
          _t8 = _context6["catch"](1);
          console.error('Error getting leaderboard:', _t8);
          res.status(500).json({
            error: 'Failed to get leaderboard'
          });
        case 4:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[1, 3]]);
  }));
  return function (_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}()));

// ==================== GAS REWARDS PROCESSING ====================

/**
 * POST /rewards/process-gas-purchase
 * Process rewards for a gas purchase (called by gas service)
 */
router.post('/process-gas-purchase', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var _req$body, userId, transactionRef, amount, units, meterNumber, apiKey, profit, balanceResult, currentBalance, tier, baseReward, finalReward, existingResult, _t9;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          _req$body = req.body, userId = _req$body.userId, transactionRef = _req$body.transactionRef, amount = _req$body.amount, units = _req$body.units, meterNumber = _req$body.meterNumber; // This endpoint should be called internally by the gas service
          apiKey = req.headers['x-internal-api-key'];
          if (!(apiKey !== process.env.INTERNAL_API_KEY)) {
            _context7.next = 1;
            break;
          }
          return _context7.abrupt("return", res.status(403).json({
            error: 'Forbidden'
          }));
        case 1:
          if (!(!userId || !transactionRef || !amount)) {
            _context7.next = 2;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Missing required fields'
          }));
        case 2:
          _context7.prev = 2;
          // Calculate profit and rewards
          // Profit = selling price - cost price
          profit = Number(units) * REWARDS_CONFIG.PROFIT_PER_UNIT; // Check if profit meets minimum threshold
          if (!(profit < REWARDS_CONFIG.MIN_PROFIT_FOR_REWARD)) {
            _context7.next = 3;
            break;
          }
          return _context7.abrupt("return", res.json({
            success: true,
            rewardsAwarded: 0,
            reason: "Profit (".concat(profit, " RWF) below minimum threshold (").concat(REWARDS_CONFIG.MIN_PROFIT_FOR_REWARD, " RWF)")
          }));
        case 3:
          _context7.next = 4;
          return db.query("\n      SELECT\n        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) -\n        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as balance\n      FROM bigcompany.rewards_ledger\n      WHERE user_id = $1\n    ", [userId]);
        case 4:
          balanceResult = _context7.sent;
          currentBalance = Number(balanceResult.rows[0].balance);
          tier = determineTier(currentBalance); // Calculate rewards: 12% of profit * tier multiplier
          baseReward = Math.floor(profit * REWARDS_CONFIG.GAS_REWARD_PERCENTAGE);
          finalReward = Math.floor(baseReward * tier.multiplier); // Check for duplicate
          _context7.next = 5;
          return db.query("\n      SELECT id FROM bigcompany.rewards_ledger\n      WHERE user_id = $1 AND transaction_ref = $2\n    ", [userId, transactionRef]);
        case 5:
          existingResult = _context7.sent;
          if (!(existingResult.rows.length > 0)) {
            _context7.next = 6;
            break;
          }
          return _context7.abrupt("return", res.json({
            success: true,
            rewardsAwarded: 0,
            reason: 'Rewards already processed for this transaction'
          }));
        case 6:
          _context7.next = 7;
          return db.query("\n      INSERT INTO bigcompany.rewards_ledger\n      (user_id, type, source, points, description, transaction_ref, status, metadata)\n      VALUES ($1, 'earned', 'gas_purchase', $2, $3, $4, 'credited', $5)\n    ", [userId, finalReward, "Gas rewards for ".concat(units, " units (").concat(amount, " RWF)"), transactionRef, JSON.stringify({
            meterNumber: meterNumber,
            amount: amount,
            units: units,
            profit: profit,
            baseReward: baseReward,
            tierMultiplier: tier.multiplier,
            tierName: tier.name
          })]);
        case 7:
          res.json({
            success: true,
            rewardsAwarded: finalReward,
            breakdown: {
              profit: profit,
              baseReward: baseReward,
              tierMultiplier: tier.multiplier,
              tierName: tier.name,
              finalReward: finalReward
            }
          });
          _context7.next = 9;
          break;
        case 8:
          _context7.prev = 8;
          _t9 = _context7["catch"](2);
          console.error('Error processing gas rewards:', _t9);
          res.status(500).json({
            error: 'Failed to process rewards'
          });
        case 9:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[2, 8]]);
  }));
  return function (_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}()));

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /rewards/admin/stats
 * Get rewards program statistics (admin only)
 */
router.get('/admin/stats', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref8 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(req, res) {
    var _req$user6;
    var adminId, overallResult, sourceResult, tierResult, recentResult, referralResult, overall, outstandingLiability, _t0;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          // Admin authentication check
          adminId = (_req$user6 = req.user) === null || _req$user6 === void 0 ? void 0 : _req$user6.id;
          if (adminId) {
            _context8.next = 1;
            break;
          }
          return _context8.abrupt("return", res.status(401).json({
            error: 'Admin authentication required'
          }));
        case 1:
          _context8.prev = 1;
          _context8.next = 2;
          return db.query("\n      SELECT\n        COUNT(DISTINCT user_id) as total_users,\n        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) as total_earned,\n        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as total_redeemed,\n        COALESCE(SUM(CASE WHEN type = 'expired' THEN points ELSE 0 END), 0) as total_expired\n      FROM bigcompany.rewards_ledger\n    ");
        case 2:
          overallResult = _context8.sent;
          _context8.next = 3;
          return db.query("\n      SELECT\n        source,\n        COUNT(*) as transaction_count,\n        SUM(points) as total_points\n      FROM bigcompany.rewards_ledger\n      WHERE type = 'earned'\n      GROUP BY source\n    ");
        case 3:
          sourceResult = _context8.sent;
          _context8.next = 4;
          return db.query("\n      WITH user_balances AS (\n        SELECT\n          user_id,\n          COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) -\n          COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as balance\n        FROM bigcompany.rewards_ledger\n        GROUP BY user_id\n      )\n      SELECT\n        CASE\n          WHEN balance >= 15000 THEN 'Platinum'\n          WHEN balance >= 5000 THEN 'Gold'\n          WHEN balance >= 1000 THEN 'Silver'\n          ELSE 'Bronze'\n        END as tier,\n        COUNT(*) as user_count\n      FROM user_balances\n      GROUP BY tier\n      ORDER BY user_count DESC\n    ");
        case 4:
          tierResult = _context8.sent;
          _context8.next = 5;
          return db.query("\n      SELECT\n        DATE(created_at) as date,\n        SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END) as earned,\n        SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) as redeemed\n      FROM bigcompany.rewards_ledger\n      WHERE created_at >= NOW() - INTERVAL '30 days'\n      GROUP BY DATE(created_at)\n      ORDER BY date DESC\n    ");
        case 5:
          recentResult = _context8.sent;
          _context8.next = 6;
          return db.query("\n      SELECT\n        COUNT(*) as total_referrals,\n        COUNT(CASE WHEN is_converted THEN 1 END) as converted,\n        COALESCE(SUM(reward_paid), 0) as total_paid\n      FROM bigcompany.referral_tracking\n    ");
        case 6:
          referralResult = _context8.sent;
          overall = overallResult.rows[0];
          outstandingLiability = Number(overall.total_earned) - Number(overall.total_redeemed) - Number(overall.total_expired);
          res.json({
            success: true,
            stats: {
              overall: {
                totalUsers: Number(overall.total_users),
                totalEarned: Number(overall.total_earned),
                totalRedeemed: Number(overall.total_redeemed),
                totalExpired: Number(overall.total_expired),
                outstandingLiability: outstandingLiability,
                outstandingLiabilityRwf: outstandingLiability // 1 point = 1 RWF
              },
              bySource: sourceResult.rows.map(function (row) {
                return {
                  source: row.source,
                  transactionCount: Number(row.transaction_count),
                  totalPoints: Number(row.total_points)
                };
              }),
              tierDistribution: tierResult.rows.map(function (row) {
                return {
                  tier: row.tier,
                  userCount: Number(row.user_count)
                };
              }),
              dailyActivity: recentResult.rows.map(function (row) {
                return {
                  date: row.date,
                  earned: Number(row.earned),
                  redeemed: Number(row.redeemed)
                };
              }),
              referrals: {
                total: Number(referralResult.rows[0].total_referrals),
                converted: Number(referralResult.rows[0].converted),
                totalPaid: Number(referralResult.rows[0].total_paid),
                conversionRate: referralResult.rows[0].total_referrals > 0 ? (Number(referralResult.rows[0].converted) / Number(referralResult.rows[0].total_referrals) * 100).toFixed(1) : 0
              }
            }
          });
          _context8.next = 8;
          break;
        case 7:
          _context8.prev = 7;
          _t0 = _context8["catch"](1);
          console.error('Error getting admin stats:', _t0);
          res.status(500).json({
            error: 'Failed to get admin stats'
          });
        case 8:
        case "end":
          return _context8.stop();
      }
    }, _callee8, null, [[1, 7]]);
  }));
  return function (_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
}()));

/**
 * POST /rewards/admin/award
 * Manually award bonus points to a user (admin only)
 */
router.post('/admin/award', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref9 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(req, res) {
    var _req$user7;
    var adminId, _req$body2, userId, points, reason, _userResult$rows$, _userResult$rows$2, _userResult$rows$2$me, userResult, bonusRef, phone, _t1;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          adminId = (_req$user7 = req.user) === null || _req$user7 === void 0 ? void 0 : _req$user7.id;
          if (adminId) {
            _context9.next = 1;
            break;
          }
          return _context9.abrupt("return", res.status(401).json({
            error: 'Admin authentication required'
          }));
        case 1:
          _req$body2 = req.body, userId = _req$body2.userId, points = _req$body2.points, reason = _req$body2.reason;
          if (!(!userId || !points || points <= 0)) {
            _context9.next = 2;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'Valid userId and points are required'
          }));
        case 2:
          if (reason) {
            _context9.next = 3;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'Reason is required for manual awards'
          }));
        case 3:
          initServices(req.scope);
          _context9.prev = 4;
          _context9.next = 5;
          return db.query("SELECT id, phone, metadata FROM customer WHERE id = $1", [userId]);
        case 5:
          userResult = _context9.sent;
          if (!(userResult.rows.length === 0)) {
            _context9.next = 6;
            break;
          }
          return _context9.abrupt("return", res.status(404).json({
            error: 'User not found'
          }));
        case 6:
          bonusRef = "BONUS-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(2, 8));
          _context9.next = 7;
          return db.query("\n      INSERT INTO bigcompany.rewards_ledger\n      (user_id, type, source, points, description, transaction_ref, status, metadata)\n      VALUES ($1, 'earned', 'bonus', $2, $3, $4, 'credited', $5)\n    ", [userId, points, reason, bonusRef, JSON.stringify({
            awardedBy: adminId,
            reason: reason
          })]);
        case 7:
          // Send SMS notification
          phone = ((_userResult$rows$ = userResult.rows[0]) === null || _userResult$rows$ === void 0 ? void 0 : _userResult$rows$.phone) || ((_userResult$rows$2 = userResult.rows[0]) === null || _userResult$rows$2 === void 0 ? void 0 : (_userResult$rows$2$me = _userResult$rows$2.metadata) === null || _userResult$rows$2$me === void 0 ? void 0 : _userResult$rows$2$me.phone);
          if (!phone) {
            _context9.next = 8;
            break;
          }
          _context9.next = 8;
          return smsService.send({
            to: phone,
            message: "BIG: You received ".concat(points, " bonus reward points! Reason: ").concat(reason, ". Check your rewards balance in the app.")
          });
        case 8:
          _context9.next = 9;
          return db.query("\n      INSERT INTO bigcompany.audit_logs\n      (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'manual_reward_award', 'rewards', $2, $3)\n    ", [adminId, bonusRef, JSON.stringify({
            userId: userId,
            points: points,
            reason: reason
          })]);
        case 9:
          res.json({
            success: true,
            message: "Awarded ".concat(points, " points to user"),
            reference: bonusRef
          });
          _context9.next = 11;
          break;
        case 10:
          _context9.prev = 10;
          _t1 = _context9["catch"](4);
          console.error('Error awarding bonus:', _t1);
          res.status(500).json({
            error: 'Failed to award bonus'
          });
        case 11:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[4, 10]]);
  }));
  return function (_x15, _x16) {
    return _ref9.apply(this, arguments);
  };
}()));

/**
 * POST /rewards/admin/expire
 * Expire old unclaimed rewards (admin/cron job)
 */
router.post('/admin/expire', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref0 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(req, res) {
    var apiKey, _req$body$expiryDays, expiryDays, result, totalExpired, usersAffected, _iterator, _step, row, _t10, _t11;
    return _regenerator["default"].wrap(function (_context0) {
      while (1) switch (_context0.prev = _context0.next) {
        case 0:
          apiKey = req.headers['x-internal-api-key'] || req.headers['x-cron-key'];
          if (!(apiKey !== process.env.INTERNAL_API_KEY && apiKey !== process.env.CRON_API_KEY)) {
            _context0.next = 1;
            break;
          }
          return _context0.abrupt("return", res.status(403).json({
            error: 'Forbidden'
          }));
        case 1:
          _req$body$expiryDays = req.body.expiryDays, expiryDays = _req$body$expiryDays === void 0 ? 365 : _req$body$expiryDays;
          _context0.prev = 2;
          _context0.next = 3;
          return db.query("\n      WITH user_earned AS (\n        SELECT\n          user_id,\n          SUM(points) as total_earned,\n          MIN(created_at) as oldest_transaction\n        FROM bigcompany.rewards_ledger\n        WHERE type = 'earned' AND status = 'credited'\n        AND created_at < NOW() - INTERVAL '1 day' * $1\n        GROUP BY user_id\n      ),\n      user_used AS (\n        SELECT\n          user_id,\n          SUM(points) as total_used\n        FROM bigcompany.rewards_ledger\n        WHERE type IN ('redeemed', 'expired')\n        GROUP BY user_id\n      )\n      SELECT\n        e.user_id,\n        e.total_earned,\n        COALESCE(u.total_used, 0) as total_used,\n        e.total_earned - COALESCE(u.total_used, 0) as to_expire\n      FROM user_earned e\n      LEFT JOIN user_used u ON e.user_id = u.user_id\n      WHERE e.total_earned > COALESCE(u.total_used, 0)\n    ", [expiryDays]);
        case 3:
          result = _context0.sent;
          totalExpired = 0;
          usersAffected = 0;
          _iterator = _createForOfIteratorHelper(result.rows);
          _context0.prev = 4;
          _iterator.s();
        case 5:
          if ((_step = _iterator.n()).done) {
            _context0.next = 8;
            break;
          }
          row = _step.value;
          if (!(row.to_expire > 0)) {
            _context0.next = 7;
            break;
          }
          _context0.next = 6;
          return db.query("\n          INSERT INTO bigcompany.rewards_ledger\n          (user_id, type, source, points, description, transaction_ref, status)\n          VALUES ($1, 'expired', 'system', $2, $3, $4, 'processed')\n        ", [row.user_id, row.to_expire, "Points expired after ".concat(expiryDays, " days"), "EXPIRE-".concat(Date.now(), "-").concat(row.user_id.substring(0, 8))]);
        case 6:
          totalExpired += Number(row.to_expire);
          usersAffected++;
        case 7:
          _context0.next = 5;
          break;
        case 8:
          _context0.next = 10;
          break;
        case 9:
          _context0.prev = 9;
          _t10 = _context0["catch"](4);
          _iterator.e(_t10);
        case 10:
          _context0.prev = 10;
          _iterator.f();
          return _context0.finish(10);
        case 11:
          res.json({
            success: true,
            expired: {
              totalPoints: totalExpired,
              usersAffected: usersAffected,
              expiryPeriodDays: expiryDays
            }
          });
          _context0.next = 13;
          break;
        case 12:
          _context0.prev = 12;
          _t11 = _context0["catch"](2);
          console.error('Error expiring rewards:', _t11);
          res.status(500).json({
            error: 'Failed to expire rewards'
          });
        case 13:
        case "end":
          return _context0.stop();
      }
    }, _callee0, null, [[2, 12], [4, 9, 10, 11]]);
  }));
  return function (_x17, _x18) {
    return _ref0.apply(this, arguments);
  };
}()));

// ==================== HELPER FUNCTIONS ====================

function determineTier(points) {
  var tiers = REWARDS_CONFIG.LOYALTY_TIERS;
  if (points >= tiers.PLATINUM.minPoints) {
    return tiers.PLATINUM;
  } else if (points >= tiers.GOLD.minPoints) {
    return tiers.GOLD;
  } else if (points >= tiers.SILVER.minPoints) {
    return tiers.SILVER;
  }
  return tiers.BRONZE;
}
function getNextTier(points) {
  var tiers = REWARDS_CONFIG.LOYALTY_TIERS;
  if (points >= tiers.PLATINUM.minPoints) {
    return null; // Already at highest tier
  } else if (points >= tiers.GOLD.minPoints) {
    return 'Platinum';
  } else if (points >= tiers.SILVER.minPoints) {
    return 'Gold';
  }
  return 'Silver';
}
function getPointsToNextTier(points) {
  var tiers = REWARDS_CONFIG.LOYALTY_TIERS;
  if (points >= tiers.PLATINUM.minPoints) {
    return null; // Already at highest tier
  } else if (points >= tiers.GOLD.minPoints) {
    return tiers.PLATINUM.minPoints - points;
  } else if (points >= tiers.SILVER.minPoints) {
    return tiers.GOLD.minPoints - points;
  }
  return tiers.SILVER.minPoints - points;
}
function generateReferralCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars
  var code = 'BIG';
  for (var i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
var _default = exports["default"] = router;