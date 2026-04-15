import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Linking, ScrollView, Text, View, Pressable } from "react-native";
import { getWalletTransactions, initDeposit, verifyDeposit, type WalletTransaction, withdraw } from "../api/wallet.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Field, Screen } from "../components/Ui";
import { useAuth } from "../store/AuthContext";
import { colors } from "../theme/colors";

function makeIdempotencyKey() {
  return `wd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const pendingDepositKey = "contripay.pendingDepositReference";

const formatMoney = (value: number) => `₦${Number(value || 0).toLocaleString()}`;

const splitCurrency = (value: number) => {
  const amount = Number(value || 0);
  const [whole, decimal = "00"] = amount.toFixed(2).split(".");
  return { whole: whole.replace(/\B(?=(\d{3})+(?!\d))/g, ","), decimal };
};

const isCreditType = (type: WalletTransaction["type"]) =>
  type === "deposit" || type === "payout" || type === "reversal";

const txTitle = (tx: WalletTransaction) => tx.type.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const txIcon = (tx: WalletTransaction) => {
  if (tx.status === "failed") return "⚠";
  if (tx.type === "deposit" || tx.type === "reversal" || tx.type === "payout") return "↙";
  if (tx.type === "withdrawal" || tx.type === "auto-debit" || tx.type === "fee") return "↗";
  return "•";
};

const txStatusLabel = (tx: WalletTransaction) => (tx.status === "failed" ? "Failed" : "Settled");

export function WalletScreen() {
  const { refreshProfile, user } = useAuth();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsedAmount = Number(amount);

  const refreshTransactions = useCallback(async () => {
    const data = await getWalletTransactions(10);
    setTransactions(data.transactions ?? []);
  }, []);

  const verifyReference = async (nextReference: string) => {
    const trimmed = nextReference.trim();
    if (!trimmed) return;

    const data = await verifyDeposit(trimmed);
    setStatus(data.message);
    if (data.settled) {
      await AsyncStorage.removeItem(pendingDepositKey);
      await Promise.all([refreshProfile(), refreshTransactions()]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const syncWalletData = async () => {
        try {
          await Promise.all([refreshProfile(), refreshTransactions()]);
          const pendingReference = await AsyncStorage.getItem(pendingDepositKey);
          if (!active || !pendingReference?.trim()) return;
          setReference(pendingReference);
          await verifyReference(pendingReference);
        } catch (e) {
          if (!active) return;
          setError(extractApiMessage(e));
        }
      };

      void syncWalletData();

      return () => {
        active = false;
      };
    }, [refreshProfile, refreshTransactions])
  );

  const onInitDeposit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await initDeposit(parsedAmount);
      setReference(data.reference);
      await AsyncStorage.setItem(pendingDepositKey, data.reference);
      setStatus("Deposit initialized. Opening Paystack checkout link.");
      await Linking.openURL(data.paymentURL);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  }; 

  const onVerifyDeposit = async () => {
    setLoading(true);
    setError(null);
    try {
      await verifyReference(reference);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onWithdraw = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withdraw(parsedAmount, makeIdempotencyKey());
      setStatus(data.message);
      await Promise.all([refreshProfile(), refreshTransactions()]);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = Number(user?.wallets?.main ?? 0);
  const { whole: balanceWhole, decimal: balanceDecimal } = splitCurrency(totalBalance);
  const recentTransactions = transactions.slice(0, 5);
  const latestTransaction = recentTransactions[0] ?? null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingBottom: 14 }}>
        {/* Balance Card Section */}
        <Card style={{ padding: 24, gap: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.6, color: colors.muted }}>Total Vault Balance</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(64,229,108,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.accent }}>↗</Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: colors.accent }}>+12.4%</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
            <Text style={{ fontSize: 42, fontWeight: "900", letterSpacing: -1.2, color: colors.brand }}>₦{balanceWhole}</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.muted, marginBottom: 3 }}>.{balanceDecimal}</Text>
          </View>

          {/* Savings Goal + Pending */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: colors.panelElevated, borderRadius: 10, padding: 12, gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, color: colors.muted }}>Savings Goal</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{formatMoney(50000)}</Text>
              <View style={{ height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <View style={{ height: "100%", width: "85%", backgroundColor: colors.accent, borderRadius: 999 }} />
              </View>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.panelElevated, borderRadius: 10, padding: 12, gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, color: colors.muted }}>Last Transaction</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {latestTransaction
                  ? `${isCreditType(latestTransaction.type) ? "+" : "-"}${formatMoney(latestTransaction.amount)}`
                  : "No activity"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions Section */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.6, color: colors.muted, paddingHorizontal: 4 }}>Actions</Text>
          
          {/* Primary Deposit Button */}
          <Pressable
            onPress={onInitDeposit}
            disabled={loading}
            style={({ pressed }) => [
              {
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.brand,
                opacity: pressed ? 0.85 : 1,
              }
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "700" }}>💳</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.inkOnBrand }}>Deposit with Paystack</Text>
            </View>
            <Text style={{ fontSize: 16, color: colors.inkOnBrand }}>→</Text>
          </Pressable>

          {/* Secondary Actions */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onVerifyDeposit}
              disabled={loading}
              style={({ pressed }) => [
                {
                  flex: 1,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: colors.panel,
                  borderWidth: 1,
                  borderColor: "rgba(205,194,215,0.2)",
                  opacity: pressed ? 0.85 : 1,
                }
              ]}
            >
              <Text style={{ fontSize: 18, fontWeight: "700" }}>📋</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text, textAlign: "center" }}>Verify</Text>
            </Pressable>

            <Pressable
              onPress={onWithdraw}
              disabled={loading}
              style={({ pressed }) => [
                {
                  flex: 1,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: colors.panel,
                  borderWidth: 1,
                  borderColor: "rgba(205,194,215,0.2)",
                  opacity: pressed ? 0.85 : 1,
                }
              ]}
            >
              <Text style={{ fontSize: 18, fontWeight: "700" }}>🏦</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text, textAlign: "center" }}>Withdraw</Text>
            </Pressable>
          </View>
        </View>

        {/* Fields */}
        <Card style={{ gap: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.4, color: colors.muted }}>Enter Amount</Text>
          <Field placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.4, color: colors.muted }}>Verify Reference</Text>
          <Field placeholder="Deposit reference" value={reference} onChangeText={setReference} autoCapitalize="none" />
        </Card>

        <ErrorText message={error} />
        {status ? (
          <Card>
            <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 13 }}>{status}</Text>
          </Card>
        ) : null}

        {/* Recent Activity */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.4, color: colors.muted }}>Recent Activity</Text>
            <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, color: colors.brand }}>View All</Text>
          </View>

          {recentTransactions.length === 0 ? (
            <Card>
              <Text style={{ color: colors.muted, fontSize: 12 }}>No transactions yet.</Text>
            </Card>
          ) : (
            recentTransactions.map((tx) => {
              const credit = isCreditType(tx.type);
              const amountColor = tx.status === "failed" ? colors.danger : credit ? colors.accent : colors.text;

              return (
                <Card key={tx._id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "700" }}>{txIcon(tx)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{txTitle(tx)}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{new Date(tx.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: amountColor }}>
                      {credit ? "+" : "-"}
                      {formatMoney(tx.amount)}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: "700", textTransform: "uppercase", color: amountColor }}>
                      {txStatusLabel(tx)}
                    </Text>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
