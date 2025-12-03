"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = require("express");
var _wallet = _interopRequireDefault(require("./routes/wallet"));
var _gas = _interopRequireDefault(require("./routes/gas"));
var _loans = _interopRequireDefault(require("./routes/loans"));
var _ussd = _interopRequireDefault(require("./routes/ussd"));
var _nfc = _interopRequireDefault(require("./routes/nfc"));
var _rewards = _interopRequireDefault(require("./routes/rewards"));
var _retailer = _interopRequireDefault(require("./routes/retailer"));
var _wholesaler = _interopRequireDefault(require("./routes/wholesaler"));
var _auth = _interopRequireDefault(require("./routes/auth"));
var _admin = _interopRequireDefault(require("./routes/admin"));
var _store = _interopRequireDefault(require("./routes/store"));
var _default = exports["default"] = function _default(rootDirectory) {
  var router = (0, _express.Router)();

  // Body parser middleware for all custom routes
  router.use((0, _express.json)());
  router.use((0, _express.urlencoded)({
    extended: true
  }));

  // BigCompany Custom API Routes

  // Auth routes (consumer-facing)
  router.use('/store/auth', _auth["default"]);

  // Admin dashboard routes
  router.use('/admin', _admin["default"]);

  // Store routes (customer-facing)
  router.use('/store', _store["default"]); // retailers, categories, products
  router.use('/store/wallet', _wallet["default"]);
  router.use('/store/gas', _gas["default"]);
  router.use('/store/loans', _loans["default"]);
  router.use('/store/nfc', _nfc["default"]);
  router.use('/store/rewards', _rewards["default"]);

  // USSD callback (public endpoint for Africa's Talking)
  router.use('/ussd', _ussd["default"]);

  // POS routes (retailer-facing)
  router.use('/pos/nfc', _nfc["default"]);

  // Retailer Dashboard API routes
  router.use('/retailer', _retailer["default"]);

  // Wholesaler Dashboard API routes
  router.use('/wholesaler', _wholesaler["default"]);

  // Health check
  router.get('/health', function (req, res) {
    res.json({
      status: 'ok',
      service: 'bigcompany-medusa',
      timestamp: new Date().toISOString()
    });
  });

  // Version check
  router.get('/version', function (req, res) {
    res.json({
      version: '1.3.0',
      build: '2024-11-30-v3',
      buildTimestamp: Date.now().toString(),
      features: ['retailer-orders', 'credit-requests', 'enhanced-dashboards', 'admin-reports', 'branch-management']
    });
  });
  return router;
};