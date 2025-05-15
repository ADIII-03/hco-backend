import nodemailer from 'nodemailer';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from "../utils/asyncHandler.js";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ADMIN_EMAIL ? decodeURIComponent(process.env.ADMIN_EMAIL) : '',
        pass: process.env.ADMIN_PASS
    },
    tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
});

// Verify transporter
const verifyTransporter = async () => {
    try {
        await transporter.verify();
        console.log('Email configuration verified successfully');
    } catch (error) {
        console.error('Email configuration error:', error);
        throw new ApiError(500, 'Email service not properly configured');
    }
};

const generateAdminEmailTemplate = (name, email, message) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Contact Form Submission</h2>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #6b7280; font-size: 0.875rem; margin-top: 20px;">
                This message was sent from the HCO website contact form.
            </p>
        </div>
    `;
};

const generateUserConfirmationTemplate = (name) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Thank You for Contacting HCO</h2>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
                <p>Dear ${name},</p>
                <p>Thank you for reaching out to Humanity Club Organization. We have received your message and will get back to you as soon as possible.</p>
                <p>Best regards,<br>HCO Team</p>
            </div>
        </div>
    `;
};

const sendContactEmail = asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        throw new ApiError(400, "All fields are required");
    }

    try {
        // Verify email configuration
        await verifyTransporter();

        const adminEmail = decodeURIComponent(process.env.ADMIN_EMAIL);

        // Email to admin
        const adminMailOptions = {
            from: {
                name: 'HCO Contact Form',
                address: adminEmail
            },
            to: adminEmail,
            subject: `New Contact Form Submission from ${name}`,
            html: generateAdminEmailTemplate(name, email, message)
        };

        // Auto-reply to user
        const userMailOptions = {
            from: {
                name: 'Humanity Club Organization',
                address: adminEmail
            },
            to: email,
            subject: "Thank you for contacting Humanity Club Organization",
            html: generateUserConfirmationTemplate(name)
        };

        console.log('Sending admin email...');
        await transporter.sendMail(adminMailOptions);
        console.log('Admin email sent successfully');

        console.log('Sending user confirmation email...');
        await transporter.sendMail(userMailOptions);
        console.log('User confirmation email sent successfully');

        return res.status(200).json(
            new ApiResponse(
                200,
                { name, email },
                "Your message has been sent successfully. We will get back to you soon!"
            )
        );
    } catch (error) {
        console.error("Email sending error:", {
            error: error,
            message: error.message,
            code: error.code
        });
        throw new ApiError(500, "Failed to send message. Please try again later.");
    }
});

export { sendContactEmail };