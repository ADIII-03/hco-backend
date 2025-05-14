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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS Configuration
const corsOrigin = process.env.NODE_ENV === 'production'
    ? ['https://hc-opage.vercel.app', 'https://hco-backend.onrender.com']
    : [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://localhost:8000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || corsOrigin.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to HCO Backend API',
        status: 'active',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/v1/health',
            projects: '/api/v1/projects',
            gallery: '/api/v1/gallery',
            donations: '/api/v1/donation-details',
            admin: '/api/v1/admin',
            contact: '/api/v1/contact'
        }
    });
});

// Health check route
app.get("/api/v1/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        emailService: global.emailServiceStatus || 'not initialized'
    });
});

// Serve static files from uploads directory
app.use("/api/v1/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/v1/admin", adminRouter);         // Admin routes (login, logout, etc)
app.use("/api/v1/gallery", galleryRouter);     // Gallery routes
app.use("/api/v1/projects", projectRouter);    // Project routes
app.use("/api/v1/donation-details", donationRouter); // Donation routes
app.use("/api/v1/contact", contactRouter);     // Contact routes

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`CORS enabled for: ${corsOrigin.join(', ')}`);
});
