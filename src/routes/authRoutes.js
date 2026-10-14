const express = require('express');
const router = express.Router();
const { login, getMe, logout } = require('../controllers/authController');
const { protectAdmin } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protectAdmin, getMe);

module.exports = router;
