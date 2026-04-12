import type { Server } from "socket.io";

let ioServer: Server | null = null;

export function setSocketServer(io: Server) {
  ioServer = io;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function emitToUser(userId: string, event: string, payload: unknown): boolean {
  if (!ioServer) return false;
  ioServer.to(userRoom(userId)).emit(event, payload);
  return true;
}
