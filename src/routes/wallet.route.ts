import { Router } from 'express';
import { initDeposit, webhook, withdraw } from '../controller/wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// 30 requests per minute for deposits/withdrawals
const walletRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.post('/deposit', walletRateLimit, authMiddleware, initDeposit);
router.post('/withdraw', walletRateLimit, authMiddleware, withdraw);
router.post('/webhook', webhook);

export default router;
