"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var _bcryptjs = _interopRequireDefault(require("bcryptjs"));
var _pg = require("pg");
var _walletBalance = require("../../services/wallet-balance");
var _rewards = require("../../services/rewards");
var _excluded = ["password"],
  _excluded2 = ["password"];
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var router = (0, _express.Router)();
var db = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// JSON body parser middleware
router.use((0, _express.json)());

// CORS Middleware for retailer routes
var corsMiddleware = function corsMiddleware(req, res, next) {
  var allowedOrigins = ['https://bigcompany-retailer.alexandratechlab.com', 'https://bigcompany-wholesaler.alexandratechlab.com', 'http://localhost:3001', 'http://localhost:3004'];
  var origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
};

// Auth middleware
var authMiddleware = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res, next) {
    var authHeader, token, decoded, _t;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          authHeader = req.headers.authorization;
          if (!(!authHeader || !authHeader.startsWith('Bearer '))) {
            _context.next = 1;
            break;
          }
          return _context.abrupt("return", res.status(401).json({
            error: 'No token provided'
          }));
        case 1:
          token = authHeader.split(' ')[1];
          decoded = _jsonwebtoken["default"].verify(token, process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024');
          if (!(decoded.type !== 'retailer' && decoded.type !== 'admin')) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return", res.status(403).json({
            error: 'Not authorized for retailer access'
          }));
        case 2:
          req.user = decoded;
          next();
          _context.next = 4;
          break;
        case 3:
          _context.prev = 3;
          _t = _context["catch"](0);
          return _context.abrupt("return", res.status(401).json({
            error: 'Invalid token'
          }));
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[0, 3]]);
  }));
  return function authMiddleware(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();

// Mock retailer database (in production, use a proper database table)
var retailers = new Map([['retailer@bigcompany.rw', {
  id: 'ret_001',
  email: 'retailer@bigcompany.rw',
  password: _bcryptjs["default"].hashSync('retailer123', 10),
  name: 'Demo Retailer',
  shop_name: 'Kigali Shop',
  phone: '+250788123456',
  location: 'Kigali, Rwanda',
  type: 'retailer',
  status: 'active',
  created_at: new Date('2024-01-15')
}]]);

// Apply CORS to all retailer routes
router.use(corsMiddleware);

// ==================== AUTH ROUTES ====================

router.post('/auth/login', /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _req$body, email, password, retailer, validPassword, token, _, retailerData, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _req$body = req.body, email = _req$body.email, password = _req$body.password;
          retailer = retailers.get(email);
          if (retailer) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", res.status(401).json({
            error: 'Invalid credentials'
          }));
        case 1:
          _context2.next = 2;
          return _bcryptjs["default"].compare(password, retailer.password);
        case 2:
          validPassword = _context2.sent;
          if (validPassword) {
            _context2.next = 3;
            break;
          }
          return _context2.abrupt("return", res.status(401).json({
            error: 'Invalid credentials'
          }));
        case 3:
          token = _jsonwebtoken["default"].sign({
            id: retailer.id,
            email: retailer.email,
            type: 'retailer',
            shop_name: retailer.shop_name
          }, process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024', {
            expiresIn: '7d'
          });
          _ = retailer.password, retailerData = (0, _objectWithoutProperties2["default"])(retailer, _excluded);
          res.json({
            access_token: token,
            retailer: retailerData
          });
          _context2.next = 5;
          break;
        case 4:
          _context2.prev = 4;
          _t2 = _context2["catch"](0);
          res.status(500).json({
            error: _t2.message
          });
        case 5:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[0, 4]]);
  }));
  return function (_x4, _x5) {
    return _ref2.apply(this, arguments);
  };
}());
router.get('/me', authMiddleware, /*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    var user, retailer, _, retailerData, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          user = req.user;
          retailer = Array.from(retailers.values()).find(function (r) {
            return r.id === user.id;
          });
          if (retailer) {
            _context3.next = 1;
            break;
          }
          return _context3.abrupt("return", res.status(404).json({
            error: 'Retailer not found'
          }));
        case 1:
          _ = retailer.password, retailerData = (0, _objectWithoutProperties2["default"])(retailer, _excluded2);
          res.json(retailerData);
          _context3.next = 3;
          break;
        case 2:
          _context3.prev = 2;
          _t3 = _context3["catch"](0);
          res.status(500).json({
            error: _t3.message
          });
        case 3:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[0, 2]]);
  }));
  return function (_x6, _x7) {
    return _ref3.apply(this, arguments);
  };
}());

// ==================== DASHBOARD ROUTES ====================

router.get('/dashboard/stats', authMiddleware, /*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          try {
            // In production, fetch real data from Medusa services
            res.json({
              totalOrders: 156,
              totalRevenue: 2450000,
              // RWF
              pendingOrders: 12,
              totalProducts: 48,
              lowStockItems: 5,
              todayOrders: 8,
              todayRevenue: 125000,
              currency: 'RWF'
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context4.stop();
      }
    }, _callee4);
  }));
  return function (_x8, _x9) {
    return _ref4.apply(this, arguments);
  };
}());
router.get('/dashboard/sales', authMiddleware, /*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var _req$query$period, period, salesData;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          try {
            _req$query$period = req.query.period, period = _req$query$period === void 0 ? 'week' : _req$query$period; // Mock sales data
            salesData = {
              week: [{
                date: '2024-11-22',
                sales: 45000,
                orders: 5
              }, {
                date: '2024-11-23',
                sales: 78000,
                orders: 8
              }, {
                date: '2024-11-24',
                sales: 56000,
                orders: 6
              }, {
                date: '2024-11-25',
                sales: 92000,
                orders: 10
              }, {
                date: '2024-11-26',
                sales: 67000,
                orders: 7
              }, {
                date: '2024-11-27',
                sales: 84000,
                orders: 9
              }, {
                date: '2024-11-28',
                sales: 125000,
                orders: 12
              }],
              month: Array.from({
                length: 30
              }, function (_, i) {
                return {
                  date: new Date(2024, 10, i + 1).toISOString().split('T')[0],
                  sales: Math.floor(Math.random() * 100000) + 30000,
                  orders: Math.floor(Math.random() * 15) + 3
                };
              })
            };
            res.json(salesData[period] || salesData.week);
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
  return function (_x0, _x1) {
    return _ref5.apply(this, arguments);
  };
}());
router.get('/dashboard/low-stock', authMiddleware, /*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var _req$query$limit, limit, lowStockItems;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          try {
            _req$query$limit = req.query.limit, limit = _req$query$limit === void 0 ? 5 : _req$query$limit;
            lowStockItems = [{
              id: 'prod_1',
              name: 'Inyange Milk 500ml',
              stock: 3,
              threshold: 10,
              category: 'Dairy'
            }, {
              id: 'prod_2',
              name: 'Bralirwa Primus 500ml',
              stock: 5,
              threshold: 20,
              category: 'Beverages'
            }, {
              id: 'prod_3',
              name: 'Akabanga Chili Oil',
              stock: 2,
              threshold: 15,
              category: 'Cooking'
            }, {
              id: 'prod_4',
              name: 'Isombe Mix 1kg',
              stock: 4,
              threshold: 10,
              category: 'Food'
            }, {
              id: 'prod_5',
              name: 'Urwagwa Traditional 1L',
              stock: 1,
              threshold: 5,
              category: 'Beverages'
            }];
            res.json(lowStockItems.slice(0, Number(limit)));
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context6.stop();
      }
    }, _callee6);
  }));
  return function (_x10, _x11) {
    return _ref6.apply(this, arguments);
  };
}());
router.get('/dashboard/recent-orders', authMiddleware, /*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var _req$query$limit2, limit, recentOrders;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          try {
            _req$query$limit2 = req.query.limit, limit = _req$query$limit2 === void 0 ? 5 : _req$query$limit2;
            recentOrders = [{
              id: 'ord_001',
              customer: 'Jean Uwimana',
              total: 15000,
              status: 'pending',
              created_at: '2024-11-28T10:30:00Z'
            }, {
              id: 'ord_002',
              customer: 'Marie Mukamana',
              total: 28500,
              status: 'processing',
              created_at: '2024-11-28T09:15:00Z'
            }, {
              id: 'ord_003',
              customer: 'Emmanuel Habimana',
              total: 8200,
              status: 'completed',
              created_at: '2024-11-28T08:45:00Z'
            }, {
              id: 'ord_004',
              customer: 'Alice Uwase',
              total: 42000,
              status: 'shipped',
              created_at: '2024-11-27T16:20:00Z'
            }, {
              id: 'ord_005',
              customer: 'Patrick Niyonzima',
              total: 19800,
              status: 'completed',
              created_at: '2024-11-27T14:50:00Z'
            }];
            res.json(recentOrders.slice(0, Number(limit)));
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context7.stop();
      }
    }, _callee7);
  }));
  return function (_x12, _x13) {
    return _ref7.apply(this, arguments);
  };
}());

// ==================== ORDERS ROUTES ====================

router.get('/orders', authMiddleware, /*#__PURE__*/function () {
  var _ref8 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(req, res) {
    var _req$query, _req$query$limit3, limit, _req$query$offset, offset, status, orders;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          try {
            _req$query = req.query, _req$query$limit3 = _req$query.limit, limit = _req$query$limit3 === void 0 ? 20 : _req$query$limit3, _req$query$offset = _req$query.offset, offset = _req$query$offset === void 0 ? 0 : _req$query$offset, status = _req$query.status;
            orders = [{
              id: 'ord_001',
              customer: 'Jean Uwimana',
              email: 'jean@example.com',
              total: 15000,
              status: 'pending',
              items: 3,
              created_at: '2024-11-28T10:30:00Z'
            }, {
              id: 'ord_002',
              customer: 'Marie Mukamana',
              email: 'marie@example.com',
              total: 28500,
              status: 'processing',
              items: 5,
              created_at: '2024-11-28T09:15:00Z'
            }, {
              id: 'ord_003',
              customer: 'Emmanuel Habimana',
              email: 'emmanuel@example.com',
              total: 8200,
              status: 'completed',
              items: 2,
              created_at: '2024-11-28T08:45:00Z'
            }, {
              id: 'ord_004',
              customer: 'Alice Uwase',
              email: 'alice@example.com',
              total: 42000,
              status: 'shipped',
              items: 7,
              created_at: '2024-11-27T16:20:00Z'
            }, {
              id: 'ord_005',
              customer: 'Patrick Niyonzima',
              email: 'patrick@example.com',
              total: 19800,
              status: 'completed',
              items: 4,
              created_at: '2024-11-27T14:50:00Z'
            }];
            if (status) {
              orders = orders.filter(function (o) {
                return o.status === status;
              });
            }
            res.json({
              orders: orders.slice(Number(offset), Number(offset) + Number(limit)),
              count: orders.length,
              limit: Number(limit),
              offset: Number(offset)
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context8.stop();
      }
    }, _callee8);
  }));
  return function (_x14, _x15) {
    return _ref8.apply(this, arguments);
  };
}());
router.get('/orders/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref9 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(req, res) {
    var id, order;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          try {
            id = req.params.id;
            order = {
              id: id,
              customer: {
                name: 'Jean Uwimana',
                email: 'jean@example.com',
                phone: '+250788111222'
              },
              items: [{
                id: 'item_1',
                product_id: 'prod_1',
                name: 'Inyange Milk 500ml',
                quantity: 2,
                unit_price: 800,
                total: 1600
              }, {
                id: 'item_2',
                product_id: 'prod_2',
                name: 'Bralirwa Primus 500ml',
                quantity: 6,
                unit_price: 1200,
                total: 7200
              }, {
                id: 'item_3',
                product_id: 'prod_3',
                name: 'Akabanga Chili Oil',
                quantity: 1,
                unit_price: 6200,
                total: 6200
              }],
              subtotal: 15000,
              shipping: 0,
              tax: 0,
              total: 15000,
              status: 'pending',
              payment_status: 'paid',
              payment_method: 'mtn_momo',
              shipping_address: {
                line1: 'KG 123 St',
                city: 'Kigali',
                district: 'Gasabo',
                country: 'Rwanda'
              },
              created_at: '2024-11-28T10:30:00Z',
              updated_at: '2024-11-28T10:30:00Z'
            };
            res.json(order);
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context9.stop();
      }
    }, _callee9);
  }));
  return function (_x16, _x17) {
    return _ref9.apply(this, arguments);
  };
}());
router.post('/orders/:id/status', authMiddleware, /*#__PURE__*/function () {
  var _ref0 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(req, res) {
    var id, _req$body2, status, notes;
    return _regenerator["default"].wrap(function (_context0) {
      while (1) switch (_context0.prev = _context0.next) {
        case 0:
          try {
            id = req.params.id;
            _req$body2 = req.body, status = _req$body2.status, notes = _req$body2.notes;
            res.json({
              id: id,
              status: status,
              notes: notes,
              updated_at: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context0.stop();
      }
    }, _callee0);
  }));
  return function (_x18, _x19) {
    return _ref0.apply(this, arguments);
  };
}());
router.post('/orders/:id/fulfill', authMiddleware, /*#__PURE__*/function () {
  var _ref1 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(req, res) {
    var id, tracking_number;
    return _regenerator["default"].wrap(function (_context1) {
      while (1) switch (_context1.prev = _context1.next) {
        case 0:
          try {
            id = req.params.id;
            tracking_number = req.body.tracking_number;
            res.json({
              id: id,
              status: 'shipped',
              tracking_number: tracking_number,
              fulfilled_at: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context1.stop();
      }
    }, _callee1);
  }));
  return function (_x20, _x21) {
    return _ref1.apply(this, arguments);
  };
}());
router.post('/orders/:id/cancel', authMiddleware, /*#__PURE__*/function () {
  var _ref10 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(req, res) {
    var id, reason;
    return _regenerator["default"].wrap(function (_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          try {
            id = req.params.id;
            reason = req.body.reason;
            res.json({
              id: id,
              status: 'cancelled',
              reason: reason,
              cancelled_at: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context10.stop();
      }
    }, _callee10);
  }));
  return function (_x22, _x23) {
    return _ref10.apply(this, arguments);
  };
}());

// ==================== INVENTORY ROUTES ====================

router.get('/inventory', authMiddleware, /*#__PURE__*/function () {
  var _ref11 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(req, res) {
    var _req$query2, _req$query2$limit, limit, _req$query2$offset, offset, low_stock, search, products, searchLower;
    return _regenerator["default"].wrap(function (_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          try {
            _req$query2 = req.query, _req$query2$limit = _req$query2.limit, limit = _req$query2$limit === void 0 ? 20 : _req$query2$limit, _req$query2$offset = _req$query2.offset, offset = _req$query2$offset === void 0 ? 0 : _req$query2$offset, low_stock = _req$query2.low_stock, search = _req$query2.search;
            products = [{
              id: 'prod_1',
              name: 'Inyange Milk 500ml',
              sku: 'INY-MLK-500',
              category: 'Dairy',
              price: 800,
              cost: 600,
              stock: 45,
              threshold: 10,
              status: 'active'
            }, {
              id: 'prod_2',
              name: 'Bralirwa Primus 500ml',
              sku: 'BRL-PRM-500',
              category: 'Beverages',
              price: 1200,
              cost: 900,
              stock: 5,
              threshold: 20,
              status: 'active'
            }, {
              id: 'prod_3',
              name: 'Akabanga Chili Oil 100ml',
              sku: 'AKB-CHI-100',
              category: 'Cooking',
              price: 6200,
              cost: 4500,
              stock: 2,
              threshold: 15,
              status: 'active'
            }, {
              id: 'prod_4',
              name: 'Isombe Mix 1kg',
              sku: 'ISB-MIX-1KG',
              category: 'Food',
              price: 3500,
              cost: 2500,
              stock: 78,
              threshold: 10,
              status: 'active'
            }, {
              id: 'prod_5',
              name: 'Urwagwa Traditional 1L',
              sku: 'URW-TRD-1L',
              category: 'Beverages',
              price: 8000,
              cost: 6000,
              stock: 1,
              threshold: 5,
              status: 'active'
            }, {
              id: 'prod_6',
              name: 'Inyange Water 1.5L',
              sku: 'INY-WTR-1.5',
              category: 'Beverages',
              price: 500,
              cost: 350,
              stock: 120,
              threshold: 30,
              status: 'active'
            }, {
              id: 'prod_7',
              name: 'Ikivuguto 1L',
              sku: 'IKV-YOG-1L',
              category: 'Dairy',
              price: 2000,
              cost: 1400,
              stock: 35,
              threshold: 15,
              status: 'active'
            }, {
              id: 'prod_8',
              name: 'Ubuki Honey 500g',
              sku: 'UBK-HNY-500',
              category: 'Food',
              price: 12000,
              cost: 8500,
              stock: 18,
              threshold: 10,
              status: 'active'
            }];
            if (low_stock === 'true') {
              products = products.filter(function (p) {
                return p.stock <= p.threshold;
              });
            }
            if (search) {
              searchLower = search.toLowerCase();
              products = products.filter(function (p) {
                return p.name.toLowerCase().includes(searchLower) || p.sku.toLowerCase().includes(searchLower);
              });
            }
            res.json({
              products: products.slice(Number(offset), Number(offset) + Number(limit)),
              count: products.length,
              limit: Number(limit),
              offset: Number(offset)
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context11.stop();
      }
    }, _callee11);
  }));
  return function (_x24, _x25) {
    return _ref11.apply(this, arguments);
  };
}());
router.get('/inventory/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref12 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12(req, res) {
    var id, product;
    return _regenerator["default"].wrap(function (_context12) {
      while (1) switch (_context12.prev = _context12.next) {
        case 0:
          try {
            id = req.params.id;
            product = {
              id: id,
              name: 'Inyange Milk 500ml',
              sku: 'INY-MLK-500',
              description: 'Fresh pasteurized milk from Inyange Industries',
              category: 'Dairy',
              price: 800,
              cost: 600,
              stock: 45,
              threshold: 10,
              unit: 'bottle',
              status: 'active',
              images: ['/images/products/inyange-milk.jpg'],
              variants: [],
              created_at: '2024-01-15T08:00:00Z',
              updated_at: '2024-11-28T10:00:00Z'
            };
            res.json(product);
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context12.stop();
      }
    }, _callee12);
  }));
  return function (_x26, _x27) {
    return _ref12.apply(this, arguments);
  };
}());
router.post('/inventory/:id/stock', authMiddleware, /*#__PURE__*/function () {
  var _ref13 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee13(req, res) {
    var id, _req$body3, quantity, adjustment_type, reason;
    return _regenerator["default"].wrap(function (_context13) {
      while (1) switch (_context13.prev = _context13.next) {
        case 0:
          try {
            id = req.params.id;
            _req$body3 = req.body, quantity = _req$body3.quantity, adjustment_type = _req$body3.adjustment_type, reason = _req$body3.reason;
            res.json({
              id: id,
              new_stock: 50,
              adjustment: quantity,
              adjustment_type: adjustment_type,
              reason: reason,
              updated_at: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context13.stop();
      }
    }, _callee13);
  }));
  return function (_x28, _x29) {
    return _ref13.apply(this, arguments);
  };
}());
router.post('/inventory/:id/price', authMiddleware, /*#__PURE__*/function () {
  var _ref14 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee14(req, res) {
    var id, _req$body4, price, cost;
    return _regenerator["default"].wrap(function (_context14) {
      while (1) switch (_context14.prev = _context14.next) {
        case 0:
          try {
            id = req.params.id;
            _req$body4 = req.body, price = _req$body4.price, cost = _req$body4.cost;
            res.json({
              id: id,
              price: price,
              cost: cost,
              margin: price - cost,
              margin_percentage: ((price - cost) / price * 100).toFixed(2),
              updated_at: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context14.stop();
      }
    }, _callee14);
  }));
  return function (_x30, _x31) {
    return _ref14.apply(this, arguments);
  };
}());
router.post('/inventory', authMiddleware, /*#__PURE__*/function () {
  var _ref15 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee15(req, res) {
    var productData, newProduct;
    return _regenerator["default"].wrap(function (_context15) {
      while (1) switch (_context15.prev = _context15.next) {
        case 0:
          try {
            productData = req.body;
            newProduct = _objectSpread(_objectSpread({
              id: "prod_".concat(Date.now())
            }, productData), {}, {
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            res.status(201).json(newProduct);
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context15.stop();
      }
    }, _callee15);
  }));
  return function (_x32, _x33) {
    return _ref15.apply(this, arguments);
  };
}());

// ==================== WALLET ROUTES ====================

// GET /retailer/wallet - returns full wallet info (alias for dashboard compatibility)
router.get('/wallet', authMiddleware, /*#__PURE__*/function () {
  var _ref16 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee16(req, res) {
    return _regenerator["default"].wrap(function (_context16) {
      while (1) switch (_context16.prev = _context16.next) {
        case 0:
          try {
            res.json({
              balance: 245000,
              pending: 15000,
              available: 230000,
              currency: 'RWF',
              credit_limit: 500000,
              credit_used: 125000,
              last_updated: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context16.stop();
      }
    }, _callee16);
  }));
  return function (_x34, _x35) {
    return _ref16.apply(this, arguments);
  };
}());
router.get('/wallet/balance', authMiddleware, /*#__PURE__*/function () {
  var _ref17 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee17(req, res) {
    return _regenerator["default"].wrap(function (_context17) {
      while (1) switch (_context17.prev = _context17.next) {
        case 0:
          try {
            res.json({
              balance: 245000,
              pending: 15000,
              available: 230000,
              currency: 'RWF',
              last_updated: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context17.stop();
      }
    }, _callee17);
  }));
  return function (_x36, _x37) {
    return _ref17.apply(this, arguments);
  };
}());
router.get('/wallet/transactions', authMiddleware, /*#__PURE__*/function () {
  var _ref18 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee18(req, res) {
    var _req$query3, _req$query3$limit, limit, _req$query3$offset, offset, transactions;
    return _regenerator["default"].wrap(function (_context18) {
      while (1) switch (_context18.prev = _context18.next) {
        case 0:
          try {
            _req$query3 = req.query, _req$query3$limit = _req$query3.limit, limit = _req$query3$limit === void 0 ? 20 : _req$query3$limit, _req$query3$offset = _req$query3.offset, offset = _req$query3$offset === void 0 ? 0 : _req$query3$offset;
            transactions = [{
              id: 'txn_1',
              type: 'credit',
              amount: 28500,
              description: 'Order payment - ord_002',
              status: 'completed',
              created_at: '2024-11-28T09:15:00Z'
            }, {
              id: 'txn_2',
              type: 'debit',
              amount: 50000,
              description: 'Withdrawal to MTN MoMo',
              status: 'completed',
              created_at: '2024-11-27T14:30:00Z'
            }, {
              id: 'txn_3',
              type: 'credit',
              amount: 42000,
              description: 'Order payment - ord_004',
              status: 'completed',
              created_at: '2024-11-27T16:20:00Z'
            }, {
              id: 'txn_4',
              type: 'credit',
              amount: 15000,
              description: 'Order payment - ord_001',
              status: 'pending',
              created_at: '2024-11-28T10:30:00Z'
            }];
            res.json({
              transactions: transactions.slice(Number(offset), Number(offset) + Number(limit)),
              count: transactions.length
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context18.stop();
      }
    }, _callee18);
  }));
  return function (_x38, _x39) {
    return _ref18.apply(this, arguments);
  };
}());
router.post('/wallet/withdraw', authMiddleware, /*#__PURE__*/function () {
  var _ref19 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee19(req, res) {
    var _req$body5, amount, method, phone;
    return _regenerator["default"].wrap(function (_context19) {
      while (1) switch (_context19.prev = _context19.next) {
        case 0:
          try {
            _req$body5 = req.body, amount = _req$body5.amount, method = _req$body5.method, phone = _req$body5.phone;
            res.json({
              id: "wth_".concat(Date.now()),
              amount: amount,
              method: method,
              phone: phone,
              status: 'processing',
              fee: Math.floor(amount * 0.01),
              net_amount: amount - Math.floor(amount * 0.01),
              created_at: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context19.stop();
      }
    }, _callee19);
  }));
  return function (_x40, _x41) {
    return _ref19.apply(this, arguments);
  };
}());

// ==================== REWARDS/GAS ROUTES ====================

router.get('/rewards', authMiddleware, /*#__PURE__*/function () {
  var _ref20 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee20(req, res) {
    return _regenerator["default"].wrap(function (_context20) {
      while (1) switch (_context20.prev = _context20.next) {
        case 0:
          try {
            res.json({
              total_earned: 156000,
              available: 45000,
              redeemed: 111000,
              pending: 12000,
              currency: 'RWF',
              reward_rate: '12%'
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context20.stop();
      }
    }, _callee20);
  }));
  return function (_x42, _x43) {
    return _ref20.apply(this, arguments);
  };
}());
router.get('/rewards/history', authMiddleware, /*#__PURE__*/function () {
  var _ref21 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee21(req, res) {
    var rewards;
    return _regenerator["default"].wrap(function (_context21) {
      while (1) switch (_context21.prev = _context21.next) {
        case 0:
          try {
            rewards = [{
              id: 'rwd_1',
              type: 'earned',
              amount: 3420,
              source: 'Order ord_002 profit',
              created_at: '2024-11-28T09:15:00Z'
            }, {
              id: 'rwd_2',
              type: 'redeemed',
              amount: 25000,
              redemption: 'Gas Top-up 15L',
              created_at: '2024-11-27T12:00:00Z'
            }, {
              id: 'rwd_3',
              type: 'earned',
              amount: 5040,
              source: 'Order ord_004 profit',
              created_at: '2024-11-27T16:20:00Z'
            }];
            res.json(rewards);
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context21.stop();
      }
    }, _callee21);
  }));
  return function (_x44, _x45) {
    return _ref21.apply(this, arguments);
  };
}());

// ==================== POS ROUTES ====================

// GET /retailer/pos/products - products available for POS sale
router.get('/pos/products', authMiddleware, /*#__PURE__*/function () {
  var _ref22 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee22(req, res) {
    var _req$query4, category, search, _req$query4$limit, limit, _req$query4$offset, offset, products, searchTerm, total, start, end;
    return _regenerator["default"].wrap(function (_context22) {
      while (1) switch (_context22.prev = _context22.next) {
        case 0:
          try {
            _req$query4 = req.query, category = _req$query4.category, search = _req$query4.search, _req$query4$limit = _req$query4.limit, limit = _req$query4$limit === void 0 ? 50 : _req$query4$limit, _req$query4$offset = _req$query4.offset, offset = _req$query4$offset === void 0 ? 0 : _req$query4$offset;
            products = [{
              id: 'prod_001',
              name: 'Inyange Milk 1L',
              barcode: '6000000000001',
              category: 'beverages',
              price: 900,
              stock: 50,
              unit: 'Liter'
            }, {
              id: 'prod_002',
              name: 'Bralirwa Beer 500ml',
              barcode: '6000000000002',
              category: 'beverages',
              price: 900,
              stock: 100,
              unit: 'Bottle'
            }, {
              id: 'prod_003',
              name: 'Bread (Large)',
              barcode: '6000000000003',
              category: 'food',
              price: 500,
              stock: 30,
              unit: 'Loaf'
            }, {
              id: 'prod_004',
              name: 'Sugar 1kg',
              barcode: '6000000000004',
              category: 'food',
              price: 1000,
              stock: 45,
              unit: 'Kg'
            }, {
              id: 'prod_005',
              name: 'Cooking Oil 1L',
              barcode: '6000000000005',
              category: 'food',
              price: 2000,
              stock: 25,
              unit: 'Liter'
            }, {
              id: 'prod_006',
              name: 'Rice 5kg',
              barcode: '6000000000006',
              category: 'food',
              price: 5500,
              stock: 40,
              unit: 'Kg'
            }, {
              id: 'prod_007',
              name: 'Soap Bar',
              barcode: '6000000000007',
              category: 'personal_care',
              price: 300,
              stock: 80,
              unit: 'Piece'
            }, {
              id: 'prod_008',
              name: 'Toothpaste',
              barcode: '6000000000008',
              category: 'personal_care',
              price: 1200,
              stock: 35,
              unit: 'Tube'
            }, {
              id: 'prod_009',
              name: 'Detergent 1kg',
              barcode: '6000000000009',
              category: 'cleaning',
              price: 1500,
              stock: 60,
              unit: 'Kg'
            }, {
              id: 'prod_010',
              name: 'Bottled Water 500ml',
              barcode: '6000000000010',
              category: 'beverages',
              price: 300,
              stock: 200,
              unit: 'Bottle'
            }, {
              id: 'prod_011',
              name: 'Eggs (Tray of 30)',
              barcode: '6000000000011',
              category: 'food',
              price: 4500,
              stock: 20,
              unit: 'Tray'
            }, {
              id: 'prod_012',
              name: 'Tomatoes 1kg',
              barcode: '6000000000012',
              category: 'food',
              price: 800,
              stock: 50,
              unit: 'Kg'
            }, {
              id: 'prod_013',
              name: 'Onions 1kg',
              barcode: '6000000000013',
              category: 'food',
              price: 600,
              stock: 55,
              unit: 'Kg'
            }, {
              id: 'prod_014',
              name: 'Soda (Fanta 500ml)',
              barcode: '6000000000014',
              category: 'beverages',
              price: 500,
              stock: 120,
              unit: 'Bottle'
            }, {
              id: 'prod_015',
              name: 'Tissue Paper (Pack)',
              barcode: '6000000000015',
              category: 'household',
              price: 800,
              stock: 40,
              unit: 'Pack'
            }]; // Filter by category
            if (category) {
              products = products.filter(function (p) {
                return p.category === String(category).toLowerCase();
              });
            }

            // Filter by search term
            if (search) {
              searchTerm = String(search).toLowerCase();
              products = products.filter(function (p) {
                return p.name.toLowerCase().includes(searchTerm) || p.barcode.includes(searchTerm);
              });
            }
            total = products.length; // Apply pagination
            start = Number(offset);
            end = start + Number(limit);
            products = products.slice(start, end);
            res.json({
              products: products,
              count: products.length,
              total: total
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context22.stop();
      }
    }, _callee22);
  }));
  return function (_x46, _x47) {
    return _ref22.apply(this, arguments);
  };
}());
router.get('/pos/daily-sales', authMiddleware, /*#__PURE__*/function () {
  var _ref23 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee23(req, res) {
    return _regenerator["default"].wrap(function (_context23) {
      while (1) switch (_context23.prev = _context23.next) {
        case 0:
          try {
            res.json({
              date: new Date().toISOString().split('T')[0],
              total_sales: 125000,
              total_orders: 12,
              cash_sales: 85000,
              mobile_money_sales: 40000,
              average_order_value: 10417,
              currency: 'RWF'
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context23.stop();
      }
    }, _callee23);
  }));
  return function (_x48, _x49) {
    return _ref23.apply(this, arguments);
  };
}());

/**
 * Get customer details for POS including wallet and loan balances
 * GET /retailer/pos/customer?phone=250788123456
 */
router.get('/pos/customer', authMiddleware, /*#__PURE__*/function () {
  var _ref24 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee24(req, res) {
    var phone, customerQuery, customerResult, customer, walletService, balances, _t4;
    return _regenerator["default"].wrap(function (_context24) {
      while (1) switch (_context24.prev = _context24.next) {
        case 0:
          _context24.prev = 0;
          phone = req.query.phone;
          if (!(!phone || typeof phone !== 'string')) {
            _context24.next = 1;
            break;
          }
          return _context24.abrupt("return", res.status(400).json({
            error: 'Phone number is required'
          }));
        case 1:
          // Find customer by phone number
          customerQuery = "\n        SELECT id, phone, email, first_name, last_name\n        FROM bigcompany.customers\n        WHERE phone = $1\n        LIMIT 1\n      ";
          _context24.next = 2;
          return db.query(customerQuery, [phone]);
        case 2:
          customerResult = _context24.sent;
          if (!(customerResult.rows.length === 0)) {
            _context24.next = 3;
            break;
          }
          return _context24.abrupt("return", res.status(404).json({
            error: 'Customer not found'
          }));
        case 3:
          customer = customerResult.rows[0]; // Get wallet and loan balances using WalletBalanceService
          walletService = new _walletBalance.WalletBalanceService();
          _context24.next = 4;
          return walletService.getBalanceDetails(customer.id);
        case 4:
          balances = _context24.sent;
          if (balances) {
            _context24.next = 5;
            break;
          }
          return _context24.abrupt("return", res.json({
            id: customer.id,
            phone: customer.phone,
            email: customer.email,
            name: "".concat(customer.first_name || '', " ").concat(customer.last_name || '').trim() || 'Unknown',
            wallet_balance: 0,
            loan_balance: 0,
            total_balance: 0,
            available_for_purchase: 0,
            credit_limit: 0,
            credit_used: 0
          }));
        case 5:
          // Return customer with dual balances
          res.json({
            id: customer.id,
            phone: customer.phone,
            email: customer.email,
            name: "".concat(customer.first_name || '', " ").concat(customer.last_name || '').trim() || 'Unknown',
            wallet_balance: balances.walletBalance,
            loan_balance: balances.loanBalance,
            total_balance: balances.totalBalance,
            available_for_purchase: balances.availableForPurchase,
            credit_limit: balances.loanLimit,
            credit_used: balances.loanLimit - balances.loanBalance // Calculate used portion
          });
          _context24.next = 7;
          break;
        case 6:
          _context24.prev = 6;
          _t4 = _context24["catch"](0);
          console.error('Error fetching customer for POS:', _t4);
          res.status(500).json({
            error: _t4.message || 'Failed to fetch customer details'
          });
        case 7:
        case "end":
          return _context24.stop();
      }
    }, _callee24, null, [[0, 6]]);
  }));
  return function (_x50, _x51) {
    return _ref24.apply(this, arguments);
  };
}());

/**
 * Process POS sale with multi-source payment support
 * POST /retailer/pos/sale
 *
 * Automatically splits payment between wallet and loan balance when needed.
 * Uses wallet balance first (for gas rewards eligibility), then loan balance.
 */
router.post('/pos/sale', authMiddleware, /*#__PURE__*/function () {
  var _ref25 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee25(req, res) {
    var _req$body6, items, payment_method, customer_phone, customer_name, customer_id, _req$body6$discount, discount, notes, subtotal, total, paymentDetails, walletService, validation, purchaseResult, totalProfit, _iterator, _step, item, productQuery, productResult, costPrice, sellingPrice, quantity, itemProfit, rewardsService, _orderId, rewardResult, _rewardResult$reward, _rewardResult$reward2, _rewardResult$reward3, orderId, receiptNumber, insertOrderQuery, orderResult, order, _t5, _t6, _t7;
    return _regenerator["default"].wrap(function (_context25) {
      while (1) switch (_context25.prev = _context25.next) {
        case 0:
          _context25.prev = 0;
          _req$body6 = req.body, items = _req$body6.items, payment_method = _req$body6.payment_method, customer_phone = _req$body6.customer_phone, customer_name = _req$body6.customer_name, customer_id = _req$body6.customer_id, _req$body6$discount = _req$body6.discount, discount = _req$body6$discount === void 0 ? 0 : _req$body6$discount, notes = _req$body6.notes; // Validate required fields
          if (!(!items || !Array.isArray(items) || items.length === 0)) {
            _context25.next = 1;
            break;
          }
          return _context25.abrupt("return", res.status(400).json({
            error: 'Items array is required'
          }));
        case 1:
          if (!(payment_method !== 'wallet' && payment_method !== 'nfc' && payment_method !== 'credit')) {
            _context25.next = 2;
            break;
          }
          return _context25.abrupt("return", res.status(400).json({
            error: 'Invalid payment method. Only wallet, nfc, or credit allowed.'
          }));
        case 2:
          // Calculate total
          subtotal = items.reduce(function (sum, item) {
            if (!item.product_id || !item.quantity || !item.price) {
              throw new Error('Invalid item format. Each item must have product_id, quantity, and price.');
            }
            return sum + item.price * item.quantity;
          }, 0);
          total = subtotal - discount;
          if (!(total <= 0)) {
            _context25.next = 3;
            break;
          }
          return _context25.abrupt("return", res.status(400).json({
            error: 'Total must be greater than zero'
          }));
        case 3:
          if (!((payment_method === 'wallet' || payment_method === 'nfc') && !customer_id)) {
            _context25.next = 4;
            break;
          }
          return _context25.abrupt("return", res.status(400).json({
            error: 'customer_id is required for wallet/NFC payments'
          }));
        case 4:
          paymentDetails = {
            method: payment_method
          }; // Process wallet/NFC payment with multi-source support
          if (!(payment_method === 'wallet' || payment_method === 'nfc')) {
            _context25.next = 22;
            break;
          }
          walletService = new _walletBalance.WalletBalanceService(); // Validate purchase possibility
          _context25.next = 5;
          return walletService.validatePurchase(customer_id, total);
        case 5:
          validation = _context25.sent;
          if (validation.canPurchase) {
            _context25.next = 6;
            break;
          }
          return _context25.abrupt("return", res.status(400).json({
            error: validation.reason,
            totalBalance: validation.totalBalance,
            requiredAmount: validation.requiredAmount,
            shortfall: validation.shortfall
          }));
        case 6:
          _context25.next = 7;
          return walletService.processPurchase(customer_id, total, "pos_".concat(Date.now()), // orderId
          "POS Sale - ".concat(items.length, " items"));
        case 7:
          purchaseResult = _context25.sent;
          paymentDetails = {
            method: payment_method,
            totalPaid: purchaseResult.totalPaid,
            fromWallet: purchaseResult.fromWallet,
            fromLoan: purchaseResult.fromLoan,
            splitPayment: purchaseResult.fromWallet > 0 && purchaseResult.fromLoan > 0,
            walletTransaction: purchaseResult.walletTransaction,
            loanTransaction: purchaseResult.loanTransaction
          };

          // Calculate and process gas rewards for wallet-funded portion only
          // Only wallet balance earns rewards, loan balance does not
          if (!(purchaseResult.fromWallet > 0)) {
            _context25.next = 21;
            break;
          }
          _context25.prev = 8;
          // Calculate total profit from all items
          totalProfit = 0;
          _iterator = _createForOfIteratorHelper(items);
          _context25.prev = 9;
          _iterator.s();
        case 10:
          if ((_step = _iterator.n()).done) {
            _context25.next = 13;
            break;
          }
          item = _step.value;
          // Fetch cost price from inventory
          productQuery = "\n                SELECT cost_price\n                FROM bigcompany.retailer_inventory\n                WHERE product_id = $1\n                LIMIT 1\n              ";
          _context25.next = 11;
          return db.query(productQuery, [item.product_id]);
        case 11:
          productResult = _context25.sent;
          if (productResult.rows.length > 0) {
            costPrice = parseFloat(productResult.rows[0].cost_price) || 0;
            sellingPrice = parseFloat(item.price);
            quantity = parseInt(item.quantity);
            itemProfit = (sellingPrice - costPrice) * quantity;
            totalProfit += itemProfit;
          }
        case 12:
          _context25.next = 10;
          break;
        case 13:
          _context25.next = 15;
          break;
        case 14:
          _context25.prev = 14;
          _t5 = _context25["catch"](9);
          _iterator.e(_t5);
        case 15:
          _context25.prev = 15;
          _iterator.f();
          return _context25.finish(15);
        case 16:
          if (!(totalProfit > 0)) {
            _context25.next = 18;
            break;
          }
          rewardsService = new _rewards.RewardsService();
          _orderId = "pos_".concat(Date.now()); // Process reward with wallet-funded amount
          // meterId is optional - if not provided, reward is pending until customer claims
          _context25.next = 17;
          return rewardsService.processOrderReward(customer_id, _orderId, totalProfit, purchaseResult.fromWallet, undefined // meterId optional - customer can add later
          );
        case 17:
          rewardResult = _context25.sent;
          // Add reward info to payment details
          if (rewardResult.success) {
            paymentDetails.gasReward = {
              eligible: true,
              rewardAmount: ((_rewardResult$reward = rewardResult.reward) === null || _rewardResult$reward === void 0 ? void 0 : _rewardResult$reward.reward_amount) || 0,
              status: ((_rewardResult$reward2 = rewardResult.reward) === null || _rewardResult$reward2 === void 0 ? void 0 : _rewardResult$reward2.status) || 'pending',
              message: (_rewardResult$reward3 = rewardResult.reward) !== null && _rewardResult$reward3 !== void 0 && _rewardResult$reward3.meter_id ? 'Gas reward credited to your meter' : 'Gas reward pending - add meter ID to claim'
            };
          } else {
            paymentDetails.gasReward = {
              eligible: false,
              message: rewardResult.error || 'Not eligible for gas rewards'
            };
          }
        case 18:
          _context25.next = 20;
          break;
        case 19:
          _context25.prev = 19;
          _t6 = _context25["catch"](8);
          console.error('Error processing gas rewards:', _t6);
          // Don't fail the sale if rewards processing fails
          paymentDetails.gasReward = {
            eligible: false,
            message: 'Gas rewards processing failed - contact support'
          };
        case 20:
          _context25.next = 22;
          break;
        case 21:
          // Payment was fully from loan - no gas rewards
          paymentDetails.gasReward = {
            eligible: false,
            message: 'Loan-funded purchases do not earn gas rewards'
          };
        case 22:
          // Create order record in database
          orderId = "pos_".concat(Date.now());
          receiptNumber = "RCP-".concat(Date.now().toString().slice(-8));
          insertOrderQuery = "\n        INSERT INTO bigcompany.orders (\n          id, receipt_number, customer_phone, customer_name, customer_id,\n          items, subtotal, discount, total, payment_method, payment_details,\n          status, notes, created_at\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())\n        RETURNING *\n      ";
          _context25.next = 23;
          return db.query(insertOrderQuery, [orderId, receiptNumber, customer_phone || null, customer_name || 'Walk-in Customer', customer_id || null, JSON.stringify(items), subtotal, discount, total, payment_method, JSON.stringify(paymentDetails), 'completed', notes || null]);
        case 23:
          orderResult = _context25.sent;
          order = orderResult.rows[0];
          res.status(201).json({
            id: order.id,
            receipt_number: order.receipt_number,
            items: JSON.parse(order.items),
            subtotal: parseFloat(order.subtotal),
            discount: parseFloat(order.discount),
            total: parseFloat(order.total),
            payment_method: order.payment_method,
            payment_details: paymentDetails,
            customer_phone: order.customer_phone,
            customer_name: order.customer_name,
            status: order.status,
            notes: order.notes,
            created_at: order.created_at
          });
          _context25.next = 25;
          break;
        case 24:
          _context25.prev = 24;
          _t7 = _context25["catch"](0);
          console.error('Error processing POS sale:', _t7);
          res.status(500).json({
            error: _t7.message || 'Failed to process sale'
          });
        case 25:
        case "end":
          return _context25.stop();
      }
    }, _callee25, null, [[0, 24], [8, 19], [9, 14, 15, 16]]);
  }));
  return function (_x52, _x53) {
    return _ref25.apply(this, arguments);
  };
}());
router.get('/pos/history', authMiddleware, /*#__PURE__*/function () {
  var _ref26 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee26(req, res) {
    var _req$query5, _req$query5$limit, limit, _req$query5$offset, offset, date, sales;
    return _regenerator["default"].wrap(function (_context26) {
      while (1) switch (_context26.prev = _context26.next) {
        case 0:
          try {
            _req$query5 = req.query, _req$query5$limit = _req$query5.limit, limit = _req$query5$limit === void 0 ? 20 : _req$query5$limit, _req$query5$offset = _req$query5.offset, offset = _req$query5$offset === void 0 ? 0 : _req$query5$offset, date = _req$query5.date;
            sales = [{
              id: 'pos_001',
              total: 15000,
              items: 3,
              payment_method: 'cash',
              created_at: '2024-11-28T10:30:00Z'
            }, {
              id: 'pos_002',
              total: 8500,
              items: 2,
              payment_method: 'mtn_momo',
              created_at: '2024-11-28T10:15:00Z'
            }, {
              id: 'pos_003',
              total: 22000,
              items: 5,
              payment_method: 'cash',
              created_at: '2024-11-28T09:45:00Z'
            }, {
              id: 'pos_004',
              total: 6500,
              items: 1,
              payment_method: 'airtel_money',
              created_at: '2024-11-28T09:30:00Z'
            }];
            res.json({
              sales: sales.slice(Number(offset), Number(offset) + Number(limit)),
              count: sales.length
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context26.stop();
      }
    }, _callee26);
  }));
  return function (_x54, _x55) {
    return _ref26.apply(this, arguments);
  };
}());

// ==================== CREDIT ROUTES ====================

// Credit summary endpoint
router.get('/credit', authMiddleware, /*#__PURE__*/function () {
  var _ref27 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee27(req, res) {
    return _regenerator["default"].wrap(function (_context27) {
      while (1) switch (_context27.prev = _context27.next) {
        case 0:
          try {
            res.json({
              total_credit_given: 450000,
              total_collected: 285000,
              total_outstanding: 165000,
              overdue_amount: 32000,
              active_credit_customers: 12,
              collection_rate: 63.3,
              currency: 'RWF',
              recent_orders: [{
                id: 'crd_001',
                customer: 'Jean Uwimana',
                phone: '+250788111222',
                total: 45000,
                paid: 20000,
                balance: 25000,
                due_date: '2024-12-05',
                status: 'partial',
                created_at: '2024-11-20T10:30:00Z'
              }, {
                id: 'crd_002',
                customer: 'Marie Mukamana',
                phone: '+250788222333',
                total: 28000,
                paid: 0,
                balance: 28000,
                due_date: '2024-12-01',
                status: 'pending',
                created_at: '2024-11-22T09:15:00Z'
              }, {
                id: 'crd_003',
                customer: 'Emmanuel Habimana',
                phone: '+250788333444',
                total: 15000,
                paid: 15000,
                balance: 0,
                due_date: '2024-11-28',
                status: 'paid',
                created_at: '2024-11-15T08:45:00Z'
              }]
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context27.stop();
      }
    }, _callee27);
  }));
  return function (_x56, _x57) {
    return _ref27.apply(this, arguments);
  };
}());

// Credit orders endpoint (alias for /credit-orders for backward compatibility)
router.get('/credit/orders', authMiddleware, /*#__PURE__*/function () {
  var _ref28 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee28(req, res) {
    var _req$query6, _req$query6$limit, limit, _req$query6$offset, offset, status, creditOrders;
    return _regenerator["default"].wrap(function (_context28) {
      while (1) switch (_context28.prev = _context28.next) {
        case 0:
          try {
            _req$query6 = req.query, _req$query6$limit = _req$query6.limit, limit = _req$query6$limit === void 0 ? 10 : _req$query6$limit, _req$query6$offset = _req$query6.offset, offset = _req$query6$offset === void 0 ? 0 : _req$query6$offset, status = _req$query6.status;
            creditOrders = [{
              id: 'crd_001',
              customer: 'Jean Uwimana',
              phone: '+250788111222',
              total: 45000,
              paid: 20000,
              balance: 25000,
              due_date: '2024-12-05',
              status: 'partial',
              created_at: '2024-11-20T10:30:00Z'
            }, {
              id: 'crd_002',
              customer: 'Marie Mukamana',
              phone: '+250788222333',
              total: 28000,
              paid: 0,
              balance: 28000,
              due_date: '2024-12-01',
              status: 'pending',
              created_at: '2024-11-22T09:15:00Z'
            }, {
              id: 'crd_003',
              customer: 'Emmanuel Habimana',
              phone: '+250788333444',
              total: 15000,
              paid: 15000,
              balance: 0,
              due_date: '2024-11-28',
              status: 'paid',
              created_at: '2024-11-15T08:45:00Z'
            }, {
              id: 'crd_004',
              customer: 'Alice Uwase',
              phone: '+250788444555',
              total: 62000,
              paid: 30000,
              balance: 32000,
              due_date: '2024-11-25',
              status: 'overdue',
              created_at: '2024-11-10T16:20:00Z'
            }];
            if (status) {
              creditOrders = creditOrders.filter(function (o) {
                return o.status === status;
              });
            }
            res.json({
              credit_orders: creditOrders.slice(Number(offset), Number(offset) + Number(limit)),
              count: creditOrders.length
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context28.stop();
      }
    }, _callee28);
  }));
  return function (_x58, _x59) {
    return _ref28.apply(this, arguments);
  };
}());

// ==================== CREDIT ORDERS ROUTES ====================

router.get('/credit-orders', authMiddleware, /*#__PURE__*/function () {
  var _ref29 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee29(req, res) {
    var _req$query7, _req$query7$limit, limit, _req$query7$offset, offset, status, creditOrders;
    return _regenerator["default"].wrap(function (_context29) {
      while (1) switch (_context29.prev = _context29.next) {
        case 0:
          try {
            _req$query7 = req.query, _req$query7$limit = _req$query7.limit, limit = _req$query7$limit === void 0 ? 10 : _req$query7$limit, _req$query7$offset = _req$query7.offset, offset = _req$query7$offset === void 0 ? 0 : _req$query7$offset, status = _req$query7.status;
            creditOrders = [{
              id: 'crd_001',
              customer: 'Jean Uwimana',
              phone: '+250788111222',
              total: 45000,
              paid: 20000,
              balance: 25000,
              due_date: '2024-12-05',
              status: 'partial',
              created_at: '2024-11-20T10:30:00Z'
            }, {
              id: 'crd_002',
              customer: 'Marie Mukamana',
              phone: '+250788222333',
              total: 28000,
              paid: 0,
              balance: 28000,
              due_date: '2024-12-01',
              status: 'pending',
              created_at: '2024-11-22T09:15:00Z'
            }, {
              id: 'crd_003',
              customer: 'Emmanuel Habimana',
              phone: '+250788333444',
              total: 15000,
              paid: 15000,
              balance: 0,
              due_date: '2024-11-28',
              status: 'paid',
              created_at: '2024-11-15T08:45:00Z'
            }, {
              id: 'crd_004',
              customer: 'Alice Uwase',
              phone: '+250788444555',
              total: 62000,
              paid: 30000,
              balance: 32000,
              due_date: '2024-11-25',
              status: 'overdue',
              created_at: '2024-11-10T16:20:00Z'
            }];
            if (status) {
              creditOrders = creditOrders.filter(function (o) {
                return o.status === status;
              });
            }
            res.json({
              credit_orders: creditOrders.slice(Number(offset), Number(offset) + Number(limit)),
              count: creditOrders.length
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context29.stop();
      }
    }, _callee29);
  }));
  return function (_x60, _x61) {
    return _ref29.apply(this, arguments);
  };
}());
router.get('/credit-orders/stats', authMiddleware, /*#__PURE__*/function () {
  var _ref30 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee30(req, res) {
    return _regenerator["default"].wrap(function (_context30) {
      while (1) switch (_context30.prev = _context30.next) {
        case 0:
          try {
            res.json({
              total_credit_given: 450000,
              total_collected: 285000,
              total_outstanding: 165000,
              overdue_amount: 32000,
              active_credit_customers: 12,
              collection_rate: 63.3,
              currency: 'RWF'
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context30.stop();
      }
    }, _callee30);
  }));
  return function (_x62, _x63) {
    return _ref30.apply(this, arguments);
  };
}());
router.get('/credit-orders/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref31 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee31(req, res) {
    var id, creditOrder;
    return _regenerator["default"].wrap(function (_context31) {
      while (1) switch (_context31.prev = _context31.next) {
        case 0:
          try {
            id = req.params.id;
            creditOrder = {
              id: id,
              customer: {
                name: 'Jean Uwimana',
                phone: '+250788111222',
                address: 'KG 123 St, Kigali'
              },
              items: [{
                id: 'item_1',
                name: 'Inyange Milk 500ml',
                quantity: 10,
                unit_price: 800,
                total: 8000
              }, {
                id: 'item_2',
                name: 'Bralirwa Primus 500ml',
                quantity: 20,
                unit_price: 1200,
                total: 24000
              }, {
                id: 'item_3',
                name: 'Akabanga Chili Oil',
                quantity: 2,
                unit_price: 6500,
                total: 13000
              }],
              total: 45000,
              paid: 20000,
              balance: 25000,
              due_date: '2024-12-05',
              status: 'partial',
              payments: [{
                id: 'pay_1',
                amount: 20000,
                method: 'cash',
                date: '2024-11-25T14:00:00Z'
              }],
              created_at: '2024-11-20T10:30:00Z'
            };
            res.json(creditOrder);
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context31.stop();
      }
    }, _callee31);
  }));
  return function (_x64, _x65) {
    return _ref31.apply(this, arguments);
  };
}());
router.post('/credit-orders', authMiddleware, /*#__PURE__*/function () {
  var _ref32 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee32(req, res) {
    var _req$body7, customer_name, customer_phone, items, due_date, total;
    return _regenerator["default"].wrap(function (_context32) {
      while (1) switch (_context32.prev = _context32.next) {
        case 0:
          try {
            _req$body7 = req.body, customer_name = _req$body7.customer_name, customer_phone = _req$body7.customer_phone, items = _req$body7.items, due_date = _req$body7.due_date;
            total = items.reduce(function (sum, item) {
              return sum + item.unit_price * item.quantity;
            }, 0);
            res.status(201).json({
              id: "crd_".concat(Date.now()),
              customer: {
                name: customer_name,
                phone: customer_phone
              },
              items: items,
              total: total,
              paid: 0,
              balance: total,
              due_date: due_date,
              status: 'pending',
              created_at: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context32.stop();
      }
    }, _callee32);
  }));
  return function (_x66, _x67) {
    return _ref32.apply(this, arguments);
  };
}());
router.post('/credit-orders/:id/payment', authMiddleware, /*#__PURE__*/function () {
  var _ref33 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee33(req, res) {
    var id, _req$body8, amount, method;
    return _regenerator["default"].wrap(function (_context33) {
      while (1) switch (_context33.prev = _context33.next) {
        case 0:
          try {
            id = req.params.id;
            _req$body8 = req.body, amount = _req$body8.amount, method = _req$body8.method;
            res.json({
              id: id,
              payment: {
                id: "pay_".concat(Date.now()),
                amount: amount,
                method: method,
                date: new Date().toISOString()
              },
              new_balance: 25000 - amount,
              status: amount >= 25000 ? 'paid' : 'partial'
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context33.stop();
      }
    }, _callee33);
  }));
  return function (_x68, _x69) {
    return _ref33.apply(this, arguments);
  };
}());

// ==================== BRANCH MANAGEMENT ROUTES ====================

// Mock branch data (in production, use database)
var branches = new Map([['br_001', {
  id: 'br_001',
  retailer_id: 'ret_001',
  branch_code: 'KGL-MAIN',
  branch_name: 'Kigali Main Branch',
  address: 'KN 4 Ave, Kigali',
  city: 'Kigali',
  district: 'Nyarugenge',
  phone: '+250788123456',
  manager_name: 'Jean Baptiste',
  manager_phone: '+250788111222',
  location_lat: -1.9403,
  location_lng: 29.8739,
  is_active: true,
  is_main_branch: true,
  operating_hours: {
    mon: '08:00-20:00',
    tue: '08:00-20:00',
    wed: '08:00-20:00',
    thu: '08:00-20:00',
    fri: '08:00-20:00',
    sat: '09:00-18:00',
    sun: '10:00-16:00'
  },
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2024-11-28T10:00:00Z'
}], ['br_002', {
  id: 'br_002',
  retailer_id: 'ret_001',
  branch_code: 'KGL-KIMH',
  branch_name: 'Kimihurura Branch',
  address: 'KG 9 Ave, Kimihurura',
  city: 'Kigali',
  district: 'Gasabo',
  phone: '+250788234567',
  manager_name: 'Marie Claire',
  manager_phone: '+250788222333',
  location_lat: -1.9537,
  location_lng: 30.0912,
  is_active: true,
  is_main_branch: false,
  operating_hours: {
    mon: '08:00-20:00',
    tue: '08:00-20:00',
    wed: '08:00-20:00',
    thu: '08:00-20:00',
    fri: '08:00-20:00',
    sat: '09:00-18:00',
    sun: 'closed'
  },
  created_at: '2024-03-10T08:00:00Z',
  updated_at: '2024-11-25T14:00:00Z'
}], ['br_003', {
  id: 'br_003',
  retailer_id: 'ret_001',
  branch_code: 'HYE-001',
  branch_name: 'Huye Branch',
  address: 'NR 2, Huye Town',
  city: 'Huye',
  district: 'Huye',
  phone: '+250788345678',
  manager_name: 'Emmanuel Nkurunziza',
  manager_phone: '+250788333444',
  location_lat: -2.5912,
  location_lng: 29.7425,
  is_active: true,
  is_main_branch: false,
  operating_hours: {
    mon: '07:30-19:00',
    tue: '07:30-19:00',
    wed: '07:30-19:00',
    thu: '07:30-19:00',
    fri: '07:30-19:00',
    sat: '08:00-17:00',
    sun: 'closed'
  },
  created_at: '2024-06-15T08:00:00Z',
  updated_at: '2024-11-20T10:00:00Z'
}]]);

// Mock POS terminals data
var posTerminals = new Map([['term_001', {
  id: 'term_001',
  branch_id: 'br_001',
  terminal_code: 'POS-KGL-001',
  terminal_name: 'Main Counter 1',
  device_type: 'standard',
  serial_number: 'SN-2024-001',
  is_active: true,
  last_seen_at: new Date().toISOString()
}], ['term_002', {
  id: 'term_002',
  branch_id: 'br_001',
  terminal_code: 'POS-KGL-002',
  terminal_name: 'Main Counter 2',
  device_type: 'standard',
  serial_number: 'SN-2024-002',
  is_active: true,
  last_seen_at: new Date().toISOString()
}], ['term_003', {
  id: 'term_003',
  branch_id: 'br_002',
  terminal_code: 'POS-KIM-001',
  terminal_name: 'Checkout 1',
  device_type: 'mobile',
  serial_number: 'SN-2024-003',
  is_active: true,
  last_seen_at: new Date().toISOString()
}], ['term_004', {
  id: 'term_004',
  branch_id: 'br_003',
  terminal_code: 'POS-HYE-001',
  terminal_name: 'Counter 1',
  device_type: 'standard',
  serial_number: 'SN-2024-004',
  is_active: true,
  last_seen_at: new Date().toISOString()
}]]);

// GET /retailer/branches - list all branches for the retailer
router.get('/branches', authMiddleware, /*#__PURE__*/function () {
  var _ref34 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee34(req, res) {
    var user, _req$query8, is_active, _req$query8$limit, limit, _req$query8$offset, offset, branchList, branchesWithStats;
    return _regenerator["default"].wrap(function (_context34) {
      while (1) switch (_context34.prev = _context34.next) {
        case 0:
          try {
            user = req.user;
            _req$query8 = req.query, is_active = _req$query8.is_active, _req$query8$limit = _req$query8.limit, limit = _req$query8$limit === void 0 ? 20 : _req$query8$limit, _req$query8$offset = _req$query8.offset, offset = _req$query8$offset === void 0 ? 0 : _req$query8$offset;
            branchList = Array.from(branches.values()).filter(function (b) {
              return b.retailer_id === user.id || user.id === 'ret_001';
            });
            if (is_active !== undefined) {
              branchList = branchList.filter(function (b) {
                return b.is_active === (is_active === 'true');
              });
            }

            // Add stats for each branch
            branchesWithStats = branchList.map(function (branch) {
              return _objectSpread(_objectSpread({}, branch), {}, {
                terminals_count: Array.from(posTerminals.values()).filter(function (t) {
                  return t.branch_id === branch.id;
                }).length,
                today_sales: Math.floor(Math.random() * 200000) + 50000,
                today_transactions: Math.floor(Math.random() * 30) + 5
              });
            });
            res.json({
              branches: branchesWithStats.slice(Number(offset), Number(offset) + Number(limit)),
              count: branchesWithStats.length,
              limit: Number(limit),
              offset: Number(offset)
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context34.stop();
      }
    }, _callee34);
  }));
  return function (_x70, _x71) {
    return _ref34.apply(this, arguments);
  };
}());

// GET /retailer/branches/stats - aggregate branch statistics
router.get('/branches/stats', authMiddleware, /*#__PURE__*/function () {
  var _ref35 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee35(req, res) {
    var user, branchList;
    return _regenerator["default"].wrap(function (_context35) {
      while (1) switch (_context35.prev = _context35.next) {
        case 0:
          try {
            user = req.user;
            branchList = Array.from(branches.values()).filter(function (b) {
              return b.retailer_id === user.id || user.id === 'ret_001';
            });
            res.json({
              total_branches: branchList.length,
              active_branches: branchList.filter(function (b) {
                return b.is_active;
              }).length,
              inactive_branches: branchList.filter(function (b) {
                return !b.is_active;
              }).length,
              total_terminals: Array.from(posTerminals.values()).filter(function (t) {
                return branchList.some(function (b) {
                  return b.id === t.branch_id;
                });
              }).length,
              cities_covered: (0, _toConsumableArray2["default"])(new Set(branchList.map(function (b) {
                return b.city;
              }))).length,
              today_total_sales: 485000,
              today_total_transactions: 67,
              best_performing_branch: 'Kigali Main Branch',
              currency: 'RWF'
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context35.stop();
      }
    }, _callee35);
  }));
  return function (_x72, _x73) {
    return _ref35.apply(this, arguments);
  };
}());

// POST /retailer/branches - create new branch
router.post('/branches', authMiddleware, /*#__PURE__*/function () {
  var _ref36 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee36(req, res) {
    var user, _req$body9, branch_name, branch_code, address, city, district, phone, manager_name, manager_phone, location_lat, location_lng, operating_hours, newBranch, _t8;
    return _regenerator["default"].wrap(function (_context36) {
      while (1) switch (_context36.prev = _context36.next) {
        case 0:
          _context36.prev = 0;
          user = req.user;
          _req$body9 = req.body, branch_name = _req$body9.branch_name, branch_code = _req$body9.branch_code, address = _req$body9.address, city = _req$body9.city, district = _req$body9.district, phone = _req$body9.phone, manager_name = _req$body9.manager_name, manager_phone = _req$body9.manager_phone, location_lat = _req$body9.location_lat, location_lng = _req$body9.location_lng, operating_hours = _req$body9.operating_hours;
          if (!(!branch_name || !branch_code)) {
            _context36.next = 1;
            break;
          }
          return _context36.abrupt("return", res.status(400).json({
            error: 'branch_name and branch_code are required'
          }));
        case 1:
          newBranch = {
            id: "br_".concat(Date.now()),
            retailer_id: user.id,
            branch_code: branch_code,
            branch_name: branch_name,
            address: address || '',
            city: city || '',
            district: district || '',
            phone: phone || '',
            manager_name: manager_name || '',
            manager_phone: manager_phone || '',
            location_lat: location_lat || null,
            location_lng: location_lng || null,
            is_active: true,
            is_main_branch: false,
            operating_hours: operating_hours || {
              mon: '08:00-20:00',
              tue: '08:00-20:00',
              wed: '08:00-20:00',
              thu: '08:00-20:00',
              fri: '08:00-20:00',
              sat: '09:00-18:00',
              sun: 'closed'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          branches.set(newBranch.id, newBranch);
          res.status(201).json(newBranch);
          _context36.next = 3;
          break;
        case 2:
          _context36.prev = 2;
          _t8 = _context36["catch"](0);
          res.status(500).json({
            error: _t8.message
          });
        case 3:
        case "end":
          return _context36.stop();
      }
    }, _callee36, null, [[0, 2]]);
  }));
  return function (_x74, _x75) {
    return _ref36.apply(this, arguments);
  };
}());

// GET /retailer/branches/:id - get branch details
router.get('/branches/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref37 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee37(req, res) {
    var id, branch, branchTerminals, _t9;
    return _regenerator["default"].wrap(function (_context37) {
      while (1) switch (_context37.prev = _context37.next) {
        case 0:
          _context37.prev = 0;
          id = req.params.id;
          branch = branches.get(id);
          if (branch) {
            _context37.next = 1;
            break;
          }
          return _context37.abrupt("return", res.status(404).json({
            error: 'Branch not found'
          }));
        case 1:
          // Get terminals for this branch
          branchTerminals = Array.from(posTerminals.values()).filter(function (t) {
            return t.branch_id === id;
          });
          res.json(_objectSpread(_objectSpread({}, branch), {}, {
            terminals: branchTerminals,
            terminals_count: branchTerminals.length,
            active_terminals: branchTerminals.filter(function (t) {
              return t.is_active;
            }).length
          }));
          _context37.next = 3;
          break;
        case 2:
          _context37.prev = 2;
          _t9 = _context37["catch"](0);
          res.status(500).json({
            error: _t9.message
          });
        case 3:
        case "end":
          return _context37.stop();
      }
    }, _callee37, null, [[0, 2]]);
  }));
  return function (_x76, _x77) {
    return _ref37.apply(this, arguments);
  };
}());

// PUT /retailer/branches/:id - update branch
router.put('/branches/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref38 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee38(req, res) {
    var id, branch, updateData, updatedBranch, _t0;
    return _regenerator["default"].wrap(function (_context38) {
      while (1) switch (_context38.prev = _context38.next) {
        case 0:
          _context38.prev = 0;
          id = req.params.id;
          branch = branches.get(id);
          if (branch) {
            _context38.next = 1;
            break;
          }
          return _context38.abrupt("return", res.status(404).json({
            error: 'Branch not found'
          }));
        case 1:
          updateData = req.body;
          updatedBranch = _objectSpread(_objectSpread(_objectSpread({}, branch), updateData), {}, {
            id: branch.id,
            // Prevent ID override
            retailer_id: branch.retailer_id,
            // Prevent retailer_id override
            updated_at: new Date().toISOString()
          });
          branches.set(id, updatedBranch);
          res.json(updatedBranch);
          _context38.next = 3;
          break;
        case 2:
          _context38.prev = 2;
          _t0 = _context38["catch"](0);
          res.status(500).json({
            error: _t0.message
          });
        case 3:
        case "end":
          return _context38.stop();
      }
    }, _callee38, null, [[0, 2]]);
  }));
  return function (_x78, _x79) {
    return _ref38.apply(this, arguments);
  };
}());

// DELETE /retailer/branches/:id - deactivate branch (soft delete)
router["delete"]('/branches/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref39 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee39(req, res) {
    var id, branch, _t1;
    return _regenerator["default"].wrap(function (_context39) {
      while (1) switch (_context39.prev = _context39.next) {
        case 0:
          _context39.prev = 0;
          id = req.params.id;
          branch = branches.get(id);
          if (branch) {
            _context39.next = 1;
            break;
          }
          return _context39.abrupt("return", res.status(404).json({
            error: 'Branch not found'
          }));
        case 1:
          if (!branch.is_main_branch) {
            _context39.next = 2;
            break;
          }
          return _context39.abrupt("return", res.status(400).json({
            error: 'Cannot deactivate the main branch'
          }));
        case 2:
          branch.is_active = false;
          branch.updated_at = new Date().toISOString();
          branches.set(id, branch);
          res.json({
            message: 'Branch deactivated successfully',
            branch: branch
          });
          _context39.next = 4;
          break;
        case 3:
          _context39.prev = 3;
          _t1 = _context39["catch"](0);
          res.status(500).json({
            error: _t1.message
          });
        case 4:
        case "end":
          return _context39.stop();
      }
    }, _callee39, null, [[0, 3]]);
  }));
  return function (_x80, _x81) {
    return _ref39.apply(this, arguments);
  };
}());

// ==================== POS TERMINAL MANAGEMENT ROUTES ====================

// GET /retailer/branches/:id/terminals - list POS terminals for a branch
router.get('/branches/:id/terminals', authMiddleware, /*#__PURE__*/function () {
  var _ref40 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee40(req, res) {
    var id, is_active, branch, terminals, _t10;
    return _regenerator["default"].wrap(function (_context40) {
      while (1) switch (_context40.prev = _context40.next) {
        case 0:
          _context40.prev = 0;
          id = req.params.id;
          is_active = req.query.is_active;
          branch = branches.get(id);
          if (branch) {
            _context40.next = 1;
            break;
          }
          return _context40.abrupt("return", res.status(404).json({
            error: 'Branch not found'
          }));
        case 1:
          terminals = Array.from(posTerminals.values()).filter(function (t) {
            return t.branch_id === id;
          });
          if (is_active !== undefined) {
            terminals = terminals.filter(function (t) {
              return t.is_active === (is_active === 'true');
            });
          }
          res.json({
            branch_id: id,
            branch_name: branch.branch_name,
            terminals: terminals,
            count: terminals.length
          });
          _context40.next = 3;
          break;
        case 2:
          _context40.prev = 2;
          _t10 = _context40["catch"](0);
          res.status(500).json({
            error: _t10.message
          });
        case 3:
        case "end":
          return _context40.stop();
      }
    }, _callee40, null, [[0, 2]]);
  }));
  return function (_x82, _x83) {
    return _ref40.apply(this, arguments);
  };
}());

// POST /retailer/branches/:id/terminals - register new POS terminal
router.post('/branches/:id/terminals', authMiddleware, /*#__PURE__*/function () {
  var _ref41 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee41(req, res) {
    var id, _req$body0, terminal_code, terminal_name, device_type, serial_number, branch, newTerminal, _t11;
    return _regenerator["default"].wrap(function (_context41) {
      while (1) switch (_context41.prev = _context41.next) {
        case 0:
          _context41.prev = 0;
          id = req.params.id;
          _req$body0 = req.body, terminal_code = _req$body0.terminal_code, terminal_name = _req$body0.terminal_name, device_type = _req$body0.device_type, serial_number = _req$body0.serial_number;
          branch = branches.get(id);
          if (branch) {
            _context41.next = 1;
            break;
          }
          return _context41.abrupt("return", res.status(404).json({
            error: 'Branch not found'
          }));
        case 1:
          if (terminal_code) {
            _context41.next = 2;
            break;
          }
          return _context41.abrupt("return", res.status(400).json({
            error: 'terminal_code is required'
          }));
        case 2:
          newTerminal = {
            id: "term_".concat(Date.now()),
            branch_id: id,
            terminal_code: terminal_code,
            terminal_name: terminal_name || "Terminal ".concat(terminal_code),
            device_type: device_type || 'standard',
            serial_number: serial_number || '',
            is_active: true,
            last_seen_at: null,
            created_at: new Date().toISOString()
          };
          posTerminals.set(newTerminal.id, newTerminal);
          res.status(201).json(newTerminal);
          _context41.next = 4;
          break;
        case 3:
          _context41.prev = 3;
          _t11 = _context41["catch"](0);
          res.status(500).json({
            error: _t11.message
          });
        case 4:
        case "end":
          return _context41.stop();
      }
    }, _callee41, null, [[0, 3]]);
  }));
  return function (_x84, _x85) {
    return _ref41.apply(this, arguments);
  };
}());

// PUT /retailer/terminals/:id - update POS terminal
router.put('/terminals/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref42 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee42(req, res) {
    var id, terminal, updateData, updatedTerminal, _t12;
    return _regenerator["default"].wrap(function (_context42) {
      while (1) switch (_context42.prev = _context42.next) {
        case 0:
          _context42.prev = 0;
          id = req.params.id;
          terminal = posTerminals.get(id);
          if (terminal) {
            _context42.next = 1;
            break;
          }
          return _context42.abrupt("return", res.status(404).json({
            error: 'Terminal not found'
          }));
        case 1:
          updateData = req.body;
          updatedTerminal = _objectSpread(_objectSpread(_objectSpread({}, terminal), updateData), {}, {
            id: terminal.id,
            // Prevent ID override
            branch_id: terminal.branch_id // Prevent branch_id override
          });
          posTerminals.set(id, updatedTerminal);
          res.json(updatedTerminal);
          _context42.next = 3;
          break;
        case 2:
          _context42.prev = 2;
          _t12 = _context42["catch"](0);
          res.status(500).json({
            error: _t12.message
          });
        case 3:
        case "end":
          return _context42.stop();
      }
    }, _callee42, null, [[0, 2]]);
  }));
  return function (_x86, _x87) {
    return _ref42.apply(this, arguments);
  };
}());

// DELETE /retailer/terminals/:id - deactivate POS terminal
router["delete"]('/terminals/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref43 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee43(req, res) {
    var id, terminal, _t13;
    return _regenerator["default"].wrap(function (_context43) {
      while (1) switch (_context43.prev = _context43.next) {
        case 0:
          _context43.prev = 0;
          id = req.params.id;
          terminal = posTerminals.get(id);
          if (terminal) {
            _context43.next = 1;
            break;
          }
          return _context43.abrupt("return", res.status(404).json({
            error: 'Terminal not found'
          }));
        case 1:
          terminal.is_active = false;
          posTerminals.set(id, terminal);
          res.json({
            message: 'Terminal deactivated successfully',
            terminal: terminal
          });
          _context43.next = 3;
          break;
        case 2:
          _context43.prev = 2;
          _t13 = _context43["catch"](0);
          res.status(500).json({
            error: _t13.message
          });
        case 3:
        case "end":
          return _context43.stop();
      }
    }, _callee43, null, [[0, 2]]);
  }));
  return function (_x88, _x89) {
    return _ref43.apply(this, arguments);
  };
}());

// ==================== BRANCH TRANSACTION & SUMMARY ROUTES ====================

// GET /retailer/branches/:id/transactions - branch transaction history
router.get('/branches/:id/transactions', authMiddleware, /*#__PURE__*/function () {
  var _ref44 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee44(req, res) {
    var id, _req$query9, _req$query9$limit, limit, _req$query9$offset, offset, start_date, end_date, payment_method, branch, transactions, _t14;
    return _regenerator["default"].wrap(function (_context44) {
      while (1) switch (_context44.prev = _context44.next) {
        case 0:
          _context44.prev = 0;
          id = req.params.id;
          _req$query9 = req.query, _req$query9$limit = _req$query9.limit, limit = _req$query9$limit === void 0 ? 20 : _req$query9$limit, _req$query9$offset = _req$query9.offset, offset = _req$query9$offset === void 0 ? 0 : _req$query9$offset, start_date = _req$query9.start_date, end_date = _req$query9.end_date, payment_method = _req$query9.payment_method;
          branch = branches.get(id);
          if (branch) {
            _context44.next = 1;
            break;
          }
          return _context44.abrupt("return", res.status(404).json({
            error: 'Branch not found'
          }));
        case 1:
          // Mock transaction data for the branch
          transactions = [{
            id: 'txn_001',
            transaction_ref: 'TXN-2024-001',
            terminal_id: 'term_001',
            card_uid: 'NFC-001',
            customer_name: 'Jean Uwimana',
            amount: 15000,
            payment_method: 'nfc_card',
            pin_used: false,
            status: 'completed',
            cashier_name: 'Alice',
            receipt_number: 'RCP-001',
            created_at: '2024-11-28T10:30:00Z'
          }, {
            id: 'txn_002',
            transaction_ref: 'TXN-2024-002',
            terminal_id: 'term_001',
            card_uid: 'NFC-002',
            customer_name: 'Marie Claire',
            amount: 28500,
            payment_method: 'nfc_card',
            pin_used: true,
            status: 'completed',
            cashier_name: 'Bob',
            receipt_number: 'RCP-002',
            created_at: '2024-11-28T09:45:00Z'
          }, {
            id: 'txn_003',
            transaction_ref: 'TXN-2024-003',
            terminal_id: 'term_002',
            card_uid: null,
            customer_name: 'Emmanuel H.',
            amount: 8500,
            payment_method: 'mtn_momo',
            pin_used: false,
            status: 'completed',
            cashier_name: 'Alice',
            receipt_number: 'RCP-003',
            created_at: '2024-11-28T09:15:00Z'
          }, {
            id: 'txn_004',
            transaction_ref: 'TXN-2024-004',
            terminal_id: 'term_001',
            card_uid: 'NFC-003',
            customer_name: 'Patrick N.',
            amount: 42000,
            payment_method: 'nfc_card',
            pin_used: true,
            status: 'completed',
            cashier_name: 'Charlie',
            receipt_number: 'RCP-004',
            created_at: '2024-11-28T08:30:00Z'
          }, {
            id: 'txn_005',
            transaction_ref: 'TXN-2024-005',
            terminal_id: 'term_001',
            card_uid: null,
            customer_name: 'Alice U.',
            amount: 6200,
            payment_method: 'cash',
            pin_used: false,
            status: 'completed',
            cashier_name: 'Alice',
            receipt_number: 'RCP-005',
            created_at: '2024-11-27T17:45:00Z'
          }];
          res.json({
            branch_id: id,
            branch_name: branch.branch_name,
            transactions: transactions.slice(Number(offset), Number(offset) + Number(limit)),
            count: transactions.length,
            limit: Number(limit),
            offset: Number(offset)
          });
          _context44.next = 3;
          break;
        case 2:
          _context44.prev = 2;
          _t14 = _context44["catch"](0);
          res.status(500).json({
            error: _t14.message
          });
        case 3:
        case "end":
          return _context44.stop();
      }
    }, _callee44, null, [[0, 2]]);
  }));
  return function (_x90, _x91) {
    return _ref44.apply(this, arguments);
  };
}());

// GET /retailer/branches/:id/summary - branch daily/weekly/monthly summary
router.get('/branches/:id/summary', authMiddleware, /*#__PURE__*/function () {
  var _ref45 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee45(req, res) {
    var id, _req$query$period2, period, branch, summaryData, _t15;
    return _regenerator["default"].wrap(function (_context45) {
      while (1) switch (_context45.prev = _context45.next) {
        case 0:
          _context45.prev = 0;
          id = req.params.id;
          _req$query$period2 = req.query.period, period = _req$query$period2 === void 0 ? 'daily' : _req$query$period2;
          branch = branches.get(id);
          if (branch) {
            _context45.next = 1;
            break;
          }
          return _context45.abrupt("return", res.status(404).json({
            error: 'Branch not found'
          }));
        case 1:
          summaryData = {
            daily: {
              period: 'daily',
              date: new Date().toISOString().split('T')[0],
              total_transactions: 45,
              total_amount: 485000,
              total_refunds: 12000,
              card_payments: {
                count: 32,
                amount: 380000
              },
              wallet_payments: {
                count: 8,
                amount: 75000
              },
              cash_payments: {
                count: 5,
                amount: 30000
              },
              average_transaction: 10778,
              peak_hour: 14,
              unique_customers: 38,
              currency: 'RWF'
            },
            weekly: {
              period: 'weekly',
              start_date: '2024-11-22',
              end_date: '2024-11-28',
              total_transactions: 287,
              total_amount: 3250000,
              total_refunds: 45000,
              card_payments: {
                count: 198,
                amount: 2450000
              },
              wallet_payments: {
                count: 62,
                amount: 580000
              },
              cash_payments: {
                count: 27,
                amount: 220000
              },
              average_transaction: 11324,
              busiest_day: 'Saturday',
              unique_customers: 215,
              currency: 'RWF'
            },
            monthly: {
              period: 'monthly',
              month: 'November 2024',
              total_transactions: 1156,
              total_amount: 12450000,
              total_refunds: 185000,
              card_payments: {
                count: 812,
                amount: 9800000
              },
              wallet_payments: {
                count: 245,
                amount: 1950000
              },
              cash_payments: {
                count: 99,
                amount: 700000
              },
              average_transaction: 10769,
              growth_vs_last_month: 12.5,
              unique_customers: 645,
              currency: 'RWF'
            }
          };
          res.json({
            branch_id: id,
            branch_name: branch.branch_name,
            summary: summaryData[period] || summaryData.daily
          });
          _context45.next = 3;
          break;
        case 2:
          _context45.prev = 2;
          _t15 = _context45["catch"](0);
          res.status(500).json({
            error: _t15.message
          });
        case 3:
        case "end":
          return _context45.stop();
      }
    }, _callee45, null, [[0, 2]]);
  }));
  return function (_x92, _x93) {
    return _ref45.apply(this, arguments);
  };
}());

// ==================== NFC CARD MANAGEMENT ROUTES ====================

// GET /retailer/nfc-cards - list NFC cards issued by this retailer
router.get('/nfc-cards', authMiddleware, /*#__PURE__*/function () {
  var _ref46 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee46(req, res) {
    var _req$query0, _req$query0$limit, limit, _req$query0$offset, offset, status, search, cards, searchLower;
    return _regenerator["default"].wrap(function (_context46) {
      while (1) switch (_context46.prev = _context46.next) {
        case 0:
          try {
            _req$query0 = req.query, _req$query0$limit = _req$query0.limit, limit = _req$query0$limit === void 0 ? 20 : _req$query0$limit, _req$query0$offset = _req$query0.offset, offset = _req$query0$offset === void 0 ? 0 : _req$query0$offset, status = _req$query0.status, search = _req$query0.search; // Mock NFC cards data
            cards = [{
              id: 'card_001',
              card_uid: 'NFC-A1B2C3D4',
              customer_name: 'Jean Uwimana',
              customer_phone: '+250788111222',
              balance: 15000,
              status: 'active',
              is_registered: true,
              pin_set: true,
              branch_issued: 'Kigali Main Branch',
              issued_at: '2024-10-15T10:00:00Z',
              last_used: '2024-11-28T10:30:00Z'
            }, {
              id: 'card_002',
              card_uid: 'NFC-E5F6G7H8',
              customer_name: 'Marie Claire',
              customer_phone: '+250788222333',
              balance: 28500,
              status: 'active',
              is_registered: true,
              pin_set: true,
              branch_issued: 'Kimihurura Branch',
              issued_at: '2024-10-20T14:00:00Z',
              last_used: '2024-11-28T09:45:00Z'
            }, {
              id: 'card_003',
              card_uid: 'NFC-I9J0K1L2',
              customer_name: 'Emmanuel Habimana',
              customer_phone: '+250788333444',
              balance: 5200,
              status: 'active',
              is_registered: true,
              pin_set: false,
              branch_issued: 'Kigali Main Branch',
              issued_at: '2024-11-01T09:00:00Z',
              last_used: '2024-11-27T16:20:00Z'
            }, {
              id: 'card_004',
              card_uid: 'NFC-M3N4O5P6',
              customer_name: null,
              customer_phone: null,
              balance: 0,
              status: 'inactive',
              is_registered: false,
              pin_set: false,
              branch_issued: 'Huye Branch',
              issued_at: '2024-11-10T11:00:00Z',
              last_used: null
            }, {
              id: 'card_005',
              card_uid: 'NFC-Q7R8S9T0',
              customer_name: 'Alice Uwase',
              customer_phone: '+250788444555',
              balance: 0,
              status: 'blocked',
              is_registered: true,
              pin_set: true,
              branch_issued: 'Kigali Main Branch',
              issued_at: '2024-09-05T08:00:00Z',
              last_used: '2024-11-15T14:00:00Z',
              blocked_reason: 'Lost card reported'
            }];
            if (status) {
              cards = cards.filter(function (c) {
                return c.status === status;
              });
            }
            if (search) {
              searchLower = search.toLowerCase();
              cards = cards.filter(function (c) {
                return c.card_uid.toLowerCase().includes(searchLower) || c.customer_name && c.customer_name.toLowerCase().includes(searchLower) || c.customer_phone && c.customer_phone.includes(searchLower);
              });
            }
            res.json({
              cards: cards.slice(Number(offset), Number(offset) + Number(limit)),
              count: cards.length,
              limit: Number(limit),
              offset: Number(offset)
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context46.stop();
      }
    }, _callee46);
  }));
  return function (_x94, _x95) {
    return _ref46.apply(this, arguments);
  };
}());

// GET /retailer/nfc-cards/stats - NFC card statistics
router.get('/nfc-cards/stats', authMiddleware, /*#__PURE__*/function () {
  var _ref47 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee47(req, res) {
    return _regenerator["default"].wrap(function (_context47) {
      while (1) switch (_context47.prev = _context47.next) {
        case 0:
          try {
            res.json({
              total_cards_issued: 156,
              active_cards: 142,
              inactive_cards: 8,
              blocked_cards: 6,
              registered_cards: 148,
              cards_with_pin: 135,
              total_card_balance: 2850000,
              cards_used_today: 45,
              cards_used_this_week: 128,
              currency: 'RWF'
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context47.stop();
      }
    }, _callee47);
  }));
  return function (_x96, _x97) {
    return _ref47.apply(this, arguments);
  };
}());

// POST /retailer/nfc-cards/issue - issue new NFC card
router.post('/nfc-cards/issue', authMiddleware, /*#__PURE__*/function () {
  var _ref48 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee48(req, res) {
    var user, _req$body1, card_uid, customer_name, customer_phone, initial_balance, branch_id, branch, newCard, _t16;
    return _regenerator["default"].wrap(function (_context48) {
      while (1) switch (_context48.prev = _context48.next) {
        case 0:
          _context48.prev = 0;
          user = req.user;
          _req$body1 = req.body, card_uid = _req$body1.card_uid, customer_name = _req$body1.customer_name, customer_phone = _req$body1.customer_phone, initial_balance = _req$body1.initial_balance, branch_id = _req$body1.branch_id;
          if (card_uid) {
            _context48.next = 1;
            break;
          }
          return _context48.abrupt("return", res.status(400).json({
            error: 'card_uid is required'
          }));
        case 1:
          branch = branch_id ? branches.get(branch_id) : null;
          newCard = {
            id: "card_".concat(Date.now()),
            card_uid: card_uid,
            customer_name: customer_name || null,
            customer_phone: customer_phone || null,
            balance: initial_balance || 0,
            status: 'active',
            is_registered: !!customer_phone,
            pin_set: false,
            branch_issued: (branch === null || branch === void 0 ? void 0 : branch.branch_name) || user.shop_name || 'Main Branch',
            issued_by: user.id,
            issued_at: new Date().toISOString(),
            last_used: null
          };
          res.status(201).json(newCard);
          _context48.next = 3;
          break;
        case 2:
          _context48.prev = 2;
          _t16 = _context48["catch"](0);
          res.status(500).json({
            error: _t16.message
          });
        case 3:
        case "end":
          return _context48.stop();
      }
    }, _callee48, null, [[0, 2]]);
  }));
  return function (_x98, _x99) {
    return _ref48.apply(this, arguments);
  };
}());

// POST /retailer/nfc-cards/:id/block - block NFC card
router.post('/nfc-cards/:id/block', authMiddleware, /*#__PURE__*/function () {
  var _ref49 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee49(req, res) {
    var id, reason;
    return _regenerator["default"].wrap(function (_context49) {
      while (1) switch (_context49.prev = _context49.next) {
        case 0:
          try {
            id = req.params.id;
            reason = req.body.reason;
            res.json({
              id: id,
              status: 'blocked',
              blocked_reason: reason || 'Blocked by retailer',
              blocked_at: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context49.stop();
      }
    }, _callee49);
  }));
  return function (_x100, _x101) {
    return _ref49.apply(this, arguments);
  };
}());

// POST /retailer/nfc-cards/:id/unblock - unblock NFC card
router.post('/nfc-cards/:id/unblock', authMiddleware, /*#__PURE__*/function () {
  var _ref50 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee50(req, res) {
    var id;
    return _regenerator["default"].wrap(function (_context50) {
      while (1) switch (_context50.prev = _context50.next) {
        case 0:
          try {
            id = req.params.id;
            res.json({
              id: id,
              status: 'active',
              unblocked_at: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context50.stop();
      }
    }, _callee50);
  }));
  return function (_x102, _x103) {
    return _ref50.apply(this, arguments);
  };
}());

// POST /retailer/nfc-cards/:id/topup - top up NFC card balance
router.post('/nfc-cards/:id/topup', authMiddleware, /*#__PURE__*/function () {
  var _ref51 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee51(req, res) {
    var id, _req$body10, amount, payment_method, reference, _t17;
    return _regenerator["default"].wrap(function (_context51) {
      while (1) switch (_context51.prev = _context51.next) {
        case 0:
          _context51.prev = 0;
          id = req.params.id;
          _req$body10 = req.body, amount = _req$body10.amount, payment_method = _req$body10.payment_method, reference = _req$body10.reference;
          if (!(!amount || amount <= 0)) {
            _context51.next = 1;
            break;
          }
          return _context51.abrupt("return", res.status(400).json({
            error: 'Valid amount is required'
          }));
        case 1:
          res.json({
            id: id,
            topup_amount: amount,
            new_balance: 15000 + amount,
            // Mock: previous balance + topup
            payment_method: payment_method || 'cash',
            reference: reference || "TOPUP-".concat(Date.now()),
            transaction_id: "txn_".concat(Date.now()),
            topped_up_at: new Date().toISOString()
          });
          _context51.next = 3;
          break;
        case 2:
          _context51.prev = 2;
          _t17 = _context51["catch"](0);
          res.status(500).json({
            error: _t17.message
          });
        case 3:
        case "end":
          return _context51.stop();
      }
    }, _callee51, null, [[0, 2]]);
  }));
  return function (_x104, _x105) {
    return _ref51.apply(this, arguments);
  };
}());

// GET /retailer/nfc-cards/:id/transactions - NFC card transaction history
router.get('/nfc-cards/:id/transactions', authMiddleware, /*#__PURE__*/function () {
  var _ref52 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee52(req, res) {
    var id, _req$query1, _req$query1$limit, limit, _req$query1$offset, offset, transactions;
    return _regenerator["default"].wrap(function (_context52) {
      while (1) switch (_context52.prev = _context52.next) {
        case 0:
          try {
            id = req.params.id;
            _req$query1 = req.query, _req$query1$limit = _req$query1.limit, limit = _req$query1$limit === void 0 ? 20 : _req$query1$limit, _req$query1$offset = _req$query1.offset, offset = _req$query1$offset === void 0 ? 0 : _req$query1$offset;
            transactions = [{
              id: 'txn_001',
              type: 'payment',
              amount: -2500,
              balance_after: 15000,
              merchant: 'Kigali Main Branch',
              description: 'POS Payment',
              created_at: '2024-11-28T10:30:00Z'
            }, {
              id: 'txn_002',
              type: 'topup',
              amount: 10000,
              balance_after: 17500,
              method: 'MTN MoMo',
              description: 'Wallet Top-up',
              created_at: '2024-11-27T14:00:00Z'
            }, {
              id: 'txn_003',
              type: 'payment',
              amount: -7500,
              balance_after: 7500,
              merchant: 'Kimihurura Branch',
              description: 'POS Payment (PIN verified)',
              created_at: '2024-11-26T11:45:00Z'
            }, {
              id: 'txn_004',
              type: 'topup',
              amount: 5000,
              balance_after: 15000,
              method: 'USSD *939#',
              description: 'USSD Top-up',
              created_at: '2024-11-25T09:30:00Z'
            }];
            res.json({
              card_id: id,
              transactions: transactions.slice(Number(offset), Number(offset) + Number(limit)),
              count: transactions.length
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context52.stop();
      }
    }, _callee52);
  }));
  return function (_x106, _x107) {
    return _ref52.apply(this, arguments);
  };
}());

// ==================== MANUAL CARD PAYMENT ====================

/**
 * POST /retailer/manual-payment/verify-pin
 * Method 1: Direct PIN entry and charge
 */
router.post('/manual-payment/verify-pin', authMiddleware, /*#__PURE__*/function () {
  var _ref53 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee53(req, res) {
    var _user, _req$body11, card_id, pin, amount, branch_id, retailerId, manualPaymentService, result, _t18;
    return _regenerator["default"].wrap(function (_context53) {
      while (1) switch (_context53.prev = _context53.next) {
        case 0:
          _context53.prev = 0;
          _req$body11 = req.body, card_id = _req$body11.card_id, pin = _req$body11.pin, amount = _req$body11.amount, branch_id = _req$body11.branch_id;
          retailerId = (_user = req.user) === null || _user === void 0 ? void 0 : _user.id;
          if (!(!card_id || !pin || !amount)) {
            _context53.next = 1;
            break;
          }
          return _context53.abrupt("return", res.status(400).json({
            error: 'Card ID, PIN, and amount are required'
          }));
        case 1:
          if (!(amount <= 0)) {
            _context53.next = 2;
            break;
          }
          return _context53.abrupt("return", res.status(400).json({
            error: 'Amount must be greater than 0'
          }));
        case 2:
          // Get service from request scope
          manualPaymentService = req.scope.resolve('manualPaymentService');
          _context53.next = 3;
          return manualPaymentService.verifyPinAndCharge(card_id, pin, amount, retailerId, branch_id, req.ip, req.headers['user-agent']);
        case 3:
          result = _context53.sent;
          if (result.success) {
            _context53.next = 4;
            break;
          }
          return _context53.abrupt("return", res.status(400).json(result));
        case 4:
          res.json({
            success: true,
            message: 'Payment processed successfully',
            transaction_id: result.transaction_id,
            card_balance: result.card_balance
          });
          _context53.next = 6;
          break;
        case 5:
          _context53.prev = 5;
          _t18 = _context53["catch"](0);
          console.error('Error processing PIN payment:', _t18);
          res.status(500).json({
            error: _t18.message || 'Failed to process payment'
          });
        case 6:
        case "end":
          return _context53.stop();
      }
    }, _callee53, null, [[0, 5]]);
  }));
  return function (_x108, _x109) {
    return _ref53.apply(this, arguments);
  };
}());

/**
 * POST /retailer/manual-payment/generate-code
 * Method 2: Generate one-time 8-digit payment code
 */
router.post('/manual-payment/generate-code', authMiddleware, /*#__PURE__*/function () {
  var _ref54 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee54(req, res) {
    var _user2, _req$body12, card_id, amount, customer_phone, branch_id, retailerId, manualPaymentService, result, _t19;
    return _regenerator["default"].wrap(function (_context54) {
      while (1) switch (_context54.prev = _context54.next) {
        case 0:
          _context54.prev = 0;
          _req$body12 = req.body, card_id = _req$body12.card_id, amount = _req$body12.amount, customer_phone = _req$body12.customer_phone, branch_id = _req$body12.branch_id;
          retailerId = (_user2 = req.user) === null || _user2 === void 0 ? void 0 : _user2.id;
          if (!(!card_id || !amount)) {
            _context54.next = 1;
            break;
          }
          return _context54.abrupt("return", res.status(400).json({
            error: 'Card ID and amount are required'
          }));
        case 1:
          if (!(amount <= 0)) {
            _context54.next = 2;
            break;
          }
          return _context54.abrupt("return", res.status(400).json({
            error: 'Amount must be greater than 0'
          }));
        case 2:
          // Get service from request scope
          manualPaymentService = req.scope.resolve('manualPaymentService');
          _context54.next = 3;
          return manualPaymentService.generatePaymentCode(card_id, amount, retailerId, customer_phone, branch_id);
        case 3:
          result = _context54.sent;
          res.json({
            success: true,
            message: customer_phone ? 'Payment code sent to customer via SMS' : 'Payment code generated',
            code: result.code,
            expires_at: result.expires_at,
            valid_for_minutes: 10
          });
          _context54.next = 5;
          break;
        case 4:
          _context54.prev = 4;
          _t19 = _context54["catch"](0);
          console.error('Error generating payment code:', _t19);
          res.status(500).json({
            error: _t19.message || 'Failed to generate code'
          });
        case 5:
        case "end":
          return _context54.stop();
      }
    }, _callee54, null, [[0, 4]]);
  }));
  return function (_x110, _x111) {
    return _ref54.apply(this, arguments);
  };
}());

/**
 * POST /retailer/manual-payment/verify-code
 * Method 2: Verify payment code and charge
 */
router.post('/manual-payment/verify-code', authMiddleware, /*#__PURE__*/function () {
  var _ref55 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee55(req, res) {
    var _user3, _req$body13, card_id, code, branch_id, retailerId, manualPaymentService, result, _t20;
    return _regenerator["default"].wrap(function (_context55) {
      while (1) switch (_context55.prev = _context55.next) {
        case 0:
          _context55.prev = 0;
          _req$body13 = req.body, card_id = _req$body13.card_id, code = _req$body13.code, branch_id = _req$body13.branch_id;
          retailerId = (_user3 = req.user) === null || _user3 === void 0 ? void 0 : _user3.id;
          if (!(!card_id || !code)) {
            _context55.next = 1;
            break;
          }
          return _context55.abrupt("return", res.status(400).json({
            error: 'Card ID and code are required'
          }));
        case 1:
          if (!(code.length !== 8)) {
            _context55.next = 2;
            break;
          }
          return _context55.abrupt("return", res.status(400).json({
            error: 'Code must be 8 digits'
          }));
        case 2:
          // Get service from request scope
          manualPaymentService = req.scope.resolve('manualPaymentService');
          _context55.next = 3;
          return manualPaymentService.verifyCodeAndCharge(card_id, code, retailerId, branch_id, req.ip, req.headers['user-agent']);
        case 3:
          result = _context55.sent;
          if (result.success) {
            _context55.next = 4;
            break;
          }
          return _context55.abrupt("return", res.status(400).json(result));
        case 4:
          res.json({
            success: true,
            message: 'Payment processed successfully',
            transaction_id: result.transaction_id,
            card_balance: result.card_balance
          });
          _context55.next = 6;
          break;
        case 5:
          _context55.prev = 5;
          _t20 = _context55["catch"](0);
          console.error('Error verifying payment code:', _t20);
          res.status(500).json({
            error: _t20.message || 'Failed to verify code'
          });
        case 6:
        case "end":
          return _context55.stop();
      }
    }, _callee55, null, [[0, 5]]);
  }));
  return function (_x112, _x113) {
    return _ref55.apply(this, arguments);
  };
}());

/**
 * POST /retailer/manual-payment/request-otp
 * Method 3: Request SMS OTP for payment approval
 */
router.post('/manual-payment/request-otp', authMiddleware, /*#__PURE__*/function () {
  var _ref56 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee56(req, res) {
    var _user4, _req$body14, card_id, amount, customer_phone, retailerId, phoneRegex, manualPaymentService, result, _t21;
    return _regenerator["default"].wrap(function (_context56) {
      while (1) switch (_context56.prev = _context56.next) {
        case 0:
          _context56.prev = 0;
          _req$body14 = req.body, card_id = _req$body14.card_id, amount = _req$body14.amount, customer_phone = _req$body14.customer_phone;
          retailerId = (_user4 = req.user) === null || _user4 === void 0 ? void 0 : _user4.id;
          if (!(!card_id || !amount || !customer_phone)) {
            _context56.next = 1;
            break;
          }
          return _context56.abrupt("return", res.status(400).json({
            error: 'Card ID, amount, and customer phone are required'
          }));
        case 1:
          if (!(amount <= 0)) {
            _context56.next = 2;
            break;
          }
          return _context56.abrupt("return", res.status(400).json({
            error: 'Amount must be greater than 0'
          }));
        case 2:
          // Validate phone format (Rwanda: +250 or 250)
          phoneRegex = /^(\+?250|0)?[7][0-9]{8}$/;
          if (phoneRegex.test(customer_phone)) {
            _context56.next = 3;
            break;
          }
          return _context56.abrupt("return", res.status(400).json({
            error: 'Invalid phone number format'
          }));
        case 3:
          // Get service from request scope
          manualPaymentService = req.scope.resolve('manualPaymentService');
          _context56.next = 4;
          return manualPaymentService.requestPaymentOTP(card_id, amount, customer_phone, retailerId);
        case 4:
          result = _context56.sent;
          res.json({
            success: true,
            message: 'OTP sent to customer via SMS',
            otp_sent: result.otp_sent,
            expires_at: result.expires_at,
            valid_for_minutes: 5
          });
          _context56.next = 6;
          break;
        case 5:
          _context56.prev = 5;
          _t21 = _context56["catch"](0);
          console.error('Error requesting OTP:', _t21);
          res.status(500).json({
            error: _t21.message || 'Failed to send OTP'
          });
        case 6:
        case "end":
          return _context56.stop();
      }
    }, _callee56, null, [[0, 5]]);
  }));
  return function (_x114, _x115) {
    return _ref56.apply(this, arguments);
  };
}());

/**
 * POST /retailer/manual-payment/verify-otp
 * Method 3: Verify OTP and charge
 */
router.post('/manual-payment/verify-otp', authMiddleware, /*#__PURE__*/function () {
  var _ref57 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee57(req, res) {
    var _user5, _req$body15, card_id, otp, customer_phone, branch_id, retailerId, manualPaymentService, result, _t22;
    return _regenerator["default"].wrap(function (_context57) {
      while (1) switch (_context57.prev = _context57.next) {
        case 0:
          _context57.prev = 0;
          _req$body15 = req.body, card_id = _req$body15.card_id, otp = _req$body15.otp, customer_phone = _req$body15.customer_phone, branch_id = _req$body15.branch_id;
          retailerId = (_user5 = req.user) === null || _user5 === void 0 ? void 0 : _user5.id;
          if (!(!card_id || !otp || !customer_phone)) {
            _context57.next = 1;
            break;
          }
          return _context57.abrupt("return", res.status(400).json({
            error: 'Card ID, OTP, and customer phone are required'
          }));
        case 1:
          if (!(otp.length !== 6)) {
            _context57.next = 2;
            break;
          }
          return _context57.abrupt("return", res.status(400).json({
            error: 'OTP must be 6 digits'
          }));
        case 2:
          // Get service from request scope
          manualPaymentService = req.scope.resolve('manualPaymentService');
          _context57.next = 3;
          return manualPaymentService.verifyOTPAndCharge(card_id, otp, customer_phone, retailerId, branch_id, req.ip, req.headers['user-agent']);
        case 3:
          result = _context57.sent;
          if (result.success) {
            _context57.next = 4;
            break;
          }
          return _context57.abrupt("return", res.status(400).json(result));
        case 4:
          res.json({
            success: true,
            message: 'Payment processed successfully',
            transaction_id: result.transaction_id,
            card_balance: result.card_balance
          });
          _context57.next = 6;
          break;
        case 5:
          _context57.prev = 5;
          _t22 = _context57["catch"](0);
          console.error('Error verifying OTP:', _t22);
          res.status(500).json({
            error: _t22.message || 'Failed to verify OTP'
          });
        case 6:
        case "end":
          return _context57.stop();
      }
    }, _callee57, null, [[0, 5]]);
  }));
  return function (_x116, _x117) {
    return _ref57.apply(this, arguments);
  };
}());

/**
 * GET /retailer/manual-payment/audit
 * Get manual payment audit logs (admin/retailer review)
 */
router.get('/manual-payment/audit', authMiddleware, /*#__PURE__*/function () {
  var _ref58 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee58(req, res) {
    var _user6, _countResult$rows$, retailerId, _req$query10, _req$query10$limit, limit, _req$query10$offset, offset, card_id, method, success, _db, query, params, paramIndex, result, countQuery, countParams, countParamIndex, countResult, _t23;
    return _regenerator["default"].wrap(function (_context58) {
      while (1) switch (_context58.prev = _context58.next) {
        case 0:
          _context58.prev = 0;
          retailerId = (_user6 = req.user) === null || _user6 === void 0 ? void 0 : _user6.id;
          _req$query10 = req.query, _req$query10$limit = _req$query10.limit, limit = _req$query10$limit === void 0 ? 50 : _req$query10$limit, _req$query10$offset = _req$query10.offset, offset = _req$query10$offset === void 0 ? 0 : _req$query10$offset, card_id = _req$query10.card_id, method = _req$query10.method, success = _req$query10.success;
          _db = req.scope.resolve('db');
          query = "\n      SELECT id, card_id, amount, verification_method, success,\n             error_message, transaction_id, created_at\n      FROM bigcompany.manual_payment_audit\n      WHERE retailer_id = $1\n    ";
          params = [retailerId];
          paramIndex = 2;
          if (card_id) {
            query += " AND card_id = $".concat(paramIndex);
            params.push(card_id);
            paramIndex++;
          }
          if (method) {
            query += " AND verification_method = $".concat(paramIndex);
            params.push(method);
            paramIndex++;
          }
          if (success !== undefined) {
            query += " AND success = $".concat(paramIndex);
            params.push(success === 'true');
            paramIndex++;
          }
          query += " ORDER BY created_at DESC LIMIT $".concat(paramIndex, " OFFSET $").concat(paramIndex + 1);
          params.push(Number(limit), Number(offset));
          _context58.next = 1;
          return _db.query(query, params);
        case 1:
          result = _context58.sent;
          // Get total count
          countQuery = "\n      SELECT COUNT(*) as total\n      FROM bigcompany.manual_payment_audit\n      WHERE retailer_id = $1\n    ";
          countParams = [retailerId];
          countParamIndex = 2;
          if (card_id) {
            countQuery += " AND card_id = $".concat(countParamIndex);
            countParams.push(card_id);
            countParamIndex++;
          }
          if (method) {
            countQuery += " AND verification_method = $".concat(countParamIndex);
            countParams.push(method);
            countParamIndex++;
          }
          if (success !== undefined) {
            countQuery += " AND success = $".concat(countParamIndex);
            countParams.push(success === 'true');
          }
          _context58.next = 2;
          return _db.query(countQuery, countParams);
        case 2:
          countResult = _context58.sent;
          res.json({
            audit_logs: result.rows,
            total: parseInt(((_countResult$rows$ = countResult.rows[0]) === null || _countResult$rows$ === void 0 ? void 0 : _countResult$rows$.total) || '0'),
            limit: Number(limit),
            offset: Number(offset)
          });
          _context58.next = 4;
          break;
        case 3:
          _context58.prev = 3;
          _t23 = _context58["catch"](0);
          console.error('Error fetching audit logs:', _t23);
          res.status(500).json({
            error: 'Failed to fetch audit logs'
          });
        case 4:
        case "end":
          return _context58.stop();
      }
    }, _callee58, null, [[0, 3]]);
  }));
  return function (_x118, _x119) {
    return _ref58.apply(this, arguments);
  };
}());

/**
 * POST /retailer/manual-payment/cleanup
 * Trigger cleanup of expired codes/OTPs (admin only, or scheduled job)
 */
router.post('/manual-payment/cleanup', authMiddleware, /*#__PURE__*/function () {
  var _ref59 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee59(req, res) {
    var _user7, userType, manualPaymentService, result, _t24;
    return _regenerator["default"].wrap(function (_context59) {
      while (1) switch (_context59.prev = _context59.next) {
        case 0:
          _context59.prev = 0;
          userType = (_user7 = req.user) === null || _user7 === void 0 ? void 0 : _user7.type;
          if (!(userType !== 'admin')) {
            _context59.next = 1;
            break;
          }
          return _context59.abrupt("return", res.status(403).json({
            error: 'Admin access required'
          }));
        case 1:
          manualPaymentService = req.scope.resolve('manualPaymentService');
          _context59.next = 2;
          return manualPaymentService.cleanupExpired();
        case 2:
          result = _context59.sent;
          res.json({
            success: true,
            message: 'Cleanup completed',
            codes_deleted: result.codes_deleted,
            otps_deleted: result.otps_deleted,
            cards_unlocked: result.cards_unlocked
          });
          _context59.next = 4;
          break;
        case 3:
          _context59.prev = 3;
          _t24 = _context59["catch"](0);
          console.error('Error during cleanup:', _t24);
          res.status(500).json({
            error: 'Cleanup failed'
          });
        case 4:
        case "end":
          return _context59.stop();
      }
    }, _callee59, null, [[0, 3]]);
  }));
  return function (_x120, _x121) {
    return _ref59.apply(this, arguments);
  };
}());

// ==================== CATEGORIES MANAGEMENT ====================

/**
 * GET /retailer/categories
 * List all categories with product counts
 */
router.get('/categories', authMiddleware, /*#__PURE__*/function () {
  var _ref60 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee60(req, res) {
    var _countResult$rows$2, _req$query11, search, is_active, _req$query11$limit, limit, _req$query11$offset, offset, _db2, query, params, result, countQuery, countParams, countResult, _t25;
    return _regenerator["default"].wrap(function (_context60) {
      while (1) switch (_context60.prev = _context60.next) {
        case 0:
          _context60.prev = 0;
          _req$query11 = req.query, search = _req$query11.search, is_active = _req$query11.is_active, _req$query11$limit = _req$query11.limit, limit = _req$query11$limit === void 0 ? 50 : _req$query11$limit, _req$query11$offset = _req$query11.offset, offset = _req$query11$offset === void 0 ? 0 : _req$query11$offset;
          _db2 = req.scope.resolve('db');
          query = "\n      SELECT\n        c.*,\n        bigcompany.get_category_product_count(c.id) as product_count\n      FROM bigcompany.product_categories c\n      WHERE 1=1\n    ";
          params = [];
          if (search) {
            query += " AND (c.name ILIKE $".concat(params.length + 1, " OR c.code ILIKE $").concat(params.length + 1, ")");
            params.push("%".concat(search, "%"));
          }
          if (is_active !== undefined) {
            query += " AND c.is_active = $".concat(params.length + 1);
            params.push(is_active === 'true');
          }
          query += " ORDER BY c.name ASC LIMIT $".concat(params.length + 1, " OFFSET $").concat(params.length + 2);
          params.push(Number(limit), Number(offset));
          _context60.next = 1;
          return _db2.query(query, params);
        case 1:
          result = _context60.sent;
          // Get total count
          countQuery = 'SELECT COUNT(*) as total FROM bigcompany.product_categories c WHERE 1=1';
          countParams = [];
          if (search) {
            countQuery += " AND (c.name ILIKE $".concat(countParams.length + 1, " OR c.code ILIKE $").concat(countParams.length + 1, ")");
            countParams.push("%".concat(search, "%"));
          }
          if (is_active !== undefined) {
            countQuery += " AND c.is_active = $".concat(countParams.length + 1);
            countParams.push(is_active === 'true');
          }
          _context60.next = 2;
          return _db2.query(countQuery, countParams);
        case 2:
          countResult = _context60.sent;
          res.json({
            categories: result.rows,
            total: parseInt(((_countResult$rows$2 = countResult.rows[0]) === null || _countResult$rows$2 === void 0 ? void 0 : _countResult$rows$2.total) || '0'),
            limit: Number(limit),
            offset: Number(offset)
          });
          _context60.next = 4;
          break;
        case 3:
          _context60.prev = 3;
          _t25 = _context60["catch"](0);
          console.error('Error fetching categories:', _t25);
          res.status(500).json({
            error: 'Failed to fetch categories'
          });
        case 4:
        case "end":
          return _context60.stop();
      }
    }, _callee60, null, [[0, 3]]);
  }));
  return function (_x122, _x123) {
    return _ref60.apply(this, arguments);
  };
}());

/**
 * GET /retailer/categories/:id
 * Get single category with details
 */
router.get('/categories/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref61 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee61(req, res) {
    var id, _db3, result, productsResult, _t26;
    return _regenerator["default"].wrap(function (_context61) {
      while (1) switch (_context61.prev = _context61.next) {
        case 0:
          _context61.prev = 0;
          id = req.params.id;
          _db3 = req.scope.resolve('db');
          _context61.next = 1;
          return _db3.query("\n      SELECT\n        c.*,\n        bigcompany.get_category_product_count(c.id) as product_count\n      FROM bigcompany.product_categories c\n      WHERE c.id = $1\n    ", [id]);
        case 1:
          result = _context61.sent;
          if (!(result.rows.length === 0)) {
            _context61.next = 2;
            break;
          }
          return _context61.abrupt("return", res.status(404).json({
            error: 'Category not found'
          }));
        case 2:
          _context61.next = 3;
          return _db3.query("\n      SELECT id, name, sku, price\n      FROM bigcompany.products\n      WHERE category_id = $1\n      LIMIT 5\n    ", [id]);
        case 3:
          productsResult = _context61.sent;
          res.json({
            category: result.rows[0],
            sample_products: productsResult.rows
          });
          _context61.next = 5;
          break;
        case 4:
          _context61.prev = 4;
          _t26 = _context61["catch"](0);
          console.error('Error fetching category:', _t26);
          res.status(500).json({
            error: 'Failed to fetch category'
          });
        case 5:
        case "end":
          return _context61.stop();
      }
    }, _callee61, null, [[0, 4]]);
  }));
  return function (_x124, _x125) {
    return _ref61.apply(this, arguments);
  };
}());

/**
 * POST /retailer/categories
 * Create new category
 */
router.post('/categories', authMiddleware, /*#__PURE__*/function () {
  var _ref62 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee62(req, res) {
    var _user8, _req$body16, name, description, code, retailerId, _db4, existingName, categoryCode, codeResult, existingCode, result, _t27;
    return _regenerator["default"].wrap(function (_context62) {
      while (1) switch (_context62.prev = _context62.next) {
        case 0:
          _context62.prev = 0;
          _req$body16 = req.body, name = _req$body16.name, description = _req$body16.description, code = _req$body16.code;
          retailerId = (_user8 = req.user) === null || _user8 === void 0 ? void 0 : _user8.id;
          _db4 = req.scope.resolve('db');
          if (!(!name || name.trim().length === 0)) {
            _context62.next = 1;
            break;
          }
          return _context62.abrupt("return", res.status(400).json({
            error: 'Category name is required'
          }));
        case 1:
          if (!(name.length > 100)) {
            _context62.next = 2;
            break;
          }
          return _context62.abrupt("return", res.status(400).json({
            error: 'Category name must be less than 100 characters'
          }));
        case 2:
          _context62.next = 3;
          return _db4.query("\n      SELECT id FROM bigcompany.product_categories\n      WHERE LOWER(name) = LOWER($1) AND is_active = true\n    ", [name.trim()]);
        case 3:
          existingName = _context62.sent;
          if (!(existingName.rows.length > 0)) {
            _context62.next = 4;
            break;
          }
          return _context62.abrupt("return", res.status(400).json({
            error: 'A category with this name already exists'
          }));
        case 4:
          // Generate or validate code
          categoryCode = code;
          if (categoryCode) {
            _context62.next = 6;
            break;
          }
          _context62.next = 5;
          return _db4.query("\n        SELECT bigcompany.generate_category_code($1) as code\n      ", [name]);
        case 5:
          codeResult = _context62.sent;
          categoryCode = codeResult.rows[0].code;
          _context62.next = 9;
          break;
        case 6:
          if (/^[A-Z]{3}-\d{4}$/.test(categoryCode)) {
            _context62.next = 7;
            break;
          }
          return _context62.abrupt("return", res.status(400).json({
            error: 'Invalid code format. Must be 3 uppercase letters, hyphen, and 4 digits (e.g., BEV-1234)'
          }));
        case 7:
          _context62.next = 8;
          return _db4.query("\n        SELECT id FROM bigcompany.product_categories WHERE code = $1\n      ", [categoryCode]);
        case 8:
          existingCode = _context62.sent;
          if (!(existingCode.rows.length > 0)) {
            _context62.next = 9;
            break;
          }
          return _context62.abrupt("return", res.status(400).json({
            error: 'A category with this code already exists'
          }));
        case 9:
          _context62.next = 10;
          return _db4.query("\n      INSERT INTO bigcompany.product_categories\n      (code, name, description, created_by)\n      VALUES ($1, $2, $3, $4)\n      RETURNING *\n    ", [categoryCode, name.trim(), (description === null || description === void 0 ? void 0 : description.trim()) || null, retailerId]);
        case 10:
          result = _context62.sent;
          res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: result.rows[0]
          });
          _context62.next = 13;
          break;
        case 11:
          _context62.prev = 11;
          _t27 = _context62["catch"](0);
          console.error('Error creating category:', _t27);
          if (!(_t27.code === '23505')) {
            _context62.next = 12;
            break;
          }
          return _context62.abrupt("return", res.status(400).json({
            error: 'Category code or name already exists'
          }));
        case 12:
          res.status(500).json({
            error: 'Failed to create category'
          });
        case 13:
        case "end":
          return _context62.stop();
      }
    }, _callee62, null, [[0, 11]]);
  }));
  return function (_x126, _x127) {
    return _ref62.apply(this, arguments);
  };
}());

/**
 * PUT /retailer/categories/:id
 * Update existing category
 */
router.put('/categories/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref63 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee63(req, res) {
    var id, _req$body17, name, description, is_active, _db5, existing, existingName, updates, params, result, _t28;
    return _regenerator["default"].wrap(function (_context63) {
      while (1) switch (_context63.prev = _context63.next) {
        case 0:
          _context63.prev = 0;
          id = req.params.id;
          _req$body17 = req.body, name = _req$body17.name, description = _req$body17.description, is_active = _req$body17.is_active;
          _db5 = req.scope.resolve('db'); // Check if category exists
          _context63.next = 1;
          return _db5.query("\n      SELECT id FROM bigcompany.product_categories WHERE id = $1\n    ", [id]);
        case 1:
          existing = _context63.sent;
          if (!(existing.rows.length === 0)) {
            _context63.next = 2;
            break;
          }
          return _context63.abrupt("return", res.status(404).json({
            error: 'Category not found'
          }));
        case 2:
          if (!(name !== undefined)) {
            _context63.next = 6;
            break;
          }
          if (!(!name || name.trim().length === 0)) {
            _context63.next = 3;
            break;
          }
          return _context63.abrupt("return", res.status(400).json({
            error: 'Category name cannot be empty'
          }));
        case 3:
          if (!(name.length > 100)) {
            _context63.next = 4;
            break;
          }
          return _context63.abrupt("return", res.status(400).json({
            error: 'Category name must be less than 100 characters'
          }));
        case 4:
          _context63.next = 5;
          return _db5.query("\n        SELECT id FROM bigcompany.product_categories\n        WHERE LOWER(name) = LOWER($1) AND id != $2 AND is_active = true\n      ", [name.trim(), id]);
        case 5:
          existingName = _context63.sent;
          if (!(existingName.rows.length > 0)) {
            _context63.next = 6;
            break;
          }
          return _context63.abrupt("return", res.status(400).json({
            error: 'A category with this name already exists'
          }));
        case 6:
          // Build update query
          updates = [];
          params = [];
          if (name !== undefined) {
            updates.push("name = $".concat(params.length + 1));
            params.push(name.trim());
          }
          if (description !== undefined) {
            updates.push("description = $".concat(params.length + 1));
            params.push((description === null || description === void 0 ? void 0 : description.trim()) || null);
          }
          if (is_active !== undefined) {
            updates.push("is_active = $".concat(params.length + 1));
            params.push(is_active);
          }
          if (!(updates.length === 0)) {
            _context63.next = 7;
            break;
          }
          return _context63.abrupt("return", res.status(400).json({
            error: 'No fields to update'
          }));
        case 7:
          params.push(id);
          _context63.next = 8;
          return _db5.query("\n      UPDATE bigcompany.product_categories\n      SET ".concat(updates.join(', '), "\n      WHERE id = $").concat(params.length, "\n      RETURNING *\n    "), params);
        case 8:
          result = _context63.sent;
          res.json({
            success: true,
            message: 'Category updated successfully',
            category: result.rows[0]
          });
          _context63.next = 11;
          break;
        case 9:
          _context63.prev = 9;
          _t28 = _context63["catch"](0);
          console.error('Error updating category:', _t28);
          if (!(_t28.code === '23505')) {
            _context63.next = 10;
            break;
          }
          return _context63.abrupt("return", res.status(400).json({
            error: 'Category name already exists'
          }));
        case 10:
          res.status(500).json({
            error: 'Failed to update category'
          });
        case 11:
        case "end":
          return _context63.stop();
      }
    }, _callee63, null, [[0, 9]]);
  }));
  return function (_x128, _x129) {
    return _ref63.apply(this, arguments);
  };
}());

/**
 * DELETE /retailer/categories/:id
 * Delete category (soft delete if has products, hard delete otherwise)
 */
router["delete"]('/categories/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref64 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee64(req, res) {
    var id, force, _db6, existing, hasProducts, productCount, _t29;
    return _regenerator["default"].wrap(function (_context64) {
      while (1) switch (_context64.prev = _context64.next) {
        case 0:
          _context64.prev = 0;
          id = req.params.id;
          force = req.query.force;
          _db6 = req.scope.resolve('db'); // Check if category exists
          _context64.next = 1;
          return _db6.query("\n      SELECT id FROM bigcompany.product_categories WHERE id = $1\n    ", [id]);
        case 1:
          existing = _context64.sent;
          if (!(existing.rows.length === 0)) {
            _context64.next = 2;
            break;
          }
          return _context64.abrupt("return", res.status(404).json({
            error: 'Category not found'
          }));
        case 2:
          _context64.next = 3;
          return _db6.query("\n      SELECT bigcompany.category_has_products($1) as has_products\n    ", [id]);
        case 3:
          hasProducts = _context64.sent;
          if (!hasProducts.rows[0].has_products) {
            _context64.next = 7;
            break;
          }
          if (!(force === 'true')) {
            _context64.next = 5;
            break;
          }
          _context64.next = 4;
          return _db6.query("\n          UPDATE bigcompany.product_categories\n          SET is_active = false\n          WHERE id = $1\n        ", [id]);
        case 4:
          return _context64.abrupt("return", res.json({
            success: true,
            message: 'Category deactivated (has associated products)',
            soft_deleted: true
          }));
        case 5:
          _context64.next = 6;
          return _db6.query("\n          SELECT bigcompany.get_category_product_count($1) as count\n        ", [id]);
        case 6:
          productCount = _context64.sent;
          return _context64.abrupt("return", res.status(400).json({
            error: 'Cannot delete category with associated products',
            product_count: productCount.rows[0].count,
            hint: 'Use force=true to deactivate instead of deleting'
          }));
        case 7:
          _context64.next = 8;
          return _db6.query("\n      DELETE FROM bigcompany.product_categories WHERE id = $1\n    ", [id]);
        case 8:
          res.json({
            success: true,
            message: 'Category deleted successfully',
            soft_deleted: false
          });
          _context64.next = 10;
          break;
        case 9:
          _context64.prev = 9;
          _t29 = _context64["catch"](0);
          console.error('Error deleting category:', _t29);
          res.status(500).json({
            error: 'Failed to delete category'
          });
        case 10:
        case "end":
          return _context64.stop();
      }
    }, _callee64, null, [[0, 9]]);
  }));
  return function (_x130, _x131) {
    return _ref64.apply(this, arguments);
  };
}());

/**
 * GET /retailer/categories/stats/summary
 * Get category statistics
 */
router.get('/categories/stats/summary', authMiddleware, /*#__PURE__*/function () {
  var _ref65 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee65(req, res) {
    var _db7, result, _t30;
    return _regenerator["default"].wrap(function (_context65) {
      while (1) switch (_context65.prev = _context65.next) {
        case 0:
          _context65.prev = 0;
          _db7 = req.scope.resolve('db');
          _context65.next = 1;
          return _db7.query("\n      SELECT\n        COUNT(*) as total_categories,\n        COUNT(*) FILTER (WHERE is_active = true) as active_categories,\n        COUNT(*) FILTER (WHERE is_active = false) as inactive_categories,\n        (SELECT COUNT(DISTINCT category_id) FROM bigcompany.products WHERE category_id IS NOT NULL) as categories_with_products\n      FROM bigcompany.product_categories\n    ");
        case 1:
          result = _context65.sent;
          res.json({
            stats: result.rows[0]
          });
          _context65.next = 3;
          break;
        case 2:
          _context65.prev = 2;
          _t30 = _context65["catch"](0);
          console.error('Error fetching category stats:', _t30);
          res.status(500).json({
            error: 'Failed to fetch statistics'
          });
        case 3:
        case "end":
          return _context65.stop();
      }
    }, _callee65, null, [[0, 2]]);
  }));
  return function (_x132, _x133) {
    return _ref65.apply(this, arguments);
  };
}());

// ==================== REPORTS - PROFIT MARGIN ====================

// GET /retailer/reports/profit-margin - Profit margin analysis with date filters
router.get('/reports/profit-margin', authMiddleware, /*#__PURE__*/function () {
  var _ref66 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee66(req, res) {
    var _filteredData, _filteredData$, _req$query12, _req$query12$period, period, start_date, end_date, user, mockOrderData, filteredData, today, weekAgo, monthAgo, total_orders, total_items, total_revenue, total_cost, total_profit, average_margin, dailyBreakdown, breakdown;
    return _regenerator["default"].wrap(function (_context66) {
      while (1) switch (_context66.prev = _context66.next) {
        case 0:
          try {
            _req$query12 = req.query, _req$query12$period = _req$query12.period, period = _req$query12$period === void 0 ? 'today' : _req$query12$period, start_date = _req$query12.start_date, end_date = _req$query12.end_date;
            user = req.user; // Mock order data with cost and profit calculations
            mockOrderData = [
            // Today
            {
              date: '2024-12-02',
              order_id: 'ord_101',
              items_sold: 15,
              revenue: 28500,
              cost: 21500,
              profit: 7000,
              margin: 24.56
            }, {
              date: '2024-12-02',
              order_id: 'ord_102',
              items_sold: 8,
              revenue: 15000,
              cost: 11200,
              profit: 3800,
              margin: 25.33
            }, {
              date: '2024-12-02',
              order_id: 'ord_103',
              items_sold: 22,
              revenue: 42000,
              cost: 31500,
              profit: 10500,
              margin: 25.0
            },
            // Yesterday
            {
              date: '2024-12-01',
              order_id: 'ord_091',
              items_sold: 12,
              revenue: 19800,
              cost: 14600,
              profit: 5200,
              margin: 26.26
            }, {
              date: '2024-12-01',
              order_id: 'ord_092',
              items_sold: 18,
              revenue: 33200,
              cost: 25100,
              profit: 8100,
              margin: 24.40
            },
            // Last week
            {
              date: '2024-11-30',
              order_id: 'ord_085',
              items_sold: 25,
              revenue: 51000,
              cost: 38400,
              profit: 12600,
              margin: 24.71
            }, {
              date: '2024-11-29',
              order_id: 'ord_078',
              items_sold: 14,
              revenue: 22400,
              cost: 16500,
              profit: 5900,
              margin: 26.34
            }, {
              date: '2024-11-28',
              order_id: 'ord_071',
              items_sold: 19,
              revenue: 36800,
              cost: 27900,
              profit: 8900,
              margin: 24.18
            }, {
              date: '2024-11-27',
              order_id: 'ord_065',
              items_sold: 11,
              revenue: 18200,
              cost: 13400,
              profit: 4800,
              margin: 26.37
            }, {
              date: '2024-11-26',
              order_id: 'ord_058',
              items_sold: 16,
              revenue: 28900,
              cost: 21700,
              profit: 7200,
              margin: 24.91
            },
            // Last month
            {
              date: '2024-11-15',
              order_id: 'ord_045',
              items_sold: 21,
              revenue: 45000,
              cost: 33800,
              profit: 11200,
              margin: 24.89
            }, {
              date: '2024-11-10',
              order_id: 'ord_032',
              items_sold: 17,
              revenue: 31500,
              cost: 23600,
              profit: 7900,
              margin: 25.08
            }, {
              date: '2024-11-05',
              order_id: 'ord_021',
              items_sold: 13,
              revenue: 24800,
              cost: 18300,
              profit: 6500,
              margin: 26.21
            }]; // Filter data based on period
            filteredData = mockOrderData;
            today = new Date('2024-12-02');
            if (period === 'today') {
              filteredData = mockOrderData.filter(function (o) {
                return o.date === '2024-12-02';
              });
            } else if (period === 'yesterday') {
              filteredData = mockOrderData.filter(function (o) {
                return o.date === '2024-12-01';
              });
            } else if (period === 'week') {
              weekAgo = new Date(today);
              weekAgo.setDate(weekAgo.getDate() - 7);
              filteredData = mockOrderData.filter(function (o) {
                return new Date(o.date) >= weekAgo;
              });
            } else if (period === 'month') {
              monthAgo = new Date(today);
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              filteredData = mockOrderData.filter(function (o) {
                return new Date(o.date) >= monthAgo;
              });
            } else if (period === 'custom' && start_date && end_date) {
              filteredData = mockOrderData.filter(function (o) {
                return o.date >= start_date && o.date <= end_date;
              });
            }

            // Calculate summary statistics
            total_orders = filteredData.length;
            total_items = filteredData.reduce(function (sum, o) {
              return sum + o.items_sold;
            }, 0);
            total_revenue = filteredData.reduce(function (sum, o) {
              return sum + o.revenue;
            }, 0);
            total_cost = filteredData.reduce(function (sum, o) {
              return sum + o.cost;
            }, 0);
            total_profit = total_revenue - total_cost;
            average_margin = total_revenue > 0 ? total_profit / total_revenue * 100 : 0; // Group by date for daily breakdown
            dailyBreakdown = filteredData.reduce(function (acc, order) {
              if (!acc[order.date]) {
                acc[order.date] = {
                  date: order.date,
                  orders: 0,
                  items: 0,
                  revenue: 0,
                  cost: 0,
                  profit: 0
                };
              }
              acc[order.date].orders += 1;
              acc[order.date].items += order.items_sold;
              acc[order.date].revenue += order.revenue;
              acc[order.date].cost += order.cost;
              acc[order.date].profit += order.profit;
              return acc;
            }, {});
            breakdown = Object.values(dailyBreakdown).map(function (day) {
              return _objectSpread(_objectSpread({}, day), {}, {
                margin: day.revenue > 0 ? (day.profit / day.revenue * 100).toFixed(2) : '0.00'
              });
            });
            res.json({
              period: period,
              start_date: start_date || ((_filteredData = filteredData[filteredData.length - 1]) === null || _filteredData === void 0 ? void 0 : _filteredData.date),
              end_date: end_date || ((_filteredData$ = filteredData[0]) === null || _filteredData$ === void 0 ? void 0 : _filteredData$.date),
              summary: {
                total_orders: total_orders,
                total_items: total_items,
                total_revenue: total_revenue,
                total_cost: total_cost,
                total_profit: total_profit,
                average_margin: average_margin.toFixed(2),
                currency: 'RWF'
              },
              breakdown: breakdown,
              orders: filteredData
            });
          } catch (error) {
            console.error('Error calculating profit margin:', error);
            res.status(500).json({
              error: 'Failed to calculate profit margin'
            });
          }
        case 1:
        case "end":
          return _context66.stop();
      }
    }, _callee66);
  }));
  return function (_x134, _x135) {
    return _ref66.apply(this, arguments);
  };
}());

// ==================== ESCROW ENDPOINTS ====================

/**
 * GET /retailer/escrow/summary
 * Get retailer's escrow summary (outstanding debt, active escrows, etc.)
 */
router.get('/escrow/summary', authMiddleware, /*#__PURE__*/function () {
  var _ref67 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee67(req, res) {
    var user, retailer_id, escrowService, summary, _t31;
    return _regenerator["default"].wrap(function (_context67) {
      while (1) switch (_context67.prev = _context67.next) {
        case 0:
          _context67.prev = 0;
          user = req.user;
          retailer_id = user.id;
          escrowService = req.scope.resolve('escrowService');
          _context67.next = 1;
          return escrowService.getRetailerSummary(retailer_id);
        case 1:
          summary = _context67.sent;
          if (summary) {
            _context67.next = 2;
            break;
          }
          return _context67.abrupt("return", res.json({
            retailer_id: retailer_id,
            total_escrow_transactions: 0,
            active_escrow_count: 0,
            total_held_amount: 0,
            total_released_amount: 0,
            total_disputed_amount: 0,
            total_repaid_amount: 0,
            outstanding_debt: 0,
            last_escrow_date: null,
            last_repayment_date: null
          }));
        case 2:
          res.json(summary);
          _context67.next = 4;
          break;
        case 3:
          _context67.prev = 3;
          _t31 = _context67["catch"](0);
          console.error('Error fetching escrow summary:', _t31);
          res.status(500).json({
            error: 'Failed to fetch escrow summary'
          });
        case 4:
        case "end":
          return _context67.stop();
      }
    }, _callee67, null, [[0, 3]]);
  }));
  return function (_x136, _x137) {
    return _ref67.apply(this, arguments);
  };
}());

/**
 * GET /retailer/escrow/transactions
 * Get all escrow transactions for retailer
 */
router.get('/escrow/transactions', authMiddleware, /*#__PURE__*/function () {
  var _ref68 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee68(req, res) {
    var user, retailer_id, status, escrowService, transactions, _t32;
    return _regenerator["default"].wrap(function (_context68) {
      while (1) switch (_context68.prev = _context68.next) {
        case 0:
          _context68.prev = 0;
          user = req.user;
          retailer_id = user.id;
          status = req.query.status;
          escrowService = req.scope.resolve('escrowService');
          _context68.next = 1;
          return escrowService.getRetailerEscrows(retailer_id, status);
        case 1:
          transactions = _context68.sent;
          res.json({
            count: transactions.length,
            transactions: transactions
          });
          _context68.next = 3;
          break;
        case 2:
          _context68.prev = 2;
          _t32 = _context68["catch"](0);
          console.error('Error fetching escrow transactions:', _t32);
          res.status(500).json({
            error: 'Failed to fetch escrow transactions'
          });
        case 3:
        case "end":
          return _context68.stop();
      }
    }, _callee68, null, [[0, 2]]);
  }));
  return function (_x138, _x139) {
    return _ref68.apply(this, arguments);
  };
}());

/**
 * GET /retailer/escrow/transactions/:id
 * Get specific escrow transaction details
 */
router.get('/escrow/transactions/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref69 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee69(req, res) {
    var user, escrow_id, escrowService, transaction, _t33;
    return _regenerator["default"].wrap(function (_context69) {
      while (1) switch (_context69.prev = _context69.next) {
        case 0:
          _context69.prev = 0;
          user = req.user;
          escrow_id = req.params.id;
          escrowService = req.scope.resolve('escrowService');
          _context69.next = 1;
          return escrowService.getEscrowById(escrow_id);
        case 1:
          transaction = _context69.sent;
          if (transaction) {
            _context69.next = 2;
            break;
          }
          return _context69.abrupt("return", res.status(404).json({
            error: 'Escrow transaction not found'
          }));
        case 2:
          if (!(transaction.retailer_id !== user.id)) {
            _context69.next = 3;
            break;
          }
          return _context69.abrupt("return", res.status(403).json({
            error: 'Not authorized to view this transaction'
          }));
        case 3:
          res.json(transaction);
          _context69.next = 5;
          break;
        case 4:
          _context69.prev = 4;
          _t33 = _context69["catch"](0);
          console.error('Error fetching escrow transaction:', _t33);
          res.status(500).json({
            error: 'Failed to fetch escrow transaction'
          });
        case 5:
        case "end":
          return _context69.stop();
      }
    }, _callee69, null, [[0, 4]]);
  }));
  return function (_x140, _x141) {
    return _ref69.apply(this, arguments);
  };
}());

/**
 * POST /retailer/escrow/repayment
 * Record a manual repayment from retailer
 */
router.post('/escrow/repayment', authMiddleware, /*#__PURE__*/function () {
  var _ref70 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee70(req, res) {
    var user, _req$body18, escrow_transaction_id, repayment_amount, repayment_method, payment_reference, notes, escrowService, escrow, repayment, _t34;
    return _regenerator["default"].wrap(function (_context70) {
      while (1) switch (_context70.prev = _context70.next) {
        case 0:
          _context70.prev = 0;
          user = req.user;
          _req$body18 = req.body, escrow_transaction_id = _req$body18.escrow_transaction_id, repayment_amount = _req$body18.repayment_amount, repayment_method = _req$body18.repayment_method, payment_reference = _req$body18.payment_reference, notes = _req$body18.notes;
          if (!(!escrow_transaction_id || !repayment_amount || !repayment_method)) {
            _context70.next = 1;
            break;
          }
          return _context70.abrupt("return", res.status(400).json({
            error: 'Missing required fields: escrow_transaction_id, repayment_amount, repayment_method'
          }));
        case 1:
          if (['mobile_money', 'bank_transfer', 'wallet'].includes(repayment_method)) {
            _context70.next = 2;
            break;
          }
          return _context70.abrupt("return", res.status(400).json({
            error: 'Invalid repayment_method. Must be: mobile_money, bank_transfer, or wallet'
          }));
        case 2:
          escrowService = req.scope.resolve('escrowService'); // Verify escrow belongs to retailer
          _context70.next = 3;
          return escrowService.getEscrowById(escrow_transaction_id);
        case 3:
          escrow = _context70.sent;
          if (!(!escrow || escrow.retailer_id !== user.id)) {
            _context70.next = 4;
            break;
          }
          return _context70.abrupt("return", res.status(404).json({
            error: 'Escrow transaction not found'
          }));
        case 4:
          _context70.next = 5;
          return escrowService.recordRepayment({
            escrow_transaction_id: escrow_transaction_id,
            retailer_id: user.id,
            repayment_amount: parseFloat(repayment_amount),
            repayment_method: repayment_method,
            payment_reference: payment_reference,
            notes: notes
          });
        case 5:
          repayment = _context70.sent;
          res.status(201).json({
            message: 'Repayment recorded successfully',
            repayment: repayment
          });
          _context70.next = 7;
          break;
        case 6:
          _context70.prev = 6;
          _t34 = _context70["catch"](0);
          console.error('Error recording repayment:', _t34);
          res.status(500).json({
            error: _t34.message || 'Failed to record repayment'
          });
        case 7:
        case "end":
          return _context70.stop();
      }
    }, _callee70, null, [[0, 6]]);
  }));
  return function (_x142, _x143) {
    return _ref70.apply(this, arguments);
  };
}());

/**
 * GET /retailer/escrow/auto-deduct-settings
 * Get retailer's auto-deduct settings
 */
router.get('/escrow/auto-deduct-settings', authMiddleware, /*#__PURE__*/function () {
  var _ref71 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee71(req, res) {
    var user, retailer_id, result, _t35;
    return _regenerator["default"].wrap(function (_context71) {
      while (1) switch (_context71.prev = _context71.next) {
        case 0:
          _context71.prev = 0;
          user = req.user;
          retailer_id = user.id;
          _context71.next = 1;
          return db.query('SELECT * FROM bigcompany.escrow_auto_deductions WHERE retailer_id = $1', [retailer_id]);
        case 1:
          result = _context71.sent;
          if (!(result.rows.length === 0)) {
            _context71.next = 2;
            break;
          }
          return _context71.abrupt("return", res.json({
            retailer_id: retailer_id,
            enabled: true,
            deduction_percentage: 30.00,
            minimum_balance_rwf: 10000.00,
            max_daily_deduction_rwf: null,
            max_total_outstanding_rwf: 5000000.00,
            suspended: false
          }));
        case 2:
          res.json(result.rows[0]);
          _context71.next = 4;
          break;
        case 3:
          _context71.prev = 3;
          _t35 = _context71["catch"](0);
          console.error('Error fetching auto-deduct settings:', _t35);
          res.status(500).json({
            error: 'Failed to fetch auto-deduct settings'
          });
        case 4:
        case "end":
          return _context71.stop();
      }
    }, _callee71, null, [[0, 3]]);
  }));
  return function (_x144, _x145) {
    return _ref71.apply(this, arguments);
  };
}());

/**
 * PATCH /retailer/escrow/auto-deduct-settings
 * Update retailer's auto-deduct settings
 */
router.patch('/escrow/auto-deduct-settings', authMiddleware, /*#__PURE__*/function () {
  var _ref72 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee72(req, res) {
    var user, retailer_id, _req$body19, enabled, deduction_percentage, minimum_balance_rwf, max_daily_deduction_rwf, escrowService, updated, _t36;
    return _regenerator["default"].wrap(function (_context72) {
      while (1) switch (_context72.prev = _context72.next) {
        case 0:
          _context72.prev = 0;
          user = req.user;
          retailer_id = user.id;
          _req$body19 = req.body, enabled = _req$body19.enabled, deduction_percentage = _req$body19.deduction_percentage, minimum_balance_rwf = _req$body19.minimum_balance_rwf, max_daily_deduction_rwf = _req$body19.max_daily_deduction_rwf;
          escrowService = req.scope.resolve('escrowService');
          _context72.next = 1;
          return escrowService.updateAutoDeductSettings(retailer_id, {
            enabled: enabled,
            deduction_percentage: deduction_percentage,
            minimum_balance_rwf: minimum_balance_rwf,
            max_daily_deduction_rwf: max_daily_deduction_rwf
          });
        case 1:
          updated = _context72.sent;
          res.json({
            message: 'Auto-deduct settings updated successfully',
            settings: updated
          });
          _context72.next = 3;
          break;
        case 2:
          _context72.prev = 2;
          _t36 = _context72["catch"](0);
          console.error('Error updating auto-deduct settings:', _t36);
          res.status(500).json({
            error: _t36.message || 'Failed to update settings'
          });
        case 3:
        case "end":
          return _context72.stop();
      }
    }, _callee72, null, [[0, 2]]);
  }));
  return function (_x146, _x147) {
    return _ref72.apply(this, arguments);
  };
}());

/**
 * POST /retailer/escrow/dispute/:id
 * Raise a dispute on an escrow transaction
 */
router.post('/escrow/dispute/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref73 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee73(req, res) {
    var user, escrow_id, reason, escrowService, escrow, _t37;
    return _regenerator["default"].wrap(function (_context73) {
      while (1) switch (_context73.prev = _context73.next) {
        case 0:
          _context73.prev = 0;
          user = req.user;
          escrow_id = req.params.id;
          reason = req.body.reason;
          if (reason) {
            _context73.next = 1;
            break;
          }
          return _context73.abrupt("return", res.status(400).json({
            error: 'Dispute reason is required'
          }));
        case 1:
          escrowService = req.scope.resolve('escrowService'); // Verify escrow belongs to retailer
          _context73.next = 2;
          return escrowService.getEscrowById(escrow_id);
        case 2:
          escrow = _context73.sent;
          if (!(!escrow || escrow.retailer_id !== user.id)) {
            _context73.next = 3;
            break;
          }
          return _context73.abrupt("return", res.status(404).json({
            error: 'Escrow transaction not found'
          }));
        case 3:
          if (!(escrow.status !== 'held')) {
            _context73.next = 4;
            break;
          }
          return _context73.abrupt("return", res.status(400).json({
            error: 'Can only dispute escrows in "held" status'
          }));
        case 4:
          _context73.next = 5;
          return escrowService.raiseDispute(escrow_id, reason, user.id);
        case 5:
          res.json({
            message: 'Dispute raised successfully. Our team will review it shortly.',
            escrow_id: escrow_id
          });
          _context73.next = 7;
          break;
        case 6:
          _context73.prev = 6;
          _t37 = _context73["catch"](0);
          console.error('Error raising dispute:', _t37);
          res.status(500).json({
            error: _t37.message || 'Failed to raise dispute'
          });
        case 7:
        case "end":
          return _context73.stop();
      }
    }, _callee73, null, [[0, 6]]);
  }));
  return function (_x148, _x149) {
    return _ref73.apply(this, arguments);
  };
}());
var _default = exports["default"] = router;