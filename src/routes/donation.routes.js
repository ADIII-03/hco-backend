import express from "express";
import { Router } from "express";
import { DonationDetails } from "../models/donation.model.js";
import { upload } from "../middlewares/multer.middleware.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

const router = Router();

// Get donation details
router.get("/donation-details", async (req, res) => {
    try {
        let donationDetails = await DonationDetails.findOne();
        
        if (!donationDetails) {
            // Create default donation details if none exist
            donationDetails = await DonationDetails.create({
                upiId: "hco@upi",
                qrCodeImage: "https://placehold.co/200x200",
                accountName: "Humanity Club Organization",
                accountNumber: "1234567890",
                ifscCode: "ABCD0123456",
                bankName: "Example Bank"
            });
        }
        
        res.json({ success: true, data: donationDetails });
    } catch (error) {
        console.error("Error fetching donation details:", error);
        res.status(500).json({ success: false, message: "Error fetching donation details" });
    }
});

// Update donation details (Admin only)
router.put("/donation-details", isAuthenticated, async (req, res) => {
    try {
        const { upiId, accountName, accountNumber, ifscCode, bankName } = req.body;
        
        let donationDetails = await DonationDetails.findOne();
        
        if (!donationDetails) {
            donationDetails = new DonationDetails({
                upiId,
                qrCodeImage: "https://placehold.co/200x200",
                accountName,
                accountNumber,
                ifscCode,
                bankName
            });
        } else {
            if (upiId) donationDetails.upiId = upiId;
            if (accountName) donationDetails.accountName = accountName;
            if (accountNumber) donationDetails.accountNumber = accountNumber;
            if (ifscCode) donationDetails.ifscCode = ifscCode;
            if (bankName) donationDetails.bankName = bankName;
        }
        
        await donationDetails.save();
        res.json({ success: true, data: donationDetails });
    } catch (error) {
        console.error("Error updating donation details:", error);
        res.status(500).json({ success: false, message: "Error updating donation details" });
    }
});

// Update QR code image (Admin only)
router.post("/donation-details/qr", isAuthenticated, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        let donationDetails = await DonationDetails.findOne();
        
        // Upload new image to Cloudinary
        const cloudinaryResponse = await uploadOnCloudinary(req.file.path, {
            folder: "hco/qr-codes",
            public_id: `qr-${Date.now()}`,
            overwrite: true,
            transformation: [
                { width: 500, height: 500, crop: "fit" },
                { quality: "auto", fetch_format: "auto" }
            ]
        });

        if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
            throw new Error("Failed to upload image to Cloudinary");
        }

        // Delete old QR code from Cloudinary if it exists
        if (donationDetails?.qrPublicId) {
            try {
                await deleteFromCloudinary(donationDetails.qrPublicId);
            } catch (error) {
                console.error("Error deleting old QR code:", error);
            }
        }

        if (!donationDetails) {
            donationDetails = new DonationDetails({
                upiId: "hco@upi",
                qrCodeImage: cloudinaryResponse.secure_url,
                qrPublicId: cloudinaryResponse.public_id,
                accountName: "Humanity Club Organization",
                accountNumber: "1234567890",
                ifscCode: "ABCD0123456",
                bankName: "Example Bank"
            });
        } else {
            donationDetails.qrCodeImage = cloudinaryResponse.secure_url;
            donationDetails.qrPublicId = cloudinaryResponse.public_id;
        }
        
        await donationDetails.save();

        // Delete local file after upload
        fs.unlinkSync(req.file.path);
        
        res.json({ 
            success: true, 
            data: donationDetails,
            message: "QR code updated successfully"
        });
    } catch (error) {
        console.error("Error updating QR code:", error);
        // Clean up local file if it exists
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ 
            success: false, 
            message: "Error updating QR code: " + error.message 
        });
    }
});

// Delete QR code (Admin only)
router.delete("/donation-details/qr/:publicId", isAuthenticated, async (req, res) => {
    try {
        const { publicId } = req.params;

        let donationDetails = await DonationDetails.findOne();
        if (!donationDetails) {
            return res.status(404).json({ 
                success: false, 
                message: "Donation details not found" 
            });
        }

        // Delete from Cloudinary
        if (publicId) {
            try {
                await deleteFromCloudinary(publicId);
            } catch (error) {
                console.error("Error deleting from Cloudinary:", error);
            }
        }

        // Update database
        donationDetails.qrCodeImage = "https://placehold.co/200x200";
        donationDetails.qrPublicId = null;
        await donationDetails.save();

        res.json({ 
            success: true, 
            data: donationDetails,
            message: "QR code deleted successfully" 
        });
    } catch (error) {
        console.error("Error deleting QR code:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error deleting QR code: " + error.message 
        });
    }
});

export default router;