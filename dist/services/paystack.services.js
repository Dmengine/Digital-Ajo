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
exports.transferFunds = exports.createTransferRecipient = exports.chargeAuthorization = exports.verifyDepositByReference = exports.initializeDeposit = void 0;
const paystack_1 = require("../mongodb/paystack");
const initializeDeposit = (email, userId, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const paystack = (0, paystack_1.getPaystack)();
    const { data } = yield paystack.post("/transaction/initialize", {
        email,
        amount: amount * 100,
        metadata: { userId },
    });
    return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
    };
});
exports.initializeDeposit = initializeDeposit;
const verifyDepositByReference = (reference) => __awaiter(void 0, void 0, void 0, function* () {
    const paystack = (0, paystack_1.getPaystack)();
    const { data } = yield paystack.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    return data === null || data === void 0 ? void 0 : data.data;
});
exports.verifyDepositByReference = verifyDepositByReference;
const chargeAuthorization = (authCode, email, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const paystack = (0, paystack_1.getPaystack)();
    const { data } = yield paystack.post("/transaction/charge_authorization", {
        authorization_code: authCode,
        email,
        amount: amount * 100,
    });
    return data;
});
exports.chargeAuthorization = chargeAuthorization;
const createTransferRecipient = (name, accountNumber, bankCode) => __awaiter(void 0, void 0, void 0, function* () {
    const paystack = (0, paystack_1.getPaystack)();
    const { data } = yield paystack.post("/transferrecipient", {
        type: "nuban",
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
    });
    return data.data.recipient_code;
});
exports.createTransferRecipient = createTransferRecipient;
const transferFunds = (recipientCode_1, amount_1, ...args_1) => __awaiter(void 0, [recipientCode_1, amount_1, ...args_1], void 0, function* (recipientCode, amount, reason = "Payout", idempotencyKey) {
    const paystack = (0, paystack_1.getPaystack)();
    const { data } = yield paystack.post("/transfer", {
        source: "balance",
        amount: amount * 100,
        recipient: recipientCode,
        reason,
    }, idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined);
    return data;
});
exports.transferFunds = transferFunds;
