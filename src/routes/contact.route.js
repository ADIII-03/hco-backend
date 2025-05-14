import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import contactController from '../controllers/contact.controller.js';
import rateLimit from 'express-rate-limit';

const router = Router();

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

// Apply rate limiting to the contact route
router.post('/send', contactLimiter, asyncHandler(contactController.sendContactForm.bind(contactController)));

export default router;