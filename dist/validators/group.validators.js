"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addGroupMemberSchema = exports.postGroupMessageSchema = exports.joinGroupSchema = exports.createGroupSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createGroupSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(1).max(120).required(),
    description: joi_1.default.string().trim().max(2000).allow(""),
    groupType: joi_1.default.string().valid("low", "medium", "high", "premium").required(),
    contributionAmount: joi_1.default.number().positive().max(10000000).required(),
    frequency: joi_1.default.string().valid("daily", "weekly", "monthly").required(),
    startDate: joi_1.default.date().iso().required(),
    members: joi_1.default.array().items(joi_1.default.string().trim().lowercase().min(3).max(32)).min(0).max(200).required(),
});
exports.joinGroupSchema = joi_1.default.object({
    inviteCode: joi_1.default.string().trim().min(8).max(64).required(),
});
exports.postGroupMessageSchema = joi_1.default.object({
    body: joi_1.default.string().trim().min(1).max(2000).required(),
});
exports.addGroupMemberSchema = joi_1.default.object({
    username: joi_1.default.string().trim().lowercase().min(3).max(32).required(),
});
