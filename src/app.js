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
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || [];
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (corsOrigins.indexOf(origin) !== -1 || !isProduction) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With'
    ],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 600 // Cache preflight requests for 10 minutes
}));

app.use(cookieParser());

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to HCO Backend API',
        status: 'active',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
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
        corsOrigins: isProduction ? undefined : corsOrigins
    });
});

// Serve static files from uploads directory
app.use("/api/v1/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/v1/admin", adminRouter);         // Admin routes
app.use("/api/v1/gallery", galleryRouter);     // Gallery routes
app.use("/api/v1/projects", projectRouter);    // Project routes
app.use("/api/v1/donation-details", donationRouter); // Donation routes
app.use("/api/v1/contact", contactRouter);     // Contact routes

// Add a specific test route for contact
app.get("/api/v1/contact-test", (req, res) => {
    res.json({
        status: "ok",
        message: "Contact route is accessible",
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: isProduction ? undefined : err.stack,
        path: req.path,
        method: req.method,
        origin: req.get('origin')
    });
    
    res.status(err.statusCode || 500).json({
        success: false,
        message: isProduction ? 'Internal server error' : err.message,
        error: isProduction ? undefined : err
    });
});

// Handle 404 errors for unmatched routes
app.use((req, res) => {
    console.log('404 Not Found:', {
        path: req.path,
        method: req.method,
        origin: req.get('origin')
    });
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
        method: req.method
    });
});



