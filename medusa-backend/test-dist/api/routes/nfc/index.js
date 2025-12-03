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
var _crypto = _interopRequireDefault(require("crypto"));
var _blnk = _interopRequireDefault(require("../../../services/blnk"));
var _sms = _interopRequireDefault(require("../../../services/sms"));
var _momo = _interopRequireDefault(require("../../../services/momo"));
var _airtel = _interopRequireDefault(require("../../../services/airtel"));
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
var router = (0, _express.Router)();

// Database pool
var db = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Service instances
var blnkService;
var smsService;
var momoService;
var airtelService;
function initServices(container) {
  if (!blnkService) {
    blnkService = new _blnk["default"](container);
    smsService = new _sms["default"]();
    momoService = new _momo["default"]();
    airtelService = new _airtel["default"]();
  }
}

// PIN hashing
var PIN_SECRET = process.env.PIN_SECRET || 'bigcompany_pin_secret_2024';
function hashPin(pin) {
  return _crypto["default"].createHash('sha256').update(pin + PIN_SECRET).digest('hex');
}
function verifyPin(inputPin, storedHash) {
  return hashPin(inputPin) === storedHash;
}

// Generate Dashboard ID (printed on physical card)
function generateDashboardId() {
  var prefix = 'BIG';
  var timestamp = Date.now().toString(36).toUpperCase();
  var random = _crypto["default"].randomBytes(3).toString('hex').toUpperCase();
  return "".concat(prefix, "-").concat(timestamp, "-").concat(random).substring(0, 15);
}

// Phone number helpers
function normalizePhone(phone) {
  var cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '250' + cleaned.substring(1);
  } else if (!cleaned.startsWith('250') && cleaned.length === 9) {
    cleaned = '250' + cleaned;
  }
  return cleaned;
}
function isMTNNumber(phone) {
  var cleaned = normalizePhone(phone);
  var prefix = cleaned.substring(3, 5);
  return ['78', '79'].includes(prefix);
}

// ==================== CUSTOMER ENDPOINTS ====================

/**
 * Link NFC card to customer account
 * POST /store/nfc/link
 */
router.post('/link', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _req$user;
    var customerId, _req$body, card_uid, alias, pin, _customer$rows$, normalizedUid, existingCard, dashboardId, card, customer, result, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          initServices(req.scope);
          customerId = (_req$user = req.user) === null || _req$user === void 0 ? void 0 : _req$user.customer_id;
          _req$body = req.body, card_uid = _req$body.card_uid, alias = _req$body.alias, pin = _req$body.pin;
          if (customerId) {
            _context.next = 1;
            break;
          }
          return _context.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          if (card_uid) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return", res.status(400).json({
            error: 'Card UID is required'
          }));
        case 2:
          if (!(!pin || !/^\d{4,6}$/.test(pin))) {
            _context.next = 3;
            break;
          }
          return _context.abrupt("return", res.status(400).json({
            error: 'PIN must be 4-6 digits'
          }));
        case 3:
          _context.prev = 3;
          normalizedUid = card_uid.toUpperCase().trim(); // Check if card exists in system
          _context.next = 4;
          return db.query("\n      SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1\n    ", [normalizedUid]);
        case 4:
          existingCard = _context.sent;
          if (!(existingCard.rows.length > 0)) {
            _context.next = 8;
            break;
          }
          card = existingCard.rows[0]; // Check if already linked to another user
          if (!(card.user_id && card.user_id !== customerId)) {
            _context.next = 5;
            break;
          }
          return _context.abrupt("return", res.status(400).json({
            error: 'This card is already linked to another account'
          }));
        case 5:
          if (!(card.user_id === customerId)) {
            _context.next = 6;
            break;
          }
          return _context.abrupt("return", res.status(400).json({
            error: 'This card is already linked to your account'
          }));
        case 6:
          dashboardId = card.dashboard_id;

          // Link to user
          _context.next = 7;
          return db.query("\n        UPDATE bigcompany.nfc_cards\n        SET user_id = $1, card_alias = $2, pin_hash = $3, is_active = true, linked_at = NOW()\n        WHERE card_uid = $4\n      ", [customerId, alias || 'My Card', hashPin(pin), normalizedUid]);
        case 7:
          _context.next = 9;
          break;
        case 8:
          // Auto-register new card and link
          dashboardId = generateDashboardId();
          _context.next = 9;
          return db.query("\n        INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, user_id, card_alias, pin_hash, is_active, linked_at)\n        VALUES ($1, $2, $3, $4, $5, true, NOW())\n      ", [normalizedUid, dashboardId, customerId, alias || 'My Card', hashPin(pin)]);
        case 9:
          _context.next = 10;
          return db.query("\n      SELECT phone, email, first_name FROM customer WHERE id = $1\n    ", [customerId]);
        case 10:
          customer = _context.sent;
          if (!((_customer$rows$ = customer.rows[0]) !== null && _customer$rows$ !== void 0 && _customer$rows$.phone)) {
            _context.next = 11;
            break;
          }
          _context.next = 11;
          return smsService.send({
            to: customer.rows[0].phone,
            message: "BIG Card linked successfully!\nCard ID: ".concat(dashboardId, "\nManage at bigcompany.rw or *939#")
          });
        case 11:
          _context.next = 12;
          return db.query("\n      SELECT id, card_uid, dashboard_id, card_alias, is_active, linked_at\n      FROM bigcompany.nfc_cards WHERE card_uid = $1\n    ", [normalizedUid]);
        case 12:
          result = _context.sent;
          res.json({
            success: true,
            message: 'Card linked successfully',
            card: result.rows[0]
          });
          _context.next = 14;
          break;
        case 13:
          _context.prev = 13;
          _t = _context["catch"](3);
          console.error('Card link error:', _t);
          res.status(500).json({
            error: 'Failed to link card'
          });
        case 14:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[3, 13]]);
  }));
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}()));

/**
 * Get customer's NFC cards
 * GET /store/nfc/cards
 */
router.get('/cards', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _req$user2;
    var customerId, cards, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          customerId = (_req$user2 = req.user) === null || _req$user2 === void 0 ? void 0 : _req$user2.customer_id;
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
          return db.query("\n      SELECT id, card_uid, dashboard_id, card_alias, is_active, linked_at, last_used_at\n      FROM bigcompany.nfc_cards\n      WHERE user_id = $1\n      ORDER BY linked_at DESC\n    ", [customerId]);
        case 2:
          cards = _context2.sent;
          res.json({
            cards: cards.rows
          });
          _context2.next = 4;
          break;
        case 3:
          _context2.prev = 3;
          _t2 = _context2["catch"](1);
          console.error('Get cards error:', _t2);
          res.status(500).json({
            error: 'Failed to get cards'
          });
        case 4:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[1, 3]]);
  }));
  return function (_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}()));

/**
 * Get single card details
 * GET /store/nfc/cards/:id
 */
router.get('/cards/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$user3;
    var customerId, cardId, card, transactions, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          initServices(req.scope);
          customerId = (_req$user3 = req.user) === null || _req$user3 === void 0 ? void 0 : _req$user3.customer_id;
          cardId = req.params.id;
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
          return db.query("\n      SELECT id, card_uid, dashboard_id, card_alias, is_active, linked_at, last_used_at\n      FROM bigcompany.nfc_cards\n      WHERE id = $1 AND user_id = $2\n    ", [cardId, customerId]);
        case 2:
          card = _context3.sent;
          if (!(card.rows.length === 0)) {
            _context3.next = 3;
            break;
          }
          return _context3.abrupt("return", res.status(404).json({
            error: 'Card not found'
          }));
        case 3:
          _context3.next = 4;
          return db.query("\n      SELECT * FROM bigcompany.nfc_transactions\n      WHERE card_id = $1\n      ORDER BY created_at DESC\n      LIMIT 20\n    ", [cardId]);
        case 4:
          transactions = _context3.sent;
          res.json({
            card: card.rows[0],
            transactions: transactions.rows
          });
          _context3.next = 6;
          break;
        case 5:
          _context3.prev = 5;
          _t3 = _context3["catch"](1);
          res.status(500).json({
            error: 'Failed to get card details'
          });
        case 6:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[1, 5]]);
  }));
  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}()));

/**
 * Update card alias
 * PATCH /store/nfc/cards/:id
 */
router.patch('/cards/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$user4;
    var customerId, cardId, alias, result, _t4;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          customerId = (_req$user4 = req.user) === null || _req$user4 === void 0 ? void 0 : _req$user4.customer_id;
          cardId = req.params.id;
          alias = req.body.alias;
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
          return db.query("\n      UPDATE bigcompany.nfc_cards\n      SET card_alias = $1, updated_at = NOW()\n      WHERE id = $2 AND user_id = $3\n      RETURNING id, card_uid, dashboard_id, card_alias, is_active\n    ", [alias, cardId, customerId]);
        case 2:
          result = _context4.sent;
          if (!(result.rows.length === 0)) {
            _context4.next = 3;
            break;
          }
          return _context4.abrupt("return", res.status(404).json({
            error: 'Card not found'
          }));
        case 3:
          res.json({
            success: true,
            card: result.rows[0]
          });
          _context4.next = 5;
          break;
        case 4:
          _context4.prev = 4;
          _t4 = _context4["catch"](1);
          res.status(500).json({
            error: 'Failed to update card'
          });
        case 5:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[1, 4]]);
  }));
  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}()));

/**
 * Update card PIN
 * POST /store/nfc/cards/:id/pin
 */
router.post('/cards/:id/pin', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$user5;
    var customerId, cardId, _req$body2, current_pin, new_pin, card, _t5;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          customerId = (_req$user5 = req.user) === null || _req$user5 === void 0 ? void 0 : _req$user5.customer_id;
          cardId = req.params.id;
          _req$body2 = req.body, current_pin = _req$body2.current_pin, new_pin = _req$body2.new_pin;
          if (customerId) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          if (!(!new_pin || !/^\d{4,6}$/.test(new_pin))) {
            _context5.next = 2;
            break;
          }
          return _context5.abrupt("return", res.status(400).json({
            error: 'New PIN must be 4-6 digits'
          }));
        case 2:
          _context5.prev = 2;
          _context5.next = 3;
          return db.query("\n      SELECT * FROM bigcompany.nfc_cards\n      WHERE id = $1 AND user_id = $2\n    ", [cardId, customerId]);
        case 3:
          card = _context5.sent;
          if (!(card.rows.length === 0)) {
            _context5.next = 4;
            break;
          }
          return _context5.abrupt("return", res.status(404).json({
            error: 'Card not found'
          }));
        case 4:
          if (verifyPin(current_pin, card.rows[0].pin_hash)) {
            _context5.next = 5;
            break;
          }
          return _context5.abrupt("return", res.status(401).json({
            error: 'Current PIN is incorrect'
          }));
        case 5:
          _context5.next = 6;
          return db.query("\n      UPDATE bigcompany.nfc_cards SET pin_hash = $1, updated_at = NOW()\n      WHERE id = $2\n    ", [hashPin(new_pin), cardId]);
        case 6:
          res.json({
            success: true,
            message: 'PIN updated successfully'
          });
          _context5.next = 8;
          break;
        case 7:
          _context5.prev = 7;
          _t5 = _context5["catch"](2);
          res.status(500).json({
            error: 'Failed to update PIN'
          });
        case 8:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[2, 7]]);
  }));
  return function (_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}()));

/**
 * Block/Unblock card
 * POST /store/nfc/cards/:id/status
 */
router.post('/cards/:id/status', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var _req$user6;
    var customerId, cardId, _req$body3, active, pin, card, _t6;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          customerId = (_req$user6 = req.user) === null || _req$user6 === void 0 ? void 0 : _req$user6.customer_id;
          cardId = req.params.id;
          _req$body3 = req.body, active = _req$body3.active, pin = _req$body3.pin;
          if (customerId) {
            _context6.next = 1;
            break;
          }
          return _context6.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context6.prev = 1;
          _context6.next = 2;
          return db.query("\n      SELECT * FROM bigcompany.nfc_cards\n      WHERE id = $1 AND user_id = $2\n    ", [cardId, customerId]);
        case 2:
          card = _context6.sent;
          if (!(card.rows.length === 0)) {
            _context6.next = 3;
            break;
          }
          return _context6.abrupt("return", res.status(404).json({
            error: 'Card not found'
          }));
        case 3:
          if (!(active === true && pin)) {
            _context6.next = 4;
            break;
          }
          if (verifyPin(pin, card.rows[0].pin_hash)) {
            _context6.next = 4;
            break;
          }
          return _context6.abrupt("return", res.status(401).json({
            error: 'Invalid PIN'
          }));
        case 4:
          _context6.next = 5;
          return db.query("\n      UPDATE bigcompany.nfc_cards SET is_active = $1, updated_at = NOW()\n      WHERE id = $2\n    ", [active, cardId]);
        case 5:
          res.json({
            success: true,
            message: active ? 'Card unblocked' : 'Card blocked',
            is_active: active
          });
          _context6.next = 7;
          break;
        case 6:
          _context6.prev = 6;
          _t6 = _context6["catch"](1);
          res.status(500).json({
            error: 'Failed to update card status'
          });
        case 7:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[1, 6]]);
  }));
  return function (_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}()));

/**
 * Unlink NFC card
 * DELETE /store/nfc/cards/:id
 */
router["delete"]('/cards/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var _req$user7;
    var customerId, cardId, pin, card, _t7;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          customerId = (_req$user7 = req.user) === null || _req$user7 === void 0 ? void 0 : _req$user7.customer_id;
          cardId = req.params.id;
          pin = req.body.pin;
          if (customerId) {
            _context7.next = 1;
            break;
          }
          return _context7.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context7.prev = 1;
          _context7.next = 2;
          return db.query("\n      SELECT * FROM bigcompany.nfc_cards\n      WHERE id = $1 AND user_id = $2\n    ", [cardId, customerId]);
        case 2:
          card = _context7.sent;
          if (!(card.rows.length === 0)) {
            _context7.next = 3;
            break;
          }
          return _context7.abrupt("return", res.status(404).json({
            error: 'Card not found'
          }));
        case 3:
          if (!(pin && !verifyPin(pin, card.rows[0].pin_hash))) {
            _context7.next = 4;
            break;
          }
          return _context7.abrupt("return", res.status(401).json({
            error: 'Invalid PIN'
          }));
        case 4:
          _context7.next = 5;
          return db.query("\n      UPDATE bigcompany.nfc_cards\n      SET user_id = NULL, is_active = false, pin_hash = NULL, card_alias = NULL\n      WHERE id = $1\n    ", [cardId]);
        case 5:
          res.json({
            success: true,
            message: 'Card unlinked successfully'
          });
          _context7.next = 7;
          break;
        case 6:
          _context7.prev = 6;
          _t7 = _context7["catch"](1);
          res.status(500).json({
            error: 'Failed to unlink card'
          });
        case 7:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[1, 6]]);
  }));
  return function (_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}()));

// ==================== POS ENDPOINTS ====================

/**
 * POS: Validate NFC card (quick check without payment)
 * POST /pos/nfc/validate
 */
router.post('/validate', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref8 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(req, res) {
    var _req$body4;
    var card_uid, normalizedUid, card, cardData, _t8, _t9;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          card_uid = (_req$body4 = req.body) === null || _req$body4 === void 0 ? void 0 : _req$body4.card_uid;
          if (card_uid) {
            _context8.next = 1;
            break;
          }
          return _context8.abrupt("return", res.status(400).json({
            valid: false,
            error: 'Card UID is required'
          }));
        case 1:
          _context8.prev = 1;
          normalizedUid = card_uid.toUpperCase().trim(); // Try to validate card
          _context8.prev = 2;
          _context8.next = 3;
          return db.query("\n        SELECT c.id, c.dashboard_id, c.card_alias, c.is_active, c.user_id,\n               u.first_name, u.last_name\n        FROM bigcompany.nfc_cards c\n        LEFT JOIN customer u ON c.user_id = u.id\n        WHERE c.card_uid = $1\n      ", [normalizedUid]);
        case 3:
          card = _context8.sent;
          _context8.next = 5;
          break;
        case 4:
          _context8.prev = 4;
          _t8 = _context8["catch"](2);
          // Schema or table doesn't exist - return valid:false with message
          console.error('NFC validate DB error:', _t8.message);
          return _context8.abrupt("return", res.status(404).json({
            valid: false,
            error: 'Card validation service unavailable'
          }));
        case 5:
          if (!(card.rows.length === 0)) {
            _context8.next = 6;
            break;
          }
          return _context8.abrupt("return", res.status(404).json({
            valid: false,
            error: 'Card not registered'
          }));
        case 6:
          cardData = card.rows[0];
          res.json({
            valid: cardData.is_active && cardData.user_id !== null,
            dashboard_id: cardData.dashboard_id,
            card_alias: cardData.card_alias,
            is_active: cardData.is_active,
            is_linked: cardData.user_id !== null,
            customer_name: cardData.first_name ? "".concat(cardData.first_name, " ").concat(cardData.last_name || '').trim() : null
          });
          _context8.next = 8;
          break;
        case 7:
          _context8.prev = 7;
          _t9 = _context8["catch"](1);
          console.error('NFC validate error:', _t9);
          res.status(500).json({
            valid: false,
            error: 'Validation failed'
          });
        case 8:
        case "end":
          return _context8.stop();
      }
    }, _callee8, null, [[1, 7], [2, 4]]);
  }));
  return function (_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
}()));

/**
 * POS: Process NFC card payment (tap-to-pay)
 * POST /pos/nfc/pay
 *
 * Called by retailer POS terminals when customer taps card
 */
router.post('/pay', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref9 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(req, res) {
    var _req$body5, card_uid, pin, amount, merchant_id, order_reference, items, _loanResult$rows$, normalizedUid, cardResult, card, PIN_THRESHOLD, merchant, merchantData, walletBalance, loanResult, foodCredit, totalAvailable, transactionRef, walletDeduction, loanDeduction, newWalletBalance, newLoanCredit, _momoResult, shortfall, phone, momoRef, momoResult, _t0, _t1;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          initServices(req.scope);
          _req$body5 = req.body, card_uid = _req$body5.card_uid, pin = _req$body5.pin, amount = _req$body5.amount, merchant_id = _req$body5.merchant_id, order_reference = _req$body5.order_reference, items = _req$body5.items; // Validate required fields
          if (!(!card_uid || !amount || !merchant_id)) {
            _context9.next = 1;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'Missing required fields: card_uid, amount, merchant_id'
          }));
        case 1:
          if (!(amount <= 0)) {
            _context9.next = 2;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'Invalid amount'
          }));
        case 2:
          _context9.prev = 2;
          normalizedUid = card_uid.toUpperCase().trim(); // Get card with user details
          _context9.next = 3;
          return db.query("\n      SELECT c.*, u.phone as customer_phone, u.email as customer_email,\n             u.first_name, u.last_name\n      FROM bigcompany.nfc_cards c\n      JOIN customer u ON c.user_id = u.id\n      WHERE c.card_uid = $1\n    ", [normalizedUid]);
        case 3:
          cardResult = _context9.sent;
          if (!(cardResult.rows.length === 0)) {
            _context9.next = 4;
            break;
          }
          return _context9.abrupt("return", res.status(404).json({
            error: 'Card not found or not linked to an account'
          }));
        case 4:
          card = cardResult.rows[0]; // Check if card is active
          if (card.is_active) {
            _context9.next = 5;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'Card is blocked. Contact support or use *939#'
          }));
        case 5:
          // PIN required for amounts > 5000 RWF (configurable threshold)
          PIN_THRESHOLD = Number(process.env.NFC_PIN_THRESHOLD) || 5000;
          if (!(amount > PIN_THRESHOLD)) {
            _context9.next = 8;
            break;
          }
          if (pin) {
            _context9.next = 6;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'PIN required for transactions over 5,000 RWF',
            requires_pin: true
          }));
        case 6:
          if (verifyPin(pin, card.pin_hash)) {
            _context9.next = 8;
            break;
          }
          _context9.next = 7;
          return db.query("\n          INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, metadata)\n          VALUES ($1, 'nfc_pin_failed', 'nfc_card', $2, $3)\n        ", [card.user_id, card.id, JSON.stringify({
            merchant_id: merchant_id,
            amount: amount
          })]);
        case 7:
          return _context9.abrupt("return", res.status(401).json({
            error: 'Invalid PIN'
          }));
        case 8:
          _context9.next = 9;
          return db.query("\n      SELECT * FROM bigcompany.merchant_profiles WHERE id = $1\n    ", [merchant_id]);
        case 9:
          merchant = _context9.sent;
          if (!(merchant.rows.length === 0)) {
            _context9.next = 10;
            break;
          }
          return _context9.abrupt("return", res.status(404).json({
            error: 'Merchant not found'
          }));
        case 10:
          merchantData = merchant.rows[0];
          if (merchantData.blnk_account_id) {
            _context9.next = 11;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'Merchant wallet not configured'
          }));
        case 11:
          _context9.next = 12;
          return blnkService.getCustomerBalance(card.user_id, 'customer_wallets');
        case 12:
          walletBalance = _context9.sent;
          _context9.next = 13;
          return db.query("\n      SELECT SUM(outstanding_balance) as credit FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('active', 'disbursed')\n      AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')\n    ", [card.user_id]);
        case 13:
          loanResult = _context9.sent;
          foodCredit = Number(((_loanResult$rows$ = loanResult.rows[0]) === null || _loanResult$rows$ === void 0 ? void 0 : _loanResult$rows$.credit) || 0);
          totalAvailable = walletBalance + foodCredit;
          transactionRef = "NFC-".concat(Date.now(), "-").concat(_crypto["default"].randomBytes(4).toString('hex'));
          if (!(totalAvailable >= amount)) {
            _context9.next = 23;
            break;
          }
          _context9.prev = 14;
          // Determine payment source (wallet first, then loan credit)
          walletDeduction = Math.min(walletBalance, amount);
          loanDeduction = amount - walletDeduction; // Execute wallet transaction via Blnk
          if (!(walletDeduction > 0)) {
            _context9.next = 15;
            break;
          }
          _context9.next = 15;
          return blnkService.payFromWallet(card.user_id, merchantData.blnk_account_id, walletDeduction, transactionRef);
        case 15:
          if (!(loanDeduction > 0)) {
            _context9.next = 16;
            break;
          }
          _context9.next = 16;
          return db.query("\n            UPDATE bigcompany.loans\n            SET outstanding_balance = outstanding_balance - $1, updated_at = NOW()\n            WHERE borrower_id = $2 AND status IN ('active', 'disbursed')\n            AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')\n            AND outstanding_balance >= $1\n          ", [loanDeduction, card.user_id]);
        case 16:
          _context9.next = 17;
          return db.query("\n          UPDATE bigcompany.nfc_cards SET last_used_at = NOW() WHERE id = $1\n        ", [card.id]);
        case 17:
          _context9.next = 18;
          return db.query("\n          INSERT INTO bigcompany.nfc_transactions\n          (card_id, user_id, merchant_id, amount, currency, transaction_ref, status, payment_source, metadata)\n          VALUES ($1, $2, $3, $4, 'RWF', $5, 'success', $6, $7)\n        ", [card.id, card.user_id, merchant_id, amount, transactionRef, walletDeduction > 0 && loanDeduction > 0 ? 'wallet+loan' : walletDeduction > 0 ? 'wallet' : 'loan', JSON.stringify({
            order_reference: order_reference,
            items: items,
            wallet_deduction: walletDeduction,
            loan_deduction: loanDeduction
          })]);
        case 18:
          // Calculate new balance
          newWalletBalance = walletBalance - walletDeduction;
          newLoanCredit = foodCredit - loanDeduction; // Send SMS notification
          if (!card.customer_phone) {
            _context9.next = 19;
            break;
          }
          _context9.next = 19;
          return smsService.send({
            to: card.customer_phone,
            message: "BIG: Payment of ".concat(amount.toLocaleString(), " RWF at ").concat(merchantData.business_name, " successful. Ref: ").concat(transactionRef.substring(0, 12), ". Balance: ").concat(newWalletBalance.toLocaleString(), " RWF")
          });
        case 19:
          res.json({
            success: true,
            transaction_ref: transactionRef,
            amount: amount,
            currency: 'RWF',
            merchant: merchantData.business_name,
            customer_name: "".concat(card.first_name || '', " ").concat(card.last_name || '').trim() || 'Customer',
            dashboard_id: card.dashboard_id,
            new_balance: newWalletBalance,
            message: 'Payment successful'
          });
          _context9.next = 22;
          break;
        case 20:
          _context9.prev = 20;
          _t0 = _context9["catch"](14);
          console.error('NFC payment processing error:', _t0);

          // Record failed transaction
          _context9.next = 21;
          return db.query("\n          INSERT INTO bigcompany.nfc_transactions\n          (card_id, user_id, merchant_id, amount, currency, transaction_ref, status, metadata)\n          VALUES ($1, $2, $3, $4, 'RWF', $5, 'failed', $6)\n        ", [card.id, card.user_id, merchant_id, amount, transactionRef, JSON.stringify({
            error: _t0.message
          })]);
        case 21:
          return _context9.abrupt("return", res.status(500).json({
            error: 'Payment processing failed'
          }));
        case 22:
          _context9.next = 31;
          break;
        case 23:
          // Insufficient balance - trigger MoMo push to top up
          shortfall = amount - totalAvailable;
          phone = card.customer_phone;
          if (phone) {
            _context9.next = 24;
            break;
          }
          return _context9.abrupt("return", res.status(400).json({
            error: 'Insufficient balance',
            balance: totalAvailable,
            required: amount,
            shortfall: shortfall
          }));
        case 24:
          // Initiate mobile money collection for shortfall
          momoRef = "NFC-MOMO-".concat(Date.now());
          if (!isMTNNumber(phone)) {
            _context9.next = 26;
            break;
          }
          _context9.next = 25;
          return momoService.requestPayment({
            amount: shortfall,
            currency: 'RWF',
            externalId: momoRef,
            payerPhone: phone,
            payerMessage: "BIG Top-up for payment at ".concat(merchantData.business_name)
          });
        case 25:
          momoResult = _context9.sent;
          _context9.next = 28;
          break;
        case 26:
          _context9.next = 27;
          return airtelService.requestPayment({
            amount: shortfall,
            phone: phone,
            reference: momoRef
          });
        case 27:
          momoResult = _context9.sent;
        case 28:
          if (!((_momoResult = momoResult) !== null && _momoResult !== void 0 && _momoResult.success)) {
            _context9.next = 30;
            break;
          }
          _context9.next = 29;
          return db.query("\n          INSERT INTO bigcompany.nfc_transactions\n          (card_id, user_id, merchant_id, amount, currency, transaction_ref, status, metadata)\n          VALUES ($1, $2, $3, $4, 'RWF', $5, 'pending_momo', $6)\n        ", [card.id, card.user_id, merchant_id, amount, transactionRef, JSON.stringify({
            order_reference: order_reference,
            items: items,
            shortfall: shortfall,
            wallet_balance: walletBalance,
            loan_credit: foodCredit,
            momo_reference: momoRef,
            momo_provider: isMTNNumber(phone) ? 'mtn' : 'airtel'
          })]);
        case 29:
          return _context9.abrupt("return", res.status(202).json({
            success: false,
            pending_momo: true,
            transaction_ref: transactionRef,
            momo_reference: momoResult.referenceId || momoResult.transactionId,
            shortfall: shortfall,
            message: "Insufficient balance. MoMo request sent for ".concat(shortfall.toLocaleString(), " RWF. Approve on your phone.")
          }));
        case 30:
          return _context9.abrupt("return", res.status(400).json({
            error: 'Insufficient balance',
            balance: totalAvailable,
            required: amount,
            shortfall: shortfall,
            message: "Balance: ".concat(totalAvailable.toLocaleString(), " RWF. Need: ").concat(amount.toLocaleString(), " RWF")
          }));
        case 31:
          _context9.next = 33;
          break;
        case 32:
          _context9.prev = 32;
          _t1 = _context9["catch"](2);
          console.error('NFC pay error:', _t1);
          res.status(500).json({
            error: 'Payment failed'
          });
        case 33:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[2, 32], [14, 20]]);
  }));
  return function (_x15, _x16) {
    return _ref9.apply(this, arguments);
  };
}()));

/**
 * POS: Check payment status (for pending MoMo payments)
 * GET /pos/nfc/status/:reference
 */
router.get('/status/:reference', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref0 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(req, res) {
    var reference, transaction, tx, _t10;
    return _regenerator["default"].wrap(function (_context0) {
      while (1) switch (_context0.prev = _context0.next) {
        case 0:
          reference = req.params.reference;
          _context0.prev = 1;
          _context0.next = 2;
          return db.query("\n      SELECT t.*, m.business_name as merchant_name\n      FROM bigcompany.nfc_transactions t\n      LEFT JOIN bigcompany.merchant_profiles m ON t.merchant_id = m.id\n      WHERE t.transaction_ref = $1\n    ", [reference]);
        case 2:
          transaction = _context0.sent;
          if (!(transaction.rows.length === 0)) {
            _context0.next = 3;
            break;
          }
          return _context0.abrupt("return", res.status(404).json({
            error: 'Transaction not found'
          }));
        case 3:
          tx = transaction.rows[0];
          res.json({
            reference: tx.transaction_ref,
            status: tx.status,
            amount: tx.amount,
            currency: tx.currency,
            merchant: tx.merchant_name,
            created_at: tx.created_at,
            metadata: tx.metadata
          });
          _context0.next = 5;
          break;
        case 4:
          _context0.prev = 4;
          _t10 = _context0["catch"](1);
          res.status(500).json({
            error: 'Failed to get status'
          });
        case 5:
        case "end":
          return _context0.stop();
      }
    }, _callee0, null, [[1, 4]]);
  }));
  return function (_x17, _x18) {
    return _ref0.apply(this, arguments);
  };
}()));

/**
 * POS: Get card balance (for display on POS terminal)
 * POST /pos/nfc/balance
 */
router.post('/balance', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref1 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(req, res) {
    var _req$body6, card_uid, pin, _loanResult$rows$2, normalizedUid, card, cardData, walletBalance, loanResult, foodCredit, _t11;
    return _regenerator["default"].wrap(function (_context1) {
      while (1) switch (_context1.prev = _context1.next) {
        case 0:
          initServices(req.scope);
          _req$body6 = req.body, card_uid = _req$body6.card_uid, pin = _req$body6.pin;
          if (card_uid) {
            _context1.next = 1;
            break;
          }
          return _context1.abrupt("return", res.status(400).json({
            error: 'Card UID is required'
          }));
        case 1:
          _context1.prev = 1;
          normalizedUid = card_uid.toUpperCase().trim();
          _context1.next = 2;
          return db.query("\n      SELECT c.*, u.first_name, u.last_name\n      FROM bigcompany.nfc_cards c\n      JOIN customer u ON c.user_id = u.id\n      WHERE c.card_uid = $1 AND c.is_active = true\n    ", [normalizedUid]);
        case 2:
          card = _context1.sent;
          if (!(card.rows.length === 0)) {
            _context1.next = 3;
            break;
          }
          return _context1.abrupt("return", res.status(404).json({
            error: 'Card not found or inactive'
          }));
        case 3:
          cardData = card.rows[0]; // Verify PIN if provided
          if (!(pin && !verifyPin(pin, cardData.pin_hash))) {
            _context1.next = 4;
            break;
          }
          return _context1.abrupt("return", res.status(401).json({
            error: 'Invalid PIN'
          }));
        case 4:
          _context1.next = 5;
          return blnkService.getCustomerBalance(cardData.user_id, 'customer_wallets');
        case 5:
          walletBalance = _context1.sent;
          _context1.next = 6;
          return db.query("\n      SELECT SUM(outstanding_balance) as credit FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('active', 'disbursed')\n      AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')\n    ", [cardData.user_id]);
        case 6:
          loanResult = _context1.sent;
          foodCredit = Number(((_loanResult$rows$2 = loanResult.rows[0]) === null || _loanResult$rows$2 === void 0 ? void 0 : _loanResult$rows$2.credit) || 0);
          res.json({
            dashboard_id: cardData.dashboard_id,
            card_alias: cardData.card_alias,
            customer_name: "".concat(cardData.first_name || '', " ").concat(cardData.last_name || '').trim(),
            wallet_balance: walletBalance,
            food_credit: foodCredit,
            total_available: walletBalance + foodCredit,
            currency: 'RWF'
          });
          _context1.next = 8;
          break;
        case 7:
          _context1.prev = 7;
          _t11 = _context1["catch"](1);
          console.error('Balance check error:', _t11);
          res.status(500).json({
            error: 'Failed to get balance'
          });
        case 8:
        case "end":
          return _context1.stop();
      }
    }, _callee1, null, [[1, 7]]);
  }));
  return function (_x19, _x20) {
    return _ref1.apply(this, arguments);
  };
}()));

// ==================== ADMIN ENDPOINTS ====================

/**
 * Admin: Register new card (for card production/inventory)
 * POST /admin/nfc/register
 */
router.post('/register', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref10 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(req, res) {
    var _req$body7, card_uid, batch_id, normalizedUid, dashboardId, _t12;
    return _regenerator["default"].wrap(function (_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          _req$body7 = req.body, card_uid = _req$body7.card_uid, batch_id = _req$body7.batch_id;
          if (card_uid) {
            _context10.next = 1;
            break;
          }
          return _context10.abrupt("return", res.status(400).json({
            error: 'Card UID is required'
          }));
        case 1:
          _context10.prev = 1;
          normalizedUid = card_uid.toUpperCase().trim();
          dashboardId = generateDashboardId();
          _context10.next = 2;
          return db.query("\n      INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, is_active, metadata)\n      VALUES ($1, $2, false, $3)\n      ON CONFLICT (card_uid) DO NOTHING\n    ", [normalizedUid, dashboardId, JSON.stringify({
            batch_id: batch_id,
            registered_at: new Date()
          })]);
        case 2:
          res.json({
            success: true,
            card_uid: normalizedUid,
            dashboard_id: dashboardId,
            message: 'Card registered. Ready for customer linking.'
          });
          _context10.next = 4;
          break;
        case 3:
          _context10.prev = 3;
          _t12 = _context10["catch"](1);
          res.status(500).json({
            error: 'Failed to register card'
          });
        case 4:
        case "end":
          return _context10.stop();
      }
    }, _callee10, null, [[1, 3]]);
  }));
  return function (_x21, _x22) {
    return _ref10.apply(this, arguments);
  };
}()));

/**
 * Admin: Bulk register cards
 * POST /admin/nfc/register-bulk
 */
router.post('/register-bulk', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref11 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(req, res) {
    var _req$body8, card_uids, batch_id, results, _iterator, _step, uid, normalizedUid, dashboardId, _t13, _t14, _t15;
    return _regenerator["default"].wrap(function (_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          _req$body8 = req.body, card_uids = _req$body8.card_uids, batch_id = _req$body8.batch_id;
          if (!(!card_uids || !Array.isArray(card_uids) || card_uids.length === 0)) {
            _context11.next = 1;
            break;
          }
          return _context11.abrupt("return", res.status(400).json({
            error: 'card_uids array is required'
          }));
        case 1:
          _context11.prev = 1;
          results = [];
          _iterator = _createForOfIteratorHelper(card_uids);
          _context11.prev = 2;
          _iterator.s();
        case 3:
          if ((_step = _iterator.n()).done) {
            _context11.next = 8;
            break;
          }
          uid = _step.value;
          normalizedUid = uid.toUpperCase().trim();
          dashboardId = generateDashboardId();
          _context11.prev = 4;
          _context11.next = 5;
          return db.query("\n          INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, is_active, metadata)\n          VALUES ($1, $2, false, $3)\n          ON CONFLICT (card_uid) DO NOTHING\n        ", [normalizedUid, dashboardId, JSON.stringify({
            batch_id: batch_id,
            registered_at: new Date()
          })]);
        case 5:
          results.push({
            card_uid: normalizedUid,
            dashboard_id: dashboardId,
            success: true
          });
          _context11.next = 7;
          break;
        case 6:
          _context11.prev = 6;
          _t13 = _context11["catch"](4);
          results.push({
            card_uid: normalizedUid,
            success: false,
            error: 'Failed to register'
          });
        case 7:
          _context11.next = 3;
          break;
        case 8:
          _context11.next = 10;
          break;
        case 9:
          _context11.prev = 9;
          _t14 = _context11["catch"](2);
          _iterator.e(_t14);
        case 10:
          _context11.prev = 10;
          _iterator.f();
          return _context11.finish(10);
        case 11:
          res.json({
            success: true,
            registered: results.filter(function (r) {
              return r.success;
            }).length,
            failed: results.filter(function (r) {
              return !r.success;
            }).length,
            results: results
          });
          _context11.next = 13;
          break;
        case 12:
          _context11.prev = 12;
          _t15 = _context11["catch"](1);
          res.status(500).json({
            error: 'Bulk registration failed'
          });
        case 13:
        case "end":
          return _context11.stop();
      }
    }, _callee11, null, [[1, 12], [2, 9, 10, 11], [4, 6]]);
  }));
  return function (_x23, _x24) {
    return _ref11.apply(this, arguments);
  };
}()));
var _default = exports["default"] = router;