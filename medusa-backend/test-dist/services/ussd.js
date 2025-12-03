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
var _blnk = _interopRequireDefault(require("./blnk"));
var _gas = _interopRequireDefault(require("./gas"));
var _sms = _interopRequireDefault(require("./sms"));
var _momo = _interopRequireDefault(require("./momo"));
var _airtel = _interopRequireDefault(require("./airtel"));
// USSD Menu States
var STATES = {
  MAIN_MENU: 'main_menu',
  WALLET_MENU: 'wallet_menu',
  GAS_MENU: 'gas_menu',
  CARD_MENU: 'card_menu',
  LOAN_MENU: 'loan_menu',
  ENTER_AMOUNT: 'enter_amount',
  ENTER_METER: 'enter_meter',
  ENTER_CARD_ID: 'enter_card_id',
  ENTER_PIN: 'enter_pin',
  CONFIRM_TRANSACTION: 'confirm_transaction',
  PROCESSING: 'processing'
};
var USSDService = /*#__PURE__*/function () {
  function USSDService(container) {
    (0, _classCallCheck2["default"])(this, USSDService);
    (0, _defineProperty2["default"])(this, "db", void 0);
    (0, _defineProperty2["default"])(this, "blnkService", void 0);
    (0, _defineProperty2["default"])(this, "gasService", void 0);
    (0, _defineProperty2["default"])(this, "smsService", void 0);
    (0, _defineProperty2["default"])(this, "momoService", void 0);
    (0, _defineProperty2["default"])(this, "airtelService", void 0);
    (0, _defineProperty2["default"])(this, "predefinedAmounts", [300, 500, 1000, 2000, 5000, 10000]);
    this.db = new _pg.Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.blnkService = new _blnk["default"](container);
    this.gasService = new _gas["default"]();
    this.smsService = new _sms["default"]();
    this.momoService = new _momo["default"]();
    this.airtelService = new _airtel["default"]();
  }

  /**
   * Main USSD handler - processes incoming USSD requests
   */
  return (0, _createClass2["default"])(USSDService, [{
    key: "handleRequest",
    value: (function () {
      var _handleRequest = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(request) {
        var sessionId, phoneNumber, text, formattedPhone, session, inputs, currentInput, response;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              sessionId = request.sessionId, phoneNumber = request.phoneNumber, text = request.text;
              formattedPhone = this.formatPhone(phoneNumber); // Get or create session
              _context.next = 1;
              return this.getSession(sessionId);
            case 1:
              session = _context.sent;
              if (session) {
                _context.next = 3;
                break;
              }
              _context.next = 2;
              return this.createSession(sessionId, formattedPhone);
            case 2:
              session = _context.sent;
            case 3:
              // Parse user input
              inputs = text.split('*').filter(function (i) {
                return i !== '';
              });
              currentInput = inputs[inputs.length - 1] || ''; // Process based on current state
              _context.next = 4;
              return this.processState(session, currentInput, formattedPhone);
            case 4:
              response = _context.sent;
              _context.next = 5;
              return this.updateSession(sessionId, session.data);
            case 5:
              return _context.abrupt("return", response);
            case 6:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function handleRequest(_x) {
        return _handleRequest.apply(this, arguments);
      }
      return handleRequest;
    }()
    /**
     * Process current state and return response
     */
    )
  }, {
    key: "processState",
    value: (function () {
      var _processState = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(session, input, phone) {
        var state, _t;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              state = session.data.currentState;
              _t = state;
              _context2.next = _t === STATES.MAIN_MENU ? 1 : _t === STATES.WALLET_MENU ? 2 : _t === STATES.GAS_MENU ? 3 : _t === STATES.CARD_MENU ? 4 : _t === STATES.LOAN_MENU ? 5 : _t === STATES.ENTER_AMOUNT ? 6 : _t === STATES.ENTER_METER ? 7 : _t === STATES.ENTER_CARD_ID ? 8 : _t === STATES.ENTER_PIN ? 9 : _t === STATES.CONFIRM_TRANSACTION ? 10 : 11;
              break;
            case 1:
              return _context2.abrupt("return", this.handleMainMenu(session, input));
            case 2:
              return _context2.abrupt("return", this.handleWalletMenu(session, input, phone));
            case 3:
              return _context2.abrupt("return", this.handleGasMenu(session, input, phone));
            case 4:
              return _context2.abrupt("return", this.handleCardMenu(session, input, phone));
            case 5:
              return _context2.abrupt("return", this.handleLoanMenu(session, input, phone));
            case 6:
              return _context2.abrupt("return", this.handleEnterAmount(session, input));
            case 7:
              return _context2.abrupt("return", this.handleEnterMeter(session, input));
            case 8:
              return _context2.abrupt("return", this.handleEnterCardId(session, input));
            case 9:
              return _context2.abrupt("return", this.handleEnterPin(session, input, phone));
            case 10:
              return _context2.abrupt("return", this.handleConfirmation(session, input, phone));
            case 11:
              return _context2.abrupt("return", this.showMainMenu(session));
            case 12:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function processState(_x2, _x3, _x4) {
        return _processState.apply(this, arguments);
      }
      return processState;
    }()
    /**
     * Show main menu
     */
    )
  }, {
    key: "showMainMenu",
    value: function showMainMenu(session) {
      session.data.currentState = STATES.MAIN_MENU;
      session.data.selectedService = undefined;
      return {
        response: "Welcome to BIG Company\n1. Check Balance\n2. Top Up Wallet\n3. Buy Gas\n4. Shop Card\n5. Loans\n6. Help",
        endSession: false
      };
    }

    /**
     * Handle main menu selection
     */
  }, {
    key: "handleMainMenu",
    value: (function () {
      var _handleMainMenu = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(session, input) {
        var _t2;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _t2 = input;
              _context3.next = _t2 === '1' ? 1 : _t2 === '2' ? 2 : _t2 === '3' ? 3 : _t2 === '4' ? 4 : _t2 === '5' ? 5 : _t2 === '6' ? 6 : 7;
              break;
            case 1:
              session.data.currentState = STATES.WALLET_MENU;
              session.data.selectedService = 'balance';
              return _context3.abrupt("return", {
                response: 'Enter your PIN:',
                endSession: false
              });
            case 2:
              session.data.currentState = STATES.WALLET_MENU;
              session.data.selectedService = 'topup';
              return _context3.abrupt("return", {
                response: "Top Up Wallet\nSelect amount:\n1. 300 RWF\n2. 500 RWF\n3. 1,000 RWF\n4. 2,000 RWF\n5. 5,000 RWF\n6. 10,000 RWF\n7. Other amount",
                endSession: false
              });
            case 3:
              session.data.currentState = STATES.GAS_MENU;
              session.data.selectedService = 'gas';
              return _context3.abrupt("return", {
                response: "Buy Gas\nSelect amount:\n1. 300 RWF\n2. 500 RWF\n3. 1,000 RWF\n4. 2,000 RWF\n5. 5,000 RWF\n6. 10,000 RWF",
                endSession: false
              });
            case 4:
              session.data.currentState = STATES.CARD_MENU;
              return _context3.abrupt("return", {
                response: "Shop Card\n1. Top Up Card\n2. Check Card Balance\n3. Link New Card",
                endSession: false
              });
            case 5:
              session.data.currentState = STATES.LOAN_MENU;
              return _context3.abrupt("return", {
                response: "Loans\n1. Apply for Food Loan\n2. Check Loan Status\n3. Repay Loan",
                endSession: false
              });
            case 6:
              return _context3.abrupt("return", {
                response: "BIG Company Help\n- Dial *939*6# for support\n- SMS HELP to 8939\n- Visit big.rw/help\n- WhatsApp: +250788000000",
                endSession: true
              });
            case 7:
              return _context3.abrupt("return", this.showMainMenu(session));
            case 8:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function handleMainMenu(_x5, _x6) {
        return _handleMainMenu.apply(this, arguments);
      }
      return handleMainMenu;
    }()
    /**
     * Handle wallet menu
     */
    )
  }, {
    key: "handleWalletMenu",
    value: (function () {
      var _handleWalletMenu = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(session, input, phone) {
        var service, customer, pinValid, balance, amountIndex, _session$data$amount;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              service = session.data.selectedService;
              if (!(service === 'balance')) {
                _context4.next = 6;
                break;
              }
              _context4.next = 1;
              return this.getCustomerByPhone(phone);
            case 1:
              customer = _context4.sent;
              if (customer) {
                _context4.next = 2;
                break;
              }
              return _context4.abrupt("return", {
                response: 'Account not found. Register at big.rw',
                endSession: true
              });
            case 2:
              _context4.next = 3;
              return this.verifyPin(customer.id, input);
            case 3:
              pinValid = _context4.sent;
              if (pinValid) {
                _context4.next = 4;
                break;
              }
              return _context4.abrupt("return", {
                response: 'Invalid PIN. Try again.',
                endSession: true
              });
            case 4:
              _context4.next = 5;
              return this.blnkService.getCustomerBalance(customer.id, 'customer_wallets');
            case 5:
              balance = _context4.sent;
              return _context4.abrupt("return", {
                response: "Your BIG Wallet Balance:\n".concat(balance.toLocaleString(), " RWF\n\nLast updated: ").concat(new Date().toLocaleString('en-RW', {
                  timeZone: 'Africa/Kigali'
                })),
                endSession: true
              });
            case 6:
              if (!(service === 'topup')) {
                _context4.next = 9;
                break;
              }
              // Handle amount selection
              amountIndex = parseInt(input) - 1;
              if (!(input === '7')) {
                _context4.next = 7;
                break;
              }
              session.data.currentState = STATES.ENTER_AMOUNT;
              return _context4.abrupt("return", {
                response: 'Enter amount in RWF:',
                endSession: false
              });
            case 7:
              if (!(amountIndex >= 0 && amountIndex < this.predefinedAmounts.length)) {
                _context4.next = 8;
                break;
              }
              session.data.amount = this.predefinedAmounts[amountIndex];
              session.data.currentState = STATES.CONFIRM_TRANSACTION;
              session.data.data = {
                type: 'wallet_topup'
              };
              return _context4.abrupt("return", {
                response: "Top Up ".concat((_session$data$amount = session.data.amount) === null || _session$data$amount === void 0 ? void 0 : _session$data$amount.toLocaleString(), " RWF to your wallet?\n1. Confirm (Pay via MoMo)\n2. Cancel"),
                endSession: false
              });
            case 8:
              return _context4.abrupt("return", {
                response: 'Invalid selection',
                endSession: true
              });
            case 9:
              return _context4.abrupt("return", this.showMainMenu(session));
            case 10:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function handleWalletMenu(_x7, _x8, _x9) {
        return _handleWalletMenu.apply(this, arguments);
      }
      return handleWalletMenu;
    }()
    /**
     * Handle gas menu
     */
    )
  }, {
    key: "handleGasMenu",
    value: (function () {
      var _handleGasMenu = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(session, input, phone) {
        var amountIndex, customer, meters, meterList;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              if (session.data.amount) {
                _context5.next = 5;
                break;
              }
              amountIndex = parseInt(input) - 1;
              if (!(amountIndex >= 0 && amountIndex < this.predefinedAmounts.length)) {
                _context5.next = 4;
                break;
              }
              session.data.amount = this.predefinedAmounts[amountIndex];
              session.data.currentState = STATES.ENTER_METER;

              // Check if user has saved meters
              _context5.next = 1;
              return this.getCustomerByPhone(phone);
            case 1:
              customer = _context5.sent;
              if (!customer) {
                _context5.next = 3;
                break;
              }
              _context5.next = 2;
              return this.gasService.getUserMeters(customer.id);
            case 2:
              meters = _context5.sent;
              if (!(meters.length > 0)) {
                _context5.next = 3;
                break;
              }
              meterList = meters.map(function (m, i) {
                return "".concat(i + 1, ". ").concat(m.meterNumber);
              }).join('\n');
              return _context5.abrupt("return", {
                response: "Select meter or enter new:\n".concat(meterList, "\n").concat(meters.length + 1, ". Enter new meter"),
                endSession: false
              });
            case 3:
              return _context5.abrupt("return", {
                response: 'Enter meter number:',
                endSession: false
              });
            case 4:
              return _context5.abrupt("return", {
                response: 'Invalid selection',
                endSession: true
              });
            case 5:
              return _context5.abrupt("return", this.showMainMenu(session));
            case 6:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function handleGasMenu(_x0, _x1, _x10) {
        return _handleGasMenu.apply(this, arguments);
      }
      return handleGasMenu;
    }()
    /**
     * Handle meter entry
     */
    )
  }, {
    key: "handleEnterMeter",
    value: (function () {
      var _handleEnterMeter = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(session, input) {
        var _session$data$amount2;
        var meterNumber, meterInfo;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              meterNumber = input.replace(/\D/g, '');
              if (!(meterNumber.length < 11)) {
                _context6.next = 1;
                break;
              }
              return _context6.abrupt("return", {
                response: 'Invalid meter number. Please try again:',
                endSession: false
              });
            case 1:
              _context6.next = 2;
              return this.gasService.validateMeter(meterNumber);
            case 2:
              meterInfo = _context6.sent;
              if (meterInfo) {
                _context6.next = 3;
                break;
              }
              return _context6.abrupt("return", {
                response: 'Meter not found. Check number and try again.',
                endSession: true
              });
            case 3:
              session.data.meterNumber = meterNumber;
              session.data.currentState = STATES.CONFIRM_TRANSACTION;
              session.data.data = {
                type: 'gas_purchase',
                meterInfo: meterInfo
              };
              return _context6.abrupt("return", {
                response: "Buy Gas:\nMeter: ".concat(meterNumber, "\nName: ").concat(meterInfo.customerName, "\nAmount: ").concat((_session$data$amount2 = session.data.amount) === null || _session$data$amount2 === void 0 ? void 0 : _session$data$amount2.toLocaleString(), " RWF\n\n1. Confirm (Pay via MoMo)\n2. Cancel"),
                endSession: false
              });
            case 4:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function handleEnterMeter(_x11, _x12) {
        return _handleEnterMeter.apply(this, arguments);
      }
      return handleEnterMeter;
    }()
    /**
     * Handle card menu
     */
    )
  }, {
    key: "handleCardMenu",
    value: (function () {
      var _handleCardMenu = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(session, input, phone) {
        var _t3;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              _t3 = input;
              _context7.next = _t3 === '1' ? 1 : _t3 === '2' ? 2 : _t3 === '3' ? 3 : 4;
              break;
            case 1:
              session.data.selectedService = 'card_topup';
              session.data.currentState = STATES.ENTER_CARD_ID;
              return _context7.abrupt("return", {
                response: 'Enter your Card ID (printed on card):',
                endSession: false
              });
            case 2:
              session.data.selectedService = 'card_balance';
              session.data.currentState = STATES.ENTER_CARD_ID;
              return _context7.abrupt("return", {
                response: 'Enter your Card ID:',
                endSession: false
              });
            case 3:
              session.data.selectedService = 'card_link';
              session.data.currentState = STATES.ENTER_CARD_ID;
              return _context7.abrupt("return", {
                response: 'Enter the Card ID to link:',
                endSession: false
              });
            case 4:
              return _context7.abrupt("return", this.showMainMenu(session));
            case 5:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function handleCardMenu(_x13, _x14, _x15) {
        return _handleCardMenu.apply(this, arguments);
      }
      return handleCardMenu;
    }()
    /**
     * Handle card ID entry
     */
    )
  }, {
    key: "handleEnterCardId",
    value: (function () {
      var _handleEnterCardId = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(session, input) {
        var cardId, card, service;
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              cardId = input.trim().toUpperCase(); // Validate card exists
              _context8.next = 1;
              return this.db.query('SELECT * FROM bigcompany.nfc_cards WHERE dashboard_id = $1', [cardId]);
            case 1:
              card = _context8.sent;
              if (!(card.rows.length === 0)) {
                _context8.next = 2;
                break;
              }
              return _context8.abrupt("return", {
                response: 'Card not found. Check ID and try again.',
                endSession: true
              });
            case 2:
              session.data.cardId = cardId;
              service = session.data.selectedService;
              if (!(service === 'card_topup')) {
                _context8.next = 3;
                break;
              }
              session.data.currentState = STATES.ENTER_AMOUNT;
              return _context8.abrupt("return", {
                response: "Top Up Card ".concat(cardId, "\nSelect amount:\n1. 300 RWF\n2. 500 RWF\n3. 1,000 RWF\n4. 2,000 RWF\n5. 5,000 RWF\n6. 10,000 RWF"),
                endSession: false
              });
            case 3:
              if (!(service === 'card_balance')) {
                _context8.next = 4;
                break;
              }
              session.data.currentState = STATES.ENTER_PIN;
              return _context8.abrupt("return", {
                response: 'Enter card PIN:',
                endSession: false
              });
            case 4:
              if (!(service === 'card_link')) {
                _context8.next = 5;
                break;
              }
              session.data.currentState = STATES.ENTER_PIN;
              session.data.data = {
                cardData: card.rows[0]
              };
              return _context8.abrupt("return", {
                response: 'Enter PIN to confirm linking:',
                endSession: false
              });
            case 5:
              return _context8.abrupt("return", this.showMainMenu(session));
            case 6:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this);
      }));
      function handleEnterCardId(_x16, _x17) {
        return _handleEnterCardId.apply(this, arguments);
      }
      return handleEnterCardId;
    }()
    /**
     * Handle loan menu
     */
    )
  }, {
    key: "handleLoanMenu",
    value: (function () {
      var _handleLoanMenu = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(session, input, phone) {
        var _eligible$maxAmount;
        var customer, eligible, loans, activeLoan, _t4;
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 1;
              return this.getCustomerByPhone(phone);
            case 1:
              customer = _context9.sent;
              if (customer) {
                _context9.next = 2;
                break;
              }
              return _context9.abrupt("return", {
                response: 'Register at big.rw to access loans.',
                endSession: true
              });
            case 2:
              _t4 = input;
              _context9.next = _t4 === '1' ? 3 : _t4 === '2' ? 6 : _t4 === '3' ? 9 : 10;
              break;
            case 3:
              _context9.next = 4;
              return this.checkLoanEligibility(customer.id);
            case 4:
              eligible = _context9.sent;
              if (eligible.eligible) {
                _context9.next = 5;
                break;
              }
              return _context9.abrupt("return", {
                response: "Loan not available: ".concat(eligible.reason),
                endSession: true
              });
            case 5:
              session.data.selectedService = 'loan_apply';
              return _context9.abrupt("return", {
                response: "Food Loan\nMax amount: ".concat((_eligible$maxAmount = eligible.maxAmount) === null || _eligible$maxAmount === void 0 ? void 0 : _eligible$maxAmount.toLocaleString(), " RWF\nSelect loan amount:\n1. 1,000 RWF\n2. 2,000 RWF\n3. 3,000 RWF\n4. 5,000 RWF"),
                endSession: false
              });
            case 6:
              _context9.next = 7;
              return this.getUserLoans(customer.id);
            case 7:
              loans = _context9.sent;
              if (!(loans.length === 0)) {
                _context9.next = 8;
                break;
              }
              return _context9.abrupt("return", {
                response: 'No active loans.',
                endSession: true
              });
            case 8:
              activeLoan = loans[0];
              return _context9.abrupt("return", {
                response: "Loan Status:\nLoan #".concat(activeLoan.loan_number, "\nPrincipal: ").concat(activeLoan.principal.toLocaleString(), " RWF\nOutstanding: ").concat(activeLoan.outstanding_balance.toLocaleString(), " RWF\nDue: ").concat(new Date(activeLoan.due_date).toLocaleDateString(), "\nStatus: ").concat(activeLoan.status),
                endSession: true
              });
            case 9:
              session.data.selectedService = 'loan_repay';
              session.data.currentState = STATES.ENTER_AMOUNT;
              return _context9.abrupt("return", {
                response: 'Enter repayment amount in RWF:',
                endSession: false
              });
            case 10:
              return _context9.abrupt("return", this.showMainMenu(session));
            case 11:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function handleLoanMenu(_x18, _x19, _x20) {
        return _handleLoanMenu.apply(this, arguments);
      }
      return handleLoanMenu;
    }()
    /**
     * Handle transaction confirmation
     */
    )
  }, {
    key: "handleConfirmation",
    value: (function () {
      var _handleConfirmation = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(session, input, phone) {
        var _session$data$data;
        var transactionType, amount, isMTN, provider, reference, paymentResult;
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              if (!(input === '2')) {
                _context0.next = 1;
                break;
              }
              return _context0.abrupt("return", {
                response: 'Transaction cancelled.',
                endSession: true
              });
            case 1:
              if (!(input !== '1')) {
                _context0.next = 2;
                break;
              }
              return _context0.abrupt("return", {
                response: 'Invalid selection. Transaction cancelled.',
                endSession: true
              });
            case 2:
              transactionType = (_session$data$data = session.data.data) === null || _session$data$data === void 0 ? void 0 : _session$data$data.type;
              amount = session.data.amount || 0; // Determine provider based on phone number
              isMTN = this.isMTNNumber(phone);
              provider = isMTN ? 'mtn_momo' : 'airtel_money'; // Initiate mobile money payment
              reference = "USSD-".concat(Date.now());
              if (!isMTN) {
                _context0.next = 4;
                break;
              }
              _context0.next = 3;
              return this.momoService.requestPayment({
                amount: amount,
                currency: 'RWF',
                externalId: reference,
                payerPhone: phone,
                payerMessage: "BIG ".concat(transactionType, " - ").concat(amount, " RWF")
              });
            case 3:
              paymentResult = _context0.sent;
              _context0.next = 6;
              break;
            case 4:
              _context0.next = 5;
              return this.airtelService.requestPayment({
                amount: amount,
                phone: phone,
                reference: reference
              });
            case 5:
              paymentResult = _context0.sent;
            case 6:
              if (paymentResult.success) {
                _context0.next = 7;
                break;
              }
              return _context0.abrupt("return", {
                response: 'Payment failed. Please try again.',
                endSession: true
              });
            case 7:
              _context0.next = 8;
              return this.db.query("\n      INSERT INTO bigcompany.ussd_sessions\n      (session_id, phone_number, current_state, session_data)\n      VALUES ($1, $2, 'payment_pending', $3)\n      ON CONFLICT (session_id) DO UPDATE\n      SET session_data = $3, current_state = 'payment_pending'\n    ", [reference, phone, JSON.stringify({
                type: transactionType,
                amount: amount,
                meter: session.data.meterNumber,
                card: session.data.cardId,
                paymentRef: paymentResult.referenceId || paymentResult.transactionId
              })]);
            case 8:
              return _context0.abrupt("return", {
                response: "Payment request sent!\nAmount: ".concat(amount.toLocaleString(), " RWF\n\nApprove the ").concat(isMTN ? 'MTN MoMo' : 'Airtel Money', " prompt on your phone.\n\nRef: ").concat(reference),
                endSession: true
              });
            case 9:
            case "end":
              return _context0.stop();
          }
        }, _callee0, this);
      }));
      function handleConfirmation(_x21, _x22, _x23) {
        return _handleConfirmation.apply(this, arguments);
      }
      return handleConfirmation;
    }()
    /**
     * Handle amount entry
     */
    )
  }, {
    key: "handleEnterAmount",
    value: (function () {
      var _handleEnterAmount = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(session, input) {
        var amountIndex, amount;
        return _regenerator["default"].wrap(function (_context1) {
          while (1) switch (_context1.prev = _context1.next) {
            case 0:
              // Check if selecting from predefined
              amountIndex = parseInt(input) - 1;
              if (!(amountIndex >= 0 && amountIndex < this.predefinedAmounts.length)) {
                _context1.next = 1;
                break;
              }
              session.data.amount = this.predefinedAmounts[amountIndex];
              _context1.next = 3;
              break;
            case 1:
              amount = parseInt(input);
              if (!(isNaN(amount) || amount < 100)) {
                _context1.next = 2;
                break;
              }
              return _context1.abrupt("return", {
                response: 'Invalid amount. Minimum 100 RWF:',
                endSession: false
              });
            case 2:
              session.data.amount = amount;
            case 3:
              session.data.currentState = STATES.CONFIRM_TRANSACTION;
              if (!(session.data.selectedService === 'card_topup')) {
                _context1.next = 4;
                break;
              }
              session.data.data = {
                type: 'card_topup'
              };
              return _context1.abrupt("return", {
                response: "Top Up Card ".concat(session.data.cardId, "\nAmount: ").concat(session.data.amount.toLocaleString(), " RWF\n\n1. Confirm\n2. Cancel"),
                endSession: false
              });
            case 4:
              return _context1.abrupt("return", {
                response: "Confirm ".concat(session.data.amount.toLocaleString(), " RWF?\n1. Yes\n2. No"),
                endSession: false
              });
            case 5:
            case "end":
              return _context1.stop();
          }
        }, _callee1, this);
      }));
      function handleEnterAmount(_x24, _x25) {
        return _handleEnterAmount.apply(this, arguments);
      }
      return handleEnterAmount;
    }()
    /**
     * Handle PIN entry
     */
    )
  }, {
    key: "handleEnterPin",
    value: (function () {
      var _handleEnterPin = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(session, input, phone) {
        var customer, pinValid, service, card, balance;
        return _regenerator["default"].wrap(function (_context10) {
          while (1) switch (_context10.prev = _context10.next) {
            case 0:
              _context10.next = 1;
              return this.getCustomerByPhone(phone);
            case 1:
              customer = _context10.sent;
              if (customer) {
                _context10.next = 2;
                break;
              }
              return _context10.abrupt("return", {
                response: 'Account not found.',
                endSession: true
              });
            case 2:
              _context10.next = 3;
              return this.verifyPin(customer.id, input);
            case 3:
              pinValid = _context10.sent;
              if (pinValid) {
                _context10.next = 4;
                break;
              }
              return _context10.abrupt("return", {
                response: 'Invalid PIN.',
                endSession: true
              });
            case 4:
              service = session.data.selectedService;
              if (!(service === 'card_balance')) {
                _context10.next = 8;
                break;
              }
              _context10.next = 5;
              return this.db.query('SELECT * FROM bigcompany.nfc_cards WHERE dashboard_id = $1 AND user_id = $2', [session.data.cardId, customer.id]);
            case 5:
              card = _context10.sent;
              if (!(card.rows.length === 0)) {
                _context10.next = 6;
                break;
              }
              return _context10.abrupt("return", {
                response: 'Card not linked to your account.',
                endSession: true
              });
            case 6:
              _context10.next = 7;
              return this.blnkService.getCustomerBalance(customer.id, 'customer_wallets');
            case 7:
              balance = _context10.sent;
              return _context10.abrupt("return", {
                response: "Card ".concat(session.data.cardId, "\nBalance: ").concat(balance.toLocaleString(), " RWF"),
                endSession: true
              });
            case 8:
              return _context10.abrupt("return", this.showMainMenu(session));
            case 9:
            case "end":
              return _context10.stop();
          }
        }, _callee10, this);
      }));
      function handleEnterPin(_x26, _x27, _x28) {
        return _handleEnterPin.apply(this, arguments);
      }
      return handleEnterPin;
    }() // ==================== HELPER METHODS ====================
    )
  }, {
    key: "getSession",
    value: function () {
      var _getSession = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(sessionId) {
        var result;
        return _regenerator["default"].wrap(function (_context11) {
          while (1) switch (_context11.prev = _context11.next) {
            case 0:
              _context11.next = 1;
              return this.db.query('SELECT * FROM bigcompany.ussd_sessions WHERE session_id = $1', [sessionId]);
            case 1:
              result = _context11.sent;
              if (!(result.rows.length === 0)) {
                _context11.next = 2;
                break;
              }
              return _context11.abrupt("return", null);
            case 2:
              return _context11.abrupt("return", {
                id: result.rows[0].id,
                data: result.rows[0].session_data || {
                  currentState: STATES.MAIN_MENU
                }
              });
            case 3:
            case "end":
              return _context11.stop();
          }
        }, _callee11, this);
      }));
      function getSession(_x29) {
        return _getSession.apply(this, arguments);
      }
      return getSession;
    }()
  }, {
    key: "createSession",
    value: function () {
      var _createSession = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12(sessionId, phone) {
        var result;
        return _regenerator["default"].wrap(function (_context12) {
          while (1) switch (_context12.prev = _context12.next) {
            case 0:
              _context12.next = 1;
              return this.db.query("\n      INSERT INTO bigcompany.ussd_sessions (session_id, phone_number, current_state, session_data)\n      VALUES ($1, $2, $3, $4)\n      RETURNING id\n    ", [sessionId, phone, STATES.MAIN_MENU, JSON.stringify({
                currentState: STATES.MAIN_MENU
              })]);
            case 1:
              result = _context12.sent;
              return _context12.abrupt("return", {
                id: result.rows[0].id,
                data: {
                  currentState: STATES.MAIN_MENU
                }
              });
            case 2:
            case "end":
              return _context12.stop();
          }
        }, _callee12, this);
      }));
      function createSession(_x30, _x31) {
        return _createSession.apply(this, arguments);
      }
      return createSession;
    }()
  }, {
    key: "updateSession",
    value: function () {
      var _updateSession = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee13(sessionId, data) {
        return _regenerator["default"].wrap(function (_context13) {
          while (1) switch (_context13.prev = _context13.next) {
            case 0:
              _context13.next = 1;
              return this.db.query("\n      UPDATE bigcompany.ussd_sessions\n      SET session_data = $1, current_state = $2, last_input = $3\n      WHERE session_id = $4\n    ", [JSON.stringify(data), data.currentState, new Date().toISOString(), sessionId]);
            case 1:
            case "end":
              return _context13.stop();
          }
        }, _callee13, this);
      }));
      function updateSession(_x32, _x33) {
        return _updateSession.apply(this, arguments);
      }
      return updateSession;
    }()
  }, {
    key: "getCustomerByPhone",
    value: function () {
      var _getCustomerByPhone = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee14(phone) {
        var formattedPhone, result;
        return _regenerator["default"].wrap(function (_context14) {
          while (1) switch (_context14.prev = _context14.next) {
            case 0:
              formattedPhone = this.formatPhone(phone);
              _context14.next = 1;
              return this.db.query("SELECT id FROM customer WHERE phone = $1 OR metadata->>'phone' = $1", [formattedPhone]);
            case 1:
              result = _context14.sent;
              return _context14.abrupt("return", result.rows[0] || null);
            case 2:
            case "end":
              return _context14.stop();
          }
        }, _callee14, this);
      }));
      function getCustomerByPhone(_x34) {
        return _getCustomerByPhone.apply(this, arguments);
      }
      return getCustomerByPhone;
    }()
  }, {
    key: "verifyPin",
    value: function () {
      var _verifyPin = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee15(customerId, pin) {
        var _result$rows$;
        var result, crypto, inputHash;
        return _regenerator["default"].wrap(function (_context15) {
          while (1) switch (_context15.prev = _context15.next) {
            case 0:
              _context15.next = 1;
              return this.db.query("SELECT metadata->>'pin_hash' as pin_hash FROM customer WHERE id = $1", [customerId]);
            case 1:
              result = _context15.sent;
              if ((_result$rows$ = result.rows[0]) !== null && _result$rows$ !== void 0 && _result$rows$.pin_hash) {
                _context15.next = 2;
                break;
              }
              return _context15.abrupt("return", false);
            case 2:
              crypto = require('crypto');
              inputHash = crypto.createHash('sha256').update(pin).digest('hex');
              return _context15.abrupt("return", inputHash === result.rows[0].pin_hash);
            case 3:
            case "end":
              return _context15.stop();
          }
        }, _callee15, this);
      }));
      function verifyPin(_x35, _x36) {
        return _verifyPin.apply(this, arguments);
      }
      return verifyPin;
    }()
  }, {
    key: "checkLoanEligibility",
    value: function () {
      var _checkLoanEligibility = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee16(customerId) {
        var existingLoans;
        return _regenerator["default"].wrap(function (_context16) {
          while (1) switch (_context16.prev = _context16.next) {
            case 0:
              _context16.next = 1;
              return this.db.query("\n      SELECT * FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('active', 'disbursed', 'pending')\n    ", [customerId]);
            case 1:
              existingLoans = _context16.sent;
              if (!(existingLoans.rows.length > 0)) {
                _context16.next = 2;
                break;
              }
              return _context16.abrupt("return", {
                eligible: false,
                reason: 'You have an existing loan'
              });
            case 2:
              return _context16.abrupt("return", {
                eligible: true,
                maxAmount: 5000
              });
            case 3:
            case "end":
              return _context16.stop();
          }
        }, _callee16, this);
      }));
      function checkLoanEligibility(_x37) {
        return _checkLoanEligibility.apply(this, arguments);
      }
      return checkLoanEligibility;
    }()
  }, {
    key: "getUserLoans",
    value: function () {
      var _getUserLoans = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee17(customerId) {
        var result;
        return _regenerator["default"].wrap(function (_context17) {
          while (1) switch (_context17.prev = _context17.next) {
            case 0:
              _context17.next = 1;
              return this.db.query("\n      SELECT * FROM bigcompany.loans\n      WHERE borrower_id = $1\n      ORDER BY created_at DESC\n      LIMIT 5\n    ", [customerId]);
            case 1:
              result = _context17.sent;
              return _context17.abrupt("return", result.rows);
            case 2:
            case "end":
              return _context17.stop();
          }
        }, _callee17, this);
      }));
      function getUserLoans(_x38) {
        return _getUserLoans.apply(this, arguments);
      }
      return getUserLoans;
    }()
  }, {
    key: "formatPhone",
    value: function formatPhone(phone) {
      var cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '250' + cleaned.substring(1);
      } else if (!cleaned.startsWith('250')) {
        cleaned = '250' + cleaned;
      }
      return '+' + cleaned;
    }
  }, {
    key: "isMTNNumber",
    value: function isMTNNumber(phone) {
      var cleaned = phone.replace(/\D/g, '');
      var prefix = cleaned.substring(cleaned.length - 9, cleaned.length - 6);
      var mtnPrefixes = ['78', '79']; // MTN Rwanda prefixes
      return mtnPrefixes.some(function (p) {
        return prefix.startsWith(p);
      });
    }
  }, {
    key: "close",
    value: function () {
      var _close = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee18() {
        return _regenerator["default"].wrap(function (_context18) {
          while (1) switch (_context18.prev = _context18.next) {
            case 0:
              _context18.next = 1;
              return this.db.end();
            case 1:
            case "end":
              return _context18.stop();
          }
        }, _callee18, this);
      }));
      function close() {
        return _close.apply(this, arguments);
      }
      return close;
    }()
  }]);
}();
var _default = exports["default"] = USSDService;