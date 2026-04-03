"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const wallet_controller_1 = require("../controller/wallet.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const wallet_validators_1 = require("../validators/wallet.validators");
const router = (0, express_1.Router)();
const walletMutationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests" },
});
router.post("/webhook", wallet_controller_1.webhook);
router.post("/deposit/init", auth_1.requireAuth, walletMutationLimiter, (0, validate_1.validateBody)(wallet_validators_1.depositInitSchema), wallet_controller_1.initDeposit);
router.post("/withdraw", auth_1.requireAuth, walletMutationLimiter, (0, validate_1.validateBody)(wallet_validators_1.withdrawSchema), wallet_controller_1.withdraw);
exports.default = router;
