import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import dotenv from "dotenv"
import { ApiError } from './ApiError.js';

// Load environment variables
dotenv.config();

// console.log("Cloudinary connected:", {
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET ? "Loaded" : "Missing",
//   });
  
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = async (localFilePath, options = {}) => {
    try {
        if (!localFilePath) return null;
        
        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            ...options
        });
        
        // File has been uploaded successfully
        console.log("File uploaded on cloudinary:", response.url);
        
        // Remove the locally saved temporary file
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        
        return response;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        // Remove the locally saved temporary file
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
};

export const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) {
            throw new ApiError(400, "Public ID is required");
        }
        
        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result !== 'ok') {
            throw new ApiError(500, "Failed to delete image from cloud storage");
        }
        
        return result;
    } catch (error) {
        throw new ApiError(500, error?.message || "Error deleting image from cloud storage");
    }
};

