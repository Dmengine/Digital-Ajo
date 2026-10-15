import { GroupAjoModel } from "../models/groupAjo.model";
import { ContributionModel } from "../models/contribution.model";
import { UserModel } from "../models/user.model";
import { notify } from "./notification.service";
import {
  HOUR_MS,
  activateGroupIfDue,
  applyDefault,
  ensureRoundContributionRows,
  graceHours,
  recipientForRound,
  settleRoundIfComplete,
} from "./round.service";

/**
 * Periodic job. It only reminds, pauses and records defaults: no money is ever
 * debited, charged or withheld. Members pay each other directly.
 */

async function sendRoundReminder(group: any, hoursLeft: 48 | 24) {
  const recipient = recipientForRound<{ user: any; order: number }>(group.members, group.currentRound);
  if (!recipient) return;
  const recipientUser = await UserModel.findById(recipient.user).select("name").lean();
  const due = group.roundDueAt?.toISOString();

  const outstanding = await ContributionModel.find({
    groupAjo: group._id,
    cycle: group.currentRound,
    status: { $in: ["pending", "unpaid"] },
  })
    .select("user amount")
    .lean();
  await Promise.all(
    outstanding.map((c) =>
      notify(
        c.user.toString(),
        `Reminder (${hoursLeft}h): send ₦${c.amount} to ${recipientUser?.name ?? "this round's recipient"} for group ${group.name} by ${due}. The group admin will confirm it.`
      )
    )
  );

  const awaitingConfirmation = await ContributionModel.countDocuments({
    groupAjo: group._id,
    cycle: group.currentRound,
    status: "marked_paid",
  });
  if (awaitingConfirmation > 0) {
    await notify(
      group.createdBy.toString(),
      `Reminder: ${awaitingConfirmation} member(s) in ${group.name} say they've paid and are waiting for your confirmation.`
    );
  }
}

async function processDueRound(group: any, now: Date) {
  const dueAt: Date = group.roundDueAt;
  const graceEndsAt = new Date(dueAt.getTime() + graceHours() * HOUR_MS);

  await ContributionModel.updateMany(
    { groupAjo: group._id, cycle: group.currentRound, status: "pending" },
    { $set: { status: "unpaid", graceEndsAt, note: "Not reported as paid by the due date" } }
  );

  const paused = await GroupAjoModel.findOneAndUpdate(
    { _id: group._id, currentRound: group.currentRound, roundStatus: "active" },
    { $set: { roundStatus: "paused", roundGraceEndsAt: graceEndsAt, lastRoundPauseReason: "Some payments are not yet confirmed" } },
    { new: true }
  );
  if (!paused) return;

  const outstanding = await ContributionModel.find({
    groupAjo: group._id,
    cycle: group.currentRound,
    status: { $in: ["unpaid", "marked_paid"] },
  })
    .select("user status")
    .lean();

  await Promise.all(
    outstanding.map((c) =>
      notify(
        c.user.toString(),
        c.status === "unpaid"
          ? `Your contribution for ${group.name} is overdue. Pay the recipient directly before ${graceEndsAt.toISOString()} to avoid a default.`
          : `Your payment for ${group.name} is waiting for the admin's confirmation. The grace period ends ${graceEndsAt.toISOString()}.`
      )
    )
  );
  await notify(
    group.createdBy.toString(),
    `Round ${group.currentRound} of ${group.name} is past due. Confirm the members who have paid before ${graceEndsAt.toISOString()}.`
  );
}

async function processGraceExpiry(group: any, now: Date) {
  const graceEndsAt: Date | undefined = group.roundGraceEndsAt;
  if (!graceEndsAt || now <= graceEndsAt) return;

  const unconfirmed = await ContributionModel.find({
    groupAjo: group._id,
    cycle: group.currentRound,
    status: { $in: ["pending", "marked_paid", "unpaid"] },
  })
    .select("_id")
    .lean();

  let newlyDefaulted = 0;
  for (const c of unconfirmed) {
    if (await applyDefault(group, c._id, now)) newlyDefaulted += 1;
  }

  // Notify only on transitions so members aren't messaged on every job tick.
  if (newlyDefaulted > 0) {
    await Promise.all(
      group.members.map((m: any) =>
        notify(
          m.user.toString(),
          `Round ${group.currentRound} of ${group.name} stays paused until the admin has confirmed every payment.`
        )
      )
    );
  }
}

export const runContributionCycle = async (now = new Date()) => {
  const groups = await GroupAjoModel.find({ status: { $in: ["open", "active"] }, isCompleted: false });

  for (const group of groups) {
    if (group.status === "open") {
      const activated = await activateGroupIfDue(group, now);
      if (!activated) continue;
    }

    await ensureRoundContributionRows(group);
    if (await settleRoundIfComplete(group._id, group.currentRound, now)) continue;

    if (!group.roundDueAt) continue;
    const msToDue = group.roundDueAt.getTime() - now.getTime();

    if (group.roundStatus === "active") {
      if (!group.reminder48hSentAt && msToDue <= 48 * HOUR_MS && msToDue > 24 * HOUR_MS) {
        await sendRoundReminder(group, 48);
        await GroupAjoModel.updateOne({ _id: group._id }, { $set: { reminder48hSentAt: now } });
      }
      if (!group.reminder24hSentAt && msToDue <= 24 * HOUR_MS && msToDue > 0) {
        await sendRoundReminder(group, 24);
        await GroupAjoModel.updateOne({ _id: group._id }, { $set: { reminder24hSentAt: now } });
      }
      if (msToDue <= 0) await processDueRound(group, now);
      continue;
    }

    if (group.roundStatus === "paused") await processGraceExpiry(group, now);
  }
};
