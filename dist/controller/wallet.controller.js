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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdraw = exports.webhook = exports.initDeposit = void 0;
const axios_1 = __importDefault(require("axios"));
const user_model_1 = require("../models/user.model");
const paystack_services_1 = require("../services/paystack.services");
const notification_service_1 = require("../services/notification.service");
const wallet_service_1 = require("../services/wallet.service");
const paystackWebhook_1 = require("../utils/paystackWebhook");
const env_1 = require("../config/env");
const HttpError_1 = require("../errors/HttpError");
const asyncHandler_1 = require("../middleware/asyncHandler");
exports.initDeposit = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount } = req.body;
    const user = yield user_model_1.UserModel.findById(req.userId);
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    const url = yield (0, paystack_services_1.initializeDeposit)(user.email, user._id.toString(), amount);
    yield (0, notification_service_1.notify)(user._id.toString(), `You initiated a deposit of ₦${amount}. Please complete the payment.`);
    res.json({ success: true, paymentURL: url });
}));
exports.webhook = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const signature = req.headers["x-paystack-signature"];
    const sig = Array.isArray(signature) ? signature[0] : signature;
    const raw = req.rawBody;
    if (!(0, paystackWebhook_1.verifyPaystackSignature)(raw, sig, env_1.env.paystackWebhookSecret())) {
        throw new HttpError_1.HttpError(400, "Invalid webhook signature");
    }
    const event = req.body;
    if ((event === null || event === void 0 ? void 0 : event.event) === "charge.success") {
        const reference = (_a = event === null || event === void 0 ? void 0 : event.data) === null || _a === void 0 ? void 0 : _a.reference;
        if (typeof reference !== "string" || !reference.trim()) {
            res.sendStatus(200);
            return;
        }
        const userId = (_c = (_b = event === null || event === void 0 ? void 0 : event.data) === null || _b === void 0 ? void 0 : _b.metadata) === null || _c === void 0 ? void 0 : _c.userId;
        const amountKobo = (_d = event === null || event === void 0 ? void 0 : event.data) === null || _d === void 0 ? void 0 : _d.amount;
        if (userId && typeof amountKobo === "number" && amountKobo > 0) {
            const amount = amountKobo / 100;
            yield (0, wallet_service_1.applyPaystackDeposit)(userId, amount, reference);
        }
    }
    res.sendStatus(200);
}));
exports.withdraw = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { amount } = req.body;
    const user = yield user_model_1.UserModel.findById(req.userId);
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    if (!((_a = user.bankAccount) === null || _a === void 0 ? void 0 : _a.recipientCode))
        throw new HttpError_1.HttpError(400, "No bank account linked");
    yield (0, wallet_service_1.debitWallet)(user._id.toString(), amount, "main");
    try {
        yield (0, paystack_services_1.transferFunds)(user.bankAccount.recipientCode, amount, "User Withdrawal");
    }
    catch (err) {
        yield (0, wallet_service_1.reverseWalletDebit)(user._id.toString(), amount, {
            reason: "paystack_transfer_failed",
            amount,
        });
        if (axios_1.default.isAxiosError(err)) {
            throw new HttpError_1.HttpError(502, "Bank transfer failed; your wallet has been refunded.");
        }
        throw new HttpError_1.HttpError(502, "Bank transfer failed; your wallet has been refunded.");
    }
    yield (0, notification_service_1.notify)(user._id.toString(), `You have withdrawn ₦${amount} to your bank account`);
    res.status(200).json({
        success: true,
        message: "Withdrawal successful",
    });
}));
