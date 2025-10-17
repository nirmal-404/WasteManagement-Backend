import { Request, Response } from "express";
import Bin from "../models/Bin";


const extractCoordinates = (url: string): { latitude: number; longitude: number } => {
  // Match coordinates after @ and before the next comma
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

  if (!match || match.length < 3) {
    throw new Error(
      "Invalid Google Maps URL format. Please use a standard Google Maps URL with coordinates."
    );
  }

  const latitude = parseFloat(match[1]!);
  const longitude = parseFloat(match[2]!);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Invalid coordinates in URL");
  }

  return { latitude, longitude };
};


export const createBin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { wasteType, locationUrl, locationName, userId } = req.body as {
      wasteType?: string;
      locationUrl?: string;
      locationName?: string;
      userId?: string;
    };

    if (!wasteType || !locationUrl || !userId || !locationName) {
      res.status(400).json({ message: "Missing required fields: wasteType, locationUrl, locationName, or userId" });
      return;
    }

    const location = extractCoordinates(locationUrl);

    const bin = new Bin({
      wasteType,
      location,
      locationName,
      status: "Pending",
      userId,
    });

    await bin.save();
    res.status(201).json(bin);
  } catch (error) {
    console.error("Error creating bin:", error);
    res.status(500).json({ message: (error as Error).message });
  }
};


export const getAllBins = async (req: Request, res: Response): Promise<void> => {
  try {
    const bins = await Bin.find().populate("userId", "name email");
    res.json(bins);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getBinsByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const bins = await Bin.find({ userId });
    res.json(bins);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Update bin
export const updateBin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { wasteType, locationUrl, locationName, status, fillLevel, weight } = req.body as {
      wasteType?: string;
      locationUrl?: string;
      locationName?: string;
      status?: string;
      fillLevel?: number;
      weight?: number;
    };

    const updateData: Record<string, any> = {};

    if (wasteType) updateData.wasteType = wasteType;
    if (locationUrl) updateData.location = extractCoordinates(locationUrl);
    if (locationName) updateData.locationName = locationName;
    if (status) updateData.status = status;
    if (fillLevel !== undefined) updateData.fillLevel = fillLevel;
    if (weight !== undefined) updateData.weight = weight;

    if (fillLevel !== undefined) {
      updateData.status = fillLevel >= 90 ? "Ready" : "Pending";
    }

    const updatedBin = await Bin.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedBin) {
      res.status(404).json({ message: "Bin not found" });
      return;
    }

    res.json(updatedBin);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteBin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedBin = await Bin.findByIdAndDelete(id);

    if (!deletedBin) {
      res.status(404).json({ message: "Bin not found" });
      return;
    }

    res.json({ message: "Bin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const collectBin = async (req: Request, res: Response): Promise<void> => {
  console.log("collect")
  try {
    const { id } = req.params;

    const updatedBin = await Bin.findByIdAndUpdate(id, {status : "Collected",  fillLevel : 0}, { new: true });

    if (!updatedBin) {
      res.status(404).json({ message: "Bin not found" });
      return;
    }

    res.json(updatedBin);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const cancelBin = async (req: Request, res: Response): Promise<void> => {
  console.log("cancel")
  try {
    const { id } = req.params;

    const updatedBin = await Bin.findByIdAndUpdate(id, {status : "Canceled"}, { new: true });

    if (!updatedBin) {
      res.status(404).json({ message: "Bin not found" });
      return;
    }

    res.json(updatedBin);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};