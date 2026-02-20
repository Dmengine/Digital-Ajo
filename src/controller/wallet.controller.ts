import { Request, Response } from "express";
import { UserModel } from "../models/auth.model";
import { initializeDeposit, transferFunds } from "../services/paystack.services";
import { notify } from "../services/notification.service";
import { creditWallet, debitWallet } from "../services/wallet.service";



export const initDeposit = async (req: Request, res: Response) => {
    try {
        const { amount} = req.body;
        const user = await UserModel.findById((req as any).userId);
        if(!user){
            return res.status(400).send({
                message: 'User not found',
                success: false
            })
        }
        const url = await initializeDeposit(user.email, user._id.toString(), amount)
        await notify(user._id.toString(), `You initiated a deposit of ₦${amount}. Please complete the payment.`);
        res.json({paymentURL: url})
    } catch (error) {
        console.log("Error in initDeposit controller", error);
        res.status(500).send({ message: "Server Error" });
    }
}

export const webhook = async (req: Request, res:Response) => {
    try {
        const event = req.body;
        if(event?.event === "charge.success"){
            const userId = event?.data?.metadata?.userId;
            const amount = event?.data?.amount / 100;
            if(userId && amount > 0){
                await creditWallet(userId, amount, "normal")
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.log("Error in webhook controller", error);
        res.status(500).send({ message: "Server Error" });
    }
}

export const withdraw = async (req:Request, res:Response) => {
    try {
        const {amount} = req.body;
        const user = await UserModel.findById((req as any).userId);
        if(!user){
            return res.status(400).send({
                message: "User not found",
                success: false,
            })
        }
        if(!user.bankAccount?.recipientCode){
            return res.status(400).send({
                message: "No bank account linked",
                success: false
            })
        }
        if (!user.kyc || user.kyc.level < 1) {
            return res.status(403).send({
                message: "Complete KYC verification before withdrawal.",
                success: false
            })
        }
        await debitWallet(user._id.toString(), amount, "normal");
        await transferFunds(user.bankAccount.recipientCode, amount, "User Withdrawal");
        await notify(user._id.toString(), `You have withdrawn ₦${amount} to your bank account`);
        res.status(200).send({
            message: "Withdrawal successful",
            success: true
        })
    } catch (error) {
        console.log("Error in withdraw controller", error);
        res.status(500).send({ message: "Server Error" });
    }
}