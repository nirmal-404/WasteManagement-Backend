import express from "express";
import {
  createBin,
  getAllBins,
  getBinsByUser,
  updateBin,
  deleteBin,
} from "../controllers/binController";

const router = express.Router();

router.post("/", createBin);
router.get("/", getAllBins);
router.get("/user/:userId", getBinsByUser);
router.put("/:id", updateBin);
router.delete("/:id", deleteBin);

export default router;