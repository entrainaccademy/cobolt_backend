const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protectAdmin } = require('../middleware/auth');
const {
  uploadSinglePhoto,
  uploadMultiplePhotos,
} = require('../controllers/uploadController');

// Protected admin upload endpoints
router.post('/', protectAdmin, upload.single('image'), uploadSinglePhoto);
router.post('/multiple', protectAdmin, upload.array('images', 10), uploadMultiplePhotos);

module.exports = router;
