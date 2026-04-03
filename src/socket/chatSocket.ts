import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env";
import { UserModel } from "../models/user.model";
import { createGroupChatMessage } from "../services/groupChat.service";
import { requireGroupMember } from "../services/groupMember.service";
import { HttpError } from "../errors/HttpError";

function roomGroup(groupId: string) {
  return `group:${groupId}`;
}

export function attachChatSocket(httpServer: HttpServer) {
  const corsOrigin = env.corsOrigin === "*" ? true : env.corsOrigin.split(",").map((s) => s.trim());

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth as { token?: string } | undefined;
      let token =
        typeof auth?.token === "string" && auth.token.trim() ? auth.token.trim() : undefined;
      if (!token) {
        const authHeader = socket.handshake.headers.authorization;
        if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
          token = authHeader.slice(7).trim();
        }
      }
      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }
      const payload = jwt.verify(token, env.jwtSecret()) as jwt.JwtPayload & { id?: string };
      const id = typeof payload.id === "string" ? payload.id : undefined;
      if (!id) {
        next(new Error("Unauthorized"));
        return;
      }
      const tokenVersion =
        typeof (payload as { tokenVersion?: number }).tokenVersion === "number"
          ? (payload as { tokenVersion: number }).tokenVersion
          : 0;
      const user = await UserModel.findById(id).select("tokenVersion");
      if (!user || user.tokenVersion !== tokenVersion) {
        next(new Error("Unauthorized"));
        return;
      }
      (socket.data as { userId?: string }).userId = id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as { userId: string }).userId;

    socket.on("chat:join", async (payload: { groupId?: string }, cb) => {
      const groupId = payload?.groupId;
      if (!groupId || !mongoose.isValidObjectId(groupId)) {
        if (typeof cb === "function") cb({ ok: false, message: "Invalid group" });
        return;
      }
      try {
        await requireGroupMember(groupId, userId);
        await socket.join(roomGroup(groupId));
        if (typeof cb === "function") cb({ ok: true, groupId });
      } catch (e) {
        const msg = e instanceof HttpError ? e.message : "Could not join";
        if (typeof cb === "function") cb({ ok: false, message: msg });
      }
    });

    socket.on("chat:leave", (payload: { groupId?: string }) => {
      const groupId = payload?.groupId;
      if (groupId && mongoose.isValidObjectId(groupId)) void socket.leave(roomGroup(groupId));
    });

    socket.on("chat:send", async (payload: { groupId?: string; body?: string }, cb) => {
      const groupId = payload?.groupId;
      const body = payload?.body;
      if (!groupId || !mongoose.isValidObjectId(groupId)) {
        if (typeof cb === "function") cb({ ok: false, message: "Invalid group" });
        return;
      }
      try {
        const msg = await createGroupChatMessage(groupId, userId, typeof body === "string" ? body : "");
        io.to(roomGroup(groupId)).emit("chat:message", msg);
        if (typeof cb === "function") cb({ ok: true, id: String((msg as { _id: unknown })._id) });
      } catch (e) {
        const msg = e instanceof HttpError ? e.message : "Could not send";
        if (typeof cb === "function") cb({ ok: false, message: msg });
      }
    });
  });

  return io;
}
