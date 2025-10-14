import { Router } from "express";
import { 
  register, 
  login, 
  me, 
  logout, 
  changePassword,
  registerValidation,
  loginValidation
} from "../controllers/authController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);

// Protected routes
router.get("/me", auth, me);
router.post("/logout", auth, logout);
router.post("/change-password", auth, changePassword);

export default router;

