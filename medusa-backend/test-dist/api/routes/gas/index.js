"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _medusa = require("@medusajs/medusa");
var _gas = _interopRequireDefault(require("../../../services/gas"));
var _rewards = _interopRequireDefault(require("../../../services/rewards"));
var _sms = _interopRequireDefault(require("../../../services/sms"));
var _pg = require("pg");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var router = (0, _express.Router)();
var db = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});
var gasService = new _gas["default"]();
var rewardsService = new _rewards["default"]();
var smsService = new _sms["default"]();
var VALID_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];

/**
 * Register a gas meter
 * POST /store/gas/meters
 */
router.post('/meters', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _req$user;
    var customerId, _req$body, meter_number, alias, meterInfo, existingMeter, result, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          customerId = (_req$user = req.user) === null || _req$user === void 0 ? void 0 : _req$user.customer_id;
          _req$body = req.body, meter_number = _req$body.meter_number, alias = _req$body.alias;
          if (customerId) {
            _context.next = 1;
            break;
          }
          return _context.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          if (meter_number) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return", res.status(400).json({
            error: 'Meter number is required'
          }));
        case 2:
          _context.prev = 2;
          _context.next = 3;
          return gasService.validateMeter(meter_number);
        case 3:
          meterInfo = _context.sent;
          if (meterInfo) {
            _context.next = 4;
            break;
          }
          return _context.abrupt("return", res.status(400).json({
            error: 'Invalid meter number. Please check and try again.'
          }));
        case 4:
          _context.next = 5;
          return db.query("\n      SELECT user_id FROM bigcompany.utility_meters\n      WHERE meter_number = $1 AND user_id IS NOT NULL AND user_id != $2\n    ", [meterInfo.meterNumber, customerId]);
        case 5:
          existingMeter = _context.sent;
          if (!(existingMeter.rows.length > 0)) {
            _context.next = 6;
            break;
          }
          return _context.abrupt("return", res.status(400).json({
            error: 'This meter is already linked to another account'
          }));
        case 6:
          _context.next = 7;
          return db.query("\n      INSERT INTO bigcompany.utility_meters (user_id, meter_type, meter_number, alias, provider, is_verified, metadata)\n      VALUES ($1, 'gas', $2, $3, 'sts', true, $4)\n      ON CONFLICT (meter_number, provider) DO UPDATE\n      SET user_id = $1, alias = COALESCE($3, bigcompany.utility_meters.alias), is_verified = true, updated_at = NOW()\n      RETURNING *\n    ", [customerId, meterInfo.meterNumber, alias || meterInfo.customerName || "Gas Meter ".concat(meterInfo.meterNumber), JSON.stringify(meterInfo)]);
        case 7:
          result = _context.sent;
          res.json({
            success: true,
            meter: {
              id: result.rows[0].id,
              meter_number: result.rows[0].meter_number,
              alias: result.rows[0].alias,
              customer_name: meterInfo.customerName,
              address: meterInfo.address,
              tariff: meterInfo.tariff,
              is_verified: true
            }
          });
          _context.next = 9;
          break;
        case 8:
          _context.prev = 8;
          _t = _context["catch"](2);
          console.error('Meter registration error:', _t);
          res.status(500).json({
            error: _t.message
          });
        case 9:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[2, 8]]);
  }));
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}()));

/**
 * Get customer's gas meters
 * GET /store/gas/meters
 */
router.get('/meters', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$user2;
    var customerId, meters, metersWithHistory, _t2;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          customerId = (_req$user2 = req.user) === null || _req$user2 === void 0 ? void 0 : _req$user2.customer_id;
          if (customerId) {
            _context3.next = 1;
            break;
          }
          return _context3.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context3.prev = 1;
          _context3.next = 2;
          return db.query("\n      SELECT\n        id,\n        meter_number,\n        alias,\n        provider,\n        is_verified,\n        is_default,\n        metadata,\n        created_at\n      FROM bigcompany.utility_meters\n      WHERE user_id = $1 AND meter_type = 'gas'\n      ORDER BY is_default DESC, created_at DESC\n    ", [customerId]);
        case 2:
          meters = _context3.sent;
          _context3.next = 3;
          return Promise.all(meters.rows.map(/*#__PURE__*/function () {
            var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(meter) {
              var lastTopup;
              return _regenerator["default"].wrap(function (_context2) {
                while (1) switch (_context2.prev = _context2.next) {
                  case 0:
                    _context2.next = 1;
                    return db.query("\n        SELECT amount, token, units_purchased, created_at\n        FROM bigcompany.utility_topups\n        WHERE meter_id = $1 AND status = 'success'\n        ORDER BY created_at DESC\n        LIMIT 1\n      ", [meter.id]);
                  case 1:
                    lastTopup = _context2.sent;
                    return _context2.abrupt("return", _objectSpread(_objectSpread({}, meter), {}, {
                      last_topup: lastTopup.rows[0] || null
                    }));
                  case 2:
                  case "end":
                    return _context2.stop();
                }
              }, _callee2);
            }));
            return function (_x5) {
              return _ref3.apply(this, arguments);
            };
          }()));
        case 3:
          metersWithHistory = _context3.sent;
          res.json({
            meters: metersWithHistory
          });
          _context3.next = 5;
          break;
        case 4:
          _context3.prev = 4;
          _t2 = _context3["catch"](1);
          console.error('Get meters error:', _t2);
          res.status(500).json({
            error: _t2.message
          });
        case 5:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[1, 4]]);
  }));
  return function (_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}()));

/**
 * Set default meter
 * POST /store/gas/meters/:id/default
 */
router.post('/meters/:id/default', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$user3;
    var customerId, meterId, result, _t3;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          customerId = (_req$user3 = req.user) === null || _req$user3 === void 0 ? void 0 : _req$user3.customer_id;
          meterId = req.params.id;
          if (customerId) {
            _context4.next = 1;
            break;
          }
          return _context4.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context4.prev = 1;
          _context4.next = 2;
          return db.query("\n      UPDATE bigcompany.utility_meters\n      SET is_default = false\n      WHERE user_id = $1 AND meter_type = 'gas'\n    ", [customerId]);
        case 2:
          _context4.next = 3;
          return db.query("\n      UPDATE bigcompany.utility_meters\n      SET is_default = true, updated_at = NOW()\n      WHERE id = $1 AND user_id = $2\n      RETURNING *\n    ", [meterId, customerId]);
        case 3:
          result = _context4.sent;
          if (!(result.rows.length === 0)) {
            _context4.next = 4;
            break;
          }
          return _context4.abrupt("return", res.status(404).json({
            error: 'Meter not found'
          }));
        case 4:
          res.json({
            success: true,
            meter: result.rows[0]
          });
          _context4.next = 6;
          break;
        case 5:
          _context4.prev = 5;
          _t3 = _context4["catch"](1);
          console.error('Set default meter error:', _t3);
          res.status(500).json({
            error: _t3.message
          });
        case 6:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[1, 5]]);
  }));
  return function (_x6, _x7) {
    return _ref4.apply(this, arguments);
  };
}()));

/**
 * Delete meter
 * DELETE /store/gas/meters/:id
 */
router["delete"]('/meters/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$user4;
    var customerId, meterId, result, _t4;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          customerId = (_req$user4 = req.user) === null || _req$user4 === void 0 ? void 0 : _req$user4.customer_id;
          meterId = req.params.id;
          if (customerId) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context5.prev = 1;
          _context5.next = 2;
          return db.query("\n      DELETE FROM bigcompany.utility_meters\n      WHERE id = $1 AND user_id = $2\n      RETURNING id\n    ", [meterId, customerId]);
        case 2:
          result = _context5.sent;
          if (!(result.rows.length === 0)) {
            _context5.next = 3;
            break;
          }
          return _context5.abrupt("return", res.status(404).json({
            error: 'Meter not found'
          }));
        case 3:
          res.json({
            success: true,
            message: 'Meter removed successfully'
          });
          _context5.next = 5;
          break;
        case 4:
          _context5.prev = 4;
          _t4 = _context5["catch"](1);
          console.error('Delete meter error:', _t4);
          res.status(500).json({
            error: _t4.message
          });
        case 5:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[1, 4]]);
  }));
  return function (_x8, _x9) {
    return _ref5.apply(this, arguments);
  };
}()));

/**
 * Validate meter number (without registering)
 * POST /store/gas/validate
 */
router.post('/validate', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var meter_number, meterInfo, _t5;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          meter_number = req.body.meter_number;
          if (meter_number) {
            _context6.next = 1;
            break;
          }
          return _context6.abrupt("return", res.status(400).json({
            error: 'Meter number is required'
          }));
        case 1:
          _context6.prev = 1;
          _context6.next = 2;
          return gasService.validateMeter(meter_number);
        case 2:
          meterInfo = _context6.sent;
          if (meterInfo) {
            res.json({
              valid: true,
              meter: meterInfo
            });
          } else {
            res.json({
              valid: false,
              error: 'Invalid meter number'
            });
          }
          _context6.next = 4;
          break;
        case 3:
          _context6.prev = 3;
          _t5 = _context6["catch"](1);
          console.error('Meter validation error:', _t5);
          res.status(500).json({
            error: _t5.message
          });
        case 4:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[1, 3]]);
  }));
  return function (_x0, _x1) {
    return _ref6.apply(this, arguments);
  };
}()));

/**
 * Purchase gas top-up
 * POST /store/gas/topup
 */
router.post('/topup', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var _req$user5;
    var blnkService, customerId, _req$body2, meter_id, meter_number, amount, _customer$rows$, _customer$rows$2, targetMeterNumber, targetMeterId, meters, meterInfo, defaultMeter, balance, foodLoanResult, foodLoanCredit, totalAvailable, customer, phone, purchaseResult, paymentSource, loanUsage, walletUsage, _t6, _t7;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          blnkService = req.scope.resolve('blnkService');
          customerId = (_req$user5 = req.user) === null || _req$user5 === void 0 ? void 0 : _req$user5.customer_id;
          _req$body2 = req.body, meter_id = _req$body2.meter_id, meter_number = _req$body2.meter_number, amount = _req$body2.amount;
          if (customerId) {
            _context7.next = 1;
            break;
          }
          return _context7.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          if (VALID_AMOUNTS.includes(amount)) {
            _context7.next = 2;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Invalid amount',
            valid_amounts: VALID_AMOUNTS
          }));
        case 2:
          _context7.prev = 2;
          targetMeterId = null; // Get meter details
          if (!meter_id) {
            _context7.next = 5;
            break;
          }
          _context7.next = 3;
          return db.query("\n        SELECT * FROM bigcompany.utility_meters WHERE id = $1 AND user_id = $2\n      ", [meter_id, customerId]);
        case 3:
          meters = _context7.sent;
          if (!(meters.rows.length === 0)) {
            _context7.next = 4;
            break;
          }
          return _context7.abrupt("return", res.status(404).json({
            error: 'Meter not found'
          }));
        case 4:
          targetMeterNumber = meters.rows[0].meter_number;
          targetMeterId = meters.rows[0].id;
          _context7.next = 11;
          break;
        case 5:
          if (!meter_number) {
            _context7.next = 8;
            break;
          }
          _context7.next = 6;
          return gasService.validateMeter(meter_number);
        case 6:
          meterInfo = _context7.sent;
          if (meterInfo) {
            _context7.next = 7;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Invalid meter number'
          }));
        case 7:
          targetMeterNumber = meterInfo.meterNumber;
          _context7.next = 11;
          break;
        case 8:
          _context7.next = 9;
          return db.query("\n        SELECT * FROM bigcompany.utility_meters\n        WHERE user_id = $1 AND meter_type = 'gas' AND is_default = true\n      ", [customerId]);
        case 9:
          defaultMeter = _context7.sent;
          if (!(defaultMeter.rows.length === 0)) {
            _context7.next = 10;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'No meter specified and no default meter set'
          }));
        case 10:
          targetMeterNumber = defaultMeter.rows[0].meter_number;
          targetMeterId = defaultMeter.rows[0].id;
        case 11:
          _context7.next = 12;
          return blnkService.getCustomerBalance(customerId, 'customer_wallets');
        case 12:
          balance = _context7.sent;
          _context7.next = 13;
          return db.query("\n      SELECT principal, used_amount\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      WHERE l.borrower_id = $1 AND l.status IN ('disbursed', 'active') AND lp.loan_type = 'food_loan'\n    ", [customerId]);
        case 13:
          foodLoanResult = _context7.sent;
          foodLoanCredit = foodLoanResult.rows.length > 0 ? foodLoanResult.rows[0].principal - (foodLoanResult.rows[0].used_amount || 0) : 0;
          totalAvailable = balance + foodLoanCredit;
          if (!(totalAvailable < amount)) {
            _context7.next = 14;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Insufficient balance',
            balance: balance,
            food_loan_credit: foodLoanCredit,
            total_available: totalAvailable,
            required: amount
          }));
        case 14:
          _context7.next = 15;
          return db.query("SELECT phone, metadata->>'phone' as meta_phone FROM customer WHERE id = $1", [customerId]);
        case 15:
          customer = _context7.sent;
          phone = ((_customer$rows$ = customer.rows[0]) === null || _customer$rows$ === void 0 ? void 0 : _customer$rows$.phone) || ((_customer$rows$2 = customer.rows[0]) === null || _customer$rows$2 === void 0 ? void 0 : _customer$rows$2.meta_phone); // Process purchase
          _context7.next = 16;
          return gasService.purchaseUnits({
            meterNumber: targetMeterNumber,
            amount: amount,
            customerId: customerId,
            phone: phone || ''
          });
        case 16:
          purchaseResult = _context7.sent;
          if (!purchaseResult.success) {
            _context7.next = 28;
            break;
          }
          // Deduct from wallet (or loan credit)
          paymentSource = 'wallet';
          if (!(balance >= amount)) {
            _context7.next = 18;
            break;
          }
          _context7.next = 17;
          return blnkService.debitCustomerWallet(customerId, amount, purchaseResult.transactionId || '', "Gas purchase - ".concat(targetMeterNumber));
        case 17:
          _context7.next = 21;
          break;
        case 18:
          // Use loan credit first, then wallet
          loanUsage = Math.min(foodLoanCredit, amount - balance);
          walletUsage = amount - loanUsage;
          if (!(walletUsage > 0)) {
            _context7.next = 19;
            break;
          }
          _context7.next = 19;
          return blnkService.debitCustomerWallet(customerId, walletUsage, purchaseResult.transactionId || '', "Gas purchase - ".concat(targetMeterNumber));
        case 19:
          if (!(loanUsage > 0)) {
            _context7.next = 21;
            break;
          }
          _context7.next = 20;
          return db.query("\n            UPDATE bigcompany.loans\n            SET used_amount = COALESCE(used_amount, 0) + $1, updated_at = NOW()\n            WHERE borrower_id = $2 AND status IN ('disbursed', 'active')\n          ", [loanUsage, customerId]);
        case 20:
          paymentSource = 'loan_credit';
        case 21:
          _context7.next = 22;
          return db.query("\n        INSERT INTO bigcompany.utility_topups\n        (user_id, meter_id, amount, currency, token, units_purchased, status, provider_reference, metadata)\n        VALUES ($1, $2, $3, 'RWF', $4, $5, 'success', $6, $7)\n      ", [customerId, targetMeterId, amount, purchaseResult.token, purchaseResult.units, purchaseResult.transactionId, JSON.stringify({
            meter_number: targetMeterNumber,
            payment_source: paymentSource
          })]);
        case 22:
          if (!(amount >= 1000)) {
            _context7.next = 26;
            break;
          }
          _context7.prev = 23;
          _context7.next = 24;
          return rewardsService.processOrderReward(customerId, purchaseResult.transactionId || "GAS-".concat(Date.now()), amount * 0.1,
          // Assume 10% profit margin for gas
          targetMeterNumber);
        case 24:
          _context7.next = 26;
          break;
        case 25:
          _context7.prev = 25;
          _t6 = _context7["catch"](23);
          console.error('Reward processing error:', _t6);
        case 26:
          if (!(phone && purchaseResult.token)) {
            _context7.next = 27;
            break;
          }
          _context7.next = 27;
          return smsService.send({
            to: phone,
            message: "BIG Gas: ".concat(purchaseResult.units, " units purchased for meter ").concat(targetMeterNumber, ".\n\nTOKEN: ").concat(purchaseResult.token, "\n\nRef: ").concat(purchaseResult.transactionId)
          });
        case 27:
          res.json({
            success: true,
            topup: {
              transaction_id: purchaseResult.transactionId,
              meter_number: targetMeterNumber,
              amount: amount,
              currency: 'RWF',
              units: purchaseResult.units,
              token: purchaseResult.token,
              payment_source: paymentSource
            },
            message: purchaseResult.message
          });
          _context7.next = 29;
          break;
        case 28:
          res.status(400).json({
            success: false,
            error: purchaseResult.error || 'Failed to purchase gas units'
          });
        case 29:
          _context7.next = 31;
          break;
        case 30:
          _context7.prev = 30;
          _t7 = _context7["catch"](2);
          console.error('Gas topup error:', _t7);
          res.status(500).json({
            error: _t7.message
          });
        case 31:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[2, 30], [23, 25]]);
  }));
  return function (_x10, _x11) {
    return _ref7.apply(this, arguments);
  };
}()));

/**
 * Get gas top-up history
 * GET /store/gas/history
 */
router.get('/history', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref8 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(req, res) {
    var _req$user6;
    var customerId, _req$query, _req$query$limit, limit, _req$query$offset, offset, history, countResult, _t8;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          customerId = (_req$user6 = req.user) === null || _req$user6 === void 0 ? void 0 : _req$user6.customer_id;
          _req$query = req.query, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 20 : _req$query$limit, _req$query$offset = _req$query.offset, offset = _req$query$offset === void 0 ? 0 : _req$query$offset;
          if (customerId) {
            _context8.next = 1;
            break;
          }
          return _context8.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context8.prev = 1;
          _context8.next = 2;
          return db.query("\n      SELECT\n        t.id,\n        t.amount,\n        t.currency,\n        t.token,\n        t.units_purchased,\n        t.status,\n        t.provider_reference,\n        t.created_at,\n        t.metadata,\n        m.meter_number,\n        m.alias as meter_alias\n      FROM bigcompany.utility_topups t\n      LEFT JOIN bigcompany.utility_meters m ON t.meter_id = m.id\n      WHERE t.user_id = $1\n      ORDER BY t.created_at DESC\n      LIMIT $2 OFFSET $3\n    ", [customerId, limit, offset]);
        case 2:
          history = _context8.sent;
          _context8.next = 3;
          return db.query("\n      SELECT COUNT(*) as total FROM bigcompany.utility_topups WHERE user_id = $1\n    ", [customerId]);
        case 3:
          countResult = _context8.sent;
          res.json({
            history: history.rows,
            pagination: {
              total: parseInt(countResult.rows[0].total),
              limit: parseInt(limit),
              offset: parseInt(offset)
            }
          });
          _context8.next = 5;
          break;
        case 4:
          _context8.prev = 4;
          _t8 = _context8["catch"](1);
          console.error('Get history error:', _t8);
          res.status(500).json({
            error: _t8.message
          });
        case 5:
        case "end":
          return _context8.stop();
      }
    }, _callee8, null, [[1, 4]]);
  }));
  return function (_x12, _x13) {
    return _ref8.apply(this, arguments);
  };
}()));

/**
 * Resend gas token via SMS
 * POST /store/gas/resend-token/:id
 */
router.post('/resend-token/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref9 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(req, res) {
    var _req$user7;
    var customerId, topupId, _customer$rows$3, _customer$rows$4, _record$metadata, topup, record, customer, phone, _t9;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          customerId = (_req$user7 = req.user) === null || _req$user7 === void 0 ? void 0 : _req$user7.customer_id;
          topupId = req.params.id;
          if (customerId) {
            _context9.next = 1;
            break;
          }
          return _context9.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context9.prev = 1;
          _context9.next = 2;
          return db.query("\n      SELECT t.*, m.meter_number\n      FROM bigcompany.utility_topups t\n      LEFT JOIN bigcompany.utility_meters m ON t.meter_id = m.id\n      WHERE t.id = $1 AND t.user_id = $2 AND t.status = 'success'\n    ", [topupId, customerId]);
        case 2:
          topup = _context9.sent;
          if (!(topup.rows.length === 0)) {
            _context9.next = 3;
            break;
          }
          return _context9.abrupt("return", res.status(404).json({
            error: 'Top-up not found'
          }));
        case 3:
          record = topup.rows[0];
          if (record.token) {
            _context9.next = 4;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'No token available for this purchase'
          }));
        case 4:
          _context9.next = 5;
          return db.query("SELECT phone, metadata->>'phone' as meta_phone FROM customer WHERE id = $1", [customerId]);
        case 5:
          customer = _context9.sent;
          phone = ((_customer$rows$3 = customer.rows[0]) === null || _customer$rows$3 === void 0 ? void 0 : _customer$rows$3.phone) || ((_customer$rows$4 = customer.rows[0]) === null || _customer$rows$4 === void 0 ? void 0 : _customer$rows$4.meta_phone);
          if (phone) {
            _context9.next = 6;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'No phone number on file'
          }));
        case 6:
          _context9.next = 7;
          return smsService.send({
            to: phone,
            message: "BIG Gas Token Resend\n\nMeter: ".concat(record.meter_number || ((_record$metadata = record.metadata) === null || _record$metadata === void 0 ? void 0 : _record$metadata.meter_number), "\nTOKEN: ").concat(record.token, "\nUnits: ").concat(record.units_purchased, "\n\nRef: ").concat(record.provider_reference)
          });
        case 7:
          res.json({
            success: true,
            message: 'Token sent to your phone'
          });
          _context9.next = 9;
          break;
        case 8:
          _context9.prev = 8;
          _t9 = _context9["catch"](1);
          console.error('Resend token error:', _t9);
          res.status(500).json({
            error: _t9.message
          });
        case 9:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[1, 8]]);
  }));
  return function (_x14, _x15) {
    return _ref9.apply(this, arguments);
  };
}()));

/**
 * Get predefined amounts
 * GET /store/gas/amounts
 */
router.get('/amounts', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref0 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(_req, res) {
    return _regenerator["default"].wrap(function (_context0) {
      while (1) switch (_context0.prev = _context0.next) {
        case 0:
          res.json({
            amounts: VALID_AMOUNTS,
            currency: 'RWF',
            conversion_note: 'Actual units depend on current tariff rates'
          });
        case 1:
        case "end":
          return _context0.stop();
      }
    }, _callee0);
  }));
  return function (_x16, _x17) {
    return _ref0.apply(this, arguments);
  };
}()));

/**
 * Get gas/utility providers
 * GET /store/gas/providers
 */
router.get('/providers', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref1 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(_req, res) {
    return _regenerator["default"].wrap(function (_context1) {
      while (1) switch (_context1.prev = _context1.next) {
        case 0:
          res.json({
            providers: [{
              id: 'eucl',
              name: 'EUCL (Energy Utility Corporation Limited)',
              shortName: 'EUCL',
              type: 'electricity',
              country: 'RW',
              meterPrefixes: ['01', '04', '05'],
              minAmount: 300,
              maxAmount: 100000,
              fees: {
                percentage: 0,
                fixed: 0
              },
              enabled: true,
              description: 'Rwanda electricity prepaid meters'
            }, {
              id: 'gas_rwanda',
              name: 'Gas Rwanda Ltd',
              shortName: 'GAS RW',
              type: 'gas',
              country: 'RW',
              meterPrefixes: ['GS', 'GR'],
              minAmount: 500,
              maxAmount: 50000,
              fees: {
                percentage: 0,
                fixed: 0
              },
              enabled: true,
              description: 'LPG cooking gas meters'
            }, {
              id: 'wasac',
              name: 'WASAC (Water and Sanitation Corporation)',
              shortName: 'WASAC',
              type: 'water',
              country: 'RW',
              meterPrefixes: ['WA', 'WS'],
              minAmount: 500,
              maxAmount: 50000,
              fees: {
                percentage: 0,
                fixed: 0
              },
              enabled: true,
              description: 'Water utility prepaid meters'
            }]
          });
        case 1:
        case "end":
          return _context1.stop();
      }
    }, _callee1);
  }));
  return function (_x18, _x19) {
    return _ref1.apply(this, arguments);
  };
}()));

/**
 * Get current gas/utility rates
 * GET /store/gas/rates
 */
router.get('/rates', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref10 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(_req, res) {
    return _regenerator["default"].wrap(function (_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          res.json({
            rates: [{
              providerId: 'eucl',
              type: 'electricity',
              tiers: [{
                from: 0,
                to: 15,
                rate: 89,
                unit: 'kWh',
                description: 'Lifeline (subsidized)'
              }, {
                from: 15,
                to: 50,
                rate: 212,
                unit: 'kWh',
                description: 'Standard domestic'
              }, {
                from: 50,
                to: null,
                rate: 249,
                unit: 'kWh',
                description: 'Standard above 50 kWh'
              }],
              vat: 18,
              currency: 'RWF',
              effectiveDate: '2024-01-01'
            }, {
              providerId: 'gas_rwanda',
              type: 'gas',
              tiers: [{
                from: 0,
                to: null,
                rate: 1200,
                unit: 'kg',
                description: 'LPG standard rate'
              }],
              vat: 18,
              currency: 'RWF',
              effectiveDate: '2024-01-01'
            }, {
              providerId: 'wasac',
              type: 'water',
              tiers: [{
                from: 0,
                to: 5,
                rate: 252,
                unit: 'm³',
                description: 'Basic usage'
              }, {
                from: 5,
                to: 20,
                rate: 504,
                unit: 'm³',
                description: 'Standard usage'
              }, {
                from: 20,
                to: null,
                rate: 756,
                unit: 'm³',
                description: 'Above 20 m³'
              }],
              vat: 18,
              currency: 'RWF',
              effectiveDate: '2024-01-01'
            }],
            lastUpdated: new Date().toISOString(),
            note: 'Rates are subject to change by respective utility companies'
          });
        case 1:
        case "end":
          return _context10.stop();
      }
    }, _callee10);
  }));
  return function (_x20, _x21) {
    return _ref10.apply(this, arguments);
  };
}()));
var _default = exports["default"] = router;