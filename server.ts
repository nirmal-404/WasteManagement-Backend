import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";
import binRoutes from "./src/routes/binRoute";
import authRoutes from "./src/routes/authRoutes.js";
import requestRoutes from "./src/routes/requestRoutes.js";
import routeRoutes from "./src/routes/routeRoutes.js";
import collectorRoutes from "./src/routes/collectorRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";

dotenv.config();

const app = express();
connectDB();

// Middleware
app.use(cors({ 
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", 
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.get("/", (req: Request, res: Response) => 
  res.json({ ok: true, service: "Smart Waste Management API" })
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/collector", collectorRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/bins", binRoutes);

// 404 handler
app.use((req: Request, res: Response) => 
  res.status(404).json({ message: "Route not found" })
);

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ 
    message: err.message || "Server error" 
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => 
  console.log(`🚀 Smart Waste Management API running on port ${PORT}`)
);
