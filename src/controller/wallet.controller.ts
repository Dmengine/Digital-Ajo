import type { Request, Response } from "express";
import { UserModel } from "../models/user.model";
import { notify } from "../services/notification.service";
import { applyPaystackDeposit, debitWallet } from "../services/wallet.service";
import { initializeDeposit, verifyDepositByReference } from "../services/paystack.services";
import { verifyPaystackSignature } from "../utils/paystackWebhook";
import { env } from "../config/env";
import { HttpError } from "../errors/HttpError";
import { asyncHandler } from "../middleware/asyncHandler";

export const initDeposit = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body as { amount: number };
  const user = await UserModel.findById((req as any).userId);
  if (!user) throw new HttpError(404, "User not found"); 

  // Real deposit via Paystack (customer pays from their bank/card).
  let paymentURL: string;
  let reference: string;
  try {
    const initialized = await initializeDeposit(user.email, user._id.toString(), amount);
    paymentURL = initialized.authorizationUrl;
    reference = initialized.reference;
  } catch (err: any) {
    console.error("Paystack initDeposit error:", {
      status: err?.response?.status,
      data: err?.response?.data,
      message: err?.message,
    });
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      throw new HttpError(
        502,
        "Paystack rejected credentials. Check AJOPAY_PAYSTACK_KEY (test vs live) and restart the server."
      );
    }
    const paystackMsg =
      typeof err?.response?.data?.message === "string" ? err.response.data.message : undefined;
    throw new HttpError(
      502,
      paystackMsg ? `Failed to initialize Paystack deposit: ${paystackMsg}` : "Failed to initialize Paystack deposit."
    );
  }
  await notify(user._id.toString(), `You initiated a deposit of ₦${amount}. Please complete the payment.`);
  res.json({ success: true, paymentURL, reference });
});

export const verifyDeposit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { reference } = req.body as { reference: string };
  const ref = reference?.trim();
  if (!ref) throw new HttpError(400, "Deposit reference is required");

  let verified;
  try {
    verified = await verifyDepositByReference(ref);
  } catch {
    throw new HttpError(502, "Could not verify deposit with Paystack");
  }

  const status = typeof verified?.status === "string" ? verified.status : "";
  if (status !== "success") {
    res.status(200).json({ success: true, settled: false, message: "Payment not completed yet" });
    return;
  }

  const metaUserId = verified?.metadata?.userId ?? verified?.metadata?.userID;
  if (metaUserId && metaUserId !== userId) {
    throw new HttpError(403, "Reference does not belong to this user");
  }

  const amountKobo = verified?.amount;
  if (typeof amountKobo !== "number" || !Number.isFinite(amountKobo) || amountKobo <= 0) {
    throw new HttpError(400, "Invalid verified amount");
  }

  const amount = amountKobo / 100;
  await applyPaystackDeposit(userId, amount, ref);
  res.status(200).json({ success: true, settled: true, message: "Deposit confirmed and wallet credited" });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  // MVP: generic signed webhook verification. Accept both headers for backward compatibility.
  const signature = (req.headers["x-webhook-signature"] ??
    req.headers["x-paystack-signature"]) as string | string[] | undefined;
  const sig = Array.isArray(signature) ? signature[0] : signature;
  const raw = (req as any).rawBody as Buffer | undefined;
  if (!verifyPaystackSignature(raw, sig, env.webhookSecret())) {
    throw new HttpError(400, "Invalid webhook signature");
  }

  const event = req.body as any;
  const eventName: string | undefined = typeof event?.event === "string" ? event.event : undefined;

  // Supported event names:
  // - charge.success (legacy Paystack-style): amount is in kobo
  // - deposit.completed / deposit.success (MVP): amount is in naira
  const isDepositEvent =
    eventName === "charge.success" || eventName === "deposit.completed" || eventName === "deposit.success";

  if (isDepositEvent) {
    const reference: unknown = event?.data?.reference ?? event?.data?.metadata?.reference;
    const userId: unknown = event?.data?.metadata?.userId ?? event?.data?.metadata?.userID;
    const amountRaw: unknown = event?.data?.amount;

    if (typeof reference !== "string" || !reference.trim()) {
      res.sendStatus(200);
      return;
    }
    if (typeof userId !== "string" || !userId.trim()) {
      res.sendStatus(200);
      return;
    }
    if (typeof amountRaw !== "number" || !Number.isFinite(amountRaw) || amountRaw <= 0) {
      res.sendStatus(200);
      return;
    }

    const amount = eventName === "charge.success" ? amountRaw / 100 : amountRaw;
    if (amount <= 0) {
      res.sendStatus(200);
      return;
    }

    await applyPaystackDeposit(userId, amount, reference);

    const authCode = event?.data?.authorization?.authorization_code;
    if (typeof authCode === "string" && authCode.trim()) {
      await UserModel.updateOne(
        { _id: userId },
        {
          $set: {
            "bankAccount.autoDebitAuthorizationCode": authCode.trim(),
          },
        }
      );
    }
  }

  res.sendStatus(200);
});

export const withdraw = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body as { amount: number };
  const user = await UserModel.findById((req as any).userId);
  if (!user) throw new HttpError(404, "User not found");
  if (!user.bankAccount?.accountNumber || !user.bankAccount?.bankName) throw new HttpError(400, "No bank account linked");

  await debitWallet(user._id.toString(), amount, "main");
  await notify(user._id.toString(), `You have withdrawn ₦${amount} to your bank account`);

  res.status(200).json({
    success: true,
    message: "Withdrawal successful",
  });
});
