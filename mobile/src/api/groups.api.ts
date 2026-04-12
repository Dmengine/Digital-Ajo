import { api } from "./client";

export type GroupType = "low" | "medium" | "high" | "premium";

export type GroupSummary = {
  _id: string;
  name: string;
  description?: string;
  groupType: GroupType;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  startDate?: string;
  createdAt?: string;
  memberCount: number;
  lastMessageAt?: string | null;
};

export type GroupMemberSummary = {
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

export type GroupMessage = {
  _id: string;
  groupAjo: string;
  sender:
    | {
        _id: string;
        name?: string;
        username?: string;
      }
    | string;
  body: string;
  createdAt: string;
  updatedAt?: string;
};

export type GroupDetail = {
  _id: string;
  name: string;
  description?: string;
  groupType: GroupType;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  status: string;
  startDate: string;
  inviteCode?: string;
  currentRound?: number;
  createdBy?: string | { _id: string; name?: string; username?: string };
  members?: Array<{
    user: string | { _id: string; name?: string; username?: string };
    order: number;
    hasReceived: boolean;
    bufferHeld: number;
  }>;
};

export type GroupDetailResponse = {
  success: boolean;
  message?: string;
  isAdmin: boolean;
  group: GroupDetail;
};

export type GroupDashboardResponse = {
  success: boolean;
  isAdmin: boolean;
  group: {
    _id: string;
    name: string;
    currentRound: number;
    roundStatus?: "active" | "paused" | "completed";
    roundDueAt?: string;
    roundGraceEndsAt?: string;
    contributionAmount: number;
    frequency: "daily" | "weekly" | "monthly";
    status: string;
    startDate: string;
  };
  members: GroupMemberSummary[];
  defaulters: GroupMemberSummary[];
};

export type GroupMessagesResponse = {
  success: boolean;
  messages: GroupMessage[];
};

export const browseGroups = async () => {
  const { data } = await api.get("/groups/browse");
  return data;
};

export const joinGroup = async (inviteCode: string) => {
  const { data } = await api.post("/groups/join", { inviteCode });
  return data;
};

export const getGroup = async (groupId: string): Promise<GroupDetailResponse> => {
  const { data } = await api.get(`/groups/${groupId}`);
  return data;
};

export const getGroupDashboard = async (groupId: string): Promise<GroupDashboardResponse> => {
  const { data } = await api.get(`/groups/${groupId}/dashboard`);
  return data;
};

export const getGroupMessages = async (
  groupId: string,
  options?: { limit?: number; since?: string }
): Promise<GroupMessagesResponse> => {
  const { data } = await api.get(`/groups/${groupId}/messages`, { params: options });
  return data;
};

export const sendGroupMessage = async (groupId: string, body: string) => {
  const { data } = await api.post(`/groups/${groupId}/messages`, { body });
  return data;
};

export const addGroupMember = async (groupId: string, username: string) => {
  const { data } = await api.post(`/groups/${groupId}/members`, { username });
  return data as { success: boolean; message: string };
};

export const removeGroupMember = async (groupId: string, userId: string) => {
  const { data } = await api.delete(`/groups/${groupId}/members/${userId}`);
  return data as { success: boolean; message: string };
};

export const createGroup = async (payload: {
  name: string;
  description?: string;
  groupType: "low" | "medium" | "high" | "premium";
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  startDate: string;
}) => {
  const { data } = await api.post("/groups", payload);
  return data;
};
