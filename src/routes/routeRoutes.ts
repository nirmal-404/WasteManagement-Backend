import { Router } from "express";
import { auth, requireAdmin, requireCollector } from "../middleware/authMiddleware.js";
import { 
  generateRoutes,
  createRoute,
  listRoutes,
  getRouteById,
  updateRouteStatus,
  updateCollectionStatus,
  assignRoute,
  deleteRoute,
  createRouteValidation
} from "../controllers/routeController.js";

const router = Router();

// Admin routes
router.post("/generate", auth, requireAdmin, generateRoutes);
router.post("/", auth, requireAdmin, createRouteValidation, createRoute);
router.get("/", auth, requireAdmin, listRoutes);
router.get("/:id", auth, getRouteById);
router.patch("/:id/status", auth, requireAdmin, updateRouteStatus);
router.patch("/:id/assign", auth, requireAdmin, assignRoute);
router.delete("/:id", auth, requireAdmin, deleteRoute);

// Collector/Driver routes
router.patch("/:id/collection", auth, requireCollector, updateCollectionStatus);

export default router;
