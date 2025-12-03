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
var MTNMoMoService = /** @class */ (function () {
    function MTNMoMoService() {
        this.accessToken = null;
        this.tokenExpiry = 0;
        this.config = {
            apiKey: process.env.MOMO_API_KEY || '',
            apiUser: process.env.MOMO_API_USER || '',
            apiSecret: process.env.MOMO_API_SECRET || '',
            subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY || '',
            environment: process.env.MOMO_ENVIRONMENT || 'sandbox',
            callbackUrl: process.env.MOMO_CALLBACK_URL || 'https://api.bigcompany.rw/webhooks/momo',
        };
        this.baseUrl = this.config.environment === 'production'
            ? 'https://proxy.momoapi.mtn.com'
            : 'https://sandbox.momodeveloper.mtn.com';
        var commonHeaders = {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        };
        this.collectionClient = axios_1.default.create({
            baseURL: "".concat(this.baseUrl, "/collection"),
            headers: commonHeaders,
        });
        this.disbursementClient = axios_1.default.create({
            baseURL: "".concat(this.baseUrl, "/disbursement"),
            headers: commonHeaders,
        });
    }
    /**
     * Get OAuth2 access token for Collection API
     */
    MTNMoMoService.prototype.getCollectionToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var credentials, response, error_1;
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
                        credentials = Buffer.from("".concat(this.config.apiUser, ":").concat(this.config.apiKey)).toString('base64');
                        return [4 /*yield*/, this.collectionClient.post('/token/', null, {
                                headers: {
                                    'Authorization': "Basic ".concat(credentials),
                                    'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
                                },
                            })];
                    case 2:
                        response = _b.sent();
                        this.accessToken = response.data.access_token;
                        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early
                        return [2 /*return*/, this.accessToken];
                    case 3:
                        error_1 = _b.sent();
                        console.error('MTN MoMo token error:', ((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) || error_1.message);
                        throw new Error('Failed to obtain MoMo access token');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Request payment from customer (Collection - RequestToPay)
     */
    MTNMoMoService.prototype.requestPayment = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var referenceId, token, msisdn, error_2;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        referenceId = (0, uuid_1.v4)();
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.getCollectionToken()];
                    case 2:
                        token = _d.sent();
                        msisdn = this.formatMSISDN(request.payerPhone);
                        return [4 /*yield*/, this.collectionClient.post('/v1_0/requesttopay', {
                                amount: request.amount.toString(),
                                currency: request.currency,
                                externalId: request.externalId,
                                payer: {
                                    partyIdType: 'MSISDN',
                                    partyId: msisdn,
                                },
                                payerMessage: request.payerMessage || "Payment to BIG Company - ".concat(request.externalId),
                                payeeNote: request.payeeNote || 'Wallet top-up',
                            }, {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Reference-Id': referenceId,
                                    'X-Target-Environment': this.config.environment,
                                    'X-Callback-Url': this.config.callbackUrl,
                                },
                            })];
                    case 3:
                        _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                referenceId: referenceId,
                                status: 'PENDING',
                            }];
                    case 4:
                        error_2 = _d.sent();
                        console.error('MTN MoMo collection error:', ((_a = error_2.response) === null || _a === void 0 ? void 0 : _a.data) || error_2.message);
                        return [2 /*return*/, {
                                success: false,
                                error: ((_c = (_b = error_2.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error_2.message,
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check status of a payment request
     */
    MTNMoMoService.prototype.getPaymentStatus = function (referenceId) {
        return __awaiter(this, void 0, void 0, function () {
            var token, response, error_3;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getCollectionToken()];
                    case 1:
                        token = _d.sent();
                        return [4 /*yield*/, this.collectionClient.get("/v1_0/requesttopay/".concat(referenceId), {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Target-Environment': this.config.environment,
                                },
                            })];
                    case 2:
                        response = _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                referenceId: referenceId,
                                status: response.data.status,
                                financialTransactionId: response.data.financialTransactionId,
                            }];
                    case 3:
                        error_3 = _d.sent();
                        console.error('MTN MoMo status check error:', ((_a = error_3.response) === null || _a === void 0 ? void 0 : _a.data) || error_3.message);
                        return [2 /*return*/, {
                                success: false,
                                error: ((_c = (_b = error_3.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error_3.message,
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send money to customer (Disbursement - Transfer)
     */
    MTNMoMoService.prototype.disburseFunds = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var referenceId, credentials, tokenResponse, msisdn, error_4;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        referenceId = (0, uuid_1.v4)();
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 4, , 5]);
                        credentials = Buffer.from("".concat(this.config.apiUser, ":").concat(this.config.apiKey)).toString('base64');
                        return [4 /*yield*/, this.disbursementClient.post('/token/', null, {
                                headers: {
                                    'Authorization': "Basic ".concat(credentials),
                                    'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
                                },
                            })];
                    case 2:
                        tokenResponse = _d.sent();
                        msisdn = this.formatMSISDN(request.payeePhone);
                        return [4 /*yield*/, this.disbursementClient.post('/v1_0/transfer', {
                                amount: request.amount.toString(),
                                currency: request.currency,
                                externalId: request.externalId,
                                payee: {
                                    partyIdType: 'MSISDN',
                                    partyId: msisdn,
                                },
                                payerMessage: 'BIG Company Disbursement',
                                payeeNote: request.payeeNote || 'Funds transfer',
                            }, {
                                headers: {
                                    'Authorization': "Bearer ".concat(tokenResponse.data.access_token),
                                    'X-Reference-Id': referenceId,
                                    'X-Target-Environment': this.config.environment,
                                },
                            })];
                    case 3:
                        _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                referenceId: referenceId,
                                status: 'PENDING',
                            }];
                    case 4:
                        error_4 = _d.sent();
                        console.error('MTN MoMo disbursement error:', ((_a = error_4.response) === null || _a === void 0 ? void 0 : _a.data) || error_4.message);
                        return [2 /*return*/, {
                                success: false,
                                error: ((_c = (_b = error_4.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error_4.message,
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate account holder (Check if phone is registered)
     */
    MTNMoMoService.prototype.validateAccount = function (phone) {
        return __awaiter(this, void 0, void 0, function () {
            var token, msisdn, response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getCollectionToken()];
                    case 1:
                        token = _a.sent();
                        msisdn = this.formatMSISDN(phone);
                        return [4 /*yield*/, this.collectionClient.get("/v1_0/accountholder/msisdn/".concat(msisdn, "/basicuserinfo"), {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Target-Environment': this.config.environment,
                                },
                            })];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, {
                                valid: true,
                                accountHolderName: response.data.name,
                            }];
                    case 3:
                        error_5 = _a.sent();
                        return [2 /*return*/, { valid: false }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get account balance (for merchant accounts)
     */
    MTNMoMoService.prototype.getBalance = function () {
        return __awaiter(this, void 0, void 0, function () {
            var token, response, error_6;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getCollectionToken()];
                    case 1:
                        token = _b.sent();
                        return [4 /*yield*/, this.collectionClient.get('/v1_0/account/balance', {
                                headers: {
                                    'Authorization': "Bearer ".concat(token),
                                    'X-Target-Environment': this.config.environment,
                                },
                            })];
                    case 2:
                        response = _b.sent();
                        return [2 /*return*/, {
                                balance: parseFloat(response.data.availableBalance),
                                currency: response.data.currency,
                            }];
                    case 3:
                        error_6 = _b.sent();
                        console.error('MTN MoMo balance error:', ((_a = error_6.response) === null || _a === void 0 ? void 0 : _a.data) || error_6.message);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Format phone number to MSISDN format (250XXXXXXXXX)
     */
    MTNMoMoService.prototype.formatMSISDN = function (phone) {
        var cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '250' + cleaned.substring(1);
        }
        else if (cleaned.startsWith('+250')) {
            cleaned = cleaned.substring(1);
        }
        else if (!cleaned.startsWith('250')) {
            cleaned = '250' + cleaned;
        }
        return cleaned;
    };
    return MTNMoMoService;
}());
exports.default = MTNMoMoService;
