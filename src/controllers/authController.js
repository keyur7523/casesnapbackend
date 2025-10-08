// controllers/authController.js

const User = require('../models/User'); // Import our User model
const Employee = require('../models/Employee'); // Import Employee model
const asyncHandler = require('../middleware/asyncHandler'); // We'll create this next for error handling
const ErrorResponse = require('../utils/errorResponse'); // We'll create this too
const jwt = require('jsonwebtoken');

// @desc      Login user (Admin or Employee)
// @route     POST /api/auth/login
// @access    Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // 1. Validate email and password
    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    console.log('🔐 Attempting login for:', email);

    // 2. First try to find admin user
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('organization');
    let userType = 'admin';

    // 3. If no admin user found, try to find employee
    if (!user) {
        user = await Employee.findOne({ email: email.toLowerCase() }).select('+password').populate('organization');
        userType = 'employee';
    }

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 4. Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 5. Check if employee is active (only for employees)
    if (userType === 'employee') {
        if (user.status !== 'active') {
            return next(new ErrorResponse('Your account is not active. Please contact your administrator.', 401));
        }
    }

    // 6. Create token with appropriate role
    const token = jwt.sign(
        { 
            id: user._id,
            email: user.email,
            organization: user.organization,
            role: userType
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    console.log('✅ Login successful for:', userType, user.email);

    // 7. Send response with token and user data
    if (userType === 'employee') {
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                address: user.address,
                gender: user.gender,
                dateOfBirth: user.dateOfBirth,
                age: user.age,
                aadharCardNumber: user.aadharCardNumber,
                employeeType: user.employeeType,
                advocateLicenseNumber: user.advocateLicenseNumber,
                internYear: user.internYear,
                salary: user.salary,
                department: user.department,
                position: user.position,
                startDate: user.startDate,
                emergencyContactName: user.emergencyContactName,
                emergencyContactPhone: user.emergencyContactPhone,
                emergencyContactRelation: user.emergencyContactRelation,
                organization: user.organization,
                adminId: user.adminId,
                status: user.status,
                role: 'employee',
                createdAt: user.createdAt
            }
        });
    } else {
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                role: user.role,
                organization: user.organization
            }
        });
    }
});

// @desc      Register Initial Admin User
// @route     POST /api/auth/register-admin
// @access    Public (only for initial setup)
exports.registerInitialAdmin = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    // 1. Check if an admin user already exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
        return next(new ErrorResponse('An admin user already exists. Initial setup already completed.', 400));
    }

    // 2. Create the new user with an 'admin' role
    const user = await User.create({
        username,
        email,
        password,
        role: 'admin' // Force role to admin for the setup process
    });

    // 3. Send response
    // For now, we'll just send success message. Later we'll send a token.
    res.status(201).json({
        success: true,
        message: 'Initial admin user registered successfully.'
        // user: { // Optionally, you can send back non-sensitive user data
        //     id: user._id,
        //     username: user.username,
        //     email: user.email,
        //     role: user.role
        // }
    });
});