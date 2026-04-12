import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    metadata: { type: mongoose.Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    socketDeliveredAt: { type: Date },
    smsDeliveredAt: { type: Date },
    smsError: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const NotificationModel = mongoose.model("Notification", notificationSchema);
