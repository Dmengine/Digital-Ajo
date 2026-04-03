import type { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model";
import { GroupAjoModel } from "../models/groupAjo.model";
import type { GroupRiskType } from "../models/groupAjo.model";
import { notify } from "../services/notification.service";
import { assessGroupEligibility, bufferRequiredForGroupType } from "../services/eligibility.service";
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
      },
      groupType
    );
    if (!check.ok) throw new HttpError(400, `Member ${u.username}: ${check.reason}`);
  }

  const roster = users.map((u, i) => ({
    user: u._id,
    order: i + 1,
    hasReceived: false,
    bufferHeld: 0,
  }));

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

  const isCreator = group.createdBy.toString() === userId;
  const isMember = group.members.some((m) => m.user.toString() === userId);
  if (!isCreator && !isMember) throw new HttpError(403, "Access denied");

  res.status(200).json({
    success: true,
    message: "Group fetched successfully",
    group,
  });
});

export const browseOpenGroups = asyncHandler(async (_req: Request, res: Response) => {
  const groups = await GroupAjoModel.aggregate([
    { $match: { status: "open" } },
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
