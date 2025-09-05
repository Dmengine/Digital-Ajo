export const isContributionDueToday = (startDate: Date, frequency: "daily"|"weekly"|"monthly") => {
  const today = new Date();
  if (frequency === "daily") return true;
  if (frequency === "weekly") return today.getDay() === new Date(startDate).getDay();
  if (frequency === "monthly") return today.getDate() === new Date(startDate).getDate();
  return false;
};