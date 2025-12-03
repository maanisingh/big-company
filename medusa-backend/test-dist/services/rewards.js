"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _pg = require("pg");
var _gas = _interopRequireDefault(require("./gas"));
var _sms = _interopRequireDefault(require("./sms"));
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var RewardsService = /*#__PURE__*/function () {
  function RewardsService() {
    (0, _classCallCheck2["default"])(this, RewardsService);
    (0, _defineProperty2["default"])(this, "db", void 0);
    (0, _defineProperty2["default"])(this, "gasService", void 0);
    (0, _defineProperty2["default"])(this, "smsService", void 0);
    (0, _defineProperty2["default"])(this, "config", void 0);
    this.db = new _pg.Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.gasService = new _gas["default"]();
    this.smsService = new _sms["default"]();
    this.config = {
      minProfitThreshold: 1000,
      // Minimum profit in RWF to trigger reward
      rewardPercentage: 12 // 12% of profit as gas reward
    };
    this.loadConfig();
  }

  /**
   * Load reward configuration from database
   */
  return (0, _createClass2["default"])(RewardsService, [{
    key: "loadConfig",
    value: (function () {
      var _loadConfig = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var threshold, percentage, _t;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;
              _context.next = 1;
              return this.db.query("SELECT value FROM bigcompany.system_settings WHERE category = 'gas_rewards' AND key = 'min_profit_threshold'");
            case 1:
              threshold = _context.sent;
              _context.next = 2;
              return this.db.query("SELECT value FROM bigcompany.system_settings WHERE category = 'gas_rewards' AND key = 'reward_percentage'");
            case 2:
              percentage = _context.sent;
              if (threshold.rows[0]) {
                this.config.minProfitThreshold = parseInt(threshold.rows[0].value);
              }
              if (percentage.rows[0]) {
                this.config.rewardPercentage = parseFloat(percentage.rows[0].value);
              }
              _context.next = 4;
              break;
            case 3:
              _context.prev = 3;
              _t = _context["catch"](0);
              console.log('Using default reward config');
            case 4:
            case "end":
              return _context.stop();
          }
        }, _callee, this, [[0, 3]]);
      }));
      function loadConfig() {
        return _loadConfig.apply(this, arguments);
      }
      return loadConfig;
    }()
    /**
     * Update reward configuration (admin)
     */
    )
  }, {
    key: "updateConfig",
    value: (function () {
      var _updateConfig = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(updates) {
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              if (!(updates.minProfitThreshold !== undefined)) {
                _context2.next = 2;
                break;
              }
              _context2.next = 1;
              return this.db.query("\n        INSERT INTO bigcompany.system_settings (category, key, value, description)\n        VALUES ('gas_rewards', 'min_profit_threshold', $1, 'Minimum profit to trigger reward')\n        ON CONFLICT (category, key) DO UPDATE SET value = $1, updated_at = NOW()\n      ", [updates.minProfitThreshold.toString()]);
            case 1:
              this.config.minProfitThreshold = updates.minProfitThreshold;
            case 2:
              if (!(updates.rewardPercentage !== undefined)) {
                _context2.next = 4;
                break;
              }
              _context2.next = 3;
              return this.db.query("\n        INSERT INTO bigcompany.system_settings (category, key, value, description)\n        VALUES ('gas_rewards', 'reward_percentage', $1, 'Percentage of profit as reward')\n        ON CONFLICT (category, key) DO UPDATE SET value = $1, updated_at = NOW()\n      ", [updates.rewardPercentage.toString()]);
            case 3:
              this.config.rewardPercentage = updates.rewardPercentage;
            case 4:
              return _context2.abrupt("return", this.config);
            case 5:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function updateConfig(_x) {
        return _updateConfig.apply(this, arguments);
      }
      return updateConfig;
    }()
    /**
     * Get current configuration
     */
    )
  }, {
    key: "getConfig",
    value: function getConfig() {
      return _objectSpread({}, this.config);
    }

    /**
     * Calculate reward for an order
     */
  }, {
    key: "calculateReward",
    value: (function () {
      var _calculateReward = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(orderId, profitAmount) {
        var rewardAmount;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              if (!(profitAmount < this.config.minProfitThreshold)) {
                _context3.next = 1;
                break;
              }
              return _context3.abrupt("return", {
                eligible: false,
                profitAmount: profitAmount,
                rewardAmount: 0,
                reason: "Profit (".concat(profitAmount.toLocaleString(), " RWF) below threshold (").concat(this.config.minProfitThreshold.toLocaleString(), " RWF)")
              });
            case 1:
              rewardAmount = Math.floor(profitAmount * this.config.rewardPercentage / 100);
              return _context3.abrupt("return", {
                eligible: true,
                profitAmount: profitAmount,
                rewardAmount: rewardAmount
              });
            case 2:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function calculateReward(_x2, _x3) {
        return _calculateReward.apply(this, arguments);
      }
      return calculateReward;
    }()
    /**
     * Process reward for completed order
     *
     * @param userId - Customer ID
     * @param orderId - Order/transaction ID
     * @param profitAmount - Total order profit
     * @param walletFundedAmount - Amount paid from wallet (not loan) - only this portion earns rewards
     * @param meterId - Optional meter ID to credit directly
     */
    )
  }, {
    key: "processOrderReward",
    value: (function () {
      var _processOrderReward = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(userId, orderId, profitAmount, walletFundedAmount, meterId) {
        var calculation, totalOrderAmount, walletFundingRatio, adjustedRewardAmount, existing, targetMeterId, defaultMeter, result, reward;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              if (!(walletFundedAmount <= 0)) {
                _context4.next = 1;
                break;
              }
              return _context4.abrupt("return", {
                success: false,
                error: 'No wallet funds used in this transaction. Loan-funded purchases do not earn gas rewards.'
              });
            case 1:
              _context4.next = 2;
              return this.calculateReward(orderId, profitAmount);
            case 2:
              calculation = _context4.sent;
              if (calculation.eligible) {
                _context4.next = 3;
                break;
              }
              return _context4.abrupt("return", {
                success: false,
                error: calculation.reason
              });
            case 3:
              // Adjust reward amount based on wallet funding ratio
              totalOrderAmount = profitAmount; // Assuming profit correlates to order amount
              walletFundingRatio = Math.min(walletFundedAmount / totalOrderAmount, 1.0);
              adjustedRewardAmount = Math.floor(calculation.rewardAmount * walletFundingRatio);
              if (!(adjustedRewardAmount <= 0)) {
                _context4.next = 4;
                break;
              }
              return _context4.abrupt("return", {
                success: false,
                error: 'Reward amount too small after wallet funding adjustment'
              });
            case 4:
              _context4.next = 5;
              return this.db.query('SELECT * FROM bigcompany.gas_rewards WHERE order_id = $1', [orderId]);
            case 5:
              existing = _context4.sent;
              if (!(existing.rows.length > 0)) {
                _context4.next = 6;
                break;
              }
              return _context4.abrupt("return", {
                success: false,
                error: 'Reward already processed for this order'
              });
            case 6:
              // Get user's default meter if not specified
              targetMeterId = meterId;
              if (targetMeterId) {
                _context4.next = 8;
                break;
              }
              _context4.next = 7;
              return this.db.query("\n        SELECT id FROM bigcompany.utility_meters\n        WHERE user_id = $1 AND meter_type = 'gas' AND is_verified = true\n        ORDER BY created_at ASC\n        LIMIT 1\n      ", [userId]);
            case 7:
              defaultMeter = _context4.sent;
              if (defaultMeter.rows.length > 0) {
                targetMeterId = defaultMeter.rows[0].id;
              }
            case 8:
              _context4.next = 9;
              return this.db.query("\n      INSERT INTO bigcompany.gas_rewards\n      (user_id, order_id, profit_amount, reward_percentage, reward_amount, meter_id, status, metadata)\n      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)\n      RETURNING *\n    ", [userId, orderId, profitAmount, this.config.rewardPercentage, adjustedRewardAmount, targetMeterId, JSON.stringify({
                wallet_funded_amount: walletFundedAmount,
                wallet_funding_ratio: walletFundingRatio,
                original_reward_amount: calculation.rewardAmount,
                adjusted_reward_amount: adjustedRewardAmount
              })]);
            case 9:
              result = _context4.sent;
              reward = this.mapReward(result.rows[0]); // If meter is specified, auto-credit
              if (!targetMeterId) {
                _context4.next = 10;
                break;
              }
              return _context4.abrupt("return", this.creditReward(reward.id));
            case 10:
              return _context4.abrupt("return", {
                success: true,
                reward: reward
              });
            case 11:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function processOrderReward(_x4, _x5, _x6, _x7, _x8) {
        return _processOrderReward.apply(this, arguments);
      }
      return processOrderReward;
    }()
    /**
     * Credit pending reward to meter
     */
    )
  }, {
    key: "creditReward",
    value: (function () {
      var _creditReward = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(rewardId, meterId) {
        var reward, rewardData, targetMeterId, meter, _customer$rows$, gasResult, updated, customer, _t2;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 1;
              return this.db.query('SELECT * FROM bigcompany.gas_rewards WHERE id = $1', [rewardId]);
            case 1:
              reward = _context5.sent;
              if (!(reward.rows.length === 0)) {
                _context5.next = 2;
                break;
              }
              return _context5.abrupt("return", {
                success: false,
                error: 'Reward not found'
              });
            case 2:
              rewardData = reward.rows[0];
              if (!(rewardData.status === 'credited')) {
                _context5.next = 3;
                break;
              }
              return _context5.abrupt("return", {
                success: false,
                error: 'Reward already credited'
              });
            case 3:
              targetMeterId = meterId || rewardData.meter_id;
              if (targetMeterId) {
                _context5.next = 4;
                break;
              }
              return _context5.abrupt("return", {
                success: false,
                error: 'No meter specified for reward'
              });
            case 4:
              _context5.next = 5;
              return this.db.query('SELECT * FROM bigcompany.utility_meters WHERE id = $1', [targetMeterId]);
            case 5:
              meter = _context5.sent;
              if (!(meter.rows.length === 0)) {
                _context5.next = 6;
                break;
              }
              return _context5.abrupt("return", {
                success: false,
                error: 'Meter not found'
              });
            case 6:
              _context5.prev = 6;
              _context5.next = 7;
              return this.gasService.purchaseUnits({
                meterNumber: meter.rows[0].meter_number,
                amount: rewardData.reward_amount,
                customerId: rewardData.user_id,
                phone: '' // Will be looked up by gas service
              });
            case 7:
              gasResult = _context5.sent;
              if (gasResult.success) {
                _context5.next = 9;
                break;
              }
              _context5.next = 8;
              return this.db.query("\n          UPDATE bigcompany.gas_rewards\n          SET status = 'failed', metadata = metadata || $1\n          WHERE id = $2\n        ", [JSON.stringify({
                error: gasResult.error
              }), rewardId]);
            case 8:
              return _context5.abrupt("return", {
                success: false,
                error: gasResult.error
              });
            case 9:
              _context5.next = 10;
              return this.db.query("\n        UPDATE bigcompany.gas_rewards\n        SET status = 'credited', credited_at = NOW(), meter_id = $1,\n            metadata = metadata || $2\n        WHERE id = $3\n        RETURNING *\n      ", [targetMeterId, JSON.stringify({
                gas_token: gasResult.token,
                gas_units: gasResult.units,
                gas_transaction_id: gasResult.transactionId
              }), rewardId]);
            case 10:
              updated = _context5.sent;
              _context5.next = 11;
              return this.db.query("SELECT phone FROM customer WHERE id = $1", [rewardData.user_id]);
            case 11:
              customer = _context5.sent;
              if (!((_customer$rows$ = customer.rows[0]) !== null && _customer$rows$ !== void 0 && _customer$rows$.phone)) {
                _context5.next = 12;
                break;
              }
              _context5.next = 12;
              return this.smsService.sendGasTopupConfirmation(customer.rows[0].phone, meter.rows[0].meter_number, rewardData.reward_amount, gasResult.units || 0, gasResult.token || '');
            case 12:
              return _context5.abrupt("return", {
                success: true,
                reward: this.mapReward(updated.rows[0])
              });
            case 13:
              _context5.prev = 13;
              _t2 = _context5["catch"](6);
              console.error('Reward credit error:', _t2);
              _context5.next = 14;
              return this.db.query("\n        UPDATE bigcompany.gas_rewards\n        SET status = 'failed', metadata = metadata || $1\n        WHERE id = $2\n      ", [JSON.stringify({
                error: _t2.message
              }), rewardId]);
            case 14:
              return _context5.abrupt("return", {
                success: false,
                error: 'Failed to credit reward'
              });
            case 15:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this, [[6, 13]]);
      }));
      function creditReward(_x9, _x0) {
        return _creditReward.apply(this, arguments);
      }
      return creditReward;
    }()
    /**
     * Get user's rewards
     */
    )
  }, {
    key: "getUserRewards",
    value: (function () {
      var _getUserRewards = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(userId) {
        var limit,
          result,
          _args6 = arguments;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              limit = _args6.length > 1 && _args6[1] !== undefined ? _args6[1] : 20;
              _context6.next = 1;
              return this.db.query("\n      SELECT r.*, m.meter_number, m.alias as meter_alias\n      FROM bigcompany.gas_rewards r\n      LEFT JOIN bigcompany.utility_meters m ON r.meter_id = m.id\n      WHERE r.user_id = $1\n      ORDER BY r.created_at DESC\n      LIMIT $2\n    ", [userId, limit]);
            case 1:
              result = _context6.sent;
              return _context6.abrupt("return", result.rows.map(this.mapReward));
            case 2:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function getUserRewards(_x1) {
        return _getUserRewards.apply(this, arguments);
      }
      return getUserRewards;
    }()
    /**
     * Get user's total rewards
     */
    )
  }, {
    key: "getUserRewardTotals",
    value: (function () {
      var _getUserRewardTotals = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(userId) {
        var result, data;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              _context7.next = 1;
              return this.db.query("\n      SELECT\n        COALESCE(SUM(reward_amount), 0) as total_rewards,\n        COALESCE(SUM(CASE WHEN status = 'credited' THEN reward_amount ELSE 0 END), 0) as total_credited,\n        COALESCE(SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END), 0) as total_pending,\n        COUNT(*) as reward_count\n      FROM bigcompany.gas_rewards\n      WHERE user_id = $1\n    ", [userId]);
            case 1:
              result = _context7.sent;
              data = result.rows[0];
              return _context7.abrupt("return", {
                totalRewards: parseFloat(data.total_rewards) || 0,
                totalCredited: parseFloat(data.total_credited) || 0,
                totalPending: parseFloat(data.total_pending) || 0,
                rewardCount: parseInt(data.reward_count) || 0
              });
            case 2:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function getUserRewardTotals(_x10) {
        return _getUserRewardTotals.apply(this, arguments);
      }
      return getUserRewardTotals;
    }()
    /**
     * Get pending rewards (admin)
     */
    )
  }, {
    key: "getPendingRewards",
    value: (function () {
      var _getPendingRewards = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8() {
        var result;
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              _context8.next = 1;
              return this.db.query("\n      SELECT r.*, m.meter_number, m.alias as meter_alias,\n             c.first_name, c.last_name, c.email\n      FROM bigcompany.gas_rewards r\n      LEFT JOIN bigcompany.utility_meters m ON r.meter_id = m.id\n      LEFT JOIN customer c ON r.user_id = c.id\n      WHERE r.status = 'pending'\n      ORDER BY r.created_at ASC\n    ");
            case 1:
              result = _context8.sent;
              return _context8.abrupt("return", result.rows.map(this.mapReward));
            case 2:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this);
      }));
      function getPendingRewards() {
        return _getPendingRewards.apply(this, arguments);
      }
      return getPendingRewards;
    }()
    /**
     * Get failed rewards (admin)
     */
    )
  }, {
    key: "getFailedRewards",
    value: (function () {
      var _getFailedRewards = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9() {
        var result;
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 1;
              return this.db.query("\n      SELECT r.*, m.meter_number, m.alias as meter_alias,\n             c.first_name, c.last_name, c.email\n      FROM bigcompany.gas_rewards r\n      LEFT JOIN bigcompany.utility_meters m ON r.meter_id = m.id\n      LEFT JOIN customer c ON r.user_id = c.id\n      WHERE r.status = 'failed'\n      ORDER BY r.created_at DESC\n    ");
            case 1:
              result = _context9.sent;
              return _context9.abrupt("return", result.rows.map(this.mapReward));
            case 2:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function getFailedRewards() {
        return _getFailedRewards.apply(this, arguments);
      }
      return getFailedRewards;
    }()
    /**
     * Retry failed reward (admin)
     */
    )
  }, {
    key: "retryFailedReward",
    value: (function () {
      var _retryFailedReward = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(rewardId) {
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              _context0.next = 1;
              return this.db.query("\n      UPDATE bigcompany.gas_rewards\n      SET status = 'pending', metadata = metadata || '{\"retry\": true}'\n      WHERE id = $1 AND status = 'failed'\n    ", [rewardId]);
            case 1:
              return _context0.abrupt("return", this.creditReward(rewardId));
            case 2:
            case "end":
              return _context0.stop();
          }
        }, _callee0, this);
      }));
      function retryFailedReward(_x11) {
        return _retryFailedReward.apply(this, arguments);
      }
      return retryFailedReward;
    }()
    /**
     * Manual reward adjustment (admin)
     */
    )
  }, {
    key: "adjustReward",
    value: (function () {
      var _adjustReward = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(rewardId, adminId, newAmount, reason) {
        var reward, oldAmount;
        return _regenerator["default"].wrap(function (_context1) {
          while (1) switch (_context1.prev = _context1.next) {
            case 0:
              _context1.next = 1;
              return this.db.query('SELECT * FROM bigcompany.gas_rewards WHERE id = $1', [rewardId]);
            case 1:
              reward = _context1.sent;
              if (!(reward.rows.length === 0)) {
                _context1.next = 2;
                break;
              }
              return _context1.abrupt("return", {
                success: false,
                error: 'Reward not found'
              });
            case 2:
              if (!(reward.rows[0].status === 'credited')) {
                _context1.next = 3;
                break;
              }
              return _context1.abrupt("return", {
                success: false,
                error: 'Cannot adjust already credited reward'
              });
            case 3:
              oldAmount = reward.rows[0].reward_amount;
              _context1.next = 4;
              return this.db.query("\n      UPDATE bigcompany.gas_rewards\n      SET reward_amount = $1, metadata = metadata || $2\n      WHERE id = $3\n    ", [newAmount, JSON.stringify({
                adjustment: {
                  old_amount: oldAmount,
                  new_amount: newAmount,
                  adjusted_by: adminId,
                  reason: reason,
                  adjusted_at: new Date()
                }
              }), rewardId]);
            case 4:
              _context1.next = 5;
              return this.db.query("\n      INSERT INTO bigcompany.audit_logs\n      (user_id, action, entity_type, entity_id, old_values, new_values)\n      VALUES ($1, 'reward_adjustment', 'gas_reward', $2, $3, $4)\n    ", [adminId, rewardId, JSON.stringify({
                reward_amount: oldAmount
              }), JSON.stringify({
                reward_amount: newAmount,
                reason: reason
              })]);
            case 5:
              return _context1.abrupt("return", {
                success: true
              });
            case 6:
            case "end":
              return _context1.stop();
          }
        }, _callee1, this);
      }));
      function adjustReward(_x12, _x13, _x14, _x15) {
        return _adjustReward.apply(this, arguments);
      }
      return adjustReward;
    }()
    /**
     * Get reward statistics (admin)
     */
    )
  }, {
    key: "getRewardStatistics",
    value: (function () {
      var _getRewardStatistics = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(fromDate, toDate) {
        var dateCondition, params, stats, byStatus, statusMap, data;
        return _regenerator["default"].wrap(function (_context10) {
          while (1) switch (_context10.prev = _context10.next) {
            case 0:
              dateCondition = '';
              params = [];
              if (fromDate) {
                params.push(fromDate);
                dateCondition += " AND created_at >= $".concat(params.length);
              }
              if (toDate) {
                params.push(toDate);
                dateCondition += " AND created_at <= $".concat(params.length);
              }
              _context10.next = 1;
              return this.db.query("\n      SELECT\n        COALESCE(SUM(reward_amount), 0) as total_generated,\n        COALESCE(SUM(CASE WHEN status = 'credited' THEN reward_amount ELSE 0 END), 0) as total_credited,\n        COALESCE(SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END), 0) as total_pending,\n        COALESCE(SUM(CASE WHEN status = 'failed' THEN reward_amount ELSE 0 END), 0) as total_failed,\n        COUNT(*) as reward_count,\n        AVG(reward_amount) as avg_amount\n      FROM bigcompany.gas_rewards\n      WHERE 1=1 ".concat(dateCondition, "\n    "), params);
            case 1:
              stats = _context10.sent;
              _context10.next = 2;
              return this.db.query("\n      SELECT status, COUNT(*) as count, COALESCE(SUM(reward_amount), 0) as amount\n      FROM bigcompany.gas_rewards\n      WHERE 1=1 ".concat(dateCondition, "\n      GROUP BY status\n    "), params);
            case 2:
              byStatus = _context10.sent;
              statusMap = {};
              byStatus.rows.forEach(function (row) {
                statusMap[row.status] = {
                  count: parseInt(row.count),
                  amount: parseFloat(row.amount)
                };
              });
              data = stats.rows[0];
              return _context10.abrupt("return", {
                totalRewardsGenerated: parseFloat(data.total_generated) || 0,
                totalRewardsCredited: parseFloat(data.total_credited) || 0,
                totalRewardsPending: parseFloat(data.total_pending) || 0,
                totalRewardsFailed: parseFloat(data.total_failed) || 0,
                rewardCount: parseInt(data.reward_count) || 0,
                avgRewardAmount: parseFloat(data.avg_amount) || 0,
                byStatus: statusMap
              });
            case 3:
            case "end":
              return _context10.stop();
          }
        }, _callee10, this);
      }));
      function getRewardStatistics(_x16, _x17) {
        return _getRewardStatistics.apply(this, arguments);
      }
      return getRewardStatistics;
    }()
    /**
     * Process batch rewards (cron job)
     */
    )
  }, {
    key: "processPendingRewards",
    value: (function () {
      var _processPendingRewards = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11() {
        var batchSize,
          pending,
          successful,
          failed,
          _iterator,
          _step,
          reward,
          result,
          _args11 = arguments,
          _t3;
        return _regenerator["default"].wrap(function (_context11) {
          while (1) switch (_context11.prev = _context11.next) {
            case 0:
              batchSize = _args11.length > 0 && _args11[0] !== undefined ? _args11[0] : 10;
              _context11.next = 1;
              return this.db.query("\n      SELECT * FROM bigcompany.gas_rewards\n      WHERE status = 'pending' AND meter_id IS NOT NULL\n      ORDER BY created_at ASC\n      LIMIT $1\n    ", [batchSize]);
            case 1:
              pending = _context11.sent;
              successful = 0;
              failed = 0;
              _iterator = _createForOfIteratorHelper(pending.rows);
              _context11.prev = 2;
              _iterator.s();
            case 3:
              if ((_step = _iterator.n()).done) {
                _context11.next = 6;
                break;
              }
              reward = _step.value;
              _context11.next = 4;
              return this.creditReward(reward.id);
            case 4:
              result = _context11.sent;
              if (result.success) {
                successful++;
              } else {
                failed++;
              }
            case 5:
              _context11.next = 3;
              break;
            case 6:
              _context11.next = 8;
              break;
            case 7:
              _context11.prev = 7;
              _t3 = _context11["catch"](2);
              _iterator.e(_t3);
            case 8:
              _context11.prev = 8;
              _iterator.f();
              return _context11.finish(8);
            case 9:
              return _context11.abrupt("return", {
                processed: pending.rows.length,
                successful: successful,
                failed: failed
              });
            case 10:
            case "end":
              return _context11.stop();
          }
        }, _callee11, this, [[2, 7, 8, 9]]);
      }));
      function processPendingRewards() {
        return _processPendingRewards.apply(this, arguments);
      }
      return processPendingRewards;
    }() // ==================== HELPERS ====================
    )
  }, {
    key: "mapReward",
    value: function mapReward(row) {
      return {
        id: row.id,
        userId: row.user_id,
        orderId: row.order_id,
        profitAmount: parseFloat(row.profit_amount),
        rewardPercentage: parseFloat(row.reward_percentage),
        rewardAmount: parseFloat(row.reward_amount),
        meterId: row.meter_id,
        status: row.status,
        creditedAt: row.credited_at,
        metadata: row.metadata || {},
        createdAt: row.created_at
      };
    }
  }, {
    key: "close",
    value: function () {
      var _close = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12() {
        return _regenerator["default"].wrap(function (_context12) {
          while (1) switch (_context12.prev = _context12.next) {
            case 0:
              _context12.next = 1;
              return this.db.end();
            case 1:
            case "end":
              return _context12.stop();
          }
        }, _callee12, this);
      }));
      function close() {
        return _close.apply(this, arguments);
      }
      return close;
    }()
  }]);
}();
var _default = exports["default"] = RewardsService;