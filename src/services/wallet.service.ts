import { UserModel } from "../models/user.model";
import { ContributionModel } from "../models/contribution.model";
import { TransactionModel } from "../models/transaction.model";
import { HttpError } from "../errors/HttpError";

export type MainWallet = "main";

function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: number }).code === 11000;
}

/** General-purpose credit (no Paystack idempotency). Prefer applyPaystackDeposit for webhooks. */
export const creditWallet = async (
  userId: string,
  amount: number,
  _wallet: MainWallet = "main",
  metadata?: Record<string, unknown>
) => {
  const user = await UserModel.findByIdAndUpdate(userId, { $inc: { "wallets.main": amount } }, { new: true });
  if (!user) throw new HttpError(404, "User not found");
  await TransactionModel.create({
    user: userId,
    type: "deposit",
    amount,
    walletType: "main",
    status: "success",
    metadata,
  });
  return user;
};

/**
 * Idempotent Paystack deposit: unique index on metadata.paystackReference prevents double-credit under concurrency.
 * Ledger row is inserted first; balance updates only if insert succeeds.
 */
export const applyPaystackDeposit = async (
  userId: string,
  amount: number,
  paystackReference: string
): Promise<{ duplicate: boolean }> => {
  const ref = paystackReference.trim();
  if (!ref) throw new HttpError(400, "Missing Paystack reference");

  try {
    await TransactionModel.create({
      user: userId,
      type: "deposit",
      amount,
      walletType: "main",
      status: "success",
      metadata: { paystackReference: ref, source: "paystack_webhook" },
    });
  } catch (e: unknown) {
    if (isDuplicateKeyError(e)) return { duplicate: true };
    throw e;
  }

  const user = await UserModel.findByIdAndUpdate(userId, { $inc: { "wallets.main": amount } }, { new: true });
  if (!user) {
    await TransactionModel.deleteOne({ "metadata.paystackReference": ref });
    throw new HttpError(404, "User not found");
  }

  return { duplicate: false };
};

export const reverseWalletDebit = async (userId: string, amount: number, metadata?: Record<string, unknown>) => {
  const user = await UserModel.findByIdAndUpdate(userId, { $inc: { "wallets.main": amount } }, { new: true });
  if (!user) throw new HttpError(404, "User not found");
  await TransactionModel.create({
    user: userId,
    type: "reversal",
    amount,
    walletType: "main",
    status: "success",
    metadata,
  });
  return user;
};

export const debitWallet = async (userId: string, amount: number, _wallet: MainWallet = "main") => {
  const user = await UserModel.findOneAndUpdate(
    { _id: userId, "wallets.main": { $gte: amount } },
    { $inc: { "wallets.main": -amount } },
    { new: true }
  );
  if (!user) {
    const exists = await UserModel.findById(userId).lean();
    if (!exists) throw new HttpError(404, "User not found");
    throw new HttpError(400, "Insufficient balance");
  }
  await TransactionModel.create({
    user: userId,
    type: "withdrawal",
    amount,
    walletType: "main",
    status: "success",
  });
  return user;
};

export const recordContribution = async (
  groupAjoId: string,
  userId: string,
  amount: number,
  cycle: number,
  turn: number
) => {
  return ContributionModel.create({
    groupAjo: groupAjoId,
    user: userId,
    amount,
    cycle,
    turn,
    status: "completed",
  });
};
