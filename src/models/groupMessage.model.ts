import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    groupAjo: { type: mongoose.Schema.Types.ObjectId, ref: "GroupAjo", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

groupMessageSchema.index({ groupAjo: 1, createdAt: -1 });

export const GroupMessageModel = mongoose.model("GroupMessage", groupMessageSchema);
