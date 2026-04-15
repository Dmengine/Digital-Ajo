import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { io, type Socket } from "socket.io-client";
import {
  addGroupMember,
  getGroup,
  getGroupDashboard,
  getGroupMessages,
  removeGroupMember,
  sendGroupMessage,
  type GroupDashboardResponse,
  type GroupDetail,
  type GroupMessage,
} from "../api/groups.api";
import { extractApiMessage } from "../api/client";
import { getSocketBaseUrl } from "../api/client";
import { Card, ErrorText, Eyebrow, PrimaryButton, Screen, SectionLabel, Subtitle, Title } from "../components/Ui";
import { useAuth } from "../store/AuthContext";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "GroupDetail">;

function getSenderName(sender: GroupMessage["sender"]) {
  if (typeof sender === "string") return "Member";
  return sender.name ?? sender.username ?? "Member";
}

function badgeColor(groupType: GroupDetail["groupType"]) {
  switch (groupType) {
    case "low":
      return { backgroundColor: "rgba(73,161,255,0.16)", textColor: "#9dd0ff" };
    case "medium":
      return { backgroundColor: "rgba(255,183,77,0.16)", textColor: "#ffd39a" };
    case "high":
      return { backgroundColor: "rgba(255,126,95,0.16)", textColor: "#ffb3a0" };
    case "premium":
      return { backgroundColor: "rgba(214,186,255,0.20)", textColor: colors.brand };
  }
}

export function GroupDetailScreen({ route }: Props): React.JSX.Element {
  const { token } = useAuth();
  const { groupId, groupName } = route.params;
  const socketRef = useRef<Socket | null>(null);

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [dashboard, setDashboard] = useState<GroupDashboardResponse | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberUsername, setMemberUsername] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<GroupDashboardResponse["members"][number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupData, dashboardData, messageData] = await Promise.all([
        getGroup(groupId),
        getGroupDashboard(groupId),
        getGroupMessages(groupId, { limit: 80 }),
      ]);
      setGroup(groupData.group);
      setDashboard(dashboardData);
      setIsAdmin(Boolean(groupData.isAdmin));
      setMessages(messageData.messages ?? []);
      setSelectedMember((prev) => {
        if (!prev) return null;
        return dashboardData.members.find((m) => m.userId === prev.userId) ?? null;
      });
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onShareInviteCode = async () => {
    if (!group?.inviteCode) return;
    try {
      await Share.share({
        message: `Join ${group.name} on contripay using invite code: ${group.inviteCode}`,
      });
      setInviteNotice("Invite code ready to share.");
    } catch {
      setInviteNotice("Could not open share options on this device.");
    }
  };

  const onAddMember = async () => {
    const username = memberUsername.trim().toLowerCase();
    if (!username) return;

    setAddingMember(true);
    setError(null);
    setInviteNotice(null);
    try {
      const response = await addGroupMember(groupId, username);
      setInviteNotice(response.message || "Member added");
      setMemberUsername("");
      await loadData();
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setAddingMember(false);
    }
  };

  const onRemoveMember = async (userId: string) => {
    if (!dashboard || dashboard.group.roundStatus !== "completed") {
      setError("Members can only be removed after the current cycle is completed");
      return;
    }

    setRemovingMemberId(userId);
    setError(null);
    setInviteNotice(null);
    try {
      const response = await removeGroupMember(groupId, userId);
      setInviteNotice(response.message || "Member removed");
      if (selectedMember?.userId === userId) {
        setSelectedMember(null);
      }
      await loadData();
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setRemovingMemberId(null);
    }
  };

  useEffect(() => {
    void loadData();
  }, [groupId]);

  useEffect(() => {
    if (!token) return;

    const socket = io(getSocketBaseUrl(), {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("chat:join", { groupId }, (ack: { ok?: boolean; message?: string }) => {
        if (ack?.ok === false) {
          setError(ack.message ?? "Could not join the chat room.");
        }
      });
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => {
      setConnected(false);
      setError("Could not connect to live chat. Check the API connection.");
    });
    socket.on("chat:message", (message: GroupMessage) => {
      setMessages((current) => {
        if (current.some((item) => item._id === message._id)) return current;
        return [...current, message];
      });
    });

    return () => {
      socket.emit("chat:leave", { groupId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, groupId]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setError(null);
    try {
      const socket = socketRef.current;
      if (socket?.connected) {
        await new Promise<void>((resolve, reject) => {
          socket.emit("chat:send", { groupId, body }, (ack: { ok?: boolean; message?: string }) => {
            if (ack?.ok === false) {
              reject(new Error(ack.message ?? "Could not send message"));
              return;
            }
            resolve();
          });
        });
      } else {
        await sendGroupMessage(groupId, body);
      }
      setDraft("");
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setSending(false);
    }
  };

  const meta = group ? badgeColor(group.groupType) : null;
  const createdById =
    typeof group?.createdBy === "string"
      ? group.createdBy
      : group?.createdBy && typeof group.createdBy === "object" && "_id" in group.createdBy
        ? String(group.createdBy._id)
        : "";
  const canRemoveMembers = isAdmin && dashboard?.group.roundStatus === "completed";

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
          <View style={{ gap: 8 }}>
            <Eyebrow>{groupName ?? "Group details"}</Eyebrow>
            <Title>{group?.name ?? "Loading group..."}</Title>
            <Subtitle>
              Review the group ledger, current round, and live chat in one place.
            </Subtitle>
          </View>

          {loading ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <ActivityIndicator color={colors.brandSoft} />
                <Text style={{ color: colors.text, fontWeight: "700" }}>Loading group details...</Text>
              </View>
            </Card>
          ) : null}

          <ErrorText message={error} />

          {group ? (
            <Card>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignSelf: "flex-start", backgroundColor: meta?.backgroundColor ?? "rgba(214,186,255,0.20)" }}>
                      <Text style={{ color: meta?.textColor ?? colors.brandSoft, fontWeight: "800", fontSize: 11 }}>
                        {group.groupType.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{group.description || "Contribution group overview"}</Text>
                    <Text style={{ color: colors.muted, lineHeight: 20 }}>
                      Status: {group.status} · Round {group.currentRound ?? dashboard?.group.currentRound ?? 1}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Contribution</Text>
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>₦{Number(group.contributionAmount).toLocaleString()}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{group.frequency}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.panelElevated, padding: 12 }}>
                    <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Members</Text>
                    <Text style={{ color: colors.text, fontWeight: "800", marginTop: 4 }}>{dashboard?.members.length ?? group.members?.length ?? 0}</Text>
                  </View>
                    <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.panelElevated, padding: 12 }}>
                    <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Defaulters</Text>
                    <Text style={{ color: colors.text, fontWeight: "800", marginTop: 4 }}>{dashboard?.defaulters.length ?? 0}</Text>
                  </View>
                </View>
                {dashboard?.group.roundStatus === "paused" ? (
                  <View
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(255,211,154,0.35)",
                      backgroundColor: "rgba(255,211,154,0.12)",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: colors.warning, fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
                      Round Paused Due To Defaulters
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      This round is paused because at least one contribution is unresolved.
                    </Text>
                    {dashboard.group.roundGraceEndsAt ? (
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        Grace ends {new Date(dashboard.group.roundGraceEndsAt).toLocaleString()}.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <Text style={{ color: connected ? colors.accent : colors.warning, fontWeight: "700", fontSize: 12 }}>
                  {connected ? "Live chat connected" : "Chat connection pending"}
                </Text>
              </View>
            </Card>
          ) : null}

          {dashboard ? (
            <Card>
              <SectionLabel>Defaulters</SectionLabel>
              <View style={{ marginTop: 10, gap: 10 }}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Members with failed, unpaid, or defaulted contribution records.
                </Text>
                {dashboard.defaulters.length === 0 ? (
                  <View style={{ borderRadius: 12, backgroundColor: colors.panelElevated, padding: 12 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>No defaulters recorded yet.</Text>
                  </View>
                ) : (
                  dashboard.defaulters.map((member) => (
                    <View
                      key={`defaulter-${member.userId}`}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "rgba(255,211,154,0.25)",
                        backgroundColor: "rgba(255,211,154,0.08)",
                        padding: 12,
                        gap: 6,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: "800" }}>{member.name ?? member.username ?? "Member"}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        @{member.username ?? "unknown"} · failed: {member.failedContributions} · unpaid: {member.unpaidContributions} · defaulted: {member.defaultedContributions}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </Card>
          ) : null}

          {dashboard ? (
            <Card>
              <SectionLabel>Member ledger</SectionLabel>
              <View style={{ gap: 10, marginTop: 10 }}>
                {dashboard.members.slice(0, 8).map((member) => (
                  <Pressable
                    key={member.userId}
                    onPress={() => setSelectedMember(member)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                  >
                    <View style={{ borderRadius: 14, backgroundColor: colors.panelElevated, padding: 12, gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: "800" }}>{member.name ?? member.username ?? "Member"}</Text>
                          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Order #{member.order}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ color: colors.text, fontWeight: "800" }}>₦{Number(member.totalPaid).toLocaleString()}</Text>
                          <Text style={{ color: colors.muted, fontSize: 12 }}>{member.hasReceived ? "Received payout" : "Awaiting payout"}</Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        Completed {member.completedContributions} · Pending {member.pendingContributions} · Failed {member.failedContributions} · Unpaid {member.unpaidContributions}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </Card>
          ) : null}

          {selectedMember ? (
            <Card>
              <SectionLabel>Member details</SectionLabel>
              <View style={{ marginTop: 10, gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
                  {selectedMember.name ?? selectedMember.username ?? "Member"}
                </Text>
                <Text style={{ color: colors.muted }}>@{selectedMember.username ?? "unknown"} · Order #{selectedMember.order}</Text>
                <Text style={{ color: colors.muted }}>Total paid: ₦{Number(selectedMember.totalPaid).toLocaleString()}</Text>
                <Text style={{ color: colors.muted }}>
                  Completed {selectedMember.completedContributions} · Pending {selectedMember.pendingContributions} · Failed {selectedMember.failedContributions} · Unpaid {selectedMember.unpaidContributions} · Defaulted {selectedMember.defaultedContributions}
                </Text>
                <Text style={{ color: selectedMember.hasReceived ? colors.accent : colors.warning, fontWeight: "700", fontSize: 12 }}>
                  {selectedMember.hasReceived ? "Payout received" : "Payout pending"}
                </Text>
              </View>
            </Card>
          ) : null}

          {isAdmin && group?.inviteCode ? (
            <Card>
              <SectionLabel>Invite code</SectionLabel>
              <View style={{ marginTop: 10, gap: 10 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: 1.1 }}>{group.inviteCode}</Text>
                <PrimaryButton label="Share invite code" onPress={onShareInviteCode} tone="ghost" />
                {inviteNotice ? <Text style={{ color: colors.muted, fontSize: 12 }}>{inviteNotice}</Text> : null}
              </View>
            </Card>
          ) : null}

          {isAdmin ? (
            <Card>
              <SectionLabel>Add member</SectionLabel>
              <View style={{ marginTop: 10, gap: 10 }}>
                <Text style={{ color: colors.muted }}>Add a user by username.</Text>
                <TextInput
                  value={memberUsername}
                  onChangeText={setMemberUsername}
                  placeholder="e.g. janedoe"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.panelElevated,
                    color: colors.text,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                />
                <PrimaryButton
                  label={addingMember ? "Adding..." : "Add to group"}
                  onPress={() => void onAddMember()}
                  loading={addingMember}
                  tone="accent"
                />
              </View>
            </Card>
          ) : null}

          {isAdmin && dashboard ? (
            <Card>
              <SectionLabel>Remove member</SectionLabel>
              <View style={{ marginTop: 10, gap: 10 }}>
                <Text style={{ color: colors.muted }}>
                  {canRemoveMembers
                    ? "Current cycle is completed. You can remove non-admin members."
                    : "Members can only be removed after the current cycle is completed."}
                </Text>
                {dashboard.members
                  .filter((member) => member.userId !== createdById)
                  .map((member) => {
                    const busy = removingMemberId === member.userId;
                    return (
                      <View
                        key={`remove-${member.userId}`}
                        style={{
                          borderRadius: 14,
                          backgroundColor: colors.panelElevated,
                          borderWidth: 1,
                          borderColor: colors.border,
                          padding: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: "800" }}>{member.name ?? member.username ?? "Member"}</Text>
                          <Text style={{ color: colors.muted, fontSize: 12 }}>@{member.username ?? "unknown"} · Order #{member.order}</Text>
                        </View>
                        <PrimaryButton
                          label={busy ? "Removing..." : "Remove"}
                          onPress={() => {
                            if (!canRemoveMembers || busy) return;
                            Alert.alert(
                              "Remove member",
                              `Remove ${member.username ?? "this member"} from this group?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Remove",
                                  style: "destructive",
                                  onPress: () => {
                                    void onRemoveMember(member.userId);
                                  },
                                },
                              ]
                            );
                          }}
                          loading={busy}
                          tone={canRemoveMembers ? "accent" : "ghost"}
                        />
                      </View>
                    );
                  })}
              </View>
            </Card>
          ) : null}

          <Card>
            <SectionLabel>Live chat</SectionLabel>
            <View style={{ gap: 10, marginTop: 12 }}>
              {messages.length === 0 ? (
                <View style={{ paddingVertical: 10 }}>
                  <Text style={{ color: colors.muted }}>No messages yet. Start the thread for this group.</Text>
                </View>
              ) : null}
              {messages.map((message) => (
                <View key={message._id} style={{ gap: 4, padding: 12, borderRadius: 14, backgroundColor: colors.panelElevated }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{getSenderName(message.sender)}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
                  </View>
                  <Text style={{ color: colors.muted, lineHeight: 20 }}>{message.body}</Text>
                </View>
              ))}
            </View>

            <View style={{ gap: 10, marginTop: 14 }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message to your group"
                placeholderTextColor={colors.muted}
                multiline
                style={{
                  minHeight: 96,
                  textAlignVertical: "top",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.panelElevated,
                  color: colors.text,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              />
              <PrimaryButton label={sending ? "Sending..." : "Send message"} onPress={onSend} loading={sending} tone="accent" />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}