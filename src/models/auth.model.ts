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
    kyc: {
        level: { type: Number, default: 0 },
        bvn: { type: String },
        nin: { type: String },
        address: { type: String },
        dateOfBirth: { type: Date },
        isVerified: { type: Boolean, default: false },
        verifiedAt: { type: Date }
    }
}, { timestamps: true})

export const UserModel = mongoose.model("User", userModel);