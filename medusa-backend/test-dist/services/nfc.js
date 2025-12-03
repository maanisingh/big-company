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
var _crypto = _interopRequireDefault(require("crypto"));
var _blnk = _interopRequireDefault(require("./blnk"));
var _sms = _interopRequireDefault(require("./sms"));
var _momo = _interopRequireDefault(require("./momo"));
var _airtel = _interopRequireDefault(require("./airtel"));
var NFCCardService = /*#__PURE__*/function () {
  function NFCCardService(container) {
    (0, _classCallCheck2["default"])(this, NFCCardService);
    (0, _defineProperty2["default"])(this, "db", void 0);
    (0, _defineProperty2["default"])(this, "blnkService", void 0);
    (0, _defineProperty2["default"])(this, "smsService", void 0);
    (0, _defineProperty2["default"])(this, "momoService", void 0);
    (0, _defineProperty2["default"])(this, "airtelService", void 0);
    this.db = new _pg.Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.blnkService = new _blnk["default"](container);
    this.smsService = new _sms["default"]();
    this.momoService = new _momo["default"]();
    this.airtelService = new _airtel["default"]();
  }

  /**
   * Generate a unique dashboard ID for new cards
   */
  return (0, _createClass2["default"])(NFCCardService, [{
    key: "generateDashboardId",
    value: function generateDashboardId() {
      var prefix = 'BIG';
      var timestamp = Date.now().toString(36).toUpperCase();
      var random = _crypto["default"].randomBytes(3).toString('hex').toUpperCase();
      return "".concat(prefix, "-").concat(timestamp, "-").concat(random).substring(0, 15);
    }

    /**
     * Hash PIN for secure storage
     */
  }, {
    key: "hashPin",
    value: function hashPin(pin) {
      return _crypto["default"].createHash('sha256').update(pin + (process.env.PIN_SECRET || 'bigcompany_pin_secret')).digest('hex');
    }

    /**
     * Verify PIN
     */
  }, {
    key: "verifyPin",
    value: function verifyPin(inputPin, storedHash) {
      var inputHash = this.hashPin(inputPin);
      return inputHash === storedHash;
    }

    /**
     * Register a new NFC card (for card production/inventory)
     */
  }, {
    key: "registerCard",
    value: (function () {
      var _registerCard = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(cardUid) {
        var dashboardId;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              dashboardId = this.generateDashboardId();
              _context.next = 1;
              return this.db.query("\n      INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, is_active)\n      VALUES ($1, $2, false)\n      ON CONFLICT (card_uid) DO NOTHING\n    ", [cardUid.toUpperCase(), dashboardId]);
            case 1:
              return _context.abrupt("return", {
                dashboardId: dashboardId
              });
            case 2:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function registerCard(_x) {
        return _registerCard.apply(this, arguments);
      }
      return registerCard;
    }()
    /**
     * Link card to user account
     */
    )
  }, {
    key: "linkCard",
    value: (function () {
      var _linkCard = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(request) {
        var userId, cardUid, pin, alias, normalizedUid, existingCard, dashboardId, card, result;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              userId = request.userId, cardUid = request.cardUid, pin = request.pin, alias = request.alias;
              normalizedUid = cardUid.toUpperCase(); // Validate PIN
              if (!(!pin || pin.length < 4 || pin.length > 6)) {
                _context2.next = 1;
                break;
              }
              return _context2.abrupt("return", {
                success: false,
                error: 'PIN must be 4-6 digits'
              });
            case 1:
              if (/^\d+$/.test(pin)) {
                _context2.next = 2;
                break;
              }
              return _context2.abrupt("return", {
                success: false,
                error: 'PIN must contain only numbers'
              });
            case 2:
              _context2.next = 3;
              return this.db.query('SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1', [normalizedUid]);
            case 3:
              existingCard = _context2.sent;
              if (!(existingCard.rows.length === 0)) {
                _context2.next = 5;
                break;
              }
              // Auto-register the card
              dashboardId = this.generateDashboardId();
              _context2.next = 4;
              return this.db.query("\n        INSERT INTO bigcompany.nfc_cards (card_uid, dashboard_id, user_id, card_alias, pin_hash, is_active, linked_at)\n        VALUES ($1, $2, $3, $4, $5, true, NOW())\n      ", [normalizedUid, dashboardId, userId, alias || 'My Card', this.hashPin(pin)]);
            case 4:
              _context2.next = 7;
              break;
            case 5:
              card = existingCard.rows[0]; // Check if already linked to another user
              if (!(card.user_id && card.user_id !== userId)) {
                _context2.next = 6;
                break;
              }
              return _context2.abrupt("return", {
                success: false,
                error: 'Card is already linked to another account'
              });
            case 6:
              dashboardId = card.dashboard_id;

              // Link to user
              _context2.next = 7;
              return this.db.query("\n        UPDATE bigcompany.nfc_cards\n        SET user_id = $1, card_alias = $2, pin_hash = $3, is_active = true, linked_at = NOW()\n        WHERE card_uid = $4\n      ", [userId, alias || card.card_alias || 'My Card', this.hashPin(pin), normalizedUid]);
            case 7:
              _context2.next = 8;
              return this.db.query('SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1', [normalizedUid]);
            case 8:
              result = _context2.sent;
              return _context2.abrupt("return", {
                success: true,
                card: this.mapCardRow(result.rows[0])
              });
            case 9:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function linkCard(_x2) {
        return _linkCard.apply(this, arguments);
      }
      return linkCard;
    }()
    /**
     * Unlink card from user account
     */
    )
  }, {
    key: "unlinkCard",
    value: (function () {
      var _unlinkCard = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(userId, cardUid, pin) {
        var card;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 1;
              return this.db.query('SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1 AND user_id = $2', [cardUid.toUpperCase(), userId]);
            case 1:
              card = _context3.sent;
              if (!(card.rows.length === 0)) {
                _context3.next = 2;
                break;
              }
              return _context3.abrupt("return", {
                success: false,
                error: 'Card not found or not linked to your account'
              });
            case 2:
              if (this.verifyPin(pin, card.rows[0].pin_hash)) {
                _context3.next = 3;
                break;
              }
              return _context3.abrupt("return", {
                success: false,
                error: 'Invalid PIN'
              });
            case 3:
              _context3.next = 4;
              return this.db.query("\n      UPDATE bigcompany.nfc_cards\n      SET user_id = NULL, is_active = false, pin_hash = NULL\n      WHERE card_uid = $1\n    ", [cardUid.toUpperCase()]);
            case 4:
              return _context3.abrupt("return", {
                success: true
              });
            case 5:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function unlinkCard(_x3, _x4, _x5) {
        return _unlinkCard.apply(this, arguments);
      }
      return unlinkCard;
    }()
    /**
     * Get user's linked cards
     */
    )
  }, {
    key: "getUserCards",
    value: (function () {
      var _getUserCards = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(userId) {
        var result;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 1;
              return this.db.query('SELECT * FROM bigcompany.nfc_cards WHERE user_id = $1 ORDER BY linked_at DESC', [userId]);
            case 1:
              result = _context4.sent;
              return _context4.abrupt("return", result.rows.map(this.mapCardRow));
            case 2:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function getUserCards(_x6) {
        return _getUserCards.apply(this, arguments);
      }
      return getUserCards;
    }()
    /**
     * Get card by UID
     */
    )
  }, {
    key: "getCardByUid",
    value: (function () {
      var _getCardByUid = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(cardUid) {
        var result;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 1;
              return this.db.query('SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1', [cardUid.toUpperCase()]);
            case 1:
              result = _context5.sent;
              if (!(result.rows.length === 0)) {
                _context5.next = 2;
                break;
              }
              return _context5.abrupt("return", null);
            case 2:
              return _context5.abrupt("return", this.mapCardRow(result.rows[0]));
            case 3:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function getCardByUid(_x7) {
        return _getCardByUid.apply(this, arguments);
      }
      return getCardByUid;
    }()
    /**
     * Get card by dashboard ID
     */
    )
  }, {
    key: "getCardByDashboardId",
    value: (function () {
      var _getCardByDashboardId = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(dashboardId) {
        var result;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 1;
              return this.db.query('SELECT * FROM bigcompany.nfc_cards WHERE dashboard_id = $1', [dashboardId.toUpperCase()]);
            case 1:
              result = _context6.sent;
              if (!(result.rows.length === 0)) {
                _context6.next = 2;
                break;
              }
              return _context6.abrupt("return", null);
            case 2:
              return _context6.abrupt("return", this.mapCardRow(result.rows[0]));
            case 3:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function getCardByDashboardId(_x8) {
        return _getCardByDashboardId.apply(this, arguments);
      }
      return getCardByDashboardId;
    }()
    /**
     * Process POS tap-to-pay payment
     */
    )
  }, {
    key: "processPOSPayment",
    value: (function () {
      var _processPOSPayment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(request) {
        var _customer$rows$, _customer$rows$2, _customer$rows$2$meta;
        var cardUid, amount, merchantId, orderId, pin, card, cardData, balance, customer, phone, _merchant$rows$, merchant, txRef, transaction, _momoResult, shortfall, isMTN, momoResult, momoRef, _t;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              cardUid = request.cardUid, amount = request.amount, merchantId = request.merchantId, orderId = request.orderId, pin = request.pin; // Get card details
              _context7.next = 1;
              return this.getCardByUid(cardUid);
            case 1:
              card = _context7.sent;
              if (card) {
                _context7.next = 2;
                break;
              }
              return _context7.abrupt("return", {
                success: false,
                error: 'Card not recognized'
              });
            case 2:
              if (card.isActive) {
                _context7.next = 3;
                break;
              }
              return _context7.abrupt("return", {
                success: false,
                error: 'Card is inactive'
              });
            case 3:
              if (card.userId) {
                _context7.next = 4;
                break;
              }
              return _context7.abrupt("return", {
                success: false,
                error: 'Card not linked to an account'
              });
            case 4:
              if (!(amount > 5000 && !pin)) {
                _context7.next = 5;
                break;
              }
              return _context7.abrupt("return", {
                success: false,
                error: 'PIN required for transactions over 5,000 RWF'
              });
            case 5:
              if (!pin) {
                _context7.next = 7;
                break;
              }
              _context7.next = 6;
              return this.db.query('SELECT pin_hash FROM bigcompany.nfc_cards WHERE card_uid = $1', [cardUid.toUpperCase()]);
            case 6:
              cardData = _context7.sent;
              if (this.verifyPin(pin, cardData.rows[0].pin_hash)) {
                _context7.next = 7;
                break;
              }
              return _context7.abrupt("return", {
                success: false,
                error: 'Invalid PIN'
              });
            case 7:
              _context7.next = 8;
              return this.blnkService.getCustomerBalance(card.userId, 'customer_wallets');
            case 8:
              balance = _context7.sent;
              _context7.next = 9;
              return this.db.query("SELECT phone, email, metadata FROM customer WHERE id = $1", [card.userId]);
            case 9:
              customer = _context7.sent;
              phone = ((_customer$rows$ = customer.rows[0]) === null || _customer$rows$ === void 0 ? void 0 : _customer$rows$.phone) || ((_customer$rows$2 = customer.rows[0]) === null || _customer$rows$2 === void 0 ? void 0 : (_customer$rows$2$meta = _customer$rows$2.metadata) === null || _customer$rows$2$meta === void 0 ? void 0 : _customer$rows$2$meta.phone);
              if (!(balance >= amount)) {
                _context7.next = 17;
                break;
              }
              _context7.prev = 10;
              _context7.next = 11;
              return this.db.query('SELECT blnk_account_id FROM bigcompany.merchant_profiles WHERE id = $1', [merchantId]);
            case 11:
              merchant = _context7.sent;
              if ((_merchant$rows$ = merchant.rows[0]) !== null && _merchant$rows$ !== void 0 && _merchant$rows$.blnk_account_id) {
                _context7.next = 12;
                break;
              }
              return _context7.abrupt("return", {
                success: false,
                error: 'Merchant wallet not configured'
              });
            case 12:
              // Create transaction reference
              txRef = "POS-".concat(Date.now(), "-").concat(_crypto["default"].randomBytes(4).toString('hex')); // Execute ledger transaction
              _context7.next = 13;
              return this.blnkService.payFromWallet(card.userId,
              // This should be the customer's balance ID
              merchant.rows[0].blnk_account_id, amount, orderId || txRef);
            case 13:
              transaction = _context7.sent;
              _context7.next = 14;
              return this.db.query('UPDATE bigcompany.nfc_cards SET last_used_at = NOW() WHERE card_uid = $1', [cardUid.toUpperCase()]);
            case 14:
              if (!phone) {
                _context7.next = 15;
                break;
              }
              _context7.next = 15;
              return this.smsService.send({
                to: phone,
                message: "BIG: Card payment of ".concat(amount.toLocaleString(), " RWF successful. Ref: ").concat(txRef, ". New balance: ").concat((balance - amount).toLocaleString(), " RWF")
              });
            case 15:
              return _context7.abrupt("return", {
                success: true,
                transactionId: transaction.transaction_id,
                message: 'Payment successful'
              });
            case 16:
              _context7.prev = 16;
              _t = _context7["catch"](10);
              console.error('POS payment error:', _t);
              return _context7.abrupt("return", {
                success: false,
                error: 'Payment processing failed'
              });
            case 17:
              // Insufficient balance - trigger MoMo push
              shortfall = amount - balance;
              isMTN = phone && this.isMTNNumber(phone);
              momoRef = "POS-MOMO-".concat(Date.now());
              if (!isMTN) {
                _context7.next = 19;
                break;
              }
              _context7.next = 18;
              return this.momoService.requestPayment({
                amount: shortfall,
                currency: 'RWF',
                externalId: momoRef,
                payerPhone: phone,
                payerMessage: "BIG POS Payment - Top up ".concat(shortfall.toLocaleString(), " RWF")
              });
            case 18:
              momoResult = _context7.sent;
              _context7.next = 21;
              break;
            case 19:
              if (!phone) {
                _context7.next = 21;
                break;
              }
              _context7.next = 20;
              return this.airtelService.requestPayment({
                amount: shortfall,
                phone: phone,
                reference: momoRef
              });
            case 20:
              momoResult = _context7.sent;
            case 21:
              if (!((_momoResult = momoResult) !== null && _momoResult !== void 0 && _momoResult.success)) {
                _context7.next = 23;
                break;
              }
              _context7.next = 22;
              return this.db.query("\n          INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n          VALUES ($1, 'pos_payment_pending', 'nfc_card', $2, $3)\n        ", [card.userId, cardUid, JSON.stringify({
                amount: amount,
                merchantId: merchantId,
                orderId: orderId,
                momoRef: momoRef,
                shortfall: shortfall,
                walletBalance: balance
              })]);
            case 22:
              return _context7.abrupt("return", {
                success: false,
                requiresMoMo: true,
                momoReference: momoResult.referenceId || momoResult.transactionId,
                message: "Insufficient balance. MoMo request sent for ".concat(shortfall.toLocaleString(), " RWF.")
              });
            case 23:
              return _context7.abrupt("return", {
                success: false,
                error: "Insufficient balance. Available: ".concat(balance.toLocaleString(), " RWF")
              });
            case 24:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this, [[10, 16]]);
      }));
      function processPOSPayment(_x9) {
        return _processPOSPayment.apply(this, arguments);
      }
      return processPOSPayment;
    }()
    /**
     * Update card PIN
     */
    )
  }, {
    key: "updatePin",
    value: (function () {
      var _updatePin = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(userId, cardUid, currentPin, newPin) {
        var card;
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              if (!(!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin))) {
                _context8.next = 1;
                break;
              }
              return _context8.abrupt("return", {
                success: false,
                error: 'New PIN must be 4-6 digits'
              });
            case 1:
              _context8.next = 2;
              return this.db.query('SELECT * FROM bigcompany.nfc_cards WHERE card_uid = $1 AND user_id = $2', [cardUid.toUpperCase(), userId]);
            case 2:
              card = _context8.sent;
              if (!(card.rows.length === 0)) {
                _context8.next = 3;
                break;
              }
              return _context8.abrupt("return", {
                success: false,
                error: 'Card not found'
              });
            case 3:
              if (this.verifyPin(currentPin, card.rows[0].pin_hash)) {
                _context8.next = 4;
                break;
              }
              return _context8.abrupt("return", {
                success: false,
                error: 'Current PIN is incorrect'
              });
            case 4:
              _context8.next = 5;
              return this.db.query('UPDATE bigcompany.nfc_cards SET pin_hash = $1 WHERE card_uid = $2', [this.hashPin(newPin), cardUid.toUpperCase()]);
            case 5:
              return _context8.abrupt("return", {
                success: true
              });
            case 6:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this);
      }));
      function updatePin(_x0, _x1, _x10, _x11) {
        return _updatePin.apply(this, arguments);
      }
      return updatePin;
    }()
    /**
     * Activate/Deactivate card
     */
    )
  }, {
    key: "setCardStatus",
    value: (function () {
      var _setCardStatus = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(userId, cardUid, active) {
        var result;
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 1;
              return this.db.query("\n      UPDATE bigcompany.nfc_cards\n      SET is_active = $1\n      WHERE card_uid = $2 AND user_id = $3\n      RETURNING *\n    ", [active, cardUid.toUpperCase(), userId]);
            case 1:
              result = _context9.sent;
              if (!(result.rows.length === 0)) {
                _context9.next = 2;
                break;
              }
              return _context9.abrupt("return", {
                success: false,
                error: 'Card not found'
              });
            case 2:
              return _context9.abrupt("return", {
                success: true
              });
            case 3:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function setCardStatus(_x12, _x13, _x14) {
        return _setCardStatus.apply(this, arguments);
      }
      return setCardStatus;
    }()
    /**
     * Get card transaction history
     */
    )
  }, {
    key: "getCardTransactions",
    value: (function () {
      var _getCardTransactions = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(cardUid) {
        var limit,
          card,
          transactions,
          _args0 = arguments;
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              limit = _args0.length > 1 && _args0[1] !== undefined ? _args0[1] : 20;
              _context0.next = 1;
              return this.getCardByUid(cardUid);
            case 1:
              card = _context0.sent;
              if (!(!card || !card.userId)) {
                _context0.next = 2;
                break;
              }
              return _context0.abrupt("return", []);
            case 2:
              _context0.next = 3;
              return this.blnkService.listTransactions(card.userId);
            case 3:
              transactions = _context0.sent;
              return _context0.abrupt("return", transactions.slice(0, limit));
            case 4:
            case "end":
              return _context0.stop();
          }
        }, _callee0, this);
      }));
      function getCardTransactions(_x15) {
        return _getCardTransactions.apply(this, arguments);
      }
      return getCardTransactions;
    }() // ==================== HELPER METHODS ====================
    )
  }, {
    key: "mapCardRow",
    value: function mapCardRow(row) {
      return {
        id: row.id,
        userId: row.user_id,
        cardUid: row.card_uid,
        dashboardId: row.dashboard_id,
        cardAlias: row.card_alias,
        isActive: row.is_active,
        linkedAt: row.linked_at,
        lastUsedAt: row.last_used_at
      };
    }
  }, {
    key: "isMTNNumber",
    value: function isMTNNumber(phone) {
      var cleaned = phone.replace(/\D/g, '');
      var prefix = cleaned.substring(cleaned.length - 9, cleaned.length - 6);
      return ['78', '79'].some(function (p) {
        return prefix.startsWith(p);
      });
    }
  }, {
    key: "close",
    value: function () {
      var _close = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1() {
        return _regenerator["default"].wrap(function (_context1) {
          while (1) switch (_context1.prev = _context1.next) {
            case 0:
              _context1.next = 1;
              return this.db.end();
            case 1:
            case "end":
              return _context1.stop();
          }
        }, _callee1, this);
      }));
      function close() {
        return _close.apply(this, arguments);
      }
      return close;
    }()
  }]);
}();
var _default = exports["default"] = NFCCardService;