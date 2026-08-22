import { uploadBufferToCloudinary } from '../utils/cloudinary.js';

/**
 * Upload a single image file buffer to Cloudinary (or mock fallback)
 */
export const uploadImage = async (file, folder = 'globetrotter') => {
  const result = await uploadBufferToCloudinary(file.buffer, {
    folder,
    mimeType: file.mimetype,
  });

  return {
    url: result.url,
    secureUrl: result.secureUrl,
    publicId: result.publicId,
    format: result.format,
    bytes: result.bytes,
    width: result.width || null,
    height: result.height || null,
  };
};

/**
 * Upload multiple image file buffers to Cloudinary in parallel
 */
export const uploadImages = async (files, folder = 'globetrotter') => {
  const uploads = files.map((file) =>
    uploadBufferToCloudinary(file.buffer, {
      folder,
      mimeType: file.mimetype,
    })
  );

  const results = await Promise.all(uploads);

  return results.map((result) => ({
    url: result.url,
    secureUrl: result.secureUrl,
    publicId: result.publicId,
    format: result.format,
    bytes: result.bytes,
  }));
};
