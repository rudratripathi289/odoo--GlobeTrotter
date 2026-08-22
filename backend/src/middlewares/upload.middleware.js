import multer from 'multer';
import { AppError } from '../utils/AppError.js';

// Memory storage keeps file buffers in memory for Cloudinary stream upload
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB limit

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        400,
        'INVALID_FILE_TYPE',
        `Invalid file type '${file.mimetype}'. Allowed formats: JPEG, PNG, WEBP, GIF.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

/**
 * Handle single image upload field named 'image' or 'file'
 */
export const uploadSingleImage = (req, res, next) => {
  const single = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]);

  single(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(400, 'FILE_TOO_LARGE', 'File size exceeds maximum limit of 5MB.'));
      }
      return next(new AppError(400, 'UPLOAD_ERROR', err.message));
    }
    if (err) return next(err);

    // Normalize req.file to point to whichever field was provided ('image' or 'file')
    const files = req.files;
    if (files) {
      req.file = files['image']?.[0] || files['file']?.[0];
    }

    if (!req.file) {
      return next(new AppError(400, 'MISSING_FILE', 'No image file uploaded. Send file under field name "image" or "file".'));
    }

    next();
  });
};

/**
 * Handle multiple images upload field named 'images' (up to 5 files)
 */
export const uploadMultipleImages = (req, res, next) => {
  const multi = upload.array('images', 5);

  multi(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(400, 'FILE_TOO_LARGE', 'One or more files exceed the 5MB limit.'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError(400, 'TOO_MANY_FILES', 'Maximum 5 files allowed per upload.'));
      }
      return next(new AppError(400, 'UPLOAD_ERROR', err.message));
    }
    if (err) return next(err);

    if (!req.files || req.files.length === 0) {
      return next(new AppError(400, 'MISSING_FILE', 'No image files uploaded. Send files under field name "images".'));
    }

    next();
  });
};
