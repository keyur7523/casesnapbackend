// controllers/clientController.js
// Client CRUD operations with RBAC

const Client = require('../models/Client');
const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { canAssignModule, getAssigneeUserIdsForModule } = require('../utils/assigneeUtils');

const canViewAllClients = (userRole) => canAssignModule(userRole, 'client');

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
        assignedTo,
        notes
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phone || fees === undefined) {
        return next(new ErrorResponse('First name, last name, phone, and fees are required', 400));
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

    // Do not auto-assign to creator.
    // If assignedTo is explicitly provided, only assignees (or SUPER_ADMIN) can assign to others.
    let effectiveAssignedTo = null;
    if (assignedTo !== undefined && assignedTo !== null && String(assignedTo).trim() !== '') {
        effectiveAssignedTo = assignedTo;
        if (String(effectiveAssignedTo) !== String(userId) && req.userRole && !canAssignModule(req.userRole, 'client')) {
            return next(new ErrorResponse('You do not have permission to assign clients to other users', 403));
        }
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
        data: client
    });
});

/**
 * @desc    Get all clients with pagination and filters
 * @route   GET /api/clients
 * @access  Private (Requires 'read' permission on 'client' module)
 */
exports.getClients = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;
    const userId = req.user._id;
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

    const showDeleted = includeDeleted === true || includeDeleted === 'true';
    if (!showDeleted) {
        query.deletedAt = null;
    }

    if (status) {
        query.status = status;
    }

    if (assignedTo) {
        query.assignedTo = assignedTo;
    }

    // Visibility rule: users without assignee permission can only view their assigned clients.
    if (!canViewAllClients(req.userRole)) {
        query.assignedTo = userId;
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

    const findOptions = showDeleted ? { includeDeleted: true } : {};
    const findQuery = Client.find(query).setOptions(findOptions);
    const countQuery = Client.countDocuments(query).setOptions(findOptions);

    // Execute query
    const clients = await findQuery
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true });

    // Get total count
    const total = await countQuery;

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
    const userId = req.user._id;

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

    // Visibility rule on detail endpoint as well.
    if (!canViewAllClients(req.userRole) && String(client.assignedTo) !== String(userId)) {
        return next(new ErrorResponse('You do not have permission to view this client', 403));
    }

    const data = client.toObject ? client.toObject() : client;
    data.aadharImageUrl = client.aadharImageUrl ?? null;

    res.status(200).json({
        success: true,
        data
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
        'aadharImageUrl',
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
    const userId = req.user._id;

    const client = await Client.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: { $ne: null }
    }).setOptions({ includeDeleted: true });

    if (!client) {
        return next(new ErrorResponse('Deleted client not found', 404));
    }

    // Visibility: non-assignees can only restore clients assigned to them
    if (!canViewAllClients(req.userRole) && String(client.assignedTo) !== String(userId)) {
        return next(new ErrorResponse('You do not have permission to restore this client', 403));
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
