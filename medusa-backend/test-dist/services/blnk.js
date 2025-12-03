"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _axios = _interopRequireDefault(require("axios"));
var _medusa = require("@medusajs/medusa");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _callSuper(t, o, e) { return o = (0, _getPrototypeOf2["default"])(o), (0, _possibleConstructorReturn2["default"])(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], (0, _getPrototypeOf2["default"])(t).constructor) : o.apply(t, e)); }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
var BlnkService = /*#__PURE__*/function (_TransactionBaseServi) {
  function BlnkService(container) {
    var _this;
    (0, _classCallCheck2["default"])(this, BlnkService);
    _this = _callSuper(this, BlnkService, [container]);
    (0, _defineProperty2["default"])(_this, "client", void 0);
    (0, _defineProperty2["default"])(_this, "blnkUrl", void 0);
    _this.blnkUrl = process.env.BLNK_API_URL || 'http://localhost:5001';
    _this.client = _axios["default"].create({
      baseURL: _this.blnkUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return _this;
  }

  // ==================== LEDGERS ====================
  (0, _inherits2["default"])(BlnkService, _TransactionBaseServi);
  return (0, _createClass2["default"])(BlnkService, [{
    key: "createLedger",
    value: function () {
      var _createLedger = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(input) {
        var response, _t;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;
              _context.next = 1;
              return this.client.post('/ledgers', input);
            case 1:
              response = _context.sent;
              return _context.abrupt("return", response.data);
            case 2:
              _context.prev = 2;
              _t = _context["catch"](0);
              throw new Error("Failed to create ledger: ".concat(_t.message));
            case 3:
            case "end":
              return _context.stop();
          }
        }, _callee, this, [[0, 2]]);
      }));
      function createLedger(_x) {
        return _createLedger.apply(this, arguments);
      }
      return createLedger;
    }()
  }, {
    key: "getLedger",
    value: function () {
      var _getLedger = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(ledgerId) {
        var response, _t2;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.prev = 0;
              _context2.next = 1;
              return this.client.get("/ledgers/".concat(ledgerId));
            case 1:
              response = _context2.sent;
              return _context2.abrupt("return", response.data);
            case 2:
              _context2.prev = 2;
              _t2 = _context2["catch"](0);
              throw new Error("Failed to get ledger: ".concat(_t2.message));
            case 3:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this, [[0, 2]]);
      }));
      function getLedger(_x2) {
        return _getLedger.apply(this, arguments);
      }
      return getLedger;
    }()
  }, {
    key: "listLedgers",
    value: function () {
      var _listLedgers = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3() {
        var response, _t3;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.prev = 0;
              _context3.next = 1;
              return this.client.get('/ledgers');
            case 1:
              response = _context3.sent;
              return _context3.abrupt("return", response.data);
            case 2:
              _context3.prev = 2;
              _t3 = _context3["catch"](0);
              throw new Error("Failed to list ledgers: ".concat(_t3.message));
            case 3:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this, [[0, 2]]);
      }));
      function listLedgers() {
        return _listLedgers.apply(this, arguments);
      }
      return listLedgers;
    }() // ==================== BALANCES ====================
  }, {
    key: "createBalance",
    value: function () {
      var _createBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(input) {
        var response, _t4;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.prev = 0;
              _context4.next = 1;
              return this.client.post('/balances', input);
            case 1:
              response = _context4.sent;
              return _context4.abrupt("return", response.data);
            case 2:
              _context4.prev = 2;
              _t4 = _context4["catch"](0);
              throw new Error("Failed to create balance: ".concat(_t4.message));
            case 3:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this, [[0, 2]]);
      }));
      function createBalance(_x3) {
        return _createBalance.apply(this, arguments);
      }
      return createBalance;
    }()
  }, {
    key: "getBalance",
    value: function () {
      var _getBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(balanceId) {
        var response, _t5;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.prev = 0;
              _context5.next = 1;
              return this.client.get("/balances/".concat(balanceId));
            case 1:
              response = _context5.sent;
              return _context5.abrupt("return", response.data);
            case 2:
              _context5.prev = 2;
              _t5 = _context5["catch"](0);
              throw new Error("Failed to get balance: ".concat(_t5.message));
            case 3:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this, [[0, 2]]);
      }));
      function getBalance(_x4) {
        return _getBalance.apply(this, arguments);
      }
      return getBalance;
    }()
  }, {
    key: "listBalances",
    value: function () {
      var _listBalances = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(ledgerId) {
        var url, response, _t6;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              _context6.prev = 0;
              url = ledgerId ? "/balances?ledger_id=".concat(ledgerId) : '/balances';
              _context6.next = 1;
              return this.client.get(url);
            case 1:
              response = _context6.sent;
              return _context6.abrupt("return", response.data);
            case 2:
              _context6.prev = 2;
              _t6 = _context6["catch"](0);
              throw new Error("Failed to list balances: ".concat(_t6.message));
            case 3:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this, [[0, 2]]);
      }));
      function listBalances(_x5) {
        return _listBalances.apply(this, arguments);
      }
      return listBalances;
    }() // ==================== TRANSACTIONS ====================
  }, {
    key: "createTransaction",
    value: function () {
      var _createTransaction = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(input) {
        var response, _t7;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              _context7.prev = 0;
              _context7.next = 1;
              return this.client.post('/transactions', input);
            case 1:
              response = _context7.sent;
              return _context7.abrupt("return", response.data);
            case 2:
              _context7.prev = 2;
              _t7 = _context7["catch"](0);
              throw new Error("Failed to create transaction: ".concat(_t7.message));
            case 3:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this, [[0, 2]]);
      }));
      function createTransaction(_x6) {
        return _createTransaction.apply(this, arguments);
      }
      return createTransaction;
    }()
  }, {
    key: "getTransaction",
    value: function () {
      var _getTransaction = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(transactionId) {
        var response, _t8;
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              _context8.prev = 0;
              _context8.next = 1;
              return this.client.get("/transactions/".concat(transactionId));
            case 1:
              response = _context8.sent;
              return _context8.abrupt("return", response.data);
            case 2:
              _context8.prev = 2;
              _t8 = _context8["catch"](0);
              throw new Error("Failed to get transaction: ".concat(_t8.message));
            case 3:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this, [[0, 2]]);
      }));
      function getTransaction(_x7) {
        return _getTransaction.apply(this, arguments);
      }
      return getTransaction;
    }()
  }, {
    key: "listTransactions",
    value: function () {
      var _listTransactions = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(balanceId) {
        var url, response, _t9;
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              _context9.prev = 0;
              url = balanceId ? "/transactions?balance_id=".concat(balanceId) : '/transactions';
              _context9.next = 1;
              return this.client.get(url);
            case 1:
              response = _context9.sent;
              return _context9.abrupt("return", response.data);
            case 2:
              _context9.prev = 2;
              _t9 = _context9["catch"](0);
              throw new Error("Failed to list transactions: ".concat(_t9.message));
            case 3:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this, [[0, 2]]);
      }));
      function listTransactions(_x8) {
        return _listTransactions.apply(this, arguments);
      }
      return listTransactions;
    }() // ==================== BIGCOMPANY HELPERS ====================
    /**
     * Initialize the BigCompany ledger structure with separate wallet and loan ledgers
     * Sprint 4: Wallet and Loan Balance Separation
     */
  }, {
    key: "initializeLedgers",
    value: function () {
      var _initializeLedgers = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0() {
        var customerLedger, merchantLedger, systemLedger, walletBalancesLedger, loanBalancesLedger;
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              _context0.next = 1;
              return this.createLedger({
                name: 'customer_wallets',
                meta_data: {
                  type: 'customer',
                  currency: 'RWF'
                }
              });
            case 1:
              customerLedger = _context0.sent;
              _context0.next = 2;
              return this.createLedger({
                name: 'merchant_wallets',
                meta_data: {
                  type: 'merchant',
                  currency: 'RWF'
                }
              });
            case 2:
              merchantLedger = _context0.sent;
              _context0.next = 3;
              return this.createLedger({
                name: 'system_accounts',
                meta_data: {
                  type: 'system',
                  currency: 'RWF'
                }
              });
            case 3:
              systemLedger = _context0.sent;
              _context0.next = 4;
              return this.createLedger({
                name: 'wallet_balances',
                meta_data: {
                  type: 'wallet',
                  currency: 'RWF',
                  description: 'Regular wallet balances - transferable, withdrawable'
                }
              });
            case 4:
              walletBalancesLedger = _context0.sent;
              _context0.next = 5;
              return this.createLedger({
                name: 'loan_balances',
                meta_data: {
                  type: 'loan',
                  currency: 'RWF',
                  description: 'Loan balances - purchase-only, non-transferable'
                }
              });
            case 5:
              loanBalancesLedger = _context0.sent;
              return _context0.abrupt("return", {
                customerLedger: customerLedger,
                merchantLedger: merchantLedger,
                systemLedger: systemLedger,
                walletBalancesLedger: walletBalancesLedger,
                loanBalancesLedger: loanBalancesLedger
              });
            case 6:
            case "end":
              return _context0.stop();
          }
        }, _callee0, this);
      }));
      function initializeLedgers() {
        return _initializeLedgers.apply(this, arguments);
      }
      return initializeLedgers;
    }()
    /**
     * Create a customer wallet
     */
  }, {
    key: "createCustomerWallet",
    value: (function () {
      var _createCustomerWallet = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(customerId, ledgerId) {
        return _regenerator["default"].wrap(function (_context1) {
          while (1) switch (_context1.prev = _context1.next) {
            case 0:
              return _context1.abrupt("return", this.createBalance({
                ledger_id: ledgerId,
                currency: 'RWF',
                identity_id: customerId,
                meta_data: {
                  type: 'customer_wallet',
                  customer_id: customerId
                }
              }));
            case 1:
            case "end":
              return _context1.stop();
          }
        }, _callee1, this);
      }));
      function createCustomerWallet(_x9, _x0) {
        return _createCustomerWallet.apply(this, arguments);
      }
      return createCustomerWallet;
    }()
    /**
     * Create a merchant wallet
     */
    )
  }, {
    key: "createMerchantWallet",
    value: (function () {
      var _createMerchantWallet = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(merchantId, ledgerId, merchantType) {
        return _regenerator["default"].wrap(function (_context10) {
          while (1) switch (_context10.prev = _context10.next) {
            case 0:
              return _context10.abrupt("return", this.createBalance({
                ledger_id: ledgerId,
                currency: 'RWF',
                identity_id: merchantId,
                meta_data: {
                  type: 'merchant_wallet',
                  merchant_id: merchantId,
                  merchant_type: merchantType
                }
              }));
            case 1:
            case "end":
              return _context10.stop();
          }
        }, _callee10, this);
      }));
      function createMerchantWallet(_x1, _x10, _x11) {
        return _createMerchantWallet.apply(this, arguments);
      }
      return createMerchantWallet;
    }()
    /**
     * Create both wallet and loan balances for a user
     * Sprint 4: Each user needs two separate balance IDs
     */
    )
  }, {
    key: "createUserBalances",
    value: (function () {
      var _createUserBalances = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(userId, userType, walletLedgerId, loanLedgerId) {
        var walletBalance, loanBalance;
        return _regenerator["default"].wrap(function (_context11) {
          while (1) switch (_context11.prev = _context11.next) {
            case 0:
              _context11.next = 1;
              return this.createBalance({
                ledger_id: walletLedgerId,
                currency: 'RWF',
                identity_id: userId,
                meta_data: {
                  type: 'wallet_balance',
                  user_id: userId,
                  user_type: userType
                }
              });
            case 1:
              walletBalance = _context11.sent;
              _context11.next = 2;
              return this.createBalance({
                ledger_id: loanLedgerId,
                currency: 'RWF',
                identity_id: userId,
                meta_data: {
                  type: 'loan_balance',
                  user_id: userId,
                  user_type: userType
                }
              });
            case 2:
              loanBalance = _context11.sent;
              return _context11.abrupt("return", {
                walletBalance: walletBalance,
                loanBalance: loanBalance
              });
            case 3:
            case "end":
              return _context11.stop();
          }
        }, _callee11, this);
      }));
      function createUserBalances(_x12, _x13, _x14, _x15) {
        return _createUserBalances.apply(this, arguments);
      }
      return createUserBalances;
    }()
    /**
     * Top up customer wallet (from mobile money)
     */
    )
  }, {
    key: "topUpWallet",
    value: (function () {
      var _topUpWallet = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12(customerBalanceId, systemBalanceId, amount, reference, paymentMethod) {
        return _regenerator["default"].wrap(function (_context12) {
          while (1) switch (_context12.prev = _context12.next) {
            case 0:
              return _context12.abrupt("return", this.createTransaction({
                amount: amount,
                currency: 'RWF',
                source: systemBalanceId,
                // System account (mobile money collection)
                destination: customerBalanceId,
                reference: reference,
                description: "Wallet top-up via ".concat(paymentMethod),
                meta_data: {
                  type: 'topup',
                  payment_method: paymentMethod
                }
              }));
            case 1:
            case "end":
              return _context12.stop();
          }
        }, _callee12, this);
      }));
      function topUpWallet(_x16, _x17, _x18, _x19, _x20) {
        return _topUpWallet.apply(this, arguments);
      }
      return topUpWallet;
    }()
    /**
     * Pay from customer wallet to merchant
     */
    )
  }, {
    key: "payFromWallet",
    value: (function () {
      var _payFromWallet = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee13(customerBalanceId, merchantBalanceId, amount, orderId) {
        return _regenerator["default"].wrap(function (_context13) {
          while (1) switch (_context13.prev = _context13.next) {
            case 0:
              return _context13.abrupt("return", this.createTransaction({
                amount: amount,
                currency: 'RWF',
                source: customerBalanceId,
                destination: merchantBalanceId,
                reference: "ORDER-".concat(orderId),
                description: "Payment for order ".concat(orderId),
                meta_data: {
                  type: 'order_payment',
                  order_id: orderId
                }
              }));
            case 1:
            case "end":
              return _context13.stop();
          }
        }, _callee13, this);
      }));
      function payFromWallet(_x21, _x22, _x23, _x24) {
        return _payFromWallet.apply(this, arguments);
      }
      return payFromWallet;
    }()
    /**
     * Disburse loan to customer loan balance
     * Sprint 4: Loans now go to separate loan balance, not wallet balance
     */
    )
  }, {
    key: "disburseLoan",
    value: (function () {
      var _disburseLoan = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee14(systemBalanceId, customerLoanBalanceId, amount, loanId) {
        return _regenerator["default"].wrap(function (_context14) {
          while (1) switch (_context14.prev = _context14.next) {
            case 0:
              return _context14.abrupt("return", this.createTransaction({
                amount: amount,
                currency: 'RWF',
                source: systemBalanceId,
                destination: customerLoanBalanceId,
                // Now goes to loan balance instead of wallet
                reference: "LOAN-".concat(loanId),
                description: "Loan disbursement for loan ".concat(loanId),
                meta_data: {
                  type: 'loan_disbursement',
                  loan_id: loanId,
                  balance_type: 'loan'
                }
              }));
            case 1:
            case "end":
              return _context14.stop();
          }
        }, _callee14, this);
      }));
      function disburseLoan(_x25, _x26, _x27, _x28) {
        return _disburseLoan.apply(this, arguments);
      }
      return disburseLoan;
    }()
    /**
     * Repay loan from customer wallet
     */
    )
  }, {
    key: "repayLoan",
    value: (function () {
      var _repayLoan = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee15(customerBalanceId, systemBalanceId, amount, loanId) {
        return _regenerator["default"].wrap(function (_context15) {
          while (1) switch (_context15.prev = _context15.next) {
            case 0:
              return _context15.abrupt("return", this.createTransaction({
                amount: amount,
                currency: 'RWF',
                source: customerBalanceId,
                destination: systemBalanceId,
                reference: "LOAN-REPAY-".concat(loanId),
                description: "Loan repayment for loan ".concat(loanId),
                meta_data: {
                  type: 'loan_repayment',
                  loan_id: loanId
                }
              }));
            case 1:
            case "end":
              return _context15.stop();
          }
        }, _callee15, this);
      }));
      function repayLoan(_x29, _x30, _x31, _x32) {
        return _repayLoan.apply(this, arguments);
      }
      return repayLoan;
    }()
    /**
     * Get customer wallet balance
     */
    )
  }, {
    key: "getCustomerBalance",
    value: (function () {
      var _getCustomerBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee16(customerId, ledgerId) {
        var balances, customerBalance;
        return _regenerator["default"].wrap(function (_context16) {
          while (1) switch (_context16.prev = _context16.next) {
            case 0:
              _context16.next = 1;
              return this.listBalances(ledgerId);
            case 1:
              balances = _context16.sent;
              customerBalance = balances.find(function (b) {
                var _b$meta_data;
                return ((_b$meta_data = b.meta_data) === null || _b$meta_data === void 0 ? void 0 : _b$meta_data.customer_id) === customerId;
              });
              return _context16.abrupt("return", customerBalance ? customerBalance.balance : 0);
            case 2:
            case "end":
              return _context16.stop();
          }
        }, _callee16, this);
      }));
      function getCustomerBalance(_x33, _x34) {
        return _getCustomerBalance.apply(this, arguments);
      }
      return getCustomerBalance;
    }() // ==================== SPRINT 4: WALLET/LOAN BALANCE METHODS ====================
    /**
     * Credit wallet balance (top-up, refund, etc.)
     */
    )
  }, {
    key: "creditWalletBalance",
    value: function () {
      var _creditWalletBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee17(systemBalanceId, walletBalanceId, amount, reference, description, metadata) {
        return _regenerator["default"].wrap(function (_context17) {
          while (1) switch (_context17.prev = _context17.next) {
            case 0:
              return _context17.abrupt("return", this.createTransaction({
                amount: amount,
                currency: 'RWF',
                source: systemBalanceId,
                destination: walletBalanceId,
                reference: reference,
                description: description,
                meta_data: _objectSpread(_objectSpread({}, metadata), {}, {
                  balance_type: 'wallet'
                })
              }));
            case 1:
            case "end":
              return _context17.stop();
          }
        }, _callee17, this);
      }));
      function creditWalletBalance(_x35, _x36, _x37, _x38, _x39, _x40) {
        return _creditWalletBalance.apply(this, arguments);
      }
      return creditWalletBalance;
    }()
    /**
     * Debit wallet balance (purchase, transfer, etc.)
     */
  }, {
    key: "debitWalletBalance",
    value: (function () {
      var _debitWalletBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee18(walletBalanceId, destinationBalanceId, amount, reference, description, metadata) {
        return _regenerator["default"].wrap(function (_context18) {
          while (1) switch (_context18.prev = _context18.next) {
            case 0:
              return _context18.abrupt("return", this.createTransaction({
                amount: amount,
                currency: 'RWF',
                source: walletBalanceId,
                destination: destinationBalanceId,
                reference: reference,
                description: description,
                meta_data: _objectSpread(_objectSpread({}, metadata), {}, {
                  balance_type: 'wallet'
                })
              }));
            case 1:
            case "end":
              return _context18.stop();
          }
        }, _callee18, this);
      }));
      function debitWalletBalance(_x41, _x42, _x43, _x44, _x45, _x46) {
        return _debitWalletBalance.apply(this, arguments);
      }
      return debitWalletBalance;
    }()
    /**
     * Credit loan balance (loan disbursement)
     */
    )
  }, {
    key: "creditLoanBalance",
    value: (function () {
      var _creditLoanBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee19(systemBalanceId, loanBalanceId, amount, reference, description, metadata) {
        return _regenerator["default"].wrap(function (_context19) {
          while (1) switch (_context19.prev = _context19.next) {
            case 0:
              return _context19.abrupt("return", this.createTransaction({
                amount: amount,
                currency: 'RWF',
                source: systemBalanceId,
                destination: loanBalanceId,
                reference: reference,
                description: description,
                meta_data: _objectSpread(_objectSpread({}, metadata), {}, {
                  balance_type: 'loan'
                })
              }));
            case 1:
            case "end":
              return _context19.stop();
          }
        }, _callee19, this);
      }));
      function creditLoanBalance(_x47, _x48, _x49, _x50, _x51, _x52) {
        return _creditLoanBalance.apply(this, arguments);
      }
      return creditLoanBalance;
    }()
    /**
     * Debit loan balance (loan repayment or purchase using loan)
     */
    )
  }, {
    key: "debitLoanBalance",
    value: (function () {
      var _debitLoanBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee20(loanBalanceId, destinationBalanceId, amount, reference, description, metadata) {
        return _regenerator["default"].wrap(function (_context20) {
          while (1) switch (_context20.prev = _context20.next) {
            case 0:
              return _context20.abrupt("return", this.createTransaction({
                amount: amount,
                currency: 'RWF',
                source: loanBalanceId,
                destination: destinationBalanceId,
                reference: reference,
                description: description,
                meta_data: _objectSpread(_objectSpread({}, metadata), {}, {
                  balance_type: 'loan'
                })
              }));
            case 1:
            case "end":
              return _context20.stop();
          }
        }, _callee20, this);
      }));
      function debitLoanBalance(_x53, _x54, _x55, _x56, _x57, _x58) {
        return _debitLoanBalance.apply(this, arguments);
      }
      return debitLoanBalance;
    }()
    /**
     * Get user's wallet and loan balances
     */
    )
  }, {
    key: "getUserBalances",
    value: (function () {
      var _getUserBalances = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee21(walletBalanceId, loanBalanceId) {
        var _yield$Promise$all, _yield$Promise$all2, wallet, loan;
        return _regenerator["default"].wrap(function (_context21) {
          while (1) switch (_context21.prev = _context21.next) {
            case 0:
              _context21.next = 1;
              return Promise.all([this.getBalance(walletBalanceId), this.getBalance(loanBalanceId)]);
            case 1:
              _yield$Promise$all = _context21.sent;
              _yield$Promise$all2 = (0, _slicedToArray2["default"])(_yield$Promise$all, 2);
              wallet = _yield$Promise$all2[0];
              loan = _yield$Promise$all2[1];
              return _context21.abrupt("return", {
                walletBalance: wallet.balance,
                loanBalance: loan.balance,
                totalBalance: wallet.balance + loan.balance
              });
            case 2:
            case "end":
              return _context21.stop();
          }
        }, _callee21, this);
      }));
      function getUserBalances(_x59, _x60) {
        return _getUserBalances.apply(this, arguments);
      }
      return getUserBalances;
    }())
  }]);
}(_medusa.TransactionBaseService);
var _default = exports["default"] = BlnkService;