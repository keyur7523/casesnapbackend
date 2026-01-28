const express = require('express');
const { login, logout, registerInitialAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Define our auth routes
router.post('/login', login);
router.post('/logout', protect, logout); // Logout requires authentication
router.post('/register-admin', registerInitialAdmin);

module.exports = router;
