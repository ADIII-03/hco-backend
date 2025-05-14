import { Project } from "../models/project.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllProjects = asyncHandler(async (req, res) => {
    const projects = await Project.find();
    return res.status(200).json(
        new ApiResponse(200, projects, "Projects fetched successfully")
    );
});

const updateProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;

    const project = await Project.findById(id);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    if (title) project.title = title;
    if (description) project.description = description;

    await project.save();

    return res.status(200).json(
        new ApiResponse(200, project, "Project updated successfully")
    );
});

const uploadProjectImage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const projectImageLocalPath = req.file?.path;

    if (!projectImageLocalPath) {
        throw new ApiError(400, "Project image file is required");
    }

    const project = await Project.findById(id);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const projectImage = await uploadOnCloudinary(projectImageLocalPath);
    if (!projectImage) {
        throw new ApiError(400, "Error while uploading project image");
    }

    project.image = projectImage.url;
    await project.save();

    return res.status(200).json(
        new ApiResponse(200, project, "Project image updated successfully")
    );
});

export const createProject = async (req, res) => {
    try {
        const { title, description, image } = req.body;
        const project = new Project({ title, description, image });
        await project.save();
        res.status(201).json({ data: project });
    } catch (error) {
        res.status(500).json({ message: "Error creating project" });
    }
};

export {
    getAllProjects,
    updateProject,
    uploadProjectImage
};