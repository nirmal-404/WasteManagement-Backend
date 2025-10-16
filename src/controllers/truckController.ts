import { Request, Response } from "express";
import Truck from "../models/Truck.js";
import User from "../models/User.js";
import { validationResult, body } from "express-validator";

// ✅ Validation rules
export const truckValidation = [
  body("plateNo").notEmpty().withMessage("Plate number is required"),
  body("capacityKg").optional().isNumeric().withMessage("Capacity must be a number"),
  body("driverId").optional().isMongoId().withMessage("Invalid driver ID format"),
];

// ✅ Create new truck
export const createTruck = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const { plateNo, capacityKg, driverId } = req.body;

    // Ensure plateNo is unique
    const existingTruck = await Truck.findOne({ plateNo });
    if (existingTruck) {
      return res.status(400).json({ message: "Truck with this plate number already exists" });
    }

    // Optional: validate driver existence
    if (driverId) {
      const driver = await User.findById(driverId);
      if (!driver) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
    }

    const newTruck = await Truck.create({ plateNo, capacityKg, driverId });
    res.status(201).json({ message: "Truck created successfully", truck: newTruck });
  } catch (error: any) {
    console.error("Create truck error:", error);
    res.status(500).json({ message: error.message || "Failed to create truck" });
  }
};

// ✅ Get all trucks
export const getAllTrucks = async (req: Request, res: Response) => {
  try {
    const trucks = await Truck.find().populate("driverId", "name email phone").sort({ createdAt: -1 });
    res.json({ trucks });
  } catch (error: any) {
    console.error("Get trucks error:", error);
    res.status(500).json({ message: error.message || "Failed to get trucks" });
  }
};

// ✅ Get single truck by ID
export const getTruckById = async (req: Request, res: Response) => {
  try {
    const truck = await Truck.findById(req.params.id).populate("driverId", "name email phone");
    if (!truck) return res.status(404).json({ message: "Truck not found" });
    res.json({ truck });
  } catch (error: any) {
    console.error("Get truck error:", error);
    res.status(500).json({ message: error.message || "Failed to get truck" });
  }
};

// ✅ Update truck
export const updateTruck = async (req: Request, res: Response) => {
  try {
    const { plateNo, capacityKg, driverId, active } = req.body;

    const truck = await Truck.findById(req.params.id);
    if (!truck) return res.status(404).json({ message: "Truck not found" });

    // Check if new plateNo conflicts
    if (plateNo && plateNo !== truck.plateNo) {
      const duplicate = await Truck.findOne({ plateNo });
      if (duplicate) {
        return res.status(400).json({ message: "Plate number already in use" });
      }
    }

    // Optional driver validation
    if (driverId) {
      const driver = await User.findById(driverId);
      if (!driver) return res.status(400).json({ message: "Invalid driver ID" });
    }

    truck.plateNo = plateNo || truck.plateNo;
    truck.capacityKg = capacityKg ?? truck.capacityKg;
    truck.driverId = driverId ?? truck.driverId;
    if (active !== undefined) truck.active = active;

    await truck.save();

    res.json({ message: "Truck updated successfully", truck });
  } catch (error: any) {
    console.error("Update truck error:", error);
    res.status(500).json({ message: error.message || "Failed to update truck" });
  }
};

// ✅ Soft delete truck (set active = false)
export const softDeleteTruck = async (req: Request, res: Response) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) return res.status(404).json({ message: "Truck not found" });

    if (!truck.active) {
      return res.status(400).json({ message: "Truck already deactivated" });
    }

    truck.active = false;
    await truck.save();

    res.json({ message: "Truck deactivated successfully", truck });
  } catch (error: any) {
    console.error("Soft delete truck error:", error);
    res.status(500).json({ message: error.message || "Failed to deactivate truck" });
  }
};
