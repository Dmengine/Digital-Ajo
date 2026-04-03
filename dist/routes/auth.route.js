"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("../middleware/auth");
const auth_controller_1 = require("../controller/auth.controller");
const validate_1 = require("../middleware/validate");
const auth_validators_1 = require("../validators/auth.validators");
const kyc_validators_1 = require("../validators/kyc.validators");
const avatar_validators_1 = require("../validators/avatar.validators");
const router = (0, express_1.Router)();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts, try again later" },
});
router.post("/register", authLimiter, (0, validate_1.validateBody)(auth_validators_1.registerSchema), auth_controller_1.register);
router.post("/login", authLimiter, (0, validate_1.validateBody)(auth_validators_1.loginSchema), auth_controller_1.login);
router.post("/logout", auth_1.requireAuth, auth_controller_1.logout);
router.get("/me", auth_1.requireAuth, auth_controller_1.me);
router.post("/kyc/tier1", auth_1.requireAuth, (0, validate_1.validateBody)(kyc_validators_1.submitTier1KycSchema), auth_controller_1.submitTier1Kyc);
router.post("/avatar", auth_1.requireAuth, (0, validate_1.validateBody)(avatar_validators_1.uploadAvatarSchema), auth_controller_1.uploadAvatar);
exports.default = router;
