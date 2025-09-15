const express = require('express');
const { registerInitialAdmin } = require('../controllers/authController');

const router = express.Router();

// Define our initial admin registration route
router.post('/register-admin', registerInitialAdmin);

module.exports = router;
