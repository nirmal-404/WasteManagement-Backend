import { Request, Response } from "express";
import Route from "../models/Route.js";
import Bin from "../models/Bin.js";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const todaysAssignments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    
    // Get routes assigned to the current user (collector/driver)
    const query: any = { 
      status: { $in: ["PLANNED", "IN_PROGRESS"] }, 
      scheduledDate: { $gte: start, $lt: end }
    };
    
    // Filter by assigned user if not admin
    if (req.user.role === 'COLLECTOR') {
      query.assignedCollectors = req.user._id;
    } else if (req.user.role === 'DRIVER') {
      query.assignedDriverId = req.user._id;
    }
    
    const routes = await Route.find(query)
      .populate('assignedDriverId', 'name phone')
      .populate('assignedTruckId', 'plateNo capacityKg')
      .populate('assignedCollectors', 'name phone')
      .sort({ scheduledDate: 1 });
    
    res.json({ routes });
  } catch (error: any) {
    console.error('Get today assignments error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get today's assignments" 
    });
  }
};

export const scan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { binId, manualReason, weightKg, notes } = req.body;
    
    const bin = await Bin.findById(binId);
    if (!bin) {
      return res.status(404).json({ message: "Bin not found" });
    }
    
    // Update bin status
    bin.status = "Collected";
    bin.fillLevel = 0;
    bin.lastCollectedAt = new Date();
    await bin.save();
    
    res.json({ 
      message: "Bin collected successfully", 
      manual: Boolean(manualReason),
      binId: bin._id,
      collectedAt: new Date()
    });
  } catch (error: any) {
    console.error('Scan bin error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to scan bin" 
    });
  }
};

export const syncBatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items = [] } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }
    
    const results = [];
    
    for (const item of items) {
      try {
        const bin = await Bin.findById(item.binId);
        if (!bin) {
          results.push({ 
            binId: item.binId, 
            success: false, 
            reason: "Bin not found" 
          });
          continue;
        }
        
        bin.status = "Collected";
        bin.fillLevel = 0;
        bin.lastCollectedAt = item.collectedAt ? new Date(item.collectedAt) : new Date();
        await bin.save();
        
        results.push({ 
          binId: bin._id, 
          success: true,
          collectedAt: bin.lastCollectedAt
        });
      } catch (itemError) {
        results.push({ 
          binId: item.binId, 
          success: false, 
          reason: "Processing error" 
        });
      }
    }
    
    res.json({ 
      message: `Processed ${results.length} items`,
      count: results.length, 
      results 
    });
  } catch (error: any) {
    console.error('Sync batch error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to sync batch" 
    });
  }
};

