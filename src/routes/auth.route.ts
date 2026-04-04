import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth";
import {
  login,
  logout,
  me,
  register,
  submitTier1Kyc,
  uploadAvatar,
} from "../controller/auth.controller";
import { validateBody } from "../middleware/validate";
import {
  registerSchema,
  loginSchema,
} from "../validators/auth.validators";
import { submitTier1KycSchema } from "../validators/kyc.validators";
import { uploadAvatarSchema } from "../validators/avatar.validators";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, try again later" },
});

router.post("/register", authLimiter, validateBody(registerSchema), register);
router.post("/login", authLimiter, validateBody(loginSchema), login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);
router.post("/kyc/tier1", requireAuth, validateBody(submitTier1KycSchema), submitTier1Kyc);
router.post("/avatar", requireAuth, validateBody(uploadAvatarSchema), uploadAvatar);

export default router;
