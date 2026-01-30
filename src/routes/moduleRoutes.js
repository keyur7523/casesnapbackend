// routes/moduleRoutes.js

const express = require('express');
const router = express.Router();
const {
    getModules,
    createModule,
    updateModule,
    deleteModule
} = require('../controllers/moduleController');

const { protect, protectOptional } = require('../middleware/auth');
const { loadUserRole } = require('../middleware/rbac');

// Optional auth: if Bearer token sent and user is SUPER_ADMIN, modules include "assignee" for client/cases
router.get('/', protectOptional, getModules);

// Protected routes - require authentication
router.use(protect);
router.use(loadUserRole);

// Admin-only routes for module management
router.post('/', createModule);
router.put('/:moduleId', updateModule);
router.delete('/:moduleId', deleteModule);

module.exports = router;
