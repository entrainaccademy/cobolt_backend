const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config/env');

const protectAdmin = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied: No authentication token provided.',
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const admin = await Admin.findById(decoded.id).select('-password');

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Access denied: Admin user not found or has been revoked.',
        });
      }

      req.admin = admin;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { protectAdmin };
