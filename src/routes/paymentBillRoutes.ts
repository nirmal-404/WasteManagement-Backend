import { Router } from "express";
import { PaymentBillController  } from "../controllers/paymentBillController";
import { auth, requireResident } from "../middleware/authMiddleware.js";
import { PaymentBillModel } from "../models/PaymentBill.js";
import { createNotification } from "../utils/notificationUtils.js";
import RequestModel from "../models/Request.js";
import { Reward } from "../models/Reward.js";

const router = Router();
const controller = new PaymentBillController ();

router.post("/", async (req, res) => {
  try {
    const bill = await controller.create(req.body);
    return res.json(bill);
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to create bill' });
  }
});

router.get("/", async (_req, res) => {
  try {
    const bills = await controller.findAll();
    return res.json(bills);
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to fetch bills' });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const bill = await controller.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });
    return res.json(bill);
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to fetch bill' });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const bill = await controller.update(req.params.id, req.body);
    if (!bill) return res.status(404).json({ message: 'Not found' });
    return res.json(bill);
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to update bill' });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const bill = await controller.delete(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Deleted' });
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to delete bill' });
  }
});

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

    // Optional reward redemption
    const redeem = Math.max(Number(req.body?.redeem || 0), 0);
    let redeemed = 0;
    try {
      if (redeem > 0) {
        const reward = await Reward.findOne({ userId: req.user._id });
        const now = new Date();
        if (reward && reward.points > 0 && reward.expiryDate && reward.expiryDate > now) {
          redeemed = Math.min(redeem, reward.points, bill.totalAmount);
          reward.points = reward.points - redeemed;
          await reward.save();
        }
      }
    } catch {}

    bill.status = "paid";
    bill.paidAmount = bill.totalAmount - redeemed;
    bill.paymentDate = new Date();
    await bill.save();

    // Reward logic: grant 1% of total as points, set or extend expiry to 90 days from now
    try {
      const grantPoints = Math.floor(((bill.totalAmount - redeemed) || 0) * 0.01);
      const now = new Date();
      const expiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const reward = await Reward.findOne({ userId: req.user._id });
      if (!reward) {
        await Reward.create({ userId: req.user._id, points: grantPoints, expiryDate: expiry });
      } else {
        reward.points = (reward.points || 0) + grantPoints;
        // If expired or close to expiry, extend
        reward.expiryDate = reward.expiryDate && reward.expiryDate > now ? reward.expiryDate : expiry;
        await reward.save();
      }
    } catch {}

    // Try to link to a request (via waste record -> description or metadata not stored; fallback message)
    try {
      const message = `Payment received for bill ${bill.billId}. Thank you!`;
      await createNotification(req.user._id.toString(), message, 'success');
    } catch {}

    res.json({ message: "Bill paid successfully", bill, redeemed });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to pay bill" });
  }
});

export default router;
