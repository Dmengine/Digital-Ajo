import Joi from "joi";

// MVP: Basic KYC submission (Tier 1). For MVP we only persist a boolean +
// bank account details needed for withdrawals; we do not persist sensitive IDs.
export const submitTier1KycSchema = Joi.object({
  bvnOrNin: Joi.string().trim().min(8).max(20).required(),
  dob: Joi.date().iso().required(),
  residentialAddress: Joi.string().trim().min(5).max(500).required(),
  accountNumber: Joi.string().trim().min(4).max(20).required(),
  bankName: Joi.string().trim().min(2).max(120).required(),
});

