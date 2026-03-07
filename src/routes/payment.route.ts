import { Router } from 'express';
import { createPayment } from '../controller/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// 30 requests per minute per IP
const paymentRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.post('/', paymentRateLimit, authMiddleware, createPayment);

export default router;
