import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret()) as jwt.JwtPayload & { id?: string };
    const id = typeof payload.id === "string" ? payload.id : undefined;
    if (!id) {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }
    req.userId = id;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
