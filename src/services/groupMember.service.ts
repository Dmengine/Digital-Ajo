import mongoose from "mongoose";
import { GroupAjoModel } from "../models/groupAjo.model";
import type { GroupRiskType } from "../models/groupAjo.model";
import { HttpError } from "../errors/HttpError";

export type GroupAjoDoc = mongoose.Document<mongoose.Types.ObjectId> & {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  groupType: GroupRiskType;
  members: Array<{ user: mongoose.Types.ObjectId; order: number; hasReceived: boolean }>;
  currentRound: number;
  roundStatus: "active" | "paused" | "completed";
  roundDueAt?: Date;
  roundGraceEndsAt?: Date;
  contributionAmount: number;
  frequency: string;
  status: string;
  isCompleted?: boolean;
  startDate: Date;
};

export async function requireGroupMember(
  groupId: string,
  userId: string
): Promise<{ group: GroupAjoDoc; isAdmin: boolean }> {
  if (!mongoose.isValidObjectId(groupId)) throw new HttpError(400, "Invalid group ID");
  const group = (await GroupAjoModel.findById(groupId)) as GroupAjoDoc | null;
  if (!group) throw new HttpError(404, "Group not found");
  const isAdmin = group.createdBy.toString() === userId;
  const isMember = group.members.some((m) => m.user.toString() === userId);
  if (!isAdmin && !isMember) throw new HttpError(403, "Access denied");
  return { group, isAdmin };
}
