import mongoose from "mongoose";

export type KycTier = 1 | 2 | 3;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false },
    username: { type: String, unique: true, required: true, lowercase: true, trim: true },
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
    /** Where this member receives their payout. Other members transfer to it directly. */
    bankAccount: {
      accountNumber: { type: String },
      bankName: { type: String },
      bankCode: { type: String },
      /** Account holder name as returned by Paystack's bank resolve endpoint. */
      accountName: { type: String },
      /** Set only after a successful Paystack bank resolve. */
      confirmedAt: { type: Date },
    },
    phoneVerification: {
      verified: { type: Boolean, default: false },
      otpCodeHash: { type: String, select: false },
      otpExpiresAt: { type: Date },
      lastSentAt: { type: Date },
      verifiedAt: { type: Date },
    },
    kycProfile: {
      /** BVN/NIN is collected but NOT verified against NIBSS/NIMC. Never set true without a real check. */
      identityVerified: { type: Boolean, default: false },
      identityType: { type: String, enum: ["bvn", "nin"] },
      identityLast4: { type: String },
      /** Bank account holder name confirmed via Paystack bank resolve. */
      verifiedBankAccountName: { type: String },
      detailsSubmittedAt: { type: Date },
    },
    /** NDPA: when the user accepted the privacy notice at registration. */
    consentAcceptedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const o = ret as Record<string, unknown>;
    delete o.password;
    delete o.__v;
    if (o.phoneVerification && typeof o.phoneVerification === "object") {
      delete (o.phoneVerification as Record<string, unknown>).otpCodeHash;
      delete (o.phoneVerification as Record<string, unknown>).otpExpiresAt;
    }
    return o;
  },
});

export const UserModel = mongoose.model("User", userSchema);
