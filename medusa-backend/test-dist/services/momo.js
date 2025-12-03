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
var MTNMoMoService = /*#__PURE__*/function () {
  function MTNMoMoService() {
    (0, _classCallCheck2["default"])(this, MTNMoMoService);
    (0, _defineProperty2["default"])(this, "config", void 0);
    (0, _defineProperty2["default"])(this, "collectionClient", void 0);
    (0, _defineProperty2["default"])(this, "disbursementClient", void 0);
    (0, _defineProperty2["default"])(this, "accessToken", null);
    (0, _defineProperty2["default"])(this, "tokenExpiry", 0);
    (0, _defineProperty2["default"])(this, "baseUrl", void 0);
    this.config = {
      apiKey: process.env.MOMO_API_KEY || '',
      apiUser: process.env.MOMO_API_USER || '',
      apiSecret: process.env.MOMO_API_SECRET || '',
      subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY || '',
      environment: process.env.MOMO_ENVIRONMENT || 'sandbox',
      callbackUrl: process.env.MOMO_CALLBACK_URL || 'https://api.bigcompany.rw/webhooks/momo'
    };
    this.baseUrl = this.config.environment === 'production' ? 'https://proxy.momoapi.mtn.com' : 'https://sandbox.momodeveloper.mtn.com';
    var commonHeaders = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': this.config.subscriptionKey
    };
    this.collectionClient = _axios["default"].create({
      baseURL: "".concat(this.baseUrl, "/collection"),
      headers: commonHeaders
    });
    this.disbursementClient = _axios["default"].create({
      baseURL: "".concat(this.baseUrl, "/disbursement"),
      headers: commonHeaders
    });
  }

  /**
   * Get OAuth2 access token for Collection API
   */
  return (0, _createClass2["default"])(MTNMoMoService, [{
    key: "getCollectionToken",
    value: (function () {
      var _getCollectionToken = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var credentials, response, _error$response, _t;
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
              credentials = Buffer.from("".concat(this.config.apiUser, ":").concat(this.config.apiKey)).toString('base64');
              _context.next = 2;
              return this.collectionClient.post('/token/', null, {
                headers: {
                  'Authorization': "Basic ".concat(credentials),
                  'Ocp-Apim-Subscription-Key': this.config.subscriptionKey
                }
              });
            case 2:
              response = _context.sent;
              this.accessToken = response.data.access_token;
              this.tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // Refresh 1 min early
              return _context.abrupt("return", this.accessToken);
            case 3:
              _context.prev = 3;
              _t = _context["catch"](1);
              console.error('MTN MoMo token error:', ((_error$response = _t.response) === null || _error$response === void 0 ? void 0 : _error$response.data) || _t.message);
              throw new Error('Failed to obtain MoMo access token');
            case 4:
            case "end":
              return _context.stop();
          }
        }, _callee, this, [[1, 3]]);
      }));
      function getCollectionToken() {
        return _getCollectionToken.apply(this, arguments);
      }
      return getCollectionToken;
    }()
    /**
     * Request payment from customer (Collection - RequestToPay)
     */
    )
  }, {
    key: "requestPayment",
    value: (function () {
      var _requestPayment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(request) {
        var referenceId, token, msisdn, _error$response2, _error$response3, _error$response3$data, _t2;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              referenceId = (0, _uuid.v4)();
              _context2.prev = 1;
              _context2.next = 2;
              return this.getCollectionToken();
            case 2:
              token = _context2.sent;
              // Format phone number to MSISDN format (without +)
              msisdn = this.formatMSISDN(request.payerPhone);
              _context2.next = 3;
              return this.collectionClient.post('/v1_0/requesttopay', {
                amount: request.amount.toString(),
                currency: request.currency,
                externalId: request.externalId,
                payer: {
                  partyIdType: 'MSISDN',
                  partyId: msisdn
                },
                payerMessage: request.payerMessage || "Payment to BIG Company - ".concat(request.externalId),
                payeeNote: request.payeeNote || 'Wallet top-up'
              }, {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Reference-Id': referenceId,
                  'X-Target-Environment': this.config.environment,
                  'X-Callback-Url': this.config.callbackUrl
                }
              });
            case 3:
              return _context2.abrupt("return", {
                success: true,
                referenceId: referenceId,
                status: 'PENDING'
              });
            case 4:
              _context2.prev = 4;
              _t2 = _context2["catch"](1);
              console.error('MTN MoMo collection error:', ((_error$response2 = _t2.response) === null || _error$response2 === void 0 ? void 0 : _error$response2.data) || _t2.message);
              return _context2.abrupt("return", {
                success: false,
                error: ((_error$response3 = _t2.response) === null || _error$response3 === void 0 ? void 0 : (_error$response3$data = _error$response3.data) === null || _error$response3$data === void 0 ? void 0 : _error$response3$data.message) || _t2.message
              });
            case 5:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this, [[1, 4]]);
      }));
      function requestPayment(_x) {
        return _requestPayment.apply(this, arguments);
      }
      return requestPayment;
    }()
    /**
     * Check status of a payment request
     */
    )
  }, {
    key: "getPaymentStatus",
    value: (function () {
      var _getPaymentStatus = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(referenceId) {
        var token, response, _error$response4, _error$response5, _error$response5$data, _t3;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.prev = 0;
              _context3.next = 1;
              return this.getCollectionToken();
            case 1:
              token = _context3.sent;
              _context3.next = 2;
              return this.collectionClient.get("/v1_0/requesttopay/".concat(referenceId), {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Target-Environment': this.config.environment
                }
              });
            case 2:
              response = _context3.sent;
              return _context3.abrupt("return", {
                success: true,
                referenceId: referenceId,
                status: response.data.status,
                financialTransactionId: response.data.financialTransactionId
              });
            case 3:
              _context3.prev = 3;
              _t3 = _context3["catch"](0);
              console.error('MTN MoMo status check error:', ((_error$response4 = _t3.response) === null || _error$response4 === void 0 ? void 0 : _error$response4.data) || _t3.message);
              return _context3.abrupt("return", {
                success: false,
                error: ((_error$response5 = _t3.response) === null || _error$response5 === void 0 ? void 0 : (_error$response5$data = _error$response5.data) === null || _error$response5$data === void 0 ? void 0 : _error$response5$data.message) || _t3.message
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
     * Send money to customer (Disbursement - Transfer)
     */
    )
  }, {
    key: "disburseFunds",
    value: (function () {
      var _disburseFunds = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(request) {
        var referenceId, credentials, tokenResponse, msisdn, _error$response6, _error$response7, _error$response7$data, _t4;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              referenceId = (0, _uuid.v4)();
              _context4.prev = 1;
              credentials = Buffer.from("".concat(this.config.apiUser, ":").concat(this.config.apiKey)).toString('base64'); // Get disbursement token
              _context4.next = 2;
              return this.disbursementClient.post('/token/', null, {
                headers: {
                  'Authorization': "Basic ".concat(credentials),
                  'Ocp-Apim-Subscription-Key': this.config.subscriptionKey
                }
              });
            case 2:
              tokenResponse = _context4.sent;
              msisdn = this.formatMSISDN(request.payeePhone);
              _context4.next = 3;
              return this.disbursementClient.post('/v1_0/transfer', {
                amount: request.amount.toString(),
                currency: request.currency,
                externalId: request.externalId,
                payee: {
                  partyIdType: 'MSISDN',
                  partyId: msisdn
                },
                payerMessage: 'BIG Company Disbursement',
                payeeNote: request.payeeNote || 'Funds transfer'
              }, {
                headers: {
                  'Authorization': "Bearer ".concat(tokenResponse.data.access_token),
                  'X-Reference-Id': referenceId,
                  'X-Target-Environment': this.config.environment
                }
              });
            case 3:
              return _context4.abrupt("return", {
                success: true,
                referenceId: referenceId,
                status: 'PENDING'
              });
            case 4:
              _context4.prev = 4;
              _t4 = _context4["catch"](1);
              console.error('MTN MoMo disbursement error:', ((_error$response6 = _t4.response) === null || _error$response6 === void 0 ? void 0 : _error$response6.data) || _t4.message);
              return _context4.abrupt("return", {
                success: false,
                error: ((_error$response7 = _t4.response) === null || _error$response7 === void 0 ? void 0 : (_error$response7$data = _error$response7.data) === null || _error$response7$data === void 0 ? void 0 : _error$response7$data.message) || _t4.message
              });
            case 5:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this, [[1, 4]]);
      }));
      function disburseFunds(_x3) {
        return _disburseFunds.apply(this, arguments);
      }
      return disburseFunds;
    }()
    /**
     * Validate account holder (Check if phone is registered)
     */
    )
  }, {
    key: "validateAccount",
    value: (function () {
      var _validateAccount = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(phone) {
        var token, msisdn, response, _t5;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.prev = 0;
              _context5.next = 1;
              return this.getCollectionToken();
            case 1:
              token = _context5.sent;
              msisdn = this.formatMSISDN(phone);
              _context5.next = 2;
              return this.collectionClient.get("/v1_0/accountholder/msisdn/".concat(msisdn, "/basicuserinfo"), {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Target-Environment': this.config.environment
                }
              });
            case 2:
              response = _context5.sent;
              return _context5.abrupt("return", {
                valid: true,
                accountHolderName: response.data.name
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
     * Get account balance (for merchant accounts)
     */
    )
  }, {
    key: "getBalance",
    value: (function () {
      var _getBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6() {
        var token, response, _error$response8, _t6;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              _context6.prev = 0;
              _context6.next = 1;
              return this.getCollectionToken();
            case 1:
              token = _context6.sent;
              _context6.next = 2;
              return this.collectionClient.get('/v1_0/account/balance', {
                headers: {
                  'Authorization': "Bearer ".concat(token),
                  'X-Target-Environment': this.config.environment
                }
              });
            case 2:
              response = _context6.sent;
              return _context6.abrupt("return", {
                balance: parseFloat(response.data.availableBalance),
                currency: response.data.currency
              });
            case 3:
              _context6.prev = 3;
              _t6 = _context6["catch"](0);
              console.error('MTN MoMo balance error:', ((_error$response8 = _t6.response) === null || _error$response8 === void 0 ? void 0 : _error$response8.data) || _t6.message);
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
     * Format phone number to MSISDN format (250XXXXXXXXX)
     */
    )
  }, {
    key: "formatMSISDN",
    value: function formatMSISDN(phone) {
      var cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '250' + cleaned.substring(1);
      } else if (cleaned.startsWith('+250')) {
        cleaned = cleaned.substring(1);
      } else if (!cleaned.startsWith('250')) {
        cleaned = '250' + cleaned;
      }
      return cleaned;
    }
  }]);
}();
var _default = exports["default"] = MTNMoMoService;