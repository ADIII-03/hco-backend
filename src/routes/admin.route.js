import { Router } from "express";
import { adminLogin, adminLogout, adminRegister } from "../controllers/admin.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

const router = Router();

// Login route (no auth required)
router.post("/login", adminLogin);

// Logout route (requires valid access token)
router.post("/logout", isAuthenticated, adminLogout);

// Register route (no auth required)
router.post("/register", adminRegister);

export default router;
