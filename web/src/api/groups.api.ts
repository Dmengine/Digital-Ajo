import { api } from "./client";

export type GroupType = "low" | "medium" | "high" | "premium";
export type GroupStatus = "open" | "active" | "completed" | "cancelled";
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

export async function getGroupById(id: string): Promise<{ success: boolean; message: string; group: any }> {
  const { data } = await api.get(`/groups/${id}`);
  return data;
}

