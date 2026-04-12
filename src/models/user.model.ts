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
    missedPaymentsCount: { type: Number, default: 0, min: 0 },
    defaultedPaymentsCount: { type: Number, default: 0, min: 0 },
    isRestricted: { type: Boolean, default: false },
    restrictionReason: { type: String, trim: true, maxlength: 500 },
    restrictedUntil: { type: Date },
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String, trim: true, maxlength: 500 },
    tokenVersion: { type: Number, default: 0, min: 0 },
    /** MVP: Basic KYC must be completed before a user can create/join groups. */
    basicKycCompleted: { type: Boolean, default: false },
    /** MVP avatar (data URL or URL). For production, store in object storage. */
    profileImage: { type: String },
    bankAccount: {
      accountNumber: { type: String },
      bankName: { type: String },
      bankCode: { type: String },
      accountName: { type: String },
      // Never store card PAN/CVV. This token is provided by Paystack for recurring charges.
      autoDebitAuthorizationCode: { type: String, select: false },
      recipientCode: { type: String },
    },
    phoneVerification: {
      verified: { type: Boolean, default: false },
      otpCodeHash: { type: String, select: false },
      otpExpiresAt: { type: Date },
      lastSentAt: { type: Date },
      verifiedAt: { type: Date },
    },
    kycProfile: {
      verified: { type: Boolean, default: false },
      identityType: { type: String, enum: ["bvn", "nin"] },
      identityLast4: { type: String },
      legalName: { type: String },
      verifiedBankAccountName: { type: String },
      verifiedAt: { type: Date },
    },
    security: {
      transactionPinHash: { type: String, select: false },
      otpRequiredForPayout: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const o = ret as Record<string, unknown>;
    delete o.password;
    delete o.__v;
    if (o.bankAccount && typeof o.bankAccount === "object") {
      delete (o.bankAccount as Record<string, unknown>).autoDebitAuthorizationCode;
    }
    if (o.security && typeof o.security === "object") {
      delete (o.security as Record<string, unknown>).transactionPinHash;
    }
    if (o.phoneVerification && typeof o.phoneVerification === "object") {
      delete (o.phoneVerification as Record<string, unknown>).otpCodeHash;
      delete (o.phoneVerification as Record<string, unknown>).otpExpiresAt;
    }
    return o;
  },
});

export const UserModel = mongoose.model("User", userSchema);
