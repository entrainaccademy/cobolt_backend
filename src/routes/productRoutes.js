const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  updateProductStatus,
  manageProductPhotos,
  deleteProduct,
} = require('../controllers/productController');
const { protectAdmin } = require('../middleware/auth');

// Public endpoints
router.get('/', getAllProducts);
router.get('/meta/categories', getCategories);
router.get('/:id', getProductById);

// Protected admin endpoints
router.post('/', protectAdmin, createProduct);
router.put('/:id', protectAdmin, updateProduct);
router.delete('/:id', protectAdmin, deleteProduct);
router.patch('/:id/status', protectAdmin, updateProductStatus);
router.put('/:id/photos', protectAdmin, manageProductPhotos);

module.exports = router;
