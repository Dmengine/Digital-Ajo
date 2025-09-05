import mongoose from "mongoose";

const transactionModel = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: [ "deposit", "withdrawal", "auto-debit", "payout" ],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    walletType: {
        type: String,
        enum: [ "normal", "emergency", "fixed", "ajo" ],
        required: true
    },
    status: {
        type: String,
        enum: [ "success", "failed"],
        default: "success"
    },
    metadata: {
        type: Object
    }
}, {timestamps: true});

export const TransactionModel = mongoose.model("Transaction", transactionModel);