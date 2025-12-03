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
var _blnk = _interopRequireDefault(require("../../../services/blnk"));
var _momo = _interopRequireDefault(require("../../../services/momo"));
var _airtel = _interopRequireDefault(require("../../../services/airtel"));
var _gas = _interopRequireDefault(require("../../../services/gas"));
var _sms = _interopRequireDefault(require("../../../services/sms"));
var router = (0, _express.Router)();
// Redis-backed session store for production, in-memory for dev
var sessions = new Map();

// Database pool
var db = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Service instances
var blnkService;
var momoService;
var airtelService;
var gasService;
var smsService;

// Initialize services
function initServices(container) {
  if (!blnkService) {
    blnkService = new _blnk["default"](container);
    momoService = new _momo["default"]();
    airtelService = new _airtel["default"]();
    gasService = new _gas["default"]();
    smsService = new _sms["default"]();
  }
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
function isAirtelNumber(phone) {
  var cleaned = normalizePhone(phone);
  var prefix = cleaned.substring(3, 5);
  return ['72', '73'].includes(prefix);
}

// Predefined amounts
var AMOUNTS = {
  '1': 300,
  '2': 500,
  '3': 1000,
  '4': 2000,
  '5': 5000,
  '6': 10000
};

/**
 * USSD Callback Handler - Africa's Talking
 * POST /ussd/callback
 *
 * Service Code: *939# (configured in Africa's Talking dashboard)
 */
router.post('/callback', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _ref2, sessionId, serviceCode, phoneNumber, text, networkCode, normalizedPhone, session, inputs, lastInput, response, userResult, user, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          initServices(req.scope);
          _ref2 = req.body, sessionId = _ref2.sessionId, serviceCode = _ref2.serviceCode, phoneNumber = _ref2.phoneNumber, text = _ref2.text, networkCode = _ref2.networkCode;
          normalizedPhone = normalizePhone(phoneNumber); // Get or create session
          session = sessions.get(sessionId) || {
            state: 'main_menu',
            data: {},
            phone: normalizedPhone
          }; // Parse user input
          inputs = text.split('*').filter(function (i) {
            return i !== '';
          });
          lastInput = inputs.length > 0 ? inputs[inputs.length - 1] : '';
          response = '';
          _context.prev = 1;
          _context.next = 2;
          return db.query("\n      SELECT c.id as customer_id, c.email, c.phone, c.first_name, c.last_name,\n             c.metadata\n      FROM customer c\n      WHERE c.phone = $1 OR c.phone = $2 OR c.phone = $3\n    ", [phoneNumber, normalizedPhone, '+' + normalizedPhone]);
        case 2:
          userResult = _context.sent;
          user = userResult.rows[0];
          session.userId = user === null || user === void 0 ? void 0 : user.customer_id;

          // Log session start
          _context.next = 3;
          return logSession(sessionId, normalizedPhone, serviceCode, session.state, lastInput);
        case 3:
          _context.next = 4;
          return handleUSSDState(session, lastInput, user, normalizedPhone, serviceCode, networkCode);
        case 4:
          response = _context.sent;
          // Save session
          sessions.set(sessionId, session);

          // Clear session if response ends
          if (!response.startsWith('END')) {
            _context.next = 5;
            break;
          }
          sessions["delete"](sessionId);
          _context.next = 5;
          return db.query("\n        UPDATE bigcompany.ussd_sessions SET ended_at = NOW() WHERE session_id = $1\n      ", [sessionId]);
        case 5:
          // Send response with correct content type for Africa's Talking
          res.set('Content-Type', 'text/plain');
          res.send(response);
          _context.next = 7;
          break;
        case 6:
          _context.prev = 6;
          _t = _context["catch"](1);
          console.error('USSD Error:', _t);
          res.set('Content-Type', 'text/plain');
          res.send("END Habyanze. Ongera ugerageze.\nError occurred. Please try again.");
        case 7:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[1, 6]]);
  }));
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}()));

/**
 * USSD State Machine Handler
 */
function handleUSSDState(_x3, _x4, _x5, _x6, _x7, _x8) {
  return _handleUSSDState.apply(this, arguments);
} // ==================== HANDLER FUNCTIONS ====================
function _handleUSSDState() {
  _handleUSSDState = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(session, input, user, phone, serviceCode, networkCode) {
    var topupAmount, isMTN, meterNumber, meterInfo, gasAmount, paymentMethod, repayAmount, _t2, _t3, _t4;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _t2 = session.state;
          _context3.next = _t2 === 'main_menu' ? 1 : _t2 === 'main_menu_selection' ? 3 : _t2 === 'check_balance' ? 16 : _t2 === 'topup_amount' ? 18 : _t2 === 'topup_confirm' ? 20 : _t2 === 'gas_meter_select' ? 24 : _t2 === 'gas_meter_input' ? 27 : _t2 === 'gas_amount' ? 31 : _t2 === 'gas_payment_method' ? 33 : _t2 === 'pay_loan_amount' ? 36 : _t2 === 'pay_loan_confirm' ? 39 : _t2 === 'nfc_menu' ? 42 : 50;
          break;
        case 1:
          if (!(input === '')) {
            _context3.next = 2;
            break;
          }
          return _context3.abrupt("return", "CON Murakaza neza kuri BIG Company\nWelcome to BIG Company *939#\n\n1. Reba Balance (Check Balance)\n2. Uzuza Wallet (Top Up Wallet)\n3. Gura Gaz (Buy Gas)\n4. Reba Inguzanyo (Check Loan)\n5. Kwishyura Inguzanyo (Pay Loan)\n6. NFC Card\n7. Konti Yanjye (My Account)");
        case 2:
          session.state = 'main_menu_selection';
          return _context3.abrupt("return", handleUSSDState(session, input, user, phone, serviceCode, networkCode));
        case 3:
          _t3 = input;
          _context3.next = _t3 === '1' ? 4 : _t3 === '2' ? 6 : _t3 === '3' ? 7 : _t3 === '4' ? 8 : _t3 === '5' ? 10 : _t3 === '6' ? 12 : _t3 === '7' ? 13 : 15;
          break;
        case 4:
          _context3.next = 5;
          return handleCheckBalance(session, user, phone);
        case 5:
          return _context3.abrupt("return", _context3.sent);
        case 6:
          return _context3.abrupt("return", handleTopUpMenu(session, user, phone));
        case 7:
          return _context3.abrupt("return", handleGasMenu(session, user, phone));
        case 8:
          _context3.next = 9;
          return handleCheckLoan(session, user, phone);
        case 9:
          return _context3.abrupt("return", _context3.sent);
        case 10:
          _context3.next = 11;
          return handlePayLoanMenu(session, user, phone);
        case 11:
          return _context3.abrupt("return", _context3.sent);
        case 12:
          return _context3.abrupt("return", handleNFCMenu(session, user, phone));
        case 13:
          _context3.next = 14;
          return handleMyAccount(session, user, phone);
        case 14:
          return _context3.abrupt("return", _context3.sent);
        case 15:
          return _context3.abrupt("return", "END Hitamo nabi.\nInvalid selection. Dial ".concat(serviceCode, " to try again."));
        case 16:
          _context3.next = 17;
          return handleCheckBalance(session, user, phone);
        case 17:
          return _context3.abrupt("return", _context3.sent);
        case 18:
          topupAmount = AMOUNTS[input];
          if (topupAmount) {
            _context3.next = 19;
            break;
          }
          return _context3.abrupt("return", "END Hitamo nabi.\nInvalid selection. Dial ".concat(serviceCode));
        case 19:
          session.data.topup_amount = topupAmount;
          session.state = 'topup_confirm';
          isMTN = isMTNNumber(phone);
          return _context3.abrupt("return", "CON Uzuza: ".concat(topupAmount.toLocaleString(), " RWF\nTop up: ").concat(topupAmount.toLocaleString(), " RWF\nHakoreshejwe: ").concat(isMTN ? 'MTN MoMo' : 'Airtel Money', "\nVia: ").concat(isMTN ? 'MTN MoMo' : 'Airtel Money', "\n\n1. Emeza (Confirm)\n0. Gusubira Inyuma (Back)"));
        case 20:
          if (!(input === '1')) {
            _context3.next = 22;
            break;
          }
          _context3.next = 21;
          return processTopUp(session, user, phone);
        case 21:
          return _context3.abrupt("return", _context3.sent);
        case 22:
          if (!(input === '0')) {
            _context3.next = 23;
            break;
          }
          session.state = 'main_menu';
          return _context3.abrupt("return", handleUSSDState(session, '', user, phone, serviceCode, networkCode));
        case 23:
          return _context3.abrupt("return", "END Hitamo nabi. Invalid selection.");
        case 24:
          if (!(input === '1' && session.data.default_meter)) {
            _context3.next = 25;
            break;
          }
          session.data.meter_number = session.data.default_meter;
          session.state = 'gas_amount';
          return _context3.abrupt("return", getGasAmountMenu(session.data.meter_number));
        case 25:
          if (!(input === '2' || !session.data.default_meter)) {
            _context3.next = 26;
            break;
          }
          session.state = 'gas_meter_input';
          return _context3.abrupt("return", "CON Andika nimero ya gaz meter:\nEnter gas meter number:");
        case 26:
          return _context3.abrupt("return", "END Hitamo nabi. Invalid selection.");
        case 27:
          meterNumber = input.replace(/\D/g, '');
          if (!(meterNumber.length < 11)) {
            _context3.next = 28;
            break;
          }
          return _context3.abrupt("return", "END Nimero ya meter si yo.\nInvalid meter number.");
        case 28:
          _context3.next = 29;
          return gasService.validateMeter(meterNumber);
        case 29:
          meterInfo = _context3.sent;
          if (meterInfo) {
            _context3.next = 30;
            break;
          }
          return _context3.abrupt("return", "END Meter ntiboneka.\nMeter not found.");
        case 30:
          session.data.meter_number = meterNumber;
          session.data.meter_info = meterInfo;
          session.state = 'gas_amount';
          return _context3.abrupt("return", getGasAmountMenu(meterNumber, meterInfo.customerName));
        case 31:
          gasAmount = AMOUNTS[input];
          if (gasAmount) {
            _context3.next = 32;
            break;
          }
          return _context3.abrupt("return", "END Hitamo nabi. Invalid selection.");
        case 32:
          session.data.gas_amount = gasAmount;
          session.state = 'gas_payment_method';
          return _context3.abrupt("return", "CON Gura gaz: ".concat(gasAmount.toLocaleString(), " RWF\nBuy gas: ").concat(gasAmount.toLocaleString(), " RWF\nMeter: ").concat(session.data.meter_number, "\n\n1. Kwishyura kuri Wallet (Pay from Wallet)\n2. MTN MoMo\n3. Airtel Money"));
        case 33:
          paymentMethod = input === '1' ? 'wallet' : input === '2' ? 'mtn_momo' : input === '3' ? 'airtel_money' : null;
          if (paymentMethod) {
            _context3.next = 34;
            break;
          }
          return _context3.abrupt("return", "END Hitamo nabi. Invalid selection.");
        case 34:
          session.data.payment_method = paymentMethod;
          _context3.next = 35;
          return processGasPurchase(session, user, phone);
        case 35:
          return _context3.abrupt("return", _context3.sent);
        case 36:
          repayAmount = AMOUNTS[input];
          if (repayAmount) {
            _context3.next = 37;
            break;
          }
          return _context3.abrupt("return", "END Hitamo nabi. Invalid amount.");
        case 37:
          if (!(repayAmount > session.data.outstanding)) {
            _context3.next = 38;
            break;
          }
          return _context3.abrupt("return", "END Ubu bwishyu ni bwinshi.\nAmount exceeds outstanding: ".concat(session.data.outstanding.toLocaleString(), " RWF"));
        case 38:
          session.data.repay_amount = repayAmount;
          session.state = 'pay_loan_confirm';
          return _context3.abrupt("return", "CON Kwishyura inguzanyo\nPay loan: ".concat(repayAmount.toLocaleString(), " RWF\n").concat(isMTNNumber(phone) ? 'Via MTN MoMo' : 'Via Airtel Money', "\n\n1. Emeza (Confirm)\n0. Gusubira (Back)"));
        case 39:
          if (!(input === '1')) {
            _context3.next = 41;
            break;
          }
          _context3.next = 40;
          return processLoanRepayment(session, user, phone);
        case 40:
          return _context3.abrupt("return", _context3.sent);
        case 41:
          session.state = 'main_menu';
          return _context3.abrupt("return", handleUSSDState(session, '', user, phone, serviceCode, networkCode));
        case 42:
          _t4 = input;
          _context3.next = _t4 === '1' ? 43 : _t4 === '2' ? 45 : _t4 === '3' ? 47 : 49;
          break;
        case 43:
          _context3.next = 44;
          return handleCheckBalance(session, user, phone);
        case 44:
          return _context3.abrupt("return", _context3.sent);
        case 45:
          _context3.next = 46;
          return handleBlockCard(session, user);
        case 46:
          return _context3.abrupt("return", _context3.sent);
        case 47:
          _context3.next = 48;
          return handleUnblockCard(session, user);
        case 48:
          return _context3.abrupt("return", _context3.sent);
        case 49:
          return _context3.abrupt("return", "END Hitamo nabi. Invalid selection.");
        case 50:
          session.state = 'main_menu';
          return _context3.abrupt("return", handleUSSDState(session, '', user, phone, serviceCode, networkCode));
        case 51:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _handleUSSDState.apply(this, arguments);
}
function handleCheckBalance(_x9, _x0, _x1) {
  return _handleCheckBalance.apply(this, arguments);
}
function _handleCheckBalance() {
  _handleCheckBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(session, user, phone) {
    var _loanResult$rows$, walletBalance, loanResult, loanCredit, totalAvailable, _t5;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          if (user) {
            _context4.next = 1;
            break;
          }
          return _context4.abrupt("return", "END Ntimwanditse kuri BIG Company.\nYou are not registered.\nIyandikishe kuri bigcompany.rw\nRegister at bigcompany.rw");
        case 1:
          _context4.prev = 1;
          _context4.next = 2;
          return blnkService.getCustomerBalance(user.customer_id, 'customer_wallets');
        case 2:
          walletBalance = _context4.sent;
          _context4.next = 3;
          return db.query("\n      SELECT outstanding_balance FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('active', 'disbursed')\n      AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')\n    ", [user.customer_id]);
        case 3:
          loanResult = _context4.sent;
          loanCredit = ((_loanResult$rows$ = loanResult.rows[0]) === null || _loanResult$rows$ === void 0 ? void 0 : _loanResult$rows$.outstanding_balance) || 0;
          totalAvailable = walletBalance + loanCredit;
          return _context4.abrupt("return", "END Balance yawe / Your Balance:\nWallet: ".concat(walletBalance.toLocaleString(), " RWF\nFood Credit: ").concat(loanCredit.toLocaleString(), " RWF\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nByose: ").concat(totalAvailable.toLocaleString(), " RWF\nTotal: ").concat(totalAvailable.toLocaleString(), " RWF"));
        case 4:
          _context4.prev = 4;
          _t5 = _context4["catch"](1);
          console.error('Balance check error:', _t5);
          return _context4.abrupt("return", "END Habyanze kureba balance.\nFailed to check balance.");
        case 5:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[1, 4]]);
  }));
  return _handleCheckBalance.apply(this, arguments);
}
function handleTopUpMenu(session, user, phone) {
  if (!user) {
    return "END Ntimwanditse. Iyandikishe kuri bigcompany.rw\nNot registered. Sign up at bigcompany.rw";
  }
  session.state = 'topup_amount';
  return "CON Hitamo amafaranga yo kuzuza:\nSelect top-up amount:\n\n1. 300 RWF\n2. 500 RWF\n3. 1,000 RWF\n4. 2,000 RWF\n5. 5,000 RWF\n6. 10,000 RWF";
}
function handleGasMenu(session, user, phone) {
  if (!user) {
    return "END Ntimwanditse. Iyandikishe kuri bigcompany.rw\nNot registered. Sign up at bigcompany.rw";
  }
  session.state = 'gas_meter_select';

  // Check for default meter
  // In a real implementation, fetch from database
  session.data.default_meter = null;
  return "CON Gura Gaz / Buy Gas\nAndika nimero ya meter:\nEnter meter number:";
}
function getGasAmountMenu(meterNumber, customerName) {
  return "CON Meter: ".concat(meterNumber, "\n").concat(customerName ? "Izina: ".concat(customerName) : '', "\n\nHitamo amafaranga:\nSelect amount:\n\n1. 300 RWF\n2. 500 RWF\n3. 1,000 RWF\n4. 2,000 RWF\n5. 5,000 RWF\n6. 10,000 RWF");
}
function handleCheckLoan(_x10, _x11, _x12) {
  return _handleCheckLoan.apply(this, arguments);
}
function _handleCheckLoan() {
  _handleCheckLoan = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(session, user, phone) {
    var loanResult, loan, dueDate, _t6;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          if (user) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", "END Ntimwanditse. Not registered.");
        case 1:
          _context5.prev = 1;
          _context5.next = 2;
          return db.query("\n      SELECT l.*, lp.name as product_name, lp.loan_type\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      WHERE l.borrower_id = $1 AND l.status IN ('active', 'disbursed', 'pending')\n      ORDER BY l.created_at DESC LIMIT 1\n    ", [user.customer_id]);
        case 2:
          loanResult = _context5.sent;
          if (!(loanResult.rows.length === 0)) {
            _context5.next = 3;
            break;
          }
          return _context5.abrupt("return", "END Nta nguzanyo ufite.\nYou have no active loans.\nSaba kuri bigcompany.rw\nApply at bigcompany.rw");
        case 3:
          loan = loanResult.rows[0];
          dueDate = new Date(loan.due_date).toLocaleDateString('rw-RW');
          return _context5.abrupt("return", "END Inguzanyo yawe / Your Loan:\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n#".concat(loan.loan_number, "\nUbwoko: ").concat(loan.product_name, "\nType: ").concat(loan.loan_type, "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nPrincipal: ").concat(Number(loan.principal).toLocaleString(), " RWF\nHasigaye: ").concat(Number(loan.outstanding_balance).toLocaleString(), " RWF\nOutstanding: ").concat(Number(loan.outstanding_balance).toLocaleString(), " RWF\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nIgihe: ").concat(dueDate, "\nDue: ").concat(dueDate, "\nStatus: ").concat(loan.status.toUpperCase()));
        case 4:
          _context5.prev = 4;
          _t6 = _context5["catch"](1);
          console.error('Loan check error:', _t6);
          return _context5.abrupt("return", "END Habyanze. Failed to check loan.");
        case 5:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[1, 4]]);
  }));
  return _handleCheckLoan.apply(this, arguments);
}
function handlePayLoanMenu(_x13, _x14, _x15) {
  return _handlePayLoanMenu.apply(this, arguments);
}
function _handlePayLoanMenu() {
  _handlePayLoanMenu = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(session, user, phone) {
    var loanResult, loan, _t7;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          if (user) {
            _context6.next = 1;
            break;
          }
          return _context6.abrupt("return", "END Ntimwanditse. Not registered.");
        case 1:
          _context6.prev = 1;
          _context6.next = 2;
          return db.query("\n      SELECT * FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('active', 'disbursed')\n      ORDER BY created_at DESC LIMIT 1\n    ", [user.customer_id]);
        case 2:
          loanResult = _context6.sent;
          if (!(loanResult.rows.length === 0)) {
            _context6.next = 3;
            break;
          }
          return _context6.abrupt("return", "END Nta nguzanyo yo kwishyura.\nNo active loan to repay.");
        case 3:
          loan = loanResult.rows[0];
          session.data.loan_id = loan.id;
          session.data.outstanding = Number(loan.outstanding_balance);
          session.state = 'pay_loan_amount';
          return _context6.abrupt("return", "CON Kwishyura Inguzanyo\nPay Loan #".concat(loan.loan_number, "\nHasigaye: ").concat(Number(loan.outstanding_balance).toLocaleString(), " RWF\n\nHitamo amafaranga:\n1. 300 RWF\n2. 500 RWF\n3. 1,000 RWF\n4. 2,000 RWF\n5. 5,000 RWF\n6. 10,000 RWF"));
        case 4:
          _context6.prev = 4;
          _t7 = _context6["catch"](1);
          return _context6.abrupt("return", "END Habyanze. Error loading loan.");
        case 5:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[1, 4]]);
  }));
  return _handlePayLoanMenu.apply(this, arguments);
}
function handleNFCMenu(session, user, phone) {
  if (!user) {
    return "END Ntimwanditse. Not registered.";
  }
  session.state = 'nfc_menu';
  return "CON NFC Card / Ikarita\n1. Reba Balance (Check Balance)\n2. Hagarika Ikarita (Block Card)\n3. Fungura Ikarita (Unblock Card)";
}
function handleMyAccount(_x16, _x17, _x18) {
  return _handleMyAccount.apply(this, arguments);
}
function _handleMyAccount() {
  _handleMyAccount = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(session, user, phone) {
    var name;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          if (user) {
            _context7.next = 1;
            break;
          }
          return _context7.abrupt("return", "END Ntimwanditse kuri BIG Company.\nNot registered.\nIyandikishe: bigcompany.rw");
        case 1:
          name = user.first_name ? "".concat(user.first_name, " ").concat(user.last_name || '').trim() : 'Customer';
          return _context7.abrupt("return", "END Konti Yawe / Your Account\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nIzina: ".concat(name, "\nName: ").concat(name, "\nPhone: ").concat(phone, "\nEmail: ").concat(user.email || 'Not set', "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nGenzura kuri bigcompany.rw\nManage at bigcompany.rw"));
        case 2:
        case "end":
          return _context7.stop();
      }
    }, _callee7);
  }));
  return _handleMyAccount.apply(this, arguments);
}
function handleBlockCard(_x19, _x20) {
  return _handleBlockCard.apply(this, arguments);
}
function _handleBlockCard() {
  _handleBlockCard = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(session, user) {
    var result, _t8;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          _context8.prev = 0;
          _context8.next = 1;
          return db.query("\n      UPDATE bigcompany.nfc_cards SET is_active = false\n      WHERE user_id = $1 AND is_active = true\n      RETURNING dashboard_id\n    ", [user.customer_id]);
        case 1:
          result = _context8.sent;
          if (!(result.rows.length === 0)) {
            _context8.next = 2;
            break;
          }
          return _context8.abrupt("return", "END Nta karita iboneka.\nNo active card found.");
        case 2:
          return _context8.abrupt("return", "END Ikarita yawe yahagaritswe.\nYour card ".concat(result.rows[0].dashboard_id, " has been blocked.\nFungura kuri bigcompany.rw cyangwa *939#"));
        case 3:
          _context8.prev = 3;
          _t8 = _context8["catch"](0);
          return _context8.abrupt("return", "END Habyanze. Failed to block card.");
        case 4:
        case "end":
          return _context8.stop();
      }
    }, _callee8, null, [[0, 3]]);
  }));
  return _handleBlockCard.apply(this, arguments);
}
function handleUnblockCard(_x21, _x22) {
  return _handleUnblockCard.apply(this, arguments);
} // ==================== PAYMENT PROCESSORS ====================
function _handleUnblockCard() {
  _handleUnblockCard = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(session, user) {
    var result, _t9;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          _context9.next = 1;
          return db.query("\n      UPDATE bigcompany.nfc_cards SET is_active = true\n      WHERE user_id = $1 AND is_active = false\n      RETURNING dashboard_id\n    ", [user.customer_id]);
        case 1:
          result = _context9.sent;
          if (!(result.rows.length === 0)) {
            _context9.next = 2;
            break;
          }
          return _context9.abrupt("return", "END Nta karita yahagaritswe.\nNo blocked card found.");
        case 2:
          return _context9.abrupt("return", "END Ikarita yawe yafunguwe.\nYour card ".concat(result.rows[0].dashboard_id, " has been unblocked."));
        case 3:
          _context9.prev = 3;
          _t9 = _context9["catch"](0);
          return _context9.abrupt("return", "END Habyanze. Failed to unblock card.");
        case 4:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[0, 3]]);
  }));
  return _handleUnblockCard.apply(this, arguments);
}
function processTopUp(_x23, _x24, _x25) {
  return _processTopUp.apply(this, arguments);
}
function _processTopUp() {
  _processTopUp = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(session, user, phone) {
    var amount, reference, paymentResult, _t0;
    return _regenerator["default"].wrap(function (_context0) {
      while (1) switch (_context0.prev = _context0.next) {
        case 0:
          amount = session.data.topup_amount;
          reference = "USSD-TOP-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 6));
          _context0.prev = 1;
          if (!isMTNNumber(phone)) {
            _context0.next = 3;
            break;
          }
          _context0.next = 2;
          return momoService.requestPayment({
            amount: amount,
            currency: 'RWF',
            externalId: reference,
            payerPhone: phone,
            payerMessage: "BIG Wallet Top-up ".concat(amount, " RWF")
          });
        case 2:
          paymentResult = _context0.sent;
          _context0.next = 6;
          break;
        case 3:
          if (!isAirtelNumber(phone)) {
            _context0.next = 5;
            break;
          }
          _context0.next = 4;
          return airtelService.requestPayment({
            amount: amount,
            phone: phone,
            reference: reference
          });
        case 4:
          paymentResult = _context0.sent;
          _context0.next = 6;
          break;
        case 5:
          return _context0.abrupt("return", "END Nimero ya telefoni ntiyemerewe.\nPhone number not supported for mobile money.");
        case 6:
          if (!paymentResult.success) {
            _context0.next = 8;
            break;
          }
          _context0.next = 7;
          return db.query("\n        INSERT INTO bigcompany.wallet_topups\n        (user_id, amount, currency, status, provider, provider_reference, phone)\n        VALUES ($1, $2, 'RWF', 'pending', $3, $4, $5)\n      ", [user === null || user === void 0 ? void 0 : user.customer_id, amount, isMTNNumber(phone) ? 'mtn_momo' : 'airtel_money', reference, phone]);
        case 7:
          return _context0.abrupt("return", "END Kwemeza kwishyura koherejwe kuri telefoni yawe.\nPayment request sent to your phone.\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nAmafaranga: ".concat(amount.toLocaleString(), " RWF\nAmount: ").concat(amount.toLocaleString(), " RWF\nRef: ").concat(reference.substring(0, 15), "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nEmeza kuri telefoni yawe.\nApprove on your phone."));
        case 8:
          return _context0.abrupt("return", "END Kwishyura byanze.\nPayment request failed.\nOngera ugerageze.\nPlease try again.");
        case 9:
          _context0.next = 11;
          break;
        case 10:
          _context0.prev = 10;
          _t0 = _context0["catch"](1);
          console.error('Top-up error:', _t0);
          return _context0.abrupt("return", "END Habyanze. Payment failed. Try again.");
        case 11:
        case "end":
          return _context0.stop();
      }
    }, _callee0, null, [[1, 10]]);
  }));
  return _processTopUp.apply(this, arguments);
}
function processGasPurchase(_x26, _x27, _x28) {
  return _processGasPurchase.apply(this, arguments);
}
function _processGasPurchase() {
  _processGasPurchase = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(session, user, phone) {
    var _session$data, meter_number, gas_amount, payment_method, reference, _loanResult$rows$2, balance, loanResult, foodCredit, totalAvailable, result, paymentResult, _t1;
    return _regenerator["default"].wrap(function (_context1) {
      while (1) switch (_context1.prev = _context1.next) {
        case 0:
          _session$data = session.data, meter_number = _session$data.meter_number, gas_amount = _session$data.gas_amount, payment_method = _session$data.payment_method;
          reference = "USSD-GAS-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 6));
          _context1.prev = 1;
          if (!(payment_method === 'wallet')) {
            _context1.next = 10;
            break;
          }
          if (user) {
            _context1.next = 2;
            break;
          }
          return _context1.abrupt("return", "END Ntimwanditse. Not registered.");
        case 2:
          _context1.next = 3;
          return blnkService.getCustomerBalance(user.customer_id, 'customer_wallets');
        case 3:
          balance = _context1.sent;
          _context1.next = 4;
          return db.query("\n        SELECT SUM(outstanding_balance) as credit FROM bigcompany.loans\n        WHERE borrower_id = $1 AND status IN ('active', 'disbursed')\n        AND loan_product_id IN (SELECT id FROM bigcompany.loan_products WHERE loan_type = 'food')\n      ", [user.customer_id]);
        case 4:
          loanResult = _context1.sent;
          foodCredit = Number(((_loanResult$rows$2 = loanResult.rows[0]) === null || _loanResult$rows$2 === void 0 ? void 0 : _loanResult$rows$2.credit) || 0);
          totalAvailable = balance + foodCredit;
          if (!(totalAvailable < gas_amount)) {
            _context1.next = 5;
            break;
          }
          return _context1.abrupt("return", "END Amafaranga ntahagije.\nInsufficient balance.\nUfite: ".concat(totalAvailable.toLocaleString(), " RWF\nAvailable: ").concat(totalAvailable.toLocaleString(), " RWF\nUkeneye: ").concat(gas_amount.toLocaleString(), " RWF\nRequired: ").concat(gas_amount.toLocaleString(), " RWF"));
        case 5:
          _context1.next = 6;
          return gasService.purchaseUnits({
            meterNumber: meter_number,
            amount: gas_amount,
            customerId: user.customer_id,
            phone: phone
          });
        case 6:
          result = _context1.sent;
          if (!result.success) {
            _context1.next = 8;
            break;
          }
          _context1.next = 7;
          return smsService.send({
            to: phone,
            message: "BIG Gas: Meter ".concat(meter_number, "\nToken: ").concat(result.token, "\nUnits: ").concat(result.units, "\nRef: ").concat(result.transactionId)
          });
        case 7:
          return _context1.abrupt("return", "END Gura gaz byagenze neza!\nGas purchase successful!\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nMeter: ".concat(meter_number, "\nUnits: ").concat(result.units, "\nToken: ").concat(result.token, "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nToken yoherejwe kuri SMS.\nToken sent via SMS."));
        case 8:
          return _context1.abrupt("return", "END Gura gaz byanze.\nGas purchase failed: ".concat(result.error));
        case 9:
          _context1.next = 17;
          break;
        case 10:
          if (!(payment_method === 'mtn_momo')) {
            _context1.next = 12;
            break;
          }
          _context1.next = 11;
          return momoService.requestPayment({
            amount: gas_amount,
            currency: 'RWF',
            externalId: reference,
            payerPhone: phone,
            payerMessage: "BIG Gas ".concat(meter_number, " - ").concat(gas_amount, " RWF")
          });
        case 11:
          paymentResult = _context1.sent;
          _context1.next = 14;
          break;
        case 12:
          _context1.next = 13;
          return airtelService.requestPayment({
            amount: gas_amount,
            phone: phone,
            reference: reference
          });
        case 13:
          paymentResult = _context1.sent;
        case 14:
          if (!paymentResult.success) {
            _context1.next = 16;
            break;
          }
          _context1.next = 15;
          return db.query("\n          INSERT INTO bigcompany.utility_topups\n          (user_id, amount, currency, status, provider_reference, metadata)\n          VALUES ($1, $2, 'RWF', 'pending', $3, $4)\n        ", [user === null || user === void 0 ? void 0 : user.customer_id, gas_amount, reference, JSON.stringify({
            meter_number: meter_number,
            phone: phone,
            payment_method: payment_method,
            source: 'ussd'
          })]);
        case 15:
          return _context1.abrupt("return", "END Kwishyura gaz koherejwe.\nGas payment request sent.\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nMeter: ".concat(meter_number, "\nAmafaranga: ").concat(gas_amount.toLocaleString(), " RWF\nRef: ").concat(reference.substring(0, 15), "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nEmeza kuri telefoni.\nApprove on your phone.\nToken izohererezwa kuri SMS.\nToken will be sent via SMS."));
        case 16:
          return _context1.abrupt("return", "END Kwishyura byanze.\nPayment request failed.");
        case 17:
          _context1.next = 19;
          break;
        case 18:
          _context1.prev = 18;
          _t1 = _context1["catch"](1);
          console.error('Gas purchase error:', _t1);
          return _context1.abrupt("return", "END Habyanze. Gas purchase failed.");
        case 19:
        case "end":
          return _context1.stop();
      }
    }, _callee1, null, [[1, 18]]);
  }));
  return _processGasPurchase.apply(this, arguments);
}
function processLoanRepayment(_x29, _x30, _x31) {
  return _processLoanRepayment.apply(this, arguments);
} // ==================== HELPER FUNCTIONS ====================
function _processLoanRepayment() {
  _processLoanRepayment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(session, user, phone) {
    var _session$data2, loan_id, repay_amount, reference, paymentResult, _t10;
    return _regenerator["default"].wrap(function (_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          _session$data2 = session.data, loan_id = _session$data2.loan_id, repay_amount = _session$data2.repay_amount;
          reference = "USSD-LOAN-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 6));
          _context10.prev = 1;
          if (!isMTNNumber(phone)) {
            _context10.next = 3;
            break;
          }
          _context10.next = 2;
          return momoService.requestPayment({
            amount: repay_amount,
            currency: 'RWF',
            externalId: reference,
            payerPhone: phone,
            payerMessage: "BIG Loan Repayment ".concat(repay_amount, " RWF")
          });
        case 2:
          paymentResult = _context10.sent;
          _context10.next = 5;
          break;
        case 3:
          _context10.next = 4;
          return airtelService.requestPayment({
            amount: repay_amount,
            phone: phone,
            reference: reference
          });
        case 4:
          paymentResult = _context10.sent;
        case 5:
          if (!paymentResult.success) {
            _context10.next = 7;
            break;
          }
          _context10.next = 6;
          return db.query("\n        INSERT INTO bigcompany.loan_repayments\n        (loan_id, amount, payment_method, status, reference)\n        VALUES ($1, $2, $3, 'pending', $4)\n      ", [loan_id, repay_amount, isMTNNumber(phone) ? 'mtn_momo' : 'airtel_money', reference]);
        case 6:
          return _context10.abrupt("return", "END Kwishyura inguzanyo koherejwe.\nLoan payment request sent.\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nAmafaranga: ".concat(repay_amount.toLocaleString(), " RWF\nRef: ").concat(reference.substring(0, 15), "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nEmeza kuri telefoni yawe.\nApprove on your phone."));
        case 7:
          return _context10.abrupt("return", "END Kwishyura byanze.\nPayment failed. Try again.");
        case 8:
          _context10.next = 10;
          break;
        case 9:
          _context10.prev = 9;
          _t10 = _context10["catch"](1);
          console.error('Loan repayment error:', _t10);
          return _context10.abrupt("return", "END Habyanze. Repayment failed.");
        case 10:
        case "end":
          return _context10.stop();
      }
    }, _callee10, null, [[1, 9]]);
  }));
  return _processLoanRepayment.apply(this, arguments);
}
function logSession(_x32, _x33, _x34, _x35, _x36) {
  return _logSession.apply(this, arguments);
}
/**
 * Africa's Talking Delivery Report Webhook
 * POST /ussd/delivery
 */
function _logSession() {
  _logSession = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(sessionId, phone, serviceCode, state, input) {
    var _t11;
    return _regenerator["default"].wrap(function (_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          _context11.prev = 0;
          _context11.next = 1;
          return db.query("\n      INSERT INTO bigcompany.ussd_sessions\n      (session_id, phone_number, service_code, current_state, last_input)\n      VALUES ($1, $2, $3, $4, $5)\n      ON CONFLICT (session_id) DO UPDATE SET\n        current_state = $4, last_input = $5, updated_at = NOW()\n    ", [sessionId, phone, serviceCode, state, input]);
        case 1:
          _context11.next = 3;
          break;
        case 2:
          _context11.prev = 2;
          _t11 = _context11["catch"](0);
          console.error('Session log error:', _t11);
        case 3:
        case "end":
          return _context11.stop();
      }
    }, _callee11, null, [[0, 2]]);
  }));
  return _logSession.apply(this, arguments);
}
router.post('/delivery', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _req$body, id, status, phoneNumber, networkCode;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _req$body = req.body, id = _req$body.id, status = _req$body.status, phoneNumber = _req$body.phoneNumber, networkCode = _req$body.networkCode;
          console.log('USSD Delivery Report:', {
            id: id,
            status: status,
            phoneNumber: phoneNumber,
            networkCode: networkCode
          });

          // Log delivery report
          _context2.next = 1;
          return db.query("\n    INSERT INTO bigcompany.ussd_delivery_reports\n    (session_id, status, phone_number, network_code)\n    VALUES ($1, $2, $3, $4)\n    ON CONFLICT DO NOTHING\n  ", [id, status, phoneNumber, networkCode]);
        case 1:
          res.status(200).send('OK');
        case 2:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return function (_x37, _x38) {
    return _ref3.apply(this, arguments);
  };
}()));
var _default = exports["default"] = router;