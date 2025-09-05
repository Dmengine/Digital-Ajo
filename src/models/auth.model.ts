import mongoose from 'mongoose';

const userModel = new mongoose.Schema({
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
}, { timestamps: true})

export const UserModel = mongoose.model("User", userModel);