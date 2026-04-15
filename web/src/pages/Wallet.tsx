import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { getWalletTransactions, initDeposit, verifyDeposit, withdraw } from "../api/wallet.api";
import { me as fetchMe } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import { formatNaira } from "../utils/currency";
import { Plus, CreditCard, TrendingUp } from "lucide-react";

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

  const txQ = useQuery({
    queryKey: ["wallet", "transactions"],
    queryFn: () => getWalletTransactions(10),
    enabled: !!token,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const walletBalance = meData?.user?.wallets?.main ?? 0;
  const transactions = txQ.data?.transactions ?? [];

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
    <div className="space-y-8">
      {/* Wallet Balance Header */}
      <section className="relative rounded-lg border border-[#d6baff]/20 bg-linear-to-br from-[#d6baff]/10 via-[#ab73ff]/5 to-[#111417] p-8 shadow-lg overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#ab73ff]/10 blur-[60px] rounded-full"></div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#cdc2d7] font-semibold">Total Vault Balance</p>
            <h2 className="mt-3 font-headline text-5xl font-extrabold text-[#d6baff] tracking-tight">
              ₦{formatNaira(walletBalance)}
            </h2>
            <p className="mt-2 text-[#cdc2d7] text-sm">
              {isFetching ? "Refreshing..." : "Balance updates after successful deposits"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setDepositOpen(true);
                resetAmount();
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-linear-to-br from-[#40e56c] to-[#02c953] text-[#003912] font-bold hover:opacity-90 transition-opacity shadow-[0_8px_24px_rgba(64,229,108,0.25)]"
            >
              <Plus size={18} />
              Deposit
            </button>
            <button
              onClick={() => {
                setWithdrawOpen(true);
                resetWithdrawState();
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#4b4454]/30 text-[#d6baff] font-bold hover:bg-[#4b4454]/10 transition-colors"
            >
              <TrendingUp size={18} />
              Withdraw
            </button>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#cdc2d7] font-semibold">Recent Activity</p>
              {txQ.isLoading ? <p className="mt-2 text-[#968da0] text-sm">Loading transaction history...</p> : null}
              {txQ.isError ? <p className="mt-2 text-[#ffb4ab] text-sm">{getAxiosErrorMessage(txQ.error)}</p> : null}
              {!txQ.isLoading && !txQ.isError && transactions.length === 0 ? (
                <p className="mt-2 text-[#968da0] text-sm">No transactions yet.</p>
              ) : null}
            </div>
            <div className="rounded-lg bg-[#40e56c]/10 p-3 text-[#40e56c]">
              <CreditCard size={20} />
            </div>
          </div>

          {transactions.length > 0 ? (
            <div className="mt-4 space-y-2">
              {transactions.slice(0, 5).map((tx) => {
                const isCredit = tx.type === "deposit" || tx.type === "payout" || tx.type === "reversal";
                return (
                  <div key={tx._id} className="flex items-center justify-between rounded-lg bg-[#323538]/30 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-[#e1e2e7] capitalize">{tx.type.replace("-", " ")}</p>
                      <p className="text-xs text-[#968da0]">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <div className={isCredit ? "text-[#40e56c] font-bold" : "text-[#ffb4ab] font-bold"}>
                      {isCredit ? "+" : "-"}₦{formatNaira(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#cdc2d7] font-semibold">Paystack Integration</p>
              <p className="mt-2 text-[#968da0] text-sm">Secure deposits via Paystack checkout</p>
            </div>
            <div className="rounded-lg bg-[#d6baff]/10 p-3 text-[#d6baff]">
              <CreditCard size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {depositOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 className="font-headline text-2xl font-bold text-[#d6baff]">Deposit Funds</h3>
                <p className="mt-1 text-[#cdc2d7] text-sm">Paystack will handle the payment securely.</p>
              </div>
              <button
                onClick={() => setDepositOpen(false)}
                className="rounded-lg p-2 text-[#cdc2d7] hover:bg-[#4b4454]/20 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="Amount (₦)"
                className="w-full bg-[#323538] border border-[#4b4454]/30 rounded-lg py-3 px-4 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
              />

              {depositMut.isError ? (
                <div className="rounded-lg bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] border border-[#ffb4ab]/20 font-semibold">
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
                className="w-full bg-linear-to-br from-[#40e56c] to-[#02c953] text-[#003912] font-bold py-3 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {depositMut.isPending ? "Processing..." : "Proceed to Paystack"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Withdraw Modal */}
      {withdrawOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 className="font-headline text-2xl font-bold text-[#d6baff]">Withdraw</h3>
                <p className="mt-1 text-[#cdc2d7] text-sm">Transfer to your linked bank account.</p>
              </div>
              <button
                onClick={() => setWithdrawOpen(false)}
                className="rounded-lg p-2 text-[#cdc2d7] hover:bg-[#4b4454]/20 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="Amount (₦)"
                className="w-full bg-[#323538] border border-[#4b4454]/30 rounded-lg py-3 px-4 text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
              />

              {withdrawMut.isError ? (
                <div className="rounded-lg bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffb4ab] border border-[#ffb4ab]/20 font-semibold">
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
                className="w-full bg-linear-to-br from-[#40e56c] to-[#02c953] text-[#003912] font-bold py-3 rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {withdrawMut.isPending ? "Processing..." : "Confirm Withdrawal"}
              </button>

              <p className="text-xs text-[#968da0] mt-3 font-semibold">
                Ensure your bank details are verified before withdrawing.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

