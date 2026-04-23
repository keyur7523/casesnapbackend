const express = require('express');
const { initializeSetup, getOnboardingStatus } = require('../controllers/setupController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/initialize', initializeSetup);

router.get('/onboarding-status', protect, getOnboardingStatus);

module.exports = router;