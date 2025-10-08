// middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const ErrorResponse = require('../utils/errorResponse');

// Protect routes
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        console.log('🔐 Token verified for user:', decoded.id);

        // Check if it's an employee or admin user based on role in token
        if (decoded.role === 'employee') {
            // Get employee from token
            req.user = await Employee.findById(decoded.id).populate('organization');
            req.userType = 'employee';
        } else {
            // Get admin user from token
            req.user = await User.findById(decoded.id).populate('organization');
            req.userType = 'admin';
        }

        if (!req.user) {
            return next(new ErrorResponse('No user found with this token', 401));
        }

        next();
    } catch (err) {
        console.error('❌ Token verification failed:', err.message);
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // For employees, check userType, for admins check role
        const userRole = req.userType === 'employee' ? 'employee' : req.user.role;
        
        if (!roles.includes(userRole)) {
            return next(new ErrorResponse(`User role ${userRole} is not authorized to access this route`, 403));
        }
        next();
    };
};
