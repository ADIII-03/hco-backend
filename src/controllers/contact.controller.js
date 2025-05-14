import nodemailer from 'nodemailer';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

class ContactController {
    constructor() {
        this.initializeEmailTransporter();
        
        // Define validation constants
        this.VALIDATION_RULES = {
            name: {
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-Z\s\-'.]+$/
            },
            email: {
                maxLength: 255,
                pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
            },
            message: {
                minLength: 10,
                maxLength: 5000
            }
        };
    }

    initializeEmailTransporter() {
        const isProduction = process.env.NODE_ENV === 'production';
        
        const emailConfig = {
            service: 'gmail',
            auth: {
                user: process.env.ADMIN_EMAIL,
                pass: process.env.ADMIN_PASS
            },
            tls: {
                rejectUnauthorized: isProduction
            }
        };

        if (isProduction) {
            emailConfig.secure = true;
            emailConfig.pool = true;
            emailConfig.maxConnections = 5;
            emailConfig.maxMessages = 100;
            emailConfig.rateDelta = 1000; // Minimum time between emails
            emailConfig.rateLimit = 5; // Max emails per rateDelta
        }

        this.transporter = nodemailer.createTransport(emailConfig);

        this.verifyEmailConfig().catch(error => {
            console.error('Email configuration failed:', error);
            if (isProduction) {
                console.error('CRITICAL: Email service failed to initialize in production');
            }
        });
    }

    validateInput(data) {
        const { name, email, message } = data;
        const errors = [];

        // Validate name
        if (!name || typeof name !== 'string') {
            errors.push('Name is required');
        } else {
            if (name.length < this.VALIDATION_RULES.name.minLength) {
                errors.push(`Name must be at least ${this.VALIDATION_RULES.name.minLength} characters`);
            }
            if (name.length > this.VALIDATION_RULES.name.maxLength) {
                errors.push(`Name must be less than ${this.VALIDATION_RULES.name.maxLength} characters`);
            }
            if (!this.VALIDATION_RULES.name.pattern.test(name)) {
                errors.push('Name contains invalid characters');
            }
        }

        // Validate email
        if (!email || typeof email !== 'string') {
            errors.push('Email is required');
        } else {
            if (email.length > this.VALIDATION_RULES.email.maxLength) {
                errors.push(`Email must be less than ${this.VALIDATION_RULES.email.maxLength} characters`);
            }
            if (!this.VALIDATION_RULES.email.pattern.test(email)) {
                errors.push('Invalid email format');
            }
        }

        // Validate message
        if (!message || typeof message !== 'string') {
            errors.push('Message is required');
        } else {
            if (message.length < this.VALIDATION_RULES.message.minLength) {
                errors.push(`Message must be at least ${this.VALIDATION_RULES.message.minLength} characters`);
            }
            if (message.length > this.VALIDATION_RULES.message.maxLength) {
                errors.push(`Message must be less than ${this.VALIDATION_RULES.message.maxLength} characters`);
            }
        }

        return errors;
    }

    sanitizeInput(data) {
        return {
            name: data.name?.trim().replace(/\s+/g, ' '),
            email: data.email?.trim().toLowerCase(),
            message: data.message?.trim()
        };
    }

    async verifyEmailConfig() {
        try {
            await this.transporter.verify();
            if (process.env.NODE_ENV === 'development') {
                console.log('Email configuration verified successfully');
            }
        } catch (error) {
            console.error('Email configuration error:', error);
            throw new ApiError(500, 'Email service not properly configured');
        }
    }

    generateAdminEmailTemplate(name, email, message) {
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
                <p style="color: #6b7280; font-size: 0.875rem;">
                    Sent from: ${process.env.CORS_ORIGIN || 'Unknown Origin'}
                </p>
            </div>
        `;
    }

    generateUserConfirmationTemplate(name) {
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
    }

    async sendContactForm(req, res) {
        try {
            console.log('Processing contact form submission:', {
                body: req.body,
                origin: req.get('origin')
            });

            // Sanitize input
            const sanitizedData = this.sanitizeInput(req.body);
            
            // Validate input
            const validationErrors = this.validateInput(sanitizedData);
            if (validationErrors.length > 0) {
                console.log('Validation errors:', validationErrors);
                throw new ApiError(400, validationErrors.join(', '));
            }

            const { name, email, message } = sanitizedData;

            try {
                await this.verifyEmailConfig();

                const adminMailOptions = {
                    from: {
                        name: 'HCO Contact Form',
                        address: process.env.ADMIN_EMAIL
                    },
                    to: process.env.ADMIN_EMAIL,
                    subject: `New Contact Form Message from ${name}`,
                    html: this.generateAdminEmailTemplate(name, email, message),
                    headers: {
                        'X-Environment': process.env.NODE_ENV,
                        'X-Origin': process.env.CORS_ORIGIN
                    }
                };

                console.log('Sending admin email...');
                const adminInfo = await this.transporter.sendMail(adminMailOptions);
                console.log('Admin email sent:', adminInfo.messageId);

                const userMailOptions = {
                    from: {
                        name: 'Humanity Club Organization',
                        address: process.env.ADMIN_EMAIL
                    },
                    to: email,
                    subject: 'Thank you for contacting HCO',
                    html: this.generateUserConfirmationTemplate(name),
                    headers: {
                        'X-Environment': process.env.NODE_ENV,
                        'X-Origin': process.env.CORS_ORIGIN
                    }
                };

                console.log('Sending user confirmation email...');
                const userInfo = await this.transporter.sendMail(userMailOptions);
                console.log('User confirmation email sent:', userInfo.messageId);

                return res.status(200).json(
                    new ApiResponse(
                        200,
                        { name, email },
                        'Message sent successfully! We will get back to you soon.'
                    )
                );
            } catch (emailError) {
                console.error('Email sending error:', {
                    error: emailError,
                    message: emailError.message,
                    code: emailError.code
                });

                if (emailError.code === 'EAUTH') {
                    throw new ApiError(500, 'Failed to authenticate with email server');
                }

                throw new ApiError(
                    500,
                    process.env.NODE_ENV === 'production'
                        ? 'Failed to send message. Please try again later.'
                        : `Failed to send email: ${emailError.message}`
                );
            }
        } catch (error) {
            console.error('Contact form error:', {
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                origin: process.env.CORS_ORIGIN
            });

            throw new ApiError(
                error.statusCode || 500,
                error.message || 'Failed to process contact form'
            );
        }
    }
}

export default new ContactController(); 