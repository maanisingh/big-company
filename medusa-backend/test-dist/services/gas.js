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
var _axios = _interopRequireDefault(require("axios"));
var _pg = require("pg");
var _uuid = require("uuid");
// Rwanda Gas/Electricity providers
// RECO/EUCL for electricity, various for gas
// This implementation supports multiple providers
var GasService = /*#__PURE__*/function () {
  function GasService() {
    (0, _classCallCheck2["default"])(this, GasService);
    (0, _defineProperty2["default"])(this, "db", void 0);
    (0, _defineProperty2["default"])(this, "providers", new Map());
    (0, _defineProperty2["default"])(this, "predefinedAmounts", [300, 500, 1000, 2000, 5000, 10000]);
    this.db = new _pg.Pool({
      connectionString: process.env.DATABASE_URL
    });

    // Initialize provider clients
    this.initializeProviders();
  }
  return (0, _createClass2["default"])(GasService, [{
    key: "initializeProviders",
    value: function initializeProviders() {
      // EUCL/RECO Rwanda Electricity (also handles prepaid gas meters)
      if (process.env.EUCL_API_URL) {
        this.providers.set('eucl', _axios["default"].create({
          baseURL: process.env.EUCL_API_URL,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': "Bearer ".concat(process.env.EUCL_API_KEY)
          }
        }));
      }

      // SP (Service Provider) for prepaid utilities via IremboGov
      if (process.env.IREMBO_API_URL) {
        this.providers.set('irembo', _axios["default"].create({
          baseURL: process.env.IREMBO_API_URL,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.IREMBO_API_KEY || ''
          }
        }));
      }

      // PayGo/UpOwa style prepaid gas meters
      if (process.env.PAYGO_API_URL) {
        this.providers.set('paygo', _axios["default"].create({
          baseURL: process.env.PAYGO_API_URL,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': "Bearer ".concat(process.env.PAYGO_API_KEY)
          }
        }));
      }

      // Generic STS (Standard Transfer Specification) provider
      // Most prepaid meters in Africa use STS protocol
      if (process.env.STS_VENDOR_URL) {
        this.providers.set('sts', _axios["default"].create({
          baseURL: process.env.STS_VENDOR_URL,
          headers: {
            'Content-Type': 'application/json',
            'X-Vendor-Code': process.env.STS_VENDOR_CODE || '',
            'X-API-Key': process.env.STS_API_KEY || ''
          }
        }));
      }
    }

    /**
     * Validate meter number and get customer info
     */
  }, {
    key: "validateMeter",
    value: (function () {
      var _validateMeter = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(meterNumber) {
        var cleanMeter, stsClient, response, euclClient, _response, _t, _t2;
        return _regenerator["default"].wrap(function (_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              // Clean meter number
              cleanMeter = meterNumber.replace(/\D/g, ''); // Try STS provider first (most common)
              stsClient = this.providers.get('sts');
              if (!stsClient) {
                _context.next = 5;
                break;
              }
              _context.prev = 1;
              _context.next = 2;
              return stsClient.post('/meter/validate', {
                meterNumber: cleanMeter
              });
            case 2:
              response = _context.sent;
              if (!response.data.valid) {
                _context.next = 3;
                break;
              }
              return _context.abrupt("return", {
                meterNumber: cleanMeter,
                customerName: response.data.customerName,
                address: response.data.address,
                tariff: response.data.tariff,
                balance: response.data.balance
              });
            case 3:
              _context.next = 5;
              break;
            case 4:
              _context.prev = 4;
              _t = _context["catch"](1);
              console.log('STS validation failed, trying other providers...');
            case 5:
              // Try EUCL
              euclClient = this.providers.get('eucl');
              if (!euclClient) {
                _context.next = 9;
                break;
              }
              _context.prev = 6;
              _context.next = 7;
              return euclClient.get("/meters/".concat(cleanMeter));
            case 7:
              _response = _context.sent;
              return _context.abrupt("return", {
                meterNumber: cleanMeter,
                customerName: _response.data.customer_name,
                address: _response.data.location,
                tariff: _response.data.tariff_code
              });
            case 8:
              _context.prev = 8;
              _t2 = _context["catch"](6);
              console.log('EUCL validation failed...');
            case 9:
              if (!(this.providers.size === 0)) {
                _context.next = 10;
                break;
              }
              if (!(cleanMeter.length >= 11)) {
                _context.next = 10;
                break;
              }
              return _context.abrupt("return", {
                meterNumber: cleanMeter,
                customerName: 'Test Customer',
                address: 'Kigali, Rwanda',
                tariff: 'RESIDENTIAL'
              });
            case 10:
              return _context.abrupt("return", null);
            case 11:
            case "end":
              return _context.stop();
          }
        }, _callee, this, [[1, 4], [6, 8]]);
      }));
      function validateMeter(_x) {
        return _validateMeter.apply(this, arguments);
      }
      return validateMeter;
    }()
    /**
     * Purchase gas/electricity units
     */
    )
  }, {
    key: "purchaseUnits",
    value: (function () {
      var _purchaseUnits = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(request) {
        var meterNumber, amount, customerId, phone, cleanMeter, meterInfo, transactionId, result;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              meterNumber = request.meterNumber, amount = request.amount, customerId = request.customerId, phone = request.phone; // Validate amount
              if (this.predefinedAmounts.includes(amount)) {
                _context2.next = 1;
                break;
              }
              return _context2.abrupt("return", {
                success: false,
                error: "Invalid amount. Valid amounts: ".concat(this.predefinedAmounts.join(', '), " RWF")
              });
            case 1:
              // Clean and validate meter
              cleanMeter = meterNumber.replace(/\D/g, '');
              _context2.next = 2;
              return this.validateMeter(cleanMeter);
            case 2:
              meterInfo = _context2.sent;
              if (meterInfo) {
                _context2.next = 3;
                break;
              }
              return _context2.abrupt("return", {
                success: false,
                error: 'Invalid meter number'
              });
            case 3:
              transactionId = "GAS-".concat(Date.now(), "-").concat((0, _uuid.v4)().substring(0, 8)); // Record the transaction
              _context2.next = 4;
              return this.db.query("\n      INSERT INTO bigcompany.utility_topups\n      (user_id, amount, currency, status, provider_reference, metadata)\n      VALUES ($1, $2, 'RWF', 'processing', $3, $4)\n    ", [customerId, amount, transactionId, JSON.stringify({
                meter_number: cleanMeter,
                phone: phone,
                meter_info: meterInfo
              })]);
            case 4:
              _context2.next = 5;
              return this.executePurchase(cleanMeter, amount, transactionId);
            case 5:
              result = _context2.sent;
              if (!result.success) {
                _context2.next = 8;
                break;
              }
              _context2.next = 6;
              return this.db.query("\n        UPDATE bigcompany.utility_topups\n        SET status = 'success', token = $1, units_purchased = $2\n        WHERE provider_reference = $3\n      ", [result.token, result.units, transactionId]);
            case 6:
              _context2.next = 7;
              return this.linkMeterToUser(customerId, cleanMeter, meterInfo);
            case 7:
              return _context2.abrupt("return", {
                success: true,
                transactionId: transactionId,
                token: result.token,
                units: result.units,
                message: "Successfully purchased ".concat(result.units, " units for meter ").concat(cleanMeter)
              });
            case 8:
              _context2.next = 9;
              return this.db.query("\n        UPDATE bigcompany.utility_topups\n        SET status = 'failed', metadata = metadata || $1\n        WHERE provider_reference = $2\n      ", [JSON.stringify({
                error: result.error
              }), transactionId]);
            case 9:
              return _context2.abrupt("return", {
                success: false,
                error: result.error || 'Failed to purchase units'
              });
            case 10:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function purchaseUnits(_x2) {
        return _purchaseUnits.apply(this, arguments);
      }
      return purchaseUnits;
    }()
    /**
     * Execute purchase with providers
     */
    )
  }, {
    key: "executePurchase",
    value: (function () {
      var _executePurchase = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(meterNumber, amount, reference) {
        var stsClient, response, _error$response, euclClient, _response2, _error$response2, unitsPerRwf, units, token, _t3, _t4;
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              // Try STS provider
              stsClient = this.providers.get('sts');
              if (!stsClient) {
                _context3.next = 5;
                break;
              }
              _context3.prev = 1;
              _context3.next = 2;
              return stsClient.post('/vend', {
                meterNumber: meterNumber,
                amount: amount,
                currency: 'RWF',
                reference: reference
              });
            case 2:
              response = _context3.sent;
              if (!response.data.success) {
                _context3.next = 3;
                break;
              }
              return _context3.abrupt("return", {
                success: true,
                token: response.data.token,
                // 20-digit STS token
                units: response.data.units
              });
            case 3:
              _context3.next = 5;
              break;
            case 4:
              _context3.prev = 4;
              _t3 = _context3["catch"](1);
              console.error('STS vend error:', ((_error$response = _t3.response) === null || _error$response === void 0 ? void 0 : _error$response.data) || _t3.message);
            case 5:
              // Try EUCL
              euclClient = this.providers.get('eucl');
              if (!euclClient) {
                _context3.next = 10;
                break;
              }
              _context3.prev = 6;
              _context3.next = 7;
              return euclClient.post('/transactions/prepaid', {
                meter_number: meterNumber,
                amount: amount,
                external_ref: reference
              });
            case 7:
              _response2 = _context3.sent;
              if (!(_response2.data.status === 'SUCCESS')) {
                _context3.next = 8;
                break;
              }
              return _context3.abrupt("return", {
                success: true,
                token: _response2.data.token,
                units: _response2.data.units_purchased
              });
            case 8:
              _context3.next = 10;
              break;
            case 9:
              _context3.prev = 9;
              _t4 = _context3["catch"](6);
              console.error('EUCL vend error:', ((_error$response2 = _t4.response) === null || _error$response2 === void 0 ? void 0 : _error$response2.data) || _t4.message);
            case 10:
              if (!(this.providers.size === 0)) {
                _context3.next = 11;
                break;
              }
              // Calculate units based on typical Rwanda tariff (~120 RWF per unit)
              unitsPerRwf = 1 / 120;
              units = Math.floor(amount * unitsPerRwf * 10) / 10; // Generate simulated STS token (20 digits)
              token = this.generateSimulatedToken();
              return _context3.abrupt("return", {
                success: true,
                token: token,
                units: units
              });
            case 11:
              return _context3.abrupt("return", {
                success: false,
                error: 'No provider available to process request'
              });
            case 12:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this, [[1, 4], [6, 9]]);
      }));
      function executePurchase(_x3, _x4, _x5) {
        return _executePurchase.apply(this, arguments);
      }
      return executePurchase;
    }()
    /**
     * Generate simulated STS token for development
     */
    )
  }, {
    key: "generateSimulatedToken",
    value: function generateSimulatedToken() {
      var token = '';
      for (var i = 0; i < 20; i++) {
        token += Math.floor(Math.random() * 10);
        if ((i + 1) % 4 === 0 && i < 19) {
          token += '-';
        }
      }
      return token; // Format: 0000-0000-0000-0000-0000
    }

    /**
     * Link meter to user account
     */
  }, {
    key: "linkMeterToUser",
    value: (function () {
      var _linkMeterToUser = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(userId, meterNumber, meterInfo) {
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 1;
              return this.db.query("\n      INSERT INTO bigcompany.utility_meters\n      (user_id, meter_type, meter_number, alias, is_verified, metadata)\n      VALUES ($1, 'gas', $2, $3, true, $4)\n      ON CONFLICT (meter_number, provider) DO UPDATE\n      SET user_id = $1, is_verified = true, updated_at = NOW()\n    ", [userId, meterNumber, meterInfo.customerName || "Meter ".concat(meterNumber), JSON.stringify(meterInfo)]);
            case 1:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function linkMeterToUser(_x6, _x7, _x8) {
        return _linkMeterToUser.apply(this, arguments);
      }
      return linkMeterToUser;
    }()
    /**
     * Get user's meters
     */
    )
  }, {
    key: "getUserMeters",
    value: (function () {
      var _getUserMeters = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(userId) {
        var result;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 1;
              return this.db.query("\n      SELECT * FROM bigcompany.utility_meters\n      WHERE user_id = $1 AND meter_type = 'gas'\n      ORDER BY created_at DESC\n    ", [userId]);
            case 1:
              result = _context5.sent;
              return _context5.abrupt("return", result.rows.map(function (row) {
                var _row$metadata, _row$metadata2;
                return {
                  meterNumber: row.meter_number,
                  customerName: row.alias,
                  address: (_row$metadata = row.metadata) === null || _row$metadata === void 0 ? void 0 : _row$metadata.address,
                  tariff: (_row$metadata2 = row.metadata) === null || _row$metadata2 === void 0 ? void 0 : _row$metadata2.tariff
                };
              }));
            case 2:
            case "end":
              return _context5.stop();
          }
        }, _callee5, this);
      }));
      function getUserMeters(_x9) {
        return _getUserMeters.apply(this, arguments);
      }
      return getUserMeters;
    }()
    /**
     * Get user's topup history
     */
    )
  }, {
    key: "getTopupHistory",
    value: (function () {
      var _getTopupHistory = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(userId) {
        var limit,
          result,
          _args6 = arguments;
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              limit = _args6.length > 1 && _args6[1] !== undefined ? _args6[1] : 20;
              _context6.next = 1;
              return this.db.query("\n      SELECT t.*, m.alias as meter_alias, m.meter_number\n      FROM bigcompany.utility_topups t\n      LEFT JOIN bigcompany.utility_meters m ON t.meter_id = m.id\n      WHERE t.user_id = $1\n      ORDER BY t.created_at DESC\n      LIMIT $2\n    ", [userId, limit]);
            case 1:
              result = _context6.sent;
              return _context6.abrupt("return", result.rows);
            case 2:
            case "end":
              return _context6.stop();
          }
        }, _callee6, this);
      }));
      function getTopupHistory(_x0) {
        return _getTopupHistory.apply(this, arguments);
      }
      return getTopupHistory;
    }()
    /**
     * Get predefined amounts
     */
    )
  }, {
    key: "getPredefinedAmounts",
    value: function getPredefinedAmounts() {
      return this.predefinedAmounts;
    }

    /**
     * Close database connection
     */
  }, {
    key: "close",
    value: (function () {
      var _close = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7() {
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              _context7.next = 1;
              return this.db.end();
            case 1:
            case "end":
              return _context7.stop();
          }
        }, _callee7, this);
      }));
      function close() {
        return _close.apply(this, arguments);
      }
      return close;
    }())
  }]);
}();
var _default = exports["default"] = GasService;