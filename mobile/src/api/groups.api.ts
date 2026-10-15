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
  confirmedContributions: number;
  markedPaidContributions: number;
  unpaidContributions: number;
  defaultedContributions: number;
  pendingContributions: number;
  totalConfirmedPaid: number;
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

/** pending -> marked_paid (payer says sent) -> confirmed (recipient received). unpaid/defaulted during grace. */
export type ContributionStatus = "pending" | "marked_paid" | "confirmed" | "unpaid" | "defaulted";

export type RoundPayment = {
  userId: string;
  name: string | null;
  username: string | null;
  status: ContributionStatus;
  markedPaidAt: string | null;
  confirmedAt: string | null;
  disputedAt: string | null;
  /** Only visible to the payer themselves and the round's recipient. */
  payerReference: string | null;
};

export type CurrentRound = {
  number: number;
  status: "active" | "paused" | "completed";
  amount: number;
  dueAt: string | null;
  graceEndsAt: string | null;
  isRecipient: boolean;
  recipient: {
    userId: string;
    name: string | null;
    username: string | null;
    bankAccount: {
      accountNumber: string;
      accountName: string | null;
      bankName: string | null;
      confirmed: boolean;
    } | null;
  };
  payments: RoundPayment[];
  myPayment: RoundPayment | null;
};

export type CurrentRoundResponse = {
  success: boolean;
  groupId: string;
  groupName: string;
  groupStatus: "open" | "active" | "completed" | "cancelled";
  isAdmin: boolean;
  totalRounds: number;
  membershipLocksAt: string;
  round: CurrentRound | null;
};

export const getCurrentRound = async (groupId: string): Promise<CurrentRoundResponse> => {
  const { data } = await api.get(`/groups/${groupId}/rounds/current`);
  return data;
};

export const markRoundPaid = async (groupId: string, reference?: string) => {
  const { data } = await api.post(`/groups/${groupId}/rounds/current/mark-paid`, {
    reference: reference?.trim() || undefined,
  });
  return data as { success: boolean; message: string };
};

export const confirmRoundPayment = async (groupId: string, payerId: string) => {
  const { data } = await api.post(`/groups/${groupId}/rounds/current/confirm/${payerId}`);
  return data as { success: boolean; message: string; roundSettled: boolean };
};

export const disputeRoundPayment = async (groupId: string, payerId: string) => {
  const { data } = await api.post(`/groups/${groupId}/rounds/current/dispute/${payerId}`);
  return data as { success: boolean; message: string };
};
