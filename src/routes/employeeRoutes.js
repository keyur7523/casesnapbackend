const express = require('express');
const {
    sendEmployeeInvitation,
    getEmployeeByToken,
    completeEmployeeRegistration,
    getEmployees,
    getEmployee,
    registerEmployee,
    updateEmployeeStatus,
    getEmployeesByStatus
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
router.put('/:id/status', protect, authorize('admin'), updateEmployeeStatus);

module.exports = router;
