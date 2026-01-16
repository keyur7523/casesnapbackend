// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const {
    sendUserInvitation,
    getUserByToken,
    completeUserRegistration,
    getUsers,
    getUser,
    updateUser,
    approveUser,
    deleteUser
} = require('../controllers/userController');

const { protect, protectOptional } = require('../middleware/auth');
const { loadUserRole, checkPermission } = require('../middleware/rbac');

// Public routes (no authentication required, but authorization check if authenticated)
// Use protectOptional to allow access without token, but check auth if token is provided
router.get('/register/:token', protectOptional, getUserByToken);
router.post('/register/:token', protectOptional, completeUserRegistration);

// Protected routes (authentication required) - Using RBAC with 'user' module
router.post('/invite', protect, loadUserRole, checkPermission('user', 'create'), sendUserInvitation);

// User CRUD routes
router.get('/', protect, loadUserRole, checkPermission('user', 'read'), getUsers);
router.get('/:id', protect, loadUserRole, checkPermission('user', 'read'), getUser);
router.put('/:id', protect, loadUserRole, checkPermission('user', 'update'), updateUser);
router.put('/:id/approve', protect, loadUserRole, checkPermission('user', 'update'), approveUser);
router.delete('/:id', protect, loadUserRole, checkPermission('user', 'delete'), deleteUser);

module.exports = router;
