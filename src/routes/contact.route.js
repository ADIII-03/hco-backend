import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import contactController from '../controllers/contact.controller.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Debug middleware to log all requests to contact routes
router.use((req, res, next) => {
    console.log('Contact Route Accessed:', {
        path: req.path,
        fullPath: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    next();
});

// Rate limiting configuration
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: process.env.NODE_ENV === 'production' ? 600 : 50, // 600 requests per hour in production, 50 in development
    message: {
        status: 'error',
        message: 'Too many contact requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false, // Count failed requests against the rate limit
    keyGenerator: (req) => {
        // Use IP and email as the key to prevent spam from same email
        return `${req.ip}-${req.body.email}`;
    }
});

// Contact routes
router.post('/send', contactLimiter, asyncHandler(async (req, res) => {
    console.log('Contact form submission received:', {
        path: req.path,
        method: req.method,
        body: req.body
    });
    
    await contactController.sendContactForm(req, res);
}));

// Test route to verify contact endpoint is working
router.get('/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'Contact route is working',
        timestamp: new Date().toISOString()
    });
});

// Health check route for contact module
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Contact module is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            send: '/send - POST',
            test: '/test - GET',
            health: '/health - GET'
        }
    });
});

export default router;