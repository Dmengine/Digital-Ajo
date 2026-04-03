"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferRequiredForGroupType = exports.assessGroupEligibility = void 0;
const minScore = {
    low: 60,
    medium: 75,
    high: 85,
    premium: 90,
};
const minKyc = {
    low: 1,
    medium: 1,
    high: 2,
    premium: 3,
};
const minCompletedCycles = {
    low: 0,
    medium: 1,
    high: 2,
    premium: 0,
};
const assessGroupEligibility = (user, groupType) => {
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
exports.assessGroupEligibility = assessGroupEligibility;
const bufferRequiredForGroupType = (groupType) => groupType === "medium" || groupType === "high" || groupType === "premium";
exports.bufferRequiredForGroupType = bufferRequiredForGroupType;
