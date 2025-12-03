"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = require("express");
var _medusa = require("@medusajs/medusa");
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var router = (0, _express.Router)();

// JWT secret (in production, use environment variable)
var JWT_SECRET = process.env.JWT_SECRET || 'bigcompany_customer_secret_2024';

// Authentication middleware for customer endpoints
var authenticateCustomer = function authenticateCustomer(req, res, next) {
  try {
    var authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided'
      });
    }
    var token = authHeader.substring(7);
    try {
      var decoded = _jsonwebtoken["default"].verify(token, JWT_SECRET);
      req.customer = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      error: error.message
    });
  }
};

// Mock data for retailers (in production, this would come from database)
var mockRetailers = [{
  id: 'ret_001',
  name: 'Kigali Central Shop',
  shop_name: 'Kigali Central Shop',
  coordinates: {
    lat: -1.9441,
    lng: 30.0619
  },
  location: 'KN 5 Rd, Kigali',
  address: 'KN 5 Rd, Kigali',
  distance: 0.5,
  rating: 4.8,
  is_open: true,
  categories: ['beverages', 'food', 'household'],
  phone: '+250788000001',
  opening_hours: '07:00 - 22:00',
  delivery_time: '20-30 min'
}, {
  id: 'ret_002',
  name: 'Nyarugenge Mini-mart',
  shop_name: 'Nyarugenge Mini-mart',
  coordinates: {
    lat: -1.9503,
    lng: 30.0588
  },
  location: 'KN 3 Ave, Nyarugenge',
  address: 'KN 3 Ave, Nyarugenge',
  distance: 1.2,
  rating: 4.5,
  is_open: true,
  categories: ['beverages', 'food', 'personal_care'],
  phone: '+250788000002',
  opening_hours: '06:00 - 21:00',
  delivery_time: '30-45 min'
}, {
  id: 'ret_003',
  name: 'Gasabo Store',
  shop_name: 'Gasabo Store',
  coordinates: {
    lat: -1.9256,
    lng: 30.1025
  },
  location: 'KG 7 Ave, Gasabo',
  address: 'KG 7 Ave, Gasabo',
  distance: 2.5,
  rating: 4.7,
  is_open: true,
  categories: ['food', 'household', 'electronics'],
  phone: '+250788000003',
  opening_hours: '08:00 - 20:00',
  delivery_time: '25-40 min'
}, {
  id: 'ret_004',
  name: 'Kimironko Market Shop',
  shop_name: 'Kimironko Market Shop',
  coordinates: {
    lat: -1.9356,
    lng: 30.1145
  },
  location: 'KG 15 Rd, Kimironko',
  address: 'KG 15 Rd, Kimironko',
  distance: 3.0,
  rating: 4.3,
  is_open: false,
  categories: ['beverages', 'food'],
  phone: '+250788000004',
  opening_hours: '07:00 - 19:00',
  delivery_time: '15-25 min'
}, {
  id: 'ret_005',
  name: 'Remera Corner Store',
  shop_name: 'Remera Corner Store',
  coordinates: {
    lat: -1.9578,
    lng: 30.1089
  },
  location: 'KG 11 Ave, Remera',
  address: 'KG 11 Ave, Remera',
  distance: 1.8,
  rating: 4.6,
  is_open: true,
  categories: ['beverages', 'food', 'personal_care', 'household'],
  phone: '+250788000005',
  opening_hours: '06:30 - 22:00',
  delivery_time: '20-35 min'
}];

// Mock categories
var mockCategories = [{
  id: 'cat_001',
  name: 'Beverages',
  slug: 'beverages',
  icon: 'coffee',
  product_count: 45
}, {
  id: 'cat_002',
  name: 'Food & Snacks',
  slug: 'food',
  icon: 'shopping-bag',
  product_count: 120
}, {
  id: 'cat_003',
  name: 'Household',
  slug: 'household',
  icon: 'home',
  product_count: 65
}, {
  id: 'cat_004',
  name: 'Personal Care',
  slug: 'personal_care',
  icon: 'heart',
  product_count: 38
}, {
  id: 'cat_005',
  name: 'Electronics',
  slug: 'electronics',
  icon: 'smartphone',
  product_count: 22
}, {
  id: 'cat_006',
  name: 'Baby Products',
  slug: 'baby',
  icon: 'baby',
  product_count: 18
}, {
  id: 'cat_007',
  name: 'Cleaning',
  slug: 'cleaning',
  icon: 'droplet',
  product_count: 30
}, {
  id: 'cat_008',
  name: 'Gas & Fuel',
  slug: 'gas',
  icon: 'flame',
  product_count: 5
}];

// Mock products
var mockProducts = [{
  id: 'prod_001',
  name: 'Inyange Milk 1L',
  category: 'beverages',
  price: 900,
  image: '/images/milk.jpg',
  retailer_id: 'ret_001',
  stock: 50,
  unit: 'Liter'
}, {
  id: 'prod_002',
  name: 'Bralirwa Beer 500ml',
  category: 'beverages',
  price: 900,
  image: '/images/beer.jpg',
  retailer_id: 'ret_001',
  stock: 100,
  unit: 'Bottle'
}, {
  id: 'prod_003',
  name: 'Bread (Large)',
  category: 'food',
  price: 500,
  image: '/images/bread.jpg',
  retailer_id: 'ret_001',
  stock: 30,
  unit: 'Loaf'
}, {
  id: 'prod_004',
  name: 'Sugar 1kg',
  category: 'food',
  price: 1000,
  image: '/images/sugar.jpg',
  retailer_id: 'ret_002',
  stock: 45,
  unit: 'Kg'
}, {
  id: 'prod_005',
  name: 'Cooking Oil 1L',
  category: 'food',
  price: 2000,
  image: '/images/oil.jpg',
  retailer_id: 'ret_002',
  stock: 25,
  unit: 'Liter'
}, {
  id: 'prod_006',
  name: 'Rice 5kg',
  category: 'food',
  price: 5500,
  image: '/images/rice.jpg',
  retailer_id: 'ret_003',
  stock: 40,
  unit: 'Kg'
}, {
  id: 'prod_007',
  name: 'Soap Bar',
  category: 'personal_care',
  price: 300,
  image: '/images/soap.jpg',
  retailer_id: 'ret_003',
  stock: 80,
  unit: 'Piece'
}, {
  id: 'prod_008',
  name: 'Toothpaste',
  category: 'personal_care',
  price: 1200,
  image: '/images/toothpaste.jpg',
  retailer_id: 'ret_004',
  stock: 35,
  unit: 'Tube'
}, {
  id: 'prod_009',
  name: 'Detergent 1kg',
  category: 'cleaning',
  price: 1500,
  image: '/images/detergent.jpg',
  retailer_id: 'ret_005',
  stock: 60,
  unit: 'Kg'
}, {
  id: 'prod_010',
  name: 'Bottled Water 500ml',
  category: 'beverages',
  price: 300,
  image: '/images/water.jpg',
  retailer_id: 'ret_001',
  stock: 200,
  unit: 'Bottle'
}, {
  id: 'prod_011',
  name: 'Eggs (Tray of 30)',
  category: 'food',
  price: 4500,
  image: '/images/eggs.jpg',
  retailer_id: 'ret_002',
  stock: 20,
  unit: 'Tray'
}, {
  id: 'prod_012',
  name: 'Tomatoes 1kg',
  category: 'food',
  price: 800,
  image: '/images/tomatoes.jpg',
  retailer_id: 'ret_003',
  stock: 50,
  unit: 'Kg'
}, {
  id: 'prod_013',
  name: 'Onions 1kg',
  category: 'food',
  price: 600,
  image: '/images/onions.jpg',
  retailer_id: 'ret_004',
  stock: 55,
  unit: 'Kg'
}, {
  id: 'prod_014',
  name: 'Soda (Fanta 500ml)',
  category: 'beverages',
  price: 500,
  image: '/images/fanta.jpg',
  retailer_id: 'ret_005',
  stock: 120,
  unit: 'Bottle'
}, {
  id: 'prod_015',
  name: 'Tissue Paper (Pack)',
  category: 'household',
  price: 800,
  image: '/images/tissue.jpg',
  retailer_id: 'ret_001',
  stock: 40,
  unit: 'Pack'
}];

// Helper function to get product image URL
var getProductImageUrl = function getProductImageUrl(productName, productId) {
  // Use product-specific placeholder images from Unsplash
  var imageMap = {
    'milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    'beer': 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop',
    'bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    'sugar': 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400&h=400&fit=crop',
    'oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop',
    'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    'soap': 'https://images.unsplash.com/photo-1622137500141-e0c0ecbd7ec8?w=400&h=400&fit=crop',
    'toothpaste': 'https://images.unsplash.com/photo-1622654862197-c7f5b9e30b8f?w=400&h=400&fit=crop',
    'detergent': 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400&h=400&fit=crop',
    'water': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop',
    'eggs': 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',
    'tomatoes': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=400&fit=crop',
    'onions': 'https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?w=400&h=400&fit=crop',
    'fanta': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop',
    'tissue': 'https://images.unsplash.com/photo-1584556326561-c8746083993b?w=400&h=400&fit=crop'
  };

  // Try to find a matching key in the product name
  var nameKey = Object.keys(imageMap).find(function (key) {
    return productName.toLowerCase().includes(key);
  });
  return nameKey ? imageMap[nameKey] : "https://via.placeholder.com/400x400/52c41a/ffffff?text=".concat(encodeURIComponent(productName.substring(0, 20)));
};

// Mock customer orders
var mockOrders = [{
  id: 'ord_001',
  customer_id: 'cus_demo_consumer_001',
  retailer_id: 'ret_001',
  retailer_name: 'Kigali Central Shop',
  status: 'delivered',
  total: 4600,
  created_at: '2024-11-25T10:30:00Z',
  delivered_at: '2024-11-25T14:20:00Z',
  items: [{
    product_id: 'prod_001',
    name: 'Inyange Milk 1L',
    quantity: 2,
    price: 900
  }, {
    product_id: 'prod_003',
    name: 'Bread (Large)',
    quantity: 1,
    price: 500
  }, {
    product_id: 'prod_010',
    name: 'Bottled Water 500ml',
    quantity: 10,
    price: 300
  }],
  payment_method: 'NFC Card',
  delivery_address: 'KN 10 Rd, Kigali'
}, {
  id: 'ord_002',
  customer_id: 'cus_demo_consumer_001',
  retailer_id: 'ret_002',
  retailer_name: 'Nyarugenge Mini-mart',
  status: 'pending',
  total: 7500,
  created_at: '2024-11-28T08:15:00Z',
  items: [{
    product_id: 'prod_004',
    name: 'Sugar 1kg',
    quantity: 2,
    price: 1000
  }, {
    product_id: 'prod_005',
    name: 'Cooking Oil 1L',
    quantity: 1,
    price: 2000
  }, {
    product_id: 'prod_011',
    name: 'Eggs (Tray of 30)',
    quantity: 1,
    price: 4500
  }],
  payment_method: 'Wallet',
  delivery_address: 'KN 10 Rd, Kigali'
}, {
  id: 'ord_003',
  customer_id: 'cus_demo_consumer_001',
  retailer_id: 'ret_005',
  retailer_name: 'Remera Corner Store',
  status: 'in_transit',
  total: 2800,
  created_at: '2024-11-29T16:45:00Z',
  items: [{
    product_id: 'prod_014',
    name: 'Soda (Fanta 500ml)',
    quantity: 4,
    price: 500
  }, {
    product_id: 'prod_015',
    name: 'Tissue Paper (Pack)',
    quantity: 1,
    price: 800
  }],
  payment_method: 'NFC Card',
  delivery_address: 'KN 10 Rd, Kigali'
}];

/**
 * Get list of retailers
 * GET /store/retailers
 */
router.get('/retailers', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(req, res) {
    var _req$query, lat, lng, category, search, _req$query$limit, limit, retailers, searchTerm, userLat, userLng;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          try {
            _req$query = req.query, lat = _req$query.lat, lng = _req$query.lng, category = _req$query.category, search = _req$query.search, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 20 : _req$query$limit;
            retailers = [].concat(mockRetailers); // Filter by category if provided
            if (category) {
              retailers = retailers.filter(function (r) {
                return r.categories.includes(String(category).toLowerCase());
              });
            }

            // Filter by search term
            if (search) {
              searchTerm = String(search).toLowerCase();
              retailers = retailers.filter(function (r) {
                return r.name.toLowerCase().includes(searchTerm) || r.address.toLowerCase().includes(searchTerm);
              });
            }

            // Calculate distance if coordinates provided
            if (lat && lng) {
              userLat = parseFloat(String(lat));
              userLng = parseFloat(String(lng));
              retailers = retailers.map(function (r) {
                return _objectSpread(_objectSpread({}, r), {}, {
                  distance: calculateDistance(userLat, userLng, r.coordinates.lat, r.coordinates.lng)
                });
              });

              // Sort by distance
              retailers.sort(function (a, b) {
                return a.distance - b.distance;
              });
            }

            // Apply limit
            retailers = retailers.slice(0, parseInt(String(limit)));
            res.json({
              retailers: retailers,
              count: retailers.length,
              total: mockRetailers.length
            });
          } catch (error) {
            console.error('Get retailers error:', error);
            res.status(500).json({
              error: error.message
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
}()));

/**
 * Get single retailer by ID
 * GET /store/retailers/:id
 */
router.get('/retailers/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref2 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2(req, res) {
    var id, retailer, products, _t;
    return _regenerator["default"].wrap(function (_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          id = req.params.id;
          retailer = mockRetailers.find(function (r) {
            return r.id === id;
          });
          if (retailer) {
            _context2.next = 1;
            break;
          }
          return _context2.abrupt("return", res.status(404).json({
            error: 'Retailer not found'
          }));
        case 1:
          // Get products for this retailer
          products = mockProducts.filter(function (p) {
            return p.retailer_id === id;
          });
          res.json(_objectSpread(_objectSpread({}, retailer), {}, {
            products: products
          }));
          _context2.next = 3;
          break;
        case 2:
          _context2.prev = 2;
          _t = _context2["catch"](0);
          console.error('Get retailer error:', _t);
          res.status(500).json({
            error: _t.message
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
}()));

/**
 * Get product categories
 * GET /store/categories
 */
router.get('/categories', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3(req, res) {
    return _regenerator["default"].wrap(function (_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          try {
            res.json({
              categories: mockCategories,
              count: mockCategories.length
            });
          } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
              error: error.message
            });
          }
        case 1:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return function (_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}()));

/**
 * Get products
 * GET /store/products
 */
router.get('/products', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref4 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(req, res) {
    var _req$query2, retailerId, category, search, _req$query2$limit, limit, _req$query2$offset, offset, products, searchTerm, total, start, end, transformedProducts;
    return _regenerator["default"].wrap(function (_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          try {
            _req$query2 = req.query, retailerId = _req$query2.retailerId, category = _req$query2.category, search = _req$query2.search, _req$query2$limit = _req$query2.limit, limit = _req$query2$limit === void 0 ? 50 : _req$query2$limit, _req$query2$offset = _req$query2.offset, offset = _req$query2$offset === void 0 ? 0 : _req$query2$offset;
            products = [].concat(mockProducts); // Filter by retailer
            if (retailerId) {
              products = products.filter(function (p) {
                return p.retailer_id === String(retailerId);
              });
            }

            // Filter by category
            if (category) {
              products = products.filter(function (p) {
                return p.category === String(category).toLowerCase();
              });
            }

            // Filter by search term
            if (search) {
              searchTerm = String(search).toLowerCase();
              products = products.filter(function (p) {
                return p.name.toLowerCase().includes(searchTerm);
              });
            }
            total = products.length; // Apply pagination
            start = parseInt(String(offset));
            end = start + parseInt(String(limit));
            products = products.slice(start, end);

            // Transform products to match frontend expectations
            transformedProducts = products.map(function (p) {
              return {
                id: p.id,
                title: p.name,
                description: p.name,
                thumbnail: getProductImageUrl(p.name, p.id),
                variants: [{
                  id: "".concat(p.id, "_v1"),
                  title: 'Default',
                  prices: [{
                    amount: p.price,
                    currency_code: 'RWF'
                  }],
                  inventory_quantity: p.stock
                }],
                categories: [{
                  id: "cat_".concat(p.category),
                  name: p.category.charAt(0).toUpperCase() + p.category.slice(1)
                }]
              };
            });
            res.json({
              products: transformedProducts,
              count: transformedProducts.length,
              total: total,
              offset: start,
              limit: parseInt(String(limit))
            });
          } catch (error) {
            console.error('Get products error:', error);
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
  return function (_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}()));

/**
 * Get single product by ID
 * GET /store/products/:id
 */
router.get('/products/:id', (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref5 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(req, res) {
    var id, product, retailer, transformedProduct, _t2;
    return _regenerator["default"].wrap(function (_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          id = req.params.id;
          product = mockProducts.find(function (p) {
            return p.id === id;
          });
          if (product) {
            _context5.next = 1;
            break;
          }
          return _context5.abrupt("return", res.status(404).json({
            error: 'Product not found'
          }));
        case 1:
          // Get retailer info
          retailer = mockRetailers.find(function (r) {
            return r.id === product.retailer_id;
          }); // Transform to match frontend expectations
          transformedProduct = {
            id: product.id,
            title: product.name,
            description: product.name,
            thumbnail: getProductImageUrl(product.name, product.id),
            variants: [{
              id: "".concat(product.id, "_v1"),
              title: 'Default',
              prices: [{
                amount: product.price,
                currency_code: 'RWF'
              }],
              inventory_quantity: product.stock
            }],
            categories: [{
              id: "cat_".concat(product.category),
              name: product.category.charAt(0).toUpperCase() + product.category.slice(1)
            }],
            retailer: retailer ? {
              id: retailer.id,
              name: retailer.name,
              address: retailer.address,
              is_open: retailer.is_open
            } : null
          };
          res.json(transformedProduct);
          _context5.next = 3;
          break;
        case 2:
          _context5.prev = 2;
          _t2 = _context5["catch"](0);
          console.error('Get product error:', _t2);
          res.status(500).json({
            error: _t2.message
          });
        case 3:
        case "end":
          return _context5.stop();
      }
    }, _callee5, null, [[0, 2]]);
  }));
  return function (_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}()));

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
  var R = 6371; // Earth's radius in km
  var dLat = toRad(lat2 - lat1);
  var dLng = toRad(lng2 - lng1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Get current customer info
 * GET /store/customers/me
 */
router.get('/customers/me', authenticateCustomer, (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref6 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(req, res) {
    var customer;
    return _regenerator["default"].wrap(function (_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          try {
            customer = req.customer;
            res.json({
              id: customer.customer_id || customer.id,
              phone: customer.phone,
              email: customer.email,
              first_name: customer.first_name || 'Demo',
              last_name: customer.last_name || 'Customer',
              wallet_balance: 50000 // Mock wallet balance
            });
          } catch (error) {
            console.error('Get customer error:', error);
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
  return function (_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}()));

/**
 * Get customer orders
 * GET /store/customers/me/orders
 */
router.get('/customers/me/orders', authenticateCustomer, (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref7 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(req, res) {
    var customer, customerId, _req$query3, status, _req$query3$limit, limit, _req$query3$offset, offset, orders, total, start, end, transformedOrders;
    return _regenerator["default"].wrap(function (_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          try {
            customer = req.customer;
            customerId = customer.customer_id || customer.id;
            _req$query3 = req.query, status = _req$query3.status, _req$query3$limit = _req$query3.limit, limit = _req$query3$limit === void 0 ? 20 : _req$query3$limit, _req$query3$offset = _req$query3.offset, offset = _req$query3$offset === void 0 ? 0 : _req$query3$offset;
            orders = mockOrders.filter(function (o) {
              return o.customer_id === customerId;
            }); // Filter by status if provided
            if (status) {
              orders = orders.filter(function (o) {
                return o.status === String(status).toLowerCase();
              });
            }
            total = orders.length; // Apply pagination
            start = parseInt(String(offset));
            end = start + parseInt(String(limit));
            orders = orders.slice(start, end);

            // Transform orders to match frontend expectations
            transformedOrders = orders.map(function (order) {
              // Find retailer details
              var retailer = mockRetailers.find(function (r) {
                return r.id === order.retailer_id;
              });

              // Transform items to match frontend interface
              var transformedItems = order.items.map(function (item) {
                return {
                  id: "".concat(order.id, "_").concat(item.product_id),
                  product_id: item.product_id,
                  product_name: item.name,
                  // Rename 'name' to 'product_name'
                  quantity: item.quantity,
                  unit_price: item.price,
                  // Rename 'price' to 'unit_price'
                  total: item.price * item.quantity // Calculate total
                };
              });

              // Calculate subtotal from items
              var subtotal = transformedItems.reduce(function (sum, item) {
                return sum + item.total;
              }, 0);
              var delivery_fee = 500; // Mock delivery fee

              return {
                id: order.id,
                order_number: "ORD-".concat(order.id.toUpperCase()),
                // Generate order_number
                status: order.status,
                retailer: {
                  id: order.retailer_id,
                  name: (retailer === null || retailer === void 0 ? void 0 : retailer.name) || order.retailer_name || 'Unknown Store',
                  location: (retailer === null || retailer === void 0 ? void 0 : retailer.address) || 'Kigali, Rwanda',
                  phone: (retailer === null || retailer === void 0 ? void 0 : retailer.phone) || '+250 788 000 000'
                },
                items: transformedItems,
                subtotal: subtotal,
                delivery_fee: delivery_fee,
                total: order.total,
                delivery_address: order.delivery_address,
                notes: order.payment_method ? "Payment: ".concat(order.payment_method) : undefined,
                created_at: order.created_at,
                updated_at: order.delivered_at || order.created_at,
                // Use delivered_at or created_at
                estimated_delivery: order.status === 'in_transit' ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : undefined
              };
            });
            res.json({
              orders: transformedOrders,
              count: transformedOrders.length,
              total: total,
              offset: start,
              limit: parseInt(String(limit))
            });
          } catch (error) {
            console.error('Get customer orders error:', error);
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
  return function (_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}()));

/**
 * Get single order by ID
 * GET /store/customers/me/orders/:id
 */
router.get('/customers/me/orders/:id', authenticateCustomer, (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref8 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(req, res) {
    var customer, customerId, id, order, retailer, transformedItems, subtotal, delivery_fee, transformedOrder, _t3;
    return _regenerator["default"].wrap(function (_context8) {
      while (1) switch (_context8.prev = _context8.next) {
        case 0:
          _context8.prev = 0;
          customer = req.customer;
          customerId = customer.customer_id || customer.id;
          id = req.params.id;
          order = mockOrders.find(function (o) {
            return o.id === id && o.customer_id === customerId;
          });
          if (order) {
            _context8.next = 1;
            break;
          }
          return _context8.abrupt("return", res.status(404).json({
            error: 'Order not found'
          }));
        case 1:
          // Transform order to match frontend expectations
          retailer = mockRetailers.find(function (r) {
            return r.id === order.retailer_id;
          });
          transformedItems = order.items.map(function (item) {
            return {
              id: "".concat(order.id, "_").concat(item.product_id),
              product_id: item.product_id,
              product_name: item.name,
              quantity: item.quantity,
              unit_price: item.price,
              total: item.price * item.quantity
            };
          });
          subtotal = transformedItems.reduce(function (sum, item) {
            return sum + item.total;
          }, 0);
          delivery_fee = 500;
          transformedOrder = {
            id: order.id,
            order_number: "ORD-".concat(order.id.toUpperCase()),
            status: order.status,
            retailer: {
              id: order.retailer_id,
              name: (retailer === null || retailer === void 0 ? void 0 : retailer.name) || order.retailer_name || 'Unknown Store',
              location: (retailer === null || retailer === void 0 ? void 0 : retailer.address) || 'Kigali, Rwanda',
              phone: (retailer === null || retailer === void 0 ? void 0 : retailer.phone) || '+250 788 000 000'
            },
            items: transformedItems,
            subtotal: subtotal,
            delivery_fee: delivery_fee,
            total: order.total,
            delivery_address: order.delivery_address,
            notes: order.payment_method ? "Payment: ".concat(order.payment_method) : undefined,
            created_at: order.created_at,
            updated_at: order.delivered_at || order.created_at,
            estimated_delivery: order.status === 'in_transit' ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : undefined
          };
          res.json(transformedOrder);
          _context8.next = 3;
          break;
        case 2:
          _context8.prev = 2;
          _t3 = _context8["catch"](0);
          console.error('Get order error:', _t3);
          res.status(500).json({
            error: _t3.message
          });
        case 3:
        case "end":
          return _context8.stop();
      }
    }, _callee8, null, [[0, 2]]);
  }));
  return function (_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
}()));

/**
 * Track order
 * GET /store/customers/me/orders/:id/track
 */
router.get('/customers/me/orders/:id/track', authenticateCustomer, (0, _medusa.wrapHandler)(/*#__PURE__*/function () {
  var _ref9 = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(req, res) {
    var customer, customerId, id, order, trackingData, _t4;
    return _regenerator["default"].wrap(function (_context9) {
      while (1) switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          customer = req.customer;
          customerId = customer.customer_id || customer.id;
          id = req.params.id;
          order = mockOrders.find(function (o) {
            return o.id === id && o.customer_id === customerId;
          });
          if (order) {
            _context9.next = 1;
            break;
          }
          return _context9.abrupt("return", res.status(404).json({
            error: 'Order not found'
          }));
        case 1:
          // Mock tracking data
          trackingData = {
            order_id: order.id,
            status: order.status,
            current_location: order.status === 'delivered' ? order.delivery_address : order.status === 'in_transit' ? 'En route to delivery address' : order.retailer_name,
            estimated_delivery: order.status === 'delivered' ? order.delivered_at : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            // 2 hours from now
            history: [{
              status: 'pending',
              timestamp: order.created_at,
              location: order.retailer_name
            }].concat((0, _toConsumableArray2["default"])(order.status !== 'pending' ? [{
              status: 'confirmed',
              timestamp: order.created_at,
              location: order.retailer_name
            }] : []), (0, _toConsumableArray2["default"])(order.status === 'in_transit' || order.status === 'delivered' ? [{
              status: 'in_transit',
              timestamp: order.created_at,
              location: 'On delivery truck'
            }] : []), (0, _toConsumableArray2["default"])(order.status === 'delivered' ? [{
              status: 'delivered',
              timestamp: order.delivered_at,
              location: order.delivery_address
            }] : []))
          };
          res.json(trackingData);
          _context9.next = 3;
          break;
        case 2:
          _context9.prev = 2;
          _t4 = _context9["catch"](0);
          console.error('Track order error:', _t4);
          res.status(500).json({
            error: _t4.message
          });
        case 3:
        case "end":
          return _context9.stop();
      }
    }, _callee9, null, [[0, 2]]);
  }));
  return function (_x15, _x16) {
    return _ref9.apply(this, arguments);
  };
}()));
var _default = exports["default"] = router;