import mongoose from "mongoose";

const contributionSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    groupAjo: { type: mongoose.Schema.Types.ObjectId, ref: "GroupAjo", required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    cycle: { type: Number, required: true, min: 1 },
    turn: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

export const ContributionModel = mongoose.model("Contribution", contributionSchema);
