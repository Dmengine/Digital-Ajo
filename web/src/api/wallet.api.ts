import { api } from "./client";

const createIdempotencyKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `wd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export async function initDeposit(amount: number): Promise<{
  success: boolean;
  paymentURL: string;
  reference: string;
}> {
  const { data } = await api.post("/wallet/deposit/init", { amount });
  return data;
}

export async function verifyDeposit(reference: string): Promise<{
  success: boolean;
  settled: boolean;
  message: string;
}> {
  const { data } = await api.post("/wallet/deposit/verify", { reference });
  return data;
}

export type WalletTransaction = {
  _id: string;
  type: "deposit" | "withdrawal" | "auto-debit" | "payout" | "fee" | "reversal";
  amount: number;
  walletType: "main" | "locked" | "ajo";
  status: "success" | "failed";
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export async function getWalletTransactions(limit = 20): Promise<{
  success: boolean;
  transactions: WalletTransaction[];
}> {
  const { data } = await api.get("/wallet/transactions", { params: { limit } });
  return data;
}

export async function withdraw(amount: number): Promise<{ success: boolean; message: string }> {
  const idempotencyKey = createIdempotencyKey();
  const { data } = await api.post(
    "/wallet/withdraw",
    { amount, idempotencyKey },
    { headers: { "x-idempotency-key": idempotencyKey } }
  );
  return data;
}

