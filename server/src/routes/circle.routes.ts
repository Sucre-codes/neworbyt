import { Router } from "express";
import * as c from "../controllers/circle.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.post("/", c.createCircle);
router.post("/join", c.joinCircle);
router.get("/", c.listCircles);

router.get("/:id", c.getCircle);
router.get("/:id/activity", c.getActivity);
router.get("/:id/suggested-order", c.suggestOrder);
router.post("/:id/start", c.startCircle);
router.post("/:id/contribute", c.contribute);
router.post("/:id/settle", c.settle);
router.post("/:id/claim", c.claimDeposit);

export default router;