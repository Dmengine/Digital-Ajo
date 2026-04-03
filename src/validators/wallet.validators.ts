import Joi from "joi";

export const depositInitSchema = Joi.object({
  amount: Joi.number().positive().max(1e12).required(),
});

export const withdrawSchema = Joi.object({
  amount: Joi.number().positive().max(1e12).required(),
});
