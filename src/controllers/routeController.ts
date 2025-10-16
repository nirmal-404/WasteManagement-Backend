import { Request, Response } from "express";
import Route from "../models/Route";
import Bin from "../models/Bin";
import mongoose from "mongoose";

// Helper function: Euclidean distance (approx)
const distance = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const dx = a.latitude - b.latitude;
  const dy = a.longitude - b.longitude;
  return Math.sqrt(dx * dx + dy * dy);
};

// Simple nearest neighbor algorithm
const getOptimizedPath = (
  start: { latitude: number; longitude: number },
  bins: { latitude: number; longitude: number }[]
) => {
  const path: { latitude: number; longitude: number }[] = [];
  let current = start;
  const remaining = [...bins];

  while (remaining.length > 0) {
    remaining.sort((a, b) => distance(current, a) - distance(current, b));
    const next = remaining.shift()!;
    path.push(next);
    current = next;
  }

  return path;
};

// Generate Google Maps directions URL
function generateDirectionsUrl(
  startLocation: { latitude: number; longitude: number } | undefined,
  path: { latitude: number; longitude: number }[] | undefined
): string {
  if (!startLocation || !path || path.length === 0) return "";

  const origin = `${startLocation.latitude},${startLocation.longitude}`;
  const lastPoint = path[path.length - 1];
  if (!lastPoint) return ""; // TypeScript-safe check

  const destination = `${lastPoint.latitude},${lastPoint.longitude}`;
  const waypoints =
    path.length > 1
      ? path.slice(0, -1).map(p => `${p.latitude},${p.longitude}`).join("|")
      : "";

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) url += `&waypoints=${waypoints}`;

  return url;
}


// Create a new route
export class RouteController {
  static async createRoute(req: Request, res: Response): Promise<void> {
    try {
      const { routeName, startLocation } = req.body as {
        routeName?: string;
        startLocation: { latitude: number; longitude: number };
      };

      if (!startLocation) {
        res.status(400).json({ message: "startLocation is required" });
        return;
      }

      const bins = await Bin.find({ fillLevel: { $gte: 90 }, status: "Ready" });
      if (!bins.length) {
        res.status(400).json({ message: "No bins ready for collection" });
        return;
      }

      const binCoords = bins.map(bin => bin.location);
      const optimizedPath = getOptimizedPath(startLocation, binCoords);

      const route = await Route.create({
        routeName,
        assignedBins: bins.map(bin => bin._id),
        optimizedPath,
        status: "Pending",
      });

      // TypeScript-safe: check start and waypoints
      const start = startLocation;
      const waypoints = optimizedPath ?? [];
      const directionsUrl = generateDirectionsUrl(start, waypoints);

      res.status(201).json({ ...route.toObject(), directionsUrl });
      return;
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
      return;
    }
  }

  // Get all routes
  static async getAllRoutes(req: Request, res: Response): Promise<void> {
    try {
      const routes = await Route.find().populate("assignedBins");
      const routesWithDirections = routes.map(route => {
        const start = route.optimizedPath?.[0];
        const waypoints = route.optimizedPath?.slice(1) ?? [];
        const directionsUrl = start ? generateDirectionsUrl(start, waypoints) : "";

        return { ...route.toObject(), directionsUrl };
      });

      res.json(routesWithDirections);
      return;
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
      return;
    }
  }

  // Get route by ID
  static async getRouteById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const route = await Route.findById(id).populate("assignedBins");

      if (!route) {
        res.status(404).json({ message: "Route not found" });
        return;
      }

      const start = route.optimizedPath?.[0];
      const waypoints = route.optimizedPath?.slice(1) ?? [];
      const directionsUrl = start ? generateDirectionsUrl(start, waypoints) : "";

      res.json({ ...route.toObject(), directionsUrl });
      return;
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
      return;
    }
  }

  // Update route
  static async updateRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { routeName, assignedBins, status, startLocation } = req.body as {
        routeName?: string;
        assignedBins?: string[];
        status?: "Pending" | "InProgress" | "Completed";
        startLocation?: { latitude: number; longitude: number };
      };

      const route = await Route.findById(id);
      if (!route) {
        res.status(404).json({ message: "Route not found" });
        return;
      }

      if (routeName) route.routeName = routeName;
      if (status) route.status = status;
      if (assignedBins) route.assignedBins = assignedBins.map(id => new mongoose.Types.ObjectId(id));

      if ((startLocation || assignedBins) && route.assignedBins.length > 0) {
        const binsData = await Bin.find({ _id: { $in: route.assignedBins } });
        const binCoords = binsData.map(bin => bin.location);

        const start = startLocation ?? binCoords[0];
        if (!start) {
          res.status(400).json({ message: "No starting location or bins available" });
          return;
        }

        route.optimizedPath = getOptimizedPath(start, binCoords);
      }

      await route.save();

      const start = route.optimizedPath?.[0];
      const waypoints = route.optimizedPath?.slice(1) ?? [];
      const directionsUrl = start ? generateDirectionsUrl(start, waypoints) : "";

      res.json({ ...route.toObject(), directionsUrl });
      return;
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
      return;
    }
  }

  // Delete route
  static async deleteRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await Route.findByIdAndDelete(id);

      if (!deleted) {
        res.status(404).json({ message: "Route not found" });
        return;
      }

      res.json({ message: "Route deleted successfully" });
      return;
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
      return;
    }
  }
}