import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGroupById, type GroupType } from "../api/groups.api";
import { getAxiosErrorMessage } from "../utils/apiErrors";

function tone(groupType: GroupType) {
  switch (groupType) {
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

export default function GroupDetail() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["group", id],
    queryFn: () => getGroupById(String(id)),
    enabled: !!id,
  });

  const group = data?.group;

  const shareLink = group?.inviteCode
    ? `${window.location.origin}/join?code=${encodeURIComponent(group.inviteCode)}`
    : null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore for MVP
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">Loading group...</div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-300">
          {getAxiosErrorMessage(error)}
        </div>
      ) : null}

      {group ? (
        <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{group.name}</h1>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{group.description || "—"}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className={["rounded-xl px-3 py-1 text-xs font-semibold", tone(group.groupType)].join(" ")}>
                  {String(group.groupType).toUpperCase()}
                </div>
                <div className="rounded-xl bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                  Status: {group.status}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-950/40">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Invite code</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-950 dark:text-white">
                      {group.inviteCode ?? "—"}
                    </span>
                    {group.inviteCode ? (
                      <button
                        onClick={() => copy(String(group.inviteCode))}
                        className="rounded-xl bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Copy
                      </button>
                    ) : null}
                  </div>
                </div>

                {shareLink ? (
                  <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-950/40">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Invite link</div>
                    <div className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-200">
                      {shareLink}
                    </div>
                    <button
                      onClick={() => copy(shareLink)}
                      className="mt-2 rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Copy link
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500/15 to-emerald-500/10 p-4">
              <div className="text-xs text-slate-600 dark:text-slate-300">Contribution</div>
              <div className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">₦{group.contributionAmount}</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Frequency: {group.frequency}</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white p-4 shadow-sm dark:bg-slate-950/30">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Members</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(group.members ?? []).map((m: any) => (
                <div key={m._id ?? m.user?._id ?? m.order} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/60 px-3 py-3 dark:bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-center pt-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      {m.user?.username?.slice(0, 2).toUpperCase() ?? "??"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{m.user?.name ?? "Member"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Order #{m.order}</div>
                    </div>
                  </div>
                  {m.hasReceived ? (
                    <div className="rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Received
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Pending
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

