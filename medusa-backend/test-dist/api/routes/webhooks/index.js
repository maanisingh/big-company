"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _queue = require("../../../workers/queue");
var router = (0, _express.Router)();

/**
 * MTN MoMo Payment Callback
 * POST /webhooks/momo
 */
router.post('/momo', /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _req$body, financialTransactionId, externalId, amount, currency, payer, status, reason, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _req$body = req.body, financialTransactionId = _req$body.financialTransactionId, externalId = _req$body.externalId, amount = _req$body.amount, currency = _req$body.currency, payer = _req$body.payer, status = _req$body.status, reason = _req$body.reason;
          console.log('[MoMo Webhook] Received callback:', {
            financialTransactionId: financialTransactionId,
            status: status,
            amount: amount
          });

          // Add job to process the payment
          _context.next = 1;
          return (0, _queue.addPaymentJob)({
            type: 'momo_callback',
            customerId: externalId,
            amount: parseFloat(amount),
            reference: financialTransactionId,
            provider: 'mtn_momo',
            phone: (payer === null || payer === void 0 ? void 0 : payer.partyId) || '',
            status: status,
            metadata: {
              currency: currency,
              reason: reason
            }
          });
        case 1:
          res.json({
            success: true,
            message: 'Callback received'
          });
          _context.next = 3;
          break;
        case 2:
          _context.prev = 2;
          _t = _context["catch"](0);
          console.error('[MoMo Webhook] Error:', _t);
          res.status(500).json({
            success: false,
            error: _t.message
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
}());

/**
 * Airtel Money Payment Callback
 * POST /webhooks/airtel
 */
router.post('/airtel', /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var transaction, _ref3, id, airtel_money_id, amount, msisdn, status, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          transaction = req.body.transaction;
          _ref3 = transaction || {}, id = _ref3.id, airtel_money_id = _ref3.airtel_money_id, amount = _ref3.amount, msisdn = _ref3.msisdn, status = _ref3.status;
          console.log('[Airtel Webhook] Received callback:', {
            airtel_money_id: airtel_money_id,
            status: status,
            amount: amount
          });

          // Airtel uses 'TS' for successful transactions
          _context2.next = 1;
          return (0, _queue.addPaymentJob)({
            type: 'airtel_callback',
            customerId: id,
            amount: parseFloat(amount),
            reference: airtel_money_id,
            provider: 'airtel_money',
            phone: msisdn,
            status: status
          });
        case 1:
          res.json({
            status: 'OK'
          });
          _context2.next = 3;
          break;
        case 2:
          _context2.prev = 2;
          _t2 = _context2["catch"](0);
          console.error('[Airtel Webhook] Error:', _t2);
          res.status(500).json({
            status: 'FAILED',
            error: _t2.message
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
 * Generic Payment Provider Callback
 * POST /webhooks/payment
 */
router.post('/payment', /*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var _req$body2, provider, customer_id, amount, reference, phone, status, metadata, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _req$body2 = req.body, provider = _req$body2.provider, customer_id = _req$body2.customer_id, amount = _req$body2.amount, reference = _req$body2.reference, phone = _req$body2.phone, status = _req$body2.status, metadata = _req$body2.metadata;
          console.log('[Payment Webhook] Received:', {
            provider: provider,
            reference: reference,
            status: status
          });
          _context3.next = 1;
          return (0, _queue.addPaymentJob)({
            type: 'wallet_topup',
            customerId: customer_id,
            amount: parseFloat(amount),
            reference: reference,
            provider: provider,
            phone: phone,
            status: status || 'SUCCESSFUL',
            metadata: metadata
          });
        case 1:
          res.json({
            success: true
          });
          _context3.next = 3;
          break;
        case 2:
          _context3.prev = 2;
          _t3 = _context3["catch"](0);
          console.error('[Payment Webhook] Error:', _t3);
          res.status(500).json({
            success: false,
            error: _t3.message
          });
        case 3:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[0, 2]]);
  }));
  return function (_x5, _x6) {
    return _ref4.apply(this, arguments);
  };
}());

/**
 * B2B Credit Order Created/Updated
 * POST /webhooks/credit-order
 */
router.post('/credit-order', /*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$body3, event, order_id, retailer_id, wholesaler_id, amount, retailer_phone, wholesaler_phone, credit_score, auto_approve_limit, reason, days_overdue, jobType, _t4;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _req$body3 = req.body, event = _req$body3.event, order_id = _req$body3.order_id, retailer_id = _req$body3.retailer_id, wholesaler_id = _req$body3.wholesaler_id, amount = _req$body3.amount, retailer_phone = _req$body3.retailer_phone, wholesaler_phone = _req$body3.wholesaler_phone, credit_score = _req$body3.credit_score, auto_approve_limit = _req$body3.auto_approve_limit, reason = _req$body3.reason, days_overdue = _req$body3.days_overdue;
          console.log('[Credit Webhook] Event:', event, 'Order:', order_id);
          jobType = event === 'created' ? 'credit_request' : event === 'approved' ? 'credit_approved' : event === 'rejected' ? 'credit_rejected' : 'payment_due';
          _context4.next = 1;
          return (0, _queue.addCreditJob)({
            type: jobType,
            orderId: order_id,
            retailerId: retailer_id,
            wholesalerId: wholesaler_id,
            amount: parseFloat(amount),
            retailerPhone: retailer_phone,
            wholesalerPhone: wholesaler_phone,
            metadata: {
              creditScore: credit_score,
              autoApproveLimit: auto_approve_limit,
              reason: reason,
              daysOverdue: days_overdue
            }
          });
        case 1:
          res.json({
            success: true
          });
          _context4.next = 3;
          break;
        case 2:
          _context4.prev = 2;
          _t4 = _context4["catch"](0);
          console.error('[Credit Webhook] Error:', _t4);
          res.status(500).json({
            success: false,
            error: _t4.message
          });
        case 3:
        case "end":
          return _context4.stop();
      }
    }, _callee4, null, [[0, 2]]);
  }));
  return function (_x7, _x8) {
    return _ref5.apply(this, arguments);
  };
}());
var _default = exports["default"] = router;