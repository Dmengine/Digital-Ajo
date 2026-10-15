import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  email: Joi.string().trim().lowercase().email().max(254).required(),
  phone: Joi.string().trim().min(10).max(20).required(),
  username: Joi.string().trim().lowercase().min(3).max(32).pattern(/^[a-z0-9_]+$/).required(),
  password: Joi.string().min(8).max(128).required(),
  // NDPA: registration requires explicit acceptance of the privacy notice.
  consentAccepted: Joi.boolean().valid(true).required().messages({
    "any.only": "You must accept the privacy notice to create an account",
  }),
});

export const loginSchema = Joi.object({
  emailOrUsername: Joi.string().trim().min(1).max(254).required(),
  password: Joi.string().min(1).max(128).required(),
});
