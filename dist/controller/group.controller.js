"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeGroupMember = exports.addGroupMember = exports.postGroupMessage = exports.getGroupMessages = exports.getGroupDashboard = exports.joinGroupByInvite = exports.browseOpenGroups = exports.getGroupById = exports.createGroup = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = require("../models/user.model");
const groupAjo_model_1 = require("../models/groupAjo.model");
const contribution_model_1 = require("../models/contribution.model");
const groupMessage_model_1 = require("../models/groupMessage.model");
const notification_service_1 = require("../services/notification.service");
const eligibility_service_1 = require("../services/eligibility.service");
const groupChat_service_1 = require("../services/groupChat.service");
const groupMember_service_1 = require("../services/groupMember.service");
const HttpError_1 = require("../errors/HttpError");
const asyncHandler_1 = require("../middleware/asyncHandler");
function generateInviteCode() {
    return crypto_1.default.randomBytes(16).toString("hex");
}
exports.createGroup = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const creatorId = req.userId;
    const { name, description, groupType, contributionAmount, frequency, startDate, members } = req.body;
    const creator = yield user_model_1.UserModel.findById(creatorId);
    if (!creator)
        throw new HttpError_1.HttpError(404, "User not found");
    const creatorCheck = (0, eligibility_service_1.assessGroupEligibility)({
        kycTier: creator.kycTier,
        basicKycCompleted: creator.basicKycCompleted,
        reliabilityScore: creator.reliabilityScore,
        isRestricted: creator.isRestricted,
    }, groupType);
    if (!creatorCheck.ok)
        throw new HttpError_1.HttpError(403, creatorCheck.reason);
    const users = yield user_model_1.UserModel.find({ username: { $in: members } });
    if (users.length !== members.length)
        throw new HttpError_1.HttpError(400, "One or more usernames are invalid");
    for (const u of users) {
        const check = (0, eligibility_service_1.assessGroupEligibility)({
            kycTier: u.kycTier,
            basicKycCompleted: u.basicKycCompleted,
            reliabilityScore: u.reliabilityScore,
            isRestricted: u.isRestricted,
        }, groupType);
        if (!check.ok)
            throw new HttpError_1.HttpError(400, `Member ${u.username}: ${check.reason}`);
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
        const score = (_a = target === null || target === void 0 ? void 0 : target.reliabilityScore) !== null && _a !== void 0 ? _a : 100;
        const orderCheck = (0, eligibility_service_1.canTakeEarlyPayoutPosition)(score, member.order, roster.length);
        if (!orderCheck.ok) {
            throw new HttpError_1.HttpError(400, `Member at position ${member.order}: ${orderCheck.reason}`);
        }
    }
    const inviteCode = generateInviteCode();
    const bufferRequired = (0, eligibility_service_1.bufferRequiredForGroupType)(groupType);
    const newGroup = yield groupAjo_model_1.GroupAjoModel.create({
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
        yield (0, notification_service_1.notify)(member._id.toString(), `You have been added to the group "${name}".`);
    }
    res.status(201).json({
        success: true,
        message: "Group created successfully",
        group: newGroup,
    });
}));
exports.getGroupById = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.id;
    if (!mongoose_1.default.isValidObjectId(groupId))
        throw new HttpError_1.HttpError(400, "Invalid group ID");
    const group = yield groupAjo_model_1.GroupAjoModel.findById(groupId).populate("members.user", "name email username");
    if (!group)
        throw new HttpError_1.HttpError(404, "Group not found");
    const userId = req.userId;
    if (!userId)
        throw new HttpError_1.HttpError(401, "Authentication required");
    const memberIdOf = (memberUser) => {
        if (!memberUser)
            return "";
        if (typeof memberUser === "string")
            return memberUser;
        if (typeof memberUser === "object" && memberUser !== null && "_id" in memberUser) {
            const id = memberUser._id;
            if (typeof id === "string")
                return id;
            if (id && typeof id.toString === "function") {
                return id.toString();
            }
        }
        if (typeof memberUser.toString === "function") {
            return memberUser.toString();
        }
        return "";
    };
    const isCreator = group.createdBy.toString() === userId;
    const isMember = group.members.some((m) => memberIdOf(m.user) === userId);
    if (!isCreator && !isMember)
        throw new HttpError_1.HttpError(403, "Access denied");
    res.status(200).json({
        success: true,
        message: "Group fetched successfully",
        group,
        isAdmin: isCreator,
    });
}));
exports.browseOpenGroups = (0, asyncHandler_1.asyncHandler)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = _req.userId;
    if (!mongoose_1.default.isValidObjectId(userId))
        throw new HttpError_1.HttpError(401, "Authentication required");
    const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
    const groups = yield groupAjo_model_1.GroupAjoModel.aggregate([
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
}));
exports.joinGroupByInvite = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { inviteCode } = req.body;
    const group = yield groupAjo_model_1.GroupAjoModel.findOne({ inviteCode, status: "open" });
    if (!group)
        throw new HttpError_1.HttpError(404, "Group not found or not accepting members");
    const already = group.members.some((m) => m.user.toString() === userId);
    if (already)
        throw new HttpError_1.HttpError(400, "Already a member of this group");
    const user = yield user_model_1.UserModel.findById(userId);
    if (!user)
        throw new HttpError_1.HttpError(404, "User not found");
    const check = (0, eligibility_service_1.assessGroupEligibility)({
        kycTier: user.kycTier,
        basicKycCompleted: user.basicKycCompleted,
        reliabilityScore: user.reliabilityScore,
        isRestricted: user.isRestricted,
    }, group.groupType);
    if (!check.ok)
        throw new HttpError_1.HttpError(403, check.reason);
    const nextOrder = group.members.length + 1;
    group.members.push({
        user: user._id,
        order: nextOrder,
        hasReceived: false,
        bufferHeld: 0,
    });
    yield group.save();
    yield (0, notification_service_1.notify)(userId, `You joined the group "${group.name}".`);
    res.status(200).json({
        success: true,
        message: "Joined group successfully",
        group,
    });
}));
exports.getGroupDashboard = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.id;
    const userId = req.userId;
    const { group, isAdmin } = yield (0, groupMember_service_1.requireGroupMember)(groupId, userId);
    const oid = new mongoose_1.default.Types.ObjectId(groupId);
    const statsAgg = yield contribution_model_1.ContributionModel.aggregate([
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
    const users = yield user_model_1.UserModel.find({ _id: { $in: memberIds } })
        .select("name username email")
        .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const members = group.members.map((m) => {
        var _a, _b, _c, _d, _e, _f;
        const uid = m.user.toString();
        const u = userMap.get(uid);
        const st = statsByUser.get(uid);
        return {
            userId: uid,
            name: u === null || u === void 0 ? void 0 : u.name,
            username: u === null || u === void 0 ? void 0 : u.username,
            order: m.order,
            hasReceived: m.hasReceived,
            bufferHeld: m.bufferHeld,
            completedContributions: (_a = st === null || st === void 0 ? void 0 : st.completedCount) !== null && _a !== void 0 ? _a : 0,
            failedContributions: (_b = st === null || st === void 0 ? void 0 : st.failedCount) !== null && _b !== void 0 ? _b : 0,
            unpaidContributions: (_c = st === null || st === void 0 ? void 0 : st.unpaidCount) !== null && _c !== void 0 ? _c : 0,
            defaultedContributions: (_d = st === null || st === void 0 ? void 0 : st.defaultedCount) !== null && _d !== void 0 ? _d : 0,
            pendingContributions: (_e = st === null || st === void 0 ? void 0 : st.pendingCount) !== null && _e !== void 0 ? _e : 0,
            totalPaid: (_f = st === null || st === void 0 ? void 0 : st.totalPaid) !== null && _f !== void 0 ? _f : 0,
        };
    });
    const defaulters = members.filter((r) => r.failedContributions > 0 || r.unpaidContributions > 0 || r.defaultedContributions > 0);
    res.status(200).json({
        success: true,
        isAdmin,
        group: {
            _id: group._id,
            name: group.name,
            currentRound: group.currentRound,
            contributionAmount: group.contributionAmount,
            frequency: group.frequency,
            status: group.status,
            startDate: group.startDate,
        },
        members,
        defaulters,
    });
}));
exports.getGroupMessages = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.id;
    const userId = req.userId;
    yield (0, groupMember_service_1.requireGroupMember)(groupId, userId);
    const sinceRaw = req.query.since;
    const since = typeof sinceRaw === "string" && sinceRaw.trim() ? new Date(sinceRaw) : null;
    if (since && Number.isNaN(since.getTime()))
        throw new HttpError_1.HttpError(400, "Invalid since date");
    const limitRaw = req.query.limit;
    const limit = Math.min(Math.max(Number(limitRaw) || 100, 1), 200);
    const filter = { groupAjo: groupId };
    if (since)
        filter.createdAt = { $gt: since };
    const messages = yield groupMessage_model_1.GroupMessageModel.find(filter)
        .sort({ createdAt: since ? 1 : -1 })
        .limit(limit)
        .populate("sender", "name username")
        .lean();
    if (!since)
        messages.reverse();
    res.status(200).json({ success: true, messages });
}));
exports.postGroupMessage = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.id;
    const userId = req.userId;
    const { body } = req.body;
    const populated = yield (0, groupChat_service_1.createGroupChatMessage)(groupId, userId, body);
    res.status(201).json({ success: true, message: populated });
}));
exports.addGroupMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.id;
    const adminId = req.userId;
    const { group, isAdmin } = yield (0, groupMember_service_1.requireGroupMember)(groupId, adminId);
    if (!isAdmin)
        throw new HttpError_1.HttpError(403, "Only the group admin can add members");
    const { username } = req.body;
    const newUser = yield user_model_1.UserModel.findOne({ username: username.trim().toLowerCase() });
    if (!newUser)
        throw new HttpError_1.HttpError(400, "User not found");
    if (group.members.some((m) => m.user.toString() === newUser._id.toString())) {
        throw new HttpError_1.HttpError(400, "User is already a member");
    }
    const check = (0, eligibility_service_1.assessGroupEligibility)({
        kycTier: newUser.kycTier,
        basicKycCompleted: newUser.basicKycCompleted,
        reliabilityScore: newUser.reliabilityScore,
        isRestricted: newUser.isRestricted,
    }, group.groupType);
    if (!check.ok)
        throw new HttpError_1.HttpError(400, check.reason);
    const nextOrder = group.members.length + 1;
    group.members.push({
        user: newUser._id,
        order: nextOrder,
        hasReceived: false,
        bufferHeld: 0,
    });
    yield group.save();
    yield (0, notification_service_1.notify)(newUser._id.toString(), `You were added to the group "${group.name}".`);
    const updated = yield groupAjo_model_1.GroupAjoModel.findById(groupId).populate("members.user", "name email username");
    res.status(200).json({
        success: true,
        message: "Member added",
        group: updated,
    });
}));
exports.removeGroupMember = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groupId = req.params.id;
    const targetUserId = req.params.userId;
    const adminId = req.userId;
    if (!mongoose_1.default.isValidObjectId(targetUserId))
        throw new HttpError_1.HttpError(400, "Invalid user ID");
    const { group, isAdmin } = yield (0, groupMember_service_1.requireGroupMember)(groupId, adminId);
    if (!isAdmin)
        throw new HttpError_1.HttpError(403, "Only the group admin can remove members");
    if (targetUserId === group.createdBy.toString()) {
        throw new HttpError_1.HttpError(400, "Cannot remove the group admin");
    }
    const idx = group.members.findIndex((m) => m.user.toString() === targetUserId);
    if (idx === -1)
        throw new HttpError_1.HttpError(404, "Member not in group");
    group.members.splice(idx, 1);
    group.members.forEach((m, i) => {
        m.order = i + 1;
    });
    yield group.save();
    yield (0, notification_service_1.notify)(targetUserId, `You were removed from the group "${group.name}".`);
    const updated = yield groupAjo_model_1.GroupAjoModel.findById(groupId).populate("members.user", "name email username");
    res.status(200).json({
        success: true,
        message: "Member removed",
        group: updated,
    });
}));
