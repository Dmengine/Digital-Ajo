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
    <div className="mx-auto max-w-md space-y-6">
      <div className="relative">
        <div className="absolute -inset-1 bg-linear-to-r from-[#d6baff]/20 to-[#40e56c]/10 blur-2xl opacity-50 pointer-events-none"></div>
        <div className="relative rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
          <h1 className="font-headline text-3xl font-extrabold text-[#d6baff] tracking-tight">Join via Invite Link</h1>
          <p className="mt-2 text-sm text-[#968da0]">
            This is invite-only. Enter the code shared by the group creator.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-[#968da0]">Invite Code</label>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-3 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all font-semibold tracking-widest"
            placeholder="e.g. 3F2A9B..."
          />

          {joinMut.isError ? (
            <div className="rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] font-bold">
              {getAxiosErrorMessage(joinMut.error)}
            </div>
          ) : null}

          <button
            disabled={isJoining || inviteCode.trim().length < 1}
            onClick={() => joinMut.mutate(inviteCode)}
            className="w-full rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] px-6 py-3 text-sm font-bold text-[#003912] uppercase tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-[0_8px_24px_rgba(64,229,108,0.25)]"
          >
            {isJoining ? "Joining..." : "Join Circle"}
          </button>
        </div>
      </div>
    </div>
  );
}

