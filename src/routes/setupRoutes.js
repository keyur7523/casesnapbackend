const express = require('express');
const { initializeSetup } = require('../controllers/setupController'); // We'll create this controller next

const router = express.Router();

router.post('/initialize', initializeSetup); // The combined setup endpoint

module.exports = router;