import type { GroupRiskType } from "../models/groupAjo.model";
import type { KycTier } from "../models/user.model";

export type EligibilityResult = { ok: true } | { ok: false; reason: string };

type UserEligibilityInput = {
  kycTier: KycTier;
  reliabilityScore: number;
  completedAjoCycles: number;
};

const minScore: Record<GroupRiskType, number> = {
  low: 60,
  medium: 75,
  high: 85,
  premium: 90,
};

const minKyc: Record<GroupRiskType, KycTier> = {
  low: 1,
  medium: 1,
  high: 2,
  premium: 3,
};

const minCompletedCycles: Record<GroupRiskType, number> = {
  low: 0,
  medium: 1,
  high: 2,
  premium: 0,
};

export const assessGroupEligibility = (user: UserEligibilityInput, groupType: GroupRiskType): EligibilityResult => {
  if (user.reliabilityScore < minScore[groupType]) {
    return { ok: false, reason: `Reliability score must be at least ${minScore[groupType]}` };
  }
  if (user.kycTier < minKyc[groupType]) {
    return { ok: false, reason: `KYC tier must be at least ${minKyc[groupType]}` };
  }
  if (user.completedAjoCycles < minCompletedCycles[groupType]) {
    return {
      ok: false,
      reason: `Requires at least ${minCompletedCycles[groupType]} completed Ajo cycle(s)`,
    };
  }
  return { ok: true };
};

export const bufferRequiredForGroupType = (groupType: GroupRiskType): boolean =>
  groupType === "medium" || groupType === "high" || groupType === "premium";
