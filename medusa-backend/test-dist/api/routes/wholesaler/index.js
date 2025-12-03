"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var _bcryptjs = _interopRequireDefault(require("bcryptjs"));
var _excluded = ["password"],
  _excluded2 = ["password"];
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
// Version: 2024-11-30 - Full endpoints with retailer-orders and credit-requests
console.log('[Wholesaler Routes] Loading v2.0 with retailer-orders and credit-requests endpoints');

// CORS Middleware for wholesaler routes
var corsMiddleware = function corsMiddleware(req, res, next) {
  var allowedOrigins = ['https://bigcompany-wholesaler.alexandratechlab.com', 'https://bigcompany-retailer.alexandratechlab.com', 'http://localhost:3002', 'http://localhost:3005'];
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
          if (!(decoded.type !== 'wholesaler' && decoded.type !== 'admin')) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return", res.status(403).json({
            error: 'Not authorized for wholesaler access'
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

// Mock wholesaler database
var wholesalers = new Map([['wholesaler@bigcompany.rw', {
  id: 'whl_001',
  email: 'wholesaler@bigcompany.rw',
  password: _bcryptjs["default"].hashSync('wholesaler123', 10),
  name: 'BIG Company Wholesale',
  company_name: 'BIG Company Rwanda Ltd',
  phone: '+250788999888',
  location: 'Kigali Industrial Zone, Rwanda',
  type: 'wholesaler',
  status: 'active',
  tier: 'premium',
  credit_limit: 50000000,
  created_at: new Date('2024-01-01')
}]]);
var router = (0, _express.Router)();

// JSON body parser middleware
router.use((0, _express.json)());

// Apply CORS to all wholesaler routes
router.use(corsMiddleware);

// ==================== AUTH ROUTES ====================

router.post('/auth/login', /*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var _req$body, email, password, wholesaler, validPassword, token, _, wholesalerData, _t2;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _req$body = req.body, email = _req$body.email, password = _req$body.password;
          wholesaler = wholesalers.get(email);
          if (wholesaler) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", res.status(401).json({
            error: 'Invalid credentials'
          }));
        case 1:
          _context2.next = 2;
          return _bcryptjs["default"].compare(password, wholesaler.password);
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
            id: wholesaler.id,
            email: wholesaler.email,
            type: 'wholesaler',
            company_name: wholesaler.company_name
          }, process.env.JWT_SECRET || 'bigcompany_jwt_secret_2024', {
            expiresIn: '7d'
          });
          _ = wholesaler.password, wholesalerData = (0, _objectWithoutProperties2["default"])(wholesaler, _excluded);
          res.json({
            access_token: token,
            wholesaler: wholesalerData
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
    var user, wholesaler, _, wholesalerData, _t3;
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          user = req.user;
          wholesaler = Array.from(wholesalers.values()).find(function (w) {
            return w.id === user.id;
          });
          if (wholesaler) {
            _context3.next = 1;
            break;
          }
          return _context3.abrupt("return", res.status(404).json({
            error: 'Wholesaler not found'
          }));
        case 1:
          _ = wholesaler.password, wholesalerData = (0, _objectWithoutProperties2["default"])(wholesaler, _excluded2);
          res.json(wholesalerData);
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
            res.json({
              totalOrders: 892,
              totalRevenue: 156000000,
              // RWF
              pendingOrders: 45,
              activeRetailers: 156,
              totalProducts: 248,
              lowStockItems: 12,
              todayOrders: 34,
              todayRevenue: 8500000,
              creditUsed: 12500000,
              creditLimit: 50000000,
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
            _req$query$period = req.query.period, period = _req$query$period === void 0 ? 'week' : _req$query$period;
            salesData = {
              week: [{
                date: '2024-11-22',
                sales: 4500000,
                orders: 45
              }, {
                date: '2024-11-23',
                sales: 7800000,
                orders: 78
              }, {
                date: '2024-11-24',
                sales: 5600000,
                orders: 56
              }, {
                date: '2024-11-25',
                sales: 9200000,
                orders: 92
              }, {
                date: '2024-11-26',
                sales: 6700000,
                orders: 67
              }, {
                date: '2024-11-27',
                sales: 8400000,
                orders: 84
              }, {
                date: '2024-11-28',
                sales: 8500000,
                orders: 85
              }],
              month: Array.from({
                length: 30
              }, function (_, i) {
                return {
                  date: new Date(2024, 10, i + 1).toISOString().split('T')[0],
                  sales: Math.floor(Math.random() * 10000000) + 3000000,
                  orders: Math.floor(Math.random() * 100) + 30
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
              id: 'prod_w1',
              name: 'Inyange Milk 500ml (Case/24)',
              stock: 15,
              threshold: 50,
              category: 'Dairy'
            }, {
              id: 'prod_w2',
              name: 'Bralirwa Primus 500ml (Crate/24)',
              stock: 8,
              threshold: 30,
              category: 'Beverages'
            }, {
              id: 'prod_w3',
              name: 'Akabanga Chili Oil (Box/48)',
              stock: 5,
              threshold: 20,
              category: 'Cooking'
            }, {
              id: 'prod_w4',
              name: 'Isombe Mix 1kg (Bag/25)',
              stock: 12,
              threshold: 25,
              category: 'Food'
            }, {
              id: 'prod_w5',
              name: 'Urwagwa Traditional 1L (Case/12)',
              stock: 3,
              threshold: 15,
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
              id: 'whl_ord_001',
              retailer: 'Kigali Shop',
              total: 1500000,
              status: 'pending',
              items: 45,
              created_at: '2024-11-28T10:30:00Z'
            }, {
              id: 'whl_ord_002',
              retailer: 'Musanze Mart',
              total: 2850000,
              status: 'processing',
              items: 82,
              created_at: '2024-11-28T09:15:00Z'
            }, {
              id: 'whl_ord_003',
              retailer: 'Rubavu Store',
              total: 820000,
              status: 'shipped',
              items: 28,
              created_at: '2024-11-28T08:45:00Z'
            }, {
              id: 'whl_ord_004',
              retailer: 'Huye Traders',
              total: 4200000,
              status: 'delivered',
              items: 120,
              created_at: '2024-11-27T16:20:00Z'
            }, {
              id: 'whl_ord_005',
              retailer: 'Nyagatare Supplies',
              total: 1980000,
              status: 'pending',
              items: 56,
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
router.get('/dashboard/top-retailers', authMiddleware, /*#__PURE__*/function () {
  var _ref8 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(req, res) {
    var _req$query$limit3, limit, topRetailers;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          try {
            _req$query$limit3 = req.query.limit, limit = _req$query$limit3 === void 0 ? 5 : _req$query$limit3;
            topRetailers = [{
              id: 'ret_001',
              name: 'Kigali Shop',
              orders: 156,
              revenue: 24500000,
              location: 'Kigali'
            }, {
              id: 'ret_002',
              name: 'Musanze Mart',
              orders: 142,
              revenue: 22800000,
              location: 'Musanze'
            }, {
              id: 'ret_003',
              name: 'Rubavu Store',
              orders: 128,
              revenue: 19200000,
              location: 'Rubavu'
            }, {
              id: 'ret_004',
              name: 'Huye Traders',
              orders: 115,
              revenue: 17800000,
              location: 'Huye'
            }, {
              id: 'ret_005',
              name: 'Nyagatare Supplies',
              orders: 98,
              revenue: 15600000,
              location: 'Nyagatare'
            }];
            res.json(topRetailers.slice(0, Number(limit)));
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

// Weekly sales endpoint (alias for dashboard/sales with week period)
router.get('/dashboard/weekly-sales', authMiddleware, /*#__PURE__*/function () {
  var _ref9 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(req, res) {
    var weeklySales;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          try {
            weeklySales = [{
              date: '2024-11-22',
              sales: 4500000,
              orders: 45,
              day: 'Fri'
            }, {
              date: '2024-11-23',
              sales: 7800000,
              orders: 78,
              day: 'Sat'
            }, {
              date: '2024-11-24',
              sales: 5600000,
              orders: 56,
              day: 'Sun'
            }, {
              date: '2024-11-25',
              sales: 9200000,
              orders: 92,
              day: 'Mon'
            }, {
              date: '2024-11-26',
              sales: 6700000,
              orders: 67,
              day: 'Tue'
            }, {
              date: '2024-11-27',
              sales: 8400000,
              orders: 84,
              day: 'Wed'
            }, {
              date: '2024-11-28',
              sales: 8500000,
              orders: 85,
              day: 'Thu'
            }];
            res.json(weeklySales);
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

// Pending orders for dashboard
router.get('/dashboard/pending-orders', authMiddleware, /*#__PURE__*/function () {
  var _ref0 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee0(req, res) {
    var _req$query$limit4, limit, pendingOrders;
    return _regenerator["default"].wrap(function (_context0) {
      while (1) switch (_context0.prev = _context0.next) {
        case 0:
          try {
            _req$query$limit4 = req.query.limit, limit = _req$query$limit4 === void 0 ? 5 : _req$query$limit4;
            pendingOrders = [{
              id: 'whl_ord_001',
              retailer: 'Kigali Shop',
              total: 1500000,
              items: 45,
              created_at: '2024-11-28T10:30:00Z',
              priority: 'high'
            }, {
              id: 'whl_ord_005',
              retailer: 'Nyagatare Supplies',
              total: 1980000,
              items: 56,
              created_at: '2024-11-27T14:50:00Z',
              priority: 'normal'
            }, {
              id: 'whl_ord_006',
              retailer: 'Muhanga Store',
              total: 2350000,
              items: 68,
              created_at: '2024-11-27T11:20:00Z',
              priority: 'normal'
            }, {
              id: 'whl_ord_007',
              retailer: 'Rwamagana Market',
              total: 890000,
              items: 24,
              created_at: '2024-11-27T09:45:00Z',
              priority: 'low'
            }, {
              id: 'whl_ord_008',
              retailer: 'Karongi Traders',
              total: 3200000,
              items: 92,
              created_at: '2024-11-26T16:30:00Z',
              priority: 'high'
            }];
            res.json(pendingOrders.slice(0, Number(limit)));
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

// Credit health dashboard endpoint
router.get('/dashboard/credit-health', authMiddleware, /*#__PURE__*/function () {
  var _ref1 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee1(req, res) {
    return _regenerator["default"].wrap(function (_context1) {
      while (1) switch (_context1.prev = _context1.next) {
        case 0:
          try {
            res.json({
              total_credit_limit: 50000000,
              total_credit_used: 35000000,
              available_credit: 15000000,
              utilization_rate: 70,
              retailers_with_credit: 45,
              overdue_amount: 5200000,
              overdue_count: 8,
              on_time_payments_rate: 92,
              currency: 'RWF'
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

// ==================== RETAILERS MANAGEMENT ====================

router.get('/retailers', authMiddleware, /*#__PURE__*/function () {
  var _ref10 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee10(req, res) {
    var _req$query, _req$query$limit5, limit, _req$query$offset, offset, status, search, retailers, searchLower;
    return _regenerator["default"].wrap(function (_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          try {
            _req$query = req.query, _req$query$limit5 = _req$query.limit, limit = _req$query$limit5 === void 0 ? 20 : _req$query$limit5, _req$query$offset = _req$query.offset, offset = _req$query$offset === void 0 ? 0 : _req$query$offset, status = _req$query.status, search = _req$query.search;
            retailers = [{
              id: 'ret_001',
              name: 'Kigali Shop',
              email: 'kigali@shop.rw',
              phone: '+250788123456',
              location: 'Kigali',
              status: 'active',
              tier: 'gold',
              total_orders: 156,
              total_spent: 24500000
            }, {
              id: 'ret_002',
              name: 'Musanze Mart',
              email: 'musanze@mart.rw',
              phone: '+250788234567',
              location: 'Musanze',
              status: 'active',
              tier: 'silver',
              total_orders: 142,
              total_spent: 22800000
            }, {
              id: 'ret_003',
              name: 'Rubavu Store',
              email: 'rubavu@store.rw',
              phone: '+250788345678',
              location: 'Rubavu',
              status: 'active',
              tier: 'bronze',
              total_orders: 128,
              total_spent: 19200000
            }, {
              id: 'ret_004',
              name: 'Huye Traders',
              email: 'huye@traders.rw',
              phone: '+250788456789',
              location: 'Huye',
              status: 'active',
              tier: 'silver',
              total_orders: 115,
              total_spent: 17800000
            }, {
              id: 'ret_005',
              name: 'Nyagatare Supplies',
              email: 'nyagatare@supplies.rw',
              phone: '+250788567890',
              location: 'Nyagatare',
              status: 'pending',
              tier: 'bronze',
              total_orders: 98,
              total_spent: 15600000
            }];
            if (status) {
              retailers = retailers.filter(function (r) {
                return r.status === status;
              });
            }
            if (search) {
              searchLower = search.toLowerCase();
              retailers = retailers.filter(function (r) {
                return r.name.toLowerCase().includes(searchLower) || r.email.toLowerCase().includes(searchLower) || r.location.toLowerCase().includes(searchLower);
              });
            }
            res.json({
              retailers: retailers.slice(Number(offset), Number(offset) + Number(limit)),
              count: retailers.length
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
router.get('/retailers/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref11 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee11(req, res) {
    var id, retailer;
    return _regenerator["default"].wrap(function (_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          try {
            id = req.params.id;
            retailer = {
              id: id,
              name: 'Kigali Shop',
              email: 'kigali@shop.rw',
              phone: '+250788123456',
              address: {
                line1: 'KG 123 St',
                city: 'Kigali',
                district: 'Gasabo',
                country: 'Rwanda'
              },
              status: 'active',
              tier: 'gold',
              credit_limit: 5000000,
              credit_used: 1200000,
              total_orders: 156,
              total_spent: 24500000,
              reward_balance: 245000,
              created_at: '2024-01-15T08:00:00Z'
            };
            res.json(retailer);
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
router.post('/retailers/:id/approve', authMiddleware, /*#__PURE__*/function () {
  var _ref12 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee12(req, res) {
    var id;
    return _regenerator["default"].wrap(function (_context12) {
      while (1) switch (_context12.prev = _context12.next) {
        case 0:
          try {
            id = req.params.id;
            res.json({
              id: id,
              status: 'active',
              approved_at: new Date().toISOString()
            });
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
router.post('/retailers/:id/credit', authMiddleware, /*#__PURE__*/function () {
  var _ref13 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee13(req, res) {
    var id, credit_limit;
    return _regenerator["default"].wrap(function (_context13) {
      while (1) switch (_context13.prev = _context13.next) {
        case 0:
          try {
            id = req.params.id;
            credit_limit = req.body.credit_limit;
            res.json({
              id: id,
              credit_limit: credit_limit,
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

// ==================== ORDERS ROUTES ====================

// Orders stats endpoint
router.get('/orders/stats', authMiddleware, /*#__PURE__*/function () {
  var _ref14 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee14(req, res) {
    return _regenerator["default"].wrap(function (_context14) {
      while (1) switch (_context14.prev = _context14.next) {
        case 0:
          try {
            res.json({
              total_orders: 892,
              pending: 45,
              processing: 38,
              shipped: 52,
              delivered: 745,
              cancelled: 12,
              total_revenue: 156000000,
              average_order_value: 174888,
              orders_today: 34,
              revenue_today: 8500000,
              currency: 'RWF'
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
router.get('/orders', authMiddleware, /*#__PURE__*/function () {
  var _ref15 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee15(req, res) {
    var _req$query2, _req$query2$limit, limit, _req$query2$offset, offset, status, orders;
    return _regenerator["default"].wrap(function (_context15) {
      while (1) switch (_context15.prev = _context15.next) {
        case 0:
          try {
            _req$query2 = req.query, _req$query2$limit = _req$query2.limit, limit = _req$query2$limit === void 0 ? 20 : _req$query2$limit, _req$query2$offset = _req$query2.offset, offset = _req$query2$offset === void 0 ? 0 : _req$query2$offset, status = _req$query2.status;
            orders = [{
              id: 'whl_ord_001',
              retailer: 'Kigali Shop',
              retailer_id: 'ret_001',
              total: 1500000,
              status: 'pending',
              items: 45,
              payment_status: 'paid',
              created_at: '2024-11-28T10:30:00Z'
            }, {
              id: 'whl_ord_002',
              retailer: 'Musanze Mart',
              retailer_id: 'ret_002',
              total: 2850000,
              status: 'processing',
              items: 82,
              payment_status: 'partial',
              created_at: '2024-11-28T09:15:00Z'
            }, {
              id: 'whl_ord_003',
              retailer: 'Rubavu Store',
              retailer_id: 'ret_003',
              total: 820000,
              status: 'shipped',
              items: 28,
              payment_status: 'paid',
              created_at: '2024-11-28T08:45:00Z'
            }, {
              id: 'whl_ord_004',
              retailer: 'Huye Traders',
              retailer_id: 'ret_004',
              total: 4200000,
              status: 'delivered',
              items: 120,
              payment_status: 'paid',
              created_at: '2024-11-27T16:20:00Z'
            }, {
              id: 'whl_ord_005',
              retailer: 'Nyagatare Supplies',
              retailer_id: 'ret_005',
              total: 1980000,
              status: 'pending',
              items: 56,
              payment_status: 'credit',
              created_at: '2024-11-27T14:50:00Z'
            }];
            if (status) {
              orders = orders.filter(function (o) {
                return o.status === status;
              });
            }
            res.json({
              orders: orders.slice(Number(offset), Number(offset) + Number(limit)),
              count: orders.length
            });
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
router.get('/orders/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref16 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee16(req, res) {
    var id, order;
    return _regenerator["default"].wrap(function (_context16) {
      while (1) switch (_context16.prev = _context16.next) {
        case 0:
          try {
            id = req.params.id;
            order = {
              id: id,
              retailer: {
                id: 'ret_001',
                name: 'Kigali Shop',
                email: 'kigali@shop.rw',
                phone: '+250788123456'
              },
              items: [{
                id: 'item_1',
                product_id: 'prod_w1',
                name: 'Inyange Milk 500ml (Case/24)',
                quantity: 20,
                unit_price: 18000,
                total: 360000
              }, {
                id: 'item_2',
                product_id: 'prod_w2',
                name: 'Bralirwa Primus 500ml (Crate/24)',
                quantity: 30,
                unit_price: 28000,
                total: 840000
              }, {
                id: 'item_3',
                product_id: 'prod_w4',
                name: 'Isombe Mix 1kg (Bag/25)',
                quantity: 10,
                unit_price: 85000,
                total: 850000
              }],
              subtotal: 2050000,
              discount: 50000,
              tax: 0,
              total: 2000000,
              status: 'processing',
              payment_status: 'partial',
              payment_method: 'credit',
              amount_paid: 1000000,
              amount_due: 1000000,
              shipping_address: {
                line1: 'KG 123 St',
                city: 'Kigali',
                district: 'Gasabo',
                country: 'Rwanda'
              },
              notes: 'Urgent delivery requested',
              created_at: '2024-11-28T09:15:00Z',
              updated_at: '2024-11-28T10:00:00Z'
            };
            res.json(order);
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
router.post('/orders/:id/status', authMiddleware, /*#__PURE__*/function () {
  var _ref17 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee17(req, res) {
    var id, _req$body2, status, notes;
    return _regenerator["default"].wrap(function (_context17) {
      while (1) switch (_context17.prev = _context17.next) {
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
          return _context17.stop();
      }
    }, _callee17);
  }));
  return function (_x36, _x37) {
    return _ref17.apply(this, arguments);
  };
}());
router.post('/orders/:id/ship', authMiddleware, /*#__PURE__*/function () {
  var _ref18 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee18(req, res) {
    var id, _req$body3, tracking_number, carrier, estimated_delivery;
    return _regenerator["default"].wrap(function (_context18) {
      while (1) switch (_context18.prev = _context18.next) {
        case 0:
          try {
            id = req.params.id;
            _req$body3 = req.body, tracking_number = _req$body3.tracking_number, carrier = _req$body3.carrier, estimated_delivery = _req$body3.estimated_delivery;
            res.json({
              id: id,
              status: 'shipped',
              tracking_number: tracking_number,
              carrier: carrier,
              estimated_delivery: estimated_delivery,
              shipped_at: new Date().toISOString()
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

// ==================== INVENTORY ROUTES ====================

router.get('/inventory', authMiddleware, /*#__PURE__*/function () {
  var _ref19 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee19(req, res) {
    var _req$query3, _req$query3$limit, limit, _req$query3$offset, offset, low_stock, search, category, products, searchLower;
    return _regenerator["default"].wrap(function (_context19) {
      while (1) switch (_context19.prev = _context19.next) {
        case 0:
          try {
            _req$query3 = req.query, _req$query3$limit = _req$query3.limit, limit = _req$query3$limit === void 0 ? 20 : _req$query3$limit, _req$query3$offset = _req$query3.offset, offset = _req$query3$offset === void 0 ? 0 : _req$query3$offset, low_stock = _req$query3.low_stock, search = _req$query3.search, category = _req$query3.category;
            products = [{
              id: 'prod_w1',
              name: 'Inyange Milk 500ml (Case/24)',
              sku: 'INY-MLK-500-C24',
              category: 'Dairy',
              wholesale_price: 18000,
              retail_price: 19200,
              stock: 250,
              threshold: 50,
              status: 'active'
            }, {
              id: 'prod_w2',
              name: 'Bralirwa Primus 500ml (Crate/24)',
              sku: 'BRL-PRM-500-C24',
              category: 'Beverages',
              wholesale_price: 28000,
              retail_price: 28800,
              stock: 8,
              threshold: 30,
              status: 'active'
            }, {
              id: 'prod_w3',
              name: 'Akabanga Chili Oil (Box/48)',
              sku: 'AKB-CHI-100-B48',
              category: 'Cooking',
              wholesale_price: 290000,
              retail_price: 297600,
              stock: 5,
              threshold: 20,
              status: 'active'
            }, {
              id: 'prod_w4',
              name: 'Isombe Mix 1kg (Bag/25)',
              sku: 'ISB-MIX-1KG-B25',
              category: 'Food',
              wholesale_price: 85000,
              retail_price: 87500,
              stock: 180,
              threshold: 25,
              status: 'active'
            }, {
              id: 'prod_w5',
              name: 'Urwagwa Traditional 1L (Case/12)',
              sku: 'URW-TRD-1L-C12',
              category: 'Beverages',
              wholesale_price: 92000,
              retail_price: 96000,
              stock: 3,
              threshold: 15,
              status: 'active'
            }, {
              id: 'prod_w6',
              name: 'Inyange Water 1.5L (Pack/6)',
              sku: 'INY-WTR-1.5-P6',
              category: 'Beverages',
              wholesale_price: 2800,
              retail_price: 3000,
              stock: 500,
              threshold: 100,
              status: 'active'
            }, {
              id: 'prod_w7',
              name: 'Ikivuguto 1L (Case/12)',
              sku: 'IKV-YOG-1L-C12',
              category: 'Dairy',
              wholesale_price: 22000,
              retail_price: 24000,
              stock: 85,
              threshold: 30,
              status: 'active'
            }, {
              id: 'prod_w8',
              name: 'Ubuki Honey 500g (Box/24)',
              sku: 'UBK-HNY-500-B24',
              category: 'Food',
              wholesale_price: 280000,
              retail_price: 288000,
              stock: 45,
              threshold: 15,
              status: 'active'
            }];
            if (low_stock === 'true') {
              products = products.filter(function (p) {
                return p.stock <= p.threshold;
              });
            }
            if (category) {
              products = products.filter(function (p) {
                return p.category === category;
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
              count: products.length
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
router.get('/inventory/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref20 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee20(req, res) {
    var id, product;
    return _regenerator["default"].wrap(function (_context20) {
      while (1) switch (_context20.prev = _context20.next) {
        case 0:
          try {
            id = req.params.id;
            product = {
              id: id,
              name: 'Inyange Milk 500ml (Case/24)',
              sku: 'INY-MLK-500-C24',
              description: 'Fresh pasteurized milk from Inyange Industries - wholesale case of 24 bottles',
              category: 'Dairy',
              wholesale_price: 18000,
              retail_price: 19200,
              cost: 15000,
              stock: 250,
              threshold: 50,
              unit: 'case',
              items_per_unit: 24,
              status: 'active',
              images: ['/images/products/inyange-milk-case.jpg'],
              supplier: {
                id: 'sup_001',
                name: 'Inyange Industries',
                contact: '+250788111000'
              },
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
          return _context20.stop();
      }
    }, _callee20);
  }));
  return function (_x42, _x43) {
    return _ref20.apply(this, arguments);
  };
}());
router.post('/inventory/:id/stock', authMiddleware, /*#__PURE__*/function () {
  var _ref21 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee21(req, res) {
    var id, _req$body4, quantity, adjustment_type, reason, batch_number, expiry_date;
    return _regenerator["default"].wrap(function (_context21) {
      while (1) switch (_context21.prev = _context21.next) {
        case 0:
          try {
            id = req.params.id;
            _req$body4 = req.body, quantity = _req$body4.quantity, adjustment_type = _req$body4.adjustment_type, reason = _req$body4.reason, batch_number = _req$body4.batch_number, expiry_date = _req$body4.expiry_date;
            res.json({
              id: id,
              new_stock: 300,
              adjustment: quantity,
              adjustment_type: adjustment_type,
              reason: reason,
              batch_number: batch_number,
              expiry_date: expiry_date,
              updated_at: new Date().toISOString()
            });
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
router.post('/inventory/:id/price', authMiddleware, /*#__PURE__*/function () {
  var _ref22 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee22(req, res) {
    var id, _req$body5, wholesale_price, retail_price;
    return _regenerator["default"].wrap(function (_context22) {
      while (1) switch (_context22.prev = _context22.next) {
        case 0:
          try {
            id = req.params.id;
            _req$body5 = req.body, wholesale_price = _req$body5.wholesale_price, retail_price = _req$body5.retail_price;
            res.json({
              id: id,
              wholesale_price: wholesale_price,
              retail_price: retail_price,
              margin: retail_price - wholesale_price,
              updated_at: new Date().toISOString()
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
router.post('/inventory', authMiddleware, /*#__PURE__*/function () {
  var _ref23 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee23(req, res) {
    var productData, newProduct;
    return _regenerator["default"].wrap(function (_context23) {
      while (1) switch (_context23.prev = _context23.next) {
        case 0:
          try {
            productData = req.body;
            newProduct = _objectSpread(_objectSpread({
              id: "prod_w".concat(Date.now())
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
          return _context23.stop();
      }
    }, _callee23);
  }));
  return function (_x48, _x49) {
    return _ref23.apply(this, arguments);
  };
}());

// ==================== FINANCE ROUTES ====================

router.get('/finance/summary', authMiddleware, /*#__PURE__*/function () {
  var _ref24 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee24(req, res) {
    return _regenerator["default"].wrap(function (_context24) {
      while (1) switch (_context24.prev = _context24.next) {
        case 0:
          try {
            res.json({
              total_revenue: 156000000,
              total_receivables: 28500000,
              total_payables: 12000000,
              cash_balance: 45000000,
              credit_extended: 35000000,
              credit_limit: 50000000,
              profit_this_month: 18500000,
              currency: 'RWF'
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context24.stop();
      }
    }, _callee24);
  }));
  return function (_x50, _x51) {
    return _ref24.apply(this, arguments);
  };
}());
router.get('/finance/receivables', authMiddleware, /*#__PURE__*/function () {
  var _ref25 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee25(req, res) {
    var receivables;
    return _regenerator["default"].wrap(function (_context25) {
      while (1) switch (_context25.prev = _context25.next) {
        case 0:
          try {
            receivables = [{
              retailer_id: 'ret_001',
              retailer_name: 'Kigali Shop',
              amount: 1200000,
              due_date: '2024-12-05',
              days_overdue: 0
            }, {
              retailer_id: 'ret_002',
              retailer_name: 'Musanze Mart',
              amount: 850000,
              due_date: '2024-11-25',
              days_overdue: 3
            }, {
              retailer_id: 'ret_003',
              retailer_name: 'Rubavu Store',
              amount: 2100000,
              due_date: '2024-12-10',
              days_overdue: 0
            }, {
              retailer_id: 'ret_005',
              retailer_name: 'Nyagatare Supplies',
              amount: 980000,
              due_date: '2024-11-20',
              days_overdue: 8
            }];
            res.json({
              receivables: receivables,
              total: receivables.reduce(function (sum, r) {
                return sum + r.amount;
              }, 0),
              overdue: receivables.filter(function (r) {
                return r.days_overdue > 0;
              }).reduce(function (sum, r) {
                return sum + r.amount;
              }, 0)
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context25.stop();
      }
    }, _callee25);
  }));
  return function (_x52, _x53) {
    return _ref25.apply(this, arguments);
  };
}());
router.get('/finance/transactions', authMiddleware, /*#__PURE__*/function () {
  var _ref26 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee26(req, res) {
    var _req$query4, _req$query4$limit, limit, _req$query4$offset, offset, type, transactions;
    return _regenerator["default"].wrap(function (_context26) {
      while (1) switch (_context26.prev = _context26.next) {
        case 0:
          try {
            _req$query4 = req.query, _req$query4$limit = _req$query4.limit, limit = _req$query4$limit === void 0 ? 20 : _req$query4$limit, _req$query4$offset = _req$query4.offset, offset = _req$query4$offset === void 0 ? 0 : _req$query4$offset, type = _req$query4.type;
            transactions = [{
              id: 'txn_w1',
              type: 'income',
              amount: 2850000,
              description: 'Order payment - whl_ord_002',
              retailer: 'Musanze Mart',
              status: 'completed',
              created_at: '2024-11-28T09:15:00Z'
            }, {
              id: 'txn_w2',
              type: 'expense',
              amount: 15000000,
              description: 'Supplier payment - Inyange Industries',
              status: 'completed',
              created_at: '2024-11-27T14:30:00Z'
            }, {
              id: 'txn_w3',
              type: 'income',
              amount: 4200000,
              description: 'Order payment - whl_ord_004',
              retailer: 'Huye Traders',
              status: 'completed',
              created_at: '2024-11-27T16:20:00Z'
            }, {
              id: 'txn_w4',
              type: 'credit',
              amount: 1980000,
              description: 'Credit sale - whl_ord_005',
              retailer: 'Nyagatare Supplies',
              status: 'pending',
              created_at: '2024-11-27T14:50:00Z'
            }];
            if (type) {
              transactions = transactions.filter(function (t) {
                return t.type === type;
              });
            }
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
          return _context26.stop();
      }
    }, _callee26);
  }));
  return function (_x54, _x55) {
    return _ref26.apply(this, arguments);
  };
}());

// ==================== RETAILER ORDERS ROUTES (for Wholesaler Dashboard) ====================

// Retailer orders stats
router.get('/retailer-orders/stats', authMiddleware, /*#__PURE__*/function () {
  var _ref27 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee27(req, res) {
    return _regenerator["default"].wrap(function (_context27) {
      while (1) switch (_context27.prev = _context27.next) {
        case 0:
          try {
            res.json({
              total: 892,
              pending: 45,
              processing: 38,
              shipped: 52,
              delivered: 745,
              cancelled: 12,
              total_revenue: 156000000,
              today_orders: 34,
              today_revenue: 8500000,
              currency: 'RWF'
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

// Retailer orders list
router.get('/retailer-orders', authMiddleware, /*#__PURE__*/function () {
  var _ref28 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee28(req, res) {
    var _req$query5, _req$query5$limit, limit, _req$query5$offset, offset, status, orders, total, paginatedOrders;
    return _regenerator["default"].wrap(function (_context28) {
      while (1) switch (_context28.prev = _context28.next) {
        case 0:
          try {
            _req$query5 = req.query, _req$query5$limit = _req$query5.limit, limit = _req$query5$limit === void 0 ? 20 : _req$query5$limit, _req$query5$offset = _req$query5.offset, offset = _req$query5$offset === void 0 ? 0 : _req$query5$offset, status = _req$query5.status;
            orders = [{
              id: 'ord_001',
              order_number: 'WHL-2024-001',
              retailer: {
                id: 'ret_001',
                name: 'Kigali Shop',
                location: 'Kigali'
              },
              total: 1500000,
              items_count: 45,
              status: 'pending',
              payment_status: 'paid',
              created_at: '2024-11-28T10:30:00Z'
            }, {
              id: 'ord_002',
              order_number: 'WHL-2024-002',
              retailer: {
                id: 'ret_002',
                name: 'Musanze Mart',
                location: 'Musanze'
              },
              total: 2850000,
              items_count: 82,
              status: 'processing',
              payment_status: 'partial',
              created_at: '2024-11-28T09:15:00Z'
            }, {
              id: 'ord_003',
              order_number: 'WHL-2024-003',
              retailer: {
                id: 'ret_003',
                name: 'Rubavu Store',
                location: 'Rubavu'
              },
              total: 820000,
              items_count: 28,
              status: 'shipped',
              payment_status: 'paid',
              created_at: '2024-11-28T08:45:00Z'
            }, {
              id: 'ord_004',
              order_number: 'WHL-2024-004',
              retailer: {
                id: 'ret_004',
                name: 'Huye Traders',
                location: 'Huye'
              },
              total: 4200000,
              items_count: 120,
              status: 'delivered',
              payment_status: 'paid',
              created_at: '2024-11-27T16:20:00Z'
            }, {
              id: 'ord_005',
              order_number: 'WHL-2024-005',
              retailer: {
                id: 'ret_005',
                name: 'Nyagatare Supplies',
                location: 'Nyagatare'
              },
              total: 1980000,
              items_count: 56,
              status: 'pending',
              payment_status: 'credit',
              created_at: '2024-11-27T14:50:00Z'
            }, {
              id: 'ord_006',
              order_number: 'WHL-2024-006',
              retailer: {
                id: 'ret_006',
                name: 'Muhanga Store',
                location: 'Muhanga'
              },
              total: 2350000,
              items_count: 68,
              status: 'processing',
              payment_status: 'paid',
              created_at: '2024-11-27T11:20:00Z'
            }, {
              id: 'ord_007',
              order_number: 'WHL-2024-007',
              retailer: {
                id: 'ret_007',
                name: 'Rwamagana Market',
                location: 'Rwamagana'
              },
              total: 890000,
              items_count: 24,
              status: 'shipped',
              payment_status: 'paid',
              created_at: '2024-11-27T09:45:00Z'
            }, {
              id: 'ord_008',
              order_number: 'WHL-2024-008',
              retailer: {
                id: 'ret_008',
                name: 'Karongi Traders',
                location: 'Karongi'
              },
              total: 3200000,
              items_count: 92,
              status: 'pending',
              payment_status: 'credit',
              created_at: '2024-11-26T16:30:00Z'
            }];
            if (status) {
              orders = orders.filter(function (o) {
                return o.status === status;
              });
            }
            total = orders.length;
            paginatedOrders = orders.slice(Number(offset), Number(offset) + Number(limit));
            res.json({
              orders: paginatedOrders,
              count: paginatedOrders.length,
              total: total,
              offset: Number(offset),
              limit: Number(limit)
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

// Single retailer order
router.get('/retailer-orders/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref29 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee29(req, res) {
    var id, order;
    return _regenerator["default"].wrap(function (_context29) {
      while (1) switch (_context29.prev = _context29.next) {
        case 0:
          try {
            id = req.params.id;
            order = {
              id: id,
              order_number: 'WHL-2024-001',
              retailer: {
                id: 'ret_001',
                name: 'Kigali Shop',
                email: 'kigali@shop.rw',
                phone: '+250788123456',
                location: 'Kigali'
              },
              items: [{
                id: 'item_1',
                product_id: 'prod_w1',
                name: 'Inyange Milk 500ml (Case/24)',
                quantity: 20,
                unit_price: 18000,
                total: 360000
              }, {
                id: 'item_2',
                product_id: 'prod_w2',
                name: 'Bralirwa Primus 500ml (Crate/24)',
                quantity: 30,
                unit_price: 28000,
                total: 840000
              }, {
                id: 'item_3',
                product_id: 'prod_w4',
                name: 'Isombe Mix 1kg (Bag/25)',
                quantity: 10,
                unit_price: 85000,
                total: 850000
              }],
              subtotal: 2050000,
              discount: 50000,
              tax: 0,
              total: 2000000,
              status: 'processing',
              payment_status: 'partial',
              payment_method: 'credit',
              amount_paid: 1000000,
              amount_due: 1000000,
              shipping_address: {
                line1: 'KG 123 St',
                city: 'Kigali',
                district: 'Gasabo',
                country: 'Rwanda'
              },
              notes: 'Urgent delivery requested',
              created_at: '2024-11-28T09:15:00Z',
              updated_at: '2024-11-28T10:00:00Z'
            };
            res.json(order);
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

// Update retailer order status
router.patch('/retailer-orders/:id/status', authMiddleware, /*#__PURE__*/function () {
  var _ref30 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee30(req, res) {
    var id, _req$body6, status, notes;
    return _regenerator["default"].wrap(function (_context30) {
      while (1) switch (_context30.prev = _context30.next) {
        case 0:
          try {
            id = req.params.id;
            _req$body6 = req.body, status = _req$body6.status, notes = _req$body6.notes;
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
          return _context30.stop();
      }
    }, _callee30);
  }));
  return function (_x62, _x63) {
    return _ref30.apply(this, arguments);
  };
}());

// ==================== CREDIT REQUESTS ROUTES ====================

// Get credit requests
router.get('/credit-requests', authMiddleware, /*#__PURE__*/function () {
  var _ref31 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee31(req, res) {
    var _req$query6, _req$query6$limit, limit, _req$query6$offset, offset, status, requests, total, paginatedRequests;
    return _regenerator["default"].wrap(function (_context31) {
      while (1) switch (_context31.prev = _context31.next) {
        case 0:
          try {
            _req$query6 = req.query, _req$query6$limit = _req$query6.limit, limit = _req$query6$limit === void 0 ? 20 : _req$query6$limit, _req$query6$offset = _req$query6.offset, offset = _req$query6$offset === void 0 ? 0 : _req$query6$offset, status = _req$query6.status;
            requests = [{
              id: 'cr_001',
              retailer: {
                id: 'ret_009',
                name: 'New Shop Kigali',
                location: 'Kigali'
              },
              requested_amount: 100000,
              approved_amount: null,
              status: 'pending',
              reason: 'Expanding inventory for holiday season',
              created_at: '2024-11-28T10:00:00Z'
            }, {
              id: 'cr_002',
              retailer: {
                id: 'ret_010',
                name: 'Corner Store Remera',
                location: 'Remera'
              },
              requested_amount: 50000,
              approved_amount: null,
              status: 'pending',
              reason: 'Need credit for bulk purchase',
              created_at: '2024-11-28T08:30:00Z'
            }, {
              id: 'cr_003',
              retailer: {
                id: 'ret_011',
                name: 'Gasabo Mini-mart',
                location: 'Gasabo'
              },
              requested_amount: 200000,
              approved_amount: 150000,
              status: 'approved',
              reason: 'New store setup',
              created_at: '2024-11-27T14:00:00Z'
            }, {
              id: 'cr_004',
              retailer: {
                id: 'ret_012',
                name: 'Nyamirambo Shop',
                location: 'Nyamirambo'
              },
              requested_amount: 75000,
              approved_amount: null,
              status: 'rejected',
              reason: 'Expansion',
              rejection_reason: 'Insufficient payment history',
              created_at: '2024-11-26T11:00:00Z'
            }, {
              id: 'cr_005',
              retailer: {
                id: 'ret_013',
                name: 'Kimihurura Market',
                location: 'Kimihurura'
              },
              requested_amount: 300000,
              approved_amount: null,
              status: 'pending',
              reason: 'Seasonal stock increase',
              created_at: '2024-11-25T16:30:00Z'
            }];
            if (status) {
              requests = requests.filter(function (r) {
                return r.status === status;
              });
            }
            total = requests.length;
            paginatedRequests = requests.slice(Number(offset), Number(offset) + Number(limit));
            res.json({
              requests: paginatedRequests,
              count: paginatedRequests.length,
              total: total,
              pending_count: requests.filter(function (r) {
                return r.status === 'pending';
              }).length,
              offset: Number(offset),
              limit: Number(limit)
            });
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

// Get single credit request
router.get('/credit-requests/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref32 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee32(req, res) {
    var id, request;
    return _regenerator["default"].wrap(function (_context32) {
      while (1) switch (_context32.prev = _context32.next) {
        case 0:
          try {
            id = req.params.id;
            request = {
              id: id,
              retailer: {
                id: 'ret_009',
                name: 'New Shop Kigali',
                email: 'newshop@email.rw',
                phone: '+250788111222',
                location: 'Kigali',
                current_credit_limit: 0,
                total_purchases: 2500000,
                payment_history: 'good'
              },
              requested_amount: 100000,
              approved_amount: null,
              status: 'pending',
              reason: 'Expanding inventory for holiday season',
              documents: [],
              created_at: '2024-11-28T10:00:00Z',
              updated_at: '2024-11-28T10:00:00Z'
            };
            res.json(request);
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

// Approve credit request
router.post('/credit-requests/:id/approve', authMiddleware, /*#__PURE__*/function () {
  var _ref33 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee33(req, res) {
    var id, _req$body7, approved_amount, notes;
    return _regenerator["default"].wrap(function (_context33) {
      while (1) switch (_context33.prev = _context33.next) {
        case 0:
          try {
            id = req.params.id;
            _req$body7 = req.body, approved_amount = _req$body7.approved_amount, notes = _req$body7.notes;
            res.json({
              id: id,
              status: 'approved',
              approved_amount: approved_amount,
              notes: notes,
              approved_by: req.user.id,
              approved_at: new Date().toISOString()
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

// Reject credit request
router.post('/credit-requests/:id/reject', authMiddleware, /*#__PURE__*/function () {
  var _ref34 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee34(req, res) {
    var id, reason;
    return _regenerator["default"].wrap(function (_context34) {
      while (1) switch (_context34.prev = _context34.next) {
        case 0:
          try {
            id = req.params.id;
            reason = req.body.reason;
            res.json({
              id: id,
              status: 'rejected',
              rejection_reason: reason,
              rejected_by: req.user.id,
              rejected_at: new Date().toISOString()
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

// ==================== REPORTS ROUTES ====================

router.get('/reports/sales', authMiddleware, /*#__PURE__*/function () {
  var _ref35 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee35(req, res) {
    var _req$query7, start_date, end_date, _req$query7$group_by, group_by;
    return _regenerator["default"].wrap(function (_context35) {
      while (1) switch (_context35.prev = _context35.next) {
        case 0:
          try {
            _req$query7 = req.query, start_date = _req$query7.start_date, end_date = _req$query7.end_date, _req$query7$group_by = _req$query7.group_by, group_by = _req$query7$group_by === void 0 ? 'day' : _req$query7$group_by;
            res.json({
              period: {
                start: start_date || '2024-11-01',
                end: end_date || '2024-11-28'
              },
              total_sales: 156000000,
              total_orders: 892,
              average_order_value: 174888,
              top_products: [{
                name: 'Inyange Milk 500ml (Case/24)',
                quantity: 1250,
                revenue: 22500000
              }, {
                name: 'Bralirwa Primus 500ml (Crate/24)',
                quantity: 980,
                revenue: 27440000
              }, {
                name: 'Isombe Mix 1kg (Bag/25)',
                quantity: 450,
                revenue: 38250000
              }],
              top_retailers: [{
                name: 'Kigali Shop',
                orders: 156,
                revenue: 24500000
              }, {
                name: 'Musanze Mart',
                orders: 142,
                revenue: 22800000
              }, {
                name: 'Rubavu Store',
                orders: 128,
                revenue: 19200000
              }],
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
router.get('/reports/inventory', authMiddleware, /*#__PURE__*/function () {
  var _ref36 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee36(req, res) {
    return _regenerator["default"].wrap(function (_context36) {
      while (1) switch (_context36.prev = _context36.next) {
        case 0:
          try {
            res.json({
              total_products: 248,
              total_value: 125000000,
              low_stock_count: 12,
              out_of_stock_count: 3,
              categories: [{
                name: 'Dairy',
                products: 45,
                value: 28000000
              }, {
                name: 'Beverages',
                products: 78,
                value: 45000000
              }, {
                name: 'Food',
                products: 65,
                value: 32000000
              }, {
                name: 'Cooking',
                products: 60,
                value: 20000000
              }],
              currency: 'RWF'
            });
          } catch (error) {
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context36.stop();
      }
    }, _callee36);
  }));
  return function (_x74, _x75) {
    return _ref36.apply(this, arguments);
  };
}());

// ==================== ESCROW ENDPOINTS ====================

/**
 * GET /wholesaler/escrow/pending-confirmations
 * Get all escrow transactions awaiting wholesaler confirmation
 */
router.get('/escrow/pending-confirmations', authMiddleware, /*#__PURE__*/function () {
  var _ref37 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee37(req, res) {
    var user, wholesaler_id, escrowService, escrows, _t4;
    return _regenerator["default"].wrap(function (_context37) {
      while (1) switch (_context37.prev = _context37.next) {
        case 0:
          _context37.prev = 0;
          user = req.user;
          wholesaler_id = user.id;
          escrowService = req.scope.resolve('escrowService');
          _context37.next = 1;
          return escrowService.getWholesalerPendingEscrows(wholesaler_id);
        case 1:
          escrows = _context37.sent;
          res.json({
            count: escrows.length,
            pending_confirmations: escrows
          });
          _context37.next = 3;
          break;
        case 2:
          _context37.prev = 2;
          _t4 = _context37["catch"](0);
          console.error('Error fetching pending confirmations:', _t4);
          res.status(500).json({
            error: 'Failed to fetch pending confirmations'
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

/**
 * POST /wholesaler/escrow/confirm-delivery/:id
 * Confirm delivery and request escrow release
 */
router.post('/escrow/confirm-delivery/:id', authMiddleware, /*#__PURE__*/function () {
  var _ref38 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee38(req, res) {
    var user, escrow_id, notes, escrowService, escrow, released, _t5;
    return _regenerator["default"].wrap(function (_context38) {
      while (1) switch (_context38.prev = _context38.next) {
        case 0:
          _context38.prev = 0;
          user = req.user;
          escrow_id = req.params.id;
          notes = req.body.notes;
          escrowService = req.scope.resolve('escrowService'); // Verify escrow belongs to this wholesaler
          _context38.next = 1;
          return escrowService.getEscrowById(escrow_id);
        case 1:
          escrow = _context38.sent;
          if (!(!escrow || escrow.wholesaler_id !== user.id)) {
            _context38.next = 2;
            break;
          }
          return _context38.abrupt("return", res.status(404).json({
            error: 'Escrow transaction not found'
          }));
        case 2:
          if (!(escrow.status !== 'held')) {
            _context38.next = 3;
            break;
          }
          return _context38.abrupt("return", res.status(400).json({
            error: 'Escrow must be in "held" status to confirm delivery'
          }));
        case 3:
          _context38.next = 4;
          return escrowService.releaseEscrow({
            escrow_id: escrow_id,
            confirmed_by: user.id,
            notes: notes || 'Delivery confirmed by wholesaler'
          });
        case 4:
          released = _context38.sent;
          res.json({
            message: 'Delivery confirmed and escrow released',
            transaction: released
          });
          _context38.next = 6;
          break;
        case 5:
          _context38.prev = 5;
          _t5 = _context38["catch"](0);
          console.error('Error confirming delivery:', _t5);
          res.status(500).json({
            error: _t5.message || 'Failed to confirm delivery'
          });
        case 6:
        case "end":
          return _context38.stop();
      }
    }, _callee38, null, [[0, 5]]);
  }));
  return function (_x78, _x79) {
    return _ref38.apply(this, arguments);
  };
}());

/**
 * GET /wholesaler/escrow/summary
 * Get wholesaler's escrow summary (pending releases, total received, etc.)
 */
router.get('/escrow/summary', authMiddleware, /*#__PURE__*/function () {
  var _ref39 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee39(req, res) {
    var user, wholesaler_id, escrowService, summary, _t6;
    return _regenerator["default"].wrap(function (_context39) {
      while (1) switch (_context39.prev = _context39.next) {
        case 0:
          _context39.prev = 0;
          user = req.user;
          wholesaler_id = user.id;
          escrowService = req.scope.resolve('escrowService');
          _context39.next = 1;
          return escrowService.getWholesalerSummary(wholesaler_id);
        case 1:
          summary = _context39.sent;
          res.json(summary);
          _context39.next = 3;
          break;
        case 2:
          _context39.prev = 2;
          _t6 = _context39["catch"](0);
          console.error('Error fetching escrow summary:', _t6);
          res.status(500).json({
            error: 'Failed to fetch escrow summary'
          });
        case 3:
        case "end":
          return _context39.stop();
      }
    }, _callee39, null, [[0, 2]]);
  }));
  return function (_x80, _x81) {
    return _ref39.apply(this, arguments);
  };
}());

/**
 * GET /wholesaler/escrow/transactions
 * Get all escrow transactions for wholesaler
 */
router.get('/escrow/transactions', authMiddleware, /*#__PURE__*/function () {
  var _ref40 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee40(req, res) {
    var user, wholesaler_id, status, escrowService, transactions, _t7;
    return _regenerator["default"].wrap(function (_context40) {
      while (1) switch (_context40.prev = _context40.next) {
        case 0:
          _context40.prev = 0;
          user = req.user;
          wholesaler_id = user.id;
          status = req.query.status;
          escrowService = req.scope.resolve('escrowService');
          _context40.next = 1;
          return escrowService.getWholesalerEscrows(wholesaler_id, status);
        case 1:
          transactions = _context40.sent;
          res.json({
            count: transactions.length,
            transactions: transactions
          });
          _context40.next = 3;
          break;
        case 2:
          _context40.prev = 2;
          _t7 = _context40["catch"](0);
          console.error('Error fetching escrow transactions:', _t7);
          res.status(500).json({
            error: 'Failed to fetch escrow transactions'
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
var _default = exports["default"] = router;