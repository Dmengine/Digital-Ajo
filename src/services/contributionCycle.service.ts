import mongoose from "mongoose";
import { GroupAjoModel } from "../models/groupAjo.model";
import { ContributionModel } from "../models/contribution.model";
import { UserModel } from "../models/user.model";
import { TransactionModel } from "../models/transaction.model";
import { notify } from "./notification.service";
import { chargeAuthorization } from "./paystack.services";
import { applyRestrictionIfNeeded, reliabilityEvents } from "./reliability.service";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const DEFAULT_GRACE_HOURS = 48;
const DEFAULT_PENALTY_RATE = 0.05;

function toObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

function frequencyMs(frequency: string): number {
  if (frequency === "daily") return DAY_MS;
  if (frequency === "weekly") return 7 * DAY_MS;
  return 30 * DAY_MS;
}

function computeRoundDueAt(startDate: Date, frequency: string, currentRound: number): Date {
  return new Date(startDate.getTime() + Math.max(0, currentRound - 1) * frequencyMs(frequency));
}

function graceHours(): number {
  const raw = Number(process.env.CONTRIBUTION_GRACE_HOURS);
  if (!Number.isFinite(raw) || raw < 24 || raw > 48) return DEFAULT_GRACE_HOURS;
  return Math.floor(raw);
}

function penaltyRate(): number {
  const raw = Number(process.env.CONTRIBUTION_PENALTY_RATE);
  if (!Number.isFinite(raw) || raw < 0 || raw > 0.5) return DEFAULT_PENALTY_RATE;
  return raw;
}

function autoDebitIdempotencyKey(
  mode: "wallet" | "card" | "fee",
  groupId: mongoose.Types.ObjectId,
  cycle: number,
  userId: mongoose.Types.ObjectId
): string {
  return `${mode}:${groupId.toString()}:${cycle}:${userId.toString()}`;
}

async function ensureRoundContributionRows(group: any, dueAt: Date, graceEndsAt: Date) {
  await Promise.all(
    group.members.map((member: any) =>
      ContributionModel.updateOne(
        {
          groupAjo: group._id,
          user: member.user,
          cycle: group.currentRound,
        },
        {
          $setOnInsert: {
            amount: group.contributionAmount,
            turn: member.order,
            status: "pending",
            dueAt,
            graceEndsAt,
            attempts: 0,
            roundStatusSnapshot: group.roundStatus,
          },
        },
        { upsert: true }
      )
    )
  );
}

async function debitWalletForContribution(
  userId: mongoose.Types.ObjectId,
  amount: number,
  metadata: Record<string, unknown>,
  idempotencyKey: string
) {
  const existing = await TransactionModel.findOne({
    user: userId,
    type: "auto-debit",
    status: "success",
    "metadata.idempotencyKey": idempotencyKey,
  }).lean();
  if (existing) return true;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const user = await UserModel.findOneAndUpdate(
      { _id: userId, "wallets.main": { $gte: amount } },
      { $inc: { "wallets.main": -amount } },
      { new: true, session }
    );
    if (!user) {
      await session.abortTransaction();
      return false;
    }

    await TransactionModel.create(
      [
        {
          user: userId,
          type: "auto-debit",
          amount,
          walletType: "main",
          status: "success",
          metadata: { ...metadata, idempotencyKey },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return true;
  } catch (e: unknown) {
    await session.abortTransaction();
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: number }).code === 11000) {
      return true;
    }
    throw e;
  } finally {
    session.endSession();
  }
}

async function tryCardAutoDebit(
  userId: mongoose.Types.ObjectId,
  amount: number,
  metadata: Record<string, unknown>,
  idempotencyKey: string
) {
  const existing = await TransactionModel.findOne({
    user: userId,
    type: "auto-debit",
    status: "success",
    "metadata.idempotencyKey": idempotencyKey,
  }).lean();
  if (existing) return true;

  const user = await UserModel.findById(userId).select("email +bankAccount.autoDebitAuthorizationCode");
  if (!user || !user.email || !user.bankAccount?.autoDebitAuthorizationCode) return false;

  try {
    const result = await chargeAuthorization(user.bankAccount.autoDebitAuthorizationCode, user.email, amount);
    const providerStatus =
      typeof result?.data?.status === "string" ? result.data.status.toLowerCase().trim() : "";
    const success = result?.status === true && providerStatus === "success";
    if (!success) return false;

    await TransactionModel.create({
      user: userId,
      type: "auto-debit",
      amount,
      walletType: "main",
      status: "success",
      metadata: { ...metadata, source: "paystack_card_fallback", idempotencyKey },
    });
    return true;
  } catch (e: unknown) {
    const reason = e instanceof Error ? e.message : "card_debit_failed";
    await TransactionModel.create({
      user: userId,
      type: "auto-debit",
      amount,
      walletType: "main",
      status: "failed",
      metadata: { ...metadata, source: "paystack_card_fallback", reason },
    });
    return false;
  }
}

async function sendRoundReminder(group: any, hoursLeft: 48 | 24) {
  await Promise.all(
    group.members.map((m: any) =>
      notify(
        m.user.toString(),
        `Contribution reminder (${hoursLeft}h): fund your wallet for group ${group.name}. Due at ${group.roundDueAt?.toISOString()}`
      )
    )
  );
}

async function advanceGroupRound(group: any) {
  group.roundStatus = "active";
  group.roundGraceEndsAt = undefined;
  group.lastRoundPauseReason = undefined;
  group.reminder24hSentAt = undefined;
  group.reminder48hSentAt = undefined;
  group.currentRound = Math.max(1, (group.currentRound ?? 1) + 1);
  group.roundDueAt = computeRoundDueAt(group.startDate, group.frequency, group.currentRound);
  await group.save();

  await Promise.all(
    group.members.map((m: any) => reliabilityEvents.completedCycle(m.user.toString()))
  );
  await Promise.all(
    group.members.map((m: any) => notify(m.user.toString(), `Round settled for group ${group.name}. Next round is now active.`))
  );
}

async function processDueGroup(group: any, now: Date) {
  const dueAt = group.roundDueAt ?? computeRoundDueAt(group.startDate, group.frequency, group.currentRound);
  const graceEndsAt = group.roundGraceEndsAt ?? new Date(dueAt.getTime() + graceHours() * HOUR_MS);
  await ensureRoundContributionRows(group, dueAt, graceEndsAt);

  const contributions = await ContributionModel.find({
    groupAjo: group._id,
    cycle: group.currentRound,
  });

  for (const c of contributions) {
    if (c.status === "completed") continue;

    const paid = await debitWalletForContribution(
      c.user as mongoose.Types.ObjectId,
      c.amount,
      {
        groupAjo: group._id.toString(),
        cycle: group.currentRound,
        stage: "due_date",
      },
      autoDebitIdempotencyKey("wallet", toObjectId(group._id), group.currentRound, c.user as mongoose.Types.ObjectId)
    );

    if (paid) {
      c.status = "completed";
      c.paidAt = now;
      c.note = "Paid on due date";
      await c.save();
      await reliabilityEvents.onTimePayment((c.user as mongoose.Types.ObjectId).toString());
      await notify((c.user as mongoose.Types.ObjectId).toString(), `Contribution paid successfully for group ${group.name}.`);
      continue;
    }

    c.status = "unpaid";
    c.lastAttemptAt = now;
    c.attempts = (c.attempts ?? 0) + 1;
    c.nextRetryAt = new Date(now.getTime() + 12 * HOUR_MS);
    c.note = "Insufficient wallet balance at due date";
    await c.save();
    await notify(
      (c.user as mongoose.Types.ObjectId).toString(),
      `Contribution unpaid for group ${group.name}. Fund wallet immediately to avoid default.`
    );
  }

  const notPaid = await ContributionModel.countDocuments({
    groupAjo: group._id,
    cycle: group.currentRound,
    status: { $in: ["pending", "unpaid", "failed", "defaulted"] },
  });

  if (notPaid > 0) {
    group.roundStatus = "paused";
    group.roundGraceEndsAt = graceEndsAt;
    group.lastRoundPauseReason = "Some members are unpaid";
    await group.save();

    await Promise.all(
      group.members.map((m: any) =>
        notify(
          m.user.toString(),
          `Round paused for group ${group.name}. Grace period is active until ${graceEndsAt.toISOString()}.`
        )
      )
    );
    return;
  }

  await advanceGroupRound(group);
}

async function applyPenaltyForDefault(userId: mongoose.Types.ObjectId, amount: number, groupId: mongoose.Types.ObjectId, cycle: number) {
  const fee = Math.max(100, Math.round(amount * penaltyRate()));
  const idempotencyKey = autoDebitIdempotencyKey("fee", groupId, cycle, userId);
  const existing = await TransactionModel.findOne({
    user: userId,
    type: "fee",
    "metadata.idempotencyKey": idempotencyKey,
  }).lean();
  if (existing) return fee;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const debited = await UserModel.findOneAndUpdate(
      { _id: userId, "wallets.main": { $gte: fee } },
      { $inc: { "wallets.main": -fee } },
      { new: true, session }
    );

    await TransactionModel.create(
      [
        {
          user: userId,
          type: "fee",
          amount: fee,
          walletType: "main",
          status: debited ? "success" : "failed",
          metadata: {
            reason: "contribution_default",
            groupAjo: groupId.toString(),
            cycle,
            idempotencyKey,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    if (!(typeof e === "object" && e !== null && "code" in e && (e as { code?: number }).code === 11000)) {
      throw e;
    }
  } finally {
    session.endSession();
  }

  return fee;
}

async function processPausedGroup(group: any, now: Date) {
  const contributions = await ContributionModel.find({
    groupAjo: group._id,
    cycle: group.currentRound,
    status: { $in: ["pending", "unpaid", "failed"] },
  });

  const graceEndsAt = group.roundGraceEndsAt ? new Date(group.roundGraceEndsAt) : new Date(now.getTime());

  for (const c of contributions) {
    if (c.nextRetryAt && c.nextRetryAt > now) continue;

    let paid = await debitWalletForContribution(
      c.user as mongoose.Types.ObjectId,
      c.amount,
      {
        groupAjo: group._id.toString(),
        cycle: group.currentRound,
        stage: "grace_wallet_retry",
      },
      autoDebitIdempotencyKey("wallet", toObjectId(group._id), group.currentRound, c.user as mongoose.Types.ObjectId)
    );
    let usedFallback = false;

    if (!paid) {
      paid = await tryCardAutoDebit(
        c.user as mongoose.Types.ObjectId,
        c.amount,
        {
          groupAjo: group._id.toString(),
          cycle: group.currentRound,
          stage: "grace_card_fallback",
        },
        autoDebitIdempotencyKey("card", toObjectId(group._id), group.currentRound, c.user as mongoose.Types.ObjectId)
      );
      usedFallback = paid;
    }

    c.attempts = (c.attempts ?? 0) + 1;
    c.lastAttemptAt = now;

    if (paid) {
      c.status = "completed";
      c.paidAt = now;
      c.usedAutoDebit = usedFallback;
      c.note = "Paid in grace period";
      c.nextRetryAt = undefined;
      await c.save();
      await reliabilityEvents.latePayment((c.user as mongoose.Types.ObjectId).toString());
      await notify((c.user as mongoose.Types.ObjectId).toString(), `Late contribution paid for group ${group.name}.`);
      continue;
    }

    if (now > graceEndsAt) {
      c.status = "defaulted";
      c.note = "Defaulted after grace period";
      const fee = await applyPenaltyForDefault(
        c.user as mongoose.Types.ObjectId,
        c.amount,
        toObjectId(group._id),
        group.currentRound
      );
      c.penaltyApplied = true;
      c.penaltyAmount = fee;
      c.nextRetryAt = undefined;
      await c.save();

      const uid = (c.user as mongoose.Types.ObjectId).toString();
      await reliabilityEvents.missedPayment(uid);
      const member = group.members.find((m: any) => m.user.toString() === uid);
      if (member?.hasReceived) {
        await reliabilityEvents.defaultAfterPayout(uid);
      }
      await applyRestrictionIfNeeded(uid);
      await notify(uid, `You defaulted in group ${group.name}. A penalty fee of ₦${fee} was applied.`);
      continue;
    }

    c.status = "unpaid";
    c.nextRetryAt = new Date(now.getTime() + 6 * HOUR_MS);
    c.note = "Still unpaid during grace period";
    await c.save();
  }

  const unresolvedCount = await ContributionModel.countDocuments({
    groupAjo: group._id,
    cycle: group.currentRound,
    status: { $in: ["pending", "unpaid", "failed", "defaulted"] },
  });

  // Strict payout guard: do not progress rounds unless everyone paid.
  if (unresolvedCount > 0) {
    if (now > graceEndsAt) {
      await Promise.all(
        group.members.map((m: any) =>
          notify(
            m.user.toString(),
            `Group ${group.name} remains paused. Payout blocked because at least one member defaulted.`
          )
        )
      );
    }
    return;
  }

  await advanceGroupRound(group);
}

export const runContributionCycle = async (now = new Date()) => {
  const groups = await GroupAjoModel.find({
    status: { $in: ["active", "open"] },
    isCompleted: false,
  });

  for (const group of groups) {
    if (!group.roundDueAt) {
      group.roundDueAt = computeRoundDueAt(group.startDate, group.frequency, group.currentRound);
      await group.save();
    }

    const dueAt = group.roundDueAt;
    const msToDue = dueAt.getTime() - now.getTime();

    if (group.roundStatus === "active") {
      if (!group.reminder48hSentAt && msToDue <= 48 * HOUR_MS && msToDue > 24 * HOUR_MS) {
        await sendRoundReminder(group, 48);
        group.reminder48hSentAt = now;
        await group.save();
      }

      if (!group.reminder24hSentAt && msToDue <= 24 * HOUR_MS && msToDue > 0) {
        await sendRoundReminder(group, 24);
        group.reminder24hSentAt = now;
        await group.save();
      }

      if (msToDue <= 0) {
        await processDueGroup(group, now);
      }
      continue;
    }

    if (group.roundStatus === "paused") {
      await processPausedGroup(group, now);
    }
  }
};
