import type { GroupRiskType } from "../models/groupAjo.model";
import type { KycTier } from "../models/user.model";

export type EligibilityResult = { ok: true } | { ok: false; reason: string };

type UserEligibilityInput = {
  kycTier: KycTier;
  basicKycCompleted: boolean;
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
  if (!user.basicKycCompleted) {
    return { ok: false, reason: "Complete Basic KYC to use Ajo groups" };
  }
  if (user.kycTier < minKyc[groupType]) {
    return { ok: false, reason: `KYC tier must be at least ${minKyc[groupType]}` };
  }
  return { ok: true };
};

export const bufferRequiredForGroupType = (groupType: GroupRiskType): boolean =>
  groupType === "medium" || groupType === "high" || groupType === "premium";
