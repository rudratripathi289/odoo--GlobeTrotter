import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { uploadSingleImage, uploadMultipleImages } from '../middlewares/upload.middleware.js';

const router = Router();

// Upload routes require JWT authentication
router.post('/image', authenticate, uploadSingleImage, uploadController.uploadSingleImage);
router.post('/images', authenticate, uploadMultipleImages, uploadController.uploadMultipleImages);

export default router;
