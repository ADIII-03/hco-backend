import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import adminRouter from "./routes/admin.route.js";
import galleryRouter from "./routes/gallery.route.js";
import projectRouter from "./routes/project.routes.js";
import donationRouter from "./routes/donation.routes.js";
import contactRouter from "./routes/contact.route.js";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize express app
export const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://hc-opage.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Handle OPTIONS preflight for all routes
app.options('*', cors(corsOptions));

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Root Route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to HCO Backend API",
    status: "active",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    endpoints: {
      health: "/api/v1/health",
      projects: "/api/v1/projects",
      gallery: "/api/v1/gallery",
      donations: "/api/v1/donation-details",
      admin: "/api/v1/admin",
      contact: "/api/v1/contact"
    }
  });
});

// Health Check Route
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    cors: {
      origin: corsOptions.origin,
      methods: corsOptions.methods.join(', ')
    }
  });
});

// Serve static uploads
app.use("/api/v1/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/gallery", galleryRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/donation-details", donationRouter);
app.use("/api/v1/contact", contactRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`CORS enabled for: ${corsOptions.origin}`);
});
