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
  wallets?: {
    main?: number;
  };
};

export type AuthResponse = {
  success: boolean;
  token: string;
  user: PublicUser;
  message?: string;
};
