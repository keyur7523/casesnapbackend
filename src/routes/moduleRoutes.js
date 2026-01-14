// routes/moduleRoutes.js

const express = require('express');
const router = express.Router();
const {
    getModules,
    createModule,
    updateModule,
    deleteModule
} = require('../controllers/moduleController');

const { protect } = require('../middleware/auth');
const { loadUserRole } = require('../middleware/rbac');

// Public route - anyone can get modules list (needed for role creation forms)
router.get('/', getModules);

// Protected routes - require authentication
router.use(protect);
router.use(loadUserRole);

// Admin-only routes for module management
router.post('/', createModule);
router.put('/:moduleId', updateModule);
router.delete('/:moduleId', deleteModule);

module.exports = router;
