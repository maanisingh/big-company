"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.EscrowCronJobs = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _nodeCron = _interopRequireDefault(require("node-cron"));
/**
 * Escrow System Cron Jobs
 *
 * 1. Auto-Release Job: Releases escrows past their auto_release_at date (Daily at 2 AM)
 * 2. Auto-Deduct Job: Deducts repayments from retailer wallets (Daily at 11 PM)
 */
var EscrowCronJobs = exports.EscrowCronJobs = /*#__PURE__*/function () {
  function EscrowCronJobs(container) {
    (0, _classCallCheck2["default"])(this, EscrowCronJobs);
    (0, _defineProperty2["default"])(this, "escrowService", void 0);
    (0, _defineProperty2["default"])(this, "logger", void 0);
    (0, _defineProperty2["default"])(this, "autoReleaseJob", null);
    (0, _defineProperty2["default"])(this, "autoDeductJob", null);
    this.escrowService = container.resolve('escrowService');
    this.logger = container.resolve('logger');
  }

  /**
   * Initialize and start all cron jobs
   */
  return (0, _createClass2["default"])(EscrowCronJobs, [{
    key: "startAll",
    value: function startAll() {
      this.startAutoReleaseJob();
      this.startAutoDeductJob();
      this.logger.info('✅ Escrow cron jobs started successfully');
    }

    /**
     * Stop all cron jobs
     */
  }, {
    key: "stopAll",
    value: function stopAll() {
      if (this.autoReleaseJob) {
        this.autoReleaseJob.stop();
        this.logger.info('⏹️  Auto-release cron job stopped');
      }
      if (this.autoDeductJob) {
        this.autoDeductJob.stop();
        this.logger.info('⏹️  Auto-deduct cron job stopped');
      }
    }

    /**
     * Auto-Release Job
     * Schedule: Daily at 2:00 AM (East Africa Time / UTC+3)
     * Purpose: Release escrows that have passed their auto_release_at date
     */
  }, {
    key: "startAutoReleaseJob",
    value: function startAutoReleaseJob() {
      var _this = this;
      // Cron pattern: 0 2 * * * (minute hour day month weekday)
      // Run at 2:00 AM every day
      this.autoReleaseJob = _nodeCron["default"].schedule('0 2 * * *', /*#__PURE__*/(0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var startTime, releasedCount, duration, _t;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              startTime = Date.now();
              _this.logger.info('🔄 [CRON] Auto-release job started');
              _context.prev = 1;
              _context.next = 2;
              return _this.escrowService.processAutoReleases();
            case 2:
              releasedCount = _context.sent;
              duration = Date.now() - startTime;
              _this.logger.info("\u2705 [CRON] Auto-release job completed: ".concat(releasedCount, " escrows released in ").concat(duration, "ms"));

              // Log to monitoring/metrics system if available
              _this.logMetric('escrow.auto_release.count', releasedCount);
              _this.logMetric('escrow.auto_release.duration_ms', duration);
              _context.next = 4;
              break;
            case 3:
              _context.prev = 3;
              _t = _context["catch"](1);
              _this.logger.error('❌ [CRON] Auto-release job failed:', _t);

              // Send alert to admin (email/Slack/etc)
              _context.next = 4;
              return _this.sendAlert('auto_release_failure', {
                error: _t.message,
                timestamp: new Date().toISOString()
              });
            case 4:
            case "end":
              return _context.stop();
          }
        }, _callee, null, [[1, 3]]);
      })), {
        timezone: 'Africa/Kigali' // Rwanda timezone (EAT)
      });
      this.logger.info('⏰ Auto-release cron job scheduled: Daily at 2:00 AM EAT');
    }

    /**
     * Auto-Deduct Job
     * Schedule: Daily at 11:00 PM (after end-of-day sales reconciliation)
     * Purpose: Deduct repayments from retailer wallets based on daily sales
     */
  }, {
    key: "startAutoDeductJob",
    value: function startAutoDeductJob() {
      var _this2 = this;
      // Cron pattern: 0 23 * * * (minute hour day month weekday)
      // Run at 11:00 PM every day
      this.autoDeductJob = _nodeCron["default"].schedule('0 23 * * *', /*#__PURE__*/(0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2() {
        var startTime, result, duration, _t2;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              startTime = Date.now();
              _this2.logger.info('🔄 [CRON] Auto-deduct job started');
              _context2.prev = 1;
              _context2.next = 2;
              return _this2.escrowService.processAutoDeductions();
            case 2:
              result = _context2.sent;
              duration = Date.now() - startTime;
              _this2.logger.info("\u2705 [CRON] Auto-deduct job completed: ".concat(result.processed, " retailers processed, ") + "".concat(result.total_amount, " RWF deducted in ").concat(duration, "ms"));

              // Log metrics
              _this2.logMetric('escrow.auto_deduct.retailers_processed', result.processed);
              _this2.logMetric('escrow.auto_deduct.total_amount_rwf', result.total_amount);
              _this2.logMetric('escrow.auto_deduct.duration_ms', duration);
              _context2.next = 4;
              break;
            case 3:
              _context2.prev = 3;
              _t2 = _context2["catch"](1);
              _this2.logger.error('❌ [CRON] Auto-deduct job failed:', _t2);

              // Send alert to admin
              _context2.next = 4;
              return _this2.sendAlert('auto_deduct_failure', {
                error: _t2.message,
                timestamp: new Date().toISOString()
              });
            case 4:
            case "end":
              return _context2.stop();
          }
        }, _callee2, null, [[1, 3]]);
      })), {
        timezone: 'Africa/Kigali'
      });
      this.logger.info('⏰ Auto-deduct cron job scheduled: Daily at 11:00 PM EAT');
    }

    /**
     * Manual trigger for auto-release (for testing or manual execution)
     */
  }, {
    key: "triggerAutoRelease",
    value: (function () {
      var _triggerAutoRelease = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3() {
        var releasedCount, _t3;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.prev = 0;
              this.logger.info('🔧 [MANUAL] Triggering auto-release job');
              _context3.next = 1;
              return this.escrowService.processAutoReleases();
            case 1:
              releasedCount = _context3.sent;
              return _context3.abrupt("return", {
                success: true,
                released_count: releasedCount
              });
            case 2:
              _context3.prev = 2;
              _t3 = _context3["catch"](0);
              this.logger.error('❌ [MANUAL] Auto-release trigger failed:', _t3);
              return _context3.abrupt("return", {
                success: false,
                released_count: 0,
                error: _t3.message
              });
            case 3:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this, [[0, 2]]);
      }));
      function triggerAutoRelease() {
        return _triggerAutoRelease.apply(this, arguments);
      }
      return triggerAutoRelease;
    }()
    /**
     * Manual trigger for auto-deduct (for testing or manual execution)
     */
    )
  }, {
    key: "triggerAutoDeduct",
    value: (function () {
      var _triggerAutoDeduct = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4() {
        var result, _t4;
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.prev = 0;
              this.logger.info('🔧 [MANUAL] Triggering auto-deduct job');
              _context4.next = 1;
              return this.escrowService.processAutoDeductions();
            case 1:
              result = _context4.sent;
              return _context4.abrupt("return", {
                success: true,
                result: result
              });
            case 2:
              _context4.prev = 2;
              _t4 = _context4["catch"](0);
              this.logger.error('❌ [MANUAL] Auto-deduct trigger failed:', _t4);
              return _context4.abrupt("return", {
                success: false,
                error: _t4.message
              });
            case 3:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this, [[0, 2]]);
      }));
      function triggerAutoDeduct() {
        return _triggerAutoDeduct.apply(this, arguments);
      }
      return triggerAutoDeduct;
    }()
    /**
     * Get cron job status
     */
    )
  }, {
    key: "getStatus",
    value: function getStatus() {
      return {
        auto_release: {
          running: this.autoReleaseJob !== null && this.autoReleaseJob.getStatus() === 'scheduled',
          schedule: 'Daily at 2:00 AM EAT'
        },
        auto_deduct: {
          running: this.autoDeductJob !== null && this.autoDeductJob.getStatus() === 'scheduled',
          schedule: 'Daily at 11:00 PM EAT'
        }
      };
    }

    /**
     * Log metric to monitoring system (placeholder)
     */
  }, {
    key: "logMetric",
    value: function logMetric(metricName, value) {
      // TODO: Integrate with monitoring system (Prometheus, DataDog, etc.)
      this.logger.debug("\uD83D\uDCCA Metric: ".concat(metricName, " = ").concat(value));
    }

    /**
     * Send alert to admin (placeholder)
     */
  }, {
    key: "sendAlert",
    value: (function () {
      var _sendAlert = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(alertType, data) {
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              // TODO: Integrate with alerting system (email, Slack, PagerDuty, etc.)
              this.logger.warn("\uD83D\uDEA8 ALERT [".concat(alertType, "]:"), JSON.stringify(data));

              // Example: Send email
              // await this.emailService.send({
              //   to: process.env.ADMIN_EMAIL,
              //   subject: `Escrow System Alert: ${alertType}`,
              //   body: JSON.stringify(data, null, 2),
              // });
            case 1:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function sendAlert(_x, _x2) {
        return _sendAlert.apply(this, arguments);
      }
      return sendAlert;
    }())
  }]);
}();
var _default = exports["default"] = EscrowCronJobs;