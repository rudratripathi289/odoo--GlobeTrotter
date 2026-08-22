import * as uploadService from '../services/upload.service.js';

export const uploadSingleImage = async (req, res, next) => {
  try {
    const folder = req.query.folder || 'globetrotter';
    const data = await uploadService.uploadImage(req.file, folder);
    res.status(200).json({
      message: 'Image uploaded successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadMultipleImages = async (req, res, next) => {
  try {
    const folder = req.query.folder || 'globetrotter';
    const data = await uploadService.uploadImages(req.files, folder);
    res.status(200).json({
      message: 'Images uploaded successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
