"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = seedProducts;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
// Rwanda-specific products for BIG Company
var categories = [{
  name: "Beverages",
  handle: "beverages",
  description: "Drinks and refreshments"
}, {
  name: "Dairy",
  handle: "dairy",
  description: "Milk and dairy products"
}, {
  name: "Food & Groceries",
  handle: "food-groceries",
  description: "Food staples and groceries"
}, {
  name: "Cooking Essentials",
  handle: "cooking-essentials",
  description: "Oils, spices, and cooking items"
}, {
  name: "Personal Care",
  handle: "personal-care",
  description: "Hygiene and personal care products"
}, {
  name: "Gas & Fuel",
  handle: "gas-fuel",
  description: "LPG gas cylinders and fuel"
}];
var products = [
// Beverages
{
  title: "Inyange Water 500ml",
  handle: "inyange-water-500ml",
  description: "Pure natural mineral water from Rwanda's pristine sources. Refreshing and clean drinking water.",
  category: "beverages",
  variants: [{
    title: "Single",
    prices: [{
      amount: 300,
      currency_code: "rwf"
    }],
    inventory_quantity: 500
  }],
  thumbnail: "/images/products/inyange-water.jpg"
}, {
  title: "Inyange Water 1.5L",
  handle: "inyange-water-1-5l",
  description: "Large bottle of pure natural mineral water. Perfect for families and offices.",
  category: "beverages",
  variants: [{
    title: "Single",
    prices: [{
      amount: 600,
      currency_code: "rwf"
    }],
    inventory_quantity: 300
  }],
  thumbnail: "/images/products/inyange-water-large.jpg"
}, {
  title: "Bralirwa Primus 500ml",
  handle: "bralirwa-primus-500ml",
  description: "Rwanda's favorite lager beer. Brewed locally with the finest ingredients.",
  category: "beverages",
  variants: [{
    title: "Single",
    prices: [{
      amount: 1200,
      currency_code: "rwf"
    }],
    inventory_quantity: 400
  }],
  thumbnail: "/images/products/primus-beer.jpg"
}, {
  title: "Bralirwa Mutzig 500ml",
  handle: "bralirwa-mutzig-500ml",
  description: "Premium Rwandan beer with a rich, full-bodied taste.",
  category: "beverages",
  variants: [{
    title: "Single",
    prices: [{
      amount: 1300,
      currency_code: "rwf"
    }],
    inventory_quantity: 350
  }],
  thumbnail: "/images/products/mutzig-beer.jpg"
}, {
  title: "Urwagwa Traditional Banana Wine 1L",
  handle: "urwagwa-banana-wine-1l",
  description: "Traditional Rwandan banana wine. A cultural favorite for celebrations.",
  category: "beverages",
  variants: [{
    title: "Single",
    prices: [{
      amount: 8000,
      currency_code: "rwf"
    }],
    inventory_quantity: 100
  }],
  thumbnail: "/images/products/urwagwa.jpg"
}, {
  title: "Inyange Juice Apple 1L",
  handle: "inyange-juice-apple-1l",
  description: "100% pure apple juice from Inyange Industries. No added sugar.",
  category: "beverages",
  variants: [{
    title: "Single",
    prices: [{
      amount: 2500,
      currency_code: "rwf"
    }],
    inventory_quantity: 200
  }],
  thumbnail: "/images/products/inyange-juice-apple.jpg"
}, {
  title: "Inyange Juice Passion Fruit 1L",
  handle: "inyange-juice-passion-1l",
  description: "Delicious passion fruit juice. Made from locally grown passion fruits.",
  category: "beverages",
  variants: [{
    title: "Single",
    prices: [{
      amount: 2500,
      currency_code: "rwf"
    }],
    inventory_quantity: 200
  }],
  thumbnail: "/images/products/inyange-juice-passion.jpg"
},
// Dairy
{
  title: "Inyange Fresh Milk 500ml",
  handle: "inyange-milk-500ml",
  description: "Fresh pasteurized milk from Rwandan dairy farms. Rich in calcium and vitamins.",
  category: "dairy",
  variants: [{
    title: "Single",
    prices: [{
      amount: 800,
      currency_code: "rwf"
    }],
    inventory_quantity: 300
  }],
  thumbnail: "/images/products/inyange-milk.jpg"
}, {
  title: "Inyange Fresh Milk 1L",
  handle: "inyange-milk-1l",
  description: "Fresh pasteurized milk in convenient 1 liter packaging.",
  category: "dairy",
  variants: [{
    title: "Single",
    prices: [{
      amount: 1500,
      currency_code: "rwf"
    }],
    inventory_quantity: 250
  }],
  thumbnail: "/images/products/inyange-milk-1l.jpg"
}, {
  title: "Ikivuguto (Traditional Yogurt) 500ml",
  handle: "ikivuguto-500ml",
  description: "Traditional Rwandan fermented milk. Probiotic-rich and delicious.",
  category: "dairy",
  variants: [{
    title: "Single",
    prices: [{
      amount: 1200,
      currency_code: "rwf"
    }],
    inventory_quantity: 150
  }],
  thumbnail: "/images/products/ikivuguto.jpg"
}, {
  title: "Inyange Yogurt Strawberry 250ml",
  handle: "inyange-yogurt-strawberry",
  description: "Creamy strawberry flavored yogurt. Perfect for breakfast or snacks.",
  category: "dairy",
  variants: [{
    title: "Single",
    prices: [{
      amount: 900,
      currency_code: "rwf"
    }],
    inventory_quantity: 200
  }],
  thumbnail: "/images/products/inyange-yogurt.jpg"
}, {
  title: "Inyange Butter 250g",
  handle: "inyange-butter-250g",
  description: "Pure creamy butter made from fresh Rwandan milk.",
  category: "dairy",
  variants: [{
    title: "Single",
    prices: [{
      amount: 3500,
      currency_code: "rwf"
    }],
    inventory_quantity: 100
  }],
  thumbnail: "/images/products/inyange-butter.jpg"
},
// Food & Groceries
{
  title: "Rice (Local) 5kg",
  handle: "rice-local-5kg",
  description: "Premium Rwandan rice. Locally grown and harvested.",
  category: "food-groceries",
  variants: [{
    title: "5kg Bag",
    prices: [{
      amount: 7500,
      currency_code: "rwf"
    }],
    inventory_quantity: 200
  }],
  thumbnail: "/images/products/rice.jpg"
}, {
  title: "Isombe (Cassava Leaves) 500g",
  handle: "isombe-500g",
  description: "Pre-prepared cassava leaves. Traditional Rwandan delicacy.",
  category: "food-groceries",
  variants: [{
    title: "500g Pack",
    prices: [{
      amount: 2000,
      currency_code: "rwf"
    }],
    inventory_quantity: 150
  }],
  thumbnail: "/images/products/isombe.jpg"
}, {
  title: "Ubugari (Cassava Flour) 2kg",
  handle: "ubugari-flour-2kg",
  description: "Fine cassava flour for making traditional ubugari.",
  category: "food-groceries",
  variants: [{
    title: "2kg Bag",
    prices: [{
      amount: 3500,
      currency_code: "rwf"
    }],
    inventory_quantity: 180
  }],
  thumbnail: "/images/products/ubugari-flour.jpg"
}, {
  title: "Beans (Red) 1kg",
  handle: "beans-red-1kg",
  description: "Premium red kidney beans. Staple of Rwandan cuisine.",
  category: "food-groceries",
  variants: [{
    title: "1kg Bag",
    prices: [{
      amount: 2200,
      currency_code: "rwf"
    }],
    inventory_quantity: 250
  }],
  thumbnail: "/images/products/beans-red.jpg"
}, {
  title: "Maize Flour 2kg",
  handle: "maize-flour-2kg",
  description: "Fine maize flour for ugali and other dishes.",
  category: "food-groceries",
  variants: [{
    title: "2kg Bag",
    prices: [{
      amount: 2800,
      currency_code: "rwf"
    }],
    inventory_quantity: 200
  }],
  thumbnail: "/images/products/maize-flour.jpg"
}, {
  title: "Sugar 1kg",
  handle: "sugar-1kg",
  description: "Refined white sugar. Essential kitchen staple.",
  category: "food-groceries",
  variants: [{
    title: "1kg Bag",
    prices: [{
      amount: 1800,
      currency_code: "rwf"
    }],
    inventory_quantity: 300
  }],
  thumbnail: "/images/products/sugar.jpg"
}, {
  title: "Ubuki (Rwandan Honey) 500g",
  handle: "ubuki-honey-500g",
  description: "Pure natural honey from Rwandan beekeepers. Rich and flavorful.",
  category: "food-groceries",
  variants: [{
    title: "500g Jar",
    prices: [{
      amount: 12000,
      currency_code: "rwf"
    }],
    inventory_quantity: 80
  }],
  thumbnail: "/images/products/ubuki-honey.jpg"
},
// Cooking Essentials
{
  title: "Akabanga Extra Hot Chili Oil 100ml",
  handle: "akabanga-chili-oil-100ml",
  description: "Famous Rwandan hot chili oil. A little goes a long way!",
  category: "cooking-essentials",
  variants: [{
    title: "100ml Bottle",
    prices: [{
      amount: 6000,
      currency_code: "rwf"
    }],
    inventory_quantity: 200
  }],
  thumbnail: "/images/products/akabanga.jpg"
}, {
  title: "Vegetable Oil 1L",
  handle: "vegetable-oil-1l",
  description: "Pure vegetable cooking oil. For all your cooking needs.",
  category: "cooking-essentials",
  variants: [{
    title: "1L Bottle",
    prices: [{
      amount: 4500,
      currency_code: "rwf"
    }],
    inventory_quantity: 250
  }],
  thumbnail: "/images/products/vegetable-oil.jpg"
}, {
  title: "Palm Oil 500ml",
  handle: "palm-oil-500ml",
  description: "Traditional palm oil for authentic African cooking.",
  category: "cooking-essentials",
  variants: [{
    title: "500ml Bottle",
    prices: [{
      amount: 3500,
      currency_code: "rwf"
    }],
    inventory_quantity: 150
  }],
  thumbnail: "/images/products/palm-oil.jpg"
}, {
  title: "Salt 1kg",
  handle: "salt-1kg",
  description: "Iodized table salt. Essential for every kitchen.",
  category: "cooking-essentials",
  variants: [{
    title: "1kg Pack",
    prices: [{
      amount: 800,
      currency_code: "rwf"
    }],
    inventory_quantity: 400
  }],
  thumbnail: "/images/products/salt.jpg"
}, {
  title: "Tomato Paste 400g",
  handle: "tomato-paste-400g",
  description: "Concentrated tomato paste for rich sauces and stews.",
  category: "cooking-essentials",
  variants: [{
    title: "400g Tin",
    prices: [{
      amount: 2500,
      currency_code: "rwf"
    }],
    inventory_quantity: 180
  }],
  thumbnail: "/images/products/tomato-paste.jpg"
},
// Personal Care
{
  title: "Soap Bar (Geisha) 175g",
  handle: "soap-geisha-175g",
  description: "Gentle cleansing soap bar. For smooth, healthy skin.",
  category: "personal-care",
  variants: [{
    title: "Single Bar",
    prices: [{
      amount: 1200,
      currency_code: "rwf"
    }],
    inventory_quantity: 300
  }],
  thumbnail: "/images/products/soap-geisha.jpg"
}, {
  title: "Toothpaste (Close Up) 100ml",
  handle: "toothpaste-closeup-100ml",
  description: "Fresh breath toothpaste for complete oral care.",
  category: "personal-care",
  variants: [{
    title: "100ml Tube",
    prices: [{
      amount: 2000,
      currency_code: "rwf"
    }],
    inventory_quantity: 200
  }],
  thumbnail: "/images/products/toothpaste.jpg"
}, {
  title: "Body Lotion 400ml",
  handle: "body-lotion-400ml",
  description: "Moisturizing body lotion for soft, hydrated skin.",
  category: "personal-care",
  variants: [{
    title: "400ml Bottle",
    prices: [{
      amount: 5500,
      currency_code: "rwf"
    }],
    inventory_quantity: 120
  }],
  thumbnail: "/images/products/body-lotion.jpg"
}, {
  title: "Washing Powder 1kg",
  handle: "washing-powder-1kg",
  description: "Powerful cleaning detergent for sparkling clean clothes.",
  category: "personal-care",
  variants: [{
    title: "1kg Pack",
    prices: [{
      amount: 4000,
      currency_code: "rwf"
    }],
    inventory_quantity: 180
  }],
  thumbnail: "/images/products/washing-powder.jpg"
},
// Gas & Fuel
{
  title: "LPG Gas Cylinder 6kg",
  handle: "lpg-gas-6kg",
  description: "6kg LPG cooking gas cylinder. Safe and efficient for home cooking.",
  category: "gas-fuel",
  variants: [{
    title: "Refill Only",
    prices: [{
      amount: 8500,
      currency_code: "rwf"
    }],
    inventory_quantity: 100
  }, {
    title: "New Cylinder + Gas",
    prices: [{
      amount: 35000,
      currency_code: "rwf"
    }],
    inventory_quantity: 50
  }],
  thumbnail: "/images/products/lpg-6kg.jpg"
}, {
  title: "LPG Gas Cylinder 12kg",
  handle: "lpg-gas-12kg",
  description: "12kg LPG cooking gas cylinder. Ideal for families and restaurants.",
  category: "gas-fuel",
  variants: [{
    title: "Refill Only",
    prices: [{
      amount: 16500,
      currency_code: "rwf"
    }],
    inventory_quantity: 80
  }, {
    title: "New Cylinder + Gas",
    prices: [{
      amount: 55000,
      currency_code: "rwf"
    }],
    inventory_quantity: 30
  }],
  thumbnail: "/images/products/lpg-12kg.jpg"
}, {
  title: "Charcoal 50kg",
  handle: "charcoal-50kg",
  description: "Premium quality charcoal for grilling and cooking.",
  category: "gas-fuel",
  variants: [{
    title: "50kg Bag",
    prices: [{
      amount: 25000,
      currency_code: "rwf"
    }],
    inventory_quantity: 60
  }],
  thumbnail: "/images/products/charcoal.jpg"
}];
function seedProducts(_x) {
  return _seedProducts.apply(this, arguments);
}
function _seedProducts() {
  _seedProducts = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(container) {
    var productService, regionService, salesChannelService, shippingProfileService, regions, rwandaRegion, salesChannels, defaultChannel, shippingProfiles, defaultProfile, created, skipped, _iterator, _step, productData, existing, product, _t, _t2, _t3;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          console.log("Starting product seeding for BIG Company Rwanda...");
          productService = container.resolve("productService");
          regionService = container.resolve("regionService");
          salesChannelService = container.resolve("salesChannelService");
          shippingProfileService = container.resolve("shippingProfileService");
          _context.prev = 1;
          _context.next = 2;
          return regionService.list({});
        case 2:
          regions = _context.sent;
          rwandaRegion = regions.find(function (r) {
            return r.name === "Rwanda";
          });
          if (rwandaRegion) {
            _context.next = 4;
            break;
          }
          console.log("Creating Rwanda region...");
          _context.next = 3;
          return regionService.create({
            name: "Rwanda",
            currency_code: "rwf",
            tax_rate: 18,
            // VAT in Rwanda
            payment_providers: ["manual"],
            fulfillment_providers: ["manual"],
            countries: ["rw"]
          });
        case 3:
          rwandaRegion = _context.sent;
        case 4:
          console.log("Using region: ".concat(rwandaRegion.name, " (").concat(rwandaRegion.id, ")"));

          // Get default sales channel
          _context.next = 5;
          return salesChannelService.list({});
        case 5:
          salesChannels = _context.sent;
          defaultChannel = salesChannels[0];
          console.log("Using sales channel: ".concat((defaultChannel === null || defaultChannel === void 0 ? void 0 : defaultChannel.name) || 'default'));

          // Get default shipping profile
          _context.next = 6;
          return shippingProfileService.list({});
        case 6:
          shippingProfiles = _context.sent;
          defaultProfile = shippingProfiles.find(function (p) {
            return p.type === "default";
          }) || shippingProfiles[0];
          console.log("Using shipping profile: ".concat((defaultProfile === null || defaultProfile === void 0 ? void 0 : defaultProfile.name) || 'default'));

          // Create products
          created = 0;
          skipped = 0;
          _iterator = _createForOfIteratorHelper(products);
          _context.prev = 7;
          _iterator.s();
        case 8:
          if ((_step = _iterator.n()).done) {
            _context.next = 16;
            break;
          }
          productData = _step.value;
          _context.prev = 9;
          _context.next = 10;
          return productService.list({
            handle: productData.handle
          });
        case 10:
          existing = _context.sent;
          if (!(existing.length > 0)) {
            _context.next = 11;
            break;
          }
          console.log("Skipping existing product: ".concat(productData.title));
          skipped++;
          return _context.abrupt("continue", 15);
        case 11:
          _context.next = 12;
          return productService.create({
            title: productData.title,
            handle: productData.handle,
            description: productData.description,
            is_giftcard: false,
            status: "published",
            thumbnail: productData.thumbnail,
            profile_id: defaultProfile === null || defaultProfile === void 0 ? void 0 : defaultProfile.id,
            options: [{
              title: "Size"
            }],
            variants: productData.variants.map(function (v) {
              return {
                title: v.title,
                inventory_quantity: v.inventory_quantity,
                manage_inventory: true,
                prices: v.prices.map(function (p) {
                  return {
                    amount: p.amount,
                    currency_code: p.currency_code,
                    region_id: rwandaRegion.id
                  };
                })
              };
            })
          });
        case 12:
          product = _context.sent;
          if (!defaultChannel) {
            _context.next = 13;
            break;
          }
          _context.next = 13;
          return productService.update(product.id, {
            sales_channels: [{
              id: defaultChannel.id
            }]
          });
        case 13:
          console.log("\u2713 Created: ".concat(productData.title));
          created++;
          _context.next = 15;
          break;
        case 14:
          _context.prev = 14;
          _t = _context["catch"](9);
          console.error("\u2717 Failed to create ".concat(productData.title, ": ").concat(_t.message));
        case 15:
          _context.next = 8;
          break;
        case 16:
          _context.next = 18;
          break;
        case 17:
          _context.prev = 17;
          _t2 = _context["catch"](7);
          _iterator.e(_t2);
        case 18:
          _context.prev = 18;
          _iterator.f();
          return _context.finish(18);
        case 19:
          console.log("\n=== Seeding Complete ===");
          console.log("Created: ".concat(created, " products"));
          console.log("Skipped: ".concat(skipped, " existing products"));
          console.log("Total: ".concat(products.length, " products"));
          _context.next = 21;
          break;
        case 20:
          _context.prev = 20;
          _t3 = _context["catch"](1);
          console.error("Seeding failed:", _t3.message);
          throw _t3;
        case 21:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[1, 20], [7, 17, 18, 19], [9, 14]]);
  }));
  return _seedProducts.apply(this, arguments);
}