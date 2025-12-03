"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var medusa_1 = require("@medusajs/medusa");
var BlnkService = /** @class */ (function (_super) {
    __extends(BlnkService, _super);
    function BlnkService(container) {
        var _this = _super.call(this, container) || this;
        _this.blnkUrl = process.env.BLNK_API_URL || 'http://localhost:5001';
        _this.client = axios_1.default.create({
            baseURL: _this.blnkUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return _this;
    }
    // ==================== LEDGERS ====================
    BlnkService.prototype.createLedger = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.post('/ledgers', input)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_1 = _a.sent();
                        throw new Error("Failed to create ledger: ".concat(error_1.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    BlnkService.prototype.getLedger = function (ledgerId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.get("/ledgers/".concat(ledgerId))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_2 = _a.sent();
                        throw new Error("Failed to get ledger: ".concat(error_2.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    BlnkService.prototype.listLedgers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.get('/ledgers')];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_3 = _a.sent();
                        throw new Error("Failed to list ledgers: ".concat(error_3.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ==================== BALANCES ====================
    BlnkService.prototype.createBalance = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.post('/balances', input)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_4 = _a.sent();
                        throw new Error("Failed to create balance: ".concat(error_4.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    BlnkService.prototype.getBalance = function (balanceId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.get("/balances/".concat(balanceId))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_5 = _a.sent();
                        throw new Error("Failed to get balance: ".concat(error_5.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    BlnkService.prototype.listBalances = function (ledgerId) {
        return __awaiter(this, void 0, void 0, function () {
            var url, response, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        url = ledgerId ? "/balances?ledger_id=".concat(ledgerId) : '/balances';
                        return [4 /*yield*/, this.client.get(url)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_6 = _a.sent();
                        throw new Error("Failed to list balances: ".concat(error_6.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ==================== TRANSACTIONS ====================
    BlnkService.prototype.createTransaction = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.post('/transactions', input)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_7 = _a.sent();
                        throw new Error("Failed to create transaction: ".concat(error_7.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    BlnkService.prototype.getTransaction = function (transactionId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.get("/transactions/".concat(transactionId))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_8 = _a.sent();
                        throw new Error("Failed to get transaction: ".concat(error_8.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    BlnkService.prototype.listTransactions = function (balanceId) {
        return __awaiter(this, void 0, void 0, function () {
            var url, response, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        url = balanceId ? "/transactions?balance_id=".concat(balanceId) : '/transactions';
                        return [4 /*yield*/, this.client.get(url)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_9 = _a.sent();
                        throw new Error("Failed to list transactions: ".concat(error_9.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // ==================== BIGCOMPANY HELPERS ====================
    /**
     * Initialize the BigCompany ledger structure with separate wallet and loan ledgers
     * Sprint 4: Wallet and Loan Balance Separation
     * Sprint 5: Company and Gas Station revenue split ledgers
     */
    BlnkService.prototype.initializeLedgers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var customerLedger, merchantLedger, systemLedger, walletBalancesLedger, loanBalancesLedger, companyRevenueLedger, gasStationRevenueLedger;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createLedger({
                            name: 'customer_wallets',
                            meta_data: { type: 'customer', currency: 'RWF' },
                        })];
                    case 1:
                        customerLedger = _a.sent();
                        return [4 /*yield*/, this.createLedger({
                                name: 'merchant_wallets',
                                meta_data: { type: 'merchant', currency: 'RWF' },
                            })];
                    case 2:
                        merchantLedger = _a.sent();
                        return [4 /*yield*/, this.createLedger({
                                name: 'system_accounts',
                                meta_data: { type: 'system', currency: 'RWF' },
                            })];
                    case 3:
                        systemLedger = _a.sent();
                        return [4 /*yield*/, this.createLedger({
                                name: 'wallet_balances',
                                meta_data: { type: 'wallet', currency: 'RWF', description: 'Regular wallet balances - transferable, withdrawable' },
                            })];
                    case 4:
                        walletBalancesLedger = _a.sent();
                        return [4 /*yield*/, this.createLedger({
                                name: 'loan_balances',
                                meta_data: { type: 'loan', currency: 'RWF', description: 'Loan balances - purchase-only, non-transferable' },
                            })];
                    case 5:
                        loanBalancesLedger = _a.sent();
                        return [4 /*yield*/, this.createLedger({
                                name: 'company_revenue',
                                meta_data: {
                                    type: 'revenue',
                                    currency: 'RWF',
                                    description: 'Company revenue - 28% commission from each transaction',
                                    profit_share: 0.28
                                },
                            })];
                    case 6:
                        companyRevenueLedger = _a.sent();
                        return [4 /*yield*/, this.createLedger({
                                name: 'gas_station_revenue',
                                meta_data: {
                                    type: 'revenue',
                                    currency: 'RWF',
                                    description: 'Gas station rewards - 12% from each transaction',
                                    profit_share: 0.12
                                },
                            })];
                    case 7:
                        gasStationRevenueLedger = _a.sent();
                        return [2 /*return*/, {
                                customerLedger: customerLedger,
                                merchantLedger: merchantLedger,
                                systemLedger: systemLedger,
                                walletBalancesLedger: walletBalancesLedger,
                                loanBalancesLedger: loanBalancesLedger,
                                companyRevenueLedger: companyRevenueLedger,
                                gasStationRevenueLedger: gasStationRevenueLedger
                            }];
                }
            });
        });
    };
    /**
     * Create a customer wallet
     */
    BlnkService.prototype.createCustomerWallet = function (customerId, ledgerId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createBalance({
                        ledger_id: ledgerId,
                        currency: 'RWF',
                        identity_id: customerId,
                        meta_data: { type: 'customer_wallet', customer_id: customerId },
                    })];
            });
        });
    };
    /**
     * Create a merchant wallet
     */
    BlnkService.prototype.createMerchantWallet = function (merchantId, ledgerId, merchantType) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createBalance({
                        ledger_id: ledgerId,
                        currency: 'RWF',
                        identity_id: merchantId,
                        meta_data: { type: 'merchant_wallet', merchant_id: merchantId, merchant_type: merchantType },
                    })];
            });
        });
    };
    /**
     * Create both wallet and loan balances for a user
     * Sprint 4: Each user needs two separate balance IDs
     */
    BlnkService.prototype.createUserBalances = function (userId, userType, walletLedgerId, loanLedgerId) {
        return __awaiter(this, void 0, void 0, function () {
            var walletBalance, loanBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createBalance({
                            ledger_id: walletLedgerId,
                            currency: 'RWF',
                            identity_id: userId,
                            meta_data: { type: 'wallet_balance', user_id: userId, user_type: userType },
                        })];
                    case 1:
                        walletBalance = _a.sent();
                        return [4 /*yield*/, this.createBalance({
                                ledger_id: loanLedgerId,
                                currency: 'RWF',
                                identity_id: userId,
                                meta_data: { type: 'loan_balance', user_id: userId, user_type: userType },
                            })];
                    case 2:
                        loanBalance = _a.sent();
                        return [2 /*return*/, { walletBalance: walletBalance, loanBalance: loanBalance }];
                }
            });
        });
    };
    /**
     * Top up customer wallet (from mobile money)
     */
    BlnkService.prototype.topUpWallet = function (customerBalanceId, systemBalanceId, amount, reference, paymentMethod) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createTransaction({
                        amount: amount,
                        currency: 'RWF',
                        source: systemBalanceId, // System account (mobile money collection)
                        destination: customerBalanceId,
                        reference: reference,
                        description: "Wallet top-up via ".concat(paymentMethod),
                        meta_data: { type: 'topup', payment_method: paymentMethod },
                    })];
            });
        });
    };
    /**
     * Pay from customer wallet to merchant
     */
    BlnkService.prototype.payFromWallet = function (customerBalanceId, merchantBalanceId, amount, orderId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createTransaction({
                        amount: amount,
                        currency: 'RWF',
                        source: customerBalanceId,
                        destination: merchantBalanceId,
                        reference: "ORDER-".concat(orderId),
                        description: "Payment for order ".concat(orderId),
                        meta_data: { type: 'order_payment', order_id: orderId },
                    })];
            });
        });
    };
    /**
     * Disburse loan to customer loan balance
     * Sprint 4: Loans now go to separate loan balance, not wallet balance
     */
    BlnkService.prototype.disburseLoan = function (systemBalanceId, customerLoanBalanceId, amount, loanId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createTransaction({
                        amount: amount,
                        currency: 'RWF',
                        source: systemBalanceId,
                        destination: customerLoanBalanceId, // Now goes to loan balance instead of wallet
                        reference: "LOAN-".concat(loanId),
                        description: "Loan disbursement for loan ".concat(loanId),
                        meta_data: { type: 'loan_disbursement', loan_id: loanId, balance_type: 'loan' },
                    })];
            });
        });
    };
    /**
     * Repay loan from customer wallet
     */
    BlnkService.prototype.repayLoan = function (customerBalanceId, systemBalanceId, amount, loanId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createTransaction({
                        amount: amount,
                        currency: 'RWF',
                        source: customerBalanceId,
                        destination: systemBalanceId,
                        reference: "LOAN-REPAY-".concat(loanId),
                        description: "Loan repayment for loan ".concat(loanId),
                        meta_data: { type: 'loan_repayment', loan_id: loanId },
                    })];
            });
        });
    };
    /**
     * Get customer wallet balance
     */
    BlnkService.prototype.getCustomerBalance = function (customerId, ledgerId) {
        return __awaiter(this, void 0, void 0, function () {
            var balances, customerBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.listBalances(ledgerId)];
                    case 1:
                        balances = _a.sent();
                        customerBalance = balances.find(function (b) { var _a; return ((_a = b.meta_data) === null || _a === void 0 ? void 0 : _a.customer_id) === customerId; });
                        return [2 /*return*/, customerBalance ? customerBalance.balance : 0];
                }
            });
        });
    };
    // ==================== SPRINT 4: WALLET/LOAN BALANCE METHODS ====================
    /**
     * Credit wallet balance (top-up, refund, etc.)
     */
    BlnkService.prototype.creditWalletBalance = function (systemBalanceId, walletBalanceId, amount, reference, description, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createTransaction({
                        amount: amount,
                        currency: 'RWF',
                        source: systemBalanceId,
                        destination: walletBalanceId,
                        reference: reference,
                        description: description,
                        meta_data: __assign(__assign({}, metadata), { balance_type: 'wallet' }),
                    })];
            });
        });
    };
    /**
     * Debit wallet balance (purchase, transfer, etc.)
     */
    BlnkService.prototype.debitWalletBalance = function (walletBalanceId, destinationBalanceId, amount, reference, description, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createTransaction({
                        amount: amount,
                        currency: 'RWF',
                        source: walletBalanceId,
                        destination: destinationBalanceId,
                        reference: reference,
                        description: description,
                        meta_data: __assign(__assign({}, metadata), { balance_type: 'wallet' }),
                    })];
            });
        });
    };
    /**
     * Credit loan balance (loan disbursement)
     */
    BlnkService.prototype.creditLoanBalance = function (systemBalanceId, loanBalanceId, amount, reference, description, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createTransaction({
                        amount: amount,
                        currency: 'RWF',
                        source: systemBalanceId,
                        destination: loanBalanceId,
                        reference: reference,
                        description: description,
                        meta_data: __assign(__assign({}, metadata), { balance_type: 'loan' }),
                    })];
            });
        });
    };
    /**
     * Debit loan balance (loan repayment or purchase using loan)
     */
    BlnkService.prototype.debitLoanBalance = function (loanBalanceId, destinationBalanceId, amount, reference, description, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createTransaction({
                        amount: amount,
                        currency: 'RWF',
                        source: loanBalanceId,
                        destination: destinationBalanceId,
                        reference: reference,
                        description: description,
                        meta_data: __assign(__assign({}, metadata), { balance_type: 'loan' }),
                    })];
            });
        });
    };
    /**
     * Get user's wallet and loan balances
     */
    BlnkService.prototype.getUserBalances = function (walletBalanceId, loanBalanceId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, wallet, loan;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.getBalance(walletBalanceId),
                            this.getBalance(loanBalanceId),
                        ])];
                    case 1:
                        _a = _b.sent(), wallet = _a[0], loan = _a[1];
                        return [2 /*return*/, {
                                walletBalance: wallet.balance,
                                loanBalance: loan.balance,
                                totalBalance: wallet.balance + loan.balance,
                            }];
                }
            });
        });
    };
    /**
     * Process payment with profit split (60% retailer, 28% company, 12% gas)
     * Sprint 5: Implement revenue sharing model
     */
    BlnkService.prototype.processPaymentWithSplit = function (customerBalanceId, retailerBalanceId, companyBalanceId, gasStationBalanceId, totalAmount, orderId, metadata) {
        return __awaiter(this, void 0, void 0, function () {
            var retailerAmount, companyAmount, gasAmount, splitTotal, adjustment, finalRetailerAmount, customerTransaction, retailerTransaction, companyTransaction, gasTransaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        retailerAmount = Math.round(totalAmount * 0.60);
                        companyAmount = Math.round(totalAmount * 0.28);
                        gasAmount = Math.round(totalAmount * 0.12);
                        splitTotal = retailerAmount + companyAmount + gasAmount;
                        adjustment = totalAmount - splitTotal;
                        finalRetailerAmount = retailerAmount + adjustment;
                        return [4 /*yield*/, this.createTransaction({
                                amount: totalAmount,
                                currency: 'RWF',
                                source: customerBalanceId,
                                destination: retailerBalanceId, // Goes to retailer first, then split
                                reference: "ORDER-".concat(orderId),
                                description: "Payment for order ".concat(orderId),
                                meta_data: __assign(__assign({}, metadata), { type: 'customer_payment', order_id: orderId }),
                            })];
                    case 1:
                        customerTransaction = _a.sent();
                        return [4 /*yield*/, this.createTransaction({
                                amount: finalRetailerAmount,
                                currency: 'RWF',
                                source: retailerBalanceId,
                                destination: retailerBalanceId,
                                reference: "ORDER-".concat(orderId, "-RETAILER"),
                                description: "Retailer revenue (60%) for order ".concat(orderId),
                                meta_data: __assign(__assign({}, metadata), { type: 'retailer_revenue', order_id: orderId, share_percentage: 60 }),
                            })];
                    case 2:
                        retailerTransaction = _a.sent();
                        return [4 /*yield*/, this.createTransaction({
                                amount: companyAmount,
                                currency: 'RWF',
                                source: retailerBalanceId,
                                destination: companyBalanceId,
                                reference: "ORDER-".concat(orderId, "-COMPANY"),
                                description: "Company commission (28%) for order ".concat(orderId),
                                meta_data: __assign(__assign({}, metadata), { type: 'company_commission', order_id: orderId, share_percentage: 28 }),
                            })];
                    case 3:
                        companyTransaction = _a.sent();
                        return [4 /*yield*/, this.createTransaction({
                                amount: gasAmount,
                                currency: 'RWF',
                                source: retailerBalanceId,
                                destination: gasStationBalanceId,
                                reference: "ORDER-".concat(orderId, "-GAS"),
                                description: "Gas rewards (12%) for order ".concat(orderId),
                                meta_data: __assign(__assign({}, metadata), { type: 'gas_rewards', order_id: orderId, share_percentage: 12 }),
                            })];
                    case 4:
                        gasTransaction = _a.sent();
                        return [2 /*return*/, {
                                customerTransaction: customerTransaction,
                                retailerTransaction: retailerTransaction,
                                companyTransaction: companyTransaction,
                                gasTransaction: gasTransaction,
                                split: {
                                    retailer: finalRetailerAmount,
                                    company: companyAmount,
                                    gas: gasAmount,
                                },
                            }];
                }
            });
        });
    };
    /**
     * Create balance for company revenue collection
     */
    BlnkService.prototype.createCompanyRevenueBalance = function (ledgerId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createBalance({
                        ledger_id: ledgerId,
                        currency: 'RWF',
                        meta_data: { type: 'company_revenue', description: '28% commission from all transactions' },
                    })];
            });
        });
    };
    /**
     * Create balance for gas station rewards collection
     */
    BlnkService.prototype.createGasStationBalance = function (ledgerId, gasStationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createBalance({
                        ledger_id: ledgerId,
                        currency: 'RWF',
                        meta_data: {
                            type: 'gas_station_rewards',
                            gas_station_id: gasStationId || 'default',
                            description: '12% rewards from all transactions'
                        },
                    })];
            });
        });
    };
    return BlnkService;
}(medusa_1.TransactionBaseService));
exports.default = BlnkService;
