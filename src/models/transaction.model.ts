import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "auto-debit", "payout", "fee", "reversal"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    walletType: {
      type: String,
      enum: ["main", "locked", "ajo"],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

transactionSchema.index(
  { "metadata.paystackReference": 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { "metadata.paystackReference": { $type: "string" } },
  }
);

export const TransactionModel = mongoose.model("Transaction", transactionSchema);
