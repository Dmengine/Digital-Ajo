import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Plus, ShieldCheck, Wallet, Users } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useQuery } from "@tanstack/react-query";
import { me as fetchMe } from "../api/auth.api";

function Card({
  title,
  value,
  icon,
  children,
}: {
  title: string;
  value?: string;
  icon: ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-sm dark:bg-slate-900/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</div>
          {value ? <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</div> : null}
        </div>
        <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-300">{icon}</div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();

  const { data: meData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
  });

  const basicKycCompleted = meData?.user?.basicKycCompleted ?? user?.basicKycCompleted ?? false;
  const kycTier = meData?.user?.kycTier ?? user?.kycTier ?? 1;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-emerald-500/10 to-amber-500/10 p-6 shadow-sm dark:bg-slate-900/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Welcome back</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
              {user?.name ?? "Member"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
              MVP Mode
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Main Wallet (MVP)" value="₦0" icon={<Wallet size={18} />}>
          <div className="flex gap-3">
            <Link to="/wallet" className="text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:underline">
              Deposit
            </Link>
            <Link to="/wallet" className="text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline">
              Withdraw
            </Link>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Wallet totals are available once we add a profile endpoint.
          </div>
        </Card>

        <Card
          title="KYC Status (MVP)"
          value={basicKycCompleted ? `Tier ${kycTier}` : "Not verified"}
          icon={<ShieldCheck size={18} />}
        >
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {basicKycCompleted ? "You can create and join groups." : "Complete Tier 1 KYC to use groups."}
          </div>
          {!basicKycCompleted ? (
            <div className="mt-3">
              <Link
                to="/profile"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Complete KYC
              </Link>
            </div>
          ) : null}
        </Card>

        <Card title="Your Groups" icon={<Users size={18} />}>
          <div className="mt-1 flex flex-wrap gap-2">
            <Link to="/groups/browse" className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
              Browse Groups
            </Link>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Create/join flows connect to the backend endpoints.
          </div>
        </Card>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-sm dark:bg-slate-900/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Quick actions</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Start contributing in seconds.</div>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
            <Plus size={18} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/groups/browse" className="rounded-xl border border-white/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/70 dark:bg-slate-950/30 dark:text-white dark:hover:bg-slate-950/45">
            Browse groups
          </Link>
          <Link to="/wallet" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
            Deposit / Withdraw
          </Link>
        </div>
      </section>
    </div>
  );
}

