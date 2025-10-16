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