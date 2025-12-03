"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.walletBalanceService = exports.WalletBalanceService = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _pg = require("pg");
var _blnk = require("./blnk");
/**
 * Wallet Balance Service
 * Manages separate wallet and loan balances with transfer restrictions
 * Sprint 4: Loan Balance Separation
 */

// Database connection (adjust based on your config)
var pool = new _pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bigcompany',
  user: process.env.DB_USER || 'bigcompany_app',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// ==================== INTERFACES ====================
// ==================== WALLET BALANCE SERVICE ====================
var WalletBalanceService = exports.WalletBalanceService = /*#__PURE__*/function () {
  function WalletBalanceService() {
    (0, _classCallCheck2["default"])(this, WalletBalanceService);
    (0, _defineProperty2["default"])(this, "blnkService", void 0);
    (0, _defineProperty2["default"])(this, "walletLedgerId", void 0);
    (0, _defineProperty2["default"])(this, "loanLedgerId", void 0);
    this.blnkService = new _blnk.BlnkService();
    // Get ledger IDs from environment or initialize them
    this.walletLedgerId = process.env.BLNK_WALLET_LEDGER_ID || '';
    this.loanLedgerId = process.env.BLNK_LOAN_LEDGER_ID || '';
  }

  /**
   * Get balance details for a user
   */
  return (0, _createClass2["default"])(WalletBalanceService, [{
    key: "getBalanceDetails",
    value: (function () {
      var _getBalanceDetails = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(userId) {
        var query, result, row;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              query = "SELECT * FROM bigcompany.get_balance_details($1)";
              _context.next = 1;
              return pool.query(query, [userId]);
            case 1:
              result = _context.sent;
              if (!(result.rows.length === 0)) {
                _context.next = 2;
                break;
              }
              return _context.abrupt("return", null);
            case 2:
              row = result.rows[0];
              return _context.abrupt("return", {
                walletBalance: parseFloat(row.wallet_balance),
                loanBalance: parseFloat(row.loan_balance),
                totalBalance: parseFloat(row.total_balance),
                availableForTransfer: parseFloat(row.available_for_transfer),
                availableForPurchase: parseFloat(row.available_for_purchase),
                loanLimit: parseFloat(row.loan_limit)
              });
            case 3:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      function getBalanceDetails(_x) {
        return _getBalanceDetails.apply(this, arguments);
      }
      return getBalanceDetails;
    }()
    /**
     * Get full wallet balance record
     */
    )
  }, {
    key: "getWalletBalance",
    value: (function () {
      var _getWalletBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(userId) {
        var query, result, row;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              query = "\n      SELECT\n        user_id, user_type, wallet_balance, loan_balance,\n        total_balance, available_for_transfer, loan_limit,\n        daily_transfer_limit, last_loan_disbursement, last_transfer,\n        currency, is_active\n      FROM bigcompany.wallet_balances\n      WHERE user_id = $1\n    ";
              _context2.next = 1;
              return pool.query(query, [userId]);
            case 1:
              result = _context2.sent;
              if (!(result.rows.length === 0)) {
                _context2.next = 2;
                break;
              }
              return _context2.abrupt("return", null);
            case 2:
              row = result.rows[0];
              return _context2.abrupt("return", this.mapWalletBalance(row));
            case 3:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function getWalletBalance(_x2) {
        return _getWalletBalance.apply(this, arguments);
      }
      return getWalletBalance;
    }()
    /**
     * Create or initialize wallet balance for new user
     * Sprint 4: Also creates Blnk balances and stores their IDs
     */
    )
  }, {
    key: "createWalletBalance",
    value: (function () {
      var _createWalletBalance = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(userId, userType) {
        var loanLimit,
          blnkWalletBalanceId,
          blnkLoanBalanceId,
          blnkBalances,
          query,
          result,
          _args3 = arguments,
          _t;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              loanLimit = _args3.length > 2 && _args3[2] !== undefined ? _args3[2] : 0;
              // Create Blnk balances first
              blnkWalletBalanceId = null;
              blnkLoanBalanceId = null;
              _context3.prev = 1;
              if (!(this.walletLedgerId && this.loanLedgerId)) {
                _context3.next = 3;
                break;
              }
              _context3.next = 2;
              return this.blnkService.createUserBalances(userId, userType, this.walletLedgerId, this.loanLedgerId);
            case 2:
              blnkBalances = _context3.sent;
              blnkWalletBalanceId = blnkBalances.walletBalance.balance_id;
              blnkLoanBalanceId = blnkBalances.loanBalance.balance_id;
            case 3:
              _context3.next = 5;
              break;
            case 4:
              _context3.prev = 4;
              _t = _context3["catch"](1);
              console.error('Failed to create Blnk balances:', _t);
              // Continue without Blnk integration if it fails
            case 5:
              // Create local wallet balance record
              query = "\n      INSERT INTO bigcompany.wallet_balances (\n        user_id, user_type, loan_limit,\n        blnk_wallet_balance_id, blnk_loan_balance_id\n      )\n      VALUES ($1, $2, $3, $4, $5)\n      ON CONFLICT (user_id) DO UPDATE\n      SET\n        user_type = EXCLUDED.user_type,\n        loan_limit = EXCLUDED.loan_limit,\n        blnk_wallet_balance_id = COALESCE(EXCLUDED.blnk_wallet_balance_id, bigcompany.wallet_balances.blnk_wallet_balance_id),\n        blnk_loan_balance_id = COALESCE(EXCLUDED.blnk_loan_balance_id, bigcompany.wallet_balances.blnk_loan_balance_id)\n      RETURNING *\n    ";
              _context3.next = 6;
              return pool.query(query, [userId, userType, loanLimit, blnkWalletBalanceId, blnkLoanBalanceId]);
            case 6:
              result = _context3.sent;
              return _context3.abrupt("return", this.mapWalletBalance(result.rows[0]));
            case 7:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this, [[1, 4]]);
      }));
      function createWalletBalance(_x3, _x4) {
        return _createWalletBalance.apply(this, arguments);
      }
      return createWalletBalance;
    }()
    /**
     * Validate transfer (can only use wallet balance, not loan)
     */
    )
  }, {
    key: "validateTransfer",
    value: (function () {
      var _validateTransfer = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(userId, amount) {
        var balance, canTransfer;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 1;
              return this.getBalanceDetails(userId);
            case 1:
              balance = _context4.sent;
              if (balance) {
                _context4.next = 2;
                break;
              }
              return _context4.abrupt("return", {
                canTransfer: false,
                reason: 'Wallet not found',
                walletBalance: 0,
                requiredAmount: amount,
                shortfall: amount
              });
            case 2:
              canTransfer = balance.walletBalance >= amount;
              return _context4.abrupt("return", {
                canTransfer: canTransfer,
                reason: canTransfer ? undefined : 'Insufficient wallet balance. Loan balance cannot be used for transfers.',
                walletBalance: balance.walletBalance,
                requiredAmount: amount,
                shortfall: canTransfer ? undefined : amount - balance.walletBalance
              });
            case 3:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function validateTransfer(_x5, _x6) {
        return _validateTransfer.apply(this, arguments);
      }
      return validateTransfer;
    }()
    /**
     * Validate purchase (can use wallet + loan balance)
     */
    )
  }, {
    key: "validatePurchase",
    value: (function () {
      var _validatePurchase = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(userId, amount) {
        var balance, canPurchase, suggestedSplit;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 1;
              return this.getBalanceDetails(userId);
            case 1:
              balance = _context5.sent;
              if (balance) {
                _context5.next = 2;
                break;
              }
              return _context5.abrupt("return", {
                canPurchase: false,
                reason: 'Wallet not found',
                totalBalance: 0,
                requiredAmount: amount,
                shortfall: amount
              });
            case 2:
              canPurchase = balance.totalBalance >= amount;
              suggestedSplit = undefined;
              if (canPurchase && balance.walletBalance < amount) {
                // Need to use both wallet and loan
                suggestedSplit = {
                  fromWallet: balance.walletBalance,
                  fromLoan: amount - balance.walletBalance
                };
              }
              return _context5.abrupt("return", {
                canPurchase: canPurchase,
                reason: canPurchase ? undefined : 'Insufficient balance',
                totalBalance: balance.totalBalance,
                requiredAmount: amount,
                shortfall: canPurchase ? undefined : amount - balance.totalBalance,
                suggestedSplit: suggestedSplit
              });
            case 3:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function validatePurchase(_x7, _x8) {
        return _validatePurchase.apply(this, arguments);
      }
      return validatePurchase;
    }()
    /**
     * Credit wallet balance (top-up, refund, etc.)
     */
    )
  }, {
    key: "creditWallet",
    value: (function () {
      var _creditWallet = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(userId, amount, transactionType, description, referenceId, referenceType, blnkTransactionId) {
        var transactionId;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 1;
              return this.recordTransaction(userId, transactionType, 'wallet', amount, 'credit', referenceId, referenceType, description, blnkTransactionId);
            case 1:
              transactionId = _context6.sent;
              return _context6.abrupt("return", this.getTransaction(transactionId));
            case 2:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function creditWallet(_x9, _x0, _x1, _x10, _x11, _x12, _x13) {
        return _creditWallet.apply(this, arguments);
      }
      return creditWallet;
    }()
    /**
     * Debit wallet balance (purchase, transfer, etc.)
     */
    )
  }, {
    key: "debitWallet",
    value: (function () {
      var _debitWallet = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(userId, amount, transactionType, description, referenceId, referenceType, blnkTransactionId) {
        var validation, transactionId;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              _context7.next = 1;
              return this.validateTransfer(userId, amount);
            case 1:
              validation = _context7.sent;
              if (validation.canTransfer) {
                _context7.next = 2;
                break;
              }
              throw new Error(validation.reason || 'Insufficient wallet balance');
            case 2:
              _context7.next = 3;
              return this.recordTransaction(userId, transactionType, 'wallet', amount, 'debit', referenceId, referenceType, description, blnkTransactionId);
            case 3:
              transactionId = _context7.sent;
              return _context7.abrupt("return", this.getTransaction(transactionId));
            case 4:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function debitWallet(_x14, _x15, _x16, _x17, _x18, _x19, _x20) {
        return _debitWallet.apply(this, arguments);
      }
      return debitWallet;
    }()
    /**
     * Credit loan balance (loan disbursement)
     */
    )
  }, {
    key: "creditLoan",
    value: (function () {
      var _creditLoan = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(userId, amount) {
        var transactionType,
          description,
          referenceId,
          referenceType,
          blnkTransactionId,
          balance,
          transactionId,
          _args8 = arguments;
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              transactionType = _args8.length > 2 && _args8[2] !== undefined ? _args8[2] : 'loan_disbursement';
              description = _args8.length > 3 ? _args8[3] : undefined;
              referenceId = _args8.length > 4 ? _args8[4] : undefined;
              referenceType = _args8.length > 5 ? _args8[5] : undefined;
              blnkTransactionId = _args8.length > 6 ? _args8[6] : undefined;
              _context8.next = 1;
              return this.getBalanceDetails(userId);
            case 1:
              balance = _context8.sent;
              if (balance) {
                _context8.next = 2;
                break;
              }
              throw new Error('Wallet not found');
            case 2:
              if (!(balance.loanBalance + amount > balance.loanLimit)) {
                _context8.next = 3;
                break;
              }
              throw new Error("Loan limit exceeded. Current: ".concat(balance.loanBalance, ", Limit: ").concat(balance.loanLimit));
            case 3:
              _context8.next = 4;
              return this.recordTransaction(userId, transactionType, 'loan', amount, 'credit', referenceId, referenceType, description, blnkTransactionId);
            case 4:
              transactionId = _context8.sent;
              _context8.next = 5;
              return pool.query("UPDATE bigcompany.wallet_balances SET last_loan_disbursement = NOW() WHERE user_id = $1", [userId]);
            case 5:
              return _context8.abrupt("return", this.getTransaction(transactionId));
            case 6:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this);
      }));
      function creditLoan(_x21, _x22) {
        return _creditLoan.apply(this, arguments);
      }
      return creditLoan;
    }()
    /**
     * Debit loan balance (loan repayment)
     */
    )
  }, {
    key: "debitLoan",
    value: (function () {
      var _debitLoan = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(userId, amount) {
        var transactionType,
          description,
          referenceId,
          referenceType,
          blnkTransactionId,
          balance,
          transactionId,
          _args9 = arguments;
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              transactionType = _args9.length > 2 && _args9[2] !== undefined ? _args9[2] : 'loan_repayment';
              description = _args9.length > 3 ? _args9[3] : undefined;
              referenceId = _args9.length > 4 ? _args9[4] : undefined;
              referenceType = _args9.length > 5 ? _args9[5] : undefined;
              blnkTransactionId = _args9.length > 6 ? _args9[6] : undefined;
              _context9.next = 1;
              return this.getBalanceDetails(userId);
            case 1:
              balance = _context9.sent;
              if (balance) {
                _context9.next = 2;
                break;
              }
              throw new Error('Wallet not found');
            case 2:
              if (!(balance.loanBalance < amount)) {
                _context9.next = 3;
                break;
              }
              throw new Error("Insufficient loan balance. Current: ".concat(balance.loanBalance, ", Required: ").concat(amount));
            case 3:
              _context9.next = 4;
              return this.recordTransaction(userId, transactionType, 'loan', amount, 'debit', referenceId, referenceType, description, blnkTransactionId);
            case 4:
              transactionId = _context9.sent;
              return _context9.abrupt("return", this.getTransaction(transactionId));
            case 5:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function debitLoan(_x23, _x24) {
        return _debitLoan.apply(this, arguments);
      }
      return debitLoan;
    }()
    /**
     * Process purchase with automatic split (wallet first, then loan)
     */
    )
  }, {
    key: "processPurchase",
    value: (function () {
      var _processPurchase = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(userId, amount, orderId, description) {
        var validation, balance, walletTransaction, loanTransaction, fromWallet, fromLoan, remaining;
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              _context0.next = 1;
              return this.validatePurchase(userId, amount);
            case 1:
              validation = _context0.sent;
              if (validation.canPurchase) {
                _context0.next = 2;
                break;
              }
              throw new Error(validation.reason || 'Insufficient balance for purchase');
            case 2:
              _context0.next = 3;
              return this.getBalanceDetails(userId);
            case 3:
              balance = _context0.sent;
              if (balance) {
                _context0.next = 4;
                break;
              }
              throw new Error('Wallet not found');
            case 4:
              fromWallet = 0;
              fromLoan = 0; // Use wallet balance first
              if (!(balance.walletBalance > 0)) {
                _context0.next = 6;
                break;
              }
              fromWallet = Math.min(balance.walletBalance, amount);
              _context0.next = 5;
              return this.debitWallet(userId, fromWallet, 'purchase', description || "Purchase order ".concat(orderId), orderId, 'order');
            case 5:
              walletTransaction = _context0.sent;
            case 6:
              // Use loan balance if needed
              remaining = amount - fromWallet;
              if (!(remaining > 0 && balance.loanBalance >= remaining)) {
                _context0.next = 8;
                break;
              }
              fromLoan = remaining;
              _context0.next = 7;
              return this.debitLoan(userId, fromLoan, 'purchase', description || "Purchase order ".concat(orderId, " (loan portion)"), orderId, 'order');
            case 7:
              loanTransaction = _context0.sent;
            case 8:
              return _context0.abrupt("return", {
                walletTransaction: walletTransaction,
                loanTransaction: loanTransaction,
                totalPaid: fromWallet + fromLoan,
                fromWallet: fromWallet,
                fromLoan: fromLoan
              });
            case 9:
            case "end":
              return _context0.stop();
          }
        }, _callee0, this);
      }));
      function processPurchase(_x25, _x26, _x27, _x28) {
        return _processPurchase.apply(this, arguments);
      }
      return processPurchase;
    }()
    /**
     * Log restricted transfer attempt
     */
    )
  }, {
    key: "logRestrictedTransfer",
    value: (function () {
      var _logRestrictedTransfer = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(userId, attemptedAmount, ipAddress, userAgent) {
        var query, result;
        return _regenerator["default"].wrap(function (_context1) {
          while (1) switch (_context1.prev = _context1.next) {
            case 0:
              query = "SELECT bigcompany.log_restricted_transfer($1, $2, $3, $4)";
              _context1.next = 1;
              return pool.query(query, [userId, attemptedAmount, ipAddress, userAgent]);
            case 1:
              result = _context1.sent;
              return _context1.abrupt("return", result.rows[0].log_restricted_transfer);
            case 2:
            case "end":
              return _context1.stop();
          }
        }, _callee1);
      }));
      function logRestrictedTransfer(_x29, _x30, _x31, _x32) {
        return _logRestrictedTransfer.apply(this, arguments);
      }
      return logRestrictedTransfer;
    }()
    /**
     * Get transaction history
     */
    )
  }, {
    key: "getTransactionHistory",
    value: (function () {
      var _getTransactionHistory = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(userId) {
        var _this = this;
        var limit,
          offset,
          balanceType,
          query,
          params,
          result,
          _args10 = arguments;
        return _regenerator["default"].wrap(function (_context10) {
          while (1) switch (_context10.prev = _context10.next) {
            case 0:
              limit = _args10.length > 1 && _args10[1] !== undefined ? _args10[1] : 50;
              offset = _args10.length > 2 && _args10[2] !== undefined ? _args10[2] : 0;
              balanceType = _args10.length > 3 ? _args10[3] : undefined;
              query = "\n      SELECT * FROM bigcompany.balance_transactions\n      WHERE user_id = $1\n    ";
              params = [userId];
              if (balanceType) {
                query += " AND balance_type = $".concat(params.length + 1);
                params.push(balanceType);
              }
              query += " ORDER BY created_at DESC LIMIT $".concat(params.length + 1, " OFFSET $").concat(params.length + 2);
              params.push(limit, offset);
              _context10.next = 1;
              return pool.query(query, params);
            case 1:
              result = _context10.sent;
              return _context10.abrupt("return", result.rows.map(function (row) {
                return _this.mapBalanceTransaction(row);
              }));
            case 2:
            case "end":
              return _context10.stop();
          }
        }, _callee10);
      }));
      function getTransactionHistory(_x33) {
        return _getTransactionHistory.apply(this, arguments);
      }
      return getTransactionHistory;
    }()
    /**
     * Get summary statistics
     */
    )
  }, {
    key: "getSummaryStats",
    value: (function () {
      var _getSummaryStats = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(userId) {
        var query, result, row;
        return _regenerator["default"].wrap(function (_context11) {
          while (1) switch (_context11.prev = _context11.next) {
            case 0:
              query = "\n      SELECT\n        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) as total_credits,\n        COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0) as total_debits,\n        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) as net_change,\n        COUNT(*) as transaction_count,\n        MAX(created_at) as last_transaction\n      FROM bigcompany.balance_transactions\n      WHERE user_id = $1\n    ";
              _context11.next = 1;
              return pool.query(query, [userId]);
            case 1:
              result = _context11.sent;
              row = result.rows[0];
              return _context11.abrupt("return", {
                totalCredits: parseFloat(row.total_credits),
                totalDebits: parseFloat(row.total_debits),
                netChange: parseFloat(row.net_change),
                transactionCount: parseInt(row.transaction_count),
                lastTransaction: row.last_transaction
              });
            case 2:
            case "end":
              return _context11.stop();
          }
        }, _callee11);
      }));
      function getSummaryStats(_x34) {
        return _getSummaryStats.apply(this, arguments);
      }
      return getSummaryStats;
    }() // ==================== PRIVATE METHODS ====================
    )
  }, {
    key: "recordTransaction",
    value: function () {
      var _recordTransaction = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12(userId, transactionType, balanceType, amount, direction, referenceId, referenceType, description, blnkTransactionId, createdBy) {
        var query, result;
        return _regenerator["default"].wrap(function (_context12) {
          while (1) switch (_context12.prev = _context12.next) {
            case 0:
              query = "\n      SELECT bigcompany.record_balance_transaction(\n        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10\n      ) as transaction_id\n    ";
              _context12.next = 1;
              return pool.query(query, [userId, transactionType, balanceType, amount, direction, referenceId, referenceType, description, blnkTransactionId, createdBy]);
            case 1:
              result = _context12.sent;
              return _context12.abrupt("return", result.rows[0].transaction_id);
            case 2:
            case "end":
              return _context12.stop();
          }
        }, _callee12);
      }));
      function recordTransaction(_x35, _x36, _x37, _x38, _x39, _x40, _x41, _x42, _x43, _x44) {
        return _recordTransaction.apply(this, arguments);
      }
      return recordTransaction;
    }()
  }, {
    key: "getTransaction",
    value: function () {
      var _getTransaction = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee13(transactionId) {
        var query, result;
        return _regenerator["default"].wrap(function (_context13) {
          while (1) switch (_context13.prev = _context13.next) {
            case 0:
              query = "SELECT * FROM bigcompany.balance_transactions WHERE id = $1";
              _context13.next = 1;
              return pool.query(query, [transactionId]);
            case 1:
              result = _context13.sent;
              if (!(result.rows.length === 0)) {
                _context13.next = 2;
                break;
              }
              throw new Error('Transaction not found');
            case 2:
              return _context13.abrupt("return", this.mapBalanceTransaction(result.rows[0]));
            case 3:
            case "end":
              return _context13.stop();
          }
        }, _callee13, this);
      }));
      function getTransaction(_x45) {
        return _getTransaction.apply(this, arguments);
      }
      return getTransaction;
    }()
  }, {
    key: "mapWalletBalance",
    value: function mapWalletBalance(row) {
      return {
        userId: row.user_id,
        userType: row.user_type,
        walletBalance: parseFloat(row.wallet_balance),
        loanBalance: parseFloat(row.loan_balance),
        totalBalance: parseFloat(row.total_balance),
        availableForTransfer: parseFloat(row.available_for_transfer),
        loanLimit: parseFloat(row.loan_limit),
        dailyTransferLimit: parseFloat(row.daily_transfer_limit),
        lastLoanDisbursement: row.last_loan_disbursement,
        lastTransfer: row.last_transfer,
        currency: row.currency,
        isActive: row.is_active
      };
    }
  }, {
    key: "mapBalanceTransaction",
    value: function mapBalanceTransaction(row) {
      return {
        id: row.id,
        userId: row.user_id,
        transactionType: row.transaction_type,
        balanceType: row.balance_type,
        amount: parseFloat(row.amount),
        direction: row.direction,
        walletBalanceBefore: parseFloat(row.wallet_balance_before),
        walletBalanceAfter: parseFloat(row.wallet_balance_after),
        loanBalanceBefore: parseFloat(row.loan_balance_before),
        loanBalanceAfter: parseFloat(row.loan_balance_after),
        referenceId: row.reference_id,
        referenceType: row.reference_type,
        description: row.description,
        blnkTransactionId: row.blnk_transaction_id,
        createdAt: row.created_at
      };
    }
  }]);
}(); // Export singleton instance
var walletBalanceService = exports.walletBalanceService = new WalletBalanceService();