import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { browseGroups, type GroupSummary } from "../api/groups.api";
import { extractApiMessage } from "../api/client";
import { getWalletTransactions, type WalletTransaction } from "../api/wallet.api";
import { useAuth } from "../store/AuthContext";
import { Card } from "../components/Ui";
import { colors } from "../theme/colors";

const formatMoney = (value: number) => `₦${Number(value || 0).toLocaleString()}`;

const splitCurrency = (value: number) => {
  const amount = Number(value || 0);
  const [whole, decimal = "00"] = amount.toFixed(2).split(".");
  return { whole: whole.replace(/\B(?=(\d{3})+(?!\d))/g, ","), decimal };
};

const getGreeting = (name?: string) => {
  const hour = new Date().getHours();
  const label = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  return `${label}, ${name || "Member"}`;
};

const isCreditType = (type: WalletTransaction["type"]) =>
  type === "deposit" || type === "payout" || type === "reversal";

const txTitle = (tx: WalletTransaction) => tx.type.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const txIcon = (tx: WalletTransaction) => {
  if (tx.status === "failed") return "⚠";
  if (tx.type === "deposit" || tx.type === "reversal" || tx.type === "payout") return "🏦";
  if (tx.type === "withdrawal" || tx.type === "auto-debit" || tx.type === "fee") return "💰";
  return "👤";
};

const txStatusLabel = (tx: WalletTransaction) => (tx.status === "failed" ? "Failed" : "Settled");

export function DashboardScreen({
  onOpenWallet,
  onOpenGroups,
  onOpenProfile,
  onLogout,
}: {
  onOpenWallet: () => void;
  onOpenGroups: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const { user, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  const walletBalance = Number(user?.wallets?.main ?? 0);
  const { whole: balanceWhole, decimal: balanceDecimal } = splitCurrency(walletBalance);
  const profileImage = typeof user?.profileImage === "string" && user.profileImage.trim() ? user.profileImage.trim() : null;
  const initials = (user?.name ?? "M")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const loadDashboardData = useCallback(async () => {
    const [groupsRes, txRes] = await Promise.all([browseGroups(), getWalletTransactions(5)]);
    setGroups(Array.isArray(groupsRes?.groups) ? groupsRes.groups : []);
    setTransactions(Array.isArray(txRes?.transactions) ? txRes.transactions : []);
  }, []);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await Promise.all([refreshProfile(), loadDashboardData()]);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile, loadDashboardData]);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard])
  );

  const activeCircles = groups.slice(0, 2);
  const recentTransactions = transactions.slice(0, 3);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, gap: 20 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshDashboard()} tintColor={colors.brand} />}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {profileImage ? (
          <Image
            source={{ uri: profileImage }}
            style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: "rgba(214,186,255,0.2)" }}
          />
        ) : (
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.panelElevated,
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ color: colors.brand, fontWeight: "900", fontSize: 14 }}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.6, color: colors.muted }}>ContriPay</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.brand, letterSpacing: -0.3 }}>{getGreeting(user?.name)}</Text>
        </View>
      </View>

      {/* Main Balance Card */}
      <Card style={{ padding: 24, gap: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.6, color: colors.muted }}>Available Balance</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
              <Text style={{ fontSize: 48, fontWeight: "900", letterSpacing: -1.2, color: colors.text }}>₦{balanceWhole}</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.brand, marginBottom: 4 }}>.{balanceDecimal}</Text>
            </View>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(214,186,255,0.1)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.brand }}>✓</Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: colors.brand, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Tier {Number(user?.kycTier ?? 1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Deposit/Withdraw buttons */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={onOpenWallet}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.accent,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: pressed ? 0.85 : 1,
              }
            ]}
          >
            <Text style={{ fontSize: 18, fontWeight: "700" }}>⊕</Text>
            <Text style={{ color: colors.inkOnAccent, fontWeight: "700", fontSize: 13 }}>Deposit</Text>
          </Pressable>
          <Pressable
            onPress={onOpenWallet}
            style={({ pressed }) => [
              {
                flex: 1,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(205,194,215,0.3)",
                opacity: pressed ? 0.85 : 1,
              }
            ]}
          >
            <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 13 }}>Withdraw</Text>
          </Pressable>
        </View>
      </Card>

      {/* Quick Actions Grid - 4 columns */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
        <Pressable
          onPress={onOpenGroups}
          style={({ pressed }) => [
            {
              width: "23%",
              paddingVertical: 14,
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.panel,
              borderRadius: 16,
              opacity: pressed ? 0.8 : 1,
            }
          ]}
        >
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.brand }}>👥</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "600", textAlign: "center" }}>Join Group</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            {
              width: "23%",
              paddingVertical: 14,
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.panel,
              borderRadius: 16,
              opacity: pressed ? 0.8 : 1,
            }
          ]}
        >
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.brand }}>✔</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "600", textAlign: "center" }}>Verify</Text>
        </Pressable>

        <Pressable
          onPress={onOpenWallet}
          style={({ pressed }) => [
            {
              width: "23%",
              paddingVertical: 14,
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.panel,
              borderRadius: 16,
              opacity: pressed ? 0.8 : 1,
            }
          ]}
        >
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.brand }}>→</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "600", textAlign: "center" }}>Send</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            {
              width: "23%",
              paddingVertical: 14,
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.panel,
              borderRadius: 16,
              opacity: pressed ? 0.8 : 1,
            }
          ]}
        >
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.brand }}>📊</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "600", textAlign: "center" }}>Activity</Text>
        </Pressable>
      </View>

      {/* Active Circles */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Active Circles</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: colors.accent }}>
            {activeCircles.length} Goals
          </Text>
        </View>

        {activeCircles.length === 0 ? (
          <Card>
            <Text style={{ color: colors.muted, fontSize: 12 }}>No active circles yet.</Text>
          </Card>
        ) : (
          activeCircles.map((group) => (
            <Card key={group._id} style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{group.name}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.accent }}>{formatMoney(group.contributionAmount)}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <View style={{ height: "100%", width: "100%", backgroundColor: colors.accent, borderRadius: 999 }} />
              </View>
              <Text style={{ fontSize: 9, fontWeight: "600", color: colors.muted, textTransform: "uppercase" }}>
                {group.frequency} • {group.memberCount} members
              </Text>
            </Card>
          ))
        )}
      </View>

      {/* Recent Activity */}
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Recent Activity</Text>

        {recentTransactions.length === 0 ? (
          <Card>
            <Text style={{ color: colors.muted, fontSize: 12 }}>No recent transactions yet.</Text>
          </Card>
        ) : (
          recentTransactions.map((tx) => {
            const credit = isCreditType(tx.type);
            const amountColor = tx.status === "failed" ? colors.danger : credit ? colors.accent : colors.text;

            return (
              <Card key={tx._id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(214,186,255,0.1)", alignItems: "center", justifyContent: "center" }}>
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

      {error ? (
        <Card>
          <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}
