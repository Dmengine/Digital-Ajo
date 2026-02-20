"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributionModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const contributionModel = new mongoose_1.default.Schema({
    amount: {
        type: Number,
        required: true
    },
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    groupAjo: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "GroupAjo",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending"
    },
    cycle: {
        type: Number,
        required: true
    },
    turn: {
        type: Number,
        required: true
    }
}, { timestamps: true });
exports.ContributionModel = mongoose_1.default.model("Contribution", contributionModel);
