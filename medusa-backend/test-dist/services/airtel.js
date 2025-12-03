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
var _axios = _interopRequireDefault(require("axios"));
var _uuid = require("uuid");
var AirtelMoneyService = /*#__PURE__*/function () {
  function AirtelMoneyService() {
    (0, _classCallCheck2["default"])(this, AirtelMoneyService);
    (0, _defineProperty2["default"])(this, "config", void 0);
    (0, _defineProperty2["default"])(this, "client", void 0);
    (0, _defineProperty2["default"])(this, "accessToken", null);
    (0, _defineProperty2["default"])(this, "tokenExpiry", 0);
    (0, _defineProperty2["default"])(this, "baseUrl", void 0);
    this.config = {
      clientId: process.env.AIRTEL_CLIENT_ID || '',
      clientSecret: process.env.AIRTEL_CLIENT_SECRET || '',
      environment: process.env.AIRTEL_ENVIRONMENT || 'sandbox',
      callbackUrl: process.env.AIRTEL_CALLBACK_URL || 'https://api.bigcompany.rw/webhooks/airtel',
      country: 'RW',
      currency: 'RWF'
    };
    this.baseUrl = this.config.environment === 'production' ? 'https://openapi.airtel.africa' : 'https://openapiuat.airtel.africa';
    this.client = _axios["default"].create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      }
    });
  }

  /**
   * Get OAuth2 access token from Airtel
   */
  return (0, _createClass2["default"])(AirtelMoneyService, [{
    key: "getAccessToken",
    value: (function () {
      var _getAccessToken = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var response, _error$response, _t;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              if (!(this.accessToken && Date.now() < this.tokenExpiry)) {
                _context.next = 1;
                break;
              }
              return _context.abrupt("return", this.accessToken);
            case 1:
              _context.prev = 1;
              _context.next = 2;
              return this.client.post('/auth/oauth2/token', {
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                grant_type: 'client_credentials'
              });
            case 2:
              response = _context.sent;
              this.accessToken = response.data.access_token;
              this.tokenExpiry = Date.now() + parseInt(response.data.expires_in) * 1000 - 60000;
              return _context.abrupt("return", this.accessToken);
            case 3:
              _context.prev = 3;
              _t = _context["catch"](1);
              console.error('Airtel Money token error:', ((_error$response = _t.response) === null || _error$response === void 0 ? void 0 : _error$response.data) || _t.message);
              throw new Error('Failed to obtain Airtel access token');
            case 4:
            case "end":
              return _context.stop();
          }
        }, _callee, this, [[1, 3]]);
      }));
      function getAccessToken() {
        return _getAccessToken.apply(this, arguments);
      }
      return getAccessToken;
    }()
    /**
     * Request payment from customer (USSD Push)
     */
    )
  }, {
    key: "requestPayment",
    value: (function () {
      var _requestPayment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(request) {
        var _response$data, _response$data2, _data$transaction, token, transactionId, msisdn, response, data, status, _error$response2, _error$response3, _error$response3$data, _error$response3$data2, _t2;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.prev = 0;
              _context2.next = 1;
              return this.getAccessToken();
            case 1:
              token = _context2.sent;
              transactionId = request.transactionId || (0, _uuid.v4)().replace(/-/g, '').substring(0, 20);
              msisdn = this.formatMSISDN(request.phone);
              _context2.next = 2;
              return this.client.post('/merchant/v1/payments/', {
                reference: request.reference,
                subscriber: {
                  country: this.config.country,
                  currency: this.config.currency,
                  msisdn: msisdn
                },
                transaction: {
                  amount: request.amount,
                  country: this.config.country,
                  currency: this.config.currency,
                  id: transactionId
                }
              }, {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Country': this.config.country,
                  'X-Currency': this.config.currency
                }
              });
            case 2:
              response = _context2.sent;
              data = (_response$data = response.data) === null || _response$data === void 0 ? void 0 : _response$data.data;
              status = (_response$data2 = response.data) === null || _response$data2 === void 0 ? void 0 : _response$data2.status;
              return _context2.abrupt("return", {
                success: (status === null || status === void 0 ? void 0 : status.success) === true || (status === null || status === void 0 ? void 0 : status.code) === '200',
                transactionId: (data === null || data === void 0 ? void 0 : (_data$transaction = data.transaction) === null || _data$transaction === void 0 ? void 0 : _data$transaction.id) || transactionId,
                status: (status === null || status === void 0 ? void 0 : status.message) || 'PENDING',
                message: status === null || status === void 0 ? void 0 : status.result_code
              });
            case 3:
              _context2.prev = 3;
              _t2 = _context2["catch"](0);
              console.error('Airtel Money payment error:', ((_error$response2 = _t2.response) === null || _error$response2 === void 0 ? void 0 : _error$response2.data) || _t2.message);
              return _context2.abrupt("return", {
                success: false,
                error: ((_error$response3 = _t2.response) === null || _error$response3 === void 0 ? void 0 : (_error$response3$data = _error$response3.data) === null || _error$response3$data === void 0 ? void 0 : (_error$response3$data2 = _error$response3$data.status) === null || _error$response3$data2 === void 0 ? void 0 : _error$response3$data2.message) || _t2.message
              });
            case 4:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this, [[0, 3]]);
      }));
      function requestPayment(_x) {
        return _requestPayment.apply(this, arguments);
      }
      return requestPayment;
    }()
    /**
     * Check payment status
     */
    )
  }, {
    key: "getPaymentStatus",
    value: (function () {
      var _getPaymentStatus = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(transactionId) {
        var _response$data3, _response$data4, _data$transaction2, _data$transaction3, token, response, data, status, _error$response4, _error$response5, _error$response5$data, _error$response5$data2, _t3;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.prev = 0;
              _context3.next = 1;
              return this.getAccessToken();
            case 1:
              token = _context3.sent;
              _context3.next = 2;
              return this.client.get("/standard/v1/payments/".concat(transactionId), {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Country': this.config.country,
                  'X-Currency': this.config.currency
                }
              });
            case 2:
              response = _context3.sent;
              data = (_response$data3 = response.data) === null || _response$data3 === void 0 ? void 0 : _response$data3.data;
              status = (_response$data4 = response.data) === null || _response$data4 === void 0 ? void 0 : _response$data4.status;
              return _context3.abrupt("return", {
                success: true,
                transactionId: data === null || data === void 0 ? void 0 : (_data$transaction2 = data.transaction) === null || _data$transaction2 === void 0 ? void 0 : _data$transaction2.id,
                status: data === null || data === void 0 ? void 0 : (_data$transaction3 = data.transaction) === null || _data$transaction3 === void 0 ? void 0 : _data$transaction3.status,
                message: status === null || status === void 0 ? void 0 : status.message
              });
            case 3:
              _context3.prev = 3;
              _t3 = _context3["catch"](0);
              console.error('Airtel Money status error:', ((_error$response4 = _t3.response) === null || _error$response4 === void 0 ? void 0 : _error$response4.data) || _t3.message);
              return _context3.abrupt("return", {
                success: false,
                error: ((_error$response5 = _t3.response) === null || _error$response5 === void 0 ? void 0 : (_error$response5$data = _error$response5.data) === null || _error$response5$data === void 0 ? void 0 : (_error$response5$data2 = _error$response5$data.status) === null || _error$response5$data2 === void 0 ? void 0 : _error$response5$data2.message) || _t3.message
              });
            case 4:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this, [[0, 3]]);
      }));
      function getPaymentStatus(_x2) {
        return _getPaymentStatus.apply(this, arguments);
      }
      return getPaymentStatus;
    }()
    /**
     * Disburse funds to customer
     */
    )
  }, {
    key: "disburseFunds",
    value: (function () {
      var _disburseFunds = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(request) {
        var _response$data5, token, transactionId, msisdn, response, status, _error$response6, _error$response7, _error$response7$data, _error$response7$data2, _t4;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.prev = 0;
              _context4.next = 1;
              return this.getAccessToken();
            case 1:
              token = _context4.sent;
              transactionId = (0, _uuid.v4)().replace(/-/g, '').substring(0, 20);
              msisdn = this.formatMSISDN(request.phone);
              _context4.next = 2;
              return this.client.post('/standard/v1/disbursements/', {
                payee: {
                  msisdn: msisdn,
                  name: request.recipientName || 'BIG Customer'
                },
                reference: request.reference,
                pin: process.env.AIRTEL_PIN || '',
                transaction: {
                  amount: request.amount,
                  id: transactionId
                }
              }, {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Country': this.config.country,
                  'X-Currency': this.config.currency
                }
              });
            case 2:
              response = _context4.sent;
              status = (_response$data5 = response.data) === null || _response$data5 === void 0 ? void 0 : _response$data5.status;
              return _context4.abrupt("return", {
                success: (status === null || status === void 0 ? void 0 : status.success) === true || (status === null || status === void 0 ? void 0 : status.code) === '200',
                transactionId: transactionId,
                status: status === null || status === void 0 ? void 0 : status.message
              });
            case 3:
              _context4.prev = 3;
              _t4 = _context4["catch"](0);
              console.error('Airtel Money disbursement error:', ((_error$response6 = _t4.response) === null || _error$response6 === void 0 ? void 0 : _error$response6.data) || _t4.message);
              return _context4.abrupt("return", {
                success: false,
                error: ((_error$response7 = _t4.response) === null || _error$response7 === void 0 ? void 0 : (_error$response7$data = _error$response7.data) === null || _error$response7$data === void 0 ? void 0 : (_error$response7$data2 = _error$response7$data.status) === null || _error$response7$data2 === void 0 ? void 0 : _error$response7$data2.message) || _t4.message
              });
            case 4:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this, [[0, 3]]);
      }));
      function disburseFunds(_x3) {
        return _disburseFunds.apply(this, arguments);
      }
      return disburseFunds;
    }()
    /**
     * Check if account is registered with Airtel Money
     */
    )
  }, {
    key: "validateAccount",
    value: (function () {
      var _validateAccount = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(phone) {
        var _response$data6, token, msisdn, response, data, _t5;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.prev = 0;
              _context5.next = 1;
              return this.getAccessToken();
            case 1:
              token = _context5.sent;
              msisdn = this.formatMSISDN(phone);
              _context5.next = 2;
              return this.client.get("/standard/v1/users/".concat(msisdn), {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Country': this.config.country,
                  'X-Currency': this.config.currency
                }
              });
            case 2:
              response = _context5.sent;
              data = (_response$data6 = response.data) === null || _response$data6 === void 0 ? void 0 : _response$data6.data;
              return _context5.abrupt("return", {
                valid: (data === null || data === void 0 ? void 0 : data.is_barred) === false,
                name: "".concat((data === null || data === void 0 ? void 0 : data.first_name) || '', " ").concat((data === null || data === void 0 ? void 0 : data.last_name) || '').trim()
              });
            case 3:
              _context5.prev = 3;
              _t5 = _context5["catch"](0);
              return _context5.abrupt("return", {
                valid: false
              });
            case 4:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this, [[0, 3]]);
      }));
      function validateAccount(_x4) {
        return _validateAccount.apply(this, arguments);
      }
      return validateAccount;
    }()
    /**
     * Get account balance
     */
    )
  }, {
    key: "getBalance",
    value: (function () {
      var _getBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6() {
        var _response$data7, token, response, data, _error$response8, _t6;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              _context6.prev = 0;
              _context6.next = 1;
              return this.getAccessToken();
            case 1:
              token = _context6.sent;
              _context6.next = 2;
              return this.client.get('/standard/v1/users/balance', {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Country': this.config.country,
                  'X-Currency': this.config.currency
                }
              });
            case 2:
              response = _context6.sent;
              data = (_response$data7 = response.data) === null || _response$data7 === void 0 ? void 0 : _response$data7.data;
              return _context6.abrupt("return", {
                balance: parseFloat((data === null || data === void 0 ? void 0 : data.balance) || 0),
                currency: (data === null || data === void 0 ? void 0 : data.currency) || this.config.currency
              });
            case 3:
              _context6.prev = 3;
              _t6 = _context6["catch"](0);
              console.error('Airtel Money balance error:', ((_error$response8 = _t6.response) === null || _error$response8 === void 0 ? void 0 : _error$response8.data) || _t6.message);
              return _context6.abrupt("return", null);
            case 4:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this, [[0, 3]]);
      }));
      function getBalance() {
        return _getBalance.apply(this, arguments);
      }
      return getBalance;
    }()
    /**
     * Refund a transaction
     */
    )
  }, {
    key: "refund",
    value: (function () {
      var _refund = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(transactionId) {
        var _response$data8, token, response, status, _error$response9, _error$response0, _error$response0$data, _error$response0$data2, _t7;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              _context7.prev = 0;
              _context7.next = 1;
              return this.getAccessToken();
            case 1:
              token = _context7.sent;
              _context7.next = 2;
              return this.client.post("/standard/v1/payments/refund", {
                transaction: {
                  airtel_money_id: transactionId
                }
              }, {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Country': this.config.country,
                  'X-Currency': this.config.currency
                }
              });
            case 2:
              response = _context7.sent;
              status = (_response$data8 = response.data) === null || _response$data8 === void 0 ? void 0 : _response$data8.status;
              return _context7.abrupt("return", {
                success: (status === null || status === void 0 ? void 0 : status.success) === true,
                message: status === null || status === void 0 ? void 0 : status.message
              });
            case 3:
              _context7.prev = 3;
              _t7 = _context7["catch"](0);
              console.error('Airtel Money refund error:', ((_error$response9 = _t7.response) === null || _error$response9 === void 0 ? void 0 : _error$response9.data) || _t7.message);
              return _context7.abrupt("return", {
                success: false,
                error: ((_error$response0 = _t7.response) === null || _error$response0 === void 0 ? void 0 : (_error$response0$data = _error$response0.data) === null || _error$response0$data === void 0 ? void 0 : (_error$response0$data2 = _error$response0$data.status) === null || _error$response0$data2 === void 0 ? void 0 : _error$response0$data2.message) || _t7.message
              });
            case 4:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this, [[0, 3]]);
      }));
      function refund(_x5) {
        return _refund.apply(this, arguments);
      }
      return refund;
    }()
    /**
     * Format phone number to MSISDN format (without country code for Airtel)
     */
    )
  }, {
    key: "formatMSISDN",
    value: function formatMSISDN(phone) {
      var cleaned = phone.replace(/\D/g, '');

      // Airtel Rwanda uses format without country code in some endpoints
      if (cleaned.startsWith('250')) {
        cleaned = cleaned.substring(3);
      } else if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      return cleaned;
    }
  }]);
}();
var _default = exports["default"] = AirtelMoneyService;