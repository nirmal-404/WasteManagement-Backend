import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import Route from "../models/Route.js";
import Bin from "../models/Bin.js";
import RequestModel from "../models/Request.js";
import User from "../models/User.js";
import Truck from "../models/Truck.js";
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Simple route optimization algorithm
const optimizeRoute = (points: any[]) => {
  if (points.length <= 1) return points;
  
  // Simple nearest neighbor algorithm
  const optimized = [];
  const remaining = [...points];
  let current = remaining.shift();
  optimized.push(current);
  
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(current, remaining[0]);
    
    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(current, remaining[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    current = remaining.splice(nearestIndex, 1)[0];
    optimized.push(current);
  }
  
  return optimized;
};

// Mock distance calculation (in real app, use actual coordinates)
const calculateDistance = (point1: any, point2: any) => {
  // Mock distance calculation - in real app, use Haversine formula or Google Maps API
  return Math.random() * 5; // Random distance between 0-5 km
};

// Validation middleware
export const createRouteValidation = [
  body('name').notEmpty().withMessage('Route name is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('assignedDriverId').notEmpty().withMessage('Driver ID is required'),
  body('assignedTruckId').notEmpty().withMessage('Truck ID is required')
];

export const generateRoutes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { zone, date, maxRoutes = 5 } = req.body;
    const scheduledDate = date ? new Date(date) : new Date();
    
    // Get candidate bins for collection
    const candidateQuery: any = {};
    if (zone) {
      candidateQuery.zone = zone;
    }
    
    const bins = await Bin.find(candidateQuery);
    
    // Filter bins that need collection
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const candidates = bins.filter(bin => 
      bin.fillLevel >= 90 || 
      (bin.type === "Organic" && (!bin.lastCollectedAt || bin.lastCollectedAt < since)) ||
      bin.status === "Pending"
    );
    
    if (candidates.length === 0) {
      return res.json({
        message: "No bins require collection",
        count: 0,
        routes: []
      });
    }
    
    // Group by zone
    const groupedByZone = new Map();
    candidates.forEach(bin => {
      const zoneKey = bin.zone || "Unknown";
      if (!groupedByZone.has(zoneKey)) {
        groupedByZone.set(zoneKey, []);
      }
      groupedByZone.get(zoneKey).push(bin);
    });
    
    const routes = [];
    let routeCount = 0;
    
    for (const [zoneName, zoneBins] of groupedByZone.entries()) {
      if (routeCount >= maxRoutes) break;
      
      // Split large zones into multiple routes (max 15 bins per route)
      const chunks = [];
      for (let i = 0; i < zoneBins.length; i += 15) {
        chunks.push(zoneBins.slice(i, i + 15));
      }
      
      for (const chunk of chunks) {
        if (routeCount >= maxRoutes) break;
        
        // Create route points
        const points = chunk.map((bin, index) => ({
          binId: bin._id,
          location: bin.location,
          address: bin.address || bin.location,
          order: index + 1,
          collected: false,
          type: bin.type
        }));
        
        // Optimize route order
        const optimizedPoints = optimizeRoute(points);
        optimizedPoints.forEach((point, index) => {
          point.order = index + 1;
        });
        
        // Calculate estimated metrics
        const estimatedDuration = Math.max(30, optimizedPoints.length * 5); // 5 minutes per bin
        const estimatedDistance = Math.max(2, optimizedPoints.length * 0.5); // 0.5 km per bin
        
        const routeId = `ROUTE-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
        
        const route = await Route.create({
          routeId,
          name: `${zoneName} Collection Route ${routeCount + 1}`,
          description: `Auto-generated route for ${zoneName} zone`,
          points: optimizedPoints,
          status: "PLANNED",
          scheduledDate,
          estimatedDuration,
          estimatedDistance,
          totalWeight: 0 // Will be updated during collection
        });
        
        routes.push(route);
        routeCount++;
      }
    }
    
    res.status(201).json({
      message: `Generated ${routes.length} routes`,
      count: routes.length,
      routes
    });
  } catch (error: any) {
    console.error('Generate routes error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to generate routes" 
    });
  }
};

export const createRoute = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: errors.array() 
      });
    }

    const { 
      name, 
      description, 
      scheduledDate, 
      assignedDriverId, 
      assignedTruckId, 
      assignedCollectors = [],
      points = []
    } = req.body;
    
    // Verify driver exists and is available
    const driver = await User.findById(assignedDriverId);
    if (!driver || driver.role !== 'DRIVER') {
      return res.status(400).json({ message: "Invalid driver" });
    }
    
    // Verify truck exists and is available
    const truck = await Truck.findById(assignedTruckId);
    if (!truck || !truck.active) {
      return res.status(400).json({ message: "Invalid or inactive truck" });
    }
    
    // Verify collectors exist
    if (assignedCollectors.length > 0) {
      const collectors = await User.find({ 
        _id: { $in: assignedCollectors },
        role: { $in: ['COLLECTOR', 'DRIVER'] }
      });
      if (collectors.length !== assignedCollectors.length) {
        return res.status(400).json({ message: "Invalid collectors" });
      }
    }
    
    const routeId = `ROUTE-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
    
    const route = await Route.create({
      routeId,
      name,
      description,
      assignedDriverId,
      assignedTruckId,
      assignedCollectors,
      points: points.map((point: any, index: number) => ({
        ...point,
        order: index + 1,
        collected: false
      })),
      status: "PLANNED",
      scheduledDate: new Date(scheduledDate),
      estimatedDuration: Math.max(30, points.length * 5),
      estimatedDistance: Math.max(2, points.length * 0.5)
    });
    
    res.status(201).json({
      message: "Route created successfully",
      route: await Route.findById(route._id)
        .populate('assignedDriverId', 'name phone')
        .populate('assignedTruckId', 'plateNo capacityKg')
        .populate('assignedCollectors', 'name phone')
    });
  } catch (error: any) {
    console.error('Create route error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to create route" 
    });
  }
};

export const listRoutes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      status, 
      date, 
      driverId, 
      page = 1, 
      limit = 20 
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = {};
    if (status) query.status = status;
    if (driverId) query.assignedDriverId = driverId;
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.scheduledDate = { $gte: startDate, $lt: endDate };
    }
    
    const routes = await Route.find(query)
      .populate('assignedDriverId', 'name phone')
      .populate('assignedTruckId', 'plateNo capacityKg')
      .populate('assignedCollectors', 'name phone')
      .sort({ scheduledDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Route.countDocuments(query);
    
    res.json({
      routes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('List routes error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get routes" 
    });
  }
};

export const getRouteById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('assignedDriverId', 'name phone email')
      .populate('assignedTruckId', 'plateNo capacityKg')
      .populate('assignedCollectors', 'name phone');
    
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }
    
    res.json({ route });
  } catch (error: any) {
    console.error('Get route error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to get route" 
    });
  }
};

export const updateRouteStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }
    
    route.status = status;
    
    if (status === 'IN_PROGRESS') {
      route.startedAt = new Date();
    } else if (status === 'COMPLETED') {
      route.completedAt = new Date();
      route.actualDuration = route.startedAt ? 
        Math.round((route.completedAt.getTime() - route.startedAt.getTime()) / (1000 * 60)) : 
        route.estimatedDuration;
    }
    
    await route.save();
    
    res.json({
      message: `Route ${status.toLowerCase()} successfully`,
      route: await Route.findById(route._id)
        .populate('assignedDriverId', 'name phone')
        .populate('assignedTruckId', 'plateNo')
    });
  } catch (error: any) {
    console.error('Update route status error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to update route status" 
    });
  }
};

export const updateCollectionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pointIndex, collected, weightKg, notes } = req.body;
    
    if (typeof pointIndex !== 'number' || pointIndex < 0) {
      return res.status(400).json({ message: "Invalid point index" });
    }
    
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }
    
    if (pointIndex >= route.points.length) {
      return res.status(400).json({ message: "Invalid point index" });
    }
    
    const point = route.points[pointIndex];
    point.collected = collected;
    
    if (collected) {
      point.collectedAt = new Date();
      point.weightKg = weightKg || 0;
      point.notes = notes || '';
      
      // Update bin status
      if (point.binId) {
        await Bin.findByIdAndUpdate(point.binId, {
          status: "Collected",
          lastCollectedAt: new Date(),
          fillLevel: 0
        });
      }
      
      // Update route metrics
      route.totalWeight = (route.totalWeight || 0) + (weightKg || 0);
      const collectedCount = route.points.filter(p => p.collected).length;
      
      if (collectedCount === route.points.length) {
        route.status = 'COMPLETED';
        route.completedAt = new Date();
      } else if (route.status === 'PLANNED') {
        route.status = 'IN_PROGRESS';
        if (!route.startedAt) {
          route.startedAt = new Date();
        }
      }
    }
    
    await route.save();
    
    res.json({
      message: `Collection point ${collected ? 'marked as collected' : 'updated'}`,
      route: await Route.findById(route._id)
        .populate('assignedDriverId', 'name phone')
        .populate('assignedTruckId', 'plateNo')
    });
  } catch (error: any) {
    console.error('Update collection status error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to update collection status" 
    });
  }
};

export const assignRoute = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignedDriverId, assignedTruckId, assignedCollectors = [] } = req.body;
    
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }
    
    if (route.status !== 'PLANNED') {
      return res.status(400).json({ message: "Can only assign planned routes" });
    }
    
    // Verify driver
    const driver = await User.findById(assignedDriverId);
    if (!driver || driver.role !== 'DRIVER') {
      return res.status(400).json({ message: "Invalid driver" });
    }
    
    // Verify truck
    const truck = await Truck.findById(assignedTruckId);
    if (!truck || !truck.active) {
      return res.status(400).json({ message: "Invalid or inactive truck" });
    }
    
    // Verify collectors
    if (assignedCollectors.length > 0) {
      const collectors = await User.find({ 
        _id: { $in: assignedCollectors },
        role: { $in: ['COLLECTOR', 'DRIVER'] }
      });
      if (collectors.length !== assignedCollectors.length) {
        return res.status(400).json({ message: "Invalid collectors" });
      }
    }
    
    route.assignedDriverId = assignedDriverId;
    route.assignedTruckId = assignedTruckId;
    route.assignedCollectors = assignedCollectors;
    
    await route.save();
    
    res.json({
      message: "Route assigned successfully",
      route: await Route.findById(route._id)
        .populate('assignedDriverId', 'name phone')
        .populate('assignedTruckId', 'plateNo capacityKg')
        .populate('assignedCollectors', 'name phone')
    });
  } catch (error: any) {
    console.error('Assign route error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to assign route" 
    });
  }
};

export const deleteRoute = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }
    
    if (route.status === 'IN_PROGRESS') {
      return res.status(400).json({ message: "Cannot delete route in progress" });
    }
    
    await Route.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Route deleted successfully" });
  } catch (error: any) {
    console.error('Delete route error:', error);
    res.status(500).json({ 
      message: error.message || "Failed to delete route" 
    });
  }
};
