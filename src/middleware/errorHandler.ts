import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../errors/HttpError";
import { env } from "../config/env";

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }
  if (env.nodeEnv !== "production") {
    console.error(err);
  } else {
    console.error(err instanceof Error ? err.message : "Unknown error");
  }
  res.status(500).json({ success: false, message: "Internal server error" });
};
