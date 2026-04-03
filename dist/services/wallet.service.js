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
exports.recordContribution = exports.debitWallet = exports.reverseWalletDebit = exports.applyPaystackDeposit = exports.creditWallet = void 0;
const user_model_1 = require("../models/user.model");
const contribution_model_1 = require("../models/contribution.model");
const transaction_model_1 = require("../models/transaction.model");
const HttpError_1 = require("../errors/HttpError");
function isDuplicateKeyError(e) {
    return typeof e === "object" && e !== null && "code" in e && e.code === 11000;
}
/** General-purpose credit (no Paystack idempotency). Prefer applyPaystackDeposit for webhooks. */
const creditWallet = (userId_1, amount_1, ...args_1) => __awaiter(void 0, [userId_1, amount_1, ...args_1], void 0, function* (userId, amount, _wallet = "main", metadata) {
    const user = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { "wallets.main": amount } }, { new: true });
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    yield transaction_model_1.TransactionModel.create({
        user: userId,
        type: "deposit",
        amount,
        walletType: "main",
        status: "success",
        metadata,
    });
    return user;
});
exports.creditWallet = creditWallet;
/**
 * Idempotent Paystack deposit: unique index on metadata.paystackReference prevents double-credit under concurrency.
 * Ledger row is inserted first; balance updates only if insert succeeds.
 */
const applyPaystackDeposit = (userId, amount, paystackReference) => __awaiter(void 0, void 0, void 0, function* () {
    const ref = paystackReference.trim();
    if (!ref)
        throw new HttpError_1.HttpError(400, "Missing Paystack reference");
    try {
        yield transaction_model_1.TransactionModel.create({
            user: userId,
            type: "deposit",
            amount,
            walletType: "main",
            status: "success",
            metadata: { paystackReference: ref, source: "paystack_webhook" },
        });
    }
    catch (e) {
        if (isDuplicateKeyError(e))
            return { duplicate: true };
        throw e;
    }
    const user = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { "wallets.main": amount } }, { new: true });
    if (!user) {
        yield transaction_model_1.TransactionModel.deleteOne({ "metadata.paystackReference": ref });
        throw new HttpError_1.HttpError(404, "User not found");
    }
    return { duplicate: false };
});
exports.applyPaystackDeposit = applyPaystackDeposit;
const reverseWalletDebit = (userId, amount, metadata) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { "wallets.main": amount } }, { new: true });
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    yield transaction_model_1.TransactionModel.create({
        user: userId,
        type: "reversal",
        amount,
        walletType: "main",
        status: "success",
        metadata,
    });
    return user;
});
exports.reverseWalletDebit = reverseWalletDebit;
const debitWallet = (userId_1, amount_1, ...args_1) => __awaiter(void 0, [userId_1, amount_1, ...args_1], void 0, function* (userId, amount, _wallet = "main") {
    const user = yield user_model_1.UserModel.findOneAndUpdate({ _id: userId, "wallets.main": { $gte: amount } }, { $inc: { "wallets.main": -amount } }, { new: true });
    if (!user) {
        const exists = yield user_model_1.UserModel.findById(userId).lean();
        if (!exists)
            throw new HttpError_1.HttpError(404, "User not found");
        throw new HttpError_1.HttpError(400, "Insufficient balance");
    }
    yield transaction_model_1.TransactionModel.create({
        user: userId,
        type: "withdrawal",
        amount,
        walletType: "main",
        status: "success",
    });
    return user;
});
exports.debitWallet = debitWallet;
const recordContribution = (groupAjoId, userId, amount, cycle, turn) => __awaiter(void 0, void 0, void 0, function* () {
    return contribution_model_1.ContributionModel.create({
        groupAjo: groupAjoId,
        user: userId,
        amount,
        cycle,
        turn,
        status: "completed",
    });
});
exports.recordContribution = recordContribution;
