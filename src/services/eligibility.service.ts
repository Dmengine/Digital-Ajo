import type { GroupRiskType } from "../models/groupAjo.model";
import type { KycTier } from "../models/user.model";

export type EligibilityResult = { ok: true } | { ok: false; reason: string };

type UserEligibilityInput = {
  kycTier: KycTier;
  basicKycCompleted: boolean;
  reliabilityScore?: number;
  isRestricted?: boolean;
};

// MVP security: basic KYC is required for group creation/joining.
// Reliability score gates and higher tier gates are intentionally removed from MVP.
const minKyc: Record<GroupRiskType, KycTier> = {
  low: 1,
  medium: 1,
  high: 1,
  premium: 1,
};

export const assessGroupEligibility = (user: UserEligibilityInput, groupType: GroupRiskType): EligibilityResult => {
  if (user.isRestricted) {
    return { ok: false, reason: "Account is currently restricted from joining groups" };
  }

  const score = user.reliabilityScore ?? 100;
  if (score < 40) {
    return { ok: false, reason: "Reliability score is too low to join groups" };
  }
  if ((groupType === "high" || groupType === "premium") && score < 60) {
    return { ok: false, reason: "Reliability score must be at least 60 for high-value groups" };
  }

  if (!user.basicKycCompleted) {
    return { ok: false, reason: "Complete Basic KYC to use Ajo groups" };
  }
  if (user.kycTier < minKyc[groupType]) {
    return { ok: false, reason: `KYC tier must be at least ${minKyc[groupType]}` };
  }
  return { ok: true };
};

export const canTakeEarlyPayoutPosition = (
  reliabilityScore: number,
  order: number,
  totalMembers: number
): EligibilityResult => {
  if (reliabilityScore >= 60) return { ok: true };
  const earlyCutoff = Math.max(1, Math.ceil(totalMembers * 0.3));
  if (order <= earlyCutoff) {
    return { ok: false, reason: "Low reliability users cannot take early payout positions" };
  }
  return { ok: true };
};
