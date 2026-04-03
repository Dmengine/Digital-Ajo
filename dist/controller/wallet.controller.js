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
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdraw = exports.webhook = exports.initDeposit = void 0;
const user_model_1 = require("../models/user.model");
const notification_service_1 = require("../services/notification.service");
const wallet_service_1 = require("../services/wallet.service");
const paystack_services_1 = require("../services/paystack.services");
const paystackWebhook_1 = require("../utils/paystackWebhook");
const env_1 = require("../config/env");
const HttpError_1 = require("../errors/HttpError");
const asyncHandler_1 = require("../middleware/asyncHandler");
exports.initDeposit = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const { amount } = req.body;
    const user = yield user_model_1.UserModel.findById(req.userId);
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    // Real deposit via Paystack (customer pays from their bank/card).
    let paymentURL;
    try {
        paymentURL = yield (0, paystack_services_1.initializeDeposit)(user.email, user._id.toString(), amount);
    }
    catch (err) {
        console.error("Paystack initDeposit error:", {
            status: (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.status,
            data: (_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data,
            message: err === null || err === void 0 ? void 0 : err.message,
        });
        const status = (_c = err === null || err === void 0 ? void 0 : err.response) === null || _c === void 0 ? void 0 : _c.status;
        if (status === 401 || status === 403) {
            throw new HttpError_1.HttpError(502, "Paystack rejected credentials. Check AJOPAY_PAYSTACK_KEY (test vs live) and restart the server.");
        }
        const paystackMsg = typeof ((_e = (_d = err === null || err === void 0 ? void 0 : err.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) === "string" ? err.response.data.message : undefined;
        throw new HttpError_1.HttpError(502, paystackMsg ? `Failed to initialize Paystack deposit: ${paystackMsg}` : "Failed to initialize Paystack deposit.");
    }
    yield (0, notification_service_1.notify)(user._id.toString(), `You initiated a deposit of ₦${amount}. Please complete the payment.`);
    res.json({ success: true, paymentURL });
}));
exports.webhook = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    // MVP: generic signed webhook verification. Accept both headers for backward compatibility.
    const signature = ((_a = req.headers["x-webhook-signature"]) !== null && _a !== void 0 ? _a : req.headers["x-paystack-signature"]);
    const sig = Array.isArray(signature) ? signature[0] : signature;
    const raw = req.rawBody;
    if (!(0, paystackWebhook_1.verifyPaystackSignature)(raw, sig, env_1.env.webhookSecret())) {
        throw new HttpError_1.HttpError(400, "Invalid webhook signature");
    }
    const event = req.body;
    const eventName = typeof (event === null || event === void 0 ? void 0 : event.event) === "string" ? event.event : undefined;
    // Supported event names:
    // - charge.success (legacy Paystack-style): amount is in kobo
    // - deposit.completed / deposit.success (MVP): amount is in naira
    const isDepositEvent = eventName === "charge.success" || eventName === "deposit.completed" || eventName === "deposit.success";
    if (isDepositEvent) {
        const reference = (_c = (_b = event === null || event === void 0 ? void 0 : event.data) === null || _b === void 0 ? void 0 : _b.reference) !== null && _c !== void 0 ? _c : (_e = (_d = event === null || event === void 0 ? void 0 : event.data) === null || _d === void 0 ? void 0 : _d.metadata) === null || _e === void 0 ? void 0 : _e.reference;
        const userId = (_h = (_g = (_f = event === null || event === void 0 ? void 0 : event.data) === null || _f === void 0 ? void 0 : _f.metadata) === null || _g === void 0 ? void 0 : _g.userId) !== null && _h !== void 0 ? _h : (_k = (_j = event === null || event === void 0 ? void 0 : event.data) === null || _j === void 0 ? void 0 : _j.metadata) === null || _k === void 0 ? void 0 : _k.userID;
        const amountRaw = (_l = event === null || event === void 0 ? void 0 : event.data) === null || _l === void 0 ? void 0 : _l.amount;
        if (typeof reference !== "string" || !reference.trim()) {
            res.sendStatus(200);
            return;
        }
        if (typeof userId !== "string" || !userId.trim()) {
            res.sendStatus(200);
            return;
        }
        if (typeof amountRaw !== "number" || !Number.isFinite(amountRaw) || amountRaw <= 0) {
            res.sendStatus(200);
            return;
        }
        const amount = eventName === "charge.success" ? amountRaw / 100 : amountRaw;
        if (amount <= 0) {
            res.sendStatus(200);
            return;
        }
        yield (0, wallet_service_1.applyPaystackDeposit)(userId, amount, reference);
    }
    res.sendStatus(200);
}));
exports.withdraw = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { amount } = req.body;
    const user = yield user_model_1.UserModel.findById(req.userId);
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    if (!((_a = user.bankAccount) === null || _a === void 0 ? void 0 : _a.accountNumber) || !((_b = user.bankAccount) === null || _b === void 0 ? void 0 : _b.bankName))
        throw new HttpError_1.HttpError(400, "No bank account linked");
    yield (0, wallet_service_1.debitWallet)(user._id.toString(), amount, "main");
    yield (0, notification_service_1.notify)(user._id.toString(), `You have withdrawn ₦${amount} to your bank account`);
    res.status(200).json({
        success: true,
        message: "Withdrawal successful",
    });
}));
