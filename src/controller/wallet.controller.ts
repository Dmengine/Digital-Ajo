import type { Request, Response } from "express";
import axios from "axios";
import { UserModel } from "../models/user.model";
import { initializeDeposit, transferFunds } from "../services/paystack.services";
import { notify } from "../services/notification.service";
import { applyPaystackDeposit, debitWallet, reverseWalletDebit } from "../services/wallet.service";
import { verifyPaystackSignature } from "../utils/paystackWebhook";
import { env } from "../config/env";
import { HttpError } from "../errors/HttpError";
import { asyncHandler } from "../middleware/asyncHandler";

export const initDeposit = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body as { amount: number };
  const user = await UserModel.findById((req as any).userId);
  if (!user) throw new HttpError(404, "User not found");

  const url = await initializeDeposit(user.email, user._id.toString(), amount);
  await notify(user._id.toString(), `You initiated a deposit of ₦${amount}. Please complete the payment.`);
  res.json({ success: true, paymentURL: url });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers["x-paystack-signature"];
  const sig = Array.isArray(signature) ? signature[0] : signature;
  const raw = (req as any).rawBody as Buffer | undefined;
  if (!verifyPaystackSignature(raw, sig, env.paystackWebhookSecret())) {
    throw new HttpError(400, "Invalid webhook signature");
  }

  const event = req.body as {
    event?: string;
    data?: { reference?: string; metadata?: { userId?: string }; amount?: number };
  };
  if (event?.event === "charge.success") {
    const reference = event?.data?.reference;
    if (typeof reference !== "string" || !reference.trim()) {
      res.sendStatus(200);
      return;
    }
    const userId = event?.data?.metadata?.userId;
    const amountKobo = event?.data?.amount;
    if (userId && typeof amountKobo === "number" && amountKobo > 0) {
      const amount = amountKobo / 100;
      await applyPaystackDeposit(userId, amount, reference);
    }
  }

  res.sendStatus(200);
});

export const withdraw = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body as { amount: number };
  const user = await UserModel.findById((req as any).userId);
  if (!user) throw new HttpError(404, "User not found");
  if (!user.bankAccount?.recipientCode) throw new HttpError(400, "No bank account linked");

  await debitWallet(user._id.toString(), amount, "main");
  try {
    await transferFunds(user.bankAccount.recipientCode, amount, "User Withdrawal");
  } catch (err: unknown) {
    await reverseWalletDebit(user._id.toString(), amount, {
      reason: "paystack_transfer_failed",
      amount,
    });
    if (axios.isAxiosError(err)) {
      throw new HttpError(502, "Bank transfer failed; your wallet has been refunded.");
    }
    throw new HttpError(502, "Bank transfer failed; your wallet has been refunded.");
  }
  await notify(user._id.toString(), `You have withdrawn ₦${amount} to your bank account`);

  res.status(200).json({
    success: true,
    message: "Withdrawal successful",
  });
});
