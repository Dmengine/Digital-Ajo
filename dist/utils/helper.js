"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isContributionDueToday = void 0;
const isContributionDueToday = (startDate, frequency) => {
    const today = new Date();
    if (frequency === "daily")
        return true;
    if (frequency === "weekly")
        return today.getDay() === new Date(startDate).getDay();
    if (frequency === "monthly")
        return today.getDate() === new Date(startDate).getDate();
    return false;
};
exports.isContributionDueToday = isContributionDueToday;
