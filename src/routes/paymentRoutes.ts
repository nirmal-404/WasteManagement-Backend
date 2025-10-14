import { Router } from "express";
import { auth, requireAdmin, requireResident } from "../middleware/authMiddleware.js";
import { 
  summary, 
  checkout, 
  applyCredits, 
  history,
  getPaymentById,
  retryPayment,
  generateReceipt,
  getAllPayments,
  checkoutValidation
} from "../controllers/paymentController.js";

const router = Router();

// Resident routes
router.get("/summary", auth, requireResident, summary);
router.post("/apply-credits", auth, requireResident, applyCredits);
router.post("/checkout", auth, requireResident, checkoutValidation, checkout);
router.get("/history", auth, requireResident, history);
router.get("/:id", auth, requireResident, getPaymentById);
router.post("/:id/retry", auth, requireResident, retryPayment);
router.get("/:id/receipt", auth, requireResident, generateReceipt);

// Admin routes
router.get("/", auth, requireAdmin, getAllPayments);

export default router;
