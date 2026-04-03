import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { initDeposit, withdraw } from "../api/wallet.api";

const amountSchema = z.number().positive().max(10_000_000);

export default function Wallet() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [amount, setAmount] = useState<number | "">("");

  const depositMut = useMutation({
    mutationFn: (amt: number) => initDeposit(amt),
  });

  const withdrawMut = useMutation({
    mutationFn: (amt: number) => withdraw(amt),
  });

  const canSubmit = useMemo(() => {
    if (amount === "") return false;
    const amt = Number(amount);
    return amountSchema.safeParse(amt).success;
  }, [amount]);

  const resetAmount = () => setAmount("");

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-emerald-500/10 to-amber-500/10 p-6 shadow-sm dark:bg-slate-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Main Wallet</div>
            <div className="mt-1 text-3xl font-semibold text-slate-950 dark:text-white">₦0</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              MVP UI—wallet totals appear once a profile endpoint is added.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDepositOpen(true);
                resetAmount();
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Deposit
            </button>
            <button
              onClick={() => {
                setWithdrawOpen(true);
                resetAmount();
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Deposit modal */}
      {depositOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-950 dark:text-white">Deposit</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pay via Paystack.</div>
              </div>
              <button
                onClick={() => setDepositOpen(false)}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                inputMode="numeric"
                placeholder="Amount (₦)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />

              {depositMut.isError ? (
                <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                  {getAxiosErrorMessage(depositMut.error)}
                </div>
              ) : null}

              <button
                disabled={!canSubmit || depositMut.isPending}
                onClick={async () => {
                  if (amount === "") return;
                  const res = await depositMut.mutateAsync(Number(amount));
                  window.open(res.paymentURL, "_blank", "noopener,noreferrer");
                  setDepositOpen(false);
                }}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {depositMut.isPending ? "Preparing..." : "Deposit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Withdraw modal */}
      {withdrawOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-950 dark:text-white">Withdraw</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Send funds to your linked bank.</div>
              </div>
              <button
                onClick={() => setWithdrawOpen(false)}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                inputMode="numeric"
                placeholder="Amount (₦)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />

              {withdrawMut.isError ? (
                <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                  {getAxiosErrorMessage(withdrawMut.error)}
                </div>
              ) : null}

              <button
                disabled={!canSubmit || withdrawMut.isPending}
                onClick={async () => {
                  if (amount === "") return;
                  await withdrawMut.mutateAsync(Number(amount));
                  setWithdrawOpen(false);
                  resetAmount();
                }}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {withdrawMut.isPending ? "Withdrawing..." : "Confirm withdraw"}
              </button>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                MVP note: bank account linking is not implemented in this UI yet.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-sm dark:bg-slate-900/40">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Transaction history</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Not available yet (backend does not expose transaction history endpoints in this MVP).
        </div>
      </div>
    </div>
  );
}

