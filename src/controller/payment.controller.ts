import { Request, Response } from 'express';
import { UserModel } from '../models/auth.model';
import { initializeDeposit } from '../services/paystack.services';
import { notify } from '../services/notification.service';

export const createPayment = async (req: Request, res: Response) => {
    try {
        const { amount } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).send({
                message: 'Please provide a valid amount greater than 0',
                success: false,
            });
        }

        const user = await UserModel.findById((req as any).userId);
        if (!user) {
            return res.status(404).send({
                message: 'User not found',
                success: false,
            });
        }

        const paymentURL = await initializeDeposit(user.email, user._id.toString(), amount);
        await notify(user._id.toString(), `You initiated a payment of ₦${amount}. Please complete the payment.`);

        res.status(200).send({
            success: true,
            paymentURL,
        });
    } catch (error) {
        console.error('Error in createPayment controller:', error instanceof Error ? error.message : 'Unknown error');
        res.status(500).send({ message: 'Server Error', success: false });
    }
};
