import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login } from "../controller/auth.controller";
import { validateBody } from "../middleware/validate";
import { registerSchema, loginSchema } from "../validators/auth.validators";

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

export default router;
