import { runContributionCycle } from "../services/contributionCycle.service";

let timer: NodeJS.Timeout | null = null;

export const startContributionCycleJob = () => {
  if (timer) return;

  const intervalMinutesRaw = Number(process.env.CONTRIBUTION_JOB_INTERVAL_MINUTES);
  const intervalMinutes = Number.isFinite(intervalMinutesRaw) && intervalMinutesRaw >= 1 ? intervalMinutesRaw : 30;
  const intervalMs = Math.floor(intervalMinutes * 60 * 1000);

  const tick = async () => {
    try {
      await runContributionCycle(new Date());
    } catch (e) {
      console.error("[contribution-cycle-job] tick failed", e);
    }
  };

  void tick();
  timer = setInterval(() => {
    void tick();
  }, intervalMs);
};
