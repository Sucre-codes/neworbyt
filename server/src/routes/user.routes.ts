import { Router } from "express";
import { deposit, getMe } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.get("/me", requireAuth, getMe);
router.post("/me/deposit", requireAuth, deposit);

export default router;