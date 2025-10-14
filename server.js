import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import requestRoutes from "./src/routes/requestRoutes.js";
import routeRoutes from "./src/routes/routeRoutes.js";
import collectorRoutes from "./src/routes/collectorRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";

dotenv.config();
const app = express();
connectDB();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => res.json({ ok: true, service: "Smart Waste API" }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/collector", collectorRoutes);
app.use("/api/payments", paymentRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on :${PORT}`));
