"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const transactionModel = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["deposit", "withdrawal", "auto-debit", "payout"],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    walletType: {
        type: String,
        enum: ["normal", "emergency", "fixed", "ajo"],
        required: true
    },
    status: {
        type: String,
        enum: ["success", "failed"],
        default: "success"
    },
    metadata: {
        type: Object
    }
}, { timestamps: true });
exports.TransactionModel = mongoose_1.default.model("Transaction", transactionModel);
