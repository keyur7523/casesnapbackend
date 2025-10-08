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
    
    console.log('🚀 Starting organization setup process...');
    console.log('📋 Organization data received:', {
        companyName: orgData?.companyName,
        companyEmail: orgData?.companyEmail,
        industry: orgData?.industry
    });
    console.log('👤 Super Admin data received:', {
        firstName: adminData?.firstName,
        lastName: adminData?.lastName,
        email: adminData?.email
    });

    // -----------------------------------------------------------
    // 1. Initial Checks (Allow multiple organizations)
    // -----------------------------------------------------------
    // Check if the email is already used for an admin user
    console.log('🔍 Checking for existing admin with email:', adminData.email);
    const existingAdminWithEmail = await User.findOne({ 
        email: adminData.email,
        role: 'admin' 
    });
    if (existingAdminWithEmail) {
        console.log('❌ Admin user with this email already exists');
        return next(new ErrorResponse('This email address is already registered as an admin user. Please use a different email address.', 400));
    }
    console.log('✅ Email is available for admin user');

    // Check if organization name is already taken
    console.log('🔍 Checking for existing organization with name:', orgData.companyName);
    const existingOrgWithName = await Organization.findOne({ 
        companyName: orgData.companyName 
    });
    if (existingOrgWithName) {
        console.log('❌ Organization with this name already exists');
        return next(new ErrorResponse('An organization with this name already exists. Please choose a different company name.', 400));
    }
    console.log('✅ Organization name is available');

    // -----------------------------------------------------------
    // 2. Validate Frontend Data (basic backend validation, Mongoose will do more)
    // -----------------------------------------------------------
    if (!orgData || !adminData) {
        return next(new ErrorResponse('Organization and Super Admin data are required.', 400));
    }

    // You might want more specific checks here that mirror frontend validateOrganizationData
    // and validateSuperAdminData before Mongoose schema validation.
    if (adminData.password !== adminData.confirmPassword) {
        return next(new ErrorResponse('Password and confirm password do not match. Please make sure both passwords are identical.', 400));
    }
    // Note: Mongoose will handle the rest of the validation (required, unique, email format, etc.)

    // -----------------------------------------------------------
    // 3. Create Organization
    // -----------------------------------------------------------
    console.log('🏢 Creating organization...');
    let organization;
    try {
        organization = await Organization.create(orgData);
        console.log('✅ Organization created successfully:', {
            id: organization._id,
            name: organization.companyName,
            email: organization.companyEmail
        });
    } catch (err) {
        console.error('❌ Error creating organization:', err);
        // Pass Mongoose validation errors
        return next(err); // This will be caught by our general error handler
    }

    // -----------------------------------------------------------
    // 4. Create Super Admin User and Link to Organization
    // -----------------------------------------------------------
    console.log('👤 Creating super admin user...');
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
        console.log('✅ Super admin user created successfully:', {
            id: superAdminUser._id,
            name: `${superAdminUser.firstName} ${superAdminUser.lastName}`,
            email: superAdminUser.email,
            role: superAdminUser.role,
            organizationId: superAdminUser.organization
        });
    } catch (err) {
        // If user creation fails, we should ideally roll back the organization creation
        // For simplicity now, we're just letting it fail. A transaction would be better here.
        console.error('❌ Error creating super admin user:', err);
        console.log('🧹 Cleaning up organization due to user creation failure...');
        // If org creation succeeded but user failed, delete the org to allow retry
        await Organization.findByIdAndDelete(organization._id);
        console.log('✅ Organization cleaned up');
        return next(err);
    }

    // -----------------------------------------------------------
    // 5. Update Organization with Super Admin reference
    // -----------------------------------------------------------
    console.log('🔗 Linking super admin to organization...');
    organization.superAdmin = superAdminUser._id;
    await organization.save(); // Save the updated organization
    console.log('✅ Organization updated with super admin reference');

    // -----------------------------------------------------------
    // 6. Generate and Send JWT Token
    // -----------------------------------------------------------
    console.log('🔐 Generating JWT token...');
    const token = superAdminUser.getSignedJwtToken(); // We'll add this method to the User model
    console.log('✅ JWT token generated successfully');

    console.log('🎉 Organization setup completed successfully!');
    console.log('📊 Final Summary:', {
        organization: {
            id: organization._id,
            name: organization.companyName,
            email: organization.companyEmail
        },
        superAdmin: {
            id: superAdminUser._id,
            name: `${superAdminUser.firstName} ${superAdminUser.lastName}`,
            email: superAdminUser.email
        }
    });

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