const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * Safely escape characters that have special meaning in regular expressions
 */
const escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Unified helper to find a product by ID, slug, or MongoDB ObjectId.
 * Handles IDs containing regex special characters (e.g. parentheses, brackets, plus signs)
 * and case insensitivity safely.
 */
const findProductByIdOrSlug = async (paramId) => {
  if (!paramId) return null;
  const decodedId = decodeURIComponent(paramId).trim();

  // 1. Exact match on 'id' (preserves special characters like parentheses verbatim)
  let product = await Product.findOne({ id: decodedId });
  if (product) return product;

  // 2. Case-insensitive match on 'id' with safely escaped regex
  const escaped = escapeRegex(decodedId);
  product = await Product.findOne({
    id: { $regex: new RegExp(`^${escaped}$`, 'i') },
  });
  if (product) return product;

  // 3. Match by MongoDB ObjectId if valid hex
  if (mongoose.Types.ObjectId.isValid(decodedId) && /^[0-9a-fA-F]{24}$/.test(decodedId)) {
    product = await Product.findById(decodedId);
    if (product) return product;
  }

  // 4. Raw paramId fallback if distinct from decodedId
  if (paramId !== decodedId) {
    const rawParam = paramId.trim();
    product = await Product.findOne({ id: rawParam });
    if (product) return product;

    if (mongoose.Types.ObjectId.isValid(rawParam) && /^[0-9a-fA-F]{24}$/.test(rawParam)) {
      product = await Product.findById(rawParam);
      if (product) return product;
    }
  }

  return null;
};

/**
 * Helper to generate a clean URL slug from product name
 */
const slugify = (text) => {
  return text
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * @desc    Get all products with filtering, search, and sorting
 * @route   GET /api/products
 * @access  Public
 */
const getAllProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      isAvailable,
      isFeatured,
      sort,
      page,
      limit,
    } = req.query;

    const filter = {};

    // Availability filter
    if (typeof isAvailable !== 'undefined') {
      filter.isAvailable = isAvailable === 'true' || isAvailable === true;
    }

    // Featured filter
    if (typeof isFeatured !== 'undefined') {
      filter.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    // Category filter
    if (category && category !== 'All') {
      filter.category = category;
    }

    // Search query
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { name: searchRegex },
        { id: searchRegex },
        { tagline: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
      ];
    }

    // Sorting: default to most recently updated / added products first
    let sortOptions = { updatedAt: -1, createdAt: -1 };
    if (sort) {
      if (sort === 'newest') sortOptions = { updatedAt: -1, createdAt: -1 };
      if (sort === 'oldest') sortOptions = { createdAt: 1, updatedAt: 1 };
      if (sort === 'name-asc') sortOptions = { name: 1 };
      if (sort === 'name-desc') sortOptions = { name: -1 };
    }

    // Pagination (optional)
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    let query = Product.find(filter).sort(sortOptions);

    if (pageNum > 0 && limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    const [products, total] = await Promise.all([
      query.exec(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by id/slug or _id
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res, next) => {
  try {
    const paramId = req.params.id;
    if (!paramId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required.',
      });
    }

    const product = await findProductByIdOrSlug(paramId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID '${paramId}' was not found in the catalog.`,
      });
    }

    // Also fetch related products from same category
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isAvailable: true,
    })
      .limit(3)
      .exec();

    res.status(200).json({
      success: true,
      product,
      relatedProducts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all distinct categories
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = async (req, res, next) => {
  try {
    const categoriesFromDb = await Product.distinct('category');
    const defaultCategories = [
      'Food Preparation Machines',
      'Refrigeration Items',
      'Banking Equipments',
      'Cooking Equipments',
      'Stainless Steel Fabrications',
      'Industrial And Food Service',
    ];

    const merged = Array.from(new Set([...defaultCategories, ...categoriesFromDb])).filter(Boolean);

    res.status(200).json({
      success: true,
      categories: ['All', ...merged],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private (Admin)
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      id: customId,
      name,
      category,
      image,
      images,
      tagline,
      description,
      specs,
      accessories,
      isAvailable,
      isFeatured,
      price,
      offerPrice,
      order,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required.',
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product category is required.',
      });
    }

    // Determine ID / slug
    let productId = customId ? customId.trim() : slugify(name);
    // Check if ID already exists
    let existing = await Product.findOne({ id: productId });
    if (existing) {
      if (customId) {
        return res.status(409).json({
          success: false,
          message: `A product with ID/slug '${productId}' already exists. Please choose a different ID.`,
        });
      } else {
        // Append random suffix for unique auto-generated slug
        productId = `${productId}-${Date.now().toString().slice(-4)}`;
      }
    }

    // Process images array
    let imagesList = Array.isArray(images) && images.length > 0 ? images : [];
    const mainImage = image || (imagesList.length > 0 ? imagesList[0] : '/slider1.webp');
    if (!imagesList.includes(mainImage)) {
      imagesList.unshift(mainImage);
    }

    // Format specs
    let formattedSpecs = [];
    if (Array.isArray(specs)) {
      formattedSpecs = specs
        .filter((s) => s && (s.label || s.value))
        .map((s) => ({
          label: (s.label || '').trim(),
          value: (s.value || '').trim(),
        }));
    }

    // Format accessories
    let formattedAccessories = [];
    if (Array.isArray(accessories)) {
      formattedAccessories = accessories
        .filter((a) => typeof a === 'string' && a.trim() !== '')
        .map((a) => a.trim());
    }

    const parsedPrice =
      price !== undefined && price !== null && price !== '' && !isNaN(Number(price))
        ? Number(price)
        : null;
    const parsedOfferPrice =
      offerPrice !== undefined && offerPrice !== null && offerPrice !== '' && !isNaN(Number(offerPrice))
        ? Number(offerPrice)
        : null;

    const newProduct = new Product({
      id: productId,
      name: name.trim(),
      category: category.trim(),
      image: mainImage,
      images: imagesList,
      tagline: (tagline || '').trim(),
      description: (description || '').trim(),
      specs: formattedSpecs,
      accessories: formattedAccessories,
      price: parsedPrice,
      offerPrice: parsedOfferPrice,
      isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
      isFeatured: typeof isFeatured === 'boolean' ? isFeatured : false,
      order: typeof order === 'number' ? order : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: saved,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing product
 * @route   PUT /api/products/:id
 * @access  Private (Admin)
 */
const updateProduct = async (req, res, next) => {
  try {
    const paramId = req.params.id;
    const product = await findProductByIdOrSlug(paramId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product '${paramId}' not found.`,
      });
    }

    const {
      id: newId,
      name,
      category,
      image,
      images,
      tagline,
      description,
      specs,
      accessories,
      isAvailable,
      isFeatured,
      price,
      offerPrice,
      order,
    } = req.body;

    // Check slug uniqueness if changed
    if (newId && newId.trim() !== product.id) {
      const conflict = await Product.findOne({
        id: newId.trim(),
        _id: { $ne: product._id },
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Product ID/slug '${newId.trim()}' is already in use by another product.`,
        });
      }
      product.id = newId.trim();
    }

    if (name) product.name = name.trim();
    if (category) product.category = category.trim();
    if (typeof tagline !== 'undefined') product.tagline = tagline.trim();
    if (typeof description !== 'undefined') product.description = description.trim();

    if (Array.isArray(images)) {
      product.images = images.filter((img) => typeof img === 'string' && img.trim() !== '');
      if (image && product.images.includes(image)) {
        product.image = image;
      } else if (product.images.length > 0) {
        product.image = product.images[0];
      }
    } else if (image) {
      product.image = image;
      if (!product.images.includes(image)) {
        product.images.unshift(image);
      }
    }

    if (Array.isArray(specs)) {
      product.specs = specs
        .filter((s) => s && (s.label || s.value))
        .map((s) => ({
          label: (s.label || '').trim(),
          value: (s.value || '').trim(),
        }));
    }

    if (Array.isArray(accessories)) {
      product.accessories = accessories
        .filter((a) => typeof a === 'string' && a.trim() !== '')
        .map((a) => a.trim());
    }

    if (typeof isAvailable === 'boolean') product.isAvailable = isAvailable;
    if (typeof isFeatured === 'boolean') product.isFeatured = isFeatured;
    if (typeof order === 'number') product.order = order;

    if (typeof price !== 'undefined') {
      product.price = price !== null && price !== '' && !isNaN(Number(price)) ? Number(price) : null;
    }
    if (typeof offerPrice !== 'undefined') {
      product.offerPrice = offerPrice !== null && offerPrice !== '' && !isNaN(Number(offerPrice)) ? Number(offerPrice) : null;
    }

    product.updatedAt = new Date();
    const updated = await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Quickly update product availability or featured status
 * @route   PATCH /api/products/:id/status
 * @access  Private (Admin)
 */
const updateProductStatus = async (req, res, next) => {
  try {
    const paramId = req.params.id;
    const product = await findProductByIdOrSlug(paramId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product '${paramId}' not found.`,
      });
    }

    const { isAvailable, isFeatured } = req.body;

    if (typeof isAvailable === 'boolean') {
      product.isAvailable = isAvailable;
    }
    if (typeof isFeatured === 'boolean') {
      product.isFeatured = isFeatured;
    }

    product.updatedAt = new Date();
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product status updated successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manage product photos (add, replace, reorder, remove)
 * @route   PUT /api/products/:id/photos
 * @access  Private (Admin)
 */
const manageProductPhotos = async (req, res, next) => {
  try {
    const paramId = req.params.id;
    const product = await findProductByIdOrSlug(paramId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product '${paramId}' not found.`,
      });
    }

    const { action, imageUrl, images, primaryImage, index, newIndex } = req.body;

    // Direct replacement of whole image list (e.g. after reordering or multiple changes)
    if (Array.isArray(images)) {
      product.images = images.filter((u) => typeof u === 'string' && u.trim() !== '');
      if (primaryImage && product.images.includes(primaryImage)) {
        product.image = primaryImage;
      } else if (product.images.length > 0) {
        product.image = product.images[0];
      }
    } else if (action === 'add' && imageUrl) {
      if (!product.images.includes(imageUrl)) {
        product.images.push(imageUrl);
      }
      if (!product.image) product.image = imageUrl;
    } else if (action === 'remove' && imageUrl) {
      product.images = product.images.filter((img) => img !== imageUrl);
      if (product.image === imageUrl) {
        product.image = product.images[0] || '/slider1.webp';
      }
    } else if (action === 'setPrimary' && imageUrl) {
      if (!product.images.includes(imageUrl)) {
        product.images.unshift(imageUrl);
      }
      product.image = imageUrl;
    } else if (action === 'reorder' && typeof index === 'number' && typeof newIndex === 'number') {
      const list = [...product.images];
      if (index >= 0 && index < list.length && newIndex >= 0 && newIndex < list.length) {
        const [moved] = list.splice(index, 1);
        list.splice(newIndex, 0, moved);
        product.images = list;
        product.image = list[0];
      }
    }

    product.updatedAt = new Date();
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product photos updated successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private (Admin)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const paramId = req.params.id;
    const product = await findProductByIdOrSlug(paramId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product '${paramId}' not found.`,
      });
    }

    await Product.deleteOne({ _id: product._id });

    res.status(200).json({
      success: true,
      message: `Product '${product.name}' (${product.id}) deleted successfully.`,
      deletedId: product.id,
      deletedObjectId: product._id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  updateProductStatus,
  manageProductPhotos,
  deleteProduct,
};
