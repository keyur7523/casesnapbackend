// routes/exampleRoutes.js
// Example routes demonstrating permission-based access control

const express = require('express');
const router = express.Router();
const {
    createEmployee,
    getEmployees,
    updateEmployee,
    deleteEmployee,
    createClient,
    getClients,
    createCase,
    getCases
} = require('../controllers/exampleProtectedController');

const { protect } = require('../middleware/auth');
const { loadUserRole, checkPermission } = require('../middleware/rbac');

// All routes require authentication and role loading
router.use(protect);
router.use(loadUserRole);

// Employee routes (now using 'user' module since employees are managed through user/role system)
router.post(
    '/employees',
    checkPermission('user', 'create'),
    createEmployee
);

router.get(
    '/employees',
    checkPermission('user', 'read'),
    getEmployees
);

router.put(
    '/employees/:id',
    checkPermission('user', 'update'),
    updateEmployee
);

router.delete(
    '/employees/:id',
    checkPermission('user', 'delete'),
    deleteEmployee
);

// Client routes
router.post(
    '/clients',
    checkPermission('client', 'create'),
    createClient
);

router.get(
    '/clients',
    checkPermission('client', 'read'),
    getClients
);

// Case routes
router.post(
    '/cases',
    checkPermission('cases', 'create'),
    createCase
);

router.get(
    '/cases',
    checkPermission('cases', 'read'),
    getCases
);

module.exports = router;
