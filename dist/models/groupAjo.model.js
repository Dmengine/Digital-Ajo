"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupAjoModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const memberSchema = new mongoose_1.default.Schema({
    users: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    order: {
        type: Number,
        required: true
    },
    hasReceived: {
        type: Boolean,
        default: false,
    }
}, { _id: false });
const groupAjoModel = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true
    },
    contributionAmount: {
        type: Number,
        required: true
    },
    frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    members: [memberSchema],
    cuurentRound: {
        type: Number,
        default: 1
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    roundNumber: {
        type: Number,
        default: 1
    }
}, { timestamps: true });
exports.GroupAjoModel = mongoose_1.default.model("GroupAjo", groupAjoModel);
