import { Router } from "express";
import { auth, requireAdmin } from "../middleware/authMiddleware.js";
import { 
  getAllUsers,
  getUserById,
  changeRole,
  disableUser,
  activateUser,
  removeUser,
  getUserStats,
  changeRoleValidation
} from "../controllers/userController.js";
import Notification from "../models/Notification.js";

const router = Router();

// All user routes require admin access
router.use(auth, requireAdmin);

// User management routes
router.get("/", auth, requireAdmin, getAllUsers);
router.get("/stats", auth, requireAdmin, getUserStats);
router.get("/:userId", auth, requireAdmin, getUserById);
router.patch("/change-role/:userId", auth, requireAdmin, changeRoleValidation, changeRole);
router.patch("/disable/:userId", auth, requireAdmin, disableUser);
router.patch("/activate/:userId", auth, requireAdmin, activateUser);
router.delete("/:userId", auth, requireAdmin, removeUser);

export default router;

// Resident notification routes (mounted elsewhere normally; quick add here for simplicity)
export const residentNotificationsRouter = Router();

residentNotificationsRouter.get("/", auth, async (req: any, res) => {
  try {
    const items = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ notifications: items });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to fetch notifications" });
  }
});

residentNotificationsRouter.delete("/:id", auth, async (req: any, res) => {
  try {
    const item = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!item) return res.status(404).json({ message: "Notification not found" });
    res.json({ message: "Notification deleted" });
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Failed to delete notification" });
  }
});