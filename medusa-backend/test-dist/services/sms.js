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
var SMSService = /*#__PURE__*/function () {
  function SMSService() {
    (0, _classCallCheck2["default"])(this, SMSService);
    (0, _defineProperty2["default"])(this, "africastalking", void 0);
    (0, _defineProperty2["default"])(this, "sms", void 0);
    (0, _defineProperty2["default"])(this, "senderId", void 0);
    var apiKey = process.env.AT_API_KEY || '';
    var username = process.env.AT_USERNAME || 'sandbox';
    this.senderId = process.env.AT_SENDER_ID || 'BIGCompany';
    if (apiKey) {
      var AfricasTalking = require('africastalking');
      this.africastalking = AfricasTalking({
        apiKey: apiKey,
        username: username
      });
      this.sms = this.africastalking.SMS;
    }
  }

  /**
   * Format phone number to Rwandan format
   */
  return (0, _createClass2["default"])(SMSService, [{
    key: "formatPhone",
    value: function formatPhone(phone) {
      if (phone.startsWith('0')) {
        return '+250' + phone.substring(1);
      }
      if (!phone.startsWith('+')) {
        return '+' + phone;
      }
      return phone;
    }

    /**
     * Send SMS message (low-level)
     */
  }, {
    key: "send",
    value: (function () {
      var _send = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(options) {
        var _result$SMSMessageDat, _result$SMSMessageDat2, _result$SMSMessageDat3, recipients, formattedRecipients, result, _t;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              if (this.sms) {
                _context.next = 1;
                break;
              }
              console.warn('SMS service not configured. Set AT_API_KEY environment variable.');
              // In development, log the message
              console.log("[SMS DEV] To: ".concat(options.to, " | Message: ").concat(options.message));
              return _context.abrupt("return", {
                success: true,
                messageId: 'dev-' + Date.now()
              });
            case 1:
              _context.prev = 1;
              recipients = Array.isArray(options.to) ? options.to : [options.to];
              formattedRecipients = recipients.map(this.formatPhone);
              _context.next = 2;
              return this.sms.send({
                to: formattedRecipients,
                message: options.message,
                from: options.from || this.senderId
              });
            case 2:
              result = _context.sent;
              return _context.abrupt("return", {
                success: true,
                messageId: (_result$SMSMessageDat = result.SMSMessageData) === null || _result$SMSMessageDat === void 0 ? void 0 : (_result$SMSMessageDat2 = _result$SMSMessageDat.Recipients) === null || _result$SMSMessageDat2 === void 0 ? void 0 : (_result$SMSMessageDat3 = _result$SMSMessageDat2[0]) === null || _result$SMSMessageDat3 === void 0 ? void 0 : _result$SMSMessageDat3.messageId
              });
            case 3:
              _context.prev = 3;
              _t = _context["catch"](1);
              console.error('SMS send error:', _t);
              return _context.abrupt("return", {
                success: false,
                error: _t.message
              });
            case 4:
            case "end":
              return _context.stop();
          }
        }, _callee, this, [[1, 3]]);
      }));
      function send(_x) {
        return _send.apply(this, arguments);
      }
      return send;
    }()
    /**
     * Simple send SMS helper
     */
    )
  }, {
    key: "sendSms",
    value: (function () {
      var _sendSms = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(phone, message) {
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              return _context2.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function sendSms(_x2, _x3) {
        return _sendSms.apply(this, arguments);
      }
      return sendSms;
    }()
    /**
     * Send OTP for verification
     */
    )
  }, {
    key: "sendOTP",
    value: (function () {
      var _sendOTP = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(phone, otp) {
        var message;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              message = "Your BIG verification code is: ".concat(otp, ". Valid for 10 minutes. Do not share this code.");
              return _context3.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function sendOTP(_x4, _x5) {
        return _sendOTP.apply(this, arguments);
      }
      return sendOTP;
    }()
    /**
     * Send order confirmation
     */
    )
  }, {
    key: "sendOrderConfirmation",
    value: (function () {
      var _sendOrderConfirmation = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(phone, orderNumber, total) {
        var message;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              message = "BIG: Order #".concat(orderNumber, " confirmed! Total: ").concat(total.toLocaleString(), " RWF. Track at big.rw/track/").concat(orderNumber);
              return _context4.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function sendOrderConfirmation(_x6, _x7, _x8) {
        return _sendOrderConfirmation.apply(this, arguments);
      }
      return sendOrderConfirmation;
    }()
    /**
     * Send payment confirmation
     */
    )
  }, {
    key: "sendPaymentConfirmation",
    value: (function () {
      var _sendPaymentConfirmation = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(phone, amount, reference) {
        var message;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              message = "BIG: Payment of ".concat(amount.toLocaleString(), " RWF received. Ref: ").concat(reference, ". Wallet credited.");
              return _context5.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function sendPaymentConfirmation(_x9, _x0, _x1) {
        return _sendPaymentConfirmation.apply(this, arguments);
      }
      return sendPaymentConfirmation;
    }()
    /**
     * Send loan approval notification
     */
    )
  }, {
    key: "sendLoanApproval",
    value: (function () {
      var _sendLoanApproval = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(phone, amount, dueDate) {
        var message;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              message = "BIG: Your loan of ".concat(amount.toLocaleString(), " RWF has been approved and sent to your wallet! Repay by ").concat(dueDate, ".");
              return _context6.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function sendLoanApproval(_x10, _x11, _x12) {
        return _sendLoanApproval.apply(this, arguments);
      }
      return sendLoanApproval;
    }()
    /**
     * Send loan reminder
     */
    )
  }, {
    key: "sendLoanReminder",
    value: (function () {
      var _sendLoanReminder = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(phone, loanNumber, amount, dueDate) {
        var message;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              message = "BIG: Reminder - Loan #".concat(loanNumber, " payment of ").concat(amount.toLocaleString(), " RWF due on ").concat(dueDate, ". Dial *939# to pay.");
              return _context7.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function sendLoanReminder(_x13, _x14, _x15, _x16) {
        return _sendLoanReminder.apply(this, arguments);
      }
      return sendLoanReminder;
    }()
    /**
     * Send gas top-up confirmation
     */
    )
  }, {
    key: "sendGasTopupConfirmation",
    value: (function () {
      var _sendGasTopupConfirmation = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(phone, meterNumber, amount, units, token) {
        var message;
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              message = "BIG Gas: Meter ".concat(meterNumber, " topped up! Amount: ").concat(amount.toLocaleString(), " RWF. Units: ").concat(units, ". Token: ").concat(token);
              return _context8.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this);
      }));
      function sendGasTopupConfirmation(_x17, _x18, _x19, _x20, _x21) {
        return _sendGasTopupConfirmation.apply(this, arguments);
      }
      return sendGasTopupConfirmation;
    }()
    /**
     * Send wallet top-up confirmation
     */
    )
  }, {
    key: "sendWalletTopup",
    value: (function () {
      var _sendWalletTopup = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(phone, amount, newBalance) {
        var message;
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              message = "BIG: Wallet credited with ".concat(amount.toLocaleString(), " RWF. Balance: ").concat(newBalance.toLocaleString(), " RWF.");
              return _context9.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function sendWalletTopup(_x22, _x23, _x24) {
        return _sendWalletTopup.apply(this, arguments);
      }
      return sendWalletTopup;
    }()
    /**
     * Send low stock alert to retailer
     */
    )
  }, {
    key: "sendLowStockAlert",
    value: (function () {
      var _sendLowStockAlert = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(phone, productName, currentStock) {
        var message;
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              message = "BIG Alert: Low stock \"".concat(productName, "\". Current: ").concat(currentStock, " units. Reorder now!");
              return _context0.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context0.stop();
          }
        }, _callee0, this);
      }));
      function sendLowStockAlert(_x25, _x26, _x27) {
        return _sendLowStockAlert.apply(this, arguments);
      }
      return sendLowStockAlert;
    }()
    /**
     * Send credit order approval to retailer
     */
    )
  }, {
    key: "sendCreditOrderApproval",
    value: (function () {
      var _sendCreditOrderApproval = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(phone, orderNumber, amount, dueDate) {
        var message;
        return _regenerator["default"].wrap(function (_context1) {
          while (1) switch (_context1.prev = _context1.next) {
            case 0:
              message = "BIG: Credit order #".concat(orderNumber, " for ").concat(amount.toLocaleString(), " RWF approved! Due: ").concat(dueDate, ".");
              return _context1.abrupt("return", this.send({
                to: phone,
                message: message
              }));
            case 1:
            case "end":
              return _context1.stop();
          }
        }, _callee1, this);
      }));
      function sendCreditOrderApproval(_x28, _x29, _x30, _x31) {
        return _sendCreditOrderApproval.apply(this, arguments);
      }
      return sendCreditOrderApproval;
    }())
  }]);
}();
var _default = exports["default"] = SMSService;