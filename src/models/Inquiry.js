const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: 30,
    },
    company: {
      type: String,
      trim: true,
      default: '',
      maxlength: 150,
    },
    serviceType: {
      type: String,
      trim: true,
      default: 'Machinery Purchase',
    },
    subject: {
      type: String,
      trim: true,
      default: 'General Inquiry',
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, 'Inquiry message details are required'],
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'contacted', 'archived'],
      default: 'new',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick queries
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ email: 1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
