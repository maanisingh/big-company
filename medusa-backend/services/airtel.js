"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var uuid_1 = require("uuid");
var AirtelMoneyService = /** @class */ (function () {
    function AirtelMoneyService() {
        this.accessToken = null;
        this.tokenExpiry = 0;
        this.config = {
            clientId: process.env.AIRTEL_CLIENT_ID || '',
            clientSecret: process.env.AIRTEL_CLIENT_SECRET || '',
            environment: process.env.AIRTEL_ENVIRONMENT || 'sandbox',
            callbackUrl: process.env.AIRTEL_CALLBACK_URL || 'https://api.bigcompany.rw/webhooks/airtel',
            country: 'RW',
            currency: 'RWF',
        };
        this.baseUrl = this.config.environment === 'production'
            ? 'https://openapi.airtel.africa'
            : 'https://openapiuat.airtel.africa';
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*',
            },
        });
    }
    /**
     * Get OAuth2 access token from Airtel
     */
    AirtelMoneyService.prototype.getAccessToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.accessToken && Date.now() < this.tokenExpiry) {
                            return [2 /*return*/, this.accessToken];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.client.post('/auth/oauth2/token', {
                                client_id: this.config.clientId,
                                client_secret: this.config.clientSecret,
                                grant_type: 'client_credentials',
                            })];
                    case 2:
                        response = _b.sent();
                        this.accessToken = response.data.access_token;
                        this.tokenExpiry = Date.now() + (parseInt(response.data.expires_in) * 1000) - 60000;
                        return [2 /*return*/, this.accessToken];
                    case 3:
                        error_1 = _b.sent();
                        console.error('Airtel Money token error:', ((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) || error_1.message);
                        throw new Error('Failed to obtain Airtel access token');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Request payment from customer (USSD Push)
     */
    AirtelMoneyService.prototype.requestPayment = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var token, transactionId, msisdn, response, data, status_1, error_2;
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _h.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAccessToken()];
                    case 1:
                        token = _h.sent();
                        transactionId = request.transactionId || (0, uuid_1.v4)().replace(/-/g, '').substring(0, 20);
                        msisdn = this.formatMSISDN(request.phone);
                        return [4 /*yield*/, this.client.post('/merchant/v1/payments/', {
                                reference: request.reference,
                                subscriber: {
                                    country: this.config.country,
                                    currency: this.config.currency,
                                    msisdn: msisdn,
                                },
                                transaction: {
                                    amount: request.amount,
                                    country: this.config.country,
                                    currency: this.config.currency,
                                    id: transactionId,
                                },
                            }, {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Country': this.config.country,
                                    'X-Currency': this.config.currency,
                                },
                            })];
                    case 2:
                        response = _h.sent();
                        data = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data;
                        status_1 = (_b = response.data) === null || _b === void 0 ? void 0 : _b.status;
                        return [2 /*return*/, {
                                success: (status_1 === null || status_1 === void 0 ? void 0 : status_1.success) === true || (status_1 === null || status_1 === void 0 ? void 0 : status_1.code) === '200',
                                transactionId: ((_c = data === null || data === void 0 ? void 0 : data.transaction) === null || _c === void 0 ? void 0 : _c.id) || transactionId,
                                status: (status_1 === null || status_1 === void 0 ? void 0 : status_1.message) || 'PENDING',
                                message: status_1 === null || status_1 === void 0 ? void 0 : status_1.result_code,
                            }];
                    case 3:
                        error_2 = _h.sent();
                        console.error('Airtel Money payment error:', ((_d = error_2.response) === null || _d === void 0 ? void 0 : _d.data) || error_2.message);
                        return [2 /*return*/, {
                                success: false,
                                error: ((_g = (_f = (_e = error_2.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.status) === null || _g === void 0 ? void 0 : _g.message) || error_2.message,
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check payment status
     */
    AirtelMoneyService.prototype.getPaymentStatus = function (transactionId) {
        return __awaiter(this, void 0, void 0, function () {
            var token, response, data, status_2, error_3;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        _j.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAccessToken()];
                    case 1:
                        token = _j.sent();
                        return [4 /*yield*/, this.client.get("/standard/v1/payments/".concat(transactionId), {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Country': this.config.country,
                                    'X-Currency': this.config.currency,
                                },
                            })];
                    case 2:
                        response = _j.sent();
                        data = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data;
                        status_2 = (_b = response.data) === null || _b === void 0 ? void 0 : _b.status;
                        return [2 /*return*/, {
                                success: true,
                                transactionId: (_c = data === null || data === void 0 ? void 0 : data.transaction) === null || _c === void 0 ? void 0 : _c.id,
                                status: (_d = data === null || data === void 0 ? void 0 : data.transaction) === null || _d === void 0 ? void 0 : _d.status,
                                message: status_2 === null || status_2 === void 0 ? void 0 : status_2.message,
                            }];
                    case 3:
                        error_3 = _j.sent();
                        console.error('Airtel Money status error:', ((_e = error_3.response) === null || _e === void 0 ? void 0 : _e.data) || error_3.message);
                        return [2 /*return*/, {
                                success: false,
                                error: ((_h = (_g = (_f = error_3.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.status) === null || _h === void 0 ? void 0 : _h.message) || error_3.message,
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Disburse funds to customer
     */
    AirtelMoneyService.prototype.disburseFunds = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var token, transactionId, msisdn, response, status_3, error_4;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAccessToken()];
                    case 1:
                        token = _f.sent();
                        transactionId = (0, uuid_1.v4)().replace(/-/g, '').substring(0, 20);
                        msisdn = this.formatMSISDN(request.phone);
                        return [4 /*yield*/, this.client.post('/standard/v1/disbursements/', {
                                payee: {
                                    msisdn: msisdn,
                                    name: request.recipientName || 'BIG Customer',
                                },
                                reference: request.reference,
                                pin: process.env.AIRTEL_PIN || '',
                                transaction: {
                                    amount: request.amount,
                                    id: transactionId,
                                },
                            }, {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Country': this.config.country,
                                    'X-Currency': this.config.currency,
                                },
                            })];
                    case 2:
                        response = _f.sent();
                        status_3 = (_a = response.data) === null || _a === void 0 ? void 0 : _a.status;
                        return [2 /*return*/, {
                                success: (status_3 === null || status_3 === void 0 ? void 0 : status_3.success) === true || (status_3 === null || status_3 === void 0 ? void 0 : status_3.code) === '200',
                                transactionId: transactionId,
                                status: status_3 === null || status_3 === void 0 ? void 0 : status_3.message,
                            }];
                    case 3:
                        error_4 = _f.sent();
                        console.error('Airtel Money disbursement error:', ((_b = error_4.response) === null || _b === void 0 ? void 0 : _b.data) || error_4.message);
                        return [2 /*return*/, {
                                success: false,
                                error: ((_e = (_d = (_c = error_4.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.status) === null || _e === void 0 ? void 0 : _e.message) || error_4.message,
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if account is registered with Airtel Money
     */
    AirtelMoneyService.prototype.validateAccount = function (phone) {
        return __awaiter(this, void 0, void 0, function () {
            var token, msisdn, response, data, error_5;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAccessToken()];
                    case 1:
                        token = _b.sent();
                        msisdn = this.formatMSISDN(phone);
                        return [4 /*yield*/, this.client.get("/standard/v1/users/".concat(msisdn), {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Country': this.config.country,
                                    'X-Currency': this.config.currency,
                                },
                            })];
                    case 2:
                        response = _b.sent();
                        data = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data;
                        return [2 /*return*/, {
                                valid: (data === null || data === void 0 ? void 0 : data.is_barred) === false,
                                name: "".concat((data === null || data === void 0 ? void 0 : data.first_name) || '', " ").concat((data === null || data === void 0 ? void 0 : data.last_name) || '').trim(),
                            }];
                    case 3:
                        error_5 = _b.sent();
                        return [2 /*return*/, { valid: false }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get account balance
     */
    AirtelMoneyService.prototype.getBalance = function () {
        return __awaiter(this, void 0, void 0, function () {
            var token, response, data, error_6;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAccessToken()];
                    case 1:
                        token = _c.sent();
                        return [4 /*yield*/, this.client.get('/standard/v1/users/balance', {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Country': this.config.country,
                                    'X-Currency': this.config.currency,
                                },
                            })];
                    case 2:
                        response = _c.sent();
                        data = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data;
                        return [2 /*return*/, {
                                balance: parseFloat((data === null || data === void 0 ? void 0 : data.balance) || 0),
                                currency: (data === null || data === void 0 ? void 0 : data.currency) || this.config.currency,
                            }];
                    case 3:
                        error_6 = _c.sent();
                        console.error('Airtel Money balance error:', ((_b = error_6.response) === null || _b === void 0 ? void 0 : _b.data) || error_6.message);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Refund a transaction
     */
    AirtelMoneyService.prototype.refund = function (transactionId) {
        return __awaiter(this, void 0, void 0, function () {
            var token, response, status_4, error_7;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getAccessToken()];
                    case 1:
                        token = _f.sent();
                        return [4 /*yield*/, this.client.post("/standard/v1/payments/refund", {
                                transaction: {
                                    airtel_money_id: transactionId,
                                },
                            }, {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Country': this.config.country,
                                    'X-Currency': this.config.currency,
                                },
                            })];
                    case 2:
                        response = _f.sent();
                        status_4 = (_a = response.data) === null || _a === void 0 ? void 0 : _a.status;
                        return [2 /*return*/, {
                                success: (status_4 === null || status_4 === void 0 ? void 0 : status_4.success) === true,
                                message: status_4 === null || status_4 === void 0 ? void 0 : status_4.message,
                            }];
                    case 3:
                        error_7 = _f.sent();
                        console.error('Airtel Money refund error:', ((_b = error_7.response) === null || _b === void 0 ? void 0 : _b.data) || error_7.message);
                        return [2 /*return*/, {
                                success: false,
                                error: ((_e = (_d = (_c = error_7.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.status) === null || _e === void 0 ? void 0 : _e.message) || error_7.message,
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Format phone number to MSISDN format (without country code for Airtel)
     */
    AirtelMoneyService.prototype.formatMSISDN = function (phone) {
        var cleaned = phone.replace(/\D/g, '');
        // Airtel Rwanda uses format without country code in some endpoints
        if (cleaned.startsWith('250')) {
            cleaned = cleaned.substring(3);
        }
        else if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        return cleaned;
    };
    return AirtelMoneyService;
}());
exports.default = AirtelMoneyService;
