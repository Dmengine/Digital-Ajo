import { api } from "./client";

export type WalletTransaction = {
  _id: string;
  type: "deposit" | "withdrawal" | "auto-debit" | "payout" | "fee" | "reversal";
  amount: number;
  walletType: "main" | "locked" | "ajo";
  status: "success" | "failed";
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export const initDeposit = async (amount: number) => {
  const { data } = await api.post("/wallet/deposit/init", { amount });
  return data as { success: boolean; paymentURL: string; reference: string };
};

export const verifyDeposit = async (reference: string) => {
  const { data } = await api.post("/wallet/deposit/verify", { reference });
  return data as { success: boolean; settled: boolean; message: string };
};

export const withdraw = async (amount: number, idempotencyKey: string) => {
  const { data } = await api.post(
    "/wallet/withdraw",
    { amount, idempotencyKey },
    {
      headers: {
        "x-idempotency-key": idempotencyKey,
      },
    }
  );
  return data as { success: boolean; duplicate?: boolean; message: string };
};

export const getWalletTransactions = async (limit = 20) => {
  const { data } = await api.get("/wallet/transactions", { params: { limit } });
  return data as { success: boolean; transactions: WalletTransaction[] };
};
