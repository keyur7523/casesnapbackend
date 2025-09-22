// controllers/employeeController.js

const Employee = require('../models/Employee');
const Organization = require('../models/Organization');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const crypto = require('crypto');
const { sendEmployeeInvitation } = require('../utils/emailService');

// @desc      Send employee invitation
// @route     POST /api/employees/invite
// @access    Private (Admin only)
exports.sendEmployeeInvitation = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email } = req.body;
    const organizationId = req.user.organization; // From JWT token

    console.log('📧 Sending employee invitation...');
    console.log('👤 Employee data:', { firstName, lastName, email });
    console.log('🏢 Organization ID:', organizationId);

    // Validate required fields
    if (!firstName || !lastName || !email) {
        return next(new ErrorResponse('First name, last name, and email are required', 400));
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ 
        email: email.toLowerCase(),
        organization: organizationId 
    });

    if (existingEmployee) {
        if (existingEmployee.invitationStatus === 'completed') {
            return next(new ErrorResponse('An employee with this email already exists in your organization', 400));
        } else if (existingEmployee.invitationStatus === 'pending') {
            return next(new ErrorResponse('An invitation has already been sent to this email address', 400));
        }
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    
    // Get organization details
    const organization = await Organization.findById(organizationId);
    if (!organization) {
        return next(new ErrorResponse('Organization not found', 404));
    }

    // Create or update employee record
    let employee;
    if (existingEmployee) {
        // Update existing pending invitation
        employee = await Employee.findByIdAndUpdate(
            existingEmployee._id,
            {
                firstName,
                lastName,
                email: email.toLowerCase(),
                invitationToken,
                invitationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                invitationStatus: 'pending'
            },
            { new: true, runValidators: true }
        );
        console.log('✅ Updated existing employee invitation');
    } else {
        // Create new employee record
        employee = await Employee.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            organization: organizationId,
            invitationToken,
            invitationStatus: 'pending'
        });
        console.log('✅ Created new employee invitation');
    }

    // Generate invitation link
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/employee/register?token=${invitationToken}`;
    
    console.log('🔗 Invitation link generated:', invitationLink);

    // Send email with invitation link
    const emailResult = await sendEmployeeInvitation({
        to: email,
        firstName,
        lastName,
        organizationName: organization.companyName,
        invitationLink
    });

    if (emailResult.success) {
        console.log('✅ Email sent successfully');
    } else {
        console.log('⚠️ Email sending failed:', emailResult.message || emailResult.error);
    }

    res.status(201).json({
        success: true,
        message: 'Employee invitation sent successfully',
        data: {
            employee: {
                id: employee._id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                invitationStatus: employee.invitationStatus,
                invitationExpires: employee.invitationExpires
            },
            invitationLink // For testing purposes
        }
    });
});

// @desc      Get employee by invitation token
// @route     GET /api/employees/register/:token
// @access    Public
exports.getEmployeeByToken = asyncHandler(async (req, res, next) => {
    const { token } = req.params;

    console.log('🔍 Looking up employee by token:', token);

    const employee = await Employee.findOne({ 
        invitationToken: token,
        invitationStatus: 'pending'
    }).populate('organization', 'companyName companyEmail');

    if (!employee) {
        return next(new ErrorResponse('Invalid or expired invitation link', 400));
    }

    // Check if invitation has expired
    if (employee.invitationExpires < new Date()) {
        employee.invitationStatus = 'expired';
        await employee.save();
        return next(new ErrorResponse('Invitation link has expired', 400));
    }

    console.log('✅ Employee found:', {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        organization: employee.organization.companyName
    });

    res.status(200).json({
        success: true,
        data: {
            employee: {
                id: employee._id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                organization: employee.organization
            }
        }
    });
});

// @desc      Complete employee registration
// @route     POST /api/employees/register/:token
// @access    Public
exports.completeEmployeeRegistration = asyncHandler(async (req, res, next) => {
    const { token } = req.params;
    const { phone, address, gender, dateOfBirth } = req.body;

    console.log('📝 Completing employee registration...');
    console.log('🔑 Token:', token);
    console.log('📋 Registration data:', { phone, address, gender, dateOfBirth });

    // Validate required fields
    if (!phone || !address || !gender || !dateOfBirth) {
        return next(new ErrorResponse('Phone, address, gender, and date of birth are required', 400));
    }

    // Find employee by token
    const employee = await Employee.findOne({ 
        invitationToken: token,
        invitationStatus: 'pending'
    }).populate('organization');

    if (!employee) {
        return next(new ErrorResponse('Invalid or expired invitation link', 400));
    }

    // Check if invitation has expired
    if (employee.invitationExpires < new Date()) {
        employee.invitationStatus = 'expired';
        await employee.save();
        return next(new ErrorResponse('Invitation link has expired', 400));
    }

    // Update employee with registration details
    employee.phone = phone;
    employee.address = address;
    employee.gender = gender;
    employee.dateOfBirth = new Date(dateOfBirth);
    employee.invitationStatus = 'completed';
    employee.invitationToken = undefined; // Remove token after completion

    await employee.save();

    console.log('✅ Employee registration completed:', {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        organization: employee.organization.companyName
    });

    res.status(200).json({
        success: true,
        message: 'Employee registration completed successfully',
        data: {
            employee: {
                id: employee._id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                phone: employee.phone,
                address: employee.address,
                gender: employee.gender,
                dateOfBirth: employee.dateOfBirth,
                organization: employee.organization
            }
        }
    });
});

// @desc      Get all employees for an organization
// @route     GET /api/employees
// @access    Private (Admin only)
exports.getEmployees = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;

    console.log('📋 Fetching employees for organization:', organizationId);

    const employees = await Employee.find({ organization: organizationId })
        .select('-invitationToken') // Exclude sensitive data
        .sort({ createdAt: -1 });

    console.log(`✅ Found ${employees.length} employees`);

    res.status(200).json({
        success: true,
        count: employees.length,
        data: employees
    });
});

// @desc      Get single employee
// @route     GET /api/employees/:id
// @access    Private (Admin only)
exports.getEmployee = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;

    console.log('🔍 Fetching employee:', id);

    const employee = await Employee.findOne({ 
        _id: id, 
        organization: organizationId 
    }).select('-invitationToken');

    if (!employee) {
        return next(new ErrorResponse('Employee not found', 404));
    }

    console.log('✅ Employee found:', employee.fullName);

    res.status(200).json({
        success: true,
        data: employee
    });
});
