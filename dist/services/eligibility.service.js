"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferRequiredForGroupType = exports.assessGroupEligibility = void 0;
// MVP security: basic KYC is required for group creation/joining.
// Reliability score gates and higher tier gates are intentionally removed from MVP.
const minKyc = {
    low: 1,
    medium: 1,
    high: 1,
    premium: 1,
};
const assessGroupEligibility = (user, groupType) => {
    if (!user.basicKycCompleted) {
        return { ok: false, reason: "Complete Basic KYC to use Ajo groups" };
    }
    if (user.kycTier < minKyc[groupType]) {
        return { ok: false, reason: `KYC tier must be at least ${minKyc[groupType]}` };
    }
    return { ok: true };
};
exports.assessGroupEligibility = assessGroupEligibility;
const bufferRequiredForGroupType = (groupType) => groupType === "medium" || groupType === "high" || groupType === "premium";
exports.bufferRequiredForGroupType = bufferRequiredForGroupType;
