import Joi from "joi";

export const depositInitSchema = Joi.object({
  amount: Joi.number().positive().max(10_000_000).required(),
});

export const withdrawSchema = Joi.object({
  amount: Joi.number().positive().max(10_000_000).required(),
});
