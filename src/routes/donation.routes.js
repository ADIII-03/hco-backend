import express from "express";
import { Router } from "express";
import { DonationDetails } from "../models/donation.model.js";
import { upload } from "../middlewares/multer.middleware.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getDonationDetails, updateDonationDetails, uploadQRCode, deleteQRCode } from '../controllers/donation.controller.js';

const router = Router();

// Get donation details
router.get("/", getDonationDetails);

// Update donation details (Admin only)
router.put("/", isAuthenticated, isAdmin, updateDonationDetails);

// Update QR code image (Admin only)
router.post("/qr", isAuthenticated, isAdmin, upload.single("image"), uploadQRCode);

// Delete QR code (Admin only)
router.delete("/qr/:filename", isAuthenticated, isAdmin, deleteQRCode);

export default router;