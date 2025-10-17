import { Router } from "express";
import { PaymentBillController  } from "../controllers/paymentBillController";
import { auth, requireResident } from "../middleware/authMiddleware.js";
import { PaymentBillModel } from "../models/PaymentBill.js";

const router = Router();
const controller = new PaymentBillController ();

router.post("/", controller.create.bind(controller));
router.get("/", controller.findAll.bind(controller));
router.get("/:id", controller.findById.bind(controller));
router.put("/:id", controller.update.bind(controller));
router.delete("/:id", controller.delete.bind(controller));

// Get current user's bills
router.get("/me/my", auth, requireResident, async (req: any, res) => {
  try {
    const bills = await PaymentBillModel.find({ userId: req.user._id })
      .populate("wasteRecordId", "recordId totalAmount")
      .sort({ createdAt: -1 });
    res.json({ bills });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to fetch bills" });
  }
});

// Pay a bill (mark as paid)
router.post("/:id/pay", auth, requireResident, async (req: any, res) => {
  try {
    const bill = await PaymentBillModel.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    bill.status = "paid";
    bill.paidAmount = bill.totalAmount;
    bill.paymentDate = new Date();
    await bill.save();

    res.json({ message: "Bill paid successfully", bill });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to pay bill" });
  }
});

export default router;
