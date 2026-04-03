import { api } from "./client";
import type { PublicUser } from "../store/authStore";

export type RegisterBody = {
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
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
  user: PublicUser & { basicKycCompleted?: boolean; kycTier?: number; profileImage?: string | null };
}> {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function submitTier1Kyc(values: {
  bvnOrNin: string;
  dob: string;
  residentialAddress: string;
  accountNumber: string;
  bankName: string;
}): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post("/auth/kyc/tier1", values);
  return data;
}

export async function uploadAvatar(imageDataUrl: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post("/auth/avatar", { imageDataUrl });
  return data;
}

