import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import dotenv from "dotenv"

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
            throw new Error("No public ID provided for deletion");
        }

        // First, check if the resource exists
        try {
            await cloudinary.api.resource(publicId);
        } catch (error) {
            if (error.http_code === 404) {
                console.log("Resource not found in Cloudinary:", publicId);
                return { result: 'not_found' };
            }
            throw error;
        }
        
        // If resource exists, delete it
        const response = await cloudinary.uploader.destroy(publicId, {
            invalidate: true,
            resource_type: "image"
        });
        
        if (response.result === 'ok') {
            console.log("File deleted from Cloudinary:", publicId);
            return response;
        } else {
            throw new Error(`Failed to delete from Cloudinary: ${response.result}`);
        }
    } catch (error) {
        console.error("Cloudinary delete error:", {
            error: error.message,
            publicId,
            stack: error.stack
        });
        throw error;
    }
};

