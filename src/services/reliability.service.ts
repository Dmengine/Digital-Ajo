import { UserModel } from "../models/user.model";

const MAX_SCORE = 100;
const MIN_SCORE = 0;

function clampScore(v: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(v)));
}

async function adjustScore(userId: string, delta: number, extraUpdate: Record<string, unknown> = {}) {
  const user = await UserModel.findById(userId).select("reliabilityScore");
  if (!user) return;

  const nextScore = clampScore((user.reliabilityScore ?? 100) + delta);
  await UserModel.updateOne({ _id: userId }, { $set: { reliabilityScore: nextScore }, ...extraUpdate });
}

export const reliabilityEvents = {
  onTimePayment: async (userId: string) => adjustScore(userId, 2),
  latePayment: async (userId: string) => adjustScore(userId, -5),
  missedPayment: async (userId: string) =>
    adjustScore(userId, -20, {
      $inc: { missedPaymentsCount: 1 },
    }),
  completedCycle: async (userId: string) =>
    adjustScore(userId, 10, {
      $inc: { completedAjoCycles: 1 },
    }),
  defaultAfterPayout: async (userId: string) =>
    adjustScore(userId, -50, {
      $inc: { defaultedPaymentsCount: 1 },
    }),
};

export const applyRestrictionIfNeeded = async (userId: string) => {
  const user = await UserModel.findById(userId).select("reliabilityScore defaultedPaymentsCount");
  if (!user) return;

  const score = user.reliabilityScore ?? 100;
  const defaults = user.defaultedPaymentsCount ?? 0;
  if (score < 40 || defaults >= 2) {
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          isRestricted: true,
          restrictionReason: "Repeated contribution defaults",
          restrictedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }
    );
  }
};
