import { api } from "./client";

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
