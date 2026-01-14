// controllers/exampleProtectedController.js
// Example controllers demonstrating permission-based access control

const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Example: Create employee (requires 'create' permission on 'user' module)
 * @route   POST /api/example/employees
 * @access  Private (with user.create permission)
 */
exports.createEmployee = asyncHandler(async (req, res, next) => {
    // This is just an example - actual employee creation logic would go here
    res.status(201).json({
        success: true,
        message: 'Employee created successfully (example)',
        data: {
            employee: {
                name: 'Example Employee',
                createdBy: req.user._id,
                userRole: req.userRole.name
            }
        }
    });
});

/**
 * @desc    Example: Get employees (requires 'read' permission on 'user' module)
 * @route   GET /api/example/employees
 * @access  Private (with user.read permission)
 */
exports.getEmployees = asyncHandler(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'Employees retrieved successfully (example)',
        data: {
            employees: [],
            userRole: req.userRole.name,
            permissions: req.userRole.permissions
        }
    });
});

/**
 * @desc    Example: Update employee (requires 'update' permission on 'user' module)
 * @route   PUT /api/example/employees/:id
 * @access  Private (with user.update permission)
 */
exports.updateEmployee = asyncHandler(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'Employee updated successfully (example)',
        data: {
            employeeId: req.params.id,
            userRole: req.userRole.name
        }
    });
});

/**
 * @desc    Example: Delete employee (requires 'delete' permission on 'user' module)
 * @route   DELETE /api/example/employees/:id
 * @access  Private (with user.delete permission)
 */
exports.deleteEmployee = asyncHandler(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'Employee deleted successfully (example)',
        data: {
            employeeId: req.params.id,
            userRole: req.userRole.name
        }
    });
});

/**
 * @desc    Example: Create client (requires 'create' permission on 'client' module)
 * @route   POST /api/example/clients
 * @access  Private (with client.create permission)
 */
exports.createClient = asyncHandler(async (req, res, next) => {
    res.status(201).json({
        success: true,
        message: 'Client created successfully (example)',
        data: {
            client: {
                name: 'Example Client',
                createdBy: req.user._id,
                userRole: req.userRole.name
            }
        }
    });
});

/**
 * @desc    Example: Get clients (requires 'read' permission on 'client' module)
 * @route   GET /api/example/clients
 * @access  Private (with client.read permission)
 */
exports.getClients = asyncHandler(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'Clients retrieved successfully (example)',
        data: {
            clients: [],
            userRole: req.userRole.name
        }
    });
});

/**
 * @desc    Example: Create case (requires 'create' permission on 'cases' module)
 * @route   POST /api/example/cases
 * @access  Private (with cases.create permission)
 */
exports.createCase = asyncHandler(async (req, res, next) => {
    res.status(201).json({
        success: true,
        message: 'Case created successfully (example)',
        data: {
            case: {
                title: 'Example Case',
                createdBy: req.user._id,
                userRole: req.userRole.name
            }
        }
    });
});

/**
 * @desc    Example: Get cases (requires 'read' permission on 'cases' module)
 * @route   GET /api/example/cases
 * @access  Private (with cases.read permission)
 */
exports.getCases = asyncHandler(async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'Cases retrieved successfully (example)',
        data: {
            cases: [],
            userRole: req.userRole.name
        }
    });
});
