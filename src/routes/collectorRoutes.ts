import { Router } from "express";
import { auth, requireCollector, requireAdmin } from "../middleware/authMiddleware.js";
import { todaysAssignments, scan, syncBatch } from "../controllers/collectorController.js";

const router = Router();

// Collector routes
router.get("/assignments/today", auth, requireCollector, todaysAssignments);
router.post("/scan", auth, requireCollector, scan);
router.post("/sync", auth, requireCollector, syncBatch);

export default router;