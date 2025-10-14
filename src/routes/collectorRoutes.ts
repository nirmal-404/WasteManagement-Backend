import { Router } from "express";
import { auth, requireRole } from "../middleware/authMiddleware";
import { todaysAssignments, scan, syncBatch } from "../controllers/collectorController";

const router = Router();
router.get("/assignments/today", auth, requireRole("COLLECTOR", "ADMIN"), todaysAssignments);
router.post("/scan", auth, requireRole("COLLECTOR", "ADMIN"), scan);
router.post("/sync", auth, requireRole("COLLECTOR", "ADMIN"), syncBatch);
export default router;