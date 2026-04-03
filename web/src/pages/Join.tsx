import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { joinGroupByInvite } from "../api/groups.api";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { useAuthStore } from "../store/authStore";

export default function Join() {
  const navigate = useNavigate();
  useAuthStore(); // reactivity

  const [params] = useSearchParams();
  const inviteFromLink = params.get("code") ?? "";

  const [inviteCode, setInviteCode] = useState(inviteFromLink);
  const [autoTried, setAutoTried] = useState(false);

  const joinMut = useMutation({
    mutationFn: (code: string) => joinGroupByInvite(code),
    onSuccess: (res) => {
      const group = (res as any).group;
      const groupId = group?._id;
      if (groupId) navigate(`/groups/${groupId}`);
      else navigate("/groups/browse");
    },
  });

  useEffect(() => {
    if (!autoTried && inviteFromLink.trim()) {
      setAutoTried(true);
      joinMut.mutate(inviteFromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteFromLink]);

  const isJoining = joinMut.isPending;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-emerald-500/10 to-amber-500/10 p-6 shadow-sm dark:bg-slate-900/40">
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Join via Invite Link</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          This is invite-only. Enter the code shared by the group creator.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-sm dark:bg-slate-900/40">
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Invite code</label>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            placeholder="e.g. 3f2a9b..."
          />

          {joinMut.isError ? (
            <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {getAxiosErrorMessage(joinMut.error)}
            </div>
          ) : null}

          <button
            disabled={isJoining || inviteCode.trim().length < 1}
            onClick={() => joinMut.mutate(inviteCode)}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isJoining ? "Joining..." : "Join group"}
          </button>
        </div>
      </div>
    </div>
  );
}

