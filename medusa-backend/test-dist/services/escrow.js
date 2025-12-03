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
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _medusa = require("@medusajs/medusa");
var _pg = require("pg");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _callSuper(t, o, e) { return o = (0, _getPrototypeOf2["default"])(o), (0, _possibleConstructorReturn2["default"])(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], (0, _getPrototypeOf2["default"])(t).constructor) : o.apply(t, e)); }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
var EscrowService = /*#__PURE__*/function (_TransactionBaseServi) {
  function EscrowService(container) {
    var _this;
    (0, _classCallCheck2["default"])(this, EscrowService);
    _this = _callSuper(this, EscrowService, [container]);

    // Initialize PostgreSQL connection
    (0, _defineProperty2["default"])(_this, "db", void 0);
    (0, _defineProperty2["default"])(_this, "blnkService", void 0);
    (0, _defineProperty2["default"])(_this, "companyEscrowLedgerId", void 0);
    _this.db = new _pg.Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://bigcompany_user:bigcompany_password@localhost:5435/bigcompany'
    });

    // Get BlnkService from container
    _this.blnkService = container.resolve('blnkService');

    // Company's master escrow ledger ID (should be created during setup)
    _this.companyEscrowLedgerId = process.env.COMPANY_ESCROW_LEDGER_ID || '';
    return _this;
  }

  // ==================== ESCROW CREATION ====================

  /**
   * Create an escrow transaction when retailer orders from wholesaler
   * 1. Record in database
   * 2. Move funds from company's main account to escrow balance in Blnk
   * 3. Track for auto-release
   */
  (0, _inherits2["default"])(EscrowService, _TransactionBaseServi);
  return (0, _createClass2["default"])(EscrowService, [{
    key: "createEscrow",
    value: function () {
      var _createEscrow = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(input) {
        var client, settings, summary, autoReleaseDays, autoReleaseDate, insertQuery, result, escrowTransaction, blnkTx, _t, _t2;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.next = 1;
              return this.db.connect();
            case 1:
              client = _context.sent;
              _context.prev = 2;
              _context.next = 3;
              return client.query('BEGIN');
            case 3:
              _context.next = 4;
              return this.getSettings();
            case 4:
              settings = _context.sent;
              if (settings.escrow_enabled) {
                _context.next = 5;
                break;
              }
              throw new Error('Escrow system is currently disabled');
            case 5:
              _context.next = 6;
              return this.getRetailerSummary(input.retailer_id);
            case 6:
              summary = _context.sent;
              if (!(summary && summary.outstanding_debt + input.escrow_amount > settings.max_outstanding_debt)) {
                _context.next = 7;
                break;
              }
              throw new Error("Retailer has exceeded maximum outstanding debt limit (".concat(settings.max_outstanding_debt, " RWF)"));
            case 7:
              // Calculate auto-release date
              autoReleaseDays = input.auto_release_days || settings.auto_release_days;
              autoReleaseDate = new Date();
              autoReleaseDate.setDate(autoReleaseDate.getDate() + autoReleaseDays);

              // Record escrow transaction in database
              insertQuery = "\n        INSERT INTO bigcompany.escrow_transactions (\n          order_id, retailer_id, wholesaler_id, order_amount, escrow_amount,\n          currency, order_details, auto_release_at, status\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'held')\n        RETURNING *;\n      ";
              _context.next = 8;
              return client.query(insertQuery, [input.order_id, input.retailer_id, input.wholesaler_id, input.order_amount, input.escrow_amount, input.currency || 'RWF', JSON.stringify(input.order_details || {}), autoReleaseDate]);
            case 8:
              result = _context.sent;
              escrowTransaction = result.rows[0]; // Create Blnk transaction to move funds to escrow
              _context.prev = 9;
              _context.next = 10;
              return this.blnkService.createTransaction({
                amount: input.escrow_amount,
                currency: input.currency || 'RWF',
                source: this.companyEscrowLedgerId,
                // Company's escrow pool
                destination: "escrow_".concat(escrowTransaction.id),
                // Dedicated escrow balance
                reference: input.order_id,
                description: "Escrow for order ".concat(input.order_id, " - Retailer: ").concat(input.retailer_id),
                meta_data: {
                  escrow_id: escrowTransaction.id,
                  retailer_id: input.retailer_id,
                  wholesaler_id: input.wholesaler_id,
                  order_id: input.order_id
                }
              });
            case 10:
              blnkTx = _context.sent;
              _context.next = 11;
              return client.query("UPDATE bigcompany.escrow_transactions\n           SET blnk_transaction_ref = $1, blnk_escrow_balance_id = $2, updated_at = NOW()\n           WHERE id = $3", [blnkTx.transaction_id, "escrow_".concat(escrowTransaction.id), escrowTransaction.id]);
            case 11:
              escrowTransaction.blnk_transaction_ref = blnkTx.transaction_id;
              escrowTransaction.blnk_escrow_balance_id = "escrow_".concat(escrowTransaction.id);
              _context.next = 13;
              break;
            case 12:
              _context.prev = 12;
              _t = _context["catch"](9);
              console.error('Blnk transaction failed:', _t.message);
              // Continue without Blnk integration (track in DB only)
            case 13:
              _context.next = 14;
              return client.query('COMMIT');
            case 14:
              return _context.abrupt("return", escrowTransaction);
            case 15:
              _context.prev = 15;
              _t2 = _context["catch"](2);
              _context.next = 16;
              return client.query('ROLLBACK');
            case 16:
              throw _t2;
            case 17:
              _context.prev = 17;
              client.release();
              return _context.finish(17);
            case 18:
            case "end":
              return _context.stop();
          }
        }, _callee, this, [[2, 15, 17, 18], [9, 12]]);
      }));
      function createEscrow(_x) {
        return _createEscrow.apply(this, arguments);
      }
      return createEscrow;
    }() // ==================== ESCROW RELEASE ====================
    /**
     * Release escrow funds to wholesaler after confirmation
     * Can be triggered by:
     * 1. Manual confirmation by retailer/admin
     * 2. Auto-release after timeout (handled by cron job)
     */
  }, {
    key: "releaseEscrow",
    value: function () {
      var _releaseEscrow = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(input) {
        var client, escrowResult, escrow, updatedResult, _t3, _t4;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 1;
              return this.db.connect();
            case 1:
              client = _context2.sent;
              _context2.prev = 2;
              _context2.next = 3;
              return client.query('BEGIN');
            case 3:
              _context2.next = 4;
              return client.query('SELECT * FROM bigcompany.escrow_transactions WHERE id = $1 AND status = $2', [input.escrow_id, 'held']);
            case 4:
              escrowResult = _context2.sent;
              if (!(escrowResult.rows.length === 0)) {
                _context2.next = 5;
                break;
              }
              throw new Error('Escrow transaction not found or already released');
            case 5:
              escrow = escrowResult.rows[0]; // Update status to released
              _context2.next = 6;
              return client.query("UPDATE bigcompany.escrow_transactions\n         SET status = 'released',\n             confirmed_by = $1,\n             confirmed_at = NOW(),\n             released_at = NOW(),\n             notes = $2,\n             updated_at = NOW()\n         WHERE id = $3", [input.confirmed_by, input.notes, input.escrow_id]);
            case 6:
              if (!escrow.blnk_escrow_balance_id) {
                _context2.next = 10;
                break;
              }
              _context2.prev = 7;
              _context2.next = 8;
              return this.blnkService.createTransaction({
                amount: escrow.escrow_amount,
                currency: escrow.currency,
                source: escrow.blnk_escrow_balance_id,
                destination: "wholesaler_".concat(escrow.wholesaler_id),
                reference: "release_".concat(escrow.order_id),
                description: "Payment to wholesaler for order ".concat(escrow.order_id),
                meta_data: {
                  escrow_id: escrow.id,
                  order_id: escrow.order_id,
                  released_by: input.confirmed_by
                }
              });
            case 8:
              _context2.next = 10;
              break;
            case 9:
              _context2.prev = 9;
              _t3 = _context2["catch"](7);
              console.error('Blnk release failed:', _t3.message);
              // Status already updated in DB, log error but continue
            case 10:
              _context2.next = 11;
              return client.query('COMMIT');
            case 11:
              _context2.next = 12;
              return client.query('SELECT * FROM bigcompany.escrow_transactions WHERE id = $1', [input.escrow_id]);
            case 12:
              updatedResult = _context2.sent;
              return _context2.abrupt("return", updatedResult.rows[0]);
            case 13:
              _context2.prev = 13;
              _t4 = _context2["catch"](2);
              _context2.next = 14;
              return client.query('ROLLBACK');
            case 14:
              throw _t4;
            case 15:
              _context2.prev = 15;
              client.release();
              return _context2.finish(15);
            case 16:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this, [[2, 13, 15, 16], [7, 9]]);
      }));
      function releaseEscrow(_x2) {
        return _releaseEscrow.apply(this, arguments);
      }
      return releaseEscrow;
    }()
    /**
     * Auto-release escrows that have passed their auto_release_at date
     * Should be called by a cron job
     */
  }, {
    key: "processAutoReleases",
    value: (function () {
      var _processAutoReleases = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3() {
        var result, releasedCount, _iterator, _step, escrow, _t5, _t6;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 1;
              return this.db.query("SELECT * FROM bigcompany.escrow_transactions\n       WHERE status = 'held'\n       AND auto_release_at <= NOW()\n       AND confirmation_required = true");
            case 1:
              result = _context3.sent;
              releasedCount = 0;
              _iterator = _createForOfIteratorHelper(result.rows);
              _context3.prev = 2;
              _iterator.s();
            case 3:
              if ((_step = _iterator.n()).done) {
                _context3.next = 8;
                break;
              }
              escrow = _step.value;
              _context3.prev = 4;
              _context3.next = 5;
              return this.releaseEscrow({
                escrow_id: escrow.id,
                confirmed_by: 'system_auto_release',
                notes: 'Auto-released after timeout'
              });
            case 5:
              releasedCount++;
              _context3.next = 7;
              break;
            case 6:
              _context3.prev = 6;
              _t5 = _context3["catch"](4);
              console.error("Failed to auto-release escrow ".concat(escrow.id, ":"), _t5.message);
            case 7:
              _context3.next = 3;
              break;
            case 8:
              _context3.next = 10;
              break;
            case 9:
              _context3.prev = 9;
              _t6 = _context3["catch"](2);
              _iterator.e(_t6);
            case 10:
              _context3.prev = 10;
              _iterator.f();
              return _context3.finish(10);
            case 11:
              return _context3.abrupt("return", releasedCount);
            case 12:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this, [[2, 9, 10, 11], [4, 6]]);
      }));
      function processAutoReleases() {
        return _processAutoReleases.apply(this, arguments);
      }
      return processAutoReleases;
    }() // ==================== REPAYMENTS ====================
    /**
     * Record a repayment from retailer to company
     */
    )
  }, {
    key: "recordRepayment",
    value: function () {
      var _recordRepayment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(input) {
        var client, escrowResult, insertQuery, result, repayment, blnkTx, _t7, _t8;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 1;
              return this.db.connect();
            case 1:
              client = _context4.sent;
              _context4.prev = 2;
              _context4.next = 3;
              return client.query('BEGIN');
            case 3:
              _context4.next = 4;
              return client.query('SELECT * FROM bigcompany.escrow_transactions WHERE id = $1', [input.escrow_transaction_id]);
            case 4:
              escrowResult = _context4.sent;
              if (!(escrowResult.rows.length === 0)) {
                _context4.next = 5;
                break;
              }
              throw new Error('Escrow transaction not found');
            case 5:
              // Record repayment
              insertQuery = "\n        INSERT INTO bigcompany.escrow_repayments (\n          escrow_transaction_id, retailer_id, repayment_amount, repayment_method,\n          payment_reference, notes, status, processed_at\n        ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', NOW())\n        RETURNING *;\n      ";
              _context4.next = 6;
              return client.query(insertQuery, [input.escrow_transaction_id, input.retailer_id, input.repayment_amount, input.repayment_method, input.payment_reference, input.notes]);
            case 6:
              result = _context4.sent;
              repayment = result.rows[0]; // If auto-deduct, record Blnk transaction
              if (!(input.repayment_method === 'auto_deduct')) {
                _context4.next = 11;
                break;
              }
              _context4.prev = 7;
              _context4.next = 8;
              return this.blnkService.createTransaction({
                amount: input.repayment_amount,
                currency: 'RWF',
                source: "retailer_".concat(input.retailer_id),
                destination: this.companyEscrowLedgerId,
                reference: "repayment_".concat(repayment.id),
                description: "Auto-deduct repayment from retailer ".concat(input.retailer_id),
                meta_data: {
                  repayment_id: repayment.id,
                  escrow_transaction_id: input.escrow_transaction_id,
                  retailer_id: input.retailer_id
                }
              });
            case 8:
              blnkTx = _context4.sent;
              _context4.next = 9;
              return client.query('UPDATE bigcompany.escrow_repayments SET blnk_transaction_ref = $1 WHERE id = $2', [blnkTx.transaction_id, repayment.id]);
            case 9:
              _context4.next = 11;
              break;
            case 10:
              _context4.prev = 10;
              _t7 = _context4["catch"](7);
              console.error('Blnk repayment transaction failed:', _t7.message);
            case 11:
              _context4.next = 12;
              return client.query('COMMIT');
            case 12:
              return _context4.abrupt("return", repayment);
            case 13:
              _context4.prev = 13;
              _t8 = _context4["catch"](2);
              _context4.next = 14;
              return client.query('ROLLBACK');
            case 14:
              throw _t8;
            case 15:
              _context4.prev = 15;
              client.release();
              return _context4.finish(15);
            case 16:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this, [[2, 13, 15, 16], [7, 10]]);
      }));
      function recordRepayment(_x3) {
        return _recordRepayment.apply(this, arguments);
      }
      return recordRepayment;
    }()
    /**
     * Process auto-deductions for all retailers with positive wallet balances
     * Should be called daily by cron job
     */
  }, {
    key: "processAutoDeductions",
    value: (function () {
      var _processAutoDeductions = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5() {
        var retailersResult, processedCount, totalAmount, _iterator2, _step2, retailer, summary, deductionAmount, oldestEscrow, _t9, _t0;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 1;
              return this.db.query("SELECT * FROM bigcompany.escrow_auto_deductions\n       WHERE enabled = true AND suspended = false");
            case 1:
              retailersResult = _context5.sent;
              processedCount = 0;
              totalAmount = 0;
              _iterator2 = _createForOfIteratorHelper(retailersResult.rows);
              _context5.prev = 2;
              _iterator2.s();
            case 3:
              if ((_step2 = _iterator2.n()).done) {
                _context5.next = 12;
                break;
              }
              retailer = _step2.value;
              _context5.prev = 4;
              _context5.next = 5;
              return this.getRetailerSummary(retailer.retailer_id);
            case 5:
              summary = _context5.sent;
              if (!(!summary || summary.outstanding_debt <= 0)) {
                _context5.next = 6;
                break;
              }
              return _context5.abrupt("continue", 11);
            case 6:
              // Get retailer's wallet balance (would need wallet service integration)
              // For now, skip Blnk check and just record
              deductionAmount = Math.min(summary.outstanding_debt * (retailer.deduction_percentage / 100), retailer.max_daily_deduction_rwf || summary.outstanding_debt);
              if (!(deductionAmount > 0)) {
                _context5.next = 9;
                break;
              }
              _context5.next = 7;
              return this.db.query("SELECT et.id, et.escrow_amount,\n                    COALESCE(SUM(er.repayment_amount), 0) as total_repaid\n             FROM bigcompany.escrow_transactions et\n             LEFT JOIN bigcompany.escrow_repayments er ON et.id = er.escrow_transaction_id\n             WHERE et.retailer_id = $1\n             AND et.status IN ('held', 'released')\n             GROUP BY et.id, et.escrow_amount\n             HAVING et.escrow_amount > COALESCE(SUM(er.repayment_amount), 0)\n             ORDER BY et.created_at ASC\n             LIMIT 1", [retailer.retailer_id]);
            case 7:
              oldestEscrow = _context5.sent;
              if (!(oldestEscrow.rows.length > 0)) {
                _context5.next = 9;
                break;
              }
              _context5.next = 8;
              return this.recordRepayment({
                escrow_transaction_id: oldestEscrow.rows[0].id,
                retailer_id: retailer.retailer_id,
                repayment_amount: deductionAmount,
                repayment_method: 'auto_deduct',
                notes: 'Automatic daily deduction from sales'
              });
            case 8:
              processedCount++;
              totalAmount += deductionAmount;
            case 9:
              _context5.next = 11;
              break;
            case 10:
              _context5.prev = 10;
              _t9 = _context5["catch"](4);
              console.error("Failed to process auto-deduct for ".concat(retailer.retailer_id, ":"), _t9.message);
            case 11:
              _context5.next = 3;
              break;
            case 12:
              _context5.next = 14;
              break;
            case 13:
              _context5.prev = 13;
              _t0 = _context5["catch"](2);
              _iterator2.e(_t0);
            case 14:
              _context5.prev = 14;
              _iterator2.f();
              return _context5.finish(14);
            case 15:
              return _context5.abrupt("return", {
                processed: processedCount,
                total_amount: totalAmount
              });
            case 16:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this, [[2, 13, 14, 15], [4, 10]]);
      }));
      function processAutoDeductions() {
        return _processAutoDeductions.apply(this, arguments);
      }
      return processAutoDeductions;
    }() // ==================== QUERIES ====================
    )
  }, {
    key: "getRetailerSummary",
    value: function () {
      var _getRetailerSummary = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(retailer_id) {
        var result;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 1;
              return this.db.query('SELECT * FROM bigcompany.retailer_escrow_summary WHERE retailer_id = $1', [retailer_id]);
            case 1:
              result = _context6.sent;
              return _context6.abrupt("return", result.rows[0] || null);
            case 2:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function getRetailerSummary(_x4) {
        return _getRetailerSummary.apply(this, arguments);
      }
      return getRetailerSummary;
    }()
  }, {
    key: "getRetailerEscrows",
    value: function () {
      var _getRetailerEscrows = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(retailer_id, status) {
        var query, params, result;
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              query = 'SELECT * FROM bigcompany.escrow_transactions WHERE retailer_id = $1';
              params = [retailer_id];
              if (status) {
                query += ' AND status = $2';
                params.push(status);
              }
              query += ' ORDER BY created_at DESC';
              _context7.next = 1;
              return this.db.query(query, params);
            case 1:
              result = _context7.sent;
              return _context7.abrupt("return", result.rows);
            case 2:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function getRetailerEscrows(_x5, _x6) {
        return _getRetailerEscrows.apply(this, arguments);
      }
      return getRetailerEscrows;
    }()
  }, {
    key: "getEscrowById",
    value: function () {
      var _getEscrowById = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(escrow_id) {
        var result;
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              _context8.next = 1;
              return this.db.query('SELECT * FROM bigcompany.escrow_transactions WHERE id = $1', [escrow_id]);
            case 1:
              result = _context8.sent;
              return _context8.abrupt("return", result.rows[0] || null);
            case 2:
            case "end":
              return _context8.stop();
          }
        }, _callee8, this);
      }));
      function getEscrowById(_x7) {
        return _getEscrowById.apply(this, arguments);
      }
      return getEscrowById;
    }()
  }, {
    key: "getSettings",
    value: function () {
      var _getSettings = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9() {
        var result, settings;
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 1;
              return this.db.query('SELECT * FROM bigcompany.escrow_settings');
            case 1:
              result = _context9.sent;
              settings = {};
              result.rows.forEach(function (row) {
                settings[row.setting_key] = row.setting_value;
              });
              return _context9.abrupt("return", {
                auto_release_days: parseInt(settings.auto_release_days || '7'),
                default_deduction_percentage: parseFloat(settings.default_deduction_percentage || '30'),
                minimum_wallet_balance: parseFloat(settings.minimum_wallet_balance || '10000'),
                max_outstanding_debt: parseFloat(settings.max_outstanding_debt || '5000000'),
                escrow_enabled: settings.escrow_enabled === 'true',
                dispute_resolution_email: settings.dispute_resolution_email || 'escrow@bigcompany.rw'
              });
            case 2:
            case "end":
              return _context9.stop();
          }
        }, _callee9, this);
      }));
      function getSettings() {
        return _getSettings.apply(this, arguments);
      }
      return getSettings;
    }() // ==================== ADMIN OPERATIONS ====================
  }, {
    key: "updateAutoDeductSettings",
    value: function () {
      var _updateAutoDeductSettings = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(retailer_id, settings) {
        var fields, values, paramIndex, query, result;
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              fields = [];
              values = [];
              paramIndex = 1;
              if (settings.enabled !== undefined) {
                fields.push("enabled = $".concat(paramIndex++));
                values.push(settings.enabled);
              }
              if (settings.deduction_percentage !== undefined) {
                fields.push("deduction_percentage = $".concat(paramIndex++));
                values.push(settings.deduction_percentage);
              }
              if (settings.minimum_balance_rwf !== undefined) {
                fields.push("minimum_balance_rwf = $".concat(paramIndex++));
                values.push(settings.minimum_balance_rwf);
              }
              if (settings.max_daily_deduction_rwf !== undefined) {
                fields.push("max_daily_deduction_rwf = $".concat(paramIndex++));
                values.push(settings.max_daily_deduction_rwf);
              }
              if (!(fields.length === 0)) {
                _context0.next = 1;
                break;
              }
              throw new Error('No settings to update');
            case 1:
              fields.push("updated_at = NOW()");
              values.push(retailer_id);
              query = "\n      INSERT INTO bigcompany.escrow_auto_deductions (retailer_id)\n      VALUES ($".concat(paramIndex, ")\n      ON CONFLICT (retailer_id) DO UPDATE SET ").concat(fields.join(', '), "\n      RETURNING *;\n    ");
              _context0.next = 2;
              return this.db.query(query, values);
            case 2:
              result = _context0.sent;
              return _context0.abrupt("return", result.rows[0]);
            case 3:
            case "end":
              return _context0.stop();
          }
        }, _callee0, this);
      }));
      function updateAutoDeductSettings(_x8, _x9) {
        return _updateAutoDeductSettings.apply(this, arguments);
      }
      return updateAutoDeductSettings;
    }()
  }, {
    key: "raiseDispute",
    value: function () {
      var _raiseDispute = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(escrow_id, reason, raised_by) {
        return _regenerator["default"].wrap(function (_context1) {
          while (1) switch (_context1.prev = _context1.next) {
            case 0:
              _context1.next = 1;
              return this.db.query("UPDATE bigcompany.escrow_transactions\n       SET status = 'disputed',\n           dispute_reason = $1,\n           dispute_raised_by = $2,\n           dispute_raised_at = NOW(),\n           updated_at = NOW()\n       WHERE id = $3", [reason, raised_by, escrow_id]);
            case 1:
            case "end":
              return _context1.stop();
          }
        }, _callee1, this);
      }));
      function raiseDispute(_x0, _x1, _x10) {
        return _raiseDispute.apply(this, arguments);
      }
      return raiseDispute;
    }() // ==================== WHOLESALER QUERIES ====================
  }, {
    key: "getWholesalerPendingEscrows",
    value: function () {
      var _getWholesalerPendingEscrows = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(wholesaler_id) {
        var result;
        return _regenerator["default"].wrap(function (_context10) {
          while (1) switch (_context10.prev = _context10.next) {
            case 0:
              _context10.next = 1;
              return this.db.query("SELECT * FROM bigcompany.escrow_transactions\n       WHERE wholesaler_id = $1 AND status = 'held'\n       ORDER BY auto_release_at ASC", [wholesaler_id]);
            case 1:
              result = _context10.sent;
              return _context10.abrupt("return", result.rows);
            case 2:
            case "end":
              return _context10.stop();
          }
        }, _callee10, this);
      }));
      function getWholesalerPendingEscrows(_x11) {
        return _getWholesalerPendingEscrows.apply(this, arguments);
      }
      return getWholesalerPendingEscrows;
    }()
  }, {
    key: "getWholesalerEscrows",
    value: function () {
      var _getWholesalerEscrows = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(wholesaler_id, status) {
        var query, params, result;
        return _regenerator["default"].wrap(function (_context11) {
          while (1) switch (_context11.prev = _context11.next) {
            case 0:
              query = 'SELECT * FROM bigcompany.escrow_transactions WHERE wholesaler_id = $1';
              params = [wholesaler_id];
              if (status) {
                query += ' AND status = $2';
                params.push(status);
              }
              query += ' ORDER BY created_at DESC';
              _context11.next = 1;
              return this.db.query(query, params);
            case 1:
              result = _context11.sent;
              return _context11.abrupt("return", result.rows);
            case 2:
            case "end":
              return _context11.stop();
          }
        }, _callee11, this);
      }));
      function getWholesalerEscrows(_x12, _x13) {
        return _getWholesalerEscrows.apply(this, arguments);
      }
      return getWholesalerEscrows;
    }()
  }, {
    key: "getWholesalerSummary",
    value: function () {
      var _getWholesalerSummary = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12(wholesaler_id) {
        var result;
        return _regenerator["default"].wrap(function (_context12) {
          while (1) switch (_context12.prev = _context12.next) {
            case 0:
              _context12.next = 1;
              return this.db.query("SELECT\n         COUNT(*) AS total_escrow_transactions,\n         COUNT(*) FILTER (WHERE status = 'held') AS pending_confirmations,\n         COALESCE(SUM(escrow_amount) FILTER (WHERE status = 'held'), 0) AS pending_amount,\n         COALESCE(SUM(escrow_amount) FILTER (WHERE status = 'released'), 0) AS total_received,\n         MAX(released_at) AS last_payment_date\n       FROM bigcompany.escrow_transactions\n       WHERE wholesaler_id = $1", [wholesaler_id]);
            case 1:
              result = _context12.sent;
              return _context12.abrupt("return", result.rows[0]);
            case 2:
            case "end":
              return _context12.stop();
          }
        }, _callee12, this);
      }));
      function getWholesalerSummary(_x14) {
        return _getWholesalerSummary.apply(this, arguments);
      }
      return getWholesalerSummary;
    }()
  }]);
}(_medusa.TransactionBaseService);
var _default = exports["default"] = EscrowService;