import { Router } from "express";
import { auth, requireCollector, requireAdmin } from "../middleware/authMiddleware.js";
import { todaysAssignments, scan, syncBatch, todaysCollectorRequests } from "../controllers/collectorController.js";

const router = Router();

// Collector routes
router.get("/assignments/today", auth, requireCollector, todaysAssignments);
router.post("/scan", auth, requireCollector, scan);
router.post("/sync", auth, requireCollector, syncBatch);
router.get("/requests/today", auth, requireCollector, todaysCollectorRequests);

export default router;