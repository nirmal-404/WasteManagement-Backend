import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import User from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: any;
}

interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

export const auth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token || 
      (req.headers.authorization?.startsWith("Bearer ") ? 
        req.headers.authorization.split(" ")[1] : null);
    
    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireRole = (...roles: string[]) => 
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };

export const requireAdmin = requireRole('ADMIN');
export const requireCollector = requireRole('COLLECTOR', 'DRIVER');
export const requireResident = requireRole('RESIDENT', 'BUSINESS');
