const mongoose = require('mongoose');

const SpecSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Product ID / slug is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    image: {
      type: String,
      required: [true, 'Main product image is required'],
      trim: true,
    },
    images: {
      type: [String],
      default: function () {
        return this.image ? [this.image] : [];
      },
    },
    tagline: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    specs: {
      type: [SpecSchema],
      default: [],
    },
    accessories: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      default: null,
    },
    offerPrice: {
      type: Number,
      default: null,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound text index for search
ProductSchema.index({
  name: 'text',
  tagline: 'text',
  description: 'text',
  category: 'text',
});

// Pre-save middleware to keep `image` in sync with first image of `images` array if provided
ProductSchema.pre('save', function (next) {
  if (Array.isArray(this.images) && this.images.length > 0) {
    if (!this.image || !this.images.includes(this.image)) {
      this.image = this.images[0];
    }
  } else if (this.image) {
    this.images = [this.image];
  }
  next();
});

module.exports = mongoose.model('Product', ProductSchema);
