const Inquiry = require('../models/Inquiry');
const { sendInquiryEmail } = require('../config/mailer');

/**
 * @desc    Submit a new contact / machinery inquiry
 * @route   POST /api/contact
 * @access  Public
 */
const submitInquiry = async (req, res, next) => {
  try {
    const { name, email, phone, company, serviceType, subject, message } = req.body;

    // Basic Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Contact name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Inquiry message details are required.' });
    }

    // Save to MongoDB Atlas
    const inquiry = await Inquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      company: (company || '').trim(),
      serviceType: (serviceType || 'Machinery Purchase').trim(),
      subject: (subject || 'General Inquiry').trim(),
      message: message.trim(),
      status: 'new',
    });

    // Send email asynchronously so user doesn't wait
    sendInquiryEmail(inquiry).catch((err) => {
      console.error('Async inquiry email dispatch error:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your machinery inquiry has been received. Our engineering team will contact you shortly.',
      inquiryId: inquiry._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all inquiries for Admin Dashboard
 * @route   GET /api/contact
 * @access  Private (Admin Only)
 */
const getInquiries = async (req, res, next) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { company: { $regex: s, $options: 'i' } },
        { subject: { $regex: s, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Inquiry.countDocuments(query);
    const inquiries = await Inquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    // Stats
    const stats = {
      total: await Inquiry.countDocuments(),
      new: await Inquiry.countDocuments({ status: 'new' }),
      contacted: await Inquiry.countDocuments({ status: 'contacted' }),
      archived: await Inquiry.countDocuments({ status: 'archived' }),
    };

    res.status(200).json({
      success: true,
      count: inquiries.length,
      total,
      stats,
      inquiries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update inquiry status or admin notes
 * @route   PATCH /api/contact/:id
 * @access  Private (Admin Only)
 */
const updateInquiryStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const updateData = {};

    if (status) {
      if (!['new', 'read', 'contacted', 'archived'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value.' });
      }
      updateData.status = status;
    }

    if (typeof notes === 'string') {
      updateData.notes = notes;
    }

    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Inquiry updated successfully.',
      inquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an inquiry
 * @route   DELETE /api/contact/:id
 * @access  Private (Admin Only)
 */
const deleteInquiry = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Inquiry deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitInquiry,
  getInquiries,
  updateInquiryStatus,
  deleteInquiry,
};
