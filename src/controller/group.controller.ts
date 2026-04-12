import type { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model";
import { GroupAjoModel } from "../models/groupAjo.model";
import type { GroupRiskType } from "../models/groupAjo.model";
import { ContributionModel } from "../models/contribution.model";
import { GroupMessageModel } from "../models/groupMessage.model";
import { notify } from "../services/notification.service";
import {
  assessGroupEligibility,
  bufferRequiredForGroupType,
  canTakeEarlyPayoutPosition,
} from "../services/eligibility.service";
import { createGroupChatMessage } from "../services/groupChat.service";
import { requireGroupMember } from "../services/groupMember.service";
import { HttpError } from "../errors/HttpError";
import { asyncHandler } from "../middleware/asyncHandler";

function generateInviteCode(): string {
  return crypto.randomBytes(16).toString("hex");
}

export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const creatorId = (req as any).userId as string;
  const { name, description, groupType, contributionAmount, frequency, startDate, members } = req.body as {
    name: string;
    description?: string;
    groupType: GroupRiskType;
    contributionAmount: number;
    frequency: "daily" | "weekly" | "monthly";
    startDate: Date;
    members: string[];
  };

  const creator = await UserModel.findById(creatorId);
  if (!creator) throw new HttpError(404, "User not found");

  const creatorCheck = assessGroupEligibility(
    {
      kycTier: creator.kycTier as 1 | 2 | 3,
      basicKycCompleted: creator.basicKycCompleted,
      reliabilityScore: creator.reliabilityScore,
      isRestricted: creator.isRestricted,
    },
    groupType
  );
  if (!creatorCheck.ok) throw new HttpError(403, creatorCheck.reason);

  const users = await UserModel.find({ username: { $in: members } });
  if (users.length !== members.length) throw new HttpError(400, "One or more usernames are invalid");

  for (const u of users) {
    const check = assessGroupEligibility(
      {
        kycTier: u.kycTier as 1 | 2 | 3,
        basicKycCompleted: u.basicKycCompleted,
        reliabilityScore: u.reliabilityScore,
        isRestricted: u.isRestricted,
      },
      groupType
    );
    if (!check.ok) throw new HttpError(400, `Member ${u.username}: ${check.reason}`);
  }

  // MVP: creator is always the first member (order 1). `members` in the request are additional members.
  const additionalUsers = users.filter((u) => u._id.toString() !== creatorId);
  const roster = [
    { user: creator._id, order: 1, hasReceived: false, bufferHeld: 0 },
    ...additionalUsers.map((u, i) => ({
      user: u._id,
      order: i + 2,
      hasReceived: false,
      bufferHeld: 0,
    })),
  ];

  for (const member of roster) {
    const target = member.user.toString() === creator._id.toString() ? creator : additionalUsers.find((u) => u._id.equals(member.user));
    const score = target?.reliabilityScore ?? 100;
    const orderCheck = canTakeEarlyPayoutPosition(score, member.order, roster.length);
    if (!orderCheck.ok) {
      throw new HttpError(400, `Member at position ${member.order}: ${orderCheck.reason}`);
    }
  }

  const inviteCode = generateInviteCode();
  const bufferRequired = bufferRequiredForGroupType(groupType);

  const newGroup = await GroupAjoModel.create({
    name,
    description,
    groupType,
    contributionAmount,
    frequency,
    startDate,
    createdBy: creatorId,
    inviteCode,
    status: "open",
    bufferRequired,
    members: roster,
    currentRound: 1,
    isCompleted: false,
  });

  for (const member of users) {
    await notify(member._id.toString(), `You have been added to the group "${name}".`);
  }

  res.status(201).json({
    success: true,
    message: "Group created successfully",
    group: newGroup,
  });
});

export const getGroupById = asyncHandler(async (req: Request, res: Response) => {
  const groupId = req.params.id;
  if (!mongoose.isValidObjectId(groupId)) throw new HttpError(400, "Invalid group ID");

  const group = await GroupAjoModel.findById(groupId).populate("members.user", "name email username");

  if (!group) throw new HttpError(404, "Group not found");

  const userId = (req as any).userId as string | undefined;
  if (!userId) throw new HttpError(401, "Authentication required");

  const memberIdOf = (memberUser: unknown): string => {
    if (!memberUser) return "";
    if (typeof memberUser === "string") return memberUser;

    if (typeof memberUser === "object" && memberUser !== null && "_id" in memberUser) {
      const id = (memberUser as { _id?: unknown })._id;
      if (typeof id === "string") return id;
      if (id && typeof (id as { toString?: () => string }).toString === "function") {
        return (id as { toString: () => string }).toString();
      }
    }

    if (typeof (memberUser as { toString?: () => string }).toString === "function") {
      return (memberUser as { toString: () => string }).toString();
    }

    return "";
  };

  const isCreator = group.createdBy.toString() === userId;
  const isMember = group.members.some((m) => memberIdOf(m.user) === userId);
  if (!isCreator && !isMember) throw new HttpError(403, "Access denied");

  res.status(200).json({
    success: true,
    message: "Group fetched successfully",
    group,
    isAdmin: isCreator,
  });
});

export const browseOpenGroups = asyncHandler(async (_req: Request, res: Response) => {
  const userId = (_req as any).userId as string;
  if (!mongoose.isValidObjectId(userId)) throw new HttpError(401, "Authentication required");

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const groups = await GroupAjoModel.aggregate([
    {
      $match: {
        $or: [{ createdBy: userObjectId }, { "members.user": userObjectId }],
      },
    },
    {
      $lookup: {
        from: "groupmessages",
        let: { gid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$groupAjo", "$$gid"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { _id: 0, createdAt: 1 } },
        ],
        as: "lastMessage",
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 50 },
    {
      $project: {
        name: 1,
        description: 1,
        groupType: 1,
        contributionAmount: 1,
        frequency: 1,
        startDate: 1,
        createdAt: 1,
        memberCount: { $size: "$members" },
        lastMessageAt: { $ifNull: [{ $arrayElemAt: ["$lastMessage.createdAt", 0] }, null] },
      },
    },
  ]);

  res.status(200).json({ success: true, groups });
});

export const joinGroupByInvite = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { inviteCode } = req.body as { inviteCode: string };

  const group = await GroupAjoModel.findOne({ inviteCode, status: "open" });
  if (!group) throw new HttpError(404, "Group not found or not accepting members");

  const already = group.members.some((m) => m.user.toString() === userId);
  if (already) throw new HttpError(400, "Already a member of this group");

  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, "User not found");

  const check = assessGroupEligibility(
    {
      kycTier: user.kycTier as 1 | 2 | 3,
      basicKycCompleted: user.basicKycCompleted,
      reliabilityScore: user.reliabilityScore,
      isRestricted: user.isRestricted,
    },
    group.groupType as GroupRiskType
  );
  if (!check.ok) throw new HttpError(403, check.reason);

  const nextOrder = group.members.length + 1;
  group.members.push({
    user: user._id,
    order: nextOrder,
    hasReceived: false,
    bufferHeld: 0,
  });
  await group.save();

  await notify(userId, `You joined the group "${group.name}".`);

  res.status(200).json({
    success: true,
    message: "Joined group successfully",
    group,
  });
});

export const getGroupDashboard = asyncHandler(async (req: Request, res: Response) => {
  const groupId = req.params.id;
  const userId = (req as any).userId as string;
  const { group, isAdmin } = await requireGroupMember(groupId, userId);

  const oid = new mongoose.Types.ObjectId(groupId);
  const statsAgg = await ContributionModel.aggregate<{
    _id: mongoose.Types.ObjectId;
    completedCount: number;
    failedCount: number;
    unpaidCount: number;
    defaultedCount: number;
    pendingCount: number;
    totalPaid: number;
  }>([
    { $match: { groupAjo: oid } },
    {
      $group: {
        _id: "$user",
        completedCount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        failedCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        unpaidCount: { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
        defaultedCount: { $sum: { $cond: [{ $eq: ["$status", "defaulted"] }, 1, 0] } },
        pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        totalPaid: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] } },
      },
    },
  ]);

  const statsByUser = new Map(statsAgg.map((s) => [s._id.toString(), s]));
  const memberIds = group.members.map((m) => m.user);
  const users = await UserModel.find({ _id: { $in: memberIds } })
    .select("name username email")
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const members = group.members.map((m) => {
    const uid = m.user.toString();
    const u = userMap.get(uid);
    const st = statsByUser.get(uid);
    return {
      userId: uid,
      name: u?.name,
      username: u?.username,
      order: m.order,
      hasReceived: m.hasReceived,
      bufferHeld: m.bufferHeld,
      completedContributions: st?.completedCount ?? 0,
      failedContributions: st?.failedCount ?? 0,
      unpaidContributions: st?.unpaidCount ?? 0,
      defaultedContributions: st?.defaultedCount ?? 0,
      pendingContributions: st?.pendingCount ?? 0,
      totalPaid: st?.totalPaid ?? 0,
    };
  });

  const defaulters = members.filter(
    (r) => r.failedContributions > 0 || r.unpaidContributions > 0 || r.defaultedContributions > 0
  );

  res.status(200).json({
    success: true,
    isAdmin,
    group: {
      _id: group._id,
      name: group.name,
      currentRound: group.currentRound,
      roundStatus: group.roundStatus,
      roundDueAt: group.roundDueAt,
      roundGraceEndsAt: group.roundGraceEndsAt,
      contributionAmount: group.contributionAmount,
      frequency: group.frequency,
      status: group.status,
      startDate: group.startDate,
    },
    members,
    defaulters,
  });
});

export const getGroupMessages = asyncHandler(async (req: Request, res: Response) => {
  const groupId = req.params.id;
  const userId = (req as any).userId as string;
  await requireGroupMember(groupId, userId);

  const sinceRaw = req.query.since;
  const since =
    typeof sinceRaw === "string" && sinceRaw.trim() ? new Date(sinceRaw) : null;
  if (since && Number.isNaN(since.getTime())) throw new HttpError(400, "Invalid since date");

  const limitRaw = req.query.limit;
  const limit = Math.min(Math.max(Number(limitRaw) || 100, 1), 200);

  const filter: Record<string, unknown> = { groupAjo: groupId };
  if (since) filter.createdAt = { $gt: since };

  const messages = await GroupMessageModel.find(filter)
    .sort({ createdAt: since ? 1 : -1 })
    .limit(limit)
    .populate("sender", "name username")
    .lean();

  if (!since) messages.reverse();

  res.status(200).json({ success: true, messages });
});

export const postGroupMessage = asyncHandler(async (req: Request, res: Response) => {
  const groupId = req.params.id;
  const userId = (req as any).userId as string;
  const { body } = req.body as { body: string };
  const populated = await createGroupChatMessage(groupId, userId, body);

  res.status(201).json({ success: true, message: populated });
});

export const addGroupMember = asyncHandler(async (req: Request, res: Response) => {
  const groupId = req.params.id;
  const adminId = (req as any).userId as string;
  const { group, isAdmin } = await requireGroupMember(groupId, adminId);
  if (!isAdmin) throw new HttpError(403, "Only the group admin can add members");

  const { username } = req.body as { username: string };
  const newUser = await UserModel.findOne({ username: username.trim().toLowerCase() });
  if (!newUser) throw new HttpError(400, "User not found");

  if (group.members.some((m) => m.user.toString() === newUser._id.toString())) {
    throw new HttpError(400, "User is already a member");
  }

  const check = assessGroupEligibility(
    {
      kycTier: newUser.kycTier as 1 | 2 | 3,
      basicKycCompleted: newUser.basicKycCompleted,
      reliabilityScore: newUser.reliabilityScore,
      isRestricted: newUser.isRestricted,
    },
    group.groupType as GroupRiskType
  );
  if (!check.ok) throw new HttpError(400, check.reason);

  const nextOrder = group.members.length + 1;
  group.members.push({
    user: newUser._id,
    order: nextOrder,
    hasReceived: false,
    bufferHeld: 0,
  });
  await group.save();

  await notify(newUser._id.toString(), `You were added to the group "${group.name}".`);

  const updated = await GroupAjoModel.findById(groupId).populate("members.user", "name email username");

  res.status(200).json({
    success: true,
    message: "Member added",
    group: updated,
  });
});

export const removeGroupMember = asyncHandler(async (req: Request, res: Response) => {
  const groupId = req.params.id;
  const targetUserId = req.params.userId;
  const adminId = (req as any).userId as string;

  if (!mongoose.isValidObjectId(targetUserId)) throw new HttpError(400, "Invalid user ID");

  const { group, isAdmin } = await requireGroupMember(groupId, adminId);
  if (!isAdmin) throw new HttpError(403, "Only the group admin can remove members");
  if (group.roundStatus !== "completed") {
    throw new HttpError(400, "Members can only be removed after the current cycle is completed");
  }

  if (targetUserId === group.createdBy.toString()) {
    throw new HttpError(400, "Cannot remove the group admin");
  }

  const idx = group.members.findIndex((m) => m.user.toString() === targetUserId);
  if (idx === -1) throw new HttpError(404, "Member not in group");

  group.members.splice(idx, 1);
  group.members.forEach((m, i) => {
    m.order = i + 1;
  });
  await group.save();

  await notify(targetUserId, `You were removed from the group "${group.name}".`);

  const updated = await GroupAjoModel.findById(groupId).populate("members.user", "name email username");

  res.status(200).json({
    success: true,
    message: "Member removed",
    group: updated,
  });
});
