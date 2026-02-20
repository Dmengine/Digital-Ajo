import { Router } from 'express';
import { submitKyc, getKycStatus } from '../controller/kyc.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Stricter rate limit for KYC submission: 5 attempts per hour per IP
const kycSubmitRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
// General rate limit for status queries: 30 per minute per IP
const kycStatusRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.post('/submit', kycSubmitRateLimit, authMiddleware, submitKyc);
router.get('/status', kycStatusRateLimit, authMiddleware, getKycStatus);

export default router;
