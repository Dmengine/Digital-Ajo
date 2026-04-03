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
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "medium":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "high":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "premium":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
  }
}

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
    } catch {
      // ignore for MVP
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
          Loading group...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-300">
          {getAxiosErrorMessage(error)}
        </div>
      ) : null}

      {group ? (
        <Tabs.Root defaultValue="dashboard" className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/70 p-4 shadow-sm dark:bg-slate-900/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{group.name}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className={["rounded-xl px-3 py-1 text-xs font-semibold", tone(group.groupType)].join(" ")}>
                    {String(group.groupType).toUpperCase()}
                  </div>
                  <div className="rounded-xl bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                    Status: {group.status}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-indigo-500/15 to-emerald-500/10 p-4">
                <div className="text-xs text-slate-600 dark:text-slate-300">Contribution</div>
                <div className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">₦{group.contributionAmount}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Frequency: {group.frequency}</div>
              </div>
            </div>

            <Tabs.List className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              {(["dashboard", "chat", "about"] as const).map((tab) => (
                <Tabs.Trigger
                  key={tab}
                  value={tab}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-indigo-600 data-[state=active]:text-white dark:text-slate-300 dark:data-[state=active]:bg-indigo-500"
                >
                  {tab === "dashboard" ? "Dashboard" : tab === "chat" ? "Chat" : "About"}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </div>

          <Tabs.Content value="dashboard" className="space-y-4 outline-none">
            {dashQ.isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/70 p-6 dark:bg-slate-900/40">Loading dashboard...</div>
            ) : null}
            {dashQ.error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
                {getAxiosErrorMessage(dashQ.error)}
              </div>
            ) : null}

            {dashQ.data ? (
              <>
                <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Member overview</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Round {dashQ.data.group.currentRound} · Totals from recorded contributions in this group.
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs text-slate-500 dark:text-slate-400">
                          <th className="py-2 pr-3 font-medium">Member</th>
                          <th className="py-2 pr-3 font-medium">Order</th>
                          <th className="py-2 pr-3 font-medium">Paid in</th>
                          <th className="py-2 pr-3 font-medium">Completed</th>
                          <th className="py-2 pr-3 font-medium">Pending</th>
                          <th className="py-2 pr-3 font-medium">Failed</th>
                          <th className="py-2 font-medium">Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashQ.data.members.map((m) => (
                          <tr key={m.userId} className="border-b border-white/5 text-slate-800 dark:text-slate-200">
                            <td className="py-3 pr-3">
                              <div className="font-semibold">{m.name ?? "—"}</div>
                              <div className="text-xs text-slate-500">@{m.username ?? "—"}</div>
                            </td>
                            <td className="py-3 pr-3">#{m.order}</td>
                            <td className="py-3 pr-3">₦{m.totalPaid.toLocaleString()}</td>
                            <td className="py-3 pr-3">{m.completedContributions}</td>
                            <td className="py-3 pr-3">{m.pendingContributions}</td>
                            <td className="py-3 pr-3">{m.failedContributions}</td>
                            <td className="py-3">
                              {m.hasReceived ? (
                                <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                  Received
                                </span>
                              ) : (
                                <span className="rounded-lg bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
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

                <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 dark:bg-amber-500/10">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Defaulters</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Members with at least one failed contribution record for this group.
                  </p>
                  {dashQ.data.defaulters.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/60 p-4 text-sm text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                      No defaulters recorded yet.
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {dashQ.data.defaulters.map((d) => (
                        <li
                          key={d.userId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500/20 bg-white/70 px-4 py-3 dark:bg-slate-900/50"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{d.name ?? "Member"}</div>
                            <div className="text-xs text-slate-500">
                              @{d.username ?? "—"} · failed payments: {d.failedContributions}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {isAdmin ? (
                  <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Manage members</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Add a user by their username (they must meet group KYC rules).</p>
                    <form
                      className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const u = addUsername.trim().toLowerCase();
                        if (!u) return;
                        addMut.mutate(u);
                      }}
                    >
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 dark:text-slate-400">Username</label>
                        <input
                          value={addUsername}
                          onChange={(e) => setAddUsername(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-sm dark:bg-slate-950/50"
                          placeholder="e.g. janedoe"
                          autoComplete="off"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={addMut.isPending || !addUsername.trim()}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {addMut.isPending ? "Adding…" : "Add member"}
                      </button>
                    </form>
                    {addMut.isError ? (
                      <div className="mt-2 text-sm text-rose-600 dark:text-rose-300">{getAxiosErrorMessage(addMut.error)}</div>
                    ) : null}

                    <div className="mt-6 space-y-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">Remove member</div>
                      {(group.members ?? []).map((m: { user?: { _id?: string; username?: string; name?: string }; order: number }) => {
                        const uid = m.user?._id ? String(m.user._id) : "";
                        const isCreator = uid && createdById && uid === createdById;
                        return (
                          <div
                            key={uid || m.order}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/60 px-3 py-2 dark:bg-slate-900/40"
                          >
                            <span className="text-sm">
                              {m.user?.name ?? "Member"} <span className="text-slate-500">(@{m.user?.username ?? "—"})</span>
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
                                className="rounded-lg bg-rose-600/90 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            ) : isCreator ? (
                              <span className="text-xs font-medium text-slate-500">Admin</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {removeMut.isError ? (
                      <div className="mt-2 text-sm text-rose-600 dark:text-rose-300">{getAxiosErrorMessage(removeMut.error)}</div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </Tabs.Content>

          <Tabs.Content value="chat" className="outline-none">
            <div className="flex h-[min(520px,70vh)] flex-col rounded-3xl border border-white/10 bg-white/70 shadow-sm dark:bg-slate-900/40">
              <div className="border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Group chat</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Live updates via WebSocket. Visible to all members.
                  {wsConnected ? (
                    <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
                  ) : (
                    <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">Connecting…</span>
                  )}
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {msgQ.isLoading ? <div className="text-sm text-slate-500">Loading history…</div> : null}
                {msgQ.error ? (
                  <div className="text-sm text-rose-600 dark:text-rose-300">{getAxiosErrorMessage(msgQ.error)}</div>
                ) : null}
                {chatError ? <div className="text-sm text-rose-600 dark:text-rose-300">{chatError}</div> : null}
                {chatMessages.map((msg) => {
                  const senderId = msg.sender?._id != null ? String(msg.sender._id) : "";
                  const mine = Boolean(me?._id && senderId && senderId === me._id);
                  return (
                    <div key={msg._id} className={["flex", mine ? "justify-end" : "justify-start"].join(" ")}>
                      <div
                        className={[
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          mine
                            ? "bg-indigo-600 text-white"
                            : "border border-white/10 bg-white/80 text-slate-900 dark:bg-slate-950/60 dark:text-slate-100",
                        ].join(" ")}
                      >
                        {!mine ? (
                          <div className="mb-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                            {msg.sender?.name ?? msg.sender?.username ?? "Member"}
                          </div>
                        ) : null}
                        <div className="whitespace-pre-wrap break-words">{msg.body}</div>
                        <div
                          className={[
                            "mt-1 text-[10px] opacity-80",
                            mine ? "text-indigo-100" : "text-slate-500 dark:text-slate-400",
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
                className="border-t border-white/10 p-3"
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
                    className="flex-1 rounded-xl border border-white/10 bg-white px-3 py-2 text-sm dark:bg-slate-950/50"
                    placeholder="Write a message…"
                    maxLength={2000}
                  />
                  <button
                    type="submit"
                    disabled={chatSending || !chatText.trim() || !wsConnected}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {chatSending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </Tabs.Content>

          <Tabs.Content value="about" className="space-y-4 outline-none">
            <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
              <div className="text-sm text-slate-600 dark:text-slate-300">{group.description || "No description."}</div>

              <div className="mt-5 space-y-2">
                <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-950/40">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Invite code</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-950 dark:text-white">
                      {group.inviteCode ?? "—"}
                    </span>
                    {group.inviteCode ? (
                      <button
                        type="button"
                        onClick={() => copy(String(group.inviteCode))}
                        className="rounded-xl bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Copy
                      </button>
                    ) : null}
                  </div>
                </div>

                {shareLink ? (
                  <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-950/40">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Invite link</div>
                    <div className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-200">{shareLink}</div>
                    <button
                      type="button"
                      onClick={() => copy(shareLink)}
                      className="mt-2 rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Copy link
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/40">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Members</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(group.members ?? []).map((m: any) => (
                  <div
                    key={m._id ?? m.user?._id ?? m.order}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/60 px-3 py-3 dark:bg-slate-900/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-500/10 pt-2 text-center text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        {m.user?.username?.slice(0, 2).toUpperCase() ?? "??"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{m.user?.name ?? "Member"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Order #{m.order}</div>
                      </div>
                    </div>
                    {m.hasReceived ? (
                      <div className="rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        Received
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
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
