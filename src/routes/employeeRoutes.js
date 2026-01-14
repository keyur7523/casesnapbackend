const express = require('express');
const {
    sendEmployeeInvitation,
    getEmployeeByToken,
    completeEmployeeRegistration,
    getEmployees,
    getEmployee,
    registerEmployee,
    updateEmployeeStatus,
    getEmployeesByStatus,
    getEmployeesForAdmin,
    updateEmployeeByAdmin,
    softDeleteEmployeeByAdmin,
    restoreEmployeeByAdmin,
    archiveEmployeeByAdmin,
    unarchiveEmployeeByAdmin,
    getEmployeeProfile,
    updateEmployeeProfile,
    changeEmployeePassword
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const { loadUserRole, checkPermission } = require('../middleware/rbac');

const router = express.Router();

// Public routes (no authentication required)
router.get('/register/:token', getEmployeeByToken);
router.post('/register/:token', completeEmployeeRegistration);

// Protected routes (authentication required) - Using RBAC with 'user' module
// Employees are now managed through the user/role system, not as a separate module
router.post('/invite', protect, loadUserRole, checkPermission('user', 'create'), sendEmployeeInvitation);
router.post('/register', protect, loadUserRole, checkPermission('user', 'create'), registerEmployee);
router.get('/', protect, loadUserRole, checkPermission('user', 'read'), getEmployees);
router.get('/status/:status', protect, loadUserRole, checkPermission('user', 'read'), getEmployeesByStatus);
router.get('/:id', protect, loadUserRole, checkPermission('user', 'read'), getEmployee);
router.post('/:id/status', protect, loadUserRole, checkPermission('user', 'update'), updateEmployeeStatus);

// Admin-only employee management routes - Using RBAC with 'user' module
router.get('/admin/all', protect, loadUserRole, checkPermission('user', 'read'), getEmployeesForAdmin);
router.get('/admin/:id', protect, loadUserRole, checkPermission('user', 'read'), getEmployee);
router.put('/admin/:id', protect, loadUserRole, checkPermission('user', 'update'), updateEmployeeByAdmin);
router.delete('/admin/:id', protect, loadUserRole, checkPermission('user', 'delete'), softDeleteEmployeeByAdmin);
router.put('/admin/:id/restore', protect, loadUserRole, checkPermission('user', 'update'), restoreEmployeeByAdmin);
router.post('/admin/:id/archive', protect, loadUserRole, checkPermission('user', 'update'), archiveEmployeeByAdmin);
router.put('/admin/:id/unarchive', protect, loadUserRole, checkPermission('user', 'update'), unarchiveEmployeeByAdmin);

// Employee self-access routes (employees can only access their own data)
router.get('/profile', protect, authorize('employee'), getEmployeeProfile);
router.put('/profile', protect, authorize('employee'), updateEmployeeProfile);
router.put('/profile/password', protect, authorize('employee'), changeEmployeePassword);

module.exports = router;
