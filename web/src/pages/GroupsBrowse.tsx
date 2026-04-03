import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { browseGroups, joinGroupByInvite, type GroupType } from "../api/groups.api";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { useAuthStore } from "../store/authStore";

function badgeTone(type: GroupType) {
  switch (type) {
    case "low":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "medium":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "high":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "premium":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
  }
}

export default function GroupsBrowse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useAuthStore(); // keep auth reactivity
  const { data, isLoading, error } = useQuery({
    queryKey: ["groups", "browse"],
    queryFn: browseGroups,
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">My groups</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            You only see groups where you are a member.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "low", "medium"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={[
                "rounded-xl border px-3 py-2 text-sm font-medium transition",
                filter === t
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                  : "border-white/10 bg-white/60 text-slate-700 hover:bg-white/80 dark:bg-slate-900/30 dark:text-slate-200",
              ].join(" ")}
            >
              {t === "all" ? "All tiers" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="mt-2 sm:mt-0">
          <button
            onClick={() => setJoinModalOpen(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Join with invite code
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
          Loading groups...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-300">
          {getAxiosErrorMessage(error)}
        </div>
      ) : null}

      {groupsEmpty ? (
        <div className="rounded-2xl border border-white/10 bg-white/70 p-6 text-center shadow-sm dark:bg-slate-900/40">
          You are not in any group yet. Use an invite code to join one.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((g) => (
          <div key={g._id ?? g.name} className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-sm dark:bg-slate-900/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-950 dark:text-white">{g.name}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{g.description || "—"}</div>
              </div>
              <div className={["rounded-xl px-3 py-1 text-xs font-semibold", badgeTone(g.groupType)].join(" ")}>
                {g.groupType.toUpperCase()}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-950/40">
                <div className="text-xs text-slate-500 dark:text-slate-400">Contribution</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">₦{g.contributionAmount}</div>
              </div>
              <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-950/40">
                <div className="text-xs text-slate-500 dark:text-slate-400">Members</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-white">{g.memberCount}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (g._id) navigate(`/groups/${g._id}`);
                }}
                className="rounded-xl border border-white/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/80 dark:bg-slate-950/30 dark:text-white"
                disabled={!g._id}
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Invite code modal */}
      {joinModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-950 dark:text-white">Join a group</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Enter your invite code.</div>
              </div>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                joinMut.mutate(inviteCode);
              }}
            >
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Invite code"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />

              {joinMut.isError ? (
                <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                  {getAxiosErrorMessage(joinMut.error)}
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="w-1/2 rounded-xl border border-white/10 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white/80 dark:bg-slate-950/30 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinMut.isPending || inviteCode.trim().length < 1}
                  className="w-1/2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {joinMut.isPending ? "Joining..." : "Join group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

