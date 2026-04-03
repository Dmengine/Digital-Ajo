import mongoose from "mongoose";

export type KycTier = 1 | 2 | 3;

const lockedEntrySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    lockUntil: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    username: { type: String, unique: true, required: true, lowercase: true, trim: true },
    wallets: {
      main: { type: Number, default: 0, min: 0 },
      locked: { type: [lockedEntrySchema], default: [] },
    },
    kycTier: { type: Number, enum: [1, 2, 3], default: 1 },
    reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
    completedAjoCycles: { type: Number, default: 0, min: 0 },
    tokenVersion: { type: Number, default: 0, min: 0 },
    bankAccount: {
      accountNumber: { type: String },
      bankName: { type: String },
      // Paystack authorization codes/token-like values must NOT be stored server-side.
      // Rely on Paystack vault / references instead of persisting sensitive card auth data.
      recipientCode: { type: String },
    },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const o = ret as Record<string, unknown>;
    delete o.password;
    delete o.__v;
    return o;
  },
});

export const UserModel = mongoose.model("User", userSchema);
