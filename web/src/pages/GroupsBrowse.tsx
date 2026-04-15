import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { browseGroups, joinGroupByInvite, type GroupType } from "../api/groups.api";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { useAuthStore } from "../store/authStore";
import { Users, LogIn } from "lucide-react";

function badgeTone(type: GroupType) {
  switch (type) {
    case "low":
      return "bg-blue-500/20 text-blue-300 border border-blue-500/40";
    case "medium":
      return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
    case "high":
      return "bg-orange-500/20 text-orange-300 border border-orange-500/40";
    case "premium":
      return "bg-purple-500/20 text-purple-300 border border-purple-500/40";
  }
}

const groupSeenKey = (groupId: string) => `group.lastSeen.${groupId}`;

function isUnread(groupId: string | undefined, lastMessageAt?: string | null): boolean {
  if (!groupId || !lastMessageAt) return false;
  const lastMessageTs = Date.parse(lastMessageAt);
  if (!Number.isFinite(lastMessageTs)) return false;

  const seenRaw = localStorage.getItem(groupSeenKey(groupId));
  if (!seenRaw) return true;
  const seenTs = Date.parse(seenRaw);
  if (!Number.isFinite(seenTs)) return true;
  return lastMessageTs > seenTs;
}

export default function GroupsBrowse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useAuthStore(); // keep auth reactivity
  const { data, isLoading, error } = useQuery({
    queryKey: ["groups", "browse"],
    queryFn: browseGroups,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const groups = data?.groups ?? [];
  const [inviteCode, setInviteCode] = useState("");
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const joinMut = useMutation({
    mutationFn: (code: string) => joinGroupByInvite(code),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups", "browse"] });
      setJoinModalOpen(false);
      setInviteCode("");
    },
  });

  const groupsEmpty = !isLoading && groups.length === 0;
  const [filter, setFilter] = useState<GroupType | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return groups;
    return groups.filter((g) => g.groupType === filter);
  }, [groups, filter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative">
        <div className="absolute -inset-1 bg-linear-to-r from-[#d6baff]/20 to-[#40e56c]/10 blur-2xl opacity-50 pointer-events-none"></div>
        <div className="relative rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-headline text-3xl font-extrabold text-[#d6baff] tracking-tight">
                Contribution Circles
              </h1>
              <p className="mt-2 text-[#cdc2d7]">Join groups and start contributing with your community.</p>
            </div>
            <button
              onClick={() => setJoinModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-linear-to-br from-[#d6baff] to-[#ab73ff] text-[#111417] font-bold hover:opacity-90 transition-opacity shadow-[0_8px_24px_rgba(214,186,255,0.25)]"
            >
              <LogIn size={18} />
              Join with Code
            </button>
          </div>

          {/* Filter buttons */}
          <div className="mt-6 flex flex-wrap gap-2">
            {(["all", "low", "medium", "high"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={[
                  "rounded-lg px-4 py-2 text-sm font-semibold transition",
                  filter === t
                    ? "bg-[#d6baff] text-[#111417]"
                    : "border border-[#4b4454]/30 text-[#cdc2d7] hover:bg-[#4b4454]/10",
                ].join(" ")}
              >
                {t === "all" ? "All Tiers" : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-8 text-center text-[#cdc2d7]">
          Loading circles...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg bg-[#ffb4ab]/10 px-6 py-4 text-sm text-[#ffb4ab] border border-[#ffb4ab]/20">
          {getAxiosErrorMessage(error)}
        </div>
      ) : null}

      {groupsEmpty ? (
        <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-[#d6baff]/10 mb-4">
            <Users size={32} className="text-[#d6baff]" />
          </div>
          <h3 className="font-headline text-xl font-bold text-[#e1e2e7] mt-3">No Circles Yet</h3>
          <p className="text-[#cdc2d7] text-sm mt-1">Use an invite code to join your first contribution circle.</p>
        </div>
      ) : null}

      {/* Groups Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((g) => (
          <div
            key={g._id ?? g.name}
            className="rounded-lg border border-[#4b4454]/30 bg-[#191c1f] hover:bg-[#1d2023] transition-all p-6 group"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1">
                <h3 className="font-headline text-lg font-bold text-[#e1e2e7]">{g.name}</h3>
                <p className="text-[#968da0] text-sm mt-1">{g.description || "No description"}</p>
              </div>
              <span className={["rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider", badgeTone(g.groupType)].join(" ")}>
                {g.groupType}
              </span>
            </div>

            {isUnread(g._id, g.lastMessageAt) ? (
              <div className="mb-4 inline-flex items-center px-2 py-1 rounded-full bg-[#40e56c]/20 border border-[#40e56c]/40 text-[#40e56c] text-[10px] font-bold uppercase tracking-wide">
                New message
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg bg-[#0b0e11] p-4">
                <p className="text-xs uppercase tracking-wider text-[#968da0] font-semibold">Contribution</p>
                <p className="font-headline text-lg font-bold text-[#d6baff] mt-2">₦{g.contributionAmount}</p>
              </div>
              <div className="rounded-lg bg-[#0b0e11] p-4">
                <p className="text-xs uppercase tracking-wider text-[#968da0] font-semibold">Members</p>
                <p className="font-headline text-lg font-bold text-[#e1e2e7] mt-2">{g.memberCount}</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (g._id) navigate(`/groups/${g._id}`);
              }}
              disabled={!g._id}
              className="w-full px-4 py-2.5 rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] text-[#003912] font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              View Circle
            </button>
          </div>
        ))}
      </div>

      {/* Join Modal */}
      {joinModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 className="font-headline text-2xl font-bold text-[#d6baff]">Join a Circle</h3>
                <p className="mt-1 text-[#cdc2d7] text-sm">Enter your invite code to join</p>
              </div>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="rounded-lg p-2 text-[#cdc2d7] hover:bg-[#4b4454]/20 transition-colors"
              >
                ✕
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                joinMut.mutate(inviteCode);
              }}
            >
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="INVITE CODE"
                className="w-full bg-[#323538] border border-[#4b4454]/30 rounded-lg py-3 px-4 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all font-semibold tracking-widest"
              />

              {joinMut.isError ? (
                <div className="rounded-lg bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] border border-[#ffb4ab]/20 font-semibold">
                  {getAxiosErrorMessage(joinMut.error)}
                </div>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#4b4454]/30 text-[#cdc2d7] font-bold hover:bg-[#4b4454]/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinMut.isPending || inviteCode.trim().length < 1}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] text-[#003912] font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {joinMut.isPending ? "Joining..." : "Join Circle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

