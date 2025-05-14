import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ADMIN_EMAIL?.replace('%40', '@'),
        pass: process.env.ADMIN_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify email configuration on startup
transporter.verify((error) => {
    if (error) {
        console.error(`Email configuration error: ${error.message}`);
    } else {
        console.log('Email server is ready to send messages');
    }
});

router.post('/send', asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            message: 'Please provide name, email and message'
        });
    }

    // Email options with better HTML template
    const mailOptions = {
        from: {
            name: 'HCO Contact Form',
            address: process.env.ADMIN_EMAIL?.replace('%40', '@')
        },
        to: process.env.ADMIN_EMAIL?.replace('%40', '@'),
        subject: `New Contact Form Submission from ${name}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center; margin-bottom: 20px;">New Contact Form Submission</h2>
                <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
                    <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 10px 0;"><strong>Message:</strong></p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin-top: 10px;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px; text-align: center;">
                    This message was sent from the HCO website contact form at ${new Date().toLocaleString()}
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({
            success: true,
            message: 'Your message has been sent successfully! We will get back to you soon.'
        });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'development' 
                ? `Failed to send email: ${error.message}`
                : 'Failed to send email. Please try again later.'
        });
    }
}));

export default router; 