import { api } from "./client";
import type { PublicUser } from "../store/authStore";

export type RegisterBody = {
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  consentAccepted: boolean;
};

export type LoginBody = {
  emailOrUsername: string;
  password: string;
};

export async function register(body: RegisterBody): Promise<{
  success: boolean;
  message: string;
  token: string;
  user: PublicUser;
}> {
  const { data } = await api.post("/auth/register", body);
  return data;
}

export async function login(body: LoginBody): Promise<{
  success: boolean;
  message: string;
  token: string;
  user: PublicUser;
}> {
  const { data } = await api.post("/auth/login", body);
  return data;
}

export async function logout(): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post("/auth/logout");
  return data;
}

export async function me(): Promise<{
  success: boolean;
  user: PublicUser & {
    phone?: string;
    basicKycCompleted?: boolean;
    kycTier?: number;
    reliabilityScore?: number;
    isRestricted?: boolean;
    isFlagged?: boolean;
    profileImage?: string | null;
    bankAccount?: BankAccountSummary | null;
    identity?: { type: "bvn" | "nin" | null; last4: string; verified: false } | null;
  };
}> {
  const { data } = await api.get("/auth/me");
  return data;
}

export type BankAccountSummary = {
  accountNumber: string;
  accountName: string | null;
  bankName: string | null;
  bankCode?: string | null;
  confirmed: boolean;
};

export type Bank = { name: string; code: string };

export async function listBanks(): Promise<{ success: boolean; banks: Bank[] }> {
  const { data } = await api.get("/auth/banks");
  return data;
}

export async function submitTier1Kyc(values: {
  bvnOrNin: string;
  identityType?: "bvn" | "nin";
  dob: string;
  residentialAddress: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
}): Promise<{ success: boolean; message: string; bankAccount: BankAccountSummary }> {
  const { data } = await api.post("/auth/kyc/tier1", values);
  return data;
}

export async function uploadAvatar(imageDataUrl: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post("/auth/avatar", { imageDataUrl });
  return data;
}