"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const userModel = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    wallets: {
        normal: { type: Number, default: 0 },
        emergency: { type: Number, default: 0 },
        fixed: [
            {
                amount: { type: Number, required: true },
                lockUntil: { type: Date, required: true }
            }
        ]
    },
    bankAccount: {
        accountNumber: { type: String },
        bankName: { type: String },
        cardToken: { type: String },
        recipientCode: { type: String }
    },
    kycVerified: { type: Boolean, default: false }
}, { timestamps: true });
exports.UserModel = mongoose_1.default.model("User", userModel);
