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
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _medusaCoreUtils = require("medusa-core-utils");
var _medusaInterfaces = require("medusa-interfaces");
var _crypto = _interopRequireDefault(require("crypto"));
function _callSuper(t, o, e) { return o = (0, _getPrototypeOf2["default"])(o), (0, _possibleConstructorReturn2["default"])(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], (0, _getPrototypeOf2["default"])(t).constructor) : o.apply(t, e)); }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); } /**
 * Manual Payment Service
 * Handles 3 verification methods for remote card payments:
 * 1. Direct PIN entry
 * 2. One-time 8-digit payment code
 * 3. SMS OTP verification
 */
var ManualPaymentService = /*#__PURE__*/function (_BaseService) {
  function ManualPaymentService(_ref) {
    var _this;
    var db = _ref.db,
      smsService = _ref.smsService,
      blnkService = _ref.blnkService;
    (0, _classCallCheck2["default"])(this, ManualPaymentService);
    _this = _callSuper(this, ManualPaymentService);
    (0, _defineProperty2["default"])(_this, "db", void 0);
    (0, _defineProperty2["default"])(_this, "smsService", void 0);
    (0, _defineProperty2["default"])(_this, "blnkService", void 0);
    _this.db = db;
    _this.smsService = smsService;
    _this.blnkService = blnkService;
    return _this;
  }

  // ==================== SECURITY CHECKS ====================

  /**
   * Check if card is locked due to failed attempts
   */
  (0, _inherits2["default"])(ManualPaymentService, _BaseService);
  return (0, _createClass2["default"])(ManualPaymentService, [{
    key: "isCardLocked",
    value: function () {
      var _isCardLocked = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(cardId) {
        var _result$rows$;
        var result;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.next = 1;
              return this.db.query('SELECT bigcompany.is_card_locked($1) as locked', [cardId]);
            case 1:
              result = _context.sent;
              return _context.abrupt("return", ((_result$rows$ = result.rows[0]) === null || _result$rows$ === void 0 ? void 0 : _result$rows$.locked) || false);
            case 2:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function isCardLocked(_x) {
        return _isCardLocked.apply(this, arguments);
      }
      return isCardLocked;
    }()
    /**
     * Count failed attempts in last N minutes
     */
  }, {
    key: "countFailedAttempts",
    value: (function () {
      var _countFailedAttempts = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(cardId) {
        var _result$rows$2;
        var minutes,
          result,
          _args2 = arguments;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              minutes = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : 15;
              _context2.next = 1;
              return this.db.query('SELECT bigcompany.count_failed_attempts($1, $2) as count', [cardId, minutes]);
            case 1:
              result = _context2.sent;
              return _context2.abrupt("return", parseInt(((_result$rows$2 = result.rows[0]) === null || _result$rows$2 === void 0 ? void 0 : _result$rows$2.count) || '0'));
            case 2:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function countFailedAttempts(_x2) {
        return _countFailedAttempts.apply(this, arguments);
      }
      return countFailedAttempts;
    }()
    /**
     * Lock card for specified duration
     */
    )
  }, {
    key: "lockCard",
    value: (function () {
      var _lockCard = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(cardId) {
        var durationMinutes,
          reason,
          retailerId,
          _args3 = arguments;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              durationMinutes = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : 30;
              reason = _args3.length > 2 && _args3[2] !== undefined ? _args3[2] : 'Too many failed attempts';
              retailerId = _args3.length > 3 ? _args3[3] : undefined;
              _context3.next = 1;
              return this.db.query('SELECT bigcompany.lock_card($1, $2, $3, $4)', [cardId, durationMinutes, reason, retailerId || null]);
            case 1:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function lockCard(_x3) {
        return _lockCard.apply(this, arguments);
      }
      return lockCard;
    }()
    /**
     * Record verification attempt
     */
    )
  }, {
    key: "recordAttempt",
    value: (function () {
      var _recordAttempt = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(cardId, retailerId, method, success, ipAddress, userAgent) {
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 1;
              return this.db.query("\n      INSERT INTO bigcompany.payment_verification_attempts\n      (card_id, retailer_id, verification_method, success, ip_address, user_agent)\n      VALUES ($1, $2, $3, $4, $5, $6)\n    ", [cardId, retailerId, method, success, ipAddress, userAgent]);
            case 1:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function recordAttempt(_x4, _x5, _x6, _x7, _x8, _x9) {
        return _recordAttempt.apply(this, arguments);
      }
      return recordAttempt;
    }()
    /**
     * Check rate limiting before verification
     */
    )
  }, {
    key: "checkRateLimit",
    value: (function () {
      var _checkRateLimit = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(cardId, retailerId) {
        var locked, failedAttempts;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 1;
              return this.isCardLocked(cardId);
            case 1:
              locked = _context5.sent;
              if (!locked) {
                _context5.next = 2;
                break;
              }
              throw new _medusaCoreUtils.MedusaError(_medusaCoreUtils.MedusaError.Types.NOT_ALLOWED, 'Card is temporarily locked due to security reasons. Please try again later.');
            case 2:
              _context5.next = 3;
              return this.countFailedAttempts(cardId, 15);
            case 3:
              failedAttempts = _context5.sent;
              if (!(failedAttempts >= 3)) {
                _context5.next = 5;
                break;
              }
              _context5.next = 4;
              return this.lockCard(cardId, 30, 'Exceeded maximum failed attempts', retailerId);
            case 4:
              throw new _medusaCoreUtils.MedusaError(_medusaCoreUtils.MedusaError.Types.NOT_ALLOWED, 'Too many failed attempts. Card locked for 30 minutes.');
            case 5:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function checkRateLimit(_x0, _x1) {
        return _checkRateLimit.apply(this, arguments);
      }
      return checkRateLimit;
    }()
    /**
     * Log manual payment audit trail
     */
    )
  }, {
    key: "logPaymentAudit",
    value: (function () {
      var _logPaymentAudit = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(data) {
        var maskedCode;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              // Mask sensitive verification code (show only last 4 digits)
              maskedCode = data.verificationCode ? '****' + data.verificationCode.slice(-4) : null;
              _context6.next = 1;
              return this.db.query("\n      INSERT INTO bigcompany.manual_payment_audit\n      (card_id, retailer_id, branch_id, amount, verification_method, verification_code,\n       success, error_message, transaction_id, ip_address, user_agent, metadata)\n      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)\n    ", [data.cardId, data.retailerId, data.branchId || null, data.amount, data.method, maskedCode, data.success, data.errorMessage || null, data.transactionId || null, data.ipAddress || null, data.userAgent || null, data.metadata ? JSON.stringify(data.metadata) : null]);
            case 1:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function logPaymentAudit(_x10) {
        return _logPaymentAudit.apply(this, arguments);
      }
      return logPaymentAudit;
    }() // ==================== METHOD 1: DIRECT PIN ENTRY ====================
    /**
     * Verify PIN and process payment
     */
    )
  }, {
    key: "verifyPinAndCharge",
    value: function () {
      var _verifyPinAndCharge = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(cardId, pin, amount, retailerId, branchId, ipAddress, userAgent) {
        var cardResult, card, bcrypt, pinValid, transaction, _t;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              _context7.prev = 0;
              _context7.next = 1;
              return this.checkRateLimit(cardId, retailerId);
            case 1:
              _context7.next = 2;
              return this.db.query("\n        SELECT id, card_uid, balance, pin_hash, is_active, customer_id\n        FROM bigcompany.nfc_cards\n        WHERE card_uid = $1\n      ", [cardId]);
            case 2:
              cardResult = _context7.sent;
              if (!(cardResult.rows.length === 0)) {
                _context7.next = 5;
                break;
              }
              _context7.next = 3;
              return this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
            case 3:
              _context7.next = 4;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'pin',
                success: false,
                errorMessage: 'Card not found',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 4:
              return _context7.abrupt("return", {
                success: false,
                error: 'Card not found'
              });
            case 5:
              card = cardResult.rows[0];
              if (card.is_active) {
                _context7.next = 8;
                break;
              }
              _context7.next = 6;
              return this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
            case 6:
              _context7.next = 7;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'pin',
                success: false,
                errorMessage: 'Card is inactive',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 7:
              return _context7.abrupt("return", {
                success: false,
                error: 'Card is inactive'
              });
            case 8:
              // Verify PIN
              bcrypt = require('bcryptjs');
              _context7.next = 9;
              return bcrypt.compare(pin, card.pin_hash);
            case 9:
              pinValid = _context7.sent;
              if (pinValid) {
                _context7.next = 12;
                break;
              }
              _context7.next = 10;
              return this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
            case 10:
              _context7.next = 11;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'pin',
                verificationCode: pin,
                success: false,
                errorMessage: 'Invalid PIN',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 11:
              return _context7.abrupt("return", {
                success: false,
                error: 'Invalid PIN'
              });
            case 12:
              if (!(card.balance < amount)) {
                _context7.next = 15;
                break;
              }
              _context7.next = 13;
              return this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
            case 13:
              _context7.next = 14;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'pin',
                success: false,
                errorMessage: 'Insufficient balance',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 14:
              return _context7.abrupt("return", {
                success: false,
                error: 'Insufficient balance',
                card_balance: card.balance
              });
            case 15:
              _context7.next = 16;
              return this.blnkService.recordTransaction({
                reference: "MANUAL-PIN-".concat(Date.now()),
                amount: amount,
                precision: 100,
                source: card.id,
                destination: retailerId,
                currency: 'RWF',
                description: "Manual card payment - PIN",
                meta_data: {
                  card_uid: cardId,
                  payment_method: 'manual_pin',
                  retailer_id: retailerId,
                  branch_id: branchId
                }
              });
            case 16:
              transaction = _context7.sent;
              _context7.next = 17;
              return this.db.query("\n        UPDATE bigcompany.nfc_cards\n        SET balance = balance - $1,\n            last_used_at = NOW()\n        WHERE card_uid = $2\n      ", [amount, cardId]);
            case 17:
              _context7.next = 18;
              return this.recordAttempt(cardId, retailerId, 'pin', true, ipAddress, userAgent);
            case 18:
              _context7.next = 19;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'pin',
                success: true,
                transactionId: transaction.transaction_id,
                ipAddress: ipAddress,
                userAgent: userAgent,
                metadata: {
                  blnk_reference: transaction.reference
                }
              });
            case 19:
              return _context7.abrupt("return", {
                success: true,
                card_balance: card.balance - amount,
                transaction_id: transaction.transaction_id
              });
            case 20:
              _context7.prev = 20;
              _t = _context7["catch"](0);
              _context7.next = 21;
              return this.recordAttempt(cardId, retailerId, 'pin', false, ipAddress, userAgent);
            case 21:
              _context7.next = 22;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'pin',
                success: false,
                errorMessage: _t.message,
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 22:
              throw _t;
            case 23:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this, [[0, 20]]);
      }));
      function verifyPinAndCharge(_x11, _x12, _x13, _x14, _x15, _x16, _x17) {
        return _verifyPinAndCharge.apply(this, arguments);
      }
      return verifyPinAndCharge;
    }() // ==================== METHOD 2: ONE-TIME PAYMENT CODE ====================
    /**
     * Generate 8-digit one-time payment code (10-minute expiry)
     */
  }, {
    key: "generatePaymentCode",
    value: function () {
      var _generatePaymentCode = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(cardId, amount, retailerId, customerPhone, branchId) {
        var code, expiresAt, _t2;
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              // Generate random 8-digit code
              code = _crypto["default"].randomInt(10000000, 99999999).toString();
              expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
              // Store in database
              _context8.next = 1;
              return this.db.query("\n      INSERT INTO bigcompany.payment_codes\n      (card_id, code, amount, retailer_id, branch_id, customer_phone, expires_at)\n      VALUES ($1, $2, $3, $4, $5, $6, $7)\n    ", [cardId, code, amount, retailerId, branchId || null, customerPhone || null, expiresAt]);
            case 1:
              if (!customerPhone) {
                _context8.next = 5;
                break;
              }
              _context8.prev = 2;
              _context8.next = 3;
              return this.smsService.send({
                to: customerPhone,
                message: "BIG Company Payment Code: ".concat(code, "\nAmount: ").concat(amount, " RWF\nValid for 10 minutes.\nDo NOT share this code with anyone.")
              });
            case 3:
              _context8.next = 5;
              break;
            case 4:
              _context8.prev = 4;
              _t2 = _context8["catch"](2);
              console.error('Failed to send payment code SMS:', _t2);
            case 5:
              return _context8.abrupt("return", {
                code: code,
                expires_at: expiresAt
              });
            case 6:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this, [[2, 4]]);
      }));
      function generatePaymentCode(_x18, _x19, _x20, _x21, _x22) {
        return _generatePaymentCode.apply(this, arguments);
      }
      return generatePaymentCode;
    }()
    /**
     * Verify payment code and process payment
     */
  }, {
    key: "verifyCodeAndCharge",
    value: (function () {
      var _verifyCodeAndCharge = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(cardId, code, retailerId, branchId, ipAddress, userAgent) {
        var codeResult, paymentCode, amount, cardResult, card, transaction, _t3, _t4;
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              _context9.prev = 0;
              _context9.next = 1;
              return this.checkRateLimit(cardId, retailerId);
            case 1:
              _context9.next = 2;
              return this.db.query("\n        SELECT id, amount, retailer_id, expires_at, is_used\n        FROM bigcompany.payment_codes\n        WHERE card_id = $1 AND code = $2\n        ORDER BY created_at DESC\n        LIMIT 1\n      ", [cardId, code]);
            case 2:
              codeResult = _context9.sent;
              if (!(codeResult.rows.length === 0)) {
                _context9.next = 5;
                break;
              }
              _context9.next = 3;
              return this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
            case 3:
              _context9.next = 4;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: 0,
                method: 'code',
                verificationCode: code,
                success: false,
                errorMessage: 'Invalid code',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 4:
              return _context9.abrupt("return", {
                success: false,
                error: 'Invalid payment code'
              });
            case 5:
              paymentCode = codeResult.rows[0]; // Check if already used
              if (!paymentCode.is_used) {
                _context9.next = 8;
                break;
              }
              _context9.next = 6;
              return this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
            case 6:
              _context9.next = 7;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: paymentCode.amount,
                method: 'code',
                verificationCode: code,
                success: false,
                errorMessage: 'Code already used',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 7:
              return _context9.abrupt("return", {
                success: false,
                error: 'Code already used'
              });
            case 8:
              if (!(new Date(paymentCode.expires_at) < new Date())) {
                _context9.next = 11;
                break;
              }
              _context9.next = 9;
              return this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
            case 9:
              _context9.next = 10;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: paymentCode.amount,
                method: 'code',
                verificationCode: code,
                success: false,
                errorMessage: 'Code expired',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 10:
              return _context9.abrupt("return", {
                success: false,
                error: 'Payment code expired'
              });
            case 11:
              if (!(paymentCode.retailer_id !== retailerId)) {
                _context9.next = 14;
                break;
              }
              _context9.next = 12;
              return this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
            case 12:
              _context9.next = 13;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: paymentCode.amount,
                method: 'code',
                verificationCode: code,
                success: false,
                errorMessage: 'Retailer mismatch',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 13:
              return _context9.abrupt("return", {
                success: false,
                error: 'Invalid code for this retailer'
              });
            case 14:
              amount = paymentCode.amount; // Get card details
              _context9.next = 15;
              return this.db.query("\n        SELECT id, card_uid, balance, is_active\n        FROM bigcompany.nfc_cards\n        WHERE card_uid = $1\n      ", [cardId]);
            case 15:
              cardResult = _context9.sent;
              if (!(cardResult.rows.length === 0)) {
                _context9.next = 16;
                break;
              }
              return _context9.abrupt("return", {
                success: false,
                error: 'Card not found'
              });
            case 16:
              card = cardResult.rows[0];
              if (card.is_active) {
                _context9.next = 17;
                break;
              }
              return _context9.abrupt("return", {
                success: false,
                error: 'Card is inactive'
              });
            case 17:
              if (!(card.balance < amount)) {
                _context9.next = 20;
                break;
              }
              _context9.next = 18;
              return this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
            case 18:
              _context9.next = 19;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'code',
                verificationCode: code,
                success: false,
                errorMessage: 'Insufficient balance',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 19:
              return _context9.abrupt("return", {
                success: false,
                error: 'Insufficient balance',
                card_balance: card.balance
              });
            case 20:
              _context9.next = 21;
              return this.blnkService.recordTransaction({
                reference: "MANUAL-CODE-".concat(Date.now()),
                amount: amount,
                precision: 100,
                source: card.id,
                destination: retailerId,
                currency: 'RWF',
                description: "Manual card payment - Code",
                meta_data: {
                  card_uid: cardId,
                  payment_method: 'manual_code',
                  payment_code: code,
                  retailer_id: retailerId,
                  branch_id: branchId
                }
              });
            case 21:
              transaction = _context9.sent;
              _context9.next = 22;
              return this.db.query('BEGIN');
            case 22:
              _context9.prev = 22;
              _context9.next = 23;
              return this.db.query("\n          UPDATE bigcompany.nfc_cards\n          SET balance = balance - $1,\n              last_used_at = NOW()\n          WHERE card_uid = $2\n        ", [amount, cardId]);
            case 23:
              _context9.next = 24;
              return this.db.query("\n          UPDATE bigcompany.payment_codes\n          SET is_used = true, used_at = NOW()\n          WHERE id = $1\n        ", [paymentCode.id]);
            case 24:
              _context9.next = 25;
              return this.db.query('COMMIT');
            case 25:
              _context9.next = 28;
              break;
            case 26:
              _context9.prev = 26;
              _t3 = _context9["catch"](22);
              _context9.next = 27;
              return this.db.query('ROLLBACK');
            case 27:
              throw _t3;
            case 28:
              _context9.next = 29;
              return this.recordAttempt(cardId, retailerId, 'code', true, ipAddress, userAgent);
            case 29:
              _context9.next = 30;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'code',
                verificationCode: code,
                success: true,
                transactionId: transaction.transaction_id,
                ipAddress: ipAddress,
                userAgent: userAgent,
                metadata: {
                  blnk_reference: transaction.reference
                }
              });
            case 30:
              return _context9.abrupt("return", {
                success: true,
                card_balance: card.balance - amount,
                transaction_id: transaction.transaction_id
              });
            case 31:
              _context9.prev = 31;
              _t4 = _context9["catch"](0);
              _context9.next = 32;
              return this.recordAttempt(cardId, retailerId, 'code', false, ipAddress, userAgent);
            case 32:
              throw _t4;
            case 33:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this, [[0, 31], [22, 26]]);
      }));
      function verifyCodeAndCharge(_x23, _x24, _x25, _x26, _x27, _x28) {
        return _verifyCodeAndCharge.apply(this, arguments);
      }
      return verifyCodeAndCharge;
    }() // ==================== METHOD 3: SMS OTP ====================
    /**
     * Request SMS OTP for payment approval
     */
    )
  }, {
    key: "requestPaymentOTP",
    value: function () {
      var _requestPaymentOTP = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(cardId, amount, customerPhone, retailerId) {
        var otp, expiresAt, _t5;
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              // Generate 6-digit OTP
              otp = _crypto["default"].randomInt(100000, 999999).toString();
              expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
              // Store in database
              _context0.next = 1;
              return this.db.query("\n      INSERT INTO bigcompany.otp_codes\n      (phone, code, purpose, expires_at, metadata)\n      VALUES ($1, $2, 'payment', $3, $4)\n    ", [customerPhone, otp, expiresAt, JSON.stringify({
                card_id: cardId,
                amount: amount,
                retailer_id: retailerId
              })]);
            case 1:
              _context0.prev = 1;
              _context0.next = 2;
              return this.smsService.send({
                to: customerPhone,
                message: "BIG Company Payment Approval\nOTP: ".concat(otp, "\nAmount: ").concat(amount, " RWF\nValid for 5 minutes.\nReply with this code to approve payment.")
              });
            case 2:
              return _context0.abrupt("return", {
                otp_sent: true,
                expires_at: expiresAt
              });
            case 3:
              _context0.prev = 3;
              _t5 = _context0["catch"](1);
              console.error('Failed to send OTP SMS:', _t5);
              throw new _medusaCoreUtils.MedusaError(_medusaCoreUtils.MedusaError.Types.UNEXPECTED_STATE, 'Failed to send OTP. Please try again.');
            case 4:
            case "end":
              return _context0.stop();
          }
        }, _callee0, this, [[1, 3]]);
      }));
      function requestPaymentOTP(_x29, _x30, _x31, _x32) {
        return _requestPaymentOTP.apply(this, arguments);
      }
      return requestPaymentOTP;
    }()
    /**
     * Verify OTP and process payment
     */
  }, {
    key: "verifyOTPAndCharge",
    value: (function () {
      var _verifyOTPAndCharge = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(cardId, otp, customerPhone, retailerId, branchId, ipAddress, userAgent) {
        var otpResult, otpData, metadata, amount, cardResult, card, transaction, _t6, _t7;
        return _regenerator["default"].wrap(function (_context1) {
          while (1) switch (_context1.prev = _context1.next) {
            case 0:
              _context1.prev = 0;
              _context1.next = 1;
              return this.checkRateLimit(cardId, retailerId);
            case 1:
              _context1.next = 2;
              return this.db.query("\n        SELECT id, expires_at, is_verified, metadata\n        FROM bigcompany.otp_codes\n        WHERE phone = $1 AND code = $2 AND purpose = 'payment'\n        ORDER BY created_at DESC\n        LIMIT 1\n      ", [customerPhone, otp]);
            case 2:
              otpResult = _context1.sent;
              if (!(otpResult.rows.length === 0)) {
                _context1.next = 5;
                break;
              }
              _context1.next = 3;
              return this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
            case 3:
              _context1.next = 4;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: 0,
                method: 'otp',
                verificationCode: otp,
                success: false,
                errorMessage: 'Invalid OTP',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 4:
              return _context1.abrupt("return", {
                success: false,
                error: 'Invalid OTP'
              });
            case 5:
              otpData = otpResult.rows[0];
              metadata = otpData.metadata; // Check if already used
              if (!otpData.is_verified) {
                _context1.next = 7;
                break;
              }
              _context1.next = 6;
              return this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
            case 6:
              return _context1.abrupt("return", {
                success: false,
                error: 'OTP already used'
              });
            case 7:
              if (!(new Date(otpData.expires_at) < new Date())) {
                _context1.next = 9;
                break;
              }
              _context1.next = 8;
              return this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
            case 8:
              return _context1.abrupt("return", {
                success: false,
                error: 'OTP expired'
              });
            case 9:
              if (!(metadata.card_id !== cardId || metadata.retailer_id !== retailerId)) {
                _context1.next = 11;
                break;
              }
              _context1.next = 10;
              return this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
            case 10:
              return _context1.abrupt("return", {
                success: false,
                error: 'Invalid OTP for this transaction'
              });
            case 11:
              amount = metadata.amount; // Get card details
              _context1.next = 12;
              return this.db.query("\n        SELECT id, card_uid, balance, is_active\n        FROM bigcompany.nfc_cards\n        WHERE card_uid = $1\n      ", [cardId]);
            case 12:
              cardResult = _context1.sent;
              if (!(cardResult.rows.length === 0)) {
                _context1.next = 13;
                break;
              }
              return _context1.abrupt("return", {
                success: false,
                error: 'Card not found'
              });
            case 13:
              card = cardResult.rows[0];
              if (card.is_active) {
                _context1.next = 14;
                break;
              }
              return _context1.abrupt("return", {
                success: false,
                error: 'Card is inactive'
              });
            case 14:
              if (!(card.balance < amount)) {
                _context1.next = 17;
                break;
              }
              _context1.next = 15;
              return this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
            case 15:
              _context1.next = 16;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'otp',
                verificationCode: otp,
                success: false,
                errorMessage: 'Insufficient balance',
                ipAddress: ipAddress,
                userAgent: userAgent
              });
            case 16:
              return _context1.abrupt("return", {
                success: false,
                error: 'Insufficient balance',
                card_balance: card.balance
              });
            case 17:
              _context1.next = 18;
              return this.blnkService.recordTransaction({
                reference: "MANUAL-OTP-".concat(Date.now()),
                amount: amount,
                precision: 100,
                source: card.id,
                destination: retailerId,
                currency: 'RWF',
                description: "Manual card payment - OTP",
                meta_data: {
                  card_uid: cardId,
                  payment_method: 'manual_otp',
                  retailer_id: retailerId,
                  branch_id: branchId,
                  customer_phone: customerPhone
                }
              });
            case 18:
              transaction = _context1.sent;
              _context1.next = 19;
              return this.db.query('BEGIN');
            case 19:
              _context1.prev = 19;
              _context1.next = 20;
              return this.db.query("\n          UPDATE bigcompany.nfc_cards\n          SET balance = balance - $1,\n              last_used_at = NOW()\n          WHERE card_uid = $2\n        ", [amount, cardId]);
            case 20:
              _context1.next = 21;
              return this.db.query("\n          UPDATE bigcompany.otp_codes\n          SET is_verified = true, verified_at = NOW()\n          WHERE id = $1\n        ", [otpData.id]);
            case 21:
              _context1.next = 22;
              return this.db.query('COMMIT');
            case 22:
              _context1.next = 25;
              break;
            case 23:
              _context1.prev = 23;
              _t6 = _context1["catch"](19);
              _context1.next = 24;
              return this.db.query('ROLLBACK');
            case 24:
              throw _t6;
            case 25:
              _context1.next = 26;
              return this.recordAttempt(cardId, retailerId, 'otp', true, ipAddress, userAgent);
            case 26:
              _context1.next = 27;
              return this.logPaymentAudit({
                cardId: cardId,
                retailerId: retailerId,
                branchId: branchId,
                amount: amount,
                method: 'otp',
                verificationCode: otp,
                success: true,
                transactionId: transaction.transaction_id,
                ipAddress: ipAddress,
                userAgent: userAgent,
                metadata: {
                  blnk_reference: transaction.reference
                }
              });
            case 27:
              return _context1.abrupt("return", {
                success: true,
                card_balance: card.balance - amount,
                transaction_id: transaction.transaction_id
              });
            case 28:
              _context1.prev = 28;
              _t7 = _context1["catch"](0);
              _context1.next = 29;
              return this.recordAttempt(cardId, retailerId, 'otp', false, ipAddress, userAgent);
            case 29:
              throw _t7;
            case 30:
            case "end":
              return _context1.stop();
          }
        }, _callee1, this, [[0, 28], [19, 23]]);
      }));
      function verifyOTPAndCharge(_x33, _x34, _x35, _x36, _x37, _x38, _x39) {
        return _verifyOTPAndCharge.apply(this, arguments);
      }
      return verifyOTPAndCharge;
    }() // ==================== CLEANUP UTILITIES ====================
    /**
     * Clean up expired codes and OTPs (should be run via cron job)
     */
    )
  }, {
    key: "cleanupExpired",
    value: function () {
      var _cleanupExpired = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10() {
        var _codesResult$rows$, _otpsResult$rows$, _unlocksResult$rows$;
        var codesResult, otpsResult, unlocksResult;
        return _regenerator["default"].wrap(function (_context10) {
          while (1) switch (_context10.prev = _context10.next) {
            case 0:
              _context10.next = 1;
              return this.db.query('SELECT bigcompany.cleanup_expired_payment_codes()');
            case 1:
              codesResult = _context10.sent;
              _context10.next = 2;
              return this.db.query('SELECT bigcompany.cleanup_expired_otps()');
            case 2:
              otpsResult = _context10.sent;
              _context10.next = 3;
              return this.db.query('SELECT bigcompany.unlock_expired_lockouts()');
            case 3:
              unlocksResult = _context10.sent;
              return _context10.abrupt("return", {
                codes_deleted: ((_codesResult$rows$ = codesResult.rows[0]) === null || _codesResult$rows$ === void 0 ? void 0 : _codesResult$rows$.cleanup_expired_payment_codes) || 0,
                otps_deleted: ((_otpsResult$rows$ = otpsResult.rows[0]) === null || _otpsResult$rows$ === void 0 ? void 0 : _otpsResult$rows$.cleanup_expired_otps) || 0,
                cards_unlocked: ((_unlocksResult$rows$ = unlocksResult.rows[0]) === null || _unlocksResult$rows$ === void 0 ? void 0 : _unlocksResult$rows$.unlock_expired_lockouts) || 0
              });
            case 4:
            case "end":
              return _context10.stop();
          }
        }, _callee10, this);
      }));
      function cleanupExpired() {
        return _cleanupExpired.apply(this, arguments);
      }
      return cleanupExpired;
    }()
  }]);
}(_medusaInterfaces.BaseService);
var _default = exports["default"] = ManualPaymentService;