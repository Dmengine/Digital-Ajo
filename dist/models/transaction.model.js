"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const transactionSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
        type: String,
        enum: ["deposit", "withdrawal", "auto-debit", "payout", "fee", "reversal"],
        required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    walletType: {
        type: String,
        enum: ["main", "locked", "ajo"],
        required: true,
    },
    status: {
        type: String,
        enum: ["success", "failed"],
        default: "success",
    },
    metadata: { type: mongoose_1.default.Schema.Types.Mixed },
}, { timestamps: true });
transactionSchema.index({ "metadata.paystackReference": 1 }, {
    unique: true,
    sparse: true,
    partialFilterExpression: { "metadata.paystackReference": { $type: "string" } },
});
exports.TransactionModel = mongoose_1.default.model("Transaction", transactionSchema);
