const cloudinary = require('cloudinary').v2;
const config = require('./env');

const clean = (val) => (val || '').trim().replace(/^["']|["']$/g, '').trim();

const cloudName = clean(config.cloudinary.cloudName);
const apiKey = clean(config.cloudinary.apiKey);
const apiSecret = clean(config.cloudinary.apiSecret);
const cloudinaryUrl = clean(config.cloudinary.url);

const isCloudinaryConfigured = Boolean(
  (cloudName && apiKey && apiSecret) || cloudinaryUrl
);

if (isCloudinaryConfigured) {
  if (cloudinaryUrl) {
    process.env.CLOUDINARY_URL = cloudinaryUrl;
  }
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
  console.log('Cloudinary persistent cloud storage initialized.');
} else {
  console.log('Notice: Cloudinary credentials not fully set; using local storage fallback for uploads.');
}

/**
 * Upload a file buffer directly to Cloudinary
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>} Cloudinary upload result containing secure_url, public_id, etc.
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'cobolt/products',
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Delete an asset from Cloudinary by public ID
 * @param {string} publicId
 */
const deleteFromCloudinary = async (publicId) => {
  if (!isCloudinaryConfigured || !publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Error deleting asset from Cloudinary:', err.message);
    return null;
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
};
