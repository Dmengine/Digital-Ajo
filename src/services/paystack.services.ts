import { getPaystack } from "../mongodb/paystack";

export const initializeDeposit = async (email: string, userId: string, amount: number) => {
  const paystack = getPaystack();
  const { data } = await paystack.post("/transaction/initialize", {
    email,
    amount: amount * 100,
    metadata: { userId },
  });
  return data.data.authorization_url as string;
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

export const transferFunds = async (recipientCode: string, amount: number, reason = "Payout") => {
  const paystack = getPaystack();
  const { data } = await paystack.post("/transfer", {
    source: "balance",
    amount: amount * 100,
    recipient: recipientCode,
    reason,
  });
  return data;
};
