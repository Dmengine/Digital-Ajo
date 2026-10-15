import Joi from "joi";

// Basic KYC submission (Tier 1). We persist only the last 4 digits of the BVN/NIN
// (NOT verified) and the payout bank account, which is confirmed via Paystack resolve.
export const submitTier1KycSchema = Joi.object({
  bvnOrNin: Joi.string().trim().pattern(/^\d{11}$/).required().messages({
    "string.pattern.base": "BVN/NIN must be 11 digits",
  }),
  identityType: Joi.string().valid("bvn", "nin").optional(),
  dob: Joi.date().iso().required(),
  residentialAddress: Joi.string().trim().min(5).max(500).required(),
  accountNumber: Joi.string().trim().pattern(/^\d{10}$/).required().messages({
    "string.pattern.base": "Account number must be 10 digits",
  }),
  bankName: Joi.string().trim().min(2).max(120).required(),
  bankCode: Joi.string().trim().pattern(/^[0-9A-Za-z]{3,10}$/).required(),
});

