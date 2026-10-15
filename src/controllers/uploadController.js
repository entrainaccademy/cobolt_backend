const fs = require('fs');
const path = require('path');
const {
  isCloudinaryConfigured,
  uploadToCloudinary,
} = require('../config/cloudinary');

// Ensure local uploads directory exists for fallback
const localUploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

/**
 * Helper to save buffer to local uploads folder (fallback when Cloudinary is not configured)
 */
const saveBufferLocally = (file, req) => {
  const extension = path.extname(file.originalname) || '.jpg';
  const cleanBase = path
    .basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${cleanBase}-${Date.now()}-${Math.round(Math.random() * 1e4)}${extension}`;
  const filepath = path.join(localUploadsDir, filename);

  fs.writeFileSync(filepath, file.buffer);

  // Return full URL or path
  const host = req.get('host');
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' || host?.includes('onrender.com');
  const protocol = isSecure ? 'https' : req.protocol;
  const fullUrl = `${protocol}://${host}/uploads/${filename}`;

  return {
    url: fullUrl,
    path: `/uploads/${filename}`,
    filename,
    storage: 'local',
  };
};

/**
 * @desc    Upload single product photo
 * @route   POST /api/upload
 * @access  Private (Admin)
 */
const uploadSinglePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was provided for upload.',
      });
    }

    if (isCloudinaryConfigured) {
      const result = await uploadToCloudinary(req.file.buffer);
      return res.status(200).json({
        success: true,
        message: 'Image uploaded successfully to Cloudinary persistent storage.',
        url: result.secure_url,
        publicId: result.public_id,
        storage: 'cloudinary',
      });
    } else {
      const localResult = saveBufferLocally(req.file, req);
      return res.status(200).json({
        success: true,
        message: 'Image saved locally. (Configure Cloudinary in .env for persistent cloud storage).',
        url: localResult.url,
        path: localResult.path,
        storage: 'local',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload multiple product photos
 * @route   POST /api/upload/multiple
 * @access  Private (Admin)
 */
const uploadMultiplePhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files were provided for upload.',
      });
    }

    const uploadedUrls = [];

    for (const file of req.files) {
      if (isCloudinaryConfigured) {
        const result = await uploadToCloudinary(file.buffer);
        uploadedUrls.push({
          url: result.secure_url,
          publicId: result.public_id,
          storage: 'cloudinary',
        });
      } else {
        const localResult = saveBufferLocally(file, req);
        uploadedUrls.push({
          url: localResult.url,
          path: localResult.path,
          storage: 'local',
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `${uploadedUrls.length} image(s) uploaded successfully.`,
      images: uploadedUrls,
      urls: uploadedUrls.map((u) => u.url || u.path),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSinglePhoto,
  uploadMultiplePhotos,
};
