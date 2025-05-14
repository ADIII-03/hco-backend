import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import adminRouter from "./routes/admin.route.js";
import galleryRouter from "./routes/gallery.route.js";
import projectRouter from "./routes/project.routes.js";
import donationRouter from "./routes/donation.routes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS Configuration
const corsOrigins = process.env.NODE_ENV === 'production'
    ? ['https://hc-opage.vercel.app', 'https://hco-backend.onrender.com']
    : ['http://localhost:5173', 'http://localhost:8000'];

const corsOptions = {
    origin: function(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check route
app.get("/api/v1/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Server is running",
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Serve static files
app.use("/api/v1/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/gallery", galleryRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/donations", donationRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });

    res.status(err.statusCode || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`CORS enabled for: ${corsOrigins.join(', ')}`);
});
