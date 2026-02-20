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
exports.recordContribution = exports.debitWallet = exports.creditWallet = void 0;
const auth_model_1 = require("../models/auth.model");
const contribution_model_1 = require("../models/contribution.model");
const transaction_model_1 = require("../models/transaction.model");
const creditWallet = (userId_1, amount_1, ...args_1) => __awaiter(void 0, [userId_1, amount_1, ...args_1], void 0, function* (userId, amount, wallet = "normal") {
    const user = yield auth_model_1.UserModel.findByIdAndUpdate(userId, { $inc: { [`wallets.${wallet}`]: amount } }, { new: true });
    yield transaction_model_1.TransactionModel.create({ user: userId, type: "deposit", amount, walletType: wallet, status: "success" });
    return user;
});
exports.creditWallet = creditWallet;
const debitWallet = (userId_1, amount_1, ...args_1) => __awaiter(void 0, [userId_1, amount_1, ...args_1], void 0, function* (userId, amount, wallet = "normal") {
    const user = yield auth_model_1.UserModel.findById(userId);
    if (!user)
        throw new Error("User not found");
    const current = user.wallets[wallet];
    if (current < amount)
        throw new Error("Insufficient balance");
    user.wallets[wallet] = current - amount;
    yield user.save();
    yield transaction_model_1.TransactionModel.create({ user: userId, type: "withdrawal", amount, walletType: wallet, status: "success" });
    return user;
});
exports.debitWallet = debitWallet;
const recordContribution = (groupId, userId, amount, cycle, turn) => __awaiter(void 0, void 0, void 0, function* () {
    return contribution_model_1.ContributionModel.create({
        group: groupId,
        user: userId,
        amount,
        cycle,
        turn,
        status: "paid"
    });
});
exports.recordContribution = recordContribution;
