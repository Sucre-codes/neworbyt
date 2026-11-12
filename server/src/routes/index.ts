import { Router } from "express";
import healthRoutes from "./health.route";
import userRoutes from "./user.routes";
import authRoutes from "./auth.routes";
import circleRoutes from "./circle.routes"
import statsRoutes from "./stats.routes"

const router = Router();
router.use("/health", healthRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/circles",circleRoutes);
router.use("/stats", statsRoutes);


export default router; 