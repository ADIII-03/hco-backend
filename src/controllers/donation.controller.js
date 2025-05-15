import { DonationDetails } from "../models/donation.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const getDonationDetails = asyncHandler(async (req, res) => {
    const donationDetails = await DonationDetails.findOne();
    if (!donationDetails) {
        throw new ApiError(404, "Donation details not found");
    }
    return res.status(200).json(
        new ApiResponse(200, donationDetails, "Donation details fetched successfully")
    );
});

const updateDonationDetails = asyncHandler(async (req, res) => {
    const { upiId, accountName, accountNumber, ifscCode, bankName } = req.body;

    let donationDetails = await DonationDetails.findOne();
    
    if (!donationDetails) {
        // Create new donation details if none exist
        donationDetails = await DonationDetails.create({
            upiId,
            accountName,
            accountNumber,
            ifscCode,
            bankName,
            qrCodeImage: "default_qr_code_url" // You can set a default QR code URL
        });
    } else {
        // Update existing donation details
        if (upiId) donationDetails.upiId = upiId;
        if (accountName) donationDetails.accountName = accountName;
        if (accountNumber) donationDetails.accountNumber = accountNumber;
        if (ifscCode) donationDetails.ifscCode = ifscCode;
        if (bankName) donationDetails.bankName = bankName;

        await donationDetails.save();
    }

    return res.status(200).json(
        new ApiResponse(200, donationDetails, "Donation details updated successfully")
    );
});

const uploadQRCode = asyncHandler(async (req, res) => {
    const qrCodeLocalPath = req.file?.path;

    if (!qrCodeLocalPath) {
        throw new ApiError(400, "QR code image file is required");
    }

    let donationDetails = await DonationDetails.findOne();
    if (!donationDetails) {
        throw new ApiError(404, "Donation details not found");
    }

    // Delete old QR code from Cloudinary if it exists
    if (donationDetails.qrPublicId) {
        try {
            await deleteFromCloudinary(donationDetails.qrPublicId);
        } catch (error) {
            console.error("Error deleting old QR code:", error);
        }
    }

    const qrCode = await uploadOnCloudinary(qrCodeLocalPath, "hco/qr-codes");
    if (!qrCode) {
        throw new ApiError(400, "Error while uploading QR code");
    }

    donationDetails.qrCodeImage = qrCode.url;
    donationDetails.qrPublicId = qrCode.public_id;
    await donationDetails.save();

    return res.status(200).json(
        new ApiResponse(200, donationDetails, "QR code updated successfully")
    );
});

const deleteQRCode = asyncHandler(async (req, res) => {
    const { filename } = req.params;

    if (!filename) {
        throw new ApiError(400, "QR code filename is required");
    }

    let donationDetails = await DonationDetails.findOne();
    if (!donationDetails) {
        throw new ApiError(404, "Donation details not found");
    }

    // Extract public_id from the Cloudinary URL or stored public_id
    const publicId = `hco/qr-codes/${filename}`;

    try {
        // Delete from Cloudinary
        await deleteFromCloudinary(publicId);

        // Update database
        donationDetails.qrCodeImage = null;
        donationDetails.qrPublicId = null;
        await donationDetails.save();

        return res.status(200).json(
            new ApiResponse(200, donationDetails, "QR code deleted successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Error deleting QR code: " + error.message);
    }
});

export {
    getDonationDetails,
    updateDonationDetails,
    uploadQRCode,
    deleteQRCode
}; 