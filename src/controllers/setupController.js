// controllers/setupController.js

const Organization = require('../models/Organization');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const jwt = require('jsonwebtoken'); // For generating tokens

// @desc      Initialize Organization and Super Admin
// @route     POST /api/setup/initialize
// @access    Public (only for initial setup)
exports.initializeSetup = asyncHandler(async (req, res, next) => {
    const { organization: orgData, superAdmin: adminData } = req.body;

    // -----------------------------------------------------------
    // 1. Initial Checks (Prevent multiple setups)
    // -----------------------------------------------------------
    const existingOrg = await Organization.findOne();
    if (existingOrg) {
        return next(new ErrorResponse('Organization already set up. Cannot re-initialize.', 400));
    }

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
        return next(new ErrorResponse('Admin user already exists. Cannot re-initialize.', 400));
    }

    // -----------------------------------------------------------
    // 2. Validate Frontend Data (basic backend validation, Mongoose will do more)
    // -----------------------------------------------------------
    if (!orgData || !adminData) {
        return next(new ErrorResponse('Organization and Super Admin data are required.', 400));
    }

    // You might want more specific checks here that mirror frontend validateOrganizationData
    // and validateSuperAdminData before Mongoose schema validation.
    if (adminData.password !== adminData.confirmPassword) {
        return next(new ErrorResponse('Passwords do not match.', 400));
    }
    // Note: Mongoose will handle the rest of the validation (required, unique, email format, etc.)

    // -----------------------------------------------------------
    // 3. Create Organization
    // -----------------------------------------------------------
    let organization;
    try {
        organization = await Organization.create(orgData);
    } catch (err) {
        console.error('Error creating organization:', err);
        // Pass Mongoose validation errors
        return next(err); // This will be caught by our general error handler
    }

    // -----------------------------------------------------------
    // 4. Create Super Admin User and Link to Organization
    // -----------------------------------------------------------
    let superAdminUser;
    try {
        superAdminUser = await User.create({
            username: adminData.email, // Using email as username per frontend login
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            email: adminData.email,
            phone: adminData.phone,
            password: adminData.password,
            role: 'admin', // Explicitly set role to admin
            organization: organization._id // Link to the newly created organization
        });
    } catch (err) {
        // If user creation fails, we should ideally roll back the organization creation
        // For simplicity now, we're just letting it fail. A transaction would be better here.
        console.error('Error creating super admin user:', err);
        // If org creation succeeded but user failed, delete the org to allow retry
        await Organization.findByIdAndDelete(organization._id);
        return next(err);
    }

    // -----------------------------------------------------------
    // 5. Update Organization with Super Admin reference
    // -----------------------------------------------------------
    organization.superAdmin = superAdminUser._id;
    await organization.save(); // Save the updated organization

    // -----------------------------------------------------------
    // 6. Generate and Send JWT Token
    // -----------------------------------------------------------
    const token = superAdminUser.getSignedJwtToken(); // We'll add this method to the User model

    res.status(201).json({
        success: true,
        message: 'Organization and Super Admin initialized successfully.',
        token, // Send the token for immediate login
        user: { // Optionally send back basic user info
            id: superAdminUser._id,
            firstName: superAdminUser.firstName,
            lastName: superAdminUser.lastName,
            email: superAdminUser.email,
            role: superAdminUser.role,
            organizationId: organization._id
        }
    });
});