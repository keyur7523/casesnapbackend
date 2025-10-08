const express = require('express');
const { login, registerInitialAdmin } = require('../controllers/authController');

const router = express.Router();

// Define our auth routes
router.post('/login', login);
router.post('/register-admin', registerInitialAdmin);

module.exports = router;
