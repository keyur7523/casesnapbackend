// controllers/employeeController.js

const Employee = require('../models/Employee');
const Organization = require('../models/Organization');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const crypto = require('crypto');
const { sendEmployeeInvitation } = require('../utils/emailService');
const jwt = require('jsonwebtoken');

// @desc      Send employee invitation
// @route     POST /api/employees/invite
// @access    Private (Admin only)
exports.sendEmployeeInvitation = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email, salary } = req.body;
    const organizationId = req.user.organization; // From JWT token

    console.log('📧 Sending employee invitation...');
    console.log('👤 Employee data:', { firstName, lastName, email, salary });
    console.log('🏢 Organization ID:', organizationId);

    // Validate required fields
    if (!firstName || !lastName || !email || !salary) {
        return next(new ErrorResponse('First name, last name, email, and salary are required', 400));
    }

    // Validate salary is a valid number
    if (isNaN(salary) || salary < 0) {
        return next(new ErrorResponse('Salary must be a valid positive number', 400));
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
                salary,
                adminId: req.user._id,
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
            salary,
            adminId: req.user._id,
            organization: organizationId,
            invitationToken,
            invitationStatus: 'pending'
        });
        console.log('✅ Created new employee invitation');
    }

    // Generate invitation link with all required data
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/employees/register?token=${invitationToken}&employeeName=${encodeURIComponent(firstName + ' ' + lastName)}&organizationName=${encodeURIComponent(organization.companyName)}&adminName=${encodeURIComponent(req.user.firstName + ' ' + req.user.lastName)}&adminId=${req.user._id}&employeeEmail=${encodeURIComponent(email)}&salary=${salary}`;
    
    console.log('🔗 Invitation link generated:', invitationLink);

    // Send email with invitation link using SMTP
    const emailResult = await sendEmployeeInvitation({
        to: email,
        firstName,
        lastName,
        organizationName: organization.companyName,
        companyEmail: organization.companyEmail,
        adminName: `${req.user.firstName} ${req.user.lastName}`,
        invitationLink
    });

    if (emailResult.success) {
        console.log('✅ Email sent successfully via SMTP');
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
                salary: employee.salary,
                invitationStatus: employee.invitationStatus,
                invitationExpires: employee.invitationExpires
            },
            invitationLink // For testing purposes
        }
    });
});

// @desc      Get employee by invitation tokenp
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
                salary: employee.salary,
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

    // Validate required fields for completion
    if (!phone || !address || !gender || !dateOfBirth) {
        return next(new ErrorResponse('Phone, address, gender, and date of birth are required to complete registration', 400));
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
                salary: employee.salary,
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

// @desc      Register new employee (Direct registration)
// @route     POST /api/employees/register
// @access    Private (Admin only)
exports.registerEmployee = asyncHandler(async (req, res, next) => {
    const {
        firstName,
        lastName,
        email,
        phone,
        address,
        gender,
        dateOfBirth,
        age,
        aadharCardNumber,
        employeeType,
        advocateLicenseNumber,
        internYear,
        salary,
        department,
        position,
        startDate,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        password,
        confirmPassword
    } = req.body;

    const adminId = req.user._id; // From JWT token
    const organizationId = req.user.organization; // From JWT token

    console.log('📝 Registering new employee...');
    console.log('👤 Employee data:', { firstName, lastName, email, employeeType });
    console.log('👨‍💼 Admin ID:', adminId);
    console.log('🏢 Organization ID:', organizationId);

    // Validate required fields
    const requiredFields = [
        'firstName', 'lastName', 'email', 'phone', 'address', 'gender', 
        'dateOfBirth', 'age', 'aadharCardNumber', 'employeeType', 'salary', 
        'department', 'position', 'startDate', 'emergencyContactName', 
        'emergencyContactPhone', 'emergencyContactRelation', 'password', 'confirmPassword'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
        return next(new ErrorResponse(`Missing required fields: ${missingFields.join(', ')}`, 400));
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
        return next(new ErrorResponse('Password and confirm password do not match', 400));
    }

    // Validate employee type specific fields
    if (employeeType === 'advocate' && !advocateLicenseNumber) {
        return next(new ErrorResponse('Advocate license number is required for advocate employees', 400));
    }

    if (employeeType === 'intern' && !internYear) {
        return next(new ErrorResponse('Intern year is required for intern employees', 400));
    }

    // Validate age calculation
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
    }

    if (calculatedAge !== age) {
        return next(new ErrorResponse('Age does not match the calculated age from date of birth', 400));
    }

    // Find existing employee by email (invited employee)
    const existingEmployee = await Employee.findOne({
        email: email.toLowerCase(),
        organization: organizationId
    });

    if (!existingEmployee) {
        return next(new ErrorResponse('No invitation found for this email address. Please contact your admin to send an invitation.', 400));
    }

    // Check if employee has already completed registration
    if (existingEmployee.invitationStatus === 'completed') {
        if (existingEmployee.status === 'active') {
            return next(new ErrorResponse('You have already completed your registration and your account is active. You cannot register again.', 400));
        } else if (existingEmployee.status === 'pending') {
            return next(new ErrorResponse('You have already completed your registration. Your account is pending admin approval. Please contact your admin for status updates.', 400));
        } else {
            return next(new ErrorResponse('You have already completed your registration. Please contact your admin for account status.', 400));
        }
    }

    // Check if invitation has expired
    if (existingEmployee.invitationStatus === 'expired') {
        return next(new ErrorResponse('Your invitation has expired. Please contact your admin to send a new invitation.', 400));
    }

    // Get organization details
    const organization = await Organization.findById(organizationId);
    if (!organization) {
        return next(new ErrorResponse('Organization not found', 404));
    }

    // Update existing employee with registration details
    existingEmployee.phone = phone;
    existingEmployee.address = address;
    existingEmployee.gender = gender;
    existingEmployee.dateOfBirth = new Date(dateOfBirth);
    existingEmployee.age = age;
    existingEmployee.aadharCardNumber = aadharCardNumber;
    existingEmployee.employeeType = employeeType;
    existingEmployee.department = department;
    existingEmployee.position = position;
    existingEmployee.startDate = new Date(startDate);
    existingEmployee.emergencyContactName = emergencyContactName;
    existingEmployee.emergencyContactPhone = emergencyContactPhone;
    existingEmployee.emergencyContactRelation = emergencyContactRelation;
    existingEmployee.password = password;
    existingEmployee.invitationStatus = 'completed';
    existingEmployee.status = 'pending';
    existingEmployee.invitationToken = undefined; // Remove token after completion

    // Add conditional fields based on employee type
    if (employeeType === 'advocate') {
        existingEmployee.advocateLicenseNumber = advocateLicenseNumber;
    }

    if (employeeType === 'intern') {
        existingEmployee.internYear = internYear;
    }

    // Save updated employee
    const employee = await existingEmployee.save();

    console.log('✅ Employee registered successfully:', {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        employeeType: employee.employeeType
    });

    // Generate JWT token for the employee
    const token = jwt.sign(
        { 
            id: employee._id,
            email: employee.email,
            organization: employee.organization,
            role: 'employee'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.status(201).json({
        success: true,
        message: 'Employee registered successfully',
        token,
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
                age: employee.age,
                aadharCardNumber: employee.aadharCardNumber,
                employeeType: employee.employeeType,
                advocateLicenseNumber: employee.advocateLicenseNumber,
                internYear: employee.internYear,
                salary: employee.salary,
                department: employee.department,
                position: employee.position,
                startDate: employee.startDate,
                emergencyContactName: employee.emergencyContactName,
                emergencyContactPhone: employee.emergencyContactPhone,
                emergencyContactRelation: employee.emergencyContactRelation,
                organization: employee.organization,
                adminId: employee.adminId,
                invitationStatus: employee.invitationStatus,
                status: employee.status,
                createdAt: employee.createdAt
            }
        }
    });
});

// @desc      Update employee status
// @route     PUT /api/employees/:id/status
// @access    Private (Admin only)
exports.updateEmployeeStatus = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;
    const organizationId = req.user.organization;

    console.log('🔄 Updating employee status...');
    console.log('👤 Employee ID:', id);
    console.log('📊 New Status:', status);

    // Validate status
    const validStatuses = ['pending', 'active', 'inactive', 'terminated'];
    if (!status || !validStatuses.includes(status)) {
        return next(new ErrorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
    }

    // Find employee
    const employee = await Employee.findOne({
        _id: id,
        organization: organizationId
    });

    if (!employee) {
        return next(new ErrorResponse('Employee not found', 404));
    }

    // Update status
    employee.status = status;
    await employee.save();

    console.log('✅ Employee status updated:', {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        newStatus: status
    });

    res.status(200).json({
        success: true,
        message: 'Employee status updated successfully',
        data: {
            employee: {
                id: employee._id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                status: employee.status,
                updatedAt: employee.updatedAt
            }
        }
    });
});

// @desc      Get employees by status
// @route     GET /api/employees/status/:status
// @access    Private (Admin only)
exports.getEmployeesByStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.params;
    const organizationId = req.user.organization;

    console.log('📋 Fetching employees by status:', status);
    console.log('🏢 Organization ID:', organizationId);

    // Validate status
    const validStatuses = ['pending', 'active', 'inactive', 'terminated'];
    if (!validStatuses.includes(status)) {
        return next(new ErrorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const employees = await Employee.find({ 
        organization: organizationId,
        status: status 
    })
        .select('-password -invitationToken') // Exclude sensitive data
        .sort({ createdAt: -1 });

    console.log(`✅ Found ${employees.length} employees with status: ${status}`);

    res.status(200).json({
        success: true,
        count: employees.length,
        status: status,
        data: employees
    });
});
