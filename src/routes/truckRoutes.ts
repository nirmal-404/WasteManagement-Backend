import express from "express";
import {
  createTruck,
  getAllTrucks,
  getTruckById,
  updateTruck,
  softDeleteTruck,
  truckValidation,
} from "../controllers/truckController.js";

const router = express.Router();

// 🚚 Public (no auth) for testing
router.post("/", truckValidation, createTruck);
router.get("/", getAllTrucks);
router.get("/:id", getTruckById);
router.put("/:id", updateTruck);
router.delete("/:id", softDeleteTruck);

export default router;
