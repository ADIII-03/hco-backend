import { Gallery } from '../models/gallery.model.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import fs from 'fs';

// Get all projects with their images
export const getProjects = async (req, res) => {
  try {
    console.log('Fetching gallery projects...');
    
    // Define default projects
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
      .select('-__v') // Exclude version key
      .lean(); // Convert to plain JavaScript object

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

    return res.status(200).json({ 
      success: true,
      projects 
    });
  } catch (err) {
    console.error('Error getting projects:', err);
    return res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to fetch gallery images',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Upload image
export const uploadGalleryImage = async (req, res) => {
  try {
    console.log('Upload request received:', {
      body: req.body,
      file: req.file
    });

    const { projectIndex, projectTitle, description } = req.body;
    const localPath = req.file?.path;

    // Validation
    if (!localPath) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }
    if (projectIndex === undefined) {
      return res.status(400).json({ 
        success: false,
        error: 'Project index is required' 
      });
    }
    if (!projectTitle) {
      return res.status(400).json({ 
        success: false,
        error: 'Project title is required' 
      });
    }

    // Upload to Cloudinary with specific options
    const cloudinaryResult = await uploadOnCloudinary(localPath, {
      folder: 'hco-gallery',
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    if (!cloudinaryResult) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to upload image to Cloudinary' 
      });
    }

    console.log('Cloudinary upload result:', cloudinaryResult);

    // Save image data to the database with metadata
    const newImage = await Gallery.create({
      projectIndex: parseInt(projectIndex),
      projectTitle,
      imageUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      description: description || '',
      uploadedBy: req.user?._id, // Make it optional in case auth is not set up
      metadata: {
        size: cloudinaryResult.bytes,
        format: cloudinaryResult.format,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height
      }
    });

    // Clean up local file
    if (fs.existsSync(localPath)) {
      fs.unlink(localPath, (err) => {
        if (err) console.error('Error deleting local file:', err);
      });
    }

    return res.status(201).json({ 
      success: true,
      message: 'Image uploaded successfully',
      image: {
        url: newImage.imageUrl,
        publicId: newImage.publicId,
        description: newImage.description,
        projectIndex: newImage.projectIndex,
        projectTitle: newImage.projectTitle,
        uploadedAt: newImage.uploadedAt,
        metadata: newImage.metadata
      }
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    return res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to upload image' 
    });
  }
};

// Delete image
export const deleteGalleryImage = async (req, res) => {
  try {
    console.log('Delete request received:', {
      body: req.body,
      params: req.params,
      query: req.query
    });

    const { publicId, projectIndex, forceDelete } = req.body;
    if (!publicId) {
      return res.status(400).json({ 
        success: false,
        error: 'Public ID is required' 
      });
    }

    console.log('Searching for image with publicId:', publicId);

    // Find the image in the database
    const image = await Gallery.findOne({ publicId });
    if (!image) {
      console.log('Image not found in database for publicId:', publicId);
      return res.status(404).json({ 
        success: false,
        error: 'Image not found in database' 
      });
    }

    console.log('Found image:', {
      id: image._id,
      publicId: image.publicId,
      projectIndex: image.projectIndex
    });

    // If forceDelete is true, skip Cloudinary deletion
    if (forceDelete) {
      console.log('Force deleting from database...');
      await Gallery.findByIdAndDelete(image._id);
      return res.status(200).json({
        success: true,
        message: 'Image force deleted from database',
        deletedImage: {
          url: image.imageUrl,
          publicId: image.publicId,
          projectIndex: image.projectIndex,
          projectTitle: image.projectTitle
        }
      });
    }

    // Delete from Cloudinary
    try {
      console.log('Attempting to delete from Cloudinary:', publicId);
      const cloudinaryResult = await deleteFromCloudinary(publicId);
      console.log('Cloudinary delete result:', cloudinaryResult);
      
      if (!cloudinaryResult || cloudinaryResult.result !== 'ok') {
        throw new Error('Failed to delete from Cloudinary');
      }

      // Delete from MongoDB only if Cloudinary deletion was successful
      console.log('Deleting from MongoDB...');
      await Gallery.findByIdAndDelete(image._id);

      return res.status(200).json({ 
        success: true,
        message: 'Image deleted successfully',
        deletedImage: {
          url: image.imageUrl,
          publicId: image.publicId,
          projectIndex: image.projectIndex,
          projectTitle: image.projectTitle
        }
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', {
        error: cloudinaryError,
        publicId,
        message: cloudinaryError.message
      });

      // If image doesn't exist in Cloudinary but exists in our DB, delete from DB
      if (cloudinaryError.message.includes('not found') || 
          cloudinaryError.message.includes('Not Found') ||
          cloudinaryError.message.includes('resource not found')) {
        console.log('Image not found in Cloudinary, deleting from database...');
        await Gallery.findByIdAndDelete(image._id);
        return res.status(200).json({
          success: true,
          message: 'Image deleted from database (not found in Cloudinary)',
          deletedImage: {
            url: image.imageUrl,
            publicId: image.publicId,
            projectIndex: image.projectIndex,
            projectTitle: image.projectTitle
          }
        });
      }

      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete image from cloud storage',
        details: cloudinaryError.message
      });
    }
  } catch (err) {
    console.error('Error deleting image:', {
      error: err,
      message: err.message,
      stack: err.stack
    });
    return res.status(500).json({ 
      success: false,
      error: 'Failed to delete image',
      details: err.message
    });
  }
};