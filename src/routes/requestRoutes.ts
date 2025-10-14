import { Router } from "express";
import { auth, requireAdmin, requireCollector, requireResident } from "../middleware/authMiddleware.js";
import { 
  createRequest, 
  myRequests, 
  allRequests, 
  getRequestById,
  approveRequest, 
  rejectRequest, 
  scheduleRequest,
  updateRequestStatus,
  submitRating,
  createRequestValidation,
  scheduleRequestValidation
} from "../controllers/requestController.js";

const router = Router();

// Resident routes
router.post("/", auth, requireResident, createRequestValidation, createRequest);
router.get("/my", auth, requireResident, myRequests);
router.get("/:id", auth, getRequestById);
router.post("/:id/rating", auth, requireResident, submitRating);

// Admin routes
router.get("/", auth, requireAdmin, allRequests);
router.patch("/:id/approve", auth, requireAdmin, approveRequest);
router.patch("/:id/reject", auth, requireAdmin, rejectRequest);
router.patch("/:id/schedule", auth, requireAdmin, scheduleRequestValidation, scheduleRequest);

// Collector/Driver routes
router.patch("/:id/status", auth, requireCollector, updateRequestStatus);

export default router;

