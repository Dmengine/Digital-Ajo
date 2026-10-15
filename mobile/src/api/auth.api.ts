import { api } from "./client";
import type { AuthResponse, PublicUser } from "../types/auth";

export const login = async (emailOrUsername: string, password: string): Promise<AuthResponse> => {
  const { data } = await api.post("/auth/login", { emailOrUsername, password });
  return data as AuthResponse;
};

export const register = async (payload: {
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  consentAccepted: boolean;
}): Promise<AuthResponse> => {
  const { data } = await api.post("/auth/register", payload);
  return data as AuthResponse;
};

export const me = async (): Promise<{ success: boolean; user: PublicUser }> => {
  const { data } = await api.get("/auth/me");
  return data as { success: boolean; user: PublicUser };
};

export type Bank = { name: string; code: string };

export const listBanks = async (): Promise<{ success: boolean; banks: Bank[] }> => {
  const { data } = await api.get("/auth/banks");
  return data;
};

export const submitTier1Kyc = async (payload: {
  bvnOrNin: string;
  identityType?: "bvn" | "nin";
  dob: string;
  residentialAddress: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
}) => {
  const { data } = await api.post("/auth/kyc/tier1", payload);
  return data as { success: boolean; message: string; bankAccount: NonNullable<PublicUser["bankAccount"]> };
};
