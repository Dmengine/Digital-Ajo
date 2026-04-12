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
exports.recordContribution = exports.attachWithdrawalTransferMetadata = exports.withdrawWalletIdempotent = exports.debitWallet = exports.reverseWalletDebit = exports.applyPaystackDeposit = exports.creditWallet = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = require("../models/user.model");
const contribution_model_1 = require("../models/contribution.model");
const transaction_model_1 = require("../models/transaction.model");
const HttpError_1 = require("../errors/HttpError");
function isDuplicateKeyError(e) {
    return typeof e === "object" && e !== null && "code" in e && e.code === 11000;
}
function inSession(work) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = yield mongoose_1.default.startSession();
        try {
            session.startTransaction();
            const result = yield work(session);
            yield session.commitTransaction();
            return result;
        }
        catch (e) {
            yield session.abortTransaction();
            throw e;
        }
        finally {
            session.endSession();
        }
    });
}
/** General-purpose credit (no Paystack idempotency). Prefer applyPaystackDeposit for webhooks. */
const creditWallet = (userId_1, amount_1, ...args_1) => __awaiter(void 0, [userId_1, amount_1, ...args_1], void 0, function* (userId, amount, _wallet = "main", metadata) {
    const user = yield inSession((session) => __awaiter(void 0, void 0, void 0, function* () {
        const updated = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { "wallets.main": amount } }, { new: true, session });
        if (!updated)
            throw new HttpError_1.HttpError(404, "User not found");
        yield transaction_model_1.TransactionModel.create([
            {
                user: userId,
                type: "deposit",
                amount,
                walletType: "main",
                status: "success",
                metadata,
            },
        ], { session });
        return updated;
    }));
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
    let duplicate = false;
    yield inSession((session) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield transaction_model_1.TransactionModel.create([
                {
                    user: userId,
                    type: "deposit",
                    amount,
                    walletType: "main",
                    status: "success",
                    metadata: { paystackReference: ref, source: "paystack_webhook" },
                },
            ], { session });
        }
        catch (e) {
            if (isDuplicateKeyError(e)) {
                duplicate = true;
                return;
            }
            throw e;
        }
        const user = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { "wallets.main": amount } }, { new: true, session });
        if (!user)
            throw new HttpError_1.HttpError(404, "User not found");
    }));
    return { duplicate };
});
exports.applyPaystackDeposit = applyPaystackDeposit;
const reverseWalletDebit = (userId, amount, metadata) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield inSession((session) => __awaiter(void 0, void 0, void 0, function* () {
        const updated = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { "wallets.main": amount } }, { new: true, session });
        if (!updated)
            throw new HttpError_1.HttpError(404, "User not found");
        yield transaction_model_1.TransactionModel.create([
            {
                user: userId,
                type: "reversal",
                amount,
                walletType: "main",
                status: "success",
                metadata,
            },
        ], { session });
        return updated;
    }));
    return user;
});
exports.reverseWalletDebit = reverseWalletDebit;
const debitWallet = (userId_1, amount_1, ...args_1) => __awaiter(void 0, [userId_1, amount_1, ...args_1], void 0, function* (userId, amount, _wallet = "main", metadata) {
    const user = yield inSession((session) => __awaiter(void 0, void 0, void 0, function* () {
        const updated = yield user_model_1.UserModel.findOneAndUpdate({ _id: userId, "wallets.main": { $gte: amount } }, { $inc: { "wallets.main": -amount } }, { new: true, session });
        if (!updated) {
            const exists = yield user_model_1.UserModel.findById(userId).session(session).lean();
            if (!exists)
                throw new HttpError_1.HttpError(404, "User not found");
            throw new HttpError_1.HttpError(400, "Insufficient balance");
        }
        yield transaction_model_1.TransactionModel.create([
            {
                user: userId,
                type: "withdrawal",
                amount,
                walletType: "main",
                status: "success",
                metadata,
            },
        ], { session });
        return updated;
    }));
    return user;
});
exports.debitWallet = debitWallet;
const withdrawWalletIdempotent = (userId, amount, idempotencyKey) => __awaiter(void 0, void 0, void 0, function* () {
    let duplicate = false;
    const user = yield inSession((session) => __awaiter(void 0, void 0, void 0, function* () {
        const key = idempotencyKey === null || idempotencyKey === void 0 ? void 0 : idempotencyKey.trim();
        if (key) {
            const existing = yield transaction_model_1.TransactionModel.findOne({
                user: userId,
                type: "withdrawal",
                "metadata.idempotencyKey": key,
            })
                .session(session)
                .lean();
            if (existing) {
                const currentUser = yield user_model_1.UserModel.findById(userId).session(session);
                if (!currentUser)
                    throw new HttpError_1.HttpError(404, "User not found");
                duplicate = true;
                return currentUser;
            }
        }
        const updated = yield user_model_1.UserModel.findOneAndUpdate({ _id: userId, "wallets.main": { $gte: amount } }, { $inc: { "wallets.main": -amount } }, { new: true, session });
        if (!updated) {
            const exists = yield user_model_1.UserModel.findById(userId).session(session).lean();
            if (!exists)
                throw new HttpError_1.HttpError(404, "User not found");
            throw new HttpError_1.HttpError(400, "Insufficient balance");
        }
        yield transaction_model_1.TransactionModel.create([
            {
                user: userId,
                type: "withdrawal",
                amount,
                walletType: "main",
                status: "success",
                metadata: key ? { idempotencyKey: key } : undefined,
            },
        ], { session });
        return updated;
    }));
    return { user, duplicate };
});
exports.withdrawWalletIdempotent = withdrawWalletIdempotent;
const attachWithdrawalTransferMetadata = (userId, idempotencyKey, transferData) => __awaiter(void 0, void 0, void 0, function* () {
    yield transaction_model_1.TransactionModel.updateOne({
        user: userId,
        type: "withdrawal",
        "metadata.idempotencyKey": idempotencyKey,
    }, {
        $set: {
            "metadata.transfer": transferData,
        },
    });
});
exports.attachWithdrawalTransferMetadata = attachWithdrawalTransferMetadata;
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
