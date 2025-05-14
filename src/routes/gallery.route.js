import express from 'express';
import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { Gallery } from '../models/gallery.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Get all gallery items
router.get("/", async (req, res) => {
    try {
        console.log('Fetching gallery items...');
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

        console.log(`Found ${images.length} images in the database`);

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

        res.json({ success: true, data: projects });
    } catch (error) {
        console.error("Error fetching gallery:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching gallery",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Upload image (Admin only)
router.post("/upload", isAuthenticated, upload.single("image"), async (req, res) => {
    try {
        const { projectIndex, projectTitle, description } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        const newImage = await Gallery.create({
            projectIndex: parseInt(projectIndex),
            projectTitle,
            imageUrl: `/api/v1/uploads/${req.file.filename}`,
            description: description || '',
            uploadedBy: req.user?._id,
            metadata: {
                size: req.file.size,
                format: path.extname(req.file.originalname).slice(1),
                originalName: req.file.originalname
            }
        });

        res.status(201).json({ 
            success: true,
            message: 'Image uploaded successfully',
            data: newImage
        });
    } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).json({ success: false, message: "Error uploading image" });
    }
});

// Delete image (Admin only)
router.delete("/:imageId", isAuthenticated, async (req, res) => {
    try {
        const { imageId } = req.params;
        const image = await Gallery.findById(imageId);
        
        if (!image) {
            return res.status(404).json({ success: false, message: "Image not found" });
        }

        // Delete file if it exists
        const imagePath = path.join(__dirname, '..', image.imageUrl);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        await Gallery.findByIdAndDelete(imageId);

        res.json({ 
            success: true, 
            message: "Image deleted successfully",
            data: image
        });
    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ success: false, message: "Error deleting image" });
    }
});

export default router;