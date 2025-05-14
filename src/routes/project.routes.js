import express from "express";
import { Router } from "express";
import { Project } from "../models/project.model.js";
import { upload, handleMulterError } from "../middlewares/multer.middleware.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Get all projects
router.get("/projects", async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json({ success: true, data: projects });
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ success: false, message: "Error fetching projects" });
    }
});

// Create a project (Admin only)
router.post("/projects", isAuthenticated, async (req, res) => {
    try {
        const { title, description } = req.body;
        const project = await Project.create({
            title,
            description,
            image: "https://placehold.co/400x300" // Default image
        });
        res.json({ success: true, data: project });
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({ success: false, message: "Error creating project" });
    }
});

// Update project details (Admin only)
router.put("/projects/:projectId", isAuthenticated, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description } = req.body;

        const project = await Project.findByIdAndUpdate(
            projectId,
            { title, description },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        res.json({ success: true, data: project });
    } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({ success: false, message: "Error updating project" });
    }
});

// Update project image (Admin only)
router.post("/projects/:projectId/image", 
    isAuthenticated, 
    upload.single("image"), 
    handleMulterError,
    async (req, res) => {
    try {
        const { projectId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Delete old image if it exists and is not a placeholder
        if (project.image && !project.image.includes('placehold.co') && fs.existsSync(project.image)) {
            fs.unlinkSync(project.image);
        }

        // Update image path
        const imageUrl = `/api/v1/uploads/${req.file.filename}`;
        project.image = imageUrl;
        await project.save();

        res.json({ success: true, data: project });
    } catch (error) {
        console.error("Error updating project image:", error);
        res.status(500).json({ success: false, message: "Error updating project image" });
    }
});

export default router;