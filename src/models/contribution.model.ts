import mongoose from "mongoose";

const contributionSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    groupAjo: { type: mongoose.Schema.Types.ObjectId, ref: "GroupAjo", required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "unpaid", "defaulted"],
      default: "pending",
    },
    cycle: { type: Number, required: true, min: 1 },
    turn: { type: Number, required: true, min: 1 },
    dueAt: { type: Date },
    paidAt: { type: Date },
    graceEndsAt: { type: Date },
    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date },
    nextRetryAt: { type: Date },
    usedAutoDebit: { type: Boolean, default: false },
    penaltyApplied: { type: Boolean, default: false },
    penaltyAmount: { type: Number, default: 0, min: 0 },
    roundStatusSnapshot: {
      type: String,
      enum: ["active", "paused", "completed"],
    },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

contributionSchema.index({ groupAjo: 1, cycle: 1, user: 1 }, { unique: true });
contributionSchema.index({ status: 1, dueAt: 1 });
contributionSchema.index({ status: 1, nextRetryAt: 1 });

export const ContributionModel = mongoose.model("Contribution", contributionSchema);
