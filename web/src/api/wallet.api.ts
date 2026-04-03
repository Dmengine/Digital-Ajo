import { api } from "./client";

export async function initDeposit(amount: number): Promise<{
  success: boolean;
  paymentURL?: string;
  depositedAmount?: number;
  message?: string;
}> {
  const { data } = await api.post("/wallet/deposit/init", { amount });
  return data;
}

export async function withdraw(amount: number): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post("/wallet/withdraw", { amount });
  return data;
}

