import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Send, Undo2 } from "lucide-react";
import {
  confirmRoundPayment,
  getCurrentRound,
  markRoundSent,
  unconfirmRoundPayment,
  type ContributionStatus,
} from "../api/groups.api";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { formatNaira } from "../utils/currency";
import { NON_CUSTODIAL_NOTICE } from "./NonCustodialNotice";

const STATUS_LABEL: Record<ContributionStatus, string> = {
  pending: "Not paid yet",
  marked_paid: "Awaiting admin confirmation",
  confirmed: "Confirmed by admin",
  unpaid: "Unpaid",
  defaulted: "Defaulted",
};

const STATUS_TONE: Record<ContributionStatus, string> = {
  pending: "bg-[#968da0]/20 text-[#cdc2d7]",
  marked_paid: "bg-[#d6baff]/20 text-[#d6baff]",
  confirmed: "bg-[#40e56c]/20 text-[#40e56c]",
  unpaid: "bg-amber-500/20 text-amber-300",
  defaulted: "bg-[#ffb4ab]/20 text-[#ffb4ab]",
};

export function StatusBadge({ status }: { status: ContributionStatus }) {
  return (
    <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

export function ThisRound({ groupId }: { groupId: string }) {
  const queryClient = useQueryClient();
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);

  const roundQ = useQuery({
    queryKey: ["group", groupId, "round"],
    queryFn: () => getCurrentRound(groupId),
    enabled: !!groupId,
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["group", groupId] });
  };

  const sentMut = useMutation({
    mutationFn: () => markRoundSent(groupId, reference),
    onSuccess: () => {
      setReference("");
      invalidate();
    },
  });
  const confirmMut = useMutation({
    mutationFn: (payerId: string) => confirmRoundPayment(groupId, payerId),
    onSuccess: invalidate,
  });
  const undoMut = useMutation({
    mutationFn: (payerId: string) => unconfirmRoundPayment(groupId, payerId),
    onSuccess: invalidate,
  });

  const card = "rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6";

  if (roundQ.isLoading) return <div className={`${card} text-[#cdc2d7]`}>Loading this round...</div>;
  if (roundQ.error) {
    return (
      <div className="rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 p-4 text-sm text-[#ffb4ab]">
        {getAxiosErrorMessage(roundQ.error)}
      </div>
    );
  }

  const data = roundQ.data;
  if (!data) return null;
  const round = data.round;

  if (!round) {
    const message =
      data.groupStatus === "open"
        ? `Round 1 opens on ${new Date(data.membershipLocksAt).toLocaleString()}. New members can join until then.`
        : data.groupStatus === "completed"
          ? "This group is complete. Every member has received their turn."
          : data.groupStatus === "cancelled"
            ? "This group was cancelled."
            : "No round is in progress.";
    return (
      <div className={card}>
        <h2 className="font-headline text-xl font-bold text-[#e1e2e7]">This round</h2>
        <p className="mt-2 text-sm text-[#968da0]">{message}</p>
      </div>
    );
  }

  const bank = round.recipient.bankAccount;
  const my = round.myPayment;
  const canMarkSent = my && ["pending", "unpaid", "defaulted"].includes(my.status);
  const busy = confirmMut.isPending || undoMut.isPending;

  const copyAccount = async () => {
    if (!bank) return;
    try {
      await navigator.clipboard.writeText(bank.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-bold text-[#e1e2e7]">
            This round · {round.number} of {data.totalRounds}
          </h2>
          <p className="mt-1 text-sm text-[#968da0]">{NON_CUSTODIAL_NOTICE}</p>
        </div>
        <div className="text-right">
          <div className="font-headline text-2xl font-bold text-[#d6baff]">₦{formatNaira(round.amount)}</div>
          <div className="text-xs text-[#968da0]">per member · due {fmtDate(round.dueAt)}</div>
          <div className="mt-1 text-xs font-bold text-[#cdc2d7]">
            {round.progress.confirmed} of {round.progress.total} confirmed by admin
          </div>
        </div>
      </div>

      {round.status === "paused" ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          The due date has passed and the admin hasn't confirmed every payment yet.
          {round.graceEndsAt ? ` Grace period ends ${fmtDate(round.graceEndsAt)}.` : ""}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-4">
          <div className="text-xs uppercase tracking-wider text-[#968da0] font-bold">Receiving this round</div>
          <div className="mt-2 text-lg font-bold text-[#e1e2e7]">
            {round.isRecipient ? "You" : round.recipient.name ?? "Member"}
            {round.recipient.username ? <span className="ml-2 text-sm text-[#968da0]">@{round.recipient.username}</span> : null}
          </div>
          {bank ? (
            <div className="mt-3 space-y-1 text-sm text-[#cdc2d7]">
              <div>{bank.bankName ?? "—"}</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-[#e1e2e7]">{bank.accountNumber}</span>
                <button
                  type="button"
                  onClick={copyAccount}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#d6baff]/15 px-2 py-1 text-xs font-bold text-[#d6baff] hover:bg-[#d6baff]/25"
                >
                  <Copy size={12} /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div>{bank.accountName ?? "—"}</div>
              {bank.confirmed ? (
                <div className="text-xs font-bold text-[#40e56c]">Bank account confirmed</div>
              ) : (
                <div className="text-xs font-bold text-amber-300">Bank account not confirmed. Double-check with the recipient.</div>
              )}
            </div>
          ) : (
            <div className="mt-3 text-sm text-amber-300">
              {round.isRecipient
                ? "Add your payout bank account on your profile so members can pay you."
                : "The recipient hasn't added a bank account yet. Ask them in the group chat."}
            </div>
          )}
        </div>

        {my ? (
          <div className="rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-wider text-[#968da0] font-bold">Your payment</div>
              <StatusBadge status={my.status} />
            </div>
            {my.payerReference ? <div className="mt-2 text-xs text-[#968da0]">Reference: {my.payerReference}</div> : null}
            {my.status === "marked_paid" ? (
              <p className="mt-3 text-sm text-[#cdc2d7]">
                The admin has been notified. It counts as paid only once the admin confirms it.
              </p>
            ) : null}
            {my.unconfirmedAt && my.status === "unpaid" ? (
              <div className="mt-2 text-xs text-amber-300">
                The admin removed the confirmation of your payment. Contact the admin if you have already paid.
              </div>
            ) : null}
            {canMarkSent ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  sentMut.mutate();
                }}
              >
                <p className="text-sm text-[#cdc2d7]">
                  Send ₦{formatNaira(round.amount)} from your bank app to the account shown, then let the admin know.
                </p>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  maxLength={120}
                  placeholder="Transfer reference (optional)"
                  className="w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-sm text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40"
                />
                <button
                  type="submit"
                  disabled={sentMut.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] px-4 py-2 text-sm font-bold text-[#003912] hover:opacity-90 disabled:opacity-60"
                >
                  <Send size={16} /> {sentMut.isPending ? "Notifying admin..." : "I've sent my payment"}
                </button>
                {sentMut.isError ? <div className="text-sm text-[#ffb4ab]">{getAxiosErrorMessage(sentMut.error)}</div> : null}
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      {data.isAdmin ? (
        <div className="mt-6">
          <div className="text-sm font-bold text-[#e1e2e7]">Admin checklist · confirm each member's payment</div>
          <p className="mt-1 text-xs text-[#968da0]">
            Only you can mark a contribution as paid. Check that the money reached the recipient before confirming.
          </p>
          <ul className="mt-3 space-y-2">
            {round.payments.map((p) => (
              <li
                key={p.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 px-4 py-3"
              >
                <div>
                  <div className="font-bold text-[#e1e2e7]">{p.name ?? "Member"}</div>
                  <div className="text-xs text-[#968da0]">
                    @{p.username ?? "—"}
                    {p.markedPaidAt ? ` · says sent ${fmtDate(p.markedPaidAt)}` : ""}
                    {p.payerReference ? ` · ref ${p.payerReference}` : ""}
                    {p.confirmedAt ? ` · confirmed ${fmtDate(p.confirmedAt)}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={p.status} />
                  {p.status === "confirmed" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Undo the confirmation for ${p.name ?? "this member"}? It will go back to unpaid and they'll be notified.`)) {
                          undoMut.mutate(p.userId);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#ffb4ab]/20 px-3 py-1 text-xs font-bold text-[#ffb4ab] hover:bg-[#ffb4ab]/30 disabled:opacity-60"
                    >
                      <Undo2 size={14} /> Undo
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Confirm ${p.name ?? "this member"} paid ₦${formatNaira(round.amount)} to the recipient?`)) {
                          confirmMut.mutate(p.userId);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#40e56c]/20 px-3 py-1 text-xs font-bold text-[#40e56c] hover:bg-[#40e56c]/30 disabled:opacity-60"
                    >
                      <Check size={14} /> Confirm paid
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {confirmMut.isError ? <div className="mt-3 text-sm text-[#ffb4ab]">{getAxiosErrorMessage(confirmMut.error)}</div> : null}
          {undoMut.isError ? <div className="mt-3 text-sm text-[#ffb4ab]">{getAxiosErrorMessage(undoMut.error)}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
