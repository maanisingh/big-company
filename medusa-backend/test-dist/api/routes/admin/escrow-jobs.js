"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
/**
 * Admin API for managing escrow cron jobs
 * All endpoints require admin authentication
 */

var router = (0, _express.Router)();

// Middleware to ensure admin role
var requireAdmin = function requireAdmin(req, res, next) {
  var user = req.user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }
  next();
};

/**
 * GET /admin/escrow-jobs/status
 * Get status of all escrow cron jobs
 */
router.get('/escrow-jobs/status', requireAdmin, /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var escrowCronJobs, status;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          try {
            escrowCronJobs = req.scope.resolve('escrowCronJobs');
            status = escrowCronJobs.getStatus();
            res.json({
              status: 'ok',
              jobs: status,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: 'Failed to get cron job status',
              details: error.message
            });
          }
        case 1:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}());

/**
 * POST /admin/escrow-jobs/trigger-auto-release
 * Manually trigger auto-release job (for testing or emergency)
 */
router.post('/escrow-jobs/trigger-auto-release', requireAdmin, /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var escrowCronJobs, result, _t;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          escrowCronJobs = req.scope.resolve('escrowCronJobs');
          _context2.next = 1;
          return escrowCronJobs.triggerAutoRelease();
        case 1:
          result = _context2.sent;
          if (result.success) {
            res.json({
              message: 'Auto-release job executed successfully',
              released_count: result.released_count,
              timestamp: new Date().toISOString()
            });
          } else {
            res.status(500).json({
              error: 'Auto-release job failed',
              details: result.error
            });
          }
          _context2.next = 3;
          break;
        case 2:
          _context2.prev = 2;
          _t = _context2["catch"](0);
          res.status(500).json({
            error: 'Failed to trigger auto-release',
            details: _t.message
          });
        case 3:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[0, 2]]);
  }));
  return function (_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}());

/**
 * POST /admin/escrow-jobs/trigger-auto-deduct
 * Manually trigger auto-deduct job (for testing or emergency)
 */
router.post('/escrow-jobs/trigger-auto-deduct', requireAdmin, /*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var escrowCronJobs, result, _t2;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          escrowCronJobs = req.scope.resolve('escrowCronJobs');
          _context3.next = 1;
          return escrowCronJobs.triggerAutoDeduct();
        case 1:
          result = _context3.sent;
          if (result.success) {
            res.json({
              message: 'Auto-deduct job executed successfully',
              processed: result.result.processed,
              total_amount: result.result.total_amount,
              timestamp: new Date().toISOString()
            });
          } else {
            res.status(500).json({
              error: 'Auto-deduct job failed',
              details: result.error
            });
          }
          _context3.next = 3;
          break;
        case 2:
          _context3.prev = 2;
          _t2 = _context3["catch"](0);
          res.status(500).json({
            error: 'Failed to trigger auto-deduct',
            details: _t2.message
          });
        case 3:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[0, 2]]);
  }));
  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}());

/**
 * GET /admin/escrow-jobs/next-run-times
 * Get next scheduled run times for cron jobs
 */
router.get('/escrow-jobs/next-run-times', requireAdmin, /*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var now, nextAutoRelease, nextAutoDeduct;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          try {
            // Calculate next run times based on current time
            now = new Date();
            nextAutoRelease = new Date(now);
            nextAutoRelease.setHours(2, 0, 0, 0);
            if (nextAutoRelease <= now) {
              nextAutoRelease.setDate(nextAutoRelease.getDate() + 1);
            }
            nextAutoDeduct = new Date(now);
            nextAutoDeduct.setHours(23, 0, 0, 0);
            if (nextAutoDeduct <= now) {
              nextAutoDeduct.setDate(nextAutoDeduct.getDate() + 1);
            }
            res.json({
              auto_release: {
                next_run: nextAutoRelease.toISOString(),
                schedule: 'Daily at 2:00 AM EAT'
              },
              auto_deduct: {
                next_run: nextAutoDeduct.toISOString(),
                schedule: 'Daily at 11:00 PM EAT'
              },
              current_time: now.toISOString(),
              timezone: 'Africa/Kigali (EAT)'
            });
          } catch (error) {
            res.status(500).json({
              error: 'Failed to calculate next run times',
              details: error.message
            });
          }
        case 1:
        case "end":
          return _context4.stop();
      }
    }, _callee4);
  }));
  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}());
var _default = exports["default"] = router;