import { Router } from "express";
import rateLimit from "express-rate-limit";
import { initDeposit, webhook, withdraw } from "../controller/wallet.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { depositInitSchema, withdrawSchema } from "../validators/wallet.validators";

const router = Router();

const walletMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests" },
});

router.post("/webhook", webhook);
router.post("/deposit/init", requireAuth, walletMutationLimiter, validateBody(depositInitSchema), initDeposit);
router.post("/withdraw", requireAuth, walletMutationLimiter, validateBody(withdrawSchema), withdraw);

export default router;
