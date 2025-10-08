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

const router = express.Router();

// Public routes (no authentication required)
router.get('/register/:token', getEmployeeByToken);
router.post('/register/:token', completeEmployeeRegistration);

// Protected routes (authentication required)
router.post('/invite', protect, authorize('admin'), sendEmployeeInvitation);
router.post('/register', protect, authorize('admin'), registerEmployee);
router.get('/', protect, authorize('admin'), getEmployees);
router.get('/status/:status', protect, authorize('admin'), getEmployeesByStatus);
router.get('/:id', protect, authorize('admin'), getEmployee);
router.post('/:id/status', protect, authorize('admin'), updateEmployeeStatus);

// Admin-only employee management routes
router.get('/admin/all', protect, authorize('admin'), getEmployeesForAdmin);
router.put('/admin/:id', protect, authorize('admin'), updateEmployeeByAdmin);
router.delete('/admin/:id', protect, authorize('admin'), softDeleteEmployeeByAdmin);
router.put('/admin/:id/restore', protect, authorize('admin'), restoreEmployeeByAdmin);
router.post('/admin/:id/archive', protect, authorize('admin'), archiveEmployeeByAdmin);
router.put('/admin/:id/unarchive', protect, authorize('admin'), unarchiveEmployeeByAdmin);

// Employee self-access routes (employees can only access their own data)
router.get('/profile', protect, authorize('employee'), getEmployeeProfile);
router.put('/profile', protect, authorize('employee'), updateEmployeeProfile);
router.put('/profile/password', protect, authorize('employee'), changeEmployeePassword);

module.exports = router;
