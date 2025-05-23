import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import adminRouter from "./routes/admin.route.js";
import galleryRouter from "./routes/gallery.route.js";
import projectRouter from "./routes/project.routes.js";
import donationRouter from "./routes/donation.routes.js";
import contactRouter from "./routes/contact.routes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Debug middleware to log all incoming requests
app.use((req, res, next) => {
    console.log('Incoming Request:', {
        path: req.path,
        fullUrl: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    next();
});

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
    maxAge: 600
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

// Mount routes with explicit prefixes
const API_PREFIX = '/api/v1';

// API Routes with logging
app.use(`${API_PREFIX}/admin`, adminRouter);
app.use(`${API_PREFIX}/gallery`, galleryRouter);
app.use(`${API_PREFIX}/projects`, projectRouter);
app.use(`${API_PREFIX}/donation-details`, donationRouter);

// Mount contact routes with logging
app.use(`${API_PREFIX}/contact`, contactRouter);
console.log('Contact routes mounted at:', `${API_PREFIX}/contact`);

// Test route for contact endpoint
app.get(`${API_PREFIX}/contact-test`, (req, res) => {
    res.json({
        status: "ok",
        message: "Contact route is accessible",
        timestamp: new Date().toISOString(),
        availableEndpoints: {
            send: `${API_PREFIX}/contact/send`,
            test: `${API_PREFIX}/contact/test`,
            health: `${API_PREFIX}/contact/health`
        }
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to HCO Backend API',
        status: 'active',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        endpoints: {
            contact: {
                send: `${API_PREFIX}/contact/send`,
                test: `${API_PREFIX}/contact/test`,
                health: `${API_PREFIX}/contact/health`
            },
            health: `${API_PREFIX}/health`,
            projects: `${API_PREFIX}/projects`,
            gallery: `${API_PREFIX}/gallery`,
            donations: `${API_PREFIX}/donation-details`,
            admin: `${API_PREFIX}/admin`
        }
    });
});

// Health check route
app.get(`${API_PREFIX}/health`, (req, res) => {
    res.json({
        status: "ok",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        corsOrigins: isProduction ? undefined : corsOrigins
    });
});

// Serve static files from uploads directory
app.use(`${API_PREFIX}/uploads`, express.static(path.join(__dirname, "uploads")));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: isProduction ? undefined : err.stack,
        path: req.path,
        fullUrl: req.originalUrl,
        method: req.method,
        origin: req.get('origin'),
        timestamp: new Date().toISOString()
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
        fullUrl: req.originalUrl,
        method: req.method,
        origin: req.get('origin'),
        timestamp: new Date().toISOString()
    });
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requestedPath: req.originalUrl,
        method: req.method,
        availableEndpoints: {
            contact: {
                send: `${API_PREFIX}/contact/send`,
                test: `${API_PREFIX}/contact/test`,
                health: `${API_PREFIX}/contact/health`
            }
        }
    });
});



