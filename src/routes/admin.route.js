import { Router } from "express";
import { adminLogin, adminLogout, adminRegister } from "../controllers/admin.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import cors from "cors";

const router = Router();

const corsOptions = {
  origin: 'https://hc-opage.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['set-cookie']
};

// Apply CORS specifically for admin routes
router.use(cors(corsOptions));

// Login route (no auth required)
router.post("/login", cors(corsOptions), adminLogin);

// Logout route (requires valid access token)
router.post("/logout", cors(corsOptions), isAuthenticated, adminLogout);

// Register route (no auth required)
router.post("/register", cors(corsOptions), adminRegister);

export default router;
