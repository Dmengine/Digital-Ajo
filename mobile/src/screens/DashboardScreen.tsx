import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../store/AuthContext";
import { Card, Eyebrow, SectionLabel, StatChip, Subtitle, Title } from "../components/Ui";
import { colors } from "../theme/colors";

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

  const walletBalance = Number(user?.wallets?.main ?? 0);
  const profileImage = typeof user?.profileImage === "string" && user.profileImage.trim() ? user.profileImage.trim() : null;
  const initials = (user?.name ?? "M")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile])
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 18, gap: 14 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshDashboard()} tintColor={colors.brandSoft} />}
    >
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: colors.borderSoft }}
            />
          ) : (
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: colors.panelElevated,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.brandSoft, fontWeight: "800", fontSize: 15 }}>{initials}</Text>
            </View>
          )}

          <View style={{ flex: 1, gap: 8 }}>
            <Eyebrow>Dashboard</Eyebrow>
            <Title>Hello {user?.name ?? "Member"}</Title>
          </View>
        </View>
        <Subtitle>Your wallet, group activity, and verification status at a glance.</Subtitle>
      </View>

      <Card style={{ padding: 18 }}>
        <View style={{ gap: 14 }}>
          <View
            style={{
              borderRadius: 20,
              backgroundColor: colors.panelElevated,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <SectionLabel>Main wallet</SectionLabel>
                <Text style={{ color: colors.text, fontSize: 36, fontWeight: "900", letterSpacing: -1.2, marginTop: 6 }}>
                  N{walletBalance.toLocaleString()}
                </Text>
              </View>

              <View style={{ gap: 8, alignItems: "flex-end" }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(39,211,162,0.14)" }}>
                  <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 12 }}>Synced</Text>
                </View>
                <Pressable onPress={() => void refreshDashboard()}>
                  <Text style={{ color: colors.brandSoft, fontSize: 12, fontWeight: "700" }}>Refresh balance</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(124,92,255,0.35)" }} />
              <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(39,211,162,0.28)" }} />
            </View>

            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              Wallet amount reflects your latest profile data from the app API.
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <StatChip label="Reliability" value={`${Number(user?.reliabilityScore ?? 100)}%`} />
            <StatChip label="KYC" value={user?.basicKycCompleted ? `Tier ${user?.kycTier ?? 1}` : "Pending"} />
          </View>
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <SectionLabel>Quick actions</SectionLabel>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable style={{ flex: 1, backgroundColor: colors.brand, borderRadius: 20, padding: 16 }} onPress={onOpenWallet}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>Wallet</Text>
            <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 4, fontSize: 12 }}>Deposit or withdraw</Text>
          </Pressable>
          <Pressable style={{ flex: 1, backgroundColor: colors.panelElevated, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border }} onPress={onOpenGroups}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>Groups</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>Browse or join</Text>
          </Pressable>
        </View>

        <Pressable style={{ backgroundColor: colors.accent, borderRadius: 20, padding: 16 }} onPress={onOpenProfile}>
          <Text style={{ color: "#07140f", fontWeight: "900", textAlign: "center" }}>Complete KYC / Profile</Text>
        </Pressable>
      </View>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <View style={{ flex: 1, gap: 4 }}>
            <SectionLabel>Session</SectionLabel>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>Switch account or end the current login.</Text>
            <Text style={{ color: colors.muted, lineHeight: 20 }}>
              Keep your session tidy when you move between devices.
            </Text>
          </View>
          <Pressable
            onPress={onLogout}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "800" }}>Logout</Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <SectionLabel>Next up</SectionLabel>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 6 }}>Keep your account ready for automated contributions.</Text>
        <Text style={{ color: colors.muted, lineHeight: 20, marginTop: 6 }}>
          Complete your profile, verify your bank account, and keep your wallet funded before due dates.
        </Text>
      </Card>
    </ScrollView>
  );
}
