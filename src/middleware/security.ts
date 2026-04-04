import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../models/user.model";
import { HttpError } from "../errors/HttpError";

export const requireSecureAccountForMoneyOut = async (req: Request, _res: Response, next: NextFunction) => {
  const userId = (req as any).userId as string | undefined;
  if (!userId) throw new HttpError(401, "Authentication required");

  const user = await UserModel.findById(userId).select(
    "isFlagged isRestricted restrictedUntil +security.transactionPinHash"
  );
  if (!user) throw new HttpError(404, "User not found");

  if (user.isFlagged) throw new HttpError(403, "Account flagged for manual review");
  if (user.isRestricted) {
    const until = user.restrictedUntil ? ` until ${user.restrictedUntil.toISOString()}` : "";
    throw new HttpError(403, `Account is restricted${until}`);
  }

  if (process.env.REQUIRE_TX_PIN === "true") {
    const pin = req.headers["x-transaction-pin"];
    const candidate = Array.isArray(pin) ? pin[0] : pin;
    if (!candidate || !user.security?.transactionPinHash) {
      throw new HttpError(403, "Transaction PIN is required");
    }
    const ok = await bcrypt.compare(candidate, user.security.transactionPinHash);
    if (!ok) throw new HttpError(403, "Invalid transaction PIN");
  }

  next();
};
