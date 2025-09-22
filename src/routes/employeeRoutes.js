const express = require('express');
const {
    sendEmployeeInvitation,
    getEmployeeByToken,
    completeEmployeeRegistration,
    getEmployees,
    getEmployee
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.get('/register/:token', getEmployeeByToken);
router.post('/register/:token', completeEmployeeRegistration);

// Protected routes (authentication required)
router.post('/invite', protect, authorize('admin'), sendEmployeeInvitation);
router.get('/', protect, authorize('admin'), getEmployees);
router.get('/:id', protect, authorize('admin'), getEmployee);

module.exports = router;
