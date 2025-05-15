import mongoose from "mongoose";

const donationDetailsSchema = new mongoose.Schema({
    upiId: {
        type: String,
        required: true,
        trim: true
    },
    qrCodeImage: {
        type: String,
        default: null
    },
    qrPublicId: {
        type: String,
        default: null
    },
    accountName: {
        type: String,
        required: true,
        trim: true
    },
    accountNumber: {
        type: String,
        required: true,
        trim: true
    },
    ifscCode: {
        type: String,
        required: true,
        trim: true
    },
    bankName: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

export const DonationDetails = mongoose.model("DonationDetails", donationDetailsSchema); 