"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributionModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const contributionSchema = new mongoose_1.default.Schema({
    amount: { type: Number, required: true, min: 0 },
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    groupAjo: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "GroupAjo", required: true },
    status: {
        type: String,
        enum: ["pending", "completed", "failed", "unpaid", "defaulted"],
        default: "pending",
    },
    cycle: { type: Number, required: true, min: 1 },
    turn: { type: Number, required: true, min: 1 },
    dueAt: { type: Date },
    paidAt: { type: Date },
    graceEndsAt: { type: Date },
    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date },
    nextRetryAt: { type: Date },
    usedAutoDebit: { type: Boolean, default: false },
    penaltyApplied: { type: Boolean, default: false },
    penaltyAmount: { type: Number, default: 0, min: 0 },
    roundStatusSnapshot: {
        type: String,
        enum: ["active", "paused", "completed"],
    },
    note: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });
contributionSchema.index({ groupAjo: 1, cycle: 1, user: 1 }, { unique: true });
contributionSchema.index({ status: 1, dueAt: 1 });
contributionSchema.index({ status: 1, nextRetryAt: 1 });
exports.ContributionModel = mongoose_1.default.model("Contribution", contributionSchema);
