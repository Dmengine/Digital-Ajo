import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { browseGroups, joinGroup, type GroupSummary } from "../api/groups.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Screen } from "../components/Ui";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Groups">;

export function GroupsScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGroups = async () => {
    try {
      const data = await browseGroups();
      const list = Array.isArray(data?.groups) ? (data.groups as GroupSummary[]) : [];
      setGroups(list);
    } catch (e) {
      setError(extractApiMessage(e));
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  const onJoinByCode = async () => {
    setError(null);
    try {
      const data = await joinGroup(inviteCode.trim());
      setInviteCode("");
      await loadGroups();
      if (data?.group?._id) {
        navigation.navigate("GroupDetail", { groupId: String(data.group._id), groupName: data.group.name });
      }
    } catch (e) {
      setError(extractApiMessage(e));
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 14 }}>
        {/* Header */}
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.6, color: colors.muted }}>Contribution Circles</Text>
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text, letterSpacing: -0.5 }}>Join A Circle</Text>
        </View>

        {/* Join via Code Hero Card */}
        <Card style={{ padding: 18, gap: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, color: colors.muted }}>Join with Code</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                paddingHorizontal: 12,
                backgroundColor: colors.panel,
                color: colors.text,
                fontSize: 13,
                fontWeight: "700",
              }}
              placeholder="Enter group code"
              placeholderTextColor={colors.muted}
              value={inviteCode}
              onChangeText={setInviteCode}
              editable={!loading}
            />
            <Pressable
              onPress={onJoinByCode}
              disabled={loading || !inviteCode.trim()}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: inviteCode.trim() ? colors.brand : colors.panelElevated,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: inviteCode.trim() ? colors.inkOnBrand : colors.muted }}>Join</Text>
            </Pressable>
          </View>
        </Card>

        {/* Error */}
        <ErrorText message={error} />

        {/* Active Circles Section */}
        {groups.length > 0 && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.6, color: colors.muted }}>Active Circles</Text>
              <Text style={{ fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, color: colors.muted }}>Managed Groups</Text>
            </View>

            {groups.slice(0, 1).map((group) => (
              <Card key={group._id} style={{ padding: 14, gap: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>{group.name}</Text>
                    <View style={{ backgroundColor: colors.accent + "1a", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, color: colors.accent }}>
                        {group.frequency}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.accent }}>₦{(group.contributionAmount || 0).toLocaleString()}</Text>
                </View>
                <View style={{ height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <View style={{ height: "100%", width: "65%", backgroundColor: colors.accent, borderRadius: 999 }} />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1, backgroundColor: colors.panelElevated, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, alignItems: "center" }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, color: colors.muted }}>Contribution</Text>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>₦50K</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.panelElevated, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, alignItems: "center" }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, color: colors.muted }}>Members</Text>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>{(group.memberCount || 0)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Browse Groups Section */}
        {groups.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.6, color: colors.muted }}>Browse Public Circles</Text>

            {groups.map((group) => (
              <Pressable
                key={group._id}
                onPress={() => navigation.navigate("GroupDetail", { groupId: group._id, groupName: group.name })}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <Card style={{ padding: 14, gap: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <View style={{ gap: 3, flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{group.name}</Text>
                      <View style={{ backgroundColor: colors.accent + "1a", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" }}>
                        <Text style={{ fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, color: colors.accent }}>
                          {group.frequency}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Stats Grid */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1, backgroundColor: colors.panelElevated, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: colors.muted }}>Contribution</Text>
                      <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>₦{(group.contributionAmount || 0).toLocaleString()}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.panelElevated, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: colors.muted }}>Members</Text>
                      <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{(group.memberCount || 0)}</Text>
                    </View>
                  </View>

                  {/* Group Details Button */}
                  <Pressable
                    onPress={() => navigation.navigate("GroupDetail", { groupId: group._id, groupName: group.name })}
                    style={({ pressed }) => [
                      {
                        paddingVertical: 12,
                        borderRadius: 999,
                        backgroundColor: colors.accent,
                        alignItems: "center",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.inkOnAccent }}>View Group Details</Text>
                  </Pressable>
                </Card>
              </Pressable>
            ))}
          </View>
        ) : (
          /* Empty State */
          <Card style={{ paddingVertical: 40, paddingHorizontal: 20, alignItems: "center", gap: 12 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.panelElevated, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 28, fontWeight: "900" }}>◎</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text, textAlign: "center" }}>No Circles Available</Text>
            <Text style={{ fontSize: 12, fontWeight: "500", color: colors.muted, textAlign: "center", lineHeight: 18 }}>All public circles are full. Check back later or join with an invite code.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
