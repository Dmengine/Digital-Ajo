import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PublicUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerified?: boolean;
  username: string;
  kycTier?: number;
  basicKycCompleted?: boolean;
  reliabilityScore?: number;
  isRestricted?: boolean;
  isFlagged?: boolean;
  profileImage?: string | null;
};

type AuthState = {
  token: string | null;
  user: PublicUser | null;
  setAuth: (token: string, user: PublicUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "ajoPay.auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

