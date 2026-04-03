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
exports.joinGroupByInvite = exports.browseOpenGroups = exports.getGroupById = exports.createGroup = void 0;
const crypto_1 = __importDefault(require("crypto"));
const user_model_1 = require("../models/user.model");
const groupAjo_model_1 = require("../models/groupAjo.model");
const notification_service_1 = require("../services/notification.service");
const eligibility_service_1 = require("../services/eligibility.service");
const HttpError_1 = require("../errors/HttpError");
const asyncHandler_1 = require("../middleware/asyncHandler");
function generateInviteCode() {
    return crypto_1.default.randomBytes(16).toString("hex");
}
exports.createGroup = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const creatorId = req.userId;
    const { name, description, groupType, contributionAmount, frequency, startDate, members } = req.body;
    const creator = yield user_model_1.UserModel.findById(creatorId);
    if (!creator)
        throw new HttpError_1.HttpError(404, "User not found");
    const creatorCheck = (0, eligibility_service_1.assessGroupEligibility)({
        kycTier: creator.kycTier,
        reliabilityScore: creator.reliabilityScore,
        completedAjoCycles: creator.completedAjoCycles,
    }, groupType);
    if (!creatorCheck.ok)
        throw new HttpError_1.HttpError(403, creatorCheck.reason);
    const users = yield user_model_1.UserModel.find({ username: { $in: members } });
    if (users.length !== members.length)
        throw new HttpError_1.HttpError(400, "One or more usernames are invalid");
    for (const u of users) {
        const check = (0, eligibility_service_1.assessGroupEligibility)({
            kycTier: u.kycTier,
            reliabilityScore: u.reliabilityScore,
            completedAjoCycles: u.completedAjoCycles,
        }, groupType);
        if (!check.ok)
            throw new HttpError_1.HttpError(400, `Member ${u.username}: ${check.reason}`);
    }
    const roster = users.map((u, i) => ({
        user: u._id,
        order: i + 1,
        hasReceived: false,
        bufferHeld: 0,
    }));
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
    const group = yield groupAjo_model_1.GroupAjoModel.findById(req.params.id).populate("members.user", "name email username");
    if (!group)
        throw new HttpError_1.HttpError(404, "Group not found");
    res.status(200).json({
        success: true,
        message: "Group fetched successfully",
        group,
    });
}));
exports.browseOpenGroups = (0, asyncHandler_1.asyncHandler)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const groups = yield groupAjo_model_1.GroupAjoModel.find({ status: "open" })
        .sort({ createdAt: -1 })
        .limit(50)
        .select("name description groupType contributionAmount frequency startDate createdAt members")
        .lean();
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
        reliabilityScore: user.reliabilityScore,
        completedAjoCycles: user.completedAjoCycles,
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
