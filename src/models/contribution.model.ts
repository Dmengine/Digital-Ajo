import mongoose from "mongoose";

/**
 * One row per payer per round. ContriPay never moves the money: the payer transfers
 * directly to the round's recipient, marks it paid, and the recipient confirms receipt.
 *
 * pending      -> round open, nothing reported yet
 * marked_paid  -> payer says they sent the transfer
 * confirmed    -> recipient confirmed they received it
 * unpaid       -> past due (or disputed by the recipient), grace period running
 * defaulted    -> still not confirmed when the grace period ended
 */
export const CONTRIBUTION_STATUSES = ["pending", "marked_paid", "confirmed", "unpaid", "defaulted"] as const;
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

const contributionSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    /** The payer. */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    /** The member receiving this round's contributions. */
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    groupAjo: { type: mongoose.Schema.Types.ObjectId, ref: "GroupAjo", required: true },
    status: {
      type: String,
      enum: CONTRIBUTION_STATUSES,
      default: "pending",
    },
    cycle: { type: Number, required: true, min: 1 },
    turn: { type: Number, required: true, min: 1 },
    dueAt: { type: Date },
    graceEndsAt: { type: Date },
    markedPaidAt: { type: Date },
    /** Free-text transfer reference supplied by the payer (e.g. bank narration / session ID). */
    payerReference: { type: String, trim: true, maxlength: 120 },
    confirmedAt: { type: Date },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    disputedAt: { type: Date },
    defaultedAt: { type: Date },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

contributionSchema.index({ groupAjo: 1, cycle: 1, user: 1 }, { unique: true });
contributionSchema.index({ status: 1, dueAt: 1 });

export const ContributionModel = mongoose.model("Contribution", contributionSchema);
