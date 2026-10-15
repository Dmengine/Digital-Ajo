import axios from "axios";
import { getPaystack } from "../mongodb/paystack";
import { HttpError } from "../errors/HttpError";

export type ResolvedBankAccount = {
  accountNumber: string;
  accountName: string;
};

/**
 * Looks up the real account holder name for a NUBAN account via Paystack's
 * GET /bank/resolve. This is the only Paystack call the platform makes:
 * ContriPay never holds, collects or transfers user funds.
 */
export const resolveBankAccount = async (accountNumber: string, bankCode: string): Promise<ResolvedBankAccount> => {
  const paystack = getPaystack();
  try {
    const { data } = await paystack.get("/bank/resolve", {
      params: { account_number: accountNumber, bank_code: bankCode },
    });
    const accountName = typeof data?.data?.account_name === "string" ? data.data.account_name.trim() : "";
    const resolvedNumber = typeof data?.data?.account_number === "string" ? data.data.account_number.trim() : "";
    if (data?.status !== true || !accountName || resolvedNumber !== accountNumber) {
      throw new HttpError(400, "Could not confirm this bank account. Check the account number and bank.");
    }
    return { accountNumber: resolvedNumber, accountName };
  } catch (err: unknown) {
    if (err instanceof HttpError) throw err;
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 400 || status === 404 || status === 422) {
      throw new HttpError(400, "Could not confirm this bank account. Check the account number and bank.");
    }
    throw new HttpError(502, "Bank account confirmation is temporarily unavailable. Try again shortly.");
  }
};

export type Bank = { name: string; code: string };

const BANK_LIST_TTL_MS = 24 * 60 * 60 * 1000;
let bankListCache: { banks: Bank[]; fetchedAt: number } | null = null;

/** Nigerian bank names + codes (read-only), needed so users can pick a bank for account resolve. */
export const listBanks = async (): Promise<Bank[]> => {
  if (bankListCache && Date.now() - bankListCache.fetchedAt < BANK_LIST_TTL_MS) return bankListCache.banks;
  const paystack = getPaystack();
  try {
    const { data } = await paystack.get("/bank", { params: { country: "nigeria", currency: "NGN", perPage: 500 } });
    const rows: unknown[] = Array.isArray(data?.data) ? data.data : [];
    const banks = rows
      .map((b) => b as { name?: unknown; code?: unknown; active?: unknown })
      .filter((b) => typeof b.name === "string" && typeof b.code === "string" && b.active !== false)
      .map((b) => ({ name: (b.name as string).trim(), code: (b.code as string).trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
    bankListCache = { banks, fetchedAt: Date.now() };
    return banks;
  } catch {
    throw new HttpError(502, "Bank list is temporarily unavailable. Try again shortly.");
  }
};
