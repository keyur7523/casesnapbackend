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
    let user = await User.findOne({ email: email.toLowerCase() })
        .select('+password');
    let userType = 'admin';
    
    // Populate role and organization after finding the user
    if (user) {
        await user.populate({
            path: 'role',
            select: 'name priority permissions isSystemRole description'
        });
        await user.populate('organization', 'companyName companyEmail _id subscriptionPlan');
    }

    // 3. If no admin user found, try to find employee
    if (!user) {
        user = await Employee.findOne({ email: email.toLowerCase() })
            .select('+password')
            .populate('organization', 'companyName companyEmail _id subscriptionPlan');
        userType = 'employee';
    }

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 4. Check if password is set (for employees who haven't completed registration)
    if (!user.password) {
        return next(new ErrorResponse('Password not set. Please complete your registration.', 401));
    }

    // 5. Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // 6. Check if employee is active (only for employees)
    if (userType === 'employee') {
        if (user.status !== 'active') {
            return next(new ErrorResponse('User is not active', 401));
        }
    }

    // 6b. Check if admin user is approved (only for admin users)
    if (userType === 'admin') {
        if (user.status !== 'approved') {
            return next(new ErrorResponse('Your account is pending approval. Please wait for admin approval before logging in.', 401));
        }
    }

    // 7. Create token with appropriate role
    // For admin users, include role ID in token if available
    let roleId = userType;
    if (userType === 'admin' && user.role) {
        // Get role ID whether it's populated or not
        if (typeof user.role === 'object' && user.role._id) {
            roleId = user.role._id;
        } else if (typeof user.role === 'string') {
            roleId = user.role;
        } else if (Buffer.isBuffer(user.role)) {
            roleId = user.role.toString('hex');
        }
    }
    
    const tokenPayload = {
        id: user._id,
        email: user.email,
        organization: user.organization?._id || user.organization,
        role: roleId
    };
    
    const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    console.log('✅ Login successful for:', userType, user.email);

    // 8. Send response with token and user data
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
                subscriptionPlan: user.organization?.subscriptionPlan || null,
                createdAt: user.createdAt
            }
        });
    } else {
        // Ensure role is populated if it wasn't already
        if (user.role && (!user.role.name || typeof user.role === 'string' || Buffer.isBuffer(user.role))) {
            const Role = require('../models/Role');
            let roleId = user.role;
            
            // Convert Buffer to string if needed
            if (Buffer.isBuffer(roleId)) {
                roleId = roleId.toString('hex');
            } else if (typeof roleId === 'object' && roleId.toString) {
                roleId = roleId.toString();
            }
            
            if (roleId) {
                const role = await Role.findById(roleId);
                if (role) {
                    user.role = role;
                }
            }
        }
        
        // Format response to match setup response exactly
        const responseData = {
            success: true,
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                organizationId: user.organization?._id || user.organization || null,
                subscriptionPlan: user.organization?.subscriptionPlan || null
            }
        };

        // Add role details if available
        if (user.role && typeof user.role === 'object' && user.role.name) {
            responseData.user.role = {
                id: user.role._id,
                name: user.role.name,
                priority: user.role.priority,
                permissions: user.role.permissions || [],
                isSystemRole: user.role.isSystemRole || false,
                description: user.role.description || null
            };
        }

        res.status(200).json(responseData);
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