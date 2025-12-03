"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _medusa = require("@medusajs/medusa");
var _momo = _interopRequireDefault(require("../../../services/momo"));
var _airtel = _interopRequireDefault(require("../../../services/airtel"));
var _sms = _interopRequireDefault(require("../../../services/sms"));
var _pg = require("pg");
var _crypto2 = _interopRequireDefault(require("crypto"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function _interopRequireWildcard(e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, "default": e }; if (null === e || "object" != _typeof(e) && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t7 in e) "default" !== _t7 && {}.hasOwnProperty.call(e, _t7) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t7)) && (i.get || i.set) ? o(f, _t7, i) : f[_t7] = e[_t7]); return f; })(e, t); }
var router = (0, _express.Router)();
var db = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});
var momoService = new _momo["default"]();
var airtelService = new _airtel["default"]();
var smsService = new _sms["default"]();
var VALID_AMOUNTS = [300, 500, 1000, 2000, 5000, 10000];

/**
 * Detect if phone number is MTN or Airtel
 */
function detectCarrier(phone) {
  var cleaned = phone.replace(/\D/g, '');
  var prefix = cleaned.substring(cleaned.length - 9, cleaned.length - 6);

  // MTN Rwanda: 078, 079
  if (prefix.startsWith('78') || prefix.startsWith('79')) {
    return 'mtn';
  }
  // Airtel Rwanda: 072, 073
  if (prefix.startsWith('72') || prefix.startsWith('73')) {
    return 'airtel';
  }
  return 'unknown';
}

/**
 * Get customer wallet balance
 * GET /store/wallet/balance
 */
router.get('/balance', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _req$user;
    var blnkService, customerId, _pendingTopups$rows$, balance, pendingTopups, activeLoan, foodLoanCredit, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          blnkService = req.scope.resolve('blnkService');
          customerId = (_req$user = req.user) === null || _req$user === void 0 ? void 0 : _req$user.customer_id;
          if (customerId) {
            _context.next = 1;
            break;
          }
          return _context.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context.prev = 1;
          _context.next = 2;
          return blnkService.getCustomerBalance(customerId, 'customer_wallets');
        case 2:
          balance = _context.sent;
          _context.next = 3;
          return db.query("\n      SELECT SUM(amount) as pending_amount\n      FROM bigcompany.wallet_topups\n      WHERE user_id = $1 AND status = 'pending'\n    ", [customerId]);
        case 3:
          pendingTopups = _context.sent;
          _context.next = 4;
          return db.query("\n      SELECT l.*, lp.loan_type\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      WHERE l.borrower_id = $1 AND l.status IN ('disbursed', 'active') AND lp.loan_type = 'food_loan'\n    ", [customerId]);
        case 4:
          activeLoan = _context.sent;
          foodLoanCredit = activeLoan.rows.length > 0 ? activeLoan.rows[0].principal - (activeLoan.rows[0].used_amount || 0) : 0;
          res.json({
            customer_id: customerId,
            balance: balance,
            currency: 'RWF',
            pending_topup: parseFloat((_pendingTopups$rows$ = pendingTopups.rows[0]) === null || _pendingTopups$rows$ === void 0 ? void 0 : _pendingTopups$rows$.pending_amount) || 0,
            food_loan_credit: foodLoanCredit,
            total_available: balance + foodLoanCredit
          });
          _context.next = 6;
          break;
        case 5:
          _context.prev = 5;
          _t = _context["catch"](1);
          console.error('Balance fetch error:', _t);
          res.status(500).json({
            error: _t.message
          });
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[1, 5]]);
  }));
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}()));

/**
 * Get wallet transaction history
 * GET /store/wallet/transactions
 */
router.get('/transactions', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _req$user2;
    var blnkService, customerId, _req$query, _req$query$limit, limit, _req$query$offset, offset, blnkTransactions, localTransactions, transactions, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          blnkService = req.scope.resolve('blnkService');
          customerId = (_req$user2 = req.user) === null || _req$user2 === void 0 ? void 0 : _req$user2.customer_id;
          _req$query = req.query, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 50 : _req$query$limit, _req$query$offset = _req$query.offset, offset = _req$query$offset === void 0 ? 0 : _req$query$offset;
          if (customerId) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context2.prev = 1;
          _context2.next = 2;
          return blnkService.listTransactions(customerId);
        case 2:
          blnkTransactions = _context2.sent;
          _context2.next = 3;
          return db.query("\n      SELECT\n        'topup' as source,\n        id,\n        amount,\n        'credit' as type,\n        status,\n        provider,\n        provider_reference as reference,\n        created_at,\n        metadata\n      FROM bigcompany.wallet_topups\n      WHERE user_id = $1\n      UNION ALL\n      SELECT\n        'gas' as source,\n        id,\n        amount,\n        'debit' as type,\n        status,\n        'gas_provider' as provider,\n        provider_reference as reference,\n        created_at,\n        metadata\n      FROM bigcompany.utility_topups\n      WHERE user_id = $1\n      ORDER BY created_at DESC\n      LIMIT $2 OFFSET $3\n    ", [customerId, limit, offset]);
        case 3:
          localTransactions = _context2.sent;
          // Merge and format transactions
          transactions = [].concat((0, _toConsumableArray2["default"])(blnkTransactions.map(function (tx) {
            var _tx$source, _tx$source2;
            return {
              id: tx.transaction_id,
              type: (_tx$source = tx.source) !== null && _tx$source !== void 0 && _tx$source.includes(customerId) ? 'debit' : 'credit',
              amount: parseFloat(tx.amount),
              description: tx.description || ((_tx$source2 = tx.source) !== null && _tx$source2 !== void 0 && _tx$source2.includes(customerId) ? 'Payment' : 'Top-up'),
              status: tx.status,
              created_at: tx.created_at,
              reference: tx.reference
            };
          })), (0, _toConsumableArray2["default"])(localTransactions.rows.map(function (tx) {
            return {
              id: tx.id,
              type: tx.type,
              amount: parseFloat(tx.amount),
              description: tx.source === 'topup' ? 'Wallet Top-up' : 'Gas Purchase',
              status: tx.status,
              created_at: tx.created_at,
              reference: tx.reference,
              metadata: tx.metadata
            };
          }))).sort(function (a, b) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          res.json({
            transactions: transactions.slice(0, parseInt(limit)),
            pagination: {
              limit: parseInt(limit),
              offset: parseInt(offset)
            }
          });
          _context2.next = 5;
          break;
        case 4:
          _context2.prev = 4;
          _t2 = _context2["catch"](1);
          console.error('Transactions fetch error:', _t2);
          res.status(500).json({
            error: _t2.message
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
 * Initiate wallet top-up via mobile money
 * POST /store/wallet/topup
 */
router.post('/topup', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$user3;
    var customerId, _req$body, amount, payment_method, phone_number, normalizedPhone, carrier, reference, paymentResult, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          customerId = (_req$user3 = req.user) === null || _req$user3 === void 0 ? void 0 : _req$user3.customer_id;
          _req$body = req.body, amount = _req$body.amount, payment_method = _req$body.payment_method, phone_number = _req$body.phone_number;
          if (customerId) {
            _context3.next = 1;
            break;
          }
          return _context3.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          if (VALID_AMOUNTS.includes(amount)) {
            _context3.next = 2;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            error: 'Invalid amount',
            valid_amounts: VALID_AMOUNTS
          }));
        case 2:
          if (phone_number) {
            _context3.next = 3;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            error: 'Phone number is required'
          }));
        case 3:
          // Normalize phone
          normalizedPhone = phone_number.replace(/\D/g, '');
          if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '250' + normalizedPhone.substring(1);
          } else if (!normalizedPhone.startsWith('250')) {
            normalizedPhone = '250' + normalizedPhone;
          }
          _context3.prev = 4;
          // Detect carrier if not specified
          carrier = payment_method || detectCarrier(normalizedPhone);
          if (!(carrier === 'unknown')) {
            _context3.next = 5;
            break;
          }
          return _context3.abrupt("return", res.status(400).json({
            error: 'Could not detect mobile money provider. Please specify payment_method (mtn_momo or airtel_money)'
          }));
        case 5:
          // Generate reference
          reference = "TOP-".concat(Date.now(), "-").concat(_crypto2["default"].randomBytes(4).toString('hex')); // Create pending topup record
          _context3.next = 6;
          return db.query("\n      INSERT INTO bigcompany.wallet_topups (user_id, amount, currency, status, provider, provider_reference, metadata)\n      VALUES ($1, $2, 'RWF', 'pending', $3, $4, $5)\n    ", [customerId, amount, carrier === 'mtn' || carrier === 'mtn_momo' ? 'mtn_momo' : 'airtel_money', reference, JSON.stringify({
            phone: normalizedPhone
          })]);
        case 6:
          if (!(carrier === 'mtn' || carrier === 'mtn_momo')) {
            _context3.next = 8;
            break;
          }
          _context3.next = 7;
          return momoService.requestPayment({
            amount: amount,
            currency: 'RWF',
            externalId: reference,
            payerPhone: normalizedPhone,
            payerMessage: "BIG Wallet Top-up - ".concat(amount, " RWF"),
            payeeNote: "Customer ".concat(customerId, " wallet topup")
          });
        case 7:
          paymentResult = _context3.sent;
          _context3.next = 10;
          break;
        case 8:
          _context3.next = 9;
          return airtelService.requestPayment({
            amount: amount,
            phone: normalizedPhone,
            reference: reference,
            description: "BIG Wallet Top-up - ".concat(amount, " RWF")
          });
        case 9:
          paymentResult = _context3.sent;
        case 10:
          if (!paymentResult.success) {
            _context3.next = 12;
            break;
          }
          _context3.next = 11;
          return db.query("\n        UPDATE bigcompany.wallet_topups\n        SET metadata = metadata || $1\n        WHERE provider_reference = $2\n      ", [JSON.stringify({
            momo_reference: paymentResult.referenceId || paymentResult.transactionId
          }), reference]);
        case 11:
          res.json({
            success: true,
            status: 'pending',
            reference: reference,
            momo_reference: paymentResult.referenceId || paymentResult.transactionId,
            amount: amount,
            currency: 'RWF',
            payment_method: carrier === 'mtn' || carrier === 'mtn_momo' ? 'mtn_momo' : 'airtel_money',
            message: 'Please approve the payment request on your phone'
          });
          _context3.next = 14;
          break;
        case 12:
          _context3.next = 13;
          return db.query("\n        UPDATE bigcompany.wallet_topups\n        SET status = 'failed', metadata = metadata || $1\n        WHERE provider_reference = $2\n      ", [JSON.stringify({
            error: paymentResult.error
          }), reference]);
        case 13:
          res.status(400).json({
            success: false,
            error: paymentResult.error || 'Failed to initiate payment'
          });
        case 14:
          _context3.next = 16;
          break;
        case 15:
          _context3.prev = 15;
          _t3 = _context3["catch"](4);
          console.error('Top-up initiation error:', _t3);
          res.status(500).json({
            error: _t3.message
          });
        case 16:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[4, 15]]);
  }));
  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}()));

/**
 * Check top-up status
 * GET /store/wallet/topup/:reference/status
 */
router.get('/topup/:reference/status', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$user4;
    var customerId, reference, topup, record, providerStatus, _record$metadata, _record$metadata2, blnkService, _customer$rows$, _customer$rows$2, customer, phone, balance, _t4, _t5;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          customerId = (_req$user4 = req.user) === null || _req$user4 === void 0 ? void 0 : _req$user4.customer_id;
          reference = req.params.reference;
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
          return db.query("\n      SELECT * FROM bigcompany.wallet_topups\n      WHERE provider_reference = $1 AND user_id = $2\n    ", [reference, customerId]);
        case 2:
          topup = _context4.sent;
          if (!(topup.rows.length === 0)) {
            _context4.next = 3;
            break;
          }
          return _context4.abrupt("return", res.status(404).json({
            error: 'Top-up not found'
          }));
        case 3:
          record = topup.rows[0]; // If still pending, check with provider
          if (!(record.status === 'pending')) {
            _context4.next = 18;
            break;
          }
          if (!(record.provider === 'mtn_momo')) {
            _context4.next = 5;
            break;
          }
          _context4.next = 4;
          return momoService.checkPaymentStatus(((_record$metadata = record.metadata) === null || _record$metadata === void 0 ? void 0 : _record$metadata.momo_reference) || reference);
        case 4:
          providerStatus = _context4.sent;
          _context4.next = 7;
          break;
        case 5:
          _context4.next = 6;
          return airtelService.checkPaymentStatus(((_record$metadata2 = record.metadata) === null || _record$metadata2 === void 0 ? void 0 : _record$metadata2.momo_reference) || reference);
        case 6:
          providerStatus = _context4.sent;
        case 7:
          if (!(providerStatus.status === 'SUCCESSFUL' || providerStatus.status === 'completed')) {
            _context4.next = 16;
            break;
          }
          _context4.next = 8;
          return db.query("\n          UPDATE bigcompany.wallet_topups\n          SET status = 'success', completed_at = NOW()\n          WHERE provider_reference = $1\n        ", [reference]);
        case 8:
          // Credit wallet via Blnk
          blnkService = req.scope.resolve('blnkService');
          _context4.prev = 9;
          _context4.next = 10;
          return blnkService.creditCustomerWallet(customerId, record.amount, reference, "Wallet top-up via ".concat(record.provider));
        case 10:
          _context4.next = 11;
          return db.query("SELECT phone, metadata->>'phone' as meta_phone FROM customer WHERE id = $1", [customerId]);
        case 11:
          customer = _context4.sent;
          phone = ((_customer$rows$ = customer.rows[0]) === null || _customer$rows$ === void 0 ? void 0 : _customer$rows$.phone) || ((_customer$rows$2 = customer.rows[0]) === null || _customer$rows$2 === void 0 ? void 0 : _customer$rows$2.meta_phone);
          if (!phone) {
            _context4.next = 13;
            break;
          }
          _context4.next = 12;
          return blnkService.getCustomerBalance(customerId, 'customer_wallets');
        case 12:
          balance = _context4.sent;
          _context4.next = 13;
          return smsService.send({
            to: phone,
            message: "BIG: Wallet topped up with ".concat(record.amount.toLocaleString(), " RWF. New balance: ").concat(balance.toLocaleString(), " RWF. Ref: ").concat(reference)
          });
        case 13:
          _context4.next = 15;
          break;
        case 14:
          _context4.prev = 14;
          _t4 = _context4["catch"](9);
          console.error('Blnk credit error:', _t4);
        case 15:
          return _context4.abrupt("return", res.json({
            reference: reference,
            status: 'success',
            amount: record.amount,
            currency: 'RWF',
            message: 'Top-up successful'
          }));
        case 16:
          if (!(providerStatus.status === 'FAILED' || providerStatus.status === 'failed')) {
            _context4.next = 18;
            break;
          }
          _context4.next = 17;
          return db.query("\n          UPDATE bigcompany.wallet_topups\n          SET status = 'failed', metadata = metadata || $1\n          WHERE provider_reference = $2\n        ", [JSON.stringify({
            failure_reason: providerStatus.reason
          }), reference]);
        case 17:
          return _context4.abrupt("return", res.json({
            reference: reference,
            status: 'failed',
            amount: record.amount,
            currency: 'RWF',
            error: providerStatus.reason || 'Payment failed'
          }));
        case 18:
          res.json({
            reference: reference,
            status: record.status,
            amount: record.amount,
            currency: 'RWF',
            created_at: record.created_at,
            completed_at: record.completed_at
          });
          _context4.next = 20;
          break;
        case 19:
          _context4.prev = 19;
          _t5 = _context4["catch"](1);
          console.error('Status check error:', _t5);
          res.status(500).json({
            error: _t5.message
          });
        case 20:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[1, 19], [9, 14]]);
  }));
  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}()));

/**
 * Transfer to another BIG customer
 * POST /store/wallet/transfer
 */
router.post('/transfer', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$user5;
    var blnkService, customerId, _req$body2, recipient_phone, amount, pin, note, normalizedPhone, _sender$rows$, _sender$rows$$metadat, _sender$rows$2, _sender$rows$2$metada, sender, storedPinHash, _crypto, inputPinHash, recipient, recipientData, balance, reference, senderPhone, recipientPhone, senderName, _t6;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          blnkService = req.scope.resolve('blnkService');
          customerId = (_req$user5 = req.user) === null || _req$user5 === void 0 ? void 0 : _req$user5.customer_id;
          _req$body2 = req.body, recipient_phone = _req$body2.recipient_phone, amount = _req$body2.amount, pin = _req$body2.pin, note = _req$body2.note;
          if (customerId) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          if (!(!recipient_phone || !amount || !pin)) {
            _context5.next = 2;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'Recipient phone, amount, and PIN are required'
          }));
        case 2:
          if (!(amount < 100)) {
            _context5.next = 3;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'Minimum transfer amount is 100 RWF'
          }));
        case 3:
          // Normalize recipient phone
          normalizedPhone = recipient_phone.replace(/\D/g, '');
          if (normalizedPhone.startsWith('0')) {
            normalizedPhone = '250' + normalizedPhone.substring(1);
          } else if (!normalizedPhone.startsWith('250')) {
            normalizedPhone = '250' + normalizedPhone;
          }
          _context5.prev = 4;
          _context5.next = 5;
          return db.query('SELECT id, metadata, first_name, last_name FROM customer WHERE id = $1', [customerId]);
        case 5:
          sender = _context5.sent;
          storedPinHash = (_sender$rows$ = sender.rows[0]) === null || _sender$rows$ === void 0 ? void 0 : (_sender$rows$$metadat = _sender$rows$.metadata) === null || _sender$rows$$metadat === void 0 ? void 0 : _sender$rows$$metadat.pin_hash;
          _context5.next = 6;
          return Promise.resolve().then(function () {
            return _interopRequireWildcard(require('crypto'));
          });
        case 6:
          _crypto = _context5.sent;
          inputPinHash = _crypto.createHash('sha256').update(pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret')).digest('hex');
          if (!(inputPinHash !== storedPinHash)) {
            _context5.next = 7;
            break;
          }
          return _context5.abrupt("return", res.status(401).json({
            error: 'Invalid PIN'
          }));
        case 7:
          _context5.next = 8;
          return db.query("\n      SELECT id, first_name, last_name, phone, metadata->>'phone' as meta_phone\n      FROM customer\n      WHERE phone = $1 OR metadata->>'phone' = $1\n    ", [normalizedPhone]);
        case 8:
          recipient = _context5.sent;
          if (!(recipient.rows.length === 0)) {
            _context5.next = 9;
            break;
          }
          return _context5.abrupt("return", res.status(404).json({
            error: 'Recipient not found. They must have a BIG account.'
          }));
        case 9:
          recipientData = recipient.rows[0];
          if (!(recipientData.id === customerId)) {
            _context5.next = 10;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'Cannot transfer to yourself'
          }));
        case 10:
          _context5.next = 11;
          return blnkService.getCustomerBalance(customerId, 'customer_wallets');
        case 11:
          balance = _context5.sent;
          if (!(balance < amount)) {
            _context5.next = 12;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'Insufficient balance',
            balance: balance,
            required: amount
          }));
        case 12:
          // Generate reference
          reference = "TRF-".concat(Date.now(), "-").concat(_crypto.randomBytes(4).toString('hex')); // Execute transfer via Blnk
          _context5.next = 13;
          return blnkService.transfer(customerId, recipientData.id, amount, reference, note || "Transfer to ".concat(recipientData.first_name));
        case 13:
          // Send SMS to both parties
          senderPhone = (_sender$rows$2 = sender.rows[0]) === null || _sender$rows$2 === void 0 ? void 0 : (_sender$rows$2$metada = _sender$rows$2.metadata) === null || _sender$rows$2$metada === void 0 ? void 0 : _sender$rows$2$metada.phone;
          recipientPhone = recipientData.phone || recipientData.meta_phone;
          if (!senderPhone) {
            _context5.next = 14;
            break;
          }
          _context5.next = 14;
          return smsService.send({
            to: senderPhone,
            message: "BIG: You sent ".concat(amount.toLocaleString(), " RWF to ").concat(recipientData.first_name, ". Ref: ").concat(reference)
          });
        case 14:
          if (!recipientPhone) {
            _context5.next = 15;
            break;
          }
          senderName = "".concat(sender.rows[0].first_name, " ").concat(sender.rows[0].last_name).trim();
          _context5.next = 15;
          return smsService.send({
            to: recipientPhone,
            message: "BIG: You received ".concat(amount.toLocaleString(), " RWF from ").concat(senderName, ". Ref: ").concat(reference)
          });
        case 15:
          _context5.next = 16;
          return db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, 'wallet_transfer', 'transfer', $2, $3)\n    ", [customerId, reference, JSON.stringify({
            from: customerId,
            to: recipientData.id,
            amount: amount,
            note: note
          })]);
        case 16:
          res.json({
            success: true,
            reference: reference,
            amount: amount,
            currency: 'RWF',
            recipient: {
              name: "".concat(recipientData.first_name, " ").concat(recipientData.last_name).trim(),
              phone: normalizedPhone.slice(0, 6) + '***' + normalizedPhone.slice(-2)
            },
            message: 'Transfer successful'
          });
          _context5.next = 18;
          break;
        case 17:
          _context5.prev = 17;
          _t6 = _context5["catch"](4);
          console.error('Transfer error:', _t6);
          res.status(500).json({
            error: _t6.message
          });
        case 18:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[4, 17]]);
  }));
  return function (_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}()));

/**
 * Get predefined top-up amounts
 * GET /store/wallet/amounts
 */
router.get('/amounts', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(_req, res) {
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          res.json({
            amounts: VALID_AMOUNTS,
            currency: 'RWF',
            payment_methods: [{
              id: 'mtn_momo',
              name: 'MTN Mobile Money',
              prefixes: ['078', '079']
            }, {
              id: 'airtel_money',
              name: 'Airtel Money',
              prefixes: ['072', '073']
            }]
          });
        case 1:
        case "end":
          return _context6.stop();
      }
    }, _callee6);
  }));
  return function (_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}()));

/**
 * Get available payment methods
 * GET /store/wallet/methods
 */
router.get('/methods', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(_req, res) {
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          res.json({
            methods: [{
              id: 'mtn_momo',
              name: 'MTN Mobile Money',
              icon: 'mtn',
              prefixes: ['078', '079'],
              description: 'Pay with MTN Mobile Money',
              fees: {
                percentage: 0,
                fixed: 0
              },
              limits: {
                min: 300,
                max: 500000,
                daily: 1000000
              },
              enabled: true
            }, {
              id: 'airtel_money',
              name: 'Airtel Money',
              icon: 'airtel',
              prefixes: ['072', '073'],
              description: 'Pay with Airtel Money',
              fees: {
                percentage: 0,
                fixed: 0
              },
              limits: {
                min: 300,
                max: 500000,
                daily: 1000000
              },
              enabled: true
            }, {
              id: 'nfc_card',
              name: 'BIG Shop Card',
              icon: 'card',
              description: 'Pay with your BIG Shop Card at any retailer',
              fees: {
                percentage: 0,
                fixed: 0
              },
              limits: {
                min: 100,
                max: 100000,
                daily: 500000
              },
              enabled: true,
              requiresCard: true
            }],
            currency: 'RWF'
          });
        case 1:
        case "end":
          return _context7.stop();
      }
    }, _callee7);
  }));
  return function (_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}()));
var _default = exports["default"] = router;