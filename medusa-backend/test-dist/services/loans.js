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
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var LoanService = /*#__PURE__*/function () {
  function LoanService(container) {
    (0, _classCallCheck2["default"])(this, LoanService);
    (0, _defineProperty2["default"])(this, "db", void 0);
    (0, _defineProperty2["default"])(this, "blnkService", void 0);
    (0, _defineProperty2["default"])(this, "smsService", void 0);
    this.db = new _pg.Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.blnkService = new _blnk["default"](container);
    this.smsService = new _sms["default"]();
  }

  /**
   * Generate unique loan number
   */
  return (0, _createClass2["default"])(LoanService, [{
    key: "generateLoanNumber",
    value: function generateLoanNumber() {
      var date = new Date();
      var year = date.getFullYear().toString().slice(-2);
      var month = (date.getMonth() + 1).toString().padStart(2, '0');
      var random = _crypto["default"].randomBytes(3).toString('hex').toUpperCase();
      return "LN".concat(year).concat(month).concat(random);
    }

    // ==================== LOAN PRODUCTS ====================

    /**
     * Get all loan products
     */
  }, {
    key: "getLoanProducts",
    value: function () {
      var _getLoanProducts = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var activeOnly,
          query,
          result,
          _args = arguments;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              activeOnly = _args.length > 0 && _args[0] !== undefined ? _args[0] : true;
              query = activeOnly ? 'SELECT * FROM bigcompany.loan_products WHERE is_active = true ORDER BY min_amount' : 'SELECT * FROM bigcompany.loan_products ORDER BY min_amount';
              _context.next = 1;
              return this.db.query(query);
            case 1:
              result = _context.sent;
              return _context.abrupt("return", result.rows.map(this.mapLoanProduct));
            case 2:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function getLoanProducts() {
        return _getLoanProducts.apply(this, arguments);
      }
      return getLoanProducts;
    }()
    /**
     * Get loan product by ID
     */
  }, {
    key: "getLoanProduct",
    value: (function () {
      var _getLoanProduct = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(productId) {
        var result;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 1;
              return this.db.query('SELECT * FROM bigcompany.loan_products WHERE id = $1', [productId]);
            case 1:
              result = _context2.sent;
              return _context2.abrupt("return", result.rows[0] ? this.mapLoanProduct(result.rows[0]) : null);
            case 2:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function getLoanProduct(_x) {
        return _getLoanProduct.apply(this, arguments);
      }
      return getLoanProduct;
    }()
    /**
     * Create loan product (admin)
     */
    )
  }, {
    key: "createLoanProduct",
    value: (function () {
      var _createLoanProduct = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(product) {
        var result;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 1;
              return this.db.query("\n      INSERT INTO bigcompany.loan_products\n      (name, description, min_amount, max_amount, interest_rate, term_days, loan_type, requirements, is_active)\n      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\n      RETURNING *\n    ", [product.name, product.description, product.minAmount, product.maxAmount, product.interestRate || 0, product.termDays || 30, product.loanType || 'food', JSON.stringify(product.requirements || {}), product.isActive !== false]);
            case 1:
              result = _context3.sent;
              return _context3.abrupt("return", this.mapLoanProduct(result.rows[0]));
            case 2:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function createLoanProduct(_x2) {
        return _createLoanProduct.apply(this, arguments);
      }
      return createLoanProduct;
    }()
    /**
     * Update loan product (admin)
     */
    )
  }, {
    key: "updateLoanProduct",
    value: (function () {
      var _updateLoanProduct = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(productId, updates) {
        var setClauses, values, paramIndex, result;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              setClauses = [];
              values = [];
              paramIndex = 1;
              if (updates.name !== undefined) {
                setClauses.push("name = $".concat(paramIndex++));
                values.push(updates.name);
              }
              if (updates.description !== undefined) {
                setClauses.push("description = $".concat(paramIndex++));
                values.push(updates.description);
              }
              if (updates.minAmount !== undefined) {
                setClauses.push("min_amount = $".concat(paramIndex++));
                values.push(updates.minAmount);
              }
              if (updates.maxAmount !== undefined) {
                setClauses.push("max_amount = $".concat(paramIndex++));
                values.push(updates.maxAmount);
              }
              if (updates.interestRate !== undefined) {
                setClauses.push("interest_rate = $".concat(paramIndex++));
                values.push(updates.interestRate);
              }
              if (updates.termDays !== undefined) {
                setClauses.push("term_days = $".concat(paramIndex++));
                values.push(updates.termDays);
              }
              if (updates.isActive !== undefined) {
                setClauses.push("is_active = $".concat(paramIndex++));
                values.push(updates.isActive);
              }
              if (!(setClauses.length === 0)) {
                _context4.next = 1;
                break;
              }
              return _context4.abrupt("return", this.getLoanProduct(productId));
            case 1:
              values.push(productId);
              _context4.next = 2;
              return this.db.query("\n      UPDATE bigcompany.loan_products\n      SET ".concat(setClauses.join(', '), "\n      WHERE id = $").concat(paramIndex, "\n      RETURNING *\n    "), values);
            case 2:
              result = _context4.sent;
              return _context4.abrupt("return", result.rows[0] ? this.mapLoanProduct(result.rows[0]) : null);
            case 3:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function updateLoanProduct(_x3, _x4) {
        return _updateLoanProduct.apply(this, arguments);
      }
      return updateLoanProduct;
    }() // ==================== LOAN APPLICATIONS ====================
    /**
     * Check customer eligibility for loan
     */
    )
  }, {
    key: "checkEligibility",
    value: function () {
      var _checkEligibility = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(borrowerId) {
        var existingLoans, repaymentHistory, maxAmount, onTimePayments, totalPayments, repaymentRate, customer, accountAge, minAgeDays;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 1;
              return this.db.query("\n      SELECT * FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('pending', 'approved', 'disbursed', 'active')\n    ", [borrowerId]);
            case 1:
              existingLoans = _context5.sent;
              if (!(existingLoans.rows.length > 0)) {
                _context5.next = 2;
                break;
              }
              return _context5.abrupt("return", {
                eligible: false,
                maxAmount: 0,
                reason: 'You have an existing active loan',
                existingLoans: existingLoans.rows.map(this.mapLoan)
              });
            case 2:
              _context5.next = 3;
              return this.db.query("\n      SELECT l.*,\n        CASE WHEN l.status = 'paid' AND l.due_date >= (\n          SELECT MAX(paid_at) FROM bigcompany.loan_repayments WHERE loan_id = l.id\n        ) THEN 'on_time' ELSE 'late' END as payment_status\n      FROM bigcompany.loans l\n      WHERE borrower_id = $1 AND status = 'paid'\n      ORDER BY created_at DESC\n      LIMIT 5\n    ", [borrowerId]);
            case 3:
              repaymentHistory = _context5.sent;
              // Calculate credit score based on history
              maxAmount = 5000; // Default max for new customers
              if (repaymentHistory.rows.length > 0) {
                onTimePayments = repaymentHistory.rows.filter(function (r) {
                  return r.payment_status === 'on_time';
                }).length;
                totalPayments = repaymentHistory.rows.length;
                repaymentRate = onTimePayments / totalPayments;
                if (repaymentRate >= 0.9) {
                  maxAmount = 10000; // Excellent history
                } else if (repaymentRate >= 0.7) {
                  maxAmount = 7000; // Good history
                } else if (repaymentRate >= 0.5) {
                  maxAmount = 5000; // Fair history
                } else {
                  maxAmount = 2000; // Poor history
                }
              }

              // Check account age (must be at least 7 days old)
              _context5.next = 4;
              return this.db.query('SELECT created_at FROM customer WHERE id = $1', [borrowerId]);
            case 4:
              customer = _context5.sent;
              if (!(customer.rows.length === 0)) {
                _context5.next = 5;
                break;
              }
              return _context5.abrupt("return", {
                eligible: false,
                maxAmount: 0,
                reason: 'Customer account not found'
              });
            case 5:
              accountAge = Date.now() - new Date(customer.rows[0].created_at).getTime();
              minAgeDays = 7;
              if (!(accountAge < minAgeDays * 24 * 60 * 60 * 1000)) {
                _context5.next = 6;
                break;
              }
              return _context5.abrupt("return", {
                eligible: false,
                maxAmount: 0,
                reason: "Account must be at least ".concat(minAgeDays, " days old")
              });
            case 6:
              return _context5.abrupt("return", {
                eligible: true,
                maxAmount: maxAmount
              });
            case 7:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function checkEligibility(_x5) {
        return _checkEligibility.apply(this, arguments);
      }
      return checkEligibility;
    }()
    /**
     * Apply for a loan
     */
  }, {
    key: "applyForLoan",
    value: (function () {
      var _applyForLoan = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(application) {
        var borrowerId, loanProductId, requestedAmount, purpose, metadata, eligibility, product, totalRepayment, dueDate, loanNumber, result;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              borrowerId = application.borrowerId, loanProductId = application.loanProductId, requestedAmount = application.requestedAmount, purpose = application.purpose, metadata = application.metadata; // Check eligibility
              _context6.next = 1;
              return this.checkEligibility(borrowerId);
            case 1:
              eligibility = _context6.sent;
              if (eligibility.eligible) {
                _context6.next = 2;
                break;
              }
              return _context6.abrupt("return", {
                success: false,
                error: eligibility.reason
              });
            case 2:
              _context6.next = 3;
              return this.getLoanProduct(loanProductId);
            case 3:
              product = _context6.sent;
              if (product) {
                _context6.next = 4;
                break;
              }
              return _context6.abrupt("return", {
                success: false,
                error: 'Loan product not found'
              });
            case 4:
              if (product.isActive) {
                _context6.next = 5;
                break;
              }
              return _context6.abrupt("return", {
                success: false,
                error: 'Loan product is not available'
              });
            case 5:
              if (!(requestedAmount < product.minAmount || requestedAmount > product.maxAmount)) {
                _context6.next = 6;
                break;
              }
              return _context6.abrupt("return", {
                success: false,
                error: "Amount must be between ".concat(product.minAmount, " and ").concat(product.maxAmount, " RWF")
              });
            case 6:
              if (!(requestedAmount > eligibility.maxAmount)) {
                _context6.next = 7;
                break;
              }
              return _context6.abrupt("return", {
                success: false,
                error: "Maximum eligible amount is ".concat(eligibility.maxAmount, " RWF")
              });
            case 7:
              // Calculate repayment
              totalRepayment = requestedAmount * (1 + product.interestRate);
              dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + product.termDays);

              // Create loan
              loanNumber = this.generateLoanNumber();
              _context6.next = 8;
              return this.db.query("\n      INSERT INTO bigcompany.loans\n      (loan_number, borrower_id, loan_product_id, principal, interest_rate, total_repayment,\n       outstanding_balance, currency, status, due_date, metadata)\n      VALUES ($1, $2, $3, $4, $5, $6, $7, 'RWF', 'pending', $8, $9)\n      RETURNING *\n    ", [loanNumber, borrowerId, loanProductId, requestedAmount, product.interestRate, totalRepayment, totalRepayment, dueDate, JSON.stringify(_objectSpread({
                purpose: purpose
              }, metadata))]);
            case 8:
              result = _context6.sent;
              _context6.next = 9;
              return this.logAudit(borrowerId, 'loan_application', 'loan', result.rows[0].id, {
                amount: requestedAmount,
                product: product.name
              });
            case 9:
              return _context6.abrupt("return", {
                success: true,
                loan: this.mapLoan(result.rows[0])
              });
            case 10:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function applyForLoan(_x6) {
        return _applyForLoan.apply(this, arguments);
      }
      return applyForLoan;
    }()
    /**
     * Process loan approval/rejection (admin)
     */
    )
  }, {
    key: "processLoanDecision",
    value: (function () {
      var _processLoanDecision = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(decision) {
        var loanId, adminId, approvedAmount, approvalDecision, reason, loan, _result, finalAmount, product, totalRepayment, result;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              loanId = decision.loanId, adminId = decision.adminId, approvedAmount = decision.approvedAmount, approvalDecision = decision.decision, reason = decision.reason; // Get loan
              _context7.next = 1;
              return this.db.query('SELECT * FROM bigcompany.loans WHERE id = $1', [loanId]);
            case 1:
              loan = _context7.sent;
              if (!(loan.rows.length === 0)) {
                _context7.next = 2;
                break;
              }
              return _context7.abrupt("return", {
                success: false,
                error: 'Loan not found'
              });
            case 2:
              if (!(loan.rows[0].status !== 'pending')) {
                _context7.next = 3;
                break;
              }
              return _context7.abrupt("return", {
                success: false,
                error: 'Loan has already been processed'
              });
            case 3:
              if (!(approvalDecision === 'reject')) {
                _context7.next = 7;
                break;
              }
              _context7.next = 4;
              return this.db.query("\n        UPDATE bigcompany.loans\n        SET status = 'rejected', approved_by = $1, approved_at = NOW(),\n            metadata = metadata || $2\n        WHERE id = $3\n        RETURNING *\n      ", [adminId, JSON.stringify({
                rejection_reason: reason
              }), loanId]);
            case 4:
              _result = _context7.sent;
              _context7.next = 5;
              return this.logAudit(adminId, 'loan_rejected', 'loan', loanId, {
                reason: reason
              });
            case 5:
              _context7.next = 6;
              return this.notifyCustomer(loan.rows[0].borrower_id, 'loan_rejected', {
                loanNumber: loan.rows[0].loan_number,
                reason: reason
              });
            case 6:
              return _context7.abrupt("return", {
                success: true,
                loan: this.mapLoan(_result.rows[0])
              });
            case 7:
              // Approve loan
              finalAmount = approvedAmount || loan.rows[0].principal;
              _context7.next = 8;
              return this.getLoanProduct(loan.rows[0].loan_product_id);
            case 8:
              product = _context7.sent;
              totalRepayment = finalAmount * (1 + ((product === null || product === void 0 ? void 0 : product.interestRate) || 0));
              _context7.next = 9;
              return this.db.query("\n      UPDATE bigcompany.loans\n      SET status = 'approved', principal = $1, total_repayment = $2, outstanding_balance = $2,\n          approved_by = $3, approved_at = NOW()\n      WHERE id = $4\n      RETURNING *\n    ", [finalAmount, totalRepayment, adminId, loanId]);
            case 9:
              result = _context7.sent;
              _context7.next = 10;
              return this.logAudit(adminId, 'loan_approved', 'loan', loanId, {
                approvedAmount: finalAmount,
                totalRepayment: totalRepayment
              });
            case 10:
              if (!((product === null || product === void 0 ? void 0 : product.loanType) === 'food')) {
                _context7.next = 11;
                break;
              }
              return _context7.abrupt("return", this.disburseLoan(loanId, adminId));
            case 11:
              return _context7.abrupt("return", {
                success: true,
                loan: this.mapLoan(result.rows[0])
              });
            case 12:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function processLoanDecision(_x7) {
        return _processLoanDecision.apply(this, arguments);
      }
      return processLoanDecision;
    }()
    /**
     * Disburse approved loan
     */
    )
  }, {
    key: "disburseLoan",
    value: (function () {
      var _disburseLoan = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(loanId, adminId) {
        var loan, loanAccountId, result, _t;
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              _context8.next = 1;
              return this.db.query('SELECT * FROM bigcompany.loans WHERE id = $1', [loanId]);
            case 1:
              loan = _context8.sent;
              if (!(loan.rows.length === 0)) {
                _context8.next = 2;
                break;
              }
              return _context8.abrupt("return", {
                success: false,
                error: 'Loan not found'
              });
            case 2:
              if (!(loan.rows[0].status !== 'approved')) {
                _context8.next = 3;
                break;
              }
              return _context8.abrupt("return", {
                success: false,
                error: 'Loan must be approved before disbursement'
              });
            case 3:
              _context8.prev = 3;
              // Create loan account in Blnk (for tracking)
              // For food loans, we don't transfer actual money, just create credit limit
              loanAccountId = "loan_".concat(loanId); // Update loan status
              _context8.next = 4;
              return this.db.query("\n        UPDATE bigcompany.loans\n        SET status = 'disbursed', disbursed_at = NOW(), blnk_account_id = $1\n        WHERE id = $2\n        RETURNING *\n      ", [loanAccountId, loanId]);
            case 4:
              result = _context8.sent;
              _context8.next = 5;
              return this.logAudit(adminId, 'loan_disbursed', 'loan', loanId, {
                amount: loan.rows[0].principal
              });
            case 5:
              _context8.next = 6;
              return this.notifyCustomer(loan.rows[0].borrower_id, 'loan_disbursed', {
                loanNumber: loan.rows[0].loan_number,
                amount: loan.rows[0].principal,
                dueDate: loan.rows[0].due_date
              });
            case 6:
              return _context8.abrupt("return", {
                success: true,
                loan: this.mapLoan(result.rows[0])
              });
            case 7:
              _context8.prev = 7;
              _t = _context8["catch"](3);
              console.error('Loan disbursement error:', _t);
              return _context8.abrupt("return", {
                success: false,
                error: 'Failed to disburse loan'
              });
            case 8:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this, [[3, 7]]);
      }));
      function disburseLoan(_x8, _x9) {
        return _disburseLoan.apply(this, arguments);
      }
      return disburseLoan;
    }()
    /**
     * Get loan by ID
     */
    )
  }, {
    key: "getLoan",
    value: (function () {
      var _getLoan = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(loanId) {
        var result;
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 1;
              return this.db.query('SELECT * FROM bigcompany.loans WHERE id = $1', [loanId]);
            case 1:
              result = _context9.sent;
              return _context9.abrupt("return", result.rows[0] ? this.mapLoan(result.rows[0]) : null);
            case 2:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function getLoan(_x0) {
        return _getLoan.apply(this, arguments);
      }
      return getLoan;
    }()
    /**
     * Get customer's loans
     */
    )
  }, {
    key: "getCustomerLoans",
    value: (function () {
      var _getCustomerLoans = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(borrowerId) {
        var result;
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              _context0.next = 1;
              return this.db.query("\n      SELECT l.*, lp.name as product_name, lp.loan_type\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      WHERE l.borrower_id = $1\n      ORDER BY l.created_at DESC\n    ", [borrowerId]);
            case 1:
              result = _context0.sent;
              return _context0.abrupt("return", result.rows.map(this.mapLoan));
            case 2:
            case "end":
              return _context0.stop();
          }
        }, _callee0, this);
      }));
      function getCustomerLoans(_x1) {
        return _getCustomerLoans.apply(this, arguments);
      }
      return getCustomerLoans;
    }()
    /**
     * Get all loans (admin)
     */
    )
  }, {
    key: "getAllLoans",
    value: (function () {
      var _getAllLoans = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1() {
        var filters,
          whereConditions,
          params,
          paramIndex,
          whereClause,
          countResult,
          result,
          _args1 = arguments;
        return _regenerator["default"].wrap(function (_context1) {
          while (1) switch (_context1.prev = _context1.next) {
            case 0:
              filters = _args1.length > 0 && _args1[0] !== undefined ? _args1[0] : {};
              whereConditions = [];
              params = [];
              paramIndex = 1;
              if (filters.status) {
                whereConditions.push("l.status = $".concat(paramIndex++));
                params.push(filters.status);
              }
              if (filters.borrowerId) {
                whereConditions.push("l.borrower_id = $".concat(paramIndex++));
                params.push(filters.borrowerId);
              }
              if (filters.fromDate) {
                whereConditions.push("l.created_at >= $".concat(paramIndex++));
                params.push(filters.fromDate);
              }
              if (filters.toDate) {
                whereConditions.push("l.created_at <= $".concat(paramIndex++));
                params.push(filters.toDate);
              }
              whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''; // Get total count
              _context1.next = 1;
              return this.db.query("SELECT COUNT(*) FROM bigcompany.loans l ".concat(whereClause), params);
            case 1:
              countResult = _context1.sent;
              // Get loans
              params.push(filters.limit || 50);
              params.push(filters.offset || 0);
              _context1.next = 2;
              return this.db.query("\n      SELECT l.*, lp.name as product_name, lp.loan_type,\n             c.email as borrower_email, c.first_name, c.last_name\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      LEFT JOIN customer c ON l.borrower_id = c.id\n      ".concat(whereClause, "\n      ORDER BY l.created_at DESC\n      LIMIT $").concat(paramIndex++, " OFFSET $").concat(paramIndex, "\n    "), params);
            case 2:
              result = _context1.sent;
              return _context1.abrupt("return", {
                loans: result.rows.map(this.mapLoan),
                total: parseInt(countResult.rows[0].count)
              });
            case 3:
            case "end":
              return _context1.stop();
          }
        }, _callee1, this);
      }));
      function getAllLoans() {
        return _getAllLoans.apply(this, arguments);
      }
      return getAllLoans;
    }() // ==================== REPAYMENTS ====================
    /**
     * Process loan repayment
     */
    )
  }, {
    key: "processRepayment",
    value: function () {
      var _processRepayment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(loanId, amount, paymentMethod, metadata) {
        var loan, loanData, repaymentResult, newBalance, newStatus, _t2;
        return _regenerator["default"].wrap(function (_context10) {
          while (1) switch (_context10.prev = _context10.next) {
            case 0:
              _context10.next = 1;
              return this.db.query('SELECT * FROM bigcompany.loans WHERE id = $1', [loanId]);
            case 1:
              loan = _context10.sent;
              if (!(loan.rows.length === 0)) {
                _context10.next = 2;
                break;
              }
              return _context10.abrupt("return", {
                success: false,
                error: 'Loan not found'
              });
            case 2:
              loanData = loan.rows[0];
              if (['disbursed', 'active'].includes(loanData.status)) {
                _context10.next = 3;
                break;
              }
              return _context10.abrupt("return", {
                success: false,
                error: 'Loan is not active'
              });
            case 3:
              if (amount > loanData.outstanding_balance) {
                amount = loanData.outstanding_balance; // Cap at outstanding
              }
              if (!(amount <= 0)) {
                _context10.next = 4;
                break;
              }
              return _context10.abrupt("return", {
                success: false,
                error: 'Invalid repayment amount'
              });
            case 4:
              _context10.prev = 4;
              _context10.next = 5;
              return this.db.query("\n        INSERT INTO bigcompany.loan_repayments\n        (loan_id, amount, principal_portion, payment_method, metadata)\n        VALUES ($1, $2, $2, $3, $4)\n        RETURNING *\n      ", [loanId, amount, paymentMethod, JSON.stringify(metadata || {})]);
            case 5:
              repaymentResult = _context10.sent;
              // Update loan
              newBalance = loanData.outstanding_balance - amount;
              newStatus = newBalance <= 0 ? 'paid' : 'active';
              _context10.next = 6;
              return this.db.query("\n        UPDATE bigcompany.loans\n        SET outstanding_balance = $1, status = $2, updated_at = NOW()\n        WHERE id = $3\n      ", [Math.max(0, newBalance), newStatus, loanId]);
            case 6:
              _context10.next = 7;
              return this.logAudit(loanData.borrower_id, 'loan_repayment', 'loan', loanId, {
                amount: amount,
                method: paymentMethod,
                remainingBalance: newBalance
              });
            case 7:
              if (!(newStatus === 'paid')) {
                _context10.next = 8;
                break;
              }
              _context10.next = 8;
              return this.notifyCustomer(loanData.borrower_id, 'loan_paid', {
                loanNumber: loanData.loan_number
              });
            case 8:
              return _context10.abrupt("return", {
                success: true,
                repaymentId: repaymentResult.rows[0].id,
                remainingBalance: Math.max(0, newBalance),
                message: newStatus === 'paid' ? 'Loan fully repaid!' : "Repayment successful. Remaining: ".concat(newBalance.toLocaleString(), " RWF")
              });
            case 9:
              _context10.prev = 9;
              _t2 = _context10["catch"](4);
              console.error('Repayment error:', _t2);
              return _context10.abrupt("return", {
                success: false,
                error: 'Failed to process repayment'
              });
            case 10:
            case "end":
              return _context10.stop();
          }
        }, _callee10, this, [[4, 9]]);
      }));
      function processRepayment(_x10, _x11, _x12, _x13) {
        return _processRepayment.apply(this, arguments);
      }
      return processRepayment;
    }()
    /**
     * Auto-recover loan from customer transactions
     */
  }, {
    key: "autoRecoverFromTransaction",
    value: (function () {
      var _autoRecoverFromTransaction = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(borrowerId, transactionAmount, transactionId) {
        var loan, recoveryPercentage, recoveryAmount, result;
        return _regenerator["default"].wrap(function (_context11) {
          while (1) switch (_context11.prev = _context11.next) {
            case 0:
              _context11.next = 1;
              return this.db.query("\n      SELECT * FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('disbursed', 'active')\n      ORDER BY created_at ASC\n      LIMIT 1\n    ", [borrowerId]);
            case 1:
              loan = _context11.sent;
              if (!(loan.rows.length === 0)) {
                _context11.next = 2;
                break;
              }
              return _context11.abrupt("return", {
                recovered: false
              });
            case 2:
              // Calculate recovery amount (10% of transaction, max outstanding balance)
              recoveryPercentage = 0.10;
              recoveryAmount = Math.floor(transactionAmount * recoveryPercentage);
              recoveryAmount = Math.min(recoveryAmount, loan.rows[0].outstanding_balance);
              if (!(recoveryAmount < 100)) {
                _context11.next = 3;
                break;
              }
              return _context11.abrupt("return", {
                recovered: false
              });
            case 3:
              _context11.next = 4;
              return this.processRepayment(loan.rows[0].id, recoveryAmount, 'wallet', {
                auto_recovery: true,
                source_transaction: transactionId
              });
            case 4:
              result = _context11.sent;
              return _context11.abrupt("return", {
                recovered: result.success,
                amount: result.success ? recoveryAmount : undefined
              });
            case 5:
            case "end":
              return _context11.stop();
          }
        }, _callee11, this);
      }));
      function autoRecoverFromTransaction(_x14, _x15, _x16) {
        return _autoRecoverFromTransaction.apply(this, arguments);
      }
      return autoRecoverFromTransaction;
    }()
    /**
     * Get repayment history
     */
    )
  }, {
    key: "getRepaymentHistory",
    value: (function () {
      var _getRepaymentHistory = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12(loanId) {
        var result;
        return _regenerator["default"].wrap(function (_context12) {
          while (1) switch (_context12.prev = _context12.next) {
            case 0:
              _context12.next = 1;
              return this.db.query("\n      SELECT * FROM bigcompany.loan_repayments\n      WHERE loan_id = $1\n      ORDER BY paid_at DESC\n    ", [loanId]);
            case 1:
              result = _context12.sent;
              return _context12.abrupt("return", result.rows);
            case 2:
            case "end":
              return _context12.stop();
          }
        }, _callee12, this);
      }));
      function getRepaymentHistory(_x17) {
        return _getRepaymentHistory.apply(this, arguments);
      }
      return getRepaymentHistory;
    }() // ==================== FOOD LOAN SPENDING ====================
    /**
     * Check if customer can use food loan for purchase
     */
    )
  }, {
    key: "checkFoodLoanAvailability",
    value: function () {
      var _checkFoodLoanAvailability = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee13(borrowerId, amount) {
        var _loan$rows$0$metadata;
        var loan, availableCredit;
        return _regenerator["default"].wrap(function (_context13) {
          while (1) switch (_context13.prev = _context13.next) {
            case 0:
              _context13.next = 1;
              return this.db.query("\n      SELECT l.*, lp.loan_type\n      FROM bigcompany.loans l\n      JOIN bigcompany.loan_products lp ON l.loan_product_id = lp.id\n      WHERE l.borrower_id = $1 AND l.status IN ('disbursed', 'active') AND lp.loan_type = 'food'\n      LIMIT 1\n    ", [borrowerId]);
            case 1:
              loan = _context13.sent;
              if (!(loan.rows.length === 0)) {
                _context13.next = 2;
                break;
              }
              return _context13.abrupt("return", {
                available: false,
                availableCredit: 0,
                reason: 'No active food loan'
              });
            case 2:
              availableCredit = loan.rows[0].principal - (((_loan$rows$0$metadata = loan.rows[0].metadata) === null || _loan$rows$0$metadata === void 0 ? void 0 : _loan$rows$0$metadata.used_amount) || 0);
              if (!(amount > availableCredit)) {
                _context13.next = 3;
                break;
              }
              return _context13.abrupt("return", {
                available: false,
                availableCredit: availableCredit,
                reason: "Insufficient loan credit. Available: ".concat(availableCredit.toLocaleString(), " RWF")
              });
            case 3:
              return _context13.abrupt("return", {
                available: true,
                availableCredit: availableCredit
              });
            case 4:
            case "end":
              return _context13.stop();
          }
        }, _callee13, this);
      }));
      function checkFoodLoanAvailability(_x18, _x19) {
        return _checkFoodLoanAvailability.apply(this, arguments);
      }
      return checkFoodLoanAvailability;
    }()
    /**
     * Use food loan credit for purchase
     */
  }, {
    key: "useFoodLoanCredit",
    value: (function () {
      var _useFoodLoanCredit = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee14(borrowerId, amount, orderId, merchantId) {
        var _loan$rows$0$metadata2;
        var availability, loan, usedAmount;
        return _regenerator["default"].wrap(function (_context14) {
          while (1) switch (_context14.prev = _context14.next) {
            case 0:
              _context14.next = 1;
              return this.checkFoodLoanAvailability(borrowerId, amount);
            case 1:
              availability = _context14.sent;
              if (availability.available) {
                _context14.next = 2;
                break;
              }
              return _context14.abrupt("return", {
                success: false,
                error: availability.reason
              });
            case 2:
              _context14.next = 3;
              return this.db.query("\n      SELECT * FROM bigcompany.loans\n      WHERE borrower_id = $1 AND status IN ('disbursed', 'active')\n      LIMIT 1\n    ", [borrowerId]);
            case 3:
              loan = _context14.sent;
              usedAmount = (((_loan$rows$0$metadata2 = loan.rows[0].metadata) === null || _loan$rows$0$metadata2 === void 0 ? void 0 : _loan$rows$0$metadata2.used_amount) || 0) + amount; // Update used amount
              _context14.next = 4;
              return this.db.query("\n      UPDATE bigcompany.loans\n      SET metadata = metadata || $1, status = 'active'\n      WHERE id = $2\n    ", [JSON.stringify({
                used_amount: usedAmount,
                last_usage: {
                  orderId: orderId,
                  merchantId: merchantId,
                  amount: amount,
                  date: new Date()
                }
              }), loan.rows[0].id]);
            case 4:
              _context14.next = 5;
              return this.logAudit(borrowerId, 'food_loan_used', 'loan', loan.rows[0].id, {
                amount: amount,
                orderId: orderId,
                merchantId: merchantId
              });
            case 5:
              return _context14.abrupt("return", {
                success: true
              });
            case 6:
            case "end":
              return _context14.stop();
          }
        }, _callee14, this);
      }));
      function useFoodLoanCredit(_x20, _x21, _x22, _x23) {
        return _useFoodLoanCredit.apply(this, arguments);
      }
      return useFoodLoanCredit;
    }() // ==================== ADMIN REPORTING ====================
    /**
     * Get loan statistics
     */
    )
  }, {
    key: "getLoanStatistics",
    value: function () {
      var _getLoanStatistics = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee15(fromDate, toDate) {
        var dateCondition, params, stats, byStatus, statusMap, data;
        return _regenerator["default"].wrap(function (_context15) {
          while (1) switch (_context15.prev = _context15.next) {
            case 0:
              dateCondition = '';
              params = [];
              if (fromDate) {
                params.push(fromDate);
                dateCondition += " AND created_at >= $".concat(params.length);
              }
              if (toDate) {
                params.push(toDate);
                dateCondition += " AND created_at <= $".concat(params.length);
              }
              _context15.next = 1;
              return this.db.query("\n      SELECT\n        COUNT(*) as total_loans,\n        SUM(CASE WHEN status IN ('disbursed', 'active', 'paid') THEN principal ELSE 0 END) as total_disbursed,\n        SUM(CASE WHEN status IN ('disbursed', 'active') THEN outstanding_balance ELSE 0 END) as total_outstanding,\n        SUM(CASE WHEN status = 'paid' THEN total_repayment ELSE 0 END) as total_repaid,\n        AVG(principal) as avg_loan_amount,\n        COUNT(CASE WHEN status = 'defaulted' THEN 1 END)::float / NULLIF(COUNT(*), 0) as default_rate\n      FROM bigcompany.loans\n      WHERE 1=1 ".concat(dateCondition, "\n    "), params);
            case 1:
              stats = _context15.sent;
              _context15.next = 2;
              return this.db.query("\n      SELECT status, COUNT(*) as count\n      FROM bigcompany.loans\n      WHERE 1=1 ".concat(dateCondition, "\n      GROUP BY status\n    "), params);
            case 2:
              byStatus = _context15.sent;
              statusMap = {};
              byStatus.rows.forEach(function (row) {
                statusMap[row.status] = parseInt(row.count);
              });
              data = stats.rows[0];
              return _context15.abrupt("return", {
                totalLoans: parseInt(data.total_loans) || 0,
                totalDisbursed: parseFloat(data.total_disbursed) || 0,
                totalOutstanding: parseFloat(data.total_outstanding) || 0,
                totalRepaid: parseFloat(data.total_repaid) || 0,
                byStatus: statusMap,
                avgLoanAmount: parseFloat(data.avg_loan_amount) || 0,
                defaultRate: parseFloat(data.default_rate) || 0
              });
            case 3:
            case "end":
              return _context15.stop();
          }
        }, _callee15, this);
      }));
      function getLoanStatistics(_x24, _x25) {
        return _getLoanStatistics.apply(this, arguments);
      }
      return getLoanStatistics;
    }() // ==================== HELPERS ====================
  }, {
    key: "mapLoanProduct",
    value: function mapLoanProduct(row) {
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        minAmount: parseFloat(row.min_amount),
        maxAmount: parseFloat(row.max_amount),
        interestRate: parseFloat(row.interest_rate),
        termDays: row.term_days,
        loanType: row.loan_type,
        requirements: row.requirements || {},
        isActive: row.is_active
      };
    }
  }, {
    key: "mapLoan",
    value: function mapLoan(row) {
      return {
        id: row.id,
        loanNumber: row.loan_number,
        borrowerId: row.borrower_id,
        loanProductId: row.loan_product_id,
        principal: parseFloat(row.principal),
        interestRate: parseFloat(row.interest_rate),
        totalRepayment: parseFloat(row.total_repayment),
        outstandingBalance: parseFloat(row.outstanding_balance),
        currency: row.currency,
        status: row.status,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
        disbursedAt: row.disbursed_at,
        dueDate: row.due_date,
        blnkAccountId: row.blnk_account_id,
        metadata: row.metadata || {},
        createdAt: row.created_at
      };
    }
  }, {
    key: "notifyCustomer",
    value: function () {
      var _notifyCustomer = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee16(customerId, type, data) {
        var _customer$rows$;
        var customer, phone, _t3;
        return _regenerator["default"].wrap(function (_context16) {
          while (1) switch (_context16.prev = _context16.next) {
            case 0:
              _context16.next = 1;
              return this.db.query("SELECT phone, email FROM customer WHERE id = $1", [customerId]);
            case 1:
              customer = _context16.sent;
              if ((_customer$rows$ = customer.rows[0]) !== null && _customer$rows$ !== void 0 && _customer$rows$.phone) {
                _context16.next = 2;
                break;
              }
              return _context16.abrupt("return");
            case 2:
              phone = customer.rows[0].phone;
              _t3 = type;
              _context16.next = _t3 === 'loan_disbursed' ? 3 : _t3 === 'loan_rejected' ? 5 : _t3 === 'loan_paid' ? 7 : 9;
              break;
            case 3:
              _context16.next = 4;
              return this.smsService.sendLoanApproval(phone, data.amount, new Date(data.dueDate).toLocaleDateString());
            case 4:
              return _context16.abrupt("continue", 9);
            case 5:
              _context16.next = 6;
              return this.smsService.send({
                to: phone,
                message: "BIG: Your loan application was not approved. Reason: ".concat(data.reason || 'Not specified', ". Contact support for details.")
              });
            case 6:
              return _context16.abrupt("continue", 9);
            case 7:
              _context16.next = 8;
              return this.smsService.send({
                to: phone,
                message: "BIG: Congratulations! Loan #".concat(data.loanNumber, " has been fully repaid. Thank you!")
              });
            case 8:
              return _context16.abrupt("continue", 9);
            case 9:
            case "end":
              return _context16.stop();
          }
        }, _callee16, this);
      }));
      function notifyCustomer(_x26, _x27, _x28) {
        return _notifyCustomer.apply(this, arguments);
      }
      return notifyCustomer;
    }()
  }, {
    key: "logAudit",
    value: function () {
      var _logAudit = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee17(userId, action, entityType, entityId, data) {
        return _regenerator["default"].wrap(function (_context17) {
          while (1) switch (_context17.prev = _context17.next) {
            case 0:
              _context17.next = 1;
              return this.db.query("\n      INSERT INTO bigcompany.audit_logs (user_id, action, entity_type, entity_id, new_values)\n      VALUES ($1, $2, $3, $4, $5)\n    ", [userId, action, entityType, entityId, JSON.stringify(data)]);
            case 1:
            case "end":
              return _context17.stop();
          }
        }, _callee17, this);
      }));
      function logAudit(_x29, _x30, _x31, _x32, _x33) {
        return _logAudit.apply(this, arguments);
      }
      return logAudit;
    }()
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
var _default = exports["default"] = LoanService;