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
                _id: image._id,
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

// Delete image by ID (Admin only)
router.delete("/:imageId", isAuthenticated, asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    const { forceDelete } = req.body;

    // Find the image first
    const image = await Gallery.findById(imageId);
    if (!image) {
        // If not found by ID, try to find by public ID
        const imageByPublicId = await Gallery.findOne({ publicId: imageId });
        if (!imageByPublicId) {
            throw new ApiError(404, "Image not found in database");
        }
        image = imageByPublicId;
    }

    try {
        // If force delete is requested, skip Cloudinary deletion
        if (forceDelete) {
            await Gallery.findByIdAndDelete(image._id);
            return res.status(200).json(
                new ApiResponse(200, {
                    deletedImage: {
                        _id: image._id,
                        publicId: image.publicId,
                        imageUrl: image.imageUrl
                    }
                }, "Image force deleted from database")
            );
        }

        // Try to delete from Cloudinary
        try {
            const cloudinaryResponse = await deleteFromCloudinary(image.publicId);
            console.log('Cloudinary deletion response:', cloudinaryResponse);
        } catch (cloudinaryError) {
            console.error('Cloudinary deletion error:', cloudinaryError);
            // If image not found in Cloudinary, just proceed with database deletion
            if (cloudinaryError.message.includes('not found') || 
                cloudinaryError.http_code === 404 || 
                cloudinaryError.message.includes('404')) {
                console.log('Image not found in Cloudinary, proceeding with database deletion');
            } else {
                throw cloudinaryError;
            }
        }

        // Delete from database
        await Gallery.findByIdAndDelete(image._id);

        return res.status(200).json(
            new ApiResponse(200, {
                deletedImage: {
                    _id: image._id,
                    publicId: image.publicId,
                    imageUrl: image.imageUrl
                }
            }, "Image deleted successfully")
        );
    } catch (error) {
        console.error('Delete operation failed:', error);
        if (error.message.includes('not found') || error.http_code === 404) {
            // If the error is about resource not found, still delete from database
            await Gallery.findByIdAndDelete(image._id);
            return res.status(200).json(
                new ApiResponse(200, {
                    deletedImage: {
                        _id: image._id,
                        publicId: image.publicId,
                        imageUrl: image.imageUrl
                    }
                }, "Image deleted from database (resource not found in cloud)")
            );
        }
        throw new ApiError(500, `Failed to delete image: ${error.message}`);
    }
}));

// Delete image by public ID (Admin only)
router.delete("/by-public-id/:publicId", isAuthenticated, asyncHandler(async (req, res) => {
    const { publicId } = req.params;
    const { forceDelete } = req.body;

    const image = await Gallery.findOne({ publicId });
    if (!image) {
        throw new ApiError(404, "Image not found in database");
    }

    return await deleteImageFromBoth(image, forceDelete, res);
}));

// Clean up orphaned images (Admin only)
router.delete("/cleanup/orphaned", isAuthenticated, asyncHandler(async (req, res) => {
    const images = await Gallery.find().select('publicId imageUrl').lean();
    const results = {
        success: [],
        failed: []
    };

    for (const image of images) {
        try {
            const cloudinaryResponse = await deleteFromCloudinary(image.publicId);
            if (cloudinaryResponse.result === 'ok' || cloudinaryResponse.result === 'not_found') {
                await Gallery.findOneAndDelete({ publicId: image.publicId });
                results.success.push(image.publicId);
            } else {
                results.failed.push({ publicId: image.publicId, reason: 'Cloudinary deletion failed' });
            }
        } catch (error) {
            results.failed.push({ publicId: image.publicId, reason: error.message });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, results, "Cleanup completed")
    );
}));

// Verify image existence
router.get("/verify/:imageId", isAuthenticated, asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    
    const status = {
        database: false,
        cloudinary: false,
        details: {}
    };

    // Check database
    const image = await Gallery.findById(imageId) || await Gallery.findOne({ publicId: imageId });
    if (image) {
        status.database = true;
        status.details.database = {
            _id: image._id,
            publicId: image.publicId,
            imageUrl: image.imageUrl
        };
    }

    // Check Cloudinary
    if (image) {
        try {
            // We can use the deleteFromCloudinary function with a special flag to only check existence
            await deleteFromCloudinary(image.publicId, true);
            status.cloudinary = true;
            status.details.cloudinary = {
                publicId: image.publicId
            };
        } catch (error) {
            if (!error.message.includes('not found') && !error.http_code === 404) {
                console.error('Error checking Cloudinary:', error);
            }
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { status }, "Image verification completed")
    );
}));

// Delete non-existent image (Admin only)
router.delete("/cleanup/:imageId", isAuthenticated, asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    const { force } = req.body;

    const image = await Gallery.findById(imageId) || await Gallery.findOne({ publicId: imageId });
    
    if (!image) {
        return res.status(404).json(
            new ApiResponse(404, null, "Image not found in database")
        );
    }

    let cloudinaryExists = false;
    try {
        await deleteFromCloudinary(image.publicId, true);
        cloudinaryExists = true;
    } catch (error) {
        if (!error.message.includes('not found') && !error.http_code === 404) {
            console.error('Error checking Cloudinary:', error);
        }
    }

    // If force is true or image doesn't exist in Cloudinary, delete from database
    if (force || !cloudinaryExists) {
        await Gallery.findByIdAndDelete(image._id);
        return res.status(200).json(
            new ApiResponse(200, {
                deletedImage: {
                    _id: image._id,
                    publicId: image.publicId,
                    imageUrl: image.imageUrl,
                    cloudinaryExists
                }
            }, `Image ${cloudinaryExists ? 'force deleted' : 'cleaned up'} successfully`)
        );
    }

    throw new ApiError(400, "Image exists in both database and Cloudinary. Use force=true to delete anyway or use regular delete endpoint");
}));

// Cleanup all orphaned images (Admin only)
router.delete("/cleanup/orphaned/all", isAuthenticated, asyncHandler(async (req, res) => {
    const results = {
        processed: 0,
        deleted: 0,
        failed: 0,
        details: {
            success: [],
            errors: []
        }
    };

    const images = await Gallery.find().select('_id publicId imageUrl').lean();
    
    for (const image of images) {
        results.processed++;
        try {
            // Check if image exists in Cloudinary
            try {
                await deleteFromCloudinary(image.publicId, true);
                // If we get here, image exists in Cloudinary - skip it
                continue;
            } catch (error) {
                if (!error.message.includes('not found') && !error.http_code === 404) {
                    throw error;
                }
                // Image doesn't exist in Cloudinary - delete from database
                await Gallery.findByIdAndDelete(image._id);
                results.deleted++;
                results.details.success.push({
                    _id: image._id,
                    publicId: image.publicId
                });
            }
        } catch (error) {
            results.failed++;
            results.details.errors.push({
                _id: image._id,
                publicId: image.publicId,
                error: error.message
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, { results }, `Cleanup completed: ${results.deleted} images deleted, ${results.failed} failed`)
    );
}));

// Helper function to delete image from both Cloudinary and database
async function deleteImageFromBoth(image, forceDelete, res) {
    try {
        if (!forceDelete) {
            const cloudinaryResponse = await deleteFromCloudinary(image.publicId);
            console.log('Cloudinary deletion response:', cloudinaryResponse);
            
            if (cloudinaryResponse.result !== 'ok' && cloudinaryResponse.result !== 'not_found') {
                throw new ApiError(500, "Failed to delete image from cloud storage");
            }
        }

        await Gallery.findByIdAndDelete(image._id);

        return res.status(200).json(
            new ApiResponse(200, {
                deletedImage: {
                    _id: image._id,
                    publicId: image.publicId,
                    imageUrl: image.imageUrl
                }
            }, "Image deleted successfully")
        );
    } catch (error) {
        console.error('Image deletion error:', {
            imageId: image._id,
            publicId: image.publicId,
            error: error.message
        });

        if (error.message.includes('not_found') || forceDelete) {
            await Gallery.findByIdAndDelete(image._id);
            return res.status(200).json(
                new ApiResponse(200, {
                    deletedImage: {
                        _id: image._id,
                        publicId: image.publicId,
                        imageUrl: image.imageUrl
                    }
                }, "Image deleted from database (cloud resource not found)")
            );
        }

        throw new ApiError(500, `Failed to delete image: ${error.message}`);
    }
}

export default router;