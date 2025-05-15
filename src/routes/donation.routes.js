import express from "express";
import { Router } from "express";
import { DonationDetails } from "../models/donation.model.js";
import { upload } from "../middlewares/multer.middleware.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Get donation details
router.get("/", asyncHandler(async (req, res) => {
    let donationDetails = await DonationDetails.findOne();
    
    if (!donationDetails) {
        donationDetails = await DonationDetails.create({
            upiId: "hco@upi",
            qrCodeImage: "https://placehold.co/200x200",
            accountName: "Humanity Club Organization",
            accountNumber: "1234567890",
            ifscCode: "ABCD0123456",
            bankName: "Example Bank"
        });
    }
    
    return res.status(200).json(
        new ApiResponse(200, donationDetails, "Donation details fetched successfully")
    );
}));

// Update donation details (Admin only)
router.put("/", isAuthenticated, asyncHandler(async (req, res) => {
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
    return res.status(200).json(
        new ApiResponse(200, donationDetails, "Donation details updated successfully")
    );
}));

// Update QR code image (Admin only)
router.post("/qr", isAuthenticated, upload.single("image"), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No image file provided");
    }

    let donationDetails = await DonationDetails.findOne();
    
    const cloudinaryResult = await uploadOnCloudinary(req.file.path, {
        folder: "hco/qr-codes",
        public_id: `qr-${Date.now()}`,
        overwrite: true,
        transformation: [
            { width: 500, height: 500, crop: "fit" },
            { quality: "auto", fetch_format: "auto" }
        ]
    });

    if (!cloudinaryResult) {
        throw new ApiError(500, "Failed to upload QR code to Cloudinary");
    }

    // Delete old QR code from Cloudinary if it exists
    if (donationDetails?.qrPublicId) {
        try {
            await deleteFromCloudinary(donationDetails.qrPublicId);
        } catch (error) {
            // Ignore errors when deleting old QR code
        }
    }

    if (!donationDetails) {
        donationDetails = new DonationDetails({
            upiId: "hco@upi",
            qrCodeImage: cloudinaryResult.secure_url,
            qrPublicId: cloudinaryResult.public_id,
            accountName: "Humanity Club Organization",
            accountNumber: "1234567890",
            ifscCode: "ABCD0123456",
            bankName: "Example Bank"
        });
    } else {
        donationDetails.qrCodeImage = cloudinaryResult.secure_url;
        donationDetails.qrPublicId = cloudinaryResult.public_id;
    }
    
    await donationDetails.save();
    
    return res.status(200).json(
        new ApiResponse(200, donationDetails, "QR code updated successfully")
    );
}));

// Delete QR code (Admin only)
router.delete("/qr/:publicId", isAuthenticated, asyncHandler(async (req, res) => {
    const { publicId } = req.params;

    let donationDetails = await DonationDetails.findOne();
    if (!donationDetails) {
        throw new ApiError(404, "Donation details not found");
    }

    // Delete from Cloudinary
    if (publicId) {
        try {
            await deleteFromCloudinary(publicId);
        } catch (error) {
            if (!error.message.includes('not found')) {
                throw new ApiError(500, "Failed to delete from cloud storage");
            }
        }
    }

    // Update database
    donationDetails.qrCodeImage = "https://placehold.co/200x200";
    donationDetails.qrPublicId = null;
    await donationDetails.save();

    return res.status(200).json(
        new ApiResponse(200, donationDetails, "QR code deleted successfully")
    );
}));

export default router;