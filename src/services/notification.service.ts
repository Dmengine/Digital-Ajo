import { NotificationModel } from "../models/notification.model";
import { UserModel } from "../models/user.model";
import { env } from "../config/env";
import { emitToUser } from "../socket/realtime";
import { sendTwilioSms } from "./twilio.service";

export const notify = async (
  userId: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  const notification = await NotificationModel.create({
    user: userId,
    message,
    metadata,
  });

  const payload = {
    _id: String(notification._id),
    user: userId,
    message,
    metadata: notification.metadata,
    createdAt: notification.createdAt,
    isRead: false,
  };

  const socketDelivered = emitToUser(userId, "notification:new", payload);
  const update: Record<string, unknown> = {};
  if (socketDelivered) update.socketDeliveredAt = new Date();

  try {
    if (env.twilioConfigured()) {
      const user = await UserModel.findById(userId).select("phone").lean();
      if (user?.phone) {
        await sendTwilioSms(user.phone, message);
        update.smsDeliveredAt = new Date();
      }
    }
  } catch (e: unknown) {
    update.smsError = e instanceof Error ? e.message : "SMS delivery failed";
  }

  if (Object.keys(update).length > 0) {
    await NotificationModel.updateOne({ _id: notification._id }, { $set: update });
  }
};
