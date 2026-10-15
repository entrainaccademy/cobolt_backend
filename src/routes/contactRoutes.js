const express = require('express');
const {
  submitInquiry,
  getInquiries,
  updateInquiryStatus,
  deleteInquiry,
} = require('../controllers/contactController');
const { protectAdmin } = require('../middleware/auth');

const router = express.Router();

// Public: Submit inquiry
router.post('/', submitInquiry);

// Private (Admin Only): View, update status, and delete inquiries
router.get('/', protectAdmin, getInquiries);
router.patch('/:id', protectAdmin, updateInquiryStatus);
router.delete('/:id', protectAdmin, deleteInquiry);

module.exports = router;
