"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _medusa = require("@medusajs/medusa");
var _otp = _interopRequireDefault(require("../../../services/otp"));
var _pg = require("pg");
var _crypto = _interopRequireDefault(require("crypto"));
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var router = (0, _express.Router)();

// Initialize OTP service
var otpService = new _otp["default"]();
var db = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});
var JWT_SECRET = process.env.JWT_SECRET || 'bigcompany_jwt_secret_change_in_production';

/**
 * Send OTP for registration
 * POST /store/auth/send-otp
 */
router.post('/send-otp', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _req$body, phone, _req$body$purpose, purpose, cleanPhone, normalizedPhone, existing, result, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _req$body = req.body, phone = _req$body.phone, _req$body$purpose = _req$body.purpose, purpose = _req$body$purpose === void 0 ? 'registration' : _req$body$purpose;
          if (phone) {
            _context.next = 1;
            break;
          }
          return _context.abrupt("return", res.status(400).json({
            error: 'Phone number is required'
          }));
        case 1:
          // Validate Rwandan phone number format
          cleanPhone = phone.replace(/\D/g, '');
          if (/^(250|0)?(78|79|72|73)\d{7}$/.test(cleanPhone)) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return", res.status(400).json({
            error: 'Invalid Rwandan phone number format'
          }));
        case 2:
          // Normalize to international format
          normalizedPhone = cleanPhone;
          if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '250' + normalizedPhone.substring(1);
          } else if (!normalizedPhone.startsWith('250')) {
            normalizedPhone = '250' + normalizedPhone;
          }
          _context.prev = 3;
          if (!(purpose === 'registration')) {
            _context.next = 5;
            break;
          }
          _context.next = 4;
          return db.query("SELECT id FROM customer WHERE phone = $1 OR metadata->>'phone' = $1", [normalizedPhone]);
        case 4:
          existing = _context.sent;
          if (!(existing.rows.length > 0)) {
            _context.next = 5;
            break;
          }
          return _context.abrupt("return", res.status(409).json({
            error: 'Phone number already registered'
          }));
        case 5:
          _context.next = 6;
          return otpService.sendOTP(normalizedPhone, purpose);
        case 6:
          result = _context.sent;
          if (result.success) {
            res.json({
              success: true,
              message: 'OTP sent successfully',
              phone: normalizedPhone,
              expires_in: 300 // 5 minutes
            });
          } else {
            res.status(500).json({
              error: result.error || 'Failed to send OTP'
            });
          }
          _context.next = 8;
          break;
        case 7:
          _context.prev = 7;
          _t = _context["catch"](3);
          console.error('Send OTP error:', _t);
          res.status(500).json({
            error: _t.message
          });
        case 8:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[3, 7]]);
  }));
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}()));

/**
 * Verify OTP
 * POST /store/auth/verify-otp
 */
router.post('/verify-otp', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _req$body2, phone, otp, _req$body2$purpose, purpose, normalizedPhone, result, verificationToken, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _req$body2 = req.body, phone = _req$body2.phone, otp = _req$body2.otp, _req$body2$purpose = _req$body2.purpose, purpose = _req$body2$purpose === void 0 ? 'registration' : _req$body2$purpose;
          if (!(!phone || !otp)) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", res.status(400).json({
            error: 'Phone number and OTP are required'
          }));
        case 1:
          // Normalize phone
          normalizedPhone = phone.replace(/\D/g, '');
          if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '250' + normalizedPhone.substring(1);
          } else if (!normalizedPhone.startsWith('250')) {
            normalizedPhone = '250' + normalizedPhone;
          }
          _context2.prev = 2;
          _context2.next = 3;
          return otpService.verifyOTP(normalizedPhone, otp, purpose);
        case 3:
          result = _context2.sent;
          if (!result.valid) {
            _context2.next = 5;
            break;
          }
          // Generate a verification token for registration flow
          verificationToken = _crypto["default"].randomBytes(32).toString('hex'); // Store verification token temporarily (valid for 10 minutes)
          _context2.next = 4;
          return db.query("\n        INSERT INTO bigcompany.audit_logs (action, entity_type, entity_id, new_values)\n        VALUES ('phone_verified', 'auth', $1, $2)\n      ", [verificationToken, JSON.stringify({
            phone: normalizedPhone,
            purpose: purpose,
            verified_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          })]);
        case 4:
          res.json({
            success: true,
            message: 'Phone verified successfully',
            verification_token: verificationToken,
            phone: normalizedPhone
          });
          _context2.next = 6;
          break;
        case 5:
          res.status(400).json({
            error: result.error || 'Invalid OTP'
          });
        case 6:
          _context2.next = 8;
          break;
        case 7:
          _context2.prev = 7;
          _t2 = _context2["catch"](2);
          console.error('Verify OTP error:', _t2);
          res.status(500).json({
            error: _t2.message
          });
        case 8:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[2, 7]]);
  }));
  return function (_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}()));

/**
 * Register new customer with verified phone
 * POST /store/auth/register
 */
router.post('/register', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$body3, verification_token, first_name, last_name, email, pin, verification, verificationData, phone, existing, pinHash, customerEmail, customerId, blnkService, token, _t3, _t4;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _req$body3 = req.body, verification_token = _req$body3.verification_token, first_name = _req$body3.first_name, last_name = _req$body3.last_name, email = _req$body3.email, pin = _req$body3.pin;
          if (!(!verification_token || !first_name || !pin)) {
            _context3.next = 1;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            error: 'Verification token, first name, and PIN are required'
          }));
        case 1:
          if (/^\d{4,6}$/.test(pin)) {
            _context3.next = 2;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            error: 'PIN must be 4-6 digits'
          }));
        case 2:
          _context3.prev = 2;
          _context3.next = 3;
          return db.query("\n      SELECT new_values FROM bigcompany.audit_logs\n      WHERE action = 'phone_verified' AND entity_type = 'auth' AND entity_id = $1\n      ORDER BY created_at DESC LIMIT 1\n    ", [verification_token]);
        case 3:
          verification = _context3.sent;
          if (!(verification.rows.length === 0)) {
            _context3.next = 4;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            error: 'Invalid or expired verification token'
          }));
        case 4:
          verificationData = verification.rows[0].new_values; // Check expiry
          if (!(new Date(verificationData.expires_at) < new Date())) {
            _context3.next = 5;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            error: 'Verification token expired. Please verify your phone again.'
          }));
        case 5:
          phone = verificationData.phone; // Check if already registered
          _context3.next = 6;
          return db.query("SELECT id FROM customer WHERE phone = $1 OR metadata->>'phone' = $1", [phone]);
        case 6:
          existing = _context3.sent;
          if (!(existing.rows.length > 0)) {
            _context3.next = 7;
            break;
          }
          return _context3.abrupt("return", res.status(409).json({
            error: 'Phone number already registered'
          }));
        case 7:
          // Hash PIN
          pinHash = _crypto["default"].createHash('sha256').update(pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret')).digest('hex'); // Generate customer email if not provided
          customerEmail = email || "".concat(phone, "@bigcompany.rw"); // Create customer in Medusa
          customerId = "cus_".concat(_crypto["default"].randomBytes(12).toString('hex'));
          _context3.next = 8;
          return db.query("\n      INSERT INTO customer (id, email, first_name, last_name, phone, metadata, has_account, created_at, updated_at)\n      VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())\n    ", [customerId, customerEmail, first_name, last_name || '', phone, JSON.stringify({
            phone: phone,
            pin_hash: pinHash,
            registered_via: 'mobile_app',
            kyc_status: 'pending'
          })]);
        case 8:
          // Create Blnk wallet for customer
          blnkService = req.scope.resolve('blnkService');
          _context3.prev = 9;
          _context3.next = 10;
          return blnkService.createCustomerWallet(customerId, {
            name: "".concat(first_name, " ").concat(last_name || '').trim(),
            phone: phone
          });
        case 10:
          _context3.next = 12;
          break;
        case 11:
          _context3.prev = 11;
          _t3 = _context3["catch"](9);
          console.error('Blnk wallet creation error:', _t3);
          // Continue even if Blnk fails - can be created later
        case 12:
          // Generate JWT token
          token = _jsonwebtoken["default"].sign({
            customer_id: customerId,
            phone: phone,
            email: customerEmail
          }, JWT_SECRET, {
            expiresIn: '30d'
          }); // Delete verification token
          _context3.next = 13;
          return db.query("\n      DELETE FROM bigcompany.audit_logs\n      WHERE action = 'phone_verified' AND entity_type = 'auth' AND entity_id = $1\n    ", [verification_token]);
        case 13:
          _context3.next = 14;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'customer_registered', 'customer', $1, $2)\n    ", [customerId, JSON.stringify({
            phone: phone,
            method: 'otp'
          })]);
        case 14:
          res.json({
            success: true,
            message: 'Registration successful',
            customer: {
              id: customerId,
              email: customerEmail,
              first_name: first_name,
              last_name: last_name || '',
              phone: phone
            },
            access_token: token
          });
          _context3.next = 16;
          break;
        case 15:
          _context3.prev = 15;
          _t4 = _context3["catch"](2);
          console.error('Registration error:', _t4);
          res.status(500).json({
            error: _t4.message
          });
        case 16:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[2, 15], [9, 11]]);
  }));
  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}()));

/**
 * Login with phone and PIN
 * POST /store/auth/login
 */
router.post('/login', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var phone, pin, normalizedPhone, _customer$metadata, result, customer, storedPinHash, inputPinHash, token, _t5;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          if (!(!req.body || (0, _typeof2["default"])(req.body) !== 'object')) {
            _context4.next = 1;
            break;
          }
          return _context4.abrupt("return", res.status(400).json({
            error: 'Invalid request body'
          }));
        case 1:
          phone = req.body.phone;
          pin = req.body.pin;
          if (!(!phone || !pin)) {
            _context4.next = 2;
            break;
          }
          return _context4.abrupt("return", res.status(400).json({
            error: 'Phone number and PIN are required'
          }));
        case 2:
          if (!(typeof phone !== 'string')) {
            _context4.next = 3;
            break;
          }
          return _context4.abrupt("return", res.status(400).json({
            error: 'Phone must be a string'
          }));
        case 3:
          // Normalize phone
          normalizedPhone = phone.replace(/\D/g, '');
          if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '250' + normalizedPhone.substring(1);
          } else if (!normalizedPhone.startsWith('250')) {
            normalizedPhone = '250' + normalizedPhone;
          }
          _context4.prev = 4;
          _context4.next = 5;
          return db.query("\n      SELECT id, email, first_name, last_name, phone, metadata\n      FROM customer\n      WHERE phone = $1 OR metadata->>'phone' = $1\n    ", [normalizedPhone]);
        case 5:
          result = _context4.sent;
          if (!(result.rows.length === 0)) {
            _context4.next = 6;
            break;
          }
          return _context4.abrupt("return", res.status(401).json({
            error: 'Invalid phone number or PIN'
          }));
        case 6:
          customer = result.rows[0];
          storedPinHash = (_customer$metadata = customer.metadata) === null || _customer$metadata === void 0 ? void 0 : _customer$metadata.pin_hash;
          if (storedPinHash) {
            _context4.next = 7;
            break;
          }
          return _context4.abrupt("return", res.status(401).json({
            error: 'Account not properly set up. Please register again.'
          }));
        case 7:
          // Verify PIN
          inputPinHash = _crypto["default"].createHash('sha256').update(pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret')).digest('hex');
          if (!(inputPinHash !== storedPinHash)) {
            _context4.next = 9;
            break;
          }
          _context4.next = 8;
          return db.query("\n        INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n        VALUES ($1, 'login_failed', 'customer', $1, $2)\n      ", [customer.id, JSON.stringify({
            phone: normalizedPhone,
            reason: 'invalid_pin'
          })]);
        case 8:
          return _context4.abrupt("return", res.status(401).json({
            error: 'Invalid phone number or PIN'
          }));
        case 9:
          // Generate JWT token
          token = _jsonwebtoken["default"].sign({
            customer_id: customer.id,
            phone: normalizedPhone,
            email: customer.email
          }, JWT_SECRET, {
            expiresIn: '30d'
          }); // Log successful login
          _context4.next = 10;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'login_success', 'customer', $1, $2)\n    ", [customer.id, JSON.stringify({
            phone: normalizedPhone
          })]);
        case 10:
          res.json({
            success: true,
            customer: {
              id: customer.id,
              email: customer.email,
              first_name: customer.first_name,
              last_name: customer.last_name,
              phone: normalizedPhone
            },
            access_token: token
          });
          _context4.next = 12;
          break;
        case 11:
          _context4.prev = 11;
          _t5 = _context4["catch"](4);
          console.error('Login error:', _t5);
          res.status(500).json({
            error: _t5.message
          });
        case 12:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[4, 11]]);
  }));
  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}()));

/**
 * Login with OTP (passwordless)
 * POST /store/auth/login-otp
 */
router.post('/login-otp', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$body4, phone, otp, normalizedPhone, otpResult, result, customer, token, _t6;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _req$body4 = req.body, phone = _req$body4.phone, otp = _req$body4.otp;
          if (!(!phone || !otp)) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'Phone number and OTP are required'
          }));
        case 1:
          // Normalize phone
          normalizedPhone = phone.replace(/\D/g, '');
          if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '250' + normalizedPhone.substring(1);
          } else if (!normalizedPhone.startsWith('250')) {
            normalizedPhone = '250' + normalizedPhone;
          }
          _context5.prev = 2;
          _context5.next = 3;
          return otpService.verifyOTP(normalizedPhone, otp, 'login');
        case 3:
          otpResult = _context5.sent;
          if (otpResult.valid) {
            _context5.next = 4;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: otpResult.error || 'Invalid OTP'
          }));
        case 4:
          _context5.next = 5;
          return db.query("\n      SELECT id, email, first_name, last_name, phone, metadata\n      FROM customer\n      WHERE phone = $1 OR metadata->>'phone' = $1\n    ", [normalizedPhone]);
        case 5:
          result = _context5.sent;
          if (!(result.rows.length === 0)) {
            _context5.next = 6;
            break;
          }
          return _context5.abrupt("return", res.status(401).json({
            error: 'Phone number not registered'
          }));
        case 6:
          customer = result.rows[0]; // Generate JWT token
          token = _jsonwebtoken["default"].sign({
            customer_id: customer.id,
            phone: normalizedPhone,
            email: customer.email
          }, JWT_SECRET, {
            expiresIn: '30d'
          }); // Log successful login
          _context5.next = 7;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'login_success', 'customer', $1, $2)\n    ", [customer.id, JSON.stringify({
            phone: normalizedPhone,
            method: 'otp'
          })]);
        case 7:
          res.json({
            success: true,
            customer: {
              id: customer.id,
              email: customer.email,
              first_name: customer.first_name,
              last_name: customer.last_name,
              phone: normalizedPhone
            },
            access_token: token
          });
          _context5.next = 9;
          break;
        case 8:
          _context5.prev = 8;
          _t6 = _context5["catch"](2);
          console.error('OTP Login error:', _t6);
          res.status(500).json({
            error: _t6.message
          });
        case 9:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[2, 8]]);
  }));
  return function (_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}()));

/**
 * Change PIN
 * POST /store/auth/change-pin
 */
router.post('/change-pin', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var _req$user;
    var customerId, _req$body5, current_pin, new_pin, _result$rows$0$metada, result, storedPinHash, currentPinHash, newPinHash, _t7;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          customerId = (_req$user = req.user) === null || _req$user === void 0 ? void 0 : _req$user.customer_id;
          _req$body5 = req.body, current_pin = _req$body5.current_pin, new_pin = _req$body5.new_pin;
          if (customerId) {
            _context6.next = 1;
            break;
          }
          return _context6.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          if (!(!current_pin || !new_pin)) {
            _context6.next = 2;
            break;
          }
          return _context6.abrupt("return", res.status(400).json({
            error: 'Current PIN and new PIN are required'
          }));
        case 2:
          if (/^\d{4,6}$/.test(new_pin)) {
            _context6.next = 3;
            break;
          }
          return _context6.abrupt("return", res.status(400).json({
            error: 'New PIN must be 4-6 digits'
          }));
        case 3:
          _context6.prev = 3;
          _context6.next = 4;
          return db.query('SELECT metadata FROM customer WHERE id = $1', [customerId]);
        case 4:
          result = _context6.sent;
          if (!(result.rows.length === 0)) {
            _context6.next = 5;
            break;
          }
          return _context6.abrupt("return", res.status(404).json({
            error: 'Customer not found'
          }));
        case 5:
          storedPinHash = (_result$rows$0$metada = result.rows[0].metadata) === null || _result$rows$0$metada === void 0 ? void 0 : _result$rows$0$metada.pin_hash; // Verify current PIN
          currentPinHash = _crypto["default"].createHash('sha256').update(current_pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret')).digest('hex');
          if (!(currentPinHash !== storedPinHash)) {
            _context6.next = 6;
            break;
          }
          return _context6.abrupt("return", res.status(401).json({
            error: 'Current PIN is incorrect'
          }));
        case 6:
          // Hash new PIN
          newPinHash = _crypto["default"].createHash('sha256').update(new_pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret')).digest('hex'); // Update PIN
          _context6.next = 7;
          return db.query("\n      UPDATE customer\n      SET metadata = metadata || $1, updated_at = NOW()\n      WHERE id = $2\n    ", [JSON.stringify({
            pin_hash: newPinHash
          }), customerId]);
        case 7:
          _context6.next = 8;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id)\n      VALUES ($1, 'pin_changed', 'customer', $1)\n    ", [customerId]);
        case 8:
          res.json({
            success: true,
            message: 'PIN changed successfully'
          });
          _context6.next = 10;
          break;
        case 9:
          _context6.prev = 9;
          _t7 = _context6["catch"](3);
          console.error('Change PIN error:', _t7);
          res.status(500).json({
            error: _t7.message
          });
        case 10:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[3, 9]]);
  }));
  return function (_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}()));

/**
 * Reset PIN (with OTP verification)
 * POST /store/auth/reset-pin
 */
router.post('/reset-pin', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var _req$body6, verification_token, new_pin, verification, verificationData, phone, customer, newPinHash, _t8;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          _req$body6 = req.body, verification_token = _req$body6.verification_token, new_pin = _req$body6.new_pin;
          if (!(!verification_token || !new_pin)) {
            _context7.next = 1;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Verification token and new PIN are required'
          }));
        case 1:
          if (/^\d{4,6}$/.test(new_pin)) {
            _context7.next = 2;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'PIN must be 4-6 digits'
          }));
        case 2:
          _context7.prev = 2;
          _context7.next = 3;
          return db.query("\n      SELECT new_values FROM bigcompany.audit_logs\n      WHERE action = 'phone_verified' AND entity_type = 'auth' AND entity_id = $1\n      ORDER BY created_at DESC LIMIT 1\n    ", [verification_token]);
        case 3:
          verification = _context7.sent;
          if (!(verification.rows.length === 0)) {
            _context7.next = 4;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Invalid or expired verification token'
          }));
        case 4:
          verificationData = verification.rows[0].new_values; // Check expiry
          if (!(new Date(verificationData.expires_at) < new Date())) {
            _context7.next = 5;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Verification token expired'
          }));
        case 5:
          phone = verificationData.phone; // Find customer
          _context7.next = 6;
          return db.query("\n      SELECT id FROM customer WHERE phone = $1 OR metadata->>'phone' = $1\n    ", [phone]);
        case 6:
          customer = _context7.sent;
          if (!(customer.rows.length === 0)) {
            _context7.next = 7;
            break;
          }
          return _context7.abrupt("return", res.status(404).json({
            error: 'Customer not found'
          }));
        case 7:
          // Hash new PIN
          newPinHash = _crypto["default"].createHash('sha256').update(new_pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret')).digest('hex'); // Update PIN
          _context7.next = 8;
          return db.query("\n      UPDATE customer\n      SET metadata = metadata || $1, updated_at = NOW()\n      WHERE id = $2\n    ", [JSON.stringify({
            pin_hash: newPinHash
          }), customer.rows[0].id]);
        case 8:
          _context7.next = 9;
          return db.query("\n      DELETE FROM bigcompany.audit_logs\n      WHERE action = 'phone_verified' AND entity_type = 'auth' AND entity_id = $1\n    ", [verification_token]);
        case 9:
          _context7.next = 10;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id)\n      VALUES ($1, 'pin_reset', 'customer', $1)\n    ", [customer.rows[0].id]);
        case 10:
          res.json({
            success: true,
            message: 'PIN reset successfully'
          });
          _context7.next = 12;
          break;
        case 11:
          _context7.prev = 11;
          _t8 = _context7["catch"](2);
          console.error('Reset PIN error:', _t8);
          res.status(500).json({
            error: _t8.message
          });
        case 12:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[2, 11]]);
  }));
  return function (_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}()));
var _default = exports["default"] = router;