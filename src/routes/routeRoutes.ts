import { Router } from "express";
import { RouteController } from "../controllers/routeController";

const router = Router();

router.post("/", RouteController.createRoute);
router.get("/", RouteController.getAllRoutes);
router.get("/:id", RouteController.getRouteById);
router.put("/:id", RouteController.updateRoute);
router.delete("/:id", RouteController.deleteRoute);

export default router;
