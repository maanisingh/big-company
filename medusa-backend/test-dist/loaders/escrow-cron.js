"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _escrowCron = require("../jobs/escrow-cron");
/**
 * Escrow Cron Job Loader
 *
 * Initializes and starts escrow-related cron jobs when the Medusa server starts.
 * This loader is called during the application bootstrap process.
 */
var _default = exports["default"] = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(container) {
    var logger, _escrowCronJobs, escrowCronJobs, status;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          logger = container.resolve('logger');
          try {
            logger.info('⏰ Initializing escrow cron jobs...');

            // Register EscrowCronJobs as a singleton in the container
            if (!container.hasRegistration('escrowCronJobs')) {
              _escrowCronJobs = new _escrowCron.EscrowCronJobs(container);
              container.register('escrowCronJobs', {
                resolve: function resolve() {
                  return _escrowCronJobs;
                }
              });
            }

            // Get the registered instance and start jobs
            escrowCronJobs = container.resolve('escrowCronJobs');
            escrowCronJobs.startAll();
            logger.info('✅ Escrow cron jobs initialized and started');

            // Log the schedule for visibility
            status = escrowCronJobs.getStatus();
            logger.info("   \uD83D\uDCC5 Auto-release: ".concat(status.auto_release.schedule, " (").concat(status.auto_release.running ? 'RUNNING' : 'STOPPED', ")"));
            logger.info("   \uD83D\uDCC5 Auto-deduct: ".concat(status.auto_deduct.schedule, " (").concat(status.auto_deduct.running ? 'RUNNING' : 'STOPPED', ")"));
          } catch (error) {
            logger.error('❌ Failed to initialize escrow cron jobs:', error);
            // Don't throw - allow server to start even if cron jobs fail
            // Admin can manually trigger jobs via API if needed
          }
        case 1:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return function (_x) {
    return _ref.apply(this, arguments);
  };
}();