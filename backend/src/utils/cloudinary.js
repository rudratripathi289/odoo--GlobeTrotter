import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Check if live Cloudinary credentials are configured
 */
export const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Upload a file buffer to Cloudinary using upload_stream.
 * Fallback to mock base64 data URI if credentials are not configured.
 *
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options - Upload options (folder, public_id, etc.)
 * @returns {Promise<Object>} Cloudinary upload result or mock object
 */
export const uploadBufferToCloudinary = async (buffer, options = {}) => {
  const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'globetrotter';

  // Fallback mode when Cloudinary credentials are missing (local dev & testing)
  if (!isCloudinaryConfigured()) {
    const mimeType = options.mimeType || 'image/jpeg';
    const base64 = buffer.toString('base64');
    const mockUrl = `data:${mimeType};base64,${base64.slice(0, 100)}...`;
    
    return {
      url: mockUrl,
      secureUrl: mockUrl,
      publicId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      format: mimeType.split('/')[1] || 'jpeg',
      bytes: buffer.length,
      isMock: true,
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url || result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          isMock: false,
        });
      }
    );

    uploadStream.end(buffer);
  });
};
