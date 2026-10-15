import Joi from "joi";

export const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().trim().max(2000).allow(""),
  groupType: Joi.string().valid("low", "medium", "high", "premium").required(),
  contributionAmount: Joi.number().positive().max(10_000_000).required(),
  frequency: Joi.string().valid("daily", "weekly", "monthly").required(),
  startDate: Joi.date().iso().required(),
  members: Joi.array().items(Joi.string().trim().lowercase().min(3).max(32)).min(0).max(200).required(),
});

export const joinGroupSchema = Joi.object({
  inviteCode: Joi.string().trim().min(8).max(64).required(),
});

export const postGroupMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(2000).required(),
});

export const addGroupMemberSchema = Joi.object({
  username: Joi.string().trim().lowercase().min(3).max(32).required(),
});

export const markPaidSchema = Joi.object({
  reference: Joi.string().trim().max(120).allow("").optional(),
});
