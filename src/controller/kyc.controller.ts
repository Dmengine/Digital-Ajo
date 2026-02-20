import { Request, Response } from 'express';
import { UserModel } from '../models/auth.model';
import { encrypt } from '../utils/encrypt';
import { createTransferRecipient } from '../services/paystack.services';
import { notify } from '../services/notification.service';

export const submitKyc = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { bvn, nin, dateOfBirth, address, accountNumber, bankName, bankCode } = req.body;

        if (!dateOfBirth || !address) {
            return res.status(400).send({
                message: 'Please provide dateOfBirth and address',
                success: false,
            });
        }

        if (!bvn && !nin) {
            return res.status(400).send({
                message: 'Please provide BVN or NIN',
                success: false,
            });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).send({ message: 'User not found', success: false });
        }

        if (user.kyc && user.kyc.level >= 1) {
            return res.status(400).send({ message: 'KYC already verified', success: false });
        }

        const kycUpdate: Record<string, unknown> = {
            'kyc.address': address,
            'kyc.dateOfBirth': new Date(dateOfBirth as string),
        };

        if (bvn) {
            kycUpdate['kyc.bvn'] = encrypt(bvn as string);
        }
        if (nin) {
            kycUpdate['kyc.nin'] = encrypt(nin as string);
        }

        if (accountNumber && bankCode && bankName) {
            const recipientCode = await createTransferRecipient(user.name, accountNumber as string, bankCode as string);
            kycUpdate['bankAccount.accountNumber'] = accountNumber;
            kycUpdate['bankAccount.bankName'] = bankName;
            kycUpdate['bankAccount.recipientCode'] = recipientCode;
        }

        kycUpdate['kyc.level'] = 1;
        kycUpdate['kyc.isVerified'] = true;
        kycUpdate['kyc.verifiedAt'] = new Date();

        await UserModel.findByIdAndUpdate(userId, { $set: kycUpdate });
        await notify(userId, 'Your KYC verification was successful. You can now make withdrawals.');

        res.status(200).send({ message: 'KYC verification successful', success: true });
    } catch (error) {
        console.error('Error in submitKyc controller:', error instanceof Error ? error.message : 'Unknown error');
        res.status(500).send({ message: 'Server Error', success: false });
    }
};

export const getKycStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const user = await UserModel.findById(userId).select('kyc bankAccount.accountNumber bankAccount.bankName');
        if (!user) {
            return res.status(404).send({ message: 'User not found', success: false });
        }
        res.status(200).send({
            success: true,
            kyc: {
                level: user.kyc?.level ?? 0,
                isVerified: user.kyc?.isVerified ?? false,
                verifiedAt: user.kyc?.verifiedAt ?? null,
                address: user.kyc?.address ?? null,
                dateOfBirth: user.kyc?.dateOfBirth ?? null,
            },
        });
    } catch (error) {
        console.error('Error in getKycStatus controller:', error instanceof Error ? error.message : 'Unknown error');
        res.status(500).send({ message: 'Server Error', success: false });
    }
};
