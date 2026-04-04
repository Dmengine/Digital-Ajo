"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferRequiredForGroupType = exports.canTakeEarlyPayoutPosition = exports.assessGroupEligibility = void 0;
// MVP security: basic KYC is required for group creation/joining.
// Reliability score gates and higher tier gates are intentionally removed from MVP.
const minKyc = {
    low: 1,
    medium: 1,
    high: 1,
    premium: 1,
};
const assessGroupEligibility = (user, groupType) => {
    var _a;
    if (user.isRestricted) {
        return { ok: false, reason: "Account is currently restricted from joining groups" };
    }
    const score = (_a = user.reliabilityScore) !== null && _a !== void 0 ? _a : 100;
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
exports.assessGroupEligibility = assessGroupEligibility;
const canTakeEarlyPayoutPosition = (reliabilityScore, order, totalMembers) => {
    if (reliabilityScore >= 60)
        return { ok: true };
    const earlyCutoff = Math.max(1, Math.ceil(totalMembers * 0.3));
    if (order <= earlyCutoff) {
        return { ok: false, reason: "Low reliability users cannot take early payout positions" };
    }
    return { ok: true };
};
exports.canTakeEarlyPayoutPosition = canTakeEarlyPayoutPosition;
const bufferRequiredForGroupType = (groupType) => groupType === "medium" || groupType === "high" || groupType === "premium";
exports.bufferRequiredForGroupType = bufferRequiredForGroupType;
