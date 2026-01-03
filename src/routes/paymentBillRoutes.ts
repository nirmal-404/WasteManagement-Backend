import { Router } from "express";
import { 
	createPaymentBill,
	getAllPaymentBills,
	getPaymentBillById,
	updatePaymentBill,
	deletePaymentBill,
	getMyBills,
	payBill
} from "../controllers/paymentBillController.js";
import { auth, requireResident } from "../middleware/authMiddleware.js";

const router = Router();

// Basic CRUD routes
router.post("/", createPaymentBill);
router.get("/", getAllPaymentBills);
router.get("/:id", getPaymentBillById);
router.put("/:id", updatePaymentBill);
router.delete("/:id", deletePaymentBill);

// Custom routes
router.get("/me/my", auth, requireResident, getMyBills as any);
router.post("/:id/pay", auth, requireResident, payBill as any);

export default router;
