const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const Admin = require('../models/Admin');
const Product = require('../models/Product');

/**
 * Parse products from frontend/src/data/products.js
 */
const extractFrontendProducts = () => {
  const filePath = path.resolve(__dirname, '../../../frontend/src/data/products.js');
  if (!fs.existsSync(filePath)) {
    throw new Error(`frontend products.js not found at ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Extract image imports
  const importRegex = /import\s+([a-zA-Z0-9_]+)\s+from\s+['"]\.\.\/assets\/Products\/([^'"]+)['"]/g;
  const imageMap = {};
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imageMap[match[1]] = `/images/products/${match[2]}`;
  }

  // Prepare sandbox code
  let jsCode = content;
  jsCode = jsCode.replace(/import\s+.*?;\r?\n/g, '');
  jsCode = jsCode.replace(/export\s+const\s+/g, 'const ');
  const helperIdx = jsCode.indexOf('// Helper functions');
  if (helperIdx !== -1) {
    jsCode = jsCode.slice(0, helperIdx);
  }

  let varDeclarations = '';
  for (const [varName, imgPath] of Object.entries(imageMap)) {
    varDeclarations += `const ${varName} = ${JSON.stringify(imgPath)};\n`;
  }

  const fn = new Function(`${varDeclarations}\n${jsCode}\nreturn { categories, productsList };`);
  const { categories, productsList } = fn();

  return { categories, productsList };
};

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.log('Connected to MongoDB successfully.');

    // 1. Seed Default Admin Account
    console.log('\n--- Checking Admin Account ---');
    let admin = await Admin.findOne({ email: config.adminEmail.toLowerCase().trim() });
    if (!admin) {
      admin = new Admin({
        name: config.adminName,
        email: config.adminEmail.toLowerCase().trim(),
        password: config.adminPassword,
        role: 'superadmin',
      });
      await admin.save();
      console.log(`Initial admin account created: ${admin.email}`);
    } else {
      admin.password = config.adminPassword;
      await admin.save();
      console.log(`Admin account password updated and verified for: ${admin.email}`);
    }

    // 2. Extract & Seed Existing Frontend Products
    console.log('\n--- Seeding Existing Products from frontend/src/data/products.js ---');
    const { productsList } = extractFrontendProducts();
    console.log(`Found ${productsList.length} products in frontend/src/data/products.js`);

    let insertedCount = 0;
    let existingCount = 0;
    const seenIds = new Set();

    for (let i = 0; i < productsList.length; i++) {
      const p = productsList[i];
      let cleanId = (p.id || '').trim();

      // Resolve duplicate IDs in source file cleanly
      if (seenIds.has(cleanId)) {
        if (cleanId === '1DECKS-1-TRAYS-GAS-OVEN') {
          cleanId = '1DECKS-1-TRAYS-GAS-OVEN-ECO';
        } else if (cleanId === 'PIZZA-OVEN-BERJAYA') {
          cleanId = 'ELECTRIC-PIZZA-OVEN-BERJAYA';
        } else {
          cleanId = `${cleanId}-${i + 1}`;
        }
      }
      seenIds.add(cleanId);

      const mainImage = typeof p.image === 'string' ? p.image : '/slider1.webp';
      const imagesArray = [mainImage];

      const productDoc = {
        id: cleanId,
        name: (p.name || '').trim(),
        category: (p.category || 'General').trim(),
        image: mainImage,
        images: imagesArray,
        tagline: (p.tagline || '').trim(),
        description: (p.description || '').trim(),
        specs: Array.isArray(p.specs)
          ? p.specs.map((s) => ({
              label: typeof s === 'object' ? s.label : 'Specification',
              value: typeof s === 'object' ? s.value : String(s),
            }))
          : [],
        accessories: Array.isArray(p.accessories) ? p.accessories : [],
        isAvailable: true,
        isFeatured: i < 6, // mark first 6 as featured by default
        order: i,
      };

      // Safe idempotent upsert: $setOnInsert ensures existing admin edits are NEVER overwritten
      const result = await Product.updateOne(
        { id: cleanId },
        { $setOnInsert: productDoc },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        insertedCount++;
      } else {
        existingCount++;
      }
    }

    console.log(`\nSeed Summary:`);
    console.log(`  New products inserted: ${insertedCount}`);
    console.log(`  Existing products preserved: ${existingCount}`);
    console.log(`  Total catalog items in MongoDB: ${await Product.countDocuments()}`);

    console.log('\nSeeding completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
