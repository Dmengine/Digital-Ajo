import { Router } from "express";
import rateLimit from "express-rate-limit";
import { initDeposit, verifyDeposit, webhook, withdraw } from "../controller/wallet.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { depositInitSchema, depositVerifySchema, withdrawSchema } from "../validators/wallet.validators";

const router = Router();

const walletMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests" },
});

const withdrawLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many withdrawal requests" },
});

router.post("/webhook", webhook);
router.post("/deposit/init", requireAuth, walletMutationLimiter, validateBody(depositInitSchema), initDeposit);
router.post("/deposit/verify", requireAuth, walletMutationLimiter, validateBody(depositVerifySchema), verifyDeposit);
router.post(
  "/withdraw",
  requireAuth,
  withdrawLimiter,
  validateBody(withdrawSchema),
  withdraw
);

export default router;
