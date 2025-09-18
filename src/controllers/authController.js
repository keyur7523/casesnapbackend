// controllers/authController.js

const User = require('../models/User'); // Import our User model
const asyncHandler = require('../middleware/asyncHandler'); // We'll create this next for error handling
const ErrorResponse = require('../utils/errorResponse'); // We'll create this too

// @desc      Login user
// @route     POST /api/auth/login
// @access    Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // 1. Validate email and password
    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // 2. Check for user (include password field for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password').populate('organization');

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 3. Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 4. Create token
    const token = user.getSignedJwtToken();

    // 5. Send response with token and user data
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