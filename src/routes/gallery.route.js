import express from 'express';
import upload, { handleMulterError } from '../middlewares/multer.middleware.js';
import { uploadGalleryImage, deleteGalleryImage, getProjects } from '../controllers/gallery.controller.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware.js'; // if you have them

const router = express.Router();

router.get('/projects', getProjects);
router.post('/upload', isAuthenticated, isAdmin, upload.single('image'), handleMulterError, uploadGalleryImage);
router.delete('/delete', isAuthenticated, isAdmin, deleteGalleryImage);

export default router;