import { runContributionCycle } from "../services/contributionCycle.service";
import { acquireLock, releaseLock } from "../mongodb/redis";

let timer: NodeJS.Timeout | null = null;

export const startContributionCycleJob = () => {
  if (timer) return;

  const intervalMinutesRaw = Number(process.env.CONTRIBUTION_JOB_INTERVAL_MINUTES);
  const intervalMinutes = Number.isFinite(intervalMinutesRaw) && intervalMinutesRaw >= 1 ? intervalMinutesRaw : 30;
  const intervalMs = Math.floor(intervalMinutes * 60 * 1000);
  const lockKey = "jobs:contribution-cycle";

  const tick = async () => {
    const lockToken = await acquireLock(lockKey, Math.max(intervalMs - 1000, 30_000));
    if (!lockToken && process.env.REDIS_URL) return;

    try {
      await runContributionCycle(new Date());
    } catch (e) {
      console.error("[contribution-cycle-job] tick failed", e);
    } finally {
      if (lockToken) {
        await releaseLock(lockKey, lockToken);
      }
    }
  };

  void tick();
  timer = setInterval(() => {
    void tick();
  }, intervalMs);
};
