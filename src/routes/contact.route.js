import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import nodemailer from 'nodemailer';

const router = Router();

router.post('/send', asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        throw new Error('Please provide all required fields');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Email options
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
        subject: `New Contact Form Message from ${name}`,
        html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
        `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
        success: true,
        message: 'Message sent successfully!'
    });
}));

export default router; 