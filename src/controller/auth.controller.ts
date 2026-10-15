import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model";
import { env } from "../config/env";
import { HttpError } from "../errors/HttpError";
import { asyncHandler } from "../middleware/asyncHandler";
import { uploadAvatarToCloudinary } from "../services/cloudinary.service";
import { listBanks, resolveBankAccount } from "../services/paystack.services";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, password, username } = req.body as {
    name: string;
    email: string;
    phone: string;
    password: string;
    username: string;
    consentAccepted: true;
  };

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) throw new HttpError(400, "User already exists");

  const existingUsername = await UserModel.findOne({ username });
  if (existingUsername) throw new HttpError(400, "Username already taken");

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await UserModel.create({
    name,
    email,
    phone,
    username,
    password: hashedPassword,
    consentAcceptedAt: new Date(),
  });

  const token = jwt.sign(
    { id: newUser.id, tokenVersion: newUser.tokenVersion },
    env.jwtSecret(),
    { expiresIn: "7d" }
  );

  const publicUser = {
    _id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    username: newUser.username,
  };
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    token,
    user: publicUser,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { emailOrUsername, password } = req.body as { emailOrUsername: string; password: string };

  const existingUser = await UserModel.findOne({
    $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername.toLowerCase() }],
  }).select("+password");

  if (!existingUser) throw new HttpError(401, "Invalid credentials");

  const comparePassword = await bcrypt.compare(password, existingUser.password);
  if (!comparePassword) throw new HttpError(401, "Invalid credentials");

  const token = jwt.sign(
    { id: existingUser.id, tokenVersion: existingUser.tokenVersion },
    env.jwtSecret(),
    { expiresIn: "7d" }
  );

  const publicUser = {
    _id: existingUser._id,
    name: existingUser.name,
    email: existingUser.email,
    username: existingUser.username,
  };

  res.status(200).json({
    success: true,
    message: "User logged in successfully",
    token,
    user: publicUser,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const user = await UserModel.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } }, { new: true });
  if (!user) throw new HttpError(404, "User not found");
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const user = await UserModel.findById(userId).select(
    "name email username phone kycTier basicKycCompleted profileImage reliabilityScore isRestricted isFlagged bankAccount kycProfile"
  );
  if (!user) throw new HttpError(404, "User not found");

  res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      phone: user.phone,
      kycTier: user.kycTier,
      basicKycCompleted: user.basicKycCompleted,
      profileImage: user.profileImage ?? null,
      reliabilityScore: user.reliabilityScore,
      isRestricted: user.isRestricted,
      isFlagged: user.isFlagged,
      bankAccount: user.bankAccount?.accountNumber
        ? {
            accountNumber: user.bankAccount.accountNumber,
            accountName: user.bankAccount.accountName ?? null,
            bankName: user.bankAccount.bankName ?? null,
            bankCode: user.bankAccount.bankCode ?? null,
            confirmed: Boolean(user.bankAccount.confirmedAt),
          }
        : null,
      identity: user.kycProfile?.identityLast4
        ? {
            type: user.kycProfile.identityType ?? null,
            last4: user.kycProfile.identityLast4,
            // BVN/NIN is not checked against NIBSS/NIMC; only "details submitted".
            verified: false,
          }
        : null,
    },
  });
});

export const submitTier1Kyc = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { bvnOrNin, identityType, accountNumber, bankName, bankCode } = req.body as {
    bvnOrNin: string;
    identityType?: "bvn" | "nin";
    accountNumber: string;
    bankName: string;
    bankCode: string;
  };

  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, "User not found");

  // Rejects (400) if Paystack cannot resolve the account; nothing is saved in that case.
  const resolved = await resolveBankAccount(accountNumber, bankCode);
  const now = new Date();

  user.bankAccount = {
    accountNumber: resolved.accountNumber,
    bankName,
    bankCode,
    accountName: resolved.accountName,
    confirmedAt: now,
  } as any;
  // BVN/NIN is NOT verified: we keep only the last 4 digits and never claim otherwise.
  user.kycProfile = {
    identityVerified: false,
    identityType,
    identityLast4: bvnOrNin.trim().slice(-4),
    verifiedBankAccountName: resolved.accountName,
    detailsSubmittedAt: now,
  } as any;
  user.kycTier = 1;
  user.basicKycCompleted = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Details submitted. Bank account confirmed.",
    bankAccount: {
      accountNumber: resolved.accountNumber,
      accountName: resolved.accountName,
      bankName,
      bankCode,
      confirmed: true,
    },
  });
});

export const getBanks = asyncHandler(async (_req: Request, res: Response) => {
  const banks = await listBanks();
  res.status(200).json({ success: true, banks });
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { imageDataUrl } = req.body as { imageDataUrl: string };
  const imageUrl = await uploadAvatarToCloudinary(imageDataUrl, userId);

  const user = await UserModel.findByIdAndUpdate(userId, { profileImage: imageUrl }, { new: true });
  if (!user) throw new HttpError(404, "User not found");

  res.status(200).json({ success: true, message: "Avatar updated successfully", profileImage: imageUrl });
});
