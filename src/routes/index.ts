import { Router } from "express";
import authRoutes from "./auth.route";
import groupRoutes from "./group.route";
import walletRoutes from "./wallet.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/groups", groupRoutes);
router.use("/wallet", walletRoutes);

export default router;
