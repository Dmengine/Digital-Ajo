import { api } from "./client";

export type GroupType = "low" | "medium" | "high" | "premium";
export type GroupStatus = "open" | "active" | "completed" | "cancelled";
export type GroupRoundStatus = "active" | "paused" | "completed";
export type GroupFrequency = "daily" | "weekly" | "monthly";

export type GroupBrowseItem = {
  _id?: string;
  name: string;
  description?: string;
  groupType: GroupType;
  contributionAmount: number;
  frequency: GroupFrequency;
  startDate: string;
  createdAt: string;
  memberCount: number;
  lastMessageAt?: string | null;
};

export type CreateGroupBody = {
  name: string;
  description?: string;
  groupType: GroupType;
  contributionAmount: number;
  frequency: GroupFrequency;
  startDate: string | Date;
  members: string[];
};

export async function browseGroups(): Promise<{
  success: boolean;
  groups: GroupBrowseItem[];
}> {
  const { data } = await api.get("/groups/browse");
  return data;
}

export async function createGroup(body: CreateGroupBody): Promise<{ success: boolean; message: string; group: any }> {
  const { data } = await api.post("/groups", body);
  return data;
}

export async function joinGroupByInvite(inviteCode: string): Promise<{ success: boolean; message: string; group: any }> {
  const { data } = await api.post("/groups/join", { inviteCode });
  return data;
}

export async function getGroupById(id: string): Promise<{
  success: boolean;
  message: string;
  group: any;
  isAdmin?: boolean;
}> {
  const { data } = await api.get(`/groups/${id}`);
  return data;
}

export type GroupDashboardMember = {
  userId: string;
  name?: string;
  username?: string;
  order: number;
  hasReceived: boolean;
  bufferHeld: number;
  completedContributions: number;
  failedContributions: number;
  unpaidContributions: number;
  defaultedContributions: number;
  pendingContributions: number;
  totalPaid: number;
};

export async function getGroupDashboard(id: string): Promise<{
  success: boolean;
  isAdmin: boolean;
  group: {
    _id: string;
    name: string;
    currentRound: number;
    roundStatus?: GroupRoundStatus;
    roundDueAt?: string;
    roundGraceEndsAt?: string;
    contributionAmount: number;
    frequency: string;
    status: string;
    startDate: string;
  };
  members: GroupDashboardMember[];
  defaulters: GroupDashboardMember[];
}> {
  const { data } = await api.get(`/groups/${id}/dashboard`);
  return data;
}

export type GroupChatMessage = {
  _id: string;
  body: string;
  createdAt: string;
  sender: { _id: string; name?: string; username?: string };
};

export async function getGroupMessages(
  id: string,
  opts?: { since?: string; limit?: number }
): Promise<{ success: boolean; messages: GroupChatMessage[] }> {
  const { data } = await api.get(`/groups/${id}/messages`, {
    params: { since: opts?.since, limit: opts?.limit },
  });
  return data;
}

export async function postGroupMessage(
  id: string,
  body: string
): Promise<{ success: boolean; message: GroupChatMessage }> {
  const { data } = await api.post(`/groups/${id}/messages`, { body });
  return data;
}

export async function addGroupMember(
  id: string,
  username: string
): Promise<{ success: boolean; message: string; group: any }> {
  const { data } = await api.post(`/groups/${id}/members`, { username });
  return data;
}

export async function removeGroupMember(
  id: string,
  userId: string
): Promise<{ success: boolean; message: string; group: any }> {
  const { data } = await api.delete(`/groups/${id}/members/${userId}`);
  return data;
}

