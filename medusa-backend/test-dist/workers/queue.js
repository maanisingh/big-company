"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.smsQueue = exports.paymentQueue = exports.loanQueue = exports.gasQueue = exports.creditQueue = exports.connection = exports.addSmsJob = exports.addPaymentJob = exports.addLoanJob = exports.addGasJob = exports.addCreditJob = void 0;
var _bullmq = require("bullmq");
var _ioredis = _interopRequireDefault(require("ioredis"));
// Redis connection - only initialize if REDIS_URL is properly set
var REDIS_URL = process.env.REDIS_URL;
var shouldConnectRedis = REDIS_URL && REDIS_URL !== 'redis://localhost:6379' && REDIS_URL.includes('://');
var connection = exports.connection = null;
var paymentQueue = exports.paymentQueue = null;
var smsQueue = exports.smsQueue = null;
var loanQueue = exports.loanQueue = null;
var gasQueue = exports.gasQueue = null;
var creditQueue = exports.creditQueue = null;
if (shouldConnectRedis) {
  console.log('[Queue] Initializing Redis connection...');
  exports.connection = connection = new _ioredis["default"](REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true // Don't connect until needed
  });

  // Define queues for different job types
  exports.paymentQueue = paymentQueue = new _bullmq.Queue('payments', {
    connection: connection
  });
  exports.smsQueue = smsQueue = new _bullmq.Queue('sms', {
    connection: connection
  });
  exports.loanQueue = loanQueue = new _bullmq.Queue('loans', {
    connection: connection
  });
  exports.gasQueue = gasQueue = new _bullmq.Queue('gas', {
    connection: connection
  });
  exports.creditQueue = creditQueue = new _bullmq.Queue('credit', {
    connection: connection
  });
  console.log('[Queue] Redis queues initialized');
} else {
  console.log('[Queue] Skipping Redis initialization - REDIS_URL not configured');
}

// Job types

// Helper functions to add jobs - they return null if queues aren't initialized
var addPaymentJob = exports.addPaymentJob = function addPaymentJob(data) {
  if (!paymentQueue) {
    console.warn('[Queue] Payment queue not available - job not added');
    return Promise.resolve(null);
  }
  return paymentQueue.add(data.type, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });
};
var addSmsJob = exports.addSmsJob = function addSmsJob(data) {
  if (!smsQueue) {
    console.warn('[Queue] SMS queue not available - job not added');
    return Promise.resolve(null);
  }
  return smsQueue.add(data.type, data, {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 2000
    }
  });
};
var addLoanJob = exports.addLoanJob = function addLoanJob(data) {
  if (!loanQueue) {
    console.warn('[Queue] Loan queue not available - job not added');
    return Promise.resolve(null);
  }
  return loanQueue.add(data.type, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });
};
var addGasJob = exports.addGasJob = function addGasJob(data) {
  if (!gasQueue) {
    console.warn('[Queue] Gas queue not available - job not added');
    return Promise.resolve(null);
  }
  return gasQueue.add(data.type, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });
};
var addCreditJob = exports.addCreditJob = function addCreditJob(data) {
  if (!creditQueue) {
    console.warn('[Queue] Credit queue not available - job not added');
    return Promise.resolve(null);
  }
  return creditQueue.add(data.type, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  });
};