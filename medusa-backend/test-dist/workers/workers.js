"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startWorkers = exports.smsWorker = exports.paymentWorker = exports.loanWorker = exports.gasWorker = exports.creditWorker = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _bullmq = require("bullmq");
var _queue = require("./queue");
var _sms = _interopRequireDefault(require("../services/sms"));
var _blnk = _interopRequireDefault(require("../services/blnk"));
// Only initialize workers if REDIS_URL is properly set
var REDIS_URL = process.env.REDIS_URL;
var shouldStartWorkers = REDIS_URL && REDIS_URL !== 'redis://localhost:6379' && REDIS_URL.includes('://');

// Lazy initialization - only create instances when workers actually start
var smsService;
var blnkService;

// Worker instances (initialized lazily)
var paymentWorker = exports.paymentWorker = null;
var smsWorker = exports.smsWorker = null;
var loanWorker = exports.loanWorker = null;
var gasWorker = exports.gasWorker = null;
var creditWorker = exports.creditWorker = null;

// Only create workers if Redis is properly configured
if (!shouldStartWorkers) {
  console.log('[Workers] Skipping worker initialization - Redis not configured');
} else {
  console.log('[Workers] Initializing workers with Redis:', (REDIS_URL === null || REDIS_URL === void 0 ? void 0 : REDIS_URL.substring(0, 20)) + '...');
  smsService = new _sms["default"]();
  blnkService = new _blnk["default"]();

  // Payment Worker - handles MoMo/Airtel callbacks and wallet operations
  exports.paymentWorker = paymentWorker = new _bullmq.Worker('payments', /*#__PURE__*/function () {
    var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(job) {
      var _job$data, type, customerId, amount, reference, provider, phone, status, walletId, message, _t;
      return _regenerator["default"].wrap(function (_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _job$data = job.data, type = _job$data.type, customerId = _job$data.customerId, amount = _job$data.amount, reference = _job$data.reference, provider = _job$data.provider, phone = _job$data.phone, status = _job$data.status;
            console.log("[Payment Worker] Processing ".concat(type, " job:"), job.id);
            if (!(status !== 'SUCCESSFUL' && status !== 'TS')) {
              _context.next = 1;
              break;
            }
            console.log("[Payment Worker] Payment failed, logging failure");
            // Log failure in database
            return _context.abrupt("return", {
              success: false,
              reason: 'Payment not successful'
            });
          case 1:
            _context.prev = 1;
            // Credit the customer's wallet via Blnk
            walletId = "wallet_".concat(customerId);
            _context.next = 2;
            return blnkService.topUpWallet(walletId, amount, reference);
          case 2:
            // Send confirmation SMS
            message = "Your BIG wallet has been credited with ".concat(amount.toLocaleString(), " RWF via ").concat(provider === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money', ". Ref: ").concat(reference);
            _context.next = 3;
            return smsService.sendSms(phone, message);
          case 3:
            console.log("[Payment Worker] Successfully processed payment for ".concat(customerId));
            return _context.abrupt("return", {
              success: true,
              walletId: walletId,
              amount: amount
            });
          case 4:
            _context.prev = 4;
            _t = _context["catch"](1);
            console.error("[Payment Worker] Error processing payment:", _t);
            throw _t;
          case 5:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[1, 4]]);
    }));
    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }(), {
    connection: _queue.connection,
    concurrency: 5
  });

  // SMS Worker - handles all SMS notifications
  var _smsWorker = new _bullmq.Worker('sms', /*#__PURE__*/function () {
    var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(job) {
      var _job$data2, type, phone, message, _t2;
      return _regenerator["default"].wrap(function (_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _job$data2 = job.data, type = _job$data2.type, phone = _job$data2.phone, message = _job$data2.message;
            console.log("[SMS Worker] Sending ".concat(type, " SMS to ").concat(phone));
            _context2.prev = 1;
            _context2.next = 2;
            return smsService.sendSms(phone, message);
          case 2:
            console.log("[SMS Worker] SMS sent successfully");
            return _context2.abrupt("return", {
              success: true,
              phone: phone,
              type: type
            });
          case 3:
            _context2.prev = 3;
            _t2 = _context2["catch"](1);
            console.error("[SMS Worker] Error sending SMS:", _t2);
            throw _t2;
          case 4:
          case "end":
            return _context2.stop();
        }
      }, _callee2, null, [[1, 3]]);
    }));
    return function (_x2) {
      return _ref2.apply(this, arguments);
    };
  }(), {
    connection: _queue.connection,
    concurrency: 10
  });

  // Loan Worker - handles loan applications, approvals, disbursements
  var _loanWorker = new _bullmq.Worker('loans', /*#__PURE__*/function () {
    var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(job) {
      var _job$data3, type, loanId, customerId, amount, phone, metadata, eligible, _walletId, dueDate, walletId, due, daysUntilDue, _t3, _t4;
      return _regenerator["default"].wrap(function (_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _job$data3 = job.data, type = _job$data3.type, loanId = _job$data3.loanId, customerId = _job$data3.customerId, amount = _job$data3.amount, phone = _job$data3.phone, metadata = _job$data3.metadata;
            console.log("[Loan Worker] Processing ".concat(type, " for loan ").concat(loanId));
            _context3.prev = 1;
            _t3 = type;
            _context3.next = _t3 === 'application' ? 2 : _t3 === 'approval' ? 9 : _t3 === 'repayment_reminder' ? 12 : 14;
            break;
          case 2:
            // Check eligibility (simplified - in production, check credit score, history, etc.)
            eligible = amount <= 100000; // Auto-approve up to 100k RWF
            if (!(eligible && amount <= 50000)) {
              _context3.next = 5;
              break;
            }
            // Auto-approve small loans
            _walletId = "wallet_".concat(customerId);
            _context3.next = 3;
            return blnkService.disburseLoan(_walletId, amount, "LOAN-".concat(loanId));
          case 3:
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            _context3.next = 4;
            return smsService.sendLoanApproval(phone, amount, dueDate.toLocaleDateString());
          case 4:
            return _context3.abrupt("return", {
              success: true,
              status: 'approved',
              disbursed: true
            });
          case 5:
            if (!eligible) {
              _context3.next = 7;
              break;
            }
            _context3.next = 6;
            return smsService.sendSms(phone, "BIG: Your loan application for ".concat(amount.toLocaleString(), " RWF is under review. You'll receive an SMS within 24 hours."));
          case 6:
            return _context3.abrupt("return", {
              success: true,
              status: 'pending_review'
            });
          case 7:
            _context3.next = 8;
            return smsService.sendSms(phone, "BIG: Sorry, your loan application was not approved. Please try a smaller amount or contact support.");
          case 8:
            return _context3.abrupt("return", {
              success: true,
              status: 'rejected'
            });
          case 9:
            // Disburse approved loan
            walletId = "wallet_".concat(customerId);
            _context3.next = 10;
            return blnkService.disburseLoan(walletId, amount, "LOAN-".concat(loanId));
          case 10:
            due = new Date();
            due.setDate(due.getDate() + 30);
            _context3.next = 11;
            return smsService.sendLoanApproval(phone, amount, due.toLocaleDateString());
          case 11:
            return _context3.abrupt("return", {
              success: true,
              status: 'disbursed'
            });
          case 12:
            daysUntilDue = (metadata === null || metadata === void 0 ? void 0 : metadata.daysUntilDue) || 3;
            _context3.next = 13;
            return smsService.sendSms(phone, "BIG: Reminder - Your loan of ".concat(amount.toLocaleString(), " RWF is due in ").concat(daysUntilDue, " days. Dial *939# to repay now."));
          case 13:
            return _context3.abrupt("return", {
              success: true,
              status: 'reminder_sent'
            });
          case 14:
            return _context3.abrupt("return", {
              success: false,
              reason: 'Unknown loan job type'
            });
          case 15:
            _context3.next = 17;
            break;
          case 16:
            _context3.prev = 16;
            _t4 = _context3["catch"](1);
            console.error("[Loan Worker] Error:", _t4);
            throw _t4;
          case 17:
          case "end":
            return _context3.stop();
        }
      }, _callee3, null, [[1, 16]]);
    }));
    return function (_x3) {
      return _ref3.apply(this, arguments);
    };
  }(), {
    connection: _queue.connection,
    concurrency: 3
  });

  // Gas Worker - handles gas top-up requests
  var _gasWorker = new _bullmq.Worker('gas', /*#__PURE__*/function () {
    var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(job) {
      var _job$data4, type, customerId, meterNumber, amount, phone, token, units, walletId, gasToken, gasUnits, refundWalletId, _t5, _t6;
      return _regenerator["default"].wrap(function (_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            _job$data4 = job.data, type = _job$data4.type, customerId = _job$data4.customerId, meterNumber = _job$data4.meterNumber, amount = _job$data4.amount, phone = _job$data4.phone, token = _job$data4.token, units = _job$data4.units;
            console.log("[Gas Worker] Processing ".concat(type, " for meter ").concat(meterNumber));
            _context4.prev = 1;
            _t5 = type;
            _context4.next = _t5 === 'topup_request' ? 2 : _t5 === 'topup_complete' ? 5 : _t5 === 'topup_failed' ? 7 : 10;
            break;
          case 2:
            // Debit wallet first
            walletId = "wallet_".concat(customerId);
            _context4.next = 3;
            return blnkService.payFromWallet(walletId, amount, "GAS-".concat(meterNumber, "-").concat(Date.now()));
          case 3:
            // In production: Call actual gas provider API here
            // Simulating gas provider response
            gasToken = "TOKEN-".concat(Math.random().toString(36).substring(7).toUpperCase());
            gasUnits = Math.floor(amount / 100); // Simplified: 100 RWF per unit
            _context4.next = 4;
            return smsService.sendGasTopupConfirmation(phone, meterNumber, amount, gasUnits, gasToken);
          case 4:
            return _context4.abrupt("return", {
              success: true,
              token: gasToken,
              units: gasUnits
            });
          case 5:
            _context4.next = 6;
            return smsService.sendGasTopupConfirmation(phone, meterNumber, amount, units, token);
          case 6:
            return _context4.abrupt("return", {
              success: true
            });
          case 7:
            // Refund the customer
            refundWalletId = "wallet_".concat(customerId);
            _context4.next = 8;
            return blnkService.topUpWallet(refundWalletId, amount, "REFUND-GAS-".concat(meterNumber));
          case 8:
            _context4.next = 9;
            return smsService.sendSms(phone, "BIG: Gas topup failed. Your ".concat(amount.toLocaleString(), " RWF has been refunded to your wallet."));
          case 9:
            return _context4.abrupt("return", {
              success: true,
              refunded: true
            });
          case 10:
            return _context4.abrupt("return", {
              success: false,
              reason: 'Unknown gas job type'
            });
          case 11:
            _context4.next = 13;
            break;
          case 12:
            _context4.prev = 12;
            _t6 = _context4["catch"](1);
            console.error("[Gas Worker] Error:", _t6);
            throw _t6;
          case 13:
          case "end":
            return _context4.stop();
        }
      }, _callee4, null, [[1, 12]]);
    }));
    return function (_x4) {
      return _ref4.apply(this, arguments);
    };
  }(), {
    connection: _queue.connection,
    concurrency: 3
  });

  // Credit Worker - handles B2B credit approvals
  var _creditWorker = new _bullmq.Worker('credit', /*#__PURE__*/function () {
    var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(job) {
      var _job$data5, type, orderId, retailerId, wholesalerId, amount, retailerPhone, wholesalerPhone, metadata, creditScore, autoApproveLimit, dueDate, reason, daysOverdue, _t7, _t8;
      return _regenerator["default"].wrap(function (_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            _job$data5 = job.data, type = _job$data5.type, orderId = _job$data5.orderId, retailerId = _job$data5.retailerId, wholesalerId = _job$data5.wholesalerId, amount = _job$data5.amount, retailerPhone = _job$data5.retailerPhone, wholesalerPhone = _job$data5.wholesalerPhone, metadata = _job$data5.metadata;
            console.log("[Credit Worker] Processing ".concat(type, " for order ").concat(orderId));
            _context5.prev = 1;
            _t7 = type;
            _context5.next = _t7 === 'credit_request' ? 2 : _t7 === 'credit_approved' ? 9 : _t7 === 'credit_rejected' ? 11 : _t7 === 'payment_due' ? 13 : 17;
            break;
          case 2:
            // Check retailer's credit score (simplified)
            creditScore = (metadata === null || metadata === void 0 ? void 0 : metadata.creditScore) || 75;
            autoApproveLimit = (metadata === null || metadata === void 0 ? void 0 : metadata.autoApproveLimit) || 200000;
            if (!(creditScore >= 70 && amount <= autoApproveLimit)) {
              _context5.next = 4;
              break;
            }
            // Auto-approve
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);
            _context5.next = 3;
            return smsService.sendSms(retailerPhone, "BIG: Your credit order #".concat(orderId, " for ").concat(amount.toLocaleString(), " RWF has been APPROVED! Due: ").concat(dueDate.toLocaleDateString()));
          case 3:
            return _context5.abrupt("return", {
              success: true,
              status: 'approved',
              autoApproved: true
            });
          case 4:
            if (!(creditScore >= 70)) {
              _context5.next = 7;
              break;
            }
            if (!wholesalerPhone) {
              _context5.next = 5;
              break;
            }
            _context5.next = 5;
            return smsService.sendSms(wholesalerPhone, "BIG: Credit request from retailer for ".concat(amount.toLocaleString(), " RWF needs your approval. Check dashboard."));
          case 5:
            _context5.next = 6;
            return smsService.sendSms(retailerPhone, "BIG: Your credit order #".concat(orderId, " is under review. You'll be notified once approved."));
          case 6:
            return _context5.abrupt("return", {
              success: true,
              status: 'pending_approval'
            });
          case 7:
            _context5.next = 8;
            return smsService.sendSms(retailerPhone, "BIG: Sorry, your credit order #".concat(orderId, " was declined. Please contact your wholesaler."));
          case 8:
            return _context5.abrupt("return", {
              success: true,
              status: 'rejected'
            });
          case 9:
            _context5.next = 10;
            return smsService.sendSms(retailerPhone, "BIG: Great news! Your credit order #".concat(orderId, " for ").concat(amount.toLocaleString(), " RWF has been approved by the wholesaler!"));
          case 10:
            return _context5.abrupt("return", {
              success: true
            });
          case 11:
            reason = (metadata === null || metadata === void 0 ? void 0 : metadata.reason) || 'Not approved';
            _context5.next = 12;
            return smsService.sendSms(retailerPhone, "BIG: Your credit order #".concat(orderId, " was not approved. Reason: ").concat(reason));
          case 12:
            return _context5.abrupt("return", {
              success: true
            });
          case 13:
            daysOverdue = (metadata === null || metadata === void 0 ? void 0 : metadata.daysOverdue) || 0;
            if (!(daysOverdue > 0)) {
              _context5.next = 15;
              break;
            }
            _context5.next = 14;
            return smsService.sendSms(retailerPhone, "BIG: URGENT - Your credit payment of ".concat(amount.toLocaleString(), " RWF is ").concat(daysOverdue, " days overdue. Please pay immediately to maintain your credit standing."));
          case 14:
            _context5.next = 16;
            break;
          case 15:
            _context5.next = 16;
            return smsService.sendSms(retailerPhone, "BIG: Reminder - Your credit payment of ".concat(amount.toLocaleString(), " RWF is due today. Dial *939# or visit the app to pay."));
          case 16:
            return _context5.abrupt("return", {
              success: true
            });
          case 17:
            return _context5.abrupt("return", {
              success: false,
              reason: 'Unknown credit job type'
            });
          case 18:
            _context5.next = 20;
            break;
          case 19:
            _context5.prev = 19;
            _t8 = _context5["catch"](1);
            console.error("[Credit Worker] Error:", _t8);
            throw _t8;
          case 20:
          case "end":
            return _context5.stop();
        }
      }, _callee5, null, [[1, 19]]);
    }));
    return function (_x5) {
      return _ref5.apply(this, arguments);
    };
  }(), {
    connection: _queue.connection,
    concurrency: 3
  });

  // Error handlers - only attach if workers were created
  var workers = [paymentWorker, _smsWorker, _loanWorker, _gasWorker, _creditWorker].filter(Boolean);
  workers.forEach(function (worker) {
    worker.on('failed', function (job, err) {
      console.error("[".concat(worker.name, "] Job ").concat(job === null || job === void 0 ? void 0 : job.id, " failed:"), err.message);
    });
    worker.on('completed', function (job) {
      console.log("[".concat(worker.name, "] Job ").concat(job.id, " completed"));
    });
  });
} // End of if (shouldStartWorkers) block

// Start all workers
var startWorkers = exports.startWorkers = function startWorkers() {
  if (!shouldStartWorkers) {
    console.log('[Workers] Workers not started - Redis not configured');
    return;
  }
  console.log('[Workers] All job workers started successfully');
};