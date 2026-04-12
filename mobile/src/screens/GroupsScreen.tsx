import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { browseGroups, joinGroup, type GroupSummary } from "../api/groups.api";
import { extractApiMessage } from "../api/client";
import { Card, ErrorText, Eyebrow, Field, PrimaryButton, Screen, SectionLabel, Subtitle, Title } from "../components/Ui";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Groups">;

export function GroupsScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await browseGroups();
      const list = Array.isArray(data?.groups) ? (data.groups as GroupSummary[]) : [];
      setGroups(list);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  const onJoin = async () => {
    setError(null);
    setMessage(null);
    try {
      const data = await joinGroup(inviteCode.trim());
      setMessage(data?.message ?? "Joined group");
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
        <View style={{ gap: 8 }}>
          <Eyebrow>Groups</Eyebrow>
          <Title>Browse your contribution circles.</Title>
          <Subtitle>Open a group to see its member ledger, contribution rhythm, and live chat.</Subtitle>
        </View>

        <Card>
          <SectionLabel>Join with code</SectionLabel>
          <View style={{ gap: 12, marginTop: 10 }}>
            <Field placeholder="Invite code" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
            <PrimaryButton label="Join group" onPress={onJoin} tone="accent" />
          </View>
        </Card>

        <ErrorText message={error} />
        {message ? (
          <Card>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{message}</Text>
          </Card>
        ) : null}

        <View style={{ gap: 8 }}>
          <SectionLabel>Open groups</SectionLabel>
          {loading ? (
            <Card>
              <Text style={{ color: colors.muted }}>Loading groups...</Text>
            </Card>
          ) : null}
          {groups.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => navigation.navigate("GroupDetail", { groupId: item._id, groupName: item.name })}
              style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}
            >
              <Card style={{ marginBottom: 10 }}>
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>{item.name}</Text>
                      <Text style={{ color: colors.muted, lineHeight: 19 }} numberOfLines={2}>
                        {item.description || "No description provided."}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(124,92,255,0.14)" }}>
                      <Text style={{ color: colors.brandSoft, fontWeight: "800", fontSize: 11 }}>{item.frequency}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: colors.panelElevated }}>
                      <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Contribution</Text>
                      <Text style={{ color: colors.text, fontWeight: "800", marginTop: 4 }}>N{Number(item.contributionAmount ?? 0).toLocaleString()}</Text>
                    </View>
                    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: colors.panelElevated }}>
                      <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Members</Text>
                      <Text style={{ color: colors.text, fontWeight: "800", marginTop: 4 }}>{item.memberCount}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {item.lastMessageAt ? `Last activity ${new Date(item.lastMessageAt).toLocaleDateString()}` : "No chat activity yet"}
                    </Text>
                    <Text style={{ color: colors.brandSoft, fontWeight: "800", fontSize: 12 }}>Open details</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
