import mongoose from "mongoose";
import { GroupAjoModel } from "../models/groupAjo.model";
import { ContributionModel, type ContributionStatus } from "../models/contribution.model";
import { UserModel } from "../models/user.model";
import { HttpError } from "../errors/HttpError";
import { notify } from "./notification.service";
import { requireGroupMember } from "./groupMember.service";
import { applyRestrictionIfNeeded, reliabilityEvents } from "./reliability.service";

/**
 * Non-custodial round logic. Members transfer money directly to the round's recipient.
 * ContriPay never receives money. Only the group admin (group.createdBy) can record a
 * contribution as paid; a member's "I've sent my payment" only notifies the admin.
 */

export const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DEFAULT_GRACE_HOURS = 48;

/** Round 1 opens for payment (and membership locks) this long before the start date. */
export const ROUND_OPEN_LEAD_MS = 48 * HOUR_MS;

const UNCONFIRMED_STATUSES: ContributionStatus[] = ["pending", "marked_paid", "unpaid", "defaulted"];

type MemberLike = { user: mongoose.Types.ObjectId; order: number; hasReceived?: boolean };

function frequencyMs(frequency: string): number {
  if (frequency === "daily") return DAY_MS;
  if (frequency === "weekly") return 7 * DAY_MS;
  return 30 * DAY_MS;
}

export function computeRoundDueAt(startDate: Date, frequency: string, round: number): Date {
  return new Date(startDate.getTime() + Math.max(0, round - 1) * frequencyMs(frequency));
}

export function graceHours(): number {
  const raw = Number(process.env.CONTRIBUTION_GRACE_HOURS);
  if (!Number.isFinite(raw) || raw < 24 || raw > 48) return DEFAULT_GRACE_HOURS;
  return Math.floor(raw);
}

export function membershipLocksAt(group: { startDate: Date }): Date {
  return new Date(new Date(group.startDate).getTime() - ROUND_OPEN_LEAD_MS);
}

/** True while new members may still join or be added. */
export function isMembershipOpen(group: { status: string; startDate: Date }, now = new Date()): boolean {
  return group.status === "open" && now < membershipLocksAt(group);
}

export function recipientForRound<M extends MemberLike>(members: M[], round: number): M | undefined {
  return members.find((m) => m.order === round);
}

/**
 * Locks membership and opens round 1 once we're within ROUND_OPEN_LEAD_MS of the start date.
 * Groups with fewer than 2 members are cancelled (there is nobody to pay).
 */
export async function activateGroupIfDue(group: any, now: Date): Promise<boolean> {
  if (group.status !== "open" || now < membershipLocksAt(group)) return false;

  if (group.members.length < 2) {
    const cancelled = await GroupAjoModel.findOneAndUpdate(
      { _id: group._id, status: "open" },
      { $set: { status: "cancelled", lastRoundPauseReason: "Not enough members by the start date" } },
      { new: true }
    );
    if (cancelled) {
      await Promise.all(
        group.members.map((m: MemberLike) =>
          notify(m.user.toString(), `Group ${group.name} was cancelled: it needs at least 2 members.`)
        )
      );
    }
    return false;
  }

  const roundDueAt = computeRoundDueAt(group.startDate, group.frequency, 1);
  const activated = await GroupAjoModel.findOneAndUpdate(
    { _id: group._id, status: "open" },
    { $set: { status: "active", currentRound: 1, roundStatus: "active", roundDueAt } },
    { new: true }
  );
  if (!activated) return false;

  group.status = activated.status;
  group.currentRound = activated.currentRound;
  group.roundStatus = activated.roundStatus;
  group.roundDueAt = activated.roundDueAt;

  await ensureRoundContributionRows(group);
  await announceRound(group);
  return true;
}

/** Creates one contribution row per payer (every member except the round's recipient). */
export async function ensureRoundContributionRows(group: any) {
  const round: number = group.currentRound;
  const recipient = recipientForRound<MemberLike>(group.members, round);
  if (!recipient) return;

  const dueAt: Date = group.roundDueAt ?? computeRoundDueAt(group.startDate, group.frequency, round);
  const graceEndsAt = new Date(dueAt.getTime() + graceHours() * HOUR_MS);

  await Promise.all(
    group.members
      .filter((m: MemberLike) => !m.user.equals(recipient.user))
      .map((m: MemberLike) =>
        ContributionModel.updateOne(
          { groupAjo: group._id, user: m.user, cycle: round },
          {
            $setOnInsert: {
              amount: group.contributionAmount,
              recipient: recipient.user,
              turn: recipient.order,
              status: "pending",
              dueAt,
              graceEndsAt,
            },
          },
          { upsert: true }
        )
      )
  );
}

async function announceRound(group: any) {
  const recipient = recipientForRound<MemberLike>(group.members, group.currentRound);
  if (!recipient) return;
  const recipientUser = await UserModel.findById(recipient.user).select("name").lean();
  const recipientName = recipientUser?.name ?? "this round's recipient";
  const due = group.roundDueAt ? new Date(group.roundDueAt).toISOString() : "soon";

  await Promise.all(
    group.members.map((m: MemberLike) =>
      m.user.equals(recipient.user)
        ? notify(m.user.toString(), `Round ${group.currentRound} of ${group.name}: you are receiving this round. Members will pay you directly.`)
        : notify(
            m.user.toString(),
            `Round ${group.currentRound} of ${group.name}: send ₦${group.contributionAmount} directly to ${recipientName} by ${due}. The group admin will confirm your payment.`
          )
    )
  );
}

/**
 * If the admin has confirmed every payer for `round`, marks the recipient as received and
 * advances (or completes) the group. Atomic on currentRound so concurrent callers settle once.
 * Reliability points are awarded here (not on confirm) so an admin "undo" never has to reverse them.
 */
export async function settleRoundIfComplete(groupId: mongoose.Types.ObjectId | string, round: number, now = new Date()) {
  const group = await GroupAjoModel.findById(groupId);
  if (!group || group.status !== "active" || group.currentRound !== round) return false;

  const recipient = recipientForRound(group.members, round);
  if (!recipient) return false;

  const expectedPayers = group.members.length - 1;
  const confirmed = await ContributionModel.countDocuments({
    groupAjo: group._id,
    cycle: round,
    status: "confirmed",
  });
  if (confirmed < expectedPayers) return false;

  const isFinalRound = round >= group.members.length;
  const unsetRoundState = {
    roundGraceEndsAt: "",
    lastRoundPauseReason: "",
    reminder48hSentAt: "",
    reminder24hSentAt: "",
  };

  let update: Record<string, unknown>;
  if (isFinalRound) {
    update = {
      $set: {
        "members.$[r].hasReceived": true,
        "members.$[r].receivedAt": now,
        status: "completed",
        roundStatus: "completed",
        isCompleted: true,
        completedAt: now,
      },
      $unset: unsetRoundState,
    };
  } else {
    // Keep the original schedule, but never open a round with less than the reminder window
    // left (e.g. after a long pause caused by a default).
    const scheduled = computeRoundDueAt(group.startDate, group.frequency, round + 1);
    const earliest = new Date(now.getTime() + ROUND_OPEN_LEAD_MS);
    update = {
      $set: {
        "members.$[r].hasReceived": true,
        "members.$[r].receivedAt": now,
        currentRound: round + 1,
        roundStatus: "active",
        roundDueAt: scheduled > earliest ? scheduled : earliest,
      },
      $unset: unsetRoundState,
    };
  }

  const settled = await GroupAjoModel.findOneAndUpdate({ _id: group._id, currentRound: round, status: "active" }, update, {
    new: true,
    arrayFilters: [{ "r.order": round }],
  });
  if (!settled) return false;

  // Score each confirmed payment once. Defaults were already penalised when grace ended.
  const rows = await ContributionModel.find({ groupAjo: group._id, cycle: round, status: "confirmed" })
    .select("user dueAt confirmedAt defaultedAt")
    .lean();
  for (const row of rows) {
    if (row.defaultedAt) continue;
    const onTime = !row.dueAt || (row.confirmedAt ?? now) <= row.dueAt;
    if (onTime) await reliabilityEvents.onTimePayment(row.user.toString());
    else await reliabilityEvents.latePayment(row.user.toString());
  }

  if (isFinalRound) {
    await Promise.all(settled.members.map((m) => reliabilityEvents.completedCycle(m.user.toString())));
    await Promise.all(
      settled.members.map((m) => notify(m.user.toString(), `Group ${settled.name} is complete. Every member has received their turn.`))
    );
    return true;
  }

  await notify(recipient.user.toString(), `The admin has confirmed every contribution for round ${round} of ${settled.name}.`);
  await ensureRoundContributionRows(settled);
  await announceRound(settled);
  return true;
}

async function loadActiveRound(groupId: string, userId: string) {
  const { group, isAdmin } = await requireGroupMember(groupId, userId);
  if (group.status !== "active" || (group.roundStatus !== "active" && group.roundStatus !== "paused")) {
    throw new HttpError(400, "This group has no round in progress");
  }
  const recipient = recipientForRound(group.members, group.currentRound);
  if (!recipient) throw new HttpError(409, "Round recipient could not be determined");
  await ensureRoundContributionRows(group);
  return { group, recipient, isAdmin };
}

async function loadActiveRoundAsAdmin(groupId: string, adminId: string, payerId: string, action: string) {
  if (!mongoose.isValidObjectId(payerId)) throw new HttpError(400, "Invalid user ID");
  const loaded = await loadActiveRound(groupId, adminId);
  if (false) throw new HttpError(403, `Only the group admin can ${action}`);
  return loaded;
}

/**
 * Member reports they have sent their transfer. This only notifies the admin and shows
 * "awaiting admin confirmation"; it does NOT count as paid.
 */
export async function markContributionSent(groupId: string, payerId: string, payerReference?: string, now = new Date()) {
  const { group, recipient } = await loadActiveRound(groupId, payerId);
  if (recipient.user.toString() === payerId) {
    throw new HttpError(400, "You are receiving this round, so you don't pay into it");
  }

  const set: Record<string, unknown> = { status: "marked_paid", markedPaidAt: now, note: "Member says payment was sent" };
  const unset: Record<string, unknown> = {};
  if (payerReference?.trim()) set.payerReference = payerReference.trim();
  else unset.payerReference = "";

  const updated = await ContributionModel.findOneAndUpdate(
    { groupAjo: group._id, cycle: group.currentRound, user: payerId, status: { $in: ["pending", "unpaid", "defaulted"] } },
    Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set },
    { new: true }
  );
  if (!updated) {
    const existing = await ContributionModel.findOne({ groupAjo: group._id, cycle: group.currentRound, user: payerId }).lean();
    if (existing?.status === "marked_paid" || existing?.status === "confirmed") return existing;
    throw new HttpError(404, "No contribution found for you in this round");
  }

  const adminId = group.createdBy.toString();
  if (adminId !== payerId) {
    const payer = await UserModel.findById(payerId).select("name").lean();
    await notify(
      adminId,
      `${payer?.name ?? "A member"} says they sent ₦${updated.amount} to this round's recipient in ${group.name}. Confirm it once you've checked.`
    );
  }
  return updated.toObject();
}

/** Only the group admin can record a member's contribution as paid. */
export async function confirmContribution(groupId: string, adminId: string, payerId: string, now = new Date()) {
  const { group } = await loadActiveRoundAsAdmin(groupId, adminId, payerId, "confirm payments");

  const updated = await ContributionModel.findOneAndUpdate(
    { groupAjo: group._id, cycle: group.currentRound, user: payerId, status: { $ne: "confirmed" } },
    { $set: { status: "confirmed", confirmedAt: now, confirmedBy: adminId, note: "Confirmed by group admin" }, $unset: { unconfirmedAt: "" } },
    { new: true }
  );
  if (!updated) {
    const existing = await ContributionModel.findOne({ groupAjo: group._id, cycle: group.currentRound, user: payerId }).lean();
    if (existing?.status === "confirmed") return { contribution: existing, roundSettled: false };
    throw new HttpError(404, "That member has no contribution in this round");
  }

  if (payerId !== adminId) {
    await notify(payerId, `The admin of ${group.name} confirmed your contribution for round ${group.currentRound}.`);
  }
  const roundSettled = await settleRoundIfComplete(group._id, group.currentRound, now);
  return { contribution: updated.toObject(), roundSettled };
}

/** Admin undoes a mistaken confirmation: back to unpaid, member is notified. */
export async function unconfirmContribution(groupId: string, adminId: string, payerId: string, now = new Date()) {
  const { group } = await loadActiveRoundAsAdmin(groupId, adminId, payerId, "undo a confirmation");

  const updated = await ContributionModel.findOneAndUpdate(
    { groupAjo: group._id, cycle: group.currentRound, user: payerId, status: "confirmed" },
    {
      $set: { status: "unpaid", unconfirmedAt: now, note: "Admin removed the confirmation" },
      $unset: { confirmedAt: "", confirmedBy: "", markedPaidAt: "" },
    },
    { new: true }
  );
  if (!updated) throw new HttpError(400, "Only a confirmed contribution in the current round can be undone");

  await notify(
    payerId,
    `The admin of ${group.name} removed the confirmation of your ₦${updated.amount} contribution for round ${group.currentRound}. It is now unpaid. Contact the admin if you have already paid.`
  );
  return updated.toObject();
}

export async function getCurrentRound(groupId: string, viewerId: string) {
  const { group, isAdmin } = await requireGroupMember(groupId, viewerId);
  const base = {
    groupId: group._id,
    groupName: group.name,
    groupStatus: group.status,
    isAdmin,
    totalRounds: group.members.length,
    membershipLocksAt: membershipLocksAt(group),
  };

  if (group.status !== "active") return { ...base, round: null };

  const recipient = recipientForRound(group.members, group.currentRound);
  if (!recipient) return { ...base, round: null };
  await ensureRoundContributionRows(group);

  const [recipientUser, contributions] = await Promise.all([
    UserModel.findById(recipient.user).select("name username bankAccount").lean(),
    ContributionModel.find({ groupAjo: group._id, cycle: group.currentRound })
      .populate("user", "name username")
      .lean(),
  ]);

  const bank = recipientUser?.bankAccount;
  const allPayments = contributions.map((c) => {
    const payer = c.user as unknown as { _id: mongoose.Types.ObjectId; name?: string; username?: string };
    return {
      userId: payer._id.toString(),
      name: payer.name ?? null,
      username: payer.username ?? null,
      status: c.status as ContributionStatus,
      markedPaidAt: c.markedPaidAt ?? null,
      confirmedAt: c.confirmedAt ?? null,
      unconfirmedAt: c.unconfirmedAt ?? null,
      payerReference: c.payerReference ?? null,
    };
  });

  return {
    ...base,
    round: {
      number: group.currentRound,
      status: group.roundStatus,
      amount: group.contributionAmount,
      dueAt: group.roundDueAt ?? null,
      graceEndsAt: group.roundGraceEndsAt ?? null,
      isRecipient: recipient.user.toString() === viewerId,
      recipient: {
        userId: recipient.user.toString(),
        name: recipientUser?.name ?? null,
        username: recipientUser?.username ?? null,
        bankAccount: bank?.accountNumber
          ? {
              accountNumber: bank.accountNumber,
              accountName: bank.accountName ?? null,
              bankName: bank.bankName ?? null,
              confirmed: Boolean(bank.confirmedAt),
            }
          : null,
      },
      progress: {
        confirmed: allPayments.filter((p) => p.status === "confirmed").length,
        total: allPayments.length,
      },
      // The per-member checklist is for the admin only; members see their own status.
      payments: isAdmin ? allPayments : [],
      myPayment: allPayments.find((p) => p.userId === viewerId) ?? null,
    },
  };
}

export async function applyDefault(group: any, contributionId: mongoose.Types.ObjectId, now: Date) {
  const defaulted = await ContributionModel.findOneAndUpdate(
    // A row is defaulted (and penalised) at most once, even if it is re-marked later.
    { _id: contributionId, status: { $in: ["pending", "marked_paid", "unpaid"] }, defaultedAt: { $exists: false } },
    { $set: { status: "defaulted", defaultedAt: now, note: "Not confirmed by the admin by the end of the grace period" } },
    { new: true }
  );
  if (!defaulted) return false;

  const uid = defaulted.user.toString();
  await reliabilityEvents.missedPayment(uid);
  const member = group.members.find((m: MemberLike) => m.user.toString() === uid);
  if (member?.hasReceived) await reliabilityEvents.defaultAfterPayout(uid);
  await applyRestrictionIfNeeded(uid);
  // Reputation consequences only: ContriPay never takes money as a penalty.
  await notify(
    uid,
    `Your contribution for ${group.name} was not confirmed by the admin before the grace period ended and is marked as defaulted. Your reliability score was reduced. Pay the recipient and ask the admin to confirm.`
  );
  return true;
}

export { UNCONFIRMED_STATUSES };
