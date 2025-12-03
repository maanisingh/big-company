"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _express = _interopRequireDefault(require("express"));
var _medusaCoreUtils = require("medusa-core-utils");
var _loaders = _interopRequireDefault(require("@medusajs/medusa/dist/loaders"));
var _seedProducts = _interopRequireDefault(require("./seed-products"));
function main() {
  return _main.apply(this, arguments);
}
function _main() {
  _main = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee() {
    var app, _getConfigFile, configModule, _yield$loaders, container;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          app = (0, _express["default"])();
          _getConfigFile = (0, _medusaCoreUtils.getConfigFile)(process.cwd(), "medusa-config"), configModule = _getConfigFile.configModule;
          _context.next = 1;
          return (0, _loaders["default"])({
            directory: process.cwd(),
            expressApp: app,
            isTest: false
          });
        case 1:
          _yield$loaders = _context.sent;
          container = _yield$loaders.container;
          _context.next = 2;
          return (0, _seedProducts["default"])(container);
        case 2:
          process.exit(0);
        case 3:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _main.apply(this, arguments);
}
main()["catch"](function (err) {
  console.error(err);
  process.exit(1);
});