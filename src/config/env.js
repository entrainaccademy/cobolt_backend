const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'cobolt_default_jwt_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@cobolt.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'AdminCobolt#2026',
  adminName: process.env.ADMIN_NAME || 'Cobolt Administrator',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  cloudinary: {
    cloudName: (process.env.CLOUDINARY_CLOUD_NAME || '').trim().replace(/^["']|["']$/g, '').trim(),
    apiKey: (process.env.CLOUDINARY_API_KEY || '').trim().replace(/^["']|["']$/g, '').trim(),
    apiSecret: (process.env.CLOUDINARY_API_SECRET || '').trim().replace(/^["']|["']$/g, '').trim(),
    url: (process.env.CLOUDINARY_URL || '').trim().replace(/^["']|["']$/g, '').trim(),
  },
};

if (!config.mongoUri) {
  console.warn('WARNING: MONGODB_URI is not set in backend/.env');
}

module.exports = config;
