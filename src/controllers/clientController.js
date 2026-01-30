// controllers/clientController.js
// Client CRUD operations with RBAC

const Client = require('../models/Client');
const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { canAssignModule, getAssigneeUserIdsForModule } = require('../utils/assigneeUtils');

/**
 * @desc    Create a new client
 * @route   POST /api/clients
 * @access  Private (Requires 'create' permission on 'client' module)
 */
exports.createClient = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const {
        firstName,
        lastName,
        email,
        phone,
        alternatePhone,
        streetAddress,
        city,
        province,
        postalCode,
        country,
        dateOfBirth,
        gender,
        occupation,
        companyName,
        aadharCardNumber,
        panCardNumber,
        fees,
        aadharImageUrl,
        aadharImageSize,
        assignedTo,
        notes
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phone || fees === undefined) {
        return next(new ErrorResponse('First name, last name, phone, and fees are required', 400));
    }

    // Validate Aadhar image size if provided
    // Max size = 1 MB (1048576 bytes), warning threshold = 500 KB (512000 bytes)
    let aadharSizeWarning = false;
    if (aadharImageSize !== undefined && aadharImageSize !== null) {
        const maxSize = 1024 * 1024; // 1 MB
        const warnSize = 500 * 1024; // ~500 KB

        if (aadharImageSize > maxSize) {
            return next(new ErrorResponse('Aadhar card image size must be less than or equal to 1 MB', 400));
        }

        if (aadharImageSize > warnSize) {
            aadharSizeWarning = true;
        }
    }

    // Check if client with same email exists in organization
    if (email) {
        const existingClient = await Client.findOne({
            organization: organizationId,
            email: email.toLowerCase(),
            deletedAt: null
        });

        if (existingClient) {
            return next(new ErrorResponse('A client with this email already exists in your organization', 400));
        }
    }

    // Setting assignedTo to someone other than self: SUPER_ADMIN can always assign; others need 'assignee' on client
    const effectiveAssignedTo = assignedTo || userId;
    if (effectiveAssignedTo !== userId && req.userRole && !canAssignModule(req.userRole, 'client')) {
        return next(new ErrorResponse('You do not have permission to assign clients to other users', 403));
    }

    // Create client
    const client = await Client.create({
        firstName,
        lastName,
        email: email ? email.toLowerCase() : undefined,
        phone,
        alternatePhone,
        streetAddress,
        city,
        province,
        postalCode,
        country: country || 'India',
        dateOfBirth,
        gender,
        occupation,
        companyName,
        aadharCardNumber,
        panCardNumber,
        fees,
        aadharImageUrl,
        aadharImageSize,
        assignedTo: effectiveAssignedTo,
        organization: organizationId,
        createdBy: userId,
        notes
    });

    console.log('✅ Client created:', {
        id: client._id,
        name: client.fullName,
        email: client.email,
        organization: organizationId
    });

    // When creator does NOT have assignee permission, notify assignees so they see the new client
    const creatorHasAssignee = req.userRole && canAssignModule(req.userRole, 'client');
    if (!creatorHasAssignee) {
        try {
            const assigneeUserIds = await getAssigneeUserIdsForModule(organizationId, 'client');
            const creatorIdStr = userId.toString();
            const recipientIds = assigneeUserIds.filter((id) => id !== creatorIdStr);
            const clientName = [client.firstName, client.lastName].filter(Boolean).join(' ') || 'New client';
            for (const assigneeId of recipientIds) {
                await Notification.create({
                    userId: assigneeId,
                    organization: organizationId,
                    type: 'client_created',
                    title: 'New client created',
                    message: `${clientName} was created and may need to be assigned.`,
                    relatedEntityType: 'client',
                    relatedEntityId: client._id.toString(),
                    createdBy: creatorIdStr
                });
            }
            if (recipientIds.length > 0) {
                console.log('📬 Notified', recipientIds.length, 'assignee(s) of new client');
            }
        } catch (notifErr) {
            console.error('⚠️ Failed to create assignee notifications:', notifErr.message);
        }
    }

    res.status(201).json({
        success: true,
        message: 'Client created successfully',
        data: client,
        warning: aadharSizeWarning ? 'Aadhar card image size is greater than 500 KB' : undefined
    });
});

/**
 * @desc    Get all clients with pagination and filters
 * @route   GET /api/clients
 * @access  Private (Requires 'read' permission on 'client' module)
 */
exports.getClients = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;
    const {
        page = 1,
        limit = 10,
        status,
        assignedTo,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeDeleted = false
    } = req.query;

    // Build query
    const query = {
        organization: organizationId
    };

    if (!includeDeleted || includeDeleted === 'false') {
        query.deletedAt = null;
    }

    if (status) {
        query.status = status;
    }

    if (assignedTo) {
        query.assignedTo = assignedTo;
    }

    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } }
        ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const clients = await Client.find(query)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true });

    // Get total count
    const total = await Client.countDocuments(query);

    res.status(200).json({
        success: true,
        count: clients.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: clients
    });
});

/**
 * @desc    Get single client by ID
 * @route   GET /api/clients/:id
 * @access  Private (Requires 'read' permission on 'client' module)
 */
exports.getClient = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;

    const client = await Client.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    })
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    if (!client) {
        return next(new ErrorResponse('Client not found', 404));
    }

    res.status(200).json({
        success: true,
        data: client
    });
});

/**
 * @desc    Update client
 * @route   PUT /api/clients/:id
 * @access  Private (Requires 'update' permission on 'client' module)
 */
exports.updateClient = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const userId = req.user._id;

    let client = await Client.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!client) {
        return next(new ErrorResponse('Client not found', 404));
    }

    // Check if email is being changed and if new email already exists
    if (req.body.email && req.body.email.toLowerCase() !== client.email) {
        const existingClient = await Client.findOne({
            organization: organizationId,
            email: req.body.email.toLowerCase(),
            _id: { $ne: id },
            deletedAt: null
        });

        if (existingClient) {
            return next(new ErrorResponse('A client with this email already exists', 400));
        }
    }

    // Validate Aadhar image size on update if provided
    if (req.body.aadharImageSize !== undefined && req.body.aadharImageSize !== null) {
        const maxSize = 1024 * 1024; // 1 MB
        if (req.body.aadharImageSize > maxSize) {
            return next(new ErrorResponse('Aadhar card image size must be less than or equal to 1 MB', 400));
        }
    }

    // Changing assignedTo: SUPER_ADMIN can always assign; others need 'assignee' on client
    if (req.body.assignedTo !== undefined && String(req.body.assignedTo) !== String(client.assignedTo)) {
        if (!req.userRole || !canAssignModule(req.userRole, 'client')) {
            return next(new ErrorResponse('You do not have permission to assign clients to other users', 403));
        }
    }

    // Update fields
    const updateFields = [
        'firstName', 'lastName', 'email', 'phone', 'alternatePhone',
        'streetAddress', 'city', 'province', 'postalCode', 'country',
        'dateOfBirth', 'gender', 'occupation', 'companyName',
        'aadharCardNumber', 'panCardNumber', 'fees',
        'aadharImageUrl', 'aadharImageSize',
        'assignedTo', 'status', 'notes'
    ];

    updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
            client[field] = field === 'email' ? req.body[field].toLowerCase() : req.body[field];
        }
    });

    client.updatedBy = userId;
    await client.save();

    // Populate before sending response
    await client.populate('assignedTo', 'firstName lastName email');
    await client.populate('createdBy', 'firstName lastName email');
    await client.populate('updatedBy', 'firstName lastName email');

    console.log('✅ Client updated:', {
        id: client._id,
        name: client.fullName
    });

    res.status(200).json({
        success: true,
        message: 'Client updated successfully',
        data: client
    });
});

/**
 * @desc    Delete client (soft delete)
 * @route   DELETE /api/clients/:id
 * @access  Private (Requires 'delete' permission on 'client' module)
 */
exports.deleteClient = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const client = await Client.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!client) {
        return next(new ErrorResponse('Client not found', 404));
    }

    // Soft delete
    client.deletedAt = new Date();
    client.deletedBy = userId;
    client.status = 'inactive';
    await client.save();

    console.log('✅ Client deleted:', {
        id: client._id,
        name: client.fullName
    });

    res.status(200).json({
        success: true,
        message: 'Client deleted successfully'
    });
});

/**
 * @desc    Restore deleted client
 * @route   PUT /api/clients/:id/restore
 * @access  Private (Requires 'update' permission on 'client' module)
 */
exports.restoreClient = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;

    const client = await Client.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: { $ne: null }
    }).setOptions({ includeDeleted: true });

    if (!client) {
        return next(new ErrorResponse('Deleted client not found', 404));
    }

    client.deletedAt = null;
    client.deletedBy = null;
    client.status = 'active';
    await client.save();

    res.status(200).json({
        success: true,
        message: 'Client restored successfully',
        data: client
    });
});

/**
 * @desc    Archive client
 * @route   PUT /api/clients/:id/archive
 * @access  Private (Requires 'update' permission on 'client' module)
 */
exports.archiveClient = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;

    const client = await Client.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!client) {
        return next(new ErrorResponse('Client not found', 404));
    }

    client.status = 'archived';
    await client.save();

    res.status(200).json({
        success: true,
        message: 'Client archived successfully',
        data: client
    });
});

/**
 * @desc    Unarchive client
 * @route   PUT /api/clients/:id/unarchive
 * @access  Private (Requires 'update' permission on 'client' module)
 */
exports.unarchiveClient = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;

    const client = await Client.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!client) {
        return next(new ErrorResponse('Client not found', 404));
    }

    client.status = 'active';
    await client.save();

    res.status(200).json({
        success: true,
        message: 'Client unarchived successfully',
        data: client
    });
});
