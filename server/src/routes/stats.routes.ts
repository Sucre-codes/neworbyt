import { Router } from "express";
import { stats } from "../controllers/stats.controller";

const router = Router();
router.get("/", stats);

export default router;