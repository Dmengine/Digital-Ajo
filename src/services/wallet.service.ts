import { UserModel } from "../models/auth.model";
import { ContributionModel } from "../models/contribution.model";
import { TransactionModel } from "../models/transaction.model";

export const creditWallet = async (userId: string, amount: number, wallet: "normal"|"emergency"="normal") => {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { [`wallets.${wallet}`]: amount } },
    { new: true }
  );
  await TransactionModel.create({ user: userId, type: "deposit", amount, walletType: wallet, status: "success" });
  return user;
};

export const debitWallet = async (userId: string, amount: number, wallet: "normal"|"emergency"="normal") => {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");
  const current = (user.wallets as any)[wallet];
  if (current < amount) throw new Error("Insufficient balance");
  (user.wallets as any)[wallet] = current - amount;
  await user.save();
  await TransactionModel.create({ user: userId, type: "withdrawal", amount, walletType: wallet, status: "success" });
  return user;
};

export const recordContribution = async (groupId: string, userId: string, amount: number, cycle: number, turn: number) => {
  return ContributionModel.create({
    group: groupId,
    user: userId,
    amount,
    cycle,
    turn,
    status: "paid"
  });
};
