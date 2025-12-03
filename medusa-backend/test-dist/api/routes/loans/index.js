"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _medusa = require("@medusajs/medusa");
var _pg = require("pg");
var _blnk = _interopRequireDefault(require("../../../services/blnk"));
var _sms = _interopRequireDefault(require("../../../services/sms"));
var _momo = _interopRequireDefault(require("../../../services/momo"));
var _airtel = _interopRequireDefault(require("../../../services/airtel"));
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
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

// Phone helpers
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

// Generate loan number
function generateLoanNumber() {
  var prefix = 'LN';
  var timestamp = Date.now().toString(36).toUpperCase();
  var random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return "".concat(prefix, "-").concat(timestamp, "-").concat(random);
}

// ==================== LOAN PRODUCTS ====================

/**
 * Get available loan products
 * GET /store/loans/products
 */
router.get('/products', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var products, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 1;
          return db.query("\n      SELECT id, name, description, loan_type, min_amount, max_amount,\n             interest_rate, term_days, requirements, is_active\n      FROM bigcompany.loan_products\n      WHERE is_active = true\n      ORDER BY loan_type, min_amount ASC\n    ");
        case 1:
          products = _context.sent;
          res.json({
            products: products.rows
          });
          _context.next = 3;
          break;
        case 2:
          _context.prev = 2;
          _t = _context["catch"](0);
          console.error('Get loan products error:', _t);
          res.status(500).json({
            error: 'Failed to get loan products'
          });
        case 3:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[0, 2]]);
  }));
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}()));

/**
 * Get loan product details
 * GET /store/loans/products/:id
 */
router.get('/products/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var productId, product, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          productId = req.params.id;
          _context2.prev = 1;
          _context2.next = 2;
          return db.query("\n      SELECT * FROM bigcompany.loan_products WHERE id = $1\n    ", [productId]);
        case 2:
          product = _context2.sent;
          if (!(product.rows.length === 0)) {
            _context2.next = 3;
            break;
          }
          return _context2.abrupt("return", res.status(404).json({
            error: 'Loan product not found'
          }));
        case 3:
          res.json({
            product: product.rows[0]
          });
          _context2.next = 5;
          break;
        case 4:
          _context2.prev = 4;
          _t2 = _context2["catch"](1);
          res.status(500).json({
            error: 'Failed to get product details'
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

// ==================== LOAN ELIGIBILITY & SCORING ====================

/**
 * Check loan eligibility
 * GET /store/loans/eligibility
 *
 * Uses credit scoring based on:
 * - Purchase history
 * - Wallet activity
 * - Gas purchase frequency
 * - Previous loan repayment
 */
router.get('/eligibility', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$user;
    var customerId, _accountAge$rows$, _walletActivity$rows$, _gasActivity$rows$, _loanHistory$rows$, _loanHistory$rows$2, _loanHistory$rows$3, _nfcUsage$rows$, customer, customerData, creditScore, scoreBreakdown, accountAge, ageDays, ageScore, walletActivity, txCount, activityScore, gasActivity, gasCount, gasScore, loanHistory, paidLoans, defaultedLoans, overdueLoans, repaymentScore, nfcUsage, nfcScore, activeLoans, hasActiveLoan, eligibleProducts, maxEligibleAmount, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          initServices(req.scope);
          customerId = (_req$user = req.user) === null || _req$user === void 0 ? void 0 : _req$user.customer_id;
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
          return db.query("\n      SELECT c.*, c.metadata FROM customer c WHERE c.id = $1\n    ", [customerId]);
        case 2:
          customer = _context3.sent;
          if (!(customer.rows.length === 0)) {
            _context3.next = 3;
            break;
          }
          return _context3.abrupt("return", res.status(404).json({
            error: 'Customer not found'
          }));
        case 3:
          customerData = customer.rows[0]; // Calculate credit score (0-100)
          creditScore = 50; // Base score
          scoreBreakdown = {}; // 1. Account age (up to 10 points)
          _context3.next = 4;
          return db.query("\n      SELECT EXTRACT(DAY FROM NOW() - created_at) as days FROM customer WHERE id = $1\n    ", [customerId]);
        case 4:
          accountAge = _context3.sent;
          ageDays = Number(((_accountAge$rows$ = accountAge.rows[0]) === null || _accountAge$rows$ === void 0 ? void 0 : _accountAge$rows$.days) || 0);
          ageScore = Math.min(ageDays / 30, 10); // 1 point per month, max 10
          creditScore += ageScore;
          scoreBreakdown.account_age = ageScore;

          // 2. Wallet activity (up to 15 points)
          _context3.next = 5;
          return db.query("\n      SELECT COUNT(*) as tx_count, COALESCE(SUM(amount), 0) as total_volume\n      FROM bigcompany.wallet_topups\n      WHERE user_id = $1 AND status = 'success' AND created_at > NOW() - INTERVAL '90 days'\n    ", [customerId]);
        case 5:
          walletActivity = _context3.sent;
          txCount = Number(((_walletActivity$rows$ = walletActivity.rows[0]) === null || _walletActivity$rows$ === void 0 ? void 0 : _walletActivity$rows$.tx_count) || 0);
          activityScore = Math.min(txCount * 2, 15);
          creditScore += activityScore;
          scoreBreakdown.wallet_activity = activityScore;

          // 3. Gas purchase frequency (up to 15 points)
          _context3.next = 6;
          return db.query("\n      SELECT COUNT(*) as gas_count, COALESCE(SUM(amount), 0) as gas_total\n      FROM bigcompany.utility_topups\n      WHERE user_id = $1 AND status = 'success' AND created_at > NOW() - INTERVAL '90 days'\n    ", [customerId]);
        case 6:
          gasActivity = _context3.sent;
          gasCount = Number(((_gasActivity$rows$ = gasActivity.rows[0]) === null || _gasActivity$rows$ === void 0 ? void 0 : _gasActivity$rows$.gas_count) || 0);
          gasScore = Math.min(gasCount * 3, 15);
          creditScore += gasScore;
          scoreBreakdown.gas_purchases = gasScore;

          // 4. Previous loan repayment history (up to 20 points, can be negative)
          _context3.next = 7;
          return db.query("\n      SELECT\n        COUNT(*) FILTER (WHERE status = 'paid') as paid_loans,\n        COUNT(*) FILTER (WHERE status = 'defaulted') as defaulted_loans,\n        COUNT(*) FILTER (WHERE status IN ('active', 'disbursed') AND due_date < NOW()) as overdue_loans\n      FROM bigcompany.loans WHERE borrower_id = $1\n    ", [customerId]);
        case 7:
          loanHistory = _context3.sent;
          paidLoans = Number(((_loanHistory$rows$ = loanHistory.rows[0]) === null || _loanHistory$rows$ === void 0 ? void 0 : _loanHistory$rows$.paid_loans) || 0);
          defaultedLoans = Number(((_loanHistory$rows$2 = loanHistory.rows[0]) === null || _loanHistory$rows$2 === void 0 ? void 0 : _loanHistory$rows$2.defaulted_loans) || 0);
          overdueLoans = Number(((_loanHistory$rows$3 = loanHistory.rows[0]) === null || _loanHistory$rows$3 === void 0 ? void 0 : _loanHistory$rows$3.overdue_loans) || 0);
          repaymentScore = paidLoans * 5; // +5 per paid loan
          repaymentScore -= defaultedLoans * 15; // -15 per default
          repaymentScore -= overdueLoans * 10; // -10 per overdue
          repaymentScore = Math.max(-10, Math.min(repaymentScore, 20)); // Clamp to -10 to +20
          creditScore += repaymentScore;
          scoreBreakdown.repayment_history = repaymentScore;

          // 5. NFC card usage (up to 10 points)
          _context3.next = 8;
          return db.query("\n      SELECT COUNT(*) as nfc_tx FROM bigcompany.nfc_transactions\n      WHERE user_id = $1 AND status = 'success' AND created_at > NOW() - INTERVAL '90 days'\n    ", [customerId]);
        case 8:
          nfcUsage = _context3.sent;
          nfcScore = Math.min(Number(((_nfcUsage$rows$ = nfcUsage.rows[0]) === null || _nfcUsage$rows$ === void 0 ? void 0 : _nfcUsage$rows$.nfc_tx) || 0), 10);
          creditScore += nfcScore;
          scoreBreakdown.nfc_usage = nfcScore;

          // Ensure score is within bounds
          creditScore = Math.max(0, Math.min(creditScore, 100));

          // Check for existing active loans
          _context3.next = 9;
          return db.query("\n      SELECT * FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('pending', 'approved', 'disbursed', 'active')\n    ", [customerId]);
        case 9:
          activeLoans = _context3.sent;
          hasActiveLoan = activeLoans.rows.length > 0; // Get eligible products based on score
          _context3.next = 10;
          return db.query("\n      SELECT * FROM bigcompany.loan_products\n      WHERE is_active = true\n      AND min_credit_score <= $1\n      ORDER BY max_amount DESC\n    ", [creditScore]);
        case 10:
          eligibleProducts = _context3.sent;
          // Calculate max eligible amount based on score
          maxEligibleAmount = 0;
          if (creditScore >= 80) {
            maxEligibleAmount = 50000; // Premium tier
          } else if (creditScore >= 60) {
            maxEligibleAmount = 20000; // Standard tier
          } else if (creditScore >= 40) {
            maxEligibleAmount = 10000; // Basic tier
          } else if (creditScore >= 20) {
            maxEligibleAmount = 5000; // Starter tier
          }
          res.json({
            eligible: creditScore >= 20 && !hasActiveLoan,
            credit_score: Math.round(creditScore),
            score_breakdown: scoreBreakdown,
            max_eligible_amount: maxEligibleAmount,
            has_active_loan: hasActiveLoan,
            active_loan: hasActiveLoan ? activeLoans.rows[0] : null,
            eligible_products: eligibleProducts.rows,
            message: hasActiveLoan ? 'You have an active loan. Please repay before applying for a new one.' : creditScore < 20 ? 'Build your credit score by using our services regularly.' : 'You are eligible for a loan!'
          });
          _context3.next = 12;
          break;
        case 11:
          _context3.prev = 11;
          _t3 = _context3["catch"](1);
          console.error('Eligibility check error:', _t3);
          res.status(500).json({
            error: 'Failed to check eligibility'
          });
        case 12:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[1, 11]]);
  }));
  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}()));

// ==================== CUSTOMER LOANS ====================

/**
 * Get customer's loans
 * GET /store/loans
 */
router.get('/', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$user2;
    var customerId, loans, activeLoans, totalOutstanding, _t4;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          customerId = (_req$user2 = req.user) === null || _req$user2 === void 0 ? void 0 : _req$user2.customer_id;
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
          return db.query("\n      SELECT l.*, lp.name as product_name, lp.loan_type, lp.description as product_description\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      WHERE l.borrower_id = $1\n      ORDER BY l.created_at DESC\n    ", [customerId]);
        case 2:
          loans = _context4.sent;
          // Calculate summary
          activeLoans = loans.rows.filter(function (l) {
            return ['active', 'disbursed'].includes(l.status);
          });
          totalOutstanding = activeLoans.reduce(function (sum, l) {
            return sum + Number(l.outstanding_balance);
          }, 0);
          res.json({
            loans: loans.rows,
            summary: {
              total_loans: loans.rows.length,
              active_loans: activeLoans.length,
              total_outstanding: totalOutstanding,
              currency: 'RWF'
            }
          });
          _context4.next = 4;
          break;
        case 3:
          _context4.prev = 3;
          _t4 = _context4["catch"](1);
          console.error('Get loans error:', _t4);
          res.status(500).json({
            error: 'Failed to get loans'
          });
        case 4:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[1, 3]]);
  }));
  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}()));

/**
 * Get loan details
 * GET /store/loans/:id
 */
router.get('/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$user3;
    var customerId, loanId, loan, repayments, loanData, totalRepaid, repaymentProgress, _t5;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          customerId = (_req$user3 = req.user) === null || _req$user3 === void 0 ? void 0 : _req$user3.customer_id;
          loanId = req.params.id;
          if (customerId) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context5.prev = 1;
          _context5.next = 2;
          return db.query("\n      SELECT l.*, lp.name as product_name, lp.loan_type, lp.description as product_description\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      WHERE l.id = $1 AND l.borrower_id = $2\n    ", [loanId, customerId]);
        case 2:
          loan = _context5.sent;
          if (!(loan.rows.length === 0)) {
            _context5.next = 3;
            break;
          }
          return _context5.abrupt("return", res.status(404).json({
            error: 'Loan not found'
          }));
        case 3:
          _context5.next = 4;
          return db.query("\n      SELECT * FROM bigcompany.loan_repayments\n      WHERE loan_id = $1\n      ORDER BY paid_at DESC\n    ", [loanId]);
        case 4:
          repayments = _context5.sent;
          // Calculate repayment progress
          loanData = loan.rows[0];
          totalRepaid = Number(loanData.total_repayment) - Number(loanData.outstanding_balance);
          repaymentProgress = totalRepaid / Number(loanData.total_repayment) * 100;
          res.json({
            loan: loanData,
            repayments: repayments.rows,
            progress: {
              total_repayment: Number(loanData.total_repayment),
              amount_repaid: totalRepaid,
              outstanding: Number(loanData.outstanding_balance),
              percentage: Math.round(repaymentProgress)
            }
          });
          _context5.next = 6;
          break;
        case 5:
          _context5.prev = 5;
          _t5 = _context5["catch"](1);
          res.status(500).json({
            error: 'Failed to get loan details'
          });
        case 6:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[1, 5]]);
  }));
  return function (_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}()));

/**
 * Apply for a loan
 * POST /store/loans/apply
 */
router.post('/apply', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var _req$user4;
    var customerId, _req$body, loan_product_id, amount, purpose, customer, product, productData, existingLoans, loanNumber, interestRate, totalRepayment, dueDate, isFoodLoan, initialStatus, result, newLoan, phone, message, _t6, _t7;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          initServices(req.scope);
          customerId = (_req$user4 = req.user) === null || _req$user4 === void 0 ? void 0 : _req$user4.customer_id;
          _req$body = req.body, loan_product_id = _req$body.loan_product_id, amount = _req$body.amount, purpose = _req$body.purpose;
          if (customerId) {
            _context6.next = 1;
            break;
          }
          return _context6.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          if (!(!loan_product_id || !amount)) {
            _context6.next = 2;
            break;
          }
          return _context6.abrupt("return", res.status(400).json({
            error: 'loan_product_id and amount are required'
          }));
        case 2:
          _context6.prev = 2;
          _context6.next = 3;
          return db.query("\n      SELECT * FROM customer WHERE id = $1\n    ", [customerId]);
        case 3:
          customer = _context6.sent;
          if (!(customer.rows.length === 0)) {
            _context6.next = 4;
            break;
          }
          return _context6.abrupt("return", res.status(404).json({
            error: 'Customer not found'
          }));
        case 4:
          _context6.next = 5;
          return db.query("\n      SELECT * FROM bigcompany.loan_products WHERE id = $1 AND is_active = true\n    ", [loan_product_id]);
        case 5:
          product = _context6.sent;
          if (!(product.rows.length === 0)) {
            _context6.next = 6;
            break;
          }
          return _context6.abrupt("return", res.status(404).json({
            error: 'Loan product not found'
          }));
        case 6:
          productData = product.rows[0]; // Validate amount
          if (!(amount < productData.min_amount || amount > productData.max_amount)) {
            _context6.next = 7;
            break;
          }
          return _context6.abrupt("return", res.status(400).json({
            error: 'Invalid loan amount',
            min_amount: productData.min_amount,
            max_amount: productData.max_amount
          }));
        case 7:
          _context6.next = 8;
          return db.query("\n      SELECT * FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('pending', 'approved', 'disbursed', 'active')\n    ", [customerId]);
        case 8:
          existingLoans = _context6.sent;
          if (!(existingLoans.rows.length > 0)) {
            _context6.next = 9;
            break;
          }
          return _context6.abrupt("return", res.status(400).json({
            error: 'You already have an active loan. Please repay it before applying for a new one.',
            existing_loan: {
              loan_number: existingLoans.rows[0].loan_number,
              outstanding_balance: existingLoans.rows[0].outstanding_balance,
              status: existingLoans.rows[0].status
            }
          }));
        case 9:
          // Generate loan number
          loanNumber = generateLoanNumber(); // Calculate total repayment (for food loans, interest is 0%)
          interestRate = Number(productData.interest_rate) || 0;
          totalRepayment = amount * (1 + interestRate); // Calculate due date
          dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (productData.term_days || 30));

          // For food loans, auto-approve and disburse
          isFoodLoan = productData.loan_type === 'food';
          initialStatus = isFoodLoan ? 'disbursed' : 'pending'; // Create loan
          _context6.next = 10;
          return db.query("\n      INSERT INTO bigcompany.loans (\n        loan_number, borrower_id, loan_product_id, principal,\n        interest_rate, total_repayment, outstanding_balance,\n        currency, status, due_date, purpose, disbursed_at\n      )\n      VALUES ($1, $2, $3, $4, $5, $6, $7, 'RWF', $8, $9, $10, $11)\n      RETURNING *\n    ", [loanNumber, customerId, loan_product_id, amount, interestRate, totalRepayment, totalRepayment, initialStatus, dueDate.toISOString().split('T')[0], purpose || null, isFoodLoan ? new Date() : null]);
        case 10:
          result = _context6.sent;
          newLoan = result.rows[0]; // For food loans, create credit in Blnk ledger
          if (!isFoodLoan) {
            _context6.next = 14;
            break;
          }
          _context6.prev = 11;
          _context6.next = 12;
          return blnkService.createLoanCredit(customerId, amount, loanNumber);
        case 12:
          _context6.next = 14;
          break;
        case 13:
          _context6.prev = 13;
          _t6 = _context6["catch"](11);
          console.error('Blnk loan credit error:', _t6);
          // Continue - loan is still valid
        case 14:
          // Send SMS notification
          phone = customer.rows[0].phone;
          if (!phone) {
            _context6.next = 15;
            break;
          }
          message = isFoodLoan ? "BIG Food Loan approved!\nAmount: ".concat(amount.toLocaleString(), " RWF\nDue: ").concat(dueDate.toLocaleDateString(), "\nUse for food purchases at any BIG retailer.\nRef: ").concat(loanNumber) : "BIG Loan application received!\nAmount: ".concat(amount.toLocaleString(), " RWF\nStatus: Under review\nWe'll notify you once approved.\nRef: ").concat(loanNumber);
          _context6.next = 15;
          return smsService.send({
            to: phone,
            message: message
          });
        case 15:
          res.json({
            success: true,
            message: isFoodLoan ? 'Food loan approved and credited to your account!' : 'Loan application submitted. We will review and notify you.',
            loan: _objectSpread(_objectSpread({}, newLoan), {}, {
              product_name: productData.name,
              loan_type: productData.loan_type
            })
          });
          _context6.next = 17;
          break;
        case 16:
          _context6.prev = 16;
          _t7 = _context6["catch"](2);
          console.error('Loan apply error:', _t7);
          res.status(500).json({
            error: 'Failed to apply for loan'
          });
        case 17:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[2, 16], [11, 13]]);
  }));
  return function (_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}()));

/**
 * Make loan repayment
 * POST /store/loans/:id/repay
 */
router.post('/:id/repay', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var _req$user5;
    var customerId, loanId, _req$body2, amount, payment_method, _customer$rows$, customer, phone, loan, loanData, outstanding, repaymentRef, walletBalance, newOutstanding, fullyPaid, _paymentResult, paymentResult, _t8;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          initServices(req.scope);
          customerId = (_req$user5 = req.user) === null || _req$user5 === void 0 ? void 0 : _req$user5.customer_id;
          loanId = req.params.id;
          _req$body2 = req.body, amount = _req$body2.amount, payment_method = _req$body2.payment_method;
          if (customerId) {
            _context7.next = 1;
            break;
          }
          return _context7.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          if (!(!amount || amount <= 0)) {
            _context7.next = 2;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Valid amount is required'
          }));
        case 2:
          _context7.prev = 2;
          _context7.next = 3;
          return db.query("SELECT * FROM customer WHERE id = $1", [customerId]);
        case 3:
          customer = _context7.sent;
          phone = (_customer$rows$ = customer.rows[0]) === null || _customer$rows$ === void 0 ? void 0 : _customer$rows$.phone; // Get loan
          _context7.next = 4;
          return db.query("\n      SELECT l.*, lp.name as product_name, lp.loan_type\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      WHERE l.id = $1 AND l.borrower_id = $2 AND l.status IN ('disbursed', 'active')\n    ", [loanId, customerId]);
        case 4:
          loan = _context7.sent;
          if (!(loan.rows.length === 0)) {
            _context7.next = 5;
            break;
          }
          return _context7.abrupt("return", res.status(404).json({
            error: 'Active loan not found'
          }));
        case 5:
          loanData = loan.rows[0];
          outstanding = Number(loanData.outstanding_balance); // Validate amount
          if (!(amount > outstanding)) {
            _context7.next = 6;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Repayment amount exceeds outstanding balance',
            outstanding_balance: outstanding,
            max_repayment: outstanding
          }));
        case 6:
          repaymentRef = "REP-".concat(Date.now(), "-").concat(Math.random().toString(36).substring(2, 8)); // Payment method handling
          if (!(payment_method === 'wallet')) {
            _context7.next = 11;
            break;
          }
          _context7.next = 7;
          return blnkService.getCustomerBalance(customerId, 'customer_wallets');
        case 7:
          walletBalance = _context7.sent;
          if (!(walletBalance < amount)) {
            _context7.next = 8;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Insufficient wallet balance',
            balance: walletBalance,
            required: amount
          }));
        case 8:
          _context7.next = 9;
          return blnkService.deductFromWallet(customerId, amount, "Loan repayment: ".concat(loanData.loan_number));
        case 9:
          _context7.next = 10;
          return processRepayment(loanId, amount, 'wallet', repaymentRef, customerId, phone, loanData);
        case 10:
          newOutstanding = outstanding - amount;
          fullyPaid = newOutstanding <= 0;
          res.json({
            success: true,
            message: fullyPaid ? 'Loan fully repaid! Thank you!' : "Repayment of ".concat(amount.toLocaleString(), " RWF successful."),
            repayment: {
              amount: amount,
              reference: repaymentRef,
              payment_method: 'wallet'
            },
            new_outstanding: newOutstanding,
            loan_status: fullyPaid ? 'paid' : 'active'
          });
          _context7.next = 21;
          break;
        case 11:
          if (!(payment_method === 'mtn_momo' || payment_method === 'airtel_money')) {
            _context7.next = 20;
            break;
          }
          if (phone) {
            _context7.next = 12;
            break;
          }
          return _context7.abrupt("return", res.status(400).json({
            error: 'Phone number required for mobile money payment'
          }));
        case 12:
          if (!isMTNNumber(phone)) {
            _context7.next = 14;
            break;
          }
          _context7.next = 13;
          return momoService.requestPayment({
            amount: amount,
            currency: 'RWF',
            externalId: repaymentRef,
            payerPhone: phone,
            payerMessage: "BIG Loan Repayment - ".concat(loanData.loan_number)
          });
        case 13:
          paymentResult = _context7.sent;
          _context7.next = 16;
          break;
        case 14:
          _context7.next = 15;
          return airtelService.requestPayment({
            amount: amount,
            phone: phone,
            reference: repaymentRef
          });
        case 15:
          paymentResult = _context7.sent;
        case 16:
          if (!((_paymentResult = paymentResult) !== null && _paymentResult !== void 0 && _paymentResult.success)) {
            _context7.next = 18;
            break;
          }
          _context7.next = 17;
          return db.query("\n          INSERT INTO bigcompany.loan_repayments\n          (loan_id, amount, payment_method, status, reference, metadata)\n          VALUES ($1, $2, $3, 'pending', $4, $5)\n        ", [loanId, amount, payment_method, repaymentRef, JSON.stringify({
            momo_reference: paymentResult.referenceId || paymentResult.transactionId
          })]);
        case 17:
          res.json({
            success: true,
            pending: true,
            message: 'Payment request sent to your phone. Approve to complete repayment.',
            reference: repaymentRef,
            momo_reference: paymentResult.referenceId || paymentResult.transactionId
          });
          _context7.next = 19;
          break;
        case 18:
          res.status(400).json({
            error: 'Payment request failed. Please try again.'
          });
        case 19:
          _context7.next = 21;
          break;
        case 20:
          return _context7.abrupt("return", res.status(400).json({
            error: 'Invalid payment_method. Use: wallet, mtn_momo, or airtel_money'
          }));
        case 21:
          _context7.next = 23;
          break;
        case 22:
          _context7.prev = 22;
          _t8 = _context7["catch"](2);
          console.error('Loan repay error:', _t8);
          res.status(500).json({
            error: 'Repayment failed'
          });
        case 23:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[2, 22]]);
  }));
  return function (_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}()));

/**
 * Get active food loan credit (for spending)
 * GET /store/loans/food-credit
 */
router.get('/food-credit', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref8 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(req, res) {
    var _req$user6;
    var customerId, foodLoans, totalCredit, _t9;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          customerId = (_req$user6 = req.user) === null || _req$user6 === void 0 ? void 0 : _req$user6.customer_id;
          if (customerId) {
            _context8.next = 1;
            break;
          }
          return _context8.abrupt("return", res.status(401).json({
            error: 'Unauthorized'
          }));
        case 1:
          _context8.prev = 1;
          _context8.next = 2;
          return db.query("\n      SELECT l.*, lp.name as product_name\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      WHERE l.borrower_id = $1\n      AND l.status IN ('active', 'disbursed')\n      AND lp.loan_type = 'food'\n      ORDER BY l.created_at DESC\n    ", [customerId]);
        case 2:
          foodLoans = _context8.sent;
          totalCredit = foodLoans.rows.reduce(function (sum, loan) {
            return sum + Number(loan.outstanding_balance);
          }, 0);
          res.json({
            available_credit: totalCredit,
            currency: 'RWF',
            loans: foodLoans.rows,
            can_spend: totalCredit > 0,
            message: totalCredit > 0 ? "You have ".concat(totalCredit.toLocaleString(), " RWF food credit available.") : 'No food credit available. Apply for a food loan!'
          });
          _context8.next = 4;
          break;
        case 3:
          _context8.prev = 3;
          _t9 = _context8["catch"](1);
          res.status(500).json({
            error: 'Failed to get food credit'
          });
        case 4:
        case "end":
          return _context8.stop();
      }
    }, _callee8, null, [[1, 3]]);
  }));
  return function (_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
}()));

// ==================== HELPER FUNCTIONS ====================
function processRepayment(_x15, _x16, _x17, _x18, _x19, _x20, _x21) {
  return _processRepayment.apply(this, arguments);
} // ==================== ADMIN ENDPOINTS ====================
/**
 * Admin: Get all pending loans
 * GET /admin/loans/pending
 */
function _processRepayment() {
  _processRepayment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(loanId, amount, paymentMethod, reference, customerId, phone, loanData) {
    var outstanding, newOutstanding, fullyPaid, newStatus, message, _t11;
    return _regenerator["default"].wrap(function (_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          outstanding = Number(loanData.outstanding_balance);
          newOutstanding = Math.max(0, outstanding - amount);
          fullyPaid = newOutstanding <= 0;
          newStatus = fullyPaid ? 'paid' : 'active'; // Update loan
          _context10.next = 1;
          return db.query("\n    UPDATE bigcompany.loans\n    SET outstanding_balance = $1, status = $2, updated_at = NOW(),\n        paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE paid_at END\n    WHERE id = $3\n  ", [newOutstanding, newStatus, loanId]);
        case 1:
          _context10.next = 2;
          return db.query("\n    INSERT INTO bigcompany.loan_repayments (loan_id, amount, payment_method, status, reference, paid_at)\n    VALUES ($1, $2, $3, 'success', $4, NOW())\n  ", [loanId, amount, paymentMethod, reference]);
        case 2:
          if (!phone) {
            _context10.next = 3;
            break;
          }
          message = fullyPaid ? "BIG: Loan ".concat(loanData.loan_number, " fully repaid! Thank you for your payment of ").concat(amount.toLocaleString(), " RWF. Your credit score has improved!") : "BIG: Loan repayment of ".concat(amount.toLocaleString(), " RWF received. Remaining: ").concat(newOutstanding.toLocaleString(), " RWF. Ref: ").concat(reference.substring(0, 12));
          _context10.next = 3;
          return smsService.send({
            to: phone,
            message: message
          });
        case 3:
          if (!(fullyPaid && loanData.loan_type === 'food')) {
            _context10.next = 7;
            break;
          }
          _context10.prev = 4;
          _context10.next = 5;
          return blnkService.closeLoanCredit(customerId, loanData.loan_number);
        case 5:
          _context10.next = 7;
          break;
        case 6:
          _context10.prev = 6;
          _t11 = _context10["catch"](4);
          console.error('Error closing loan credit in Blnk:', _t11);
        case 7:
        case "end":
          return _context10.stop();
      }
    }, _callee10, null, [[4, 6]]);
  }));
  return _processRepayment.apply(this, arguments);
}
router.get('/admin/pending', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref9 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(req, res) {
    var loans, _t0;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          _context9.next = 1;
          return db.query("\n      SELECT l.*, lp.name as product_name, lp.loan_type,\n             c.email, c.phone, c.first_name, c.last_name\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      JOIN customer c ON l.borrower_id = c.id\n      WHERE l.status = 'pending'\n      ORDER BY l.created_at ASC\n    ");
        case 1:
          loans = _context9.sent;
          res.json({
            loans: loans.rows
          });
          _context9.next = 3;
          break;
        case 2:
          _context9.prev = 2;
          _t0 = _context9["catch"](0);
          res.status(500).json({
            error: 'Failed to get pending loans'
          });
        case 3:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[0, 2]]);
  }));
  return function (_x22, _x23) {
    return _ref9.apply(this, arguments);
  };
}()));

/**
 * Admin: Approve/Reject loan
 * POST /admin/loans/:id/review
 */
router.post('/admin/:id/review', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref0 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(req, res) {
    var loanId, _req$body3, action, rejection_reason, loan, loanData, _t1;
    return _regenerator["default"].wrap(function (_context0) {
      while (1) switch (_context0.prev = _context0.next) {
        case 0:
          initServices(req.scope);
          loanId = req.params.id;
          _req$body3 = req.body, action = _req$body3.action, rejection_reason = _req$body3.rejection_reason; // action: 'approve' or 'reject'
          if (['approve', 'reject'].includes(action)) {
            _context0.next = 1;
            break;
          }
          return _context0.abrupt("return", res.status(400).json({
            error: 'Invalid action. Use: approve or reject'
          }));
        case 1:
          _context0.prev = 1;
          _context0.next = 2;
          return db.query("\n      SELECT l.*, c.phone, c.email, c.first_name\n      FROM bigcompany.loans l\n      JOIN customer c ON l.borrower_id = c.id\n      WHERE l.id = $1 AND l.status = 'pending'\n    ", [loanId]);
        case 2:
          loan = _context0.sent;
          if (!(loan.rows.length === 0)) {
            _context0.next = 3;
            break;
          }
          return _context0.abrupt("return", res.status(404).json({
            error: 'Pending loan not found'
          }));
        case 3:
          loanData = loan.rows[0];
          if (!(action === 'approve')) {
            _context0.next = 7;
            break;
          }
          _context0.next = 4;
          return db.query("\n        UPDATE bigcompany.loans\n        SET status = 'disbursed', approved_at = NOW(), disbursed_at = NOW(), updated_at = NOW()\n        WHERE id = $1\n      ", [loanId]);
        case 4:
          _context0.next = 5;
          return blnkService.createLoanCredit(loanData.borrower_id, Number(loanData.principal), loanData.loan_number);
        case 5:
          if (!loanData.phone) {
            _context0.next = 6;
            break;
          }
          _context0.next = 6;
          return smsService.send({
            to: loanData.phone,
            message: "BIG: Good news! Your loan of ".concat(Number(loanData.principal).toLocaleString(), " RWF has been approved and credited. Due: ").concat(new Date(loanData.due_date).toLocaleDateString(), ". Ref: ").concat(loanData.loan_number)
          });
        case 6:
          res.json({
            success: true,
            message: 'Loan approved and disbursed',
            status: 'disbursed'
          });
          _context0.next = 10;
          break;
        case 7:
          _context0.next = 8;
          return db.query("\n        UPDATE bigcompany.loans\n        SET status = 'rejected', rejection_reason = $1, updated_at = NOW()\n        WHERE id = $2\n      ", [rejection_reason || 'Application did not meet requirements', loanId]);
        case 8:
          if (!loanData.phone) {
            _context0.next = 9;
            break;
          }
          _context0.next = 9;
          return smsService.send({
            to: loanData.phone,
            message: "BIG: Your loan application was not approved. Reason: ".concat(rejection_reason || 'Did not meet requirements', ". Build your credit score and try again!")
          });
        case 9:
          res.json({
            success: true,
            message: 'Loan rejected',
            status: 'rejected'
          });
        case 10:
          _context0.next = 12;
          break;
        case 11:
          _context0.prev = 11;
          _t1 = _context0["catch"](1);
          console.error('Loan review error:', _t1);
          res.status(500).json({
            error: 'Failed to review loan'
          });
        case 12:
        case "end":
          return _context0.stop();
      }
    }, _callee0, null, [[1, 11]]);
  }));
  return function (_x24, _x25) {
    return _ref0.apply(this, arguments);
  };
}()));

/**
 * Admin: Get overdue loans
 * GET /admin/loans/overdue
 */
router.get('/admin/overdue', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref1 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(req, res) {
    var loans, _t10;
    return _regenerator["default"].wrap(function (_context1) {
      while (1) switch (_context1.prev = _context1.next) {
        case 0:
          _context1.prev = 0;
          _context1.next = 1;
          return db.query("\n      SELECT l.*, lp.name as product_name, lp.loan_type,\n             c.email, c.phone, c.first_name, c.last_name,\n             EXTRACT(DAY FROM NOW() - l.due_date) as days_overdue\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      JOIN customer c ON l.borrower_id = c.id\n      WHERE l.status IN ('disbursed', 'active') AND l.due_date < NOW()\n      ORDER BY l.due_date ASC\n    ");
        case 1:
          loans = _context1.sent;
          res.json({
            loans: loans.rows,
            total_overdue: loans.rows.length,
            total_outstanding: loans.rows.reduce(function (sum, l) {
              return sum + Number(l.outstanding_balance);
            }, 0)
          });
          _context1.next = 3;
          break;
        case 2:
          _context1.prev = 2;
          _t10 = _context1["catch"](0);
          res.status(500).json({
            error: 'Failed to get overdue loans'
          });
        case 3:
        case "end":
          return _context1.stop();
      }
    }, _callee1, null, [[0, 2]]);
  }));
  return function (_x26, _x27) {
    return _ref1.apply(this, arguments);
  };
}()));
var _default = exports["default"] = router;