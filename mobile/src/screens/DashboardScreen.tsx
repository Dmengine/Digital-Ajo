import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { browseGroups, type GroupSummary } from "../api/groups.api";
import { extractApiMessage } from "../api/client";
import { useAuth } from "../store/AuthContext";
import { Card, NonCustodialNotice } from "../components/Ui";
import { colors } from "../theme/colors";

const formatMoney = (value: number) => `₦${Number(value || 0).toLocaleString()}`;

const getGreeting = (name?: string) => {
  const hour = new Date().getHours();
  const label = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  return `${label}, ${name || "Member"}`;
};

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.panel,
        borderRadius: 16,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.brand }}>{icon}</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "600", textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function DashboardScreen({
  onOpenGroups,
  onOpenGroup,
  onOpenProfile,
}: {
  onOpenGroups: () => void;
  onOpenGroup: (groupId: string, groupName?: string) => void;
  onOpenProfile: () => void;
}) {
  const { user, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);

  const profileImage = typeof user?.profileImage === "string" && user.profileImage.trim() ? user.profileImage.trim() : null;
  const initials = (user?.name ?? "M")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const detailsSubmitted = Boolean(user?.basicKycCompleted);
  const bankConfirmed = Boolean(user?.bankAccount?.confirmed);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [, groupsRes] = await Promise.all([refreshProfile(), browseGroups()]);
      setGroups(Array.isArray(groupsRes?.groups) ? groupsRes.groups : []);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard])
  );

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
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.brand, fontWeight: "900", fontSize: 14 }}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.6, color: colors.muted }}>ContriPay</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.brand, letterSpacing: -0.3 }}>{getGreeting(user?.name)}</Text>
        </View>
      </View>

      <NonCustodialNotice />

      {/* Details & payout account */}
      <Card style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.6, color: colors.muted }}>
            Your details
          </Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: detailsSubmitted ? colors.accent : colors.warning, textTransform: "uppercase" }}>
            {detailsSubmitted ? `Tier ${Number(user?.kycTier ?? 1)} · submitted` : "Not submitted"}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
          {detailsSubmitted
            ? bankConfirmed
              ? `Payout account: ${user?.bankAccount?.accountName ?? ""} · ${user?.bankAccount?.bankName ?? ""}. Bank account confirmed.`
              : "Details submitted. Add a payout bank account so members can pay you on your turn."
            : "Submit your details and payout bank account to create or join groups."}
        </Text>
        <Pressable onPress={onOpenProfile} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 13 }}>{detailsSubmitted ? "View profile →" : "Add details →"}</Text>
        </Pressable>
      </Card>

      {/* Quick Actions */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <QuickAction icon="👥" label="Groups" onPress={onOpenGroups} />
        <QuickAction icon="✔" label="Details" onPress={onOpenProfile} />
      </View>

      {/* Groups */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Your Groups</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: colors.accent }}>
            {groups.length} {groups.length === 1 ? "group" : "groups"}
          </Text>
        </View>

        {groups.length === 0 ? (
          <Card>
            <Text style={{ color: colors.muted, fontSize: 12 }}>No groups yet. Join one with an invite code.</Text>
          </Card>
        ) : (
          groups.slice(0, 5).map((group) => (
            <Pressable key={group._id} onPress={() => onOpenGroup(group._id, group.name)}>
              {({ pressed }) => (
                <Card style={{ gap: 6, opacity: pressed ? 0.85 : 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{group.name}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.accent }}>{formatMoney(group.contributionAmount)}</Text>
                  </View>
                  <Text style={{ fontSize: 9, fontWeight: "600", color: colors.muted, textTransform: "uppercase" }}>
                    {group.frequency} • {group.memberCount} members • tap to see this round
                  </Text>
                </Card>
              )}
            </Pressable>
          ))
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
