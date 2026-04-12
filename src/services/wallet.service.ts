import mongoose from "mongoose";
import { UserModel } from "../models/user.model";
import { ContributionModel } from "../models/contribution.model";
import { TransactionModel } from "../models/transaction.model";
import { HttpError } from "../errors/HttpError";

export type MainWallet = "main";

function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: number }).code === 11000;
}

function isTransientTransactionError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;

  const maybeError = e as {
    code?: number;
    errorLabels?: string[];
    errorLabelSet?: Set<string>;
  };

  const labels = Array.isArray(maybeError.errorLabels) ? maybeError.errorLabels : [];
  const labelSet = maybeError.errorLabelSet;

  return (
    maybeError.code === 112 ||
    labels.includes("TransientTransactionError") ||
    labels.includes("UnknownTransactionCommitResult") ||
    Boolean(labelSet?.has("TransientTransactionError") || labelSet?.has("UnknownTransactionCommitResult"))
  );
}

async function inSession<T>(work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (e) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      if (attempt < maxAttempts && isTransientTransactionError(e)) {
        continue;
      }

      throw e;
    } finally {
      session.endSession();
    }
  }

  throw new Error("Transaction failed after retry attempts");
}

/** General-purpose credit (no Paystack idempotency). Prefer applyPaystackDeposit for webhooks. */
export const creditWallet = async (
  userId: string,
  amount: number,
  _wallet: MainWallet = "main",
  metadata?: Record<string, unknown>
) => {
  const user = await inSession(async (session) => {
    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { "wallets.main": amount } },
      { new: true, session }
    );
    if (!updated) throw new HttpError(404, "User not found");

    await TransactionModel.create(
      [
        {
          user: userId,
          type: "deposit",
          amount,
          walletType: "main",
          status: "success",
          metadata,
        },
      ],
      { session }
    );

    return updated;
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

  let duplicate = false;

  await inSession(async (session) => {
    try {
      await TransactionModel.create(
        [
          {
            user: userId,
            type: "deposit",
            amount,
            walletType: "main",
            status: "success",
            metadata: { paystackReference: ref, source: "paystack_webhook" },
          },
        ],
        { session }
      );
    } catch (e: unknown) {
      if (isDuplicateKeyError(e)) {
        duplicate = true;
        return;
      }
      throw e;
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { "wallets.main": amount } },
      { new: true, session }
    );
    if (!user) throw new HttpError(404, "User not found");
  });

  return { duplicate };
};

export const reverseWalletDebit = async (userId: string, amount: number, metadata?: Record<string, unknown>) => {
  const user = await inSession(async (session) => {
    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { "wallets.main": amount } },
      { new: true, session }
    );
    if (!updated) throw new HttpError(404, "User not found");

    await TransactionModel.create(
      [
        {
          user: userId,
          type: "reversal",
          amount,
          walletType: "main",
          status: "success",
          metadata,
        },
      ],
      { session }
    );
    return updated;
  });

  return user;
};

export const debitWallet = async (
  userId: string,
  amount: number,
  _wallet: MainWallet = "main",
  metadata?: Record<string, unknown>
) => {
  const user = await inSession(async (session) => {
    const updated = await UserModel.findOneAndUpdate(
      { _id: userId, "wallets.main": { $gte: amount } },
      { $inc: { "wallets.main": -amount } },
      { new: true, session }
    );
    if (!updated) {
      const exists = await UserModel.findById(userId).session(session).lean();
      if (!exists) throw new HttpError(404, "User not found");
      throw new HttpError(400, "Insufficient balance");
    }

    await TransactionModel.create(
      [
        {
          user: userId,
          type: "withdrawal",
          amount,
          walletType: "main",
          status: "success",
          metadata,
        },
      ],
      { session }
    );
    return updated;
  });

  return user;
};

export const withdrawWalletIdempotent = async (
  userId: string,
  amount: number,
  idempotencyKey?: string
): Promise<{ user: Awaited<ReturnType<typeof UserModel.findById>>; duplicate: boolean }> => {
  let duplicate = false;

  const user = await inSession(async (session) => {
    const key = idempotencyKey?.trim();
    if (key) {
      const existing = await TransactionModel.findOne({
        user: userId,
        type: "withdrawal",
        "metadata.idempotencyKey": key,
      })
        .session(session)
        .lean();

      if (existing) {
        const currentUser = await UserModel.findById(userId).session(session);
        if (!currentUser) throw new HttpError(404, "User not found");
        duplicate = true;
        return currentUser;
      }
    }

    const updated = await UserModel.findOneAndUpdate(
      { _id: userId, "wallets.main": { $gte: amount } },
      { $inc: { "wallets.main": -amount } },
      { new: true, session }
    );
    if (!updated) {
      const exists = await UserModel.findById(userId).session(session).lean();
      if (!exists) throw new HttpError(404, "User not found");
      throw new HttpError(400, "Insufficient balance");
    }

    await TransactionModel.create(
      [
        {
          user: userId,
          type: "withdrawal",
          amount,
          walletType: "main",
          status: "success",
          metadata: key ? { idempotencyKey: key } : undefined,
        },
      ],
      { session }
    );

    return updated;
  });

  return { user, duplicate };
};

export const attachWithdrawalTransferMetadata = async (
  userId: string,
  idempotencyKey: string,
  transferData: Record<string, unknown>
) => {
  await TransactionModel.updateOne(
    {
      user: userId,
      type: "withdrawal",
      "metadata.idempotencyKey": idempotencyKey,
    },
    {
      $set: {
        "metadata.transfer": transferData,
      },
    }
  );
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
