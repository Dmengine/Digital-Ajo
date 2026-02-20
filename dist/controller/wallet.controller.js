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
const auth_model_1 = require("../models/auth.model");
const paystack_services_1 = require("../services/paystack.services");
const notification_service_1 = require("../services/notification.service");
const wallet_service_1 = require("../services/wallet.service");
const initDeposit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount } = req.body;
        const user = yield auth_model_1.UserModel.findById(req.userId);
        if (!user) {
            return res.status(400).send({
                message: 'User not found',
                success: false
            });
        }
        const url = yield (0, paystack_services_1.initializeDeposit)(user.email, user._id.toString(), amount);
        yield (0, notification_service_1.notify)(user._id.toString(), `You initiated a deposit of ₦${amount}. Please complete the payment.`);
        res.json({ paymentURL: url });
    }
    catch (error) {
        console.log("Error in initDeposit controller", error);
        res.status(500).send({ message: "Server Error" });
    }
});
exports.initDeposit = initDeposit;
const webhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const event = req.body;
        if ((event === null || event === void 0 ? void 0 : event.event) === "charge.success") {
            const userId = (_b = (_a = event === null || event === void 0 ? void 0 : event.data) === null || _a === void 0 ? void 0 : _a.metadata) === null || _b === void 0 ? void 0 : _b.userId;
            const amount = ((_c = event === null || event === void 0 ? void 0 : event.data) === null || _c === void 0 ? void 0 : _c.amount) / 100;
            if (userId && amount > 0) {
                yield (0, wallet_service_1.creditWallet)(userId, amount, "normal");
            }
        }
        res.sendStatus(200);
    }
    catch (error) {
        console.log("Error in webhook controller", error);
        res.status(500).send({ message: "Server Error" });
    }
});
exports.webhook = webhook;
const withdraw = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { amount } = req.body;
        const user = yield auth_model_1.UserModel.findById(req.userId);
        if (!user) {
            return res.status(400).send({
                message: "User not found",
                success: false,
            });
        }
        if (!((_a = user.bankAccount) === null || _a === void 0 ? void 0 : _a.recipientCode)) {
            return res.status(400).send({
                message: "No bank account linked",
                success: false
            });
        }
        yield (0, wallet_service_1.debitWallet)(user._id.toString(), amount, "normal");
        yield (0, paystack_services_1.transferFunds)(user.bankAccount.recipientCode, amount, "User Withdrawal");
        yield (0, notification_service_1.notify)(user._id.toString(), `You have withdrawn ₦${amount} to your bank account`);
        res.status(200).send({
            message: "Withdrawal successful",
            success: true
        });
    }
    catch (error) {
        console.log("Error in withdraw controller", error);
        res.status(500).send({ message: "Server Error" });
    }
});
exports.withdraw = withdraw;
