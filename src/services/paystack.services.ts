import { getPaystack } from "../mongodb/paystack";

export const initializeDeposit = async (email: string, userId: string, amount: number, callbackUrl?: string) => {
  const paystack = getPaystack();
  const { data } = await paystack.post("/transaction/initialize", {
    email,
    amount: amount * 100,
    metadata: { userId },
    ...(callbackUrl ? { callback_url: callbackUrl } : {}),
  });
  return {
    authorizationUrl: data.data.authorization_url as string,
    reference: data.data.reference as string,
  };
};

export const verifyDepositByReference = async (reference: string) => {
  const paystack = getPaystack();
  const { data } = await paystack.get(`/transaction/verify/${encodeURIComponent(reference)}`);
  return data?.data as {
    status?: string;
    amount?: number;
    reference?: string;
    metadata?: { userId?: string; userID?: string };
  };
};

export const chargeAuthorization = async (authCode: string, email: string, amount: number) => {
  const paystack = getPaystack();
  const { data } = await paystack.post("/transaction/charge_authorization", {
    authorization_code: authCode,
    email,
    amount: amount * 100,
  });
  return data;
};

export const createTransferRecipient = async (name: string, accountNumber: string, bankCode: string) => {
  const paystack = getPaystack();
  const { data } = await paystack.post("/transferrecipient", {
    type: "nuban",
    name,
    account_number: accountNumber,
    bank_code: bankCode,
    currency: "NGN",
  });
  return data.data.recipient_code as string;
};

export const transferFunds = async (
  recipientCode: string,
  amount: number,
  reason = "Payout",
  idempotencyKey?: string
) => {
  const paystack = getPaystack();
  const { data } = await paystack.post(
    "/transfer",
    {
      source: "balance",
      amount: amount * 100,
      recipient: recipientCode,
      reason,
    },
    idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined
  );
  return data;
};
