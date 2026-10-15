export type PublicUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  username: string;
  kycTier?: number;
  basicKycCompleted?: boolean;
  profileImage?: string | null;
  reliabilityScore?: number;
  bankAccount?: {
    accountNumber: string;
    accountName: string | null;
    bankName: string | null;
    bankCode?: string | null;
    /** True only after Paystack bank resolve succeeded. */
    confirmed: boolean;
  } | null;
  /** BVN/NIN details submitted; never verified. */
  identity?: { type: "bvn" | "nin" | null; last4: string; verified: false } | null;
};

export type AuthResponse = {
  success: boolean;
  token: string;
  user: PublicUser;
  message?: string;
};
