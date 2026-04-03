import { GroupMessageModel } from "../models/groupMessage.model";
import { HttpError } from "../errors/HttpError";
import { requireGroupMember } from "./groupMember.service";

export async function createGroupChatMessage(groupId: string, userId: string, body: string) {
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (!trimmed || trimmed.length > 2000) throw new HttpError(400, "Invalid message");

  await requireGroupMember(groupId, userId);

  const msg = await GroupMessageModel.create({
    groupAjo: groupId,
    sender: userId,
    body: trimmed,
  });
  const populated = await GroupMessageModel.findById(msg._id).populate("sender", "name username").lean();
  if (!populated) throw new HttpError(500, "Failed to load message");
  return populated;
}
