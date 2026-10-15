import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Plus, ShieldCheck, Users, Zap, Link2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useQuery } from "@tanstack/react-query";
import { me as fetchMe } from "../api/auth.api";
import { browseGroups } from "../api/groups.api";
import { NonCustodialNotice } from "../components/NonCustodialNotice";

function Card({
  title,
  value,
  icon,
  children,
  accent = "primary",
}: {
  title: string;
  value?: string;
  icon: ReactNode;
  children?: React.ReactNode;
  accent?: "primary" | "secondary";
}) {
  const iconBg = accent === "secondary" ? "bg-[#40e56c]/10 text-[#40e56c]" : "bg-[#d6baff]/10 text-[#d6baff]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-semibold text-[#cdc2d7]">{title}</div>
          {value ? (
            <div className="mt-3 font-headline text-3xl font-extrabold text-[#e1e2e7]">
              {value}
            </div>
          ) : null}
        </div>
        <div className={`rounded-xl p-3 ${iconBg}`}>{icon}</div>
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

  const { data: groupsData } = useQuery({
    queryKey: ["groups", "browse", "dashboard-count"],
    queryFn: browseGroups,
  });

  const basicKycCompleted = meData?.user?.basicKycCompleted ?? user?.basicKycCompleted ?? false;
  const kycTier = meData?.user?.kycTier ?? user?.kycTier ?? 1;
  const bankConfirmed = meData?.user?.bankAccount?.confirmed ?? false;
  const activeGroups = groupsData?.groups?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <section className="relative rounded-lg border border-[#d6baff]/20 bg-linear-to-br from-[#d6baff]/10 via-[#ab73ff]/5 to-[#111417] p-8 shadow-lg overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#ab73ff]/10 blur-[60px] rounded-full"></div>
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#cdc2d7] font-semibold">Your ajo groups</div>
            <h2 className="mt-2 text-4xl font-headline font-extrabold text-[#d6baff] tracking-tight">
              Good Morning, {user?.name ?? "Member"}
            </h2>
            <p className="mt-1 text-[#cdc2d7] text-sm">See whose turn it is and what you owe this round.</p>
          </div>
        </div>
      </section>

      <NonCustodialNotice />

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card
          title="KYC Status"
          value={basicKycCompleted ? `Tier ${kycTier}` : "Not submitted"}
          icon={<ShieldCheck size={24} />}
          accent="primary"
        >
          <div className="mt-4 space-y-3">
            <p className="text-xs text-[#cdc2d7]">
              {basicKycCompleted
                ? bankConfirmed
                  ? "Details submitted and bank account confirmed. You can create and join groups."
                  : "Details submitted. You can create and join groups."
                : "Submit your details and payout bank account to create or join groups."}
            </p>
            {!basicKycCompleted && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] text-[#003912] font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Add details
              </Link>
            )}
          </div>
        </Card>

        <Card title="Active Groups" value={String(activeGroups)} icon={<Users size={24} />} accent="secondary">
          <div className="mt-4">
            <Link
              to="/groups/browse"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1d2023] border border-[#968da0]/30 text-[#d6baff] font-bold text-sm hover:bg-[#272a2e] transition-colors"
            >
              Browse Circles
            </Link>
            <p className="text-xs text-[#cdc2d7] mt-3">Join or create contribution groups.</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <section className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="font-headline text-xl font-bold text-[#e1e2e7]">Quick Actions</h3>
            <p className="text-[#cdc2d7] text-sm mt-1">Start your contribution journey in seconds.</p>
          </div>
          <div className="rounded-lg bg-[#40e56c]/10 p-3 text-[#40e56c]">
            <Zap size={20} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/groups/browse"
            className="group p-5 rounded-lg bg-[#191c1f] border border-[#4b4454]/30 hover:bg-[#272a2e] transition-colors"
          >
            <Users size={20} className="text-[#d6baff] mb-3" />
            <span className="font-semibold text-[#e1e2e7] text-sm block">Browse Circles</span>
            <span className="text-xs text-[#cdc2d7] mt-1">Explore and join contribution groups.</span>
          </Link>

          <Link
            to="/groups/create"
            className="group p-5 rounded-lg bg-[#191c1f] border border-[#4b4454]/30 hover:bg-[#272a2e] transition-colors"
          >
            <Plus size={20} className="text-[#d6baff] mb-3" />
            <span className="font-semibold text-[#e1e2e7] text-sm block">Create Group</span>
            <span className="text-xs text-[#cdc2d7] mt-1">Start your own contribution circle.</span>
          </Link>

          <Link
            to="/join"
            className="group p-5 rounded-lg bg-[#191c1f] border border-[#4b4454]/30 hover:bg-[#272a2e] transition-colors"
          >
            <Link2 size={20} className="text-[#40e56c] mb-3" />
            <span className="font-semibold text-[#e1e2e7] text-sm block">Join with Invite</span>
            <span className="text-xs text-[#cdc2d7] mt-1">Use an invite code from a group admin.</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

