import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { initDeposit, verifyDeposit, withdraw } from "../api/wallet.api";
import { me as fetchMe } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import { formatNaira } from "../utils/currency";

const amountSchema = z.number().positive().max(10_000_000);
export default function Wallet() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [amount, setAmount] = useState("");
  const token = useAuthStore((state) => state.token);

  const { data: meData, isFetching, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    enabled: !!token,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const walletBalance = meData?.user?.wallets?.main ?? 0;

  const depositMut = useMutation({
    mutationFn: (amt: number) => initDeposit(amt),
  });

  const withdrawMut = useMutation({
    mutationFn: (amt: number) => withdraw(amt),
  });

  const parsedAmount = useMemo(() => {
    const trimmed = amount.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
  }, [amount]);

  const canSubmit = useMemo(() => {
    if (parsedAmount === null) return false;
    return amountSchema.safeParse(parsedAmount).success;
  }, [parsedAmount]);

  const resetAmount = () => setAmount("");
  const resetWithdrawState = () => {
    resetAmount();
  };

  const pollDepositSettlement = async (reference: string) => {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      try {
        const result = await verifyDeposit(reference);
        if (result.settled) {
          await refetch();
          return;
        }
      } catch {
        // Keep trying; webhook or verification may lag shortly after checkout.
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
    await refetch();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-linear-to-br from-indigo-500/15 via-emerald-500/10 to-amber-500/10 p-6 shadow-sm dark:bg-slate-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Main Wallet</div>
            <div className="mt-1 text-3xl font-semibold text-slate-950 dark:text-white">
              ₦{formatNaira(walletBalance)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isFetching ? "Refreshing wallet balance..." : "Balance updates after successful deposit webhooks."}
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
                resetWithdrawState();
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
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Paystack will charge your bank/card.
                </div>
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
                onChange={(e) => setAmount(e.target.value)}
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
                  if (parsedAmount === null) return;
                  const res = await depositMut.mutateAsync(parsedAmount);
                  window.open(res.paymentURL, "_blank", "noopener,noreferrer");
                  setDepositOpen(false);
                  resetAmount();
                  void pollDepositSettlement(res.reference);
                }}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {depositMut.isPending ? "Processing..." : "Deposit"}
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
                onChange={(e) => setAmount(e.target.value)}
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
                  if (parsedAmount === null) return;
                  await withdrawMut.mutateAsync(parsedAmount);
                  setWithdrawOpen(false);
                  resetWithdrawState();
                  void refetch();
                }}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {withdrawMut.isPending ? "Withdrawing..." : "Confirm withdraw"}
              </button>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Ensure your bank account details are linked before withdrawing.
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

