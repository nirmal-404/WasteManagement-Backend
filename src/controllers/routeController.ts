import { Request, Response } from "express";
import Route from "../models/Route";
import Bin from "../models/Bin";
import mongoose from "mongoose";


// Calculate approximate distance between two coordinates
const distance = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const dx = a.latitude - b.latitude;
  const dy = a.longitude - b.longitude;
  return Math.sqrt(dx * dx + dy * dy);
};

// Simple nearest neighbor optimization
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

// Extract latitude/longitude from Google Maps URL
function extractCoordinatesFromUrl(
  url: string
): { latitude: number; longitude: number } | null {
  const regex =
    /@(-?\d+\.\d+),(-?\d+\.\d+)|q=(-?\d+\.\d+),(-?\d+\.\d+)|place\/(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = url.match(regex);

  if (!match) return null;

  const latStr = match[1] ?? match[3] ?? match[5];
  const lngStr = match[2] ?? match[4] ?? match[6];

  if (typeof latStr === "undefined" || typeof lngStr === "undefined") return null;

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) return null;

  return { latitude: lat, longitude: lng };
}

// Generate Google Maps route URL (multi-stop friendly)
function generateDirectionsUrl(
  startLocation: { latitude: number; longitude: number } | undefined,
  optimizedPath: { latitude: number; longitude: number }[] | undefined
): string {
  if (!startLocation || !optimizedPath || optimizedPath.length === 0) return "";

  const waypoints = [startLocation, ...optimizedPath];
  const coordinates = waypoints.map((p) => `${p.latitude},${p.longitude}`).join("/");
  return `https://www.google.com/maps/dir/${coordinates}`;
}


export class RouteController {
  // ✅ Create route using mapUrl
  static async createRoute(req: Request, res: Response): Promise<void> {
    try {
      const { routeName, mapUrl } = req.body as {
        routeName?: string;
        mapUrl: string;
      };

      if (!mapUrl) {
        res.status(400).json({ message: "mapUrl is required" });
        return;
      }

      const startLocation = extractCoordinatesFromUrl(mapUrl);
      if (!startLocation) {
        res.status(400).json({ message: "Invalid Google Maps URL" });
        return;
      }

      const bins = await Bin.find({ fillLevel: { $gte: 90 }, status: "Ready" });
      if (!bins.length) {
        res.status(400).json({ message: "No bins ready for collection" });
        return;
      }

      const binCoords = bins.map((bin) => bin.location);
      const optimizedPath = getOptimizedPath(startLocation, binCoords);

      const route = await Route.create({
        routeName,
        assignedBins: bins.map((bin) => bin._id),
        optimizedPath,
        status: "Pending",
        startLocation, 
      });

      const directionsUrl = generateDirectionsUrl(startLocation, optimizedPath);

      res.status(201).json({ ...route.toObject(), directionsUrl });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }

  // ✅ Get all routes
  static async getAllRoutes(req: Request, res: Response): Promise<void> {
    try {
      const routes = await Route.find().populate("assignedBins");
      const routesWithDirections = routes.map((route) => {
        const start = (route as any).startLocation || route.optimizedPath?.[0];
        const directionsUrl =
          start && route.optimizedPath
            ? generateDirectionsUrl(start, route.optimizedPath)
            : "";
        return { ...route.toObject(), directionsUrl };
      });

      res.json(routesWithDirections);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }

  // ✅ Get route by ID
  static async getRouteById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const route = await Route.findById(id).populate("assignedBins");

      if (!route) {
        res.status(404).json({ message: "Route not found" });
        return;
      }

      const start = (route as any).startLocation || route.optimizedPath?.[0];
      const directionsUrl =
        start && route.optimizedPath
          ? generateDirectionsUrl(start, route.optimizedPath)
          : "";

      res.json({ ...route.toObject(), directionsUrl });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }

  // ✅ Update route (can also accept new mapUrl)
  static async updateRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { routeName, assignedBins, status, mapUrl } = req.body as {
        routeName?: string;
        assignedBins?: string[];
        status?: "Pending" | "InProgress" | "Completed";
        mapUrl?: string;
      };

      const route = await Route.findById(id);
      if (!route) {
        res.status(404).json({ message: "Route not found" });
        return;
      }

      if (routeName) route.routeName = routeName;
      if (status) route.status = status;
      if (assignedBins)
        route.assignedBins = assignedBins.map(
          (id) => new mongoose.Types.ObjectId(id)
        );

      let startLocation = (route as any).startLocation;

      if (mapUrl) {
        const extracted = extractCoordinatesFromUrl(mapUrl);
        if (!extracted) {
          res.status(400).json({ message: "Invalid mapUrl" });
          return;
        }
        startLocation = extracted;
        (route as any).startLocation = startLocation;
      }

      if ((mapUrl || assignedBins) && route.assignedBins.length > 0) {
        const binsData = await Bin.find({ _id: { $in: route.assignedBins } });
        const binCoords = binsData.map((bin) => bin.location);
        route.optimizedPath = getOptimizedPath(startLocation, binCoords);
      }

      await route.save();

      const directionsUrl = generateDirectionsUrl(
        startLocation,
        route.optimizedPath
      );

      res.json({ ...route.toObject(), directionsUrl });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }

  // ✅ Delete route
  static async deleteRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await Route.findByIdAndDelete(id);

      if (!deleted) {
        res.status(404).json({ message: "Route not found" });
        return;
      }

      res.json({ message: "Route deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }
}
