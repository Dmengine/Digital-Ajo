import { Router } from "express";
import authRoutes from "./auth.route";
import groupRoutes from "./group.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/groups", groupRoutes);

export default router;
