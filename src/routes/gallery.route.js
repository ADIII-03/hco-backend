import express from 'express';
import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { Gallery } from '../models/gallery.model.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Get all gallery items
router.get("/", asyncHandler(async (req, res) => {
    const projects = [
        { title: 'Project Shakti', description: 'Women empowerment drives and awareness workshops.', images: [] },
        { title: 'Workshops', description: 'Interactive educational and hygiene workshops.', images: [] },
        { title: 'Project Taleem', description: 'Free educational programs for underprivileged children.', images: [] },
        { title: 'Project Manavta', description: 'Environmental initiatives and plantation drives.', images: [] },
        { title: 'Project Ehsaas', description: 'Visits to old age homes and orphanages.', images: [] },
        { title: 'Project Ahaar', description: 'Food distribution to those in need.', images: [] },
    ];

    // Fetch images from database
    const images = await Gallery.find()
        .sort({ projectIndex: 1, uploadedAt: -1 })
        .select('-__v')
        .lean();

    // Add images to their respective projects
    images.forEach(image => {
        if (projects[image.projectIndex]) {
            projects[image.projectIndex].images.push({
                url: image.imageUrl,
                publicId: image.publicId,
                description: image.description,
                uploadedAt: image.uploadedAt,
                metadata: image.metadata
            });
        }
    });

    return res.status(200).json(
        new ApiResponse(200, { projects }, "Gallery fetched successfully")
    );
}));

// Upload image (Admin only)
router.post("/upload", isAuthenticated, upload.single("image"), asyncHandler(async (req, res) => {
    const { projectIndex, projectTitle, description } = req.body;
    
    if (!req.file) {
        throw new ApiError(400, "No image file provided");
    }

    const cloudinaryResult = await uploadOnCloudinary(req.file.path, {
        folder: 'hco-gallery',
        resource_type: 'auto',
        transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
        ]
    });

    if (!cloudinaryResult) {
        throw new ApiError(500, "Failed to upload image to Cloudinary");
    }

    const newImage = await Gallery.create({
        projectIndex: parseInt(projectIndex),
        projectTitle,
        imageUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        description: description || '',
        uploadedBy: req.user?._id,
        metadata: {
            size: cloudinaryResult.bytes,
            format: cloudinaryResult.format,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height
        }
    });

    return res.status(201).json(
        new ApiResponse(201, { image: newImage }, "Image uploaded successfully")
    );
}));

// Delete image (Admin only)
router.delete("/:imageId", isAuthenticated, asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    const { forceDelete } = req.body;

    const image = await Gallery.findById(imageId);
    if (!image) {
        throw new ApiError(404, "Image not found");
    }

    if (!forceDelete) {
        try {
            await deleteFromCloudinary(image.publicId);
        } catch (error) {
            if (!error.message.includes('not found')) {
                throw new ApiError(500, "Failed to delete image from cloud storage");
            }
        }
    }

    await Gallery.findByIdAndDelete(imageId);

    return res.status(200).json(
        new ApiResponse(200, { deletedImage: image }, "Image deleted successfully")
    );
}));

export default router;