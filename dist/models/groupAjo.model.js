"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupAjoModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const memberSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: Number, required: true },
    hasReceived: { type: Boolean, default: false },
    bufferHeld: { type: Number, default: 0, min: 0 },
}, { _id: false });
const joinRequestSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, { timestamps: true });
const groupAjoSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    groupType: {
        type: String,
        enum: ["low", "medium", "high", "premium"],
        required: true,
    },
    contributionAmount: { type: Number, required: true, min: 0 },
    frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        required: true,
    },
    startDate: { type: Date, required: true },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    inviteCode: { type: String, unique: true, sparse: true, index: true },
    status: {
        type: String,
        enum: ["open", "active", "completed", "cancelled"],
        default: "open",
    },
    bufferRequired: { type: Boolean, default: false },
    members: { type: [memberSchema], default: [] },
    joinRequests: { type: [joinRequestSchema], default: [] },
    currentRound: { type: Number, default: 1, min: 1 },
    roundStatus: {
        type: String,
        enum: ["active", "paused", "completed"],
        default: "active",
    },
    roundDueAt: { type: Date },
    roundGraceEndsAt: { type: Date },
    lastRoundPauseReason: { type: String, trim: true, maxlength: 500 },
    reminder48hSentAt: { type: Date },
    reminder24hSentAt: { type: Date },
    isCompleted: { type: Boolean, default: false },
}, { timestamps: true });
groupAjoSchema.index({ status: 1, roundStatus: 1, roundDueAt: 1 });
exports.GroupAjoModel = mongoose_1.default.model("GroupAjo", groupAjoSchema);
