import { Router } from "express";
import { auth, requireResident } from "../middleware/authMiddleware.js";
import { WasteRecord } from "../models/WasteRecord.js";

const router = Router();

// Get current user's waste records
router.get("/my", auth, requireResident, async (req: any, res) => {
  try {
    const records = await WasteRecord.find({ userId: req.user._id })
      .populate("binId", "locationName wasteType")
      .sort({ createdAt: -1 });
    res.json({ records });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to fetch waste records" });
  }
});

export default router;


