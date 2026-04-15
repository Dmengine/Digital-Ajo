import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Tabs from "@radix-ui/react-tabs";
import { io, type Socket } from "socket.io-client";
import {
  getGroupById,
  getGroupDashboard,
  getGroupMessages,
  addGroupMember,
  removeGroupMember,
  type GroupType,
  type GroupChatMessage,
} from "../api/groups.api";
import { getSocketBaseUrl } from "../lib/socketBaseUrl";
import { getAxiosErrorMessage } from "../utils/apiErrors";
import { useAuthStore } from "../store/authStore";
import { useEffect, useRef, useState } from "react";

function tone(groupType: GroupType) {
  switch (groupType) {
    case "low":
      return "bg-blue-500/20 text-blue-300 border border-blue-500/40";
    case "medium":
      return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
    case "high":
      return "bg-orange-500/20 text-orange-300 border border-orange-500/40";
    case "premium":
      return "bg-purple-500/20 text-purple-300 border border-purple-500/40";
  }
}

const groupSeenKey = (groupId: string) => `group.lastSeen.${groupId}`;

export default function GroupDetail() {
  const { id } = useParams();
  const groupId = id ? String(id) : "";
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const [addUsername, setAddUsername] = useState("");
  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState<GroupChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["group", id],
    queryFn: () => getGroupById(groupId),
    enabled: !!id,
  });

  const dashQ = useQuery({
    queryKey: ["group", id, "dashboard"],
    queryFn: () => getGroupDashboard(groupId),
    enabled: !!id,
  });

  const msgQ = useQuery({
    queryKey: ["group", id, "messages"],
    queryFn: () => getGroupMessages(groupId, { limit: 150 }),
    enabled: !!id,
  });

  const group = data?.group;
  const isAdmin = Boolean(data?.isAdmin);
  const createdById =
    group?.createdBy && typeof group.createdBy === "object" && group.createdBy !== null && "_id" in group.createdBy
      ? String((group.createdBy as { _id: string })._id)
      : String(group?.createdBy ?? "");

  const invalidateGroup = () => {
    void queryClient.invalidateQueries({ queryKey: ["group", id] });
    void queryClient.invalidateQueries({ queryKey: ["group", id, "dashboard"] });
  };

  const addMut = useMutation({
    mutationFn: (username: string) => addGroupMember(groupId, username),
    onSuccess: () => {
      setAddUsername("");
      invalidateGroup();
    },
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => removeGroupMember(groupId, userId),
    onSuccess: () => {
      invalidateGroup();
    },
  });

  useEffect(() => {
    if (msgQ.data?.messages) setChatMessages(msgQ.data.messages);
  }, [msgQ.data?.messages]);

  useEffect(() => {
    if (!groupId) return;
    if (!msgQ.data?.messages?.length) return;

    const latest = msgQ.data.messages[msgQ.data.messages.length - 1];
    if (latest?.createdAt) {
      localStorage.setItem(groupSeenKey(groupId), latest.createdAt);
    }
  }, [groupId, msgQ.data?.messages]);

  useEffect(() => {
    if (!token || !groupId) return;

    const socket = io(getSocketBaseUrl(), {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    setChatError(null);

    socket.on("connect", () => {
      setWsConnected(true);
      setChatError(null);
      socket.emit("chat:join", { groupId }, (ack: { ok?: boolean; message?: string }) => {
        if (ack && ack.ok === false) {
          setChatError(ack.message ?? "Could not join chat");
        }
      });
    });

    socket.on("disconnect", () => setWsConnected(false));

    socket.on("connect_error", () => {
      setWsConnected(false);
      setChatError("Could not connect to live chat. Check that the API is running and CORS allows this origin.");
    });

    socket.on("chat:message", (msg: GroupChatMessage) => {
      if (msg?.createdAt && groupId) {
        localStorage.setItem(groupSeenKey(groupId), msg.createdAt);
      }
      setChatMessages((prev) => {
        const mid = String(msg._id);
        if (prev.some((m) => String(m._id) === mid)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.emit("chat:leave", { groupId });
      socket.disconnect();
      socketRef.current = null;
      setWsConnected(false);
    };
  }, [token, groupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  const shareLink = group?.inviteCode
    ? `${window.location.origin}/join?code=${encodeURIComponent(group.inviteCode)}`
    : null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setInviteNotice("Invite copied. Share it with anyone you want to join.");
      return true;
    } catch {
      setInviteNotice("Could not copy invite link on this device.");
      return false;
    }
  };

  const shareInvite = async () => {
    if (!shareLink) return;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Join ${group?.name ?? "my group"} on ContriPay`,
          text: "Use this invite link to join my contribution group on ContriPay.",
          url: shareLink,
        });
        setInviteNotice("Invite link shared.");
        return;
      } catch {
        // Fall back to clipboard below if share is canceled/unsupported.
      }
    }

    await copy(shareLink);
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6 text-[#cdc2d7]">
          Loading group...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 p-6 text-sm text-[#ffb4ab]">
          {getAxiosErrorMessage(error)}
        </div>
      ) : null}

      {group ? (
        <Tabs.Root defaultValue="dashboard" className="space-y-4">
          <div className="relative">
            <div className="absolute -inset-1 bg-linear-to-r from-[#d6baff]/20 to-[#40e56c]/10 blur-2xl opacity-50 pointer-events-none"></div>
            <div className="relative rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="font-headline text-3xl font-extrabold text-[#d6baff] tracking-tight">{group.name}</h1>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className={["rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider", tone(group.groupType)].join(" ")}>
                      {String(group.groupType).toUpperCase()}
                    </div>
                    <div className="rounded-lg bg-[#323538] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#e1e2e7]">
                      Status: {group.status}
                    </div>
                    {dashQ.data?.group?.roundStatus ? (
                      <div className="rounded-lg bg-[#323538] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#e1e2e7]">
                        Round: {dashQ.data.group.roundStatus}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-lg bg-linear-to-br from-[#d6baff]/20 to-[#40e56c]/10 border border-[#d6baff]/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-[#968da0] font-bold">Contribution</div>
                  <div className="mt-2 font-headline text-2xl font-bold text-[#d6baff]">₦{group.contributionAmount}</div>
                  <div className="mt-1 text-xs text-[#968da0]">Frequency: {group.frequency}</div>
                </div>
              </div>

              <Tabs.List className="mt-6 flex flex-wrap gap-2 border-t border-[#4b4454]/30 pt-4">
                {(["dashboard", "chat", "about"] as const).map((tab) => (
                  <Tabs.Trigger
                    key={tab}
                    value={tab}
                    className="rounded-lg px-4 py-2 text-sm font-bold text-[#968da0] data-[state=active]:bg-[#d6baff] data-[state=active]:text-[#111417] transition-all"
                  >
                    {tab === "dashboard" ? "Dashboard" : tab === "chat" ? "Chat" : "About"}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </div>
          </div>

          <Tabs.Content value="dashboard" className="space-y-4 outline-none">
            {dashQ.isLoading ? (
              <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6 text-[#cdc2d7]">Loading dashboard...</div>
            ) : null}
            {dashQ.error ? (
              <div className="rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 p-4 text-sm text-[#ffb4ab]">
                {getAxiosErrorMessage(dashQ.error)}
              </div>
            ) : null}

            {dashQ.data ? (
              <>
                <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
                  <h2 className="font-headline text-xl font-bold text-[#e1e2e7]">Member Overview</h2>
                  <p className="mt-2 text-sm text-[#968da0]">
                    Round {dashQ.data.group.currentRound} · Totals from recorded contributions in this group.
                  </p>
                  {dashQ.data.group.roundStatus === "paused" ? (
                    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                      This round is paused because at least one contribution is unresolved.
                      {dashQ.data.group.roundGraceEndsAt
                        ? ` Grace period ends ${new Date(dashQ.data.group.roundGraceEndsAt).toLocaleString()}.`
                        : ""}
                    </div>
                  ) : null}
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-160 text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#4b4454]/30 text-xs font-bold uppercase text-[#968da0] tracking-wider">
                          <th className="py-3 pr-3">Member</th>
                          <th className="py-3 pr-3">Order</th>
                          <th className="py-3 pr-3">Paid in</th>
                          <th className="py-3 pr-3">Completed</th>
                          <th className="py-3 pr-3">Pending</th>
                          <th className="py-3 pr-3">Failed</th>
                          <th className="py-3 pr-3">Unpaid</th>
                          <th className="py-3 pr-3">Defaulted</th>
                          <th className="py-3">Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashQ.data.members.map((m) => (
                          <tr key={m.userId} className="border-b border-[#4b4454]/10 text-[#e1e2e7] hover:bg-[#323538]/30">
                            <td className="py-3 pr-3">
                              <div className="font-bold text-[#e1e2e7]">{m.name ?? "—"}</div>
                              <div className="text-xs text-[#968da0]">@{m.username ?? "—"}</div>
                            </td>
                            <td className="py-3 pr-3">#{m.order}</td>
                            <td className="py-3 pr-3">₦{m.totalPaid.toLocaleString()}</td>
                            <td className="py-3 pr-3">{m.completedContributions}</td>
                            <td className="py-3 pr-3">{m.pendingContributions}</td>
                            <td className="py-3 pr-3">{m.failedContributions}</td>
                            <td className="py-3 pr-3">{m.unpaidContributions}</td>
                            <td className="py-3 pr-3">{m.defaultedContributions}</td>
                            <td className="py-3">
                              {m.hasReceived ? (
                                <span className="rounded-lg bg-[#40e56c]/20 px-2 py-1 text-xs font-bold text-[#40e56c] uppercase tracking-wide">
                                  Received
                                </span>
                              ) : (
                                <span className="rounded-lg bg-[#968da0]/20 px-2 py-1 text-xs font-bold text-[#968da0] uppercase tracking-wide">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-6">
                  <h2 className="font-headline text-xl font-bold text-[#e1e2e7]">Defaulters</h2>
                  <p className="mt-2 text-sm text-[#968da0]">
                    Members with failed, unpaid, or defaulted contribution records in this group.
                  </p>
                  {dashQ.data.defaulters.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-4 text-sm text-[#968da0]">
                      No defaulters recorded yet.
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {dashQ.data.defaulters.map((d) => (
                        <li
                          key={d.userId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                        >
                          <div>
                            <div className="font-bold text-[#e1e2e7]">{d.name ?? "Member"}</div>
                            <div className="text-xs text-[#968da0]">
                              @{d.username ?? "—"} · failed: {d.failedContributions} · unpaid: {d.unpaidContributions} · defaulted: {d.defaultedContributions}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {isAdmin ? (
                  <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
                    <h2 className="font-headline text-xl font-bold text-[#e1e2e7]">Manage Members</h2>
                    <p className="mt-2 text-sm text-[#968da0]">Add a user by their username (they must meet group KYC rules).</p>

                    {shareLink ? (
                      <div className="mt-6 rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-4">
                        <div className="text-sm font-bold text-[#e1e2e7]">Invite People to This Group</div>
                        <div className="mt-2 break-all font-mono text-xs text-[#968da0]">{shareLink}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={shareInvite}
                            className="rounded-lg bg-[#40e56c] px-4 py-2 text-xs font-bold text-[#003912] uppercase tracking-wide hover:opacity-90 transition-all"
                          >
                            Share Invite Link
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void copy(shareLink);
                            }}
                            className="rounded-lg bg-linear-to-br from-[#d6baff] to-[#ab73ff] px-4 py-2 text-xs font-bold text-[#111417] uppercase tracking-wide hover:opacity-90 transition-all"
                          >
                            Copy Invite Link
                          </button>
                        </div>
                        {inviteNotice ? (
                          <div className="mt-3 text-xs text-[#968da0]">{inviteNotice}</div>
                        ) : null}
                      </div>
                    ) : null}

                    <form
                      className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const u = addUsername.trim().toLowerCase();
                        if (!u) return;
                        addMut.mutate(u);
                      }}
                    >
                      <div className="flex-1">
                        <label className="text-xs uppercase tracking-wider text-[#968da0] font-bold">Username</label>
                        <input
                          value={addUsername}
                          onChange={(e) => setAddUsername(e.target.value)}
                          className="mt-2 w-full rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-sm text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
                          placeholder="e.g. janedoe"
                          autoComplete="off"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={addMut.isPending || !addUsername.trim()}
                        className="rounded-lg bg-linear-to-br from-[#d6baff] to-[#ab73ff] px-6 py-2 text-sm font-bold text-[#111417] uppercase tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {addMut.isPending ? "Adding…" : "Add Member"}
                      </button>
                    </form>
                    {addMut.isError ? (
                      <div className="mt-3 text-sm text-[#ffb4ab]">{getAxiosErrorMessage(addMut.error)}</div>
                    ) : null}

                    <div className="mt-6 space-y-2">
                      <div className="text-sm font-bold text-[#e1e2e7]">Remove Member</div>
                      {(group.members ?? []).map((m: { user?: { _id?: string; username?: string; name?: string }; order: number }) => {
                        const uid = m.user?._id ? String(m.user._id) : "";
                        const isCreator = uid && createdById && uid === createdById;
                        return (
                          <div
                            key={uid || m.order}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 px-4 py-3"
                          >
                            <span className="text-sm text-[#e1e2e7]">
                              {m.user?.name ?? "Member"} <span className="text-[#968da0]">(@{m.user?.username ?? "—"})</span>
                            </span>
                            {isAdmin && uid && !isCreator ? (
                              <button
                                type="button"
                                disabled={removeMut.isPending}
                                onClick={() => {
                                  if (window.confirm(`Remove ${m.user?.username ?? "this member"} from the group?`)) {
                                    removeMut.mutate(uid);
                                  }
                                }}
                                className="rounded-lg bg-[#ffb4ab]/20 px-3 py-1 text-xs font-bold text-[#ffb4ab] uppercase tracking-wide hover:bg-[#ffb4ab]/30 transition-all disabled:opacity-60"
                              >
                                Remove
                              </button>
                            ) : isCreator ? (
                              <span className="text-xs font-bold text-[#968da0] uppercase tracking-wide">Admin</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {removeMut.isError ? (
                      <div className="mt-3 text-sm text-[#ffb4ab]">{getAxiosErrorMessage(removeMut.error)}</div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </Tabs.Content>

          <Tabs.Content value="chat" className="outline-none">
            <div className="flex h-[min(520px,70vh)] flex-col rounded-lg border border-[#4b4454]/30 bg-[#1d2023]">
              <div className="border-b border-[#4b4454]/30 px-4 py-3">
                <h2 className="text-sm font-bold text-[#e1e2e7] uppercase tracking-wide">Group Chat</h2>
                <p className="text-xs text-[#968da0] mt-1">
                  Live updates via WebSocket. Visible to all members.
                  {wsConnected ? (
                    <span className="ml-2 font-bold text-[#40e56c]">Connected</span>
                  ) : (
                    <span className="ml-2 font-bold text-amber-400">Connecting…</span>
                  )}
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {msgQ.isLoading ? <div className="text-sm text-[#968da0]">Loading history…</div> : null}
                {msgQ.error ? (
                  <div className="text-sm text-[#ffb4ab]">{getAxiosErrorMessage(msgQ.error)}</div>
                ) : null}
                {chatError ? <div className="text-sm text-[#ffb4ab]">{chatError}</div> : null}
                {chatMessages.map((msg) => {
                  const senderId = msg.sender?._id != null ? String(msg.sender._id) : "";
                  const mine = Boolean(me?._id && senderId && senderId === me._id);
                  return (
                    <div key={msg._id} className={["flex", mine ? "justify-end" : "justify-start"].join(" ")}>
                      <div
                        className={[
                          "max-w-[85%] rounded-lg px-4 py-2 text-sm",
                          mine
                            ? "bg-linear-to-br from-[#d6baff] to-[#ab73ff] text-[#111417] font-bold"
                            : "border border-[#4b4454]/30 bg-[#323538] text-[#e1e2e7]",
                        ].join(" ")}
                      >
                        {!mine ? (
                          <div className="mb-2 text-xs font-bold text-[#d6baff] uppercase tracking-wide">
                            {msg.sender?.name ?? msg.sender?.username ?? "Member"}
                          </div>
                        ) : null}
                        <div className="whitespace-pre-wrap break-word">{msg.body}</div>
                        <div
                          className={[
                            "mt-2 text-[10px] opacity-75",
                            mine ? "text-[#111417]/80" : "text-[#968da0]",
                          ].join(" ")}
                        >
                          {new Date(msg.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <form
                className="border-t border-[#4b4454]/30 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = chatText.trim();
                  const sock = socketRef.current;
                  if (!t || chatSending || !sock?.connected) return;
                  setChatSending(true);
                  setChatError(null);
                  sock.emit(
                    "chat:send",
                    { groupId, body: t },
                    (ack: { ok?: boolean; message?: string }) => {
                      setChatSending(false);
                      if (ack?.ok) setChatText("");
                      else setChatError(ack?.message ?? "Could not send message");
                    }
                  );
                }}
              >
                <div className="flex gap-2">
                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    className="flex-1 rounded-lg border border-[#4b4454]/30 bg-[#323538] px-4 py-2 text-sm text-[#e1e2e7] placeholder:text-[#968da0] outline-none focus:ring-2 focus:ring-[#d6baff]/40 transition-all"
                    placeholder="Write a message…"
                    maxLength={2000}
                  />
                  <button
                    type="submit"
                    disabled={chatSending || !chatText.trim() || !wsConnected}
                    className="rounded-lg bg-[#40e56c] px-6 py-2 text-sm font-bold text-[#003912] uppercase tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {chatSending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </Tabs.Content>

          <Tabs.Content value="about" className="space-y-4 outline-none">
            <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
              <div className="text-sm text-[#e1e2e7]">{group.description || "No description."}</div>

              <div className="mt-6 space-y-3">
                <div className="rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-4">
                  <div className="text-xs uppercase tracking-wider text-[#968da0] font-bold">Invite Code</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[#d6baff]">
                      {group.inviteCode ?? "—"}
                    </span>
                    {group.inviteCode ? (
                      <button
                        type="button"
                        onClick={() => copy(String(group.inviteCode))}
                        className="rounded-lg bg-linear-to-br from-[#d6baff] to-[#ab73ff] px-3 py-1 text-xs font-bold text-[#111417] uppercase tracking-wide hover:opacity-90 transition-all"
                      >
                        Copy
                      </button>
                    ) : null}
                  </div>
                </div>

                {shareLink ? (
                  <div className="rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 p-4">
                    <div className="text-xs uppercase tracking-wider text-[#968da0] font-bold">Invite Link</div>
                    <div className="mt-2 break-all font-mono text-xs text-[#cdc2d7]">{shareLink}</div>
                    <button
                      type="button"
                      onClick={() => copy(shareLink)}
                      className="mt-3 rounded-lg bg-[#40e56c] px-3 py-1 text-xs font-bold text-[#003912] uppercase tracking-wide hover:opacity-90 transition-all"
                    >
                      Copy Link
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-[#4b4454]/30 bg-[#1d2023] p-6">
              <div className="text-sm font-bold text-[#e1e2e7] uppercase tracking-wide">Members</div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(group.members ?? []).map((m: any) => (
                  <div
                    key={m._id ?? m.user?._id ?? m.order}
                    className="flex items-center justify-between rounded-lg border border-[#4b4454]/30 bg-[#323538]/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#d6baff]/20 flex items-center justify-center text-sm font-bold text-[#d6baff]">
                        {m.user?.username?.slice(0, 2).toUpperCase() ?? "??"}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#e1e2e7]">{m.user?.name ?? "Member"}</div>
                        <div className="text-xs text-[#968da0]">Order #{m.order}</div>
                      </div>
                    </div>
                    {m.hasReceived ? (
                      <div className="rounded-lg bg-[#40e56c]/20 px-3 py-1 text-xs font-bold text-[#40e56c] uppercase tracking-wide">
                        Received
                      </div>
                    ) : (
                      <div className="rounded-lg bg-[#968da0]/20 px-3 py-1 text-xs font-bold text-[#968da0] uppercase tracking-wide">
                        Pending
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      ) : null}
    </div>
  );
}
