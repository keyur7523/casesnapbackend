// controllers/caseController.js
// Case CRUD operations with RBAC

const Case = require('../models/Case');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { canAssignModule, getAssigneeUserIdsForModule } = require('../utils/assigneeUtils');

const canViewAllCases = (userRole) => canAssignModule(userRole, 'cases');

/**
 * @desc    Create a new case
 * @route   POST /api/cases
 * @access  Private (Requires 'create' permission on 'cases' module)
 */
exports.createCase = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const {
        caseNumber,
        caseType,
        partyName,
        stage,
        courtName,
        courtPremises,
        assignedTo,
        clientCount = 0,
        clients: clientsInput = [],
        notes
    } = req.body;

    // Validate required fields
    if (!caseNumber || !caseType || !partyName) {
        return next(new ErrorResponse('Case number, case type, and party name are required', 400));
    }

    const clientCountNum = parseInt(clientCount, 10) || 0;
    const clientsArr = Array.isArray(clientsInput) ? clientsInput : (clientsInput ? [clientsInput] : []);

    // Only assignees can assign cases to others or link clients
    const canAssign = req.userRole && canAssignModule(req.userRole, 'cases');
    if (!canAssign && (assignedTo || clientsArr.length > 0)) {
        return next(new ErrorResponse('Only users with case assignee permission can assign cases or link clients', 403));
    }

    if (clientsArr.length > clientCountNum) {
        return next(new ErrorResponse(`Cannot assign more than ${clientCountNum} client(s). clientCount is ${clientCountNum}.`, 400));
    }

    // Validate clients exist, belong to org, and are not deleted
    if (clientsArr.length > 0) {
        const validClients = await Client.find({
            _id: { $in: clientsArr },
            organization: organizationId,
            deletedAt: null
        }).select('_id').lean();
        const validIds = new Set(validClients.map((c) => c._id.toString()));
        const invalidIds = clientsArr.filter((id) => !validIds.has(String(id)));
        if (invalidIds.length > 0) {
            return next(new ErrorResponse(`Invalid or inaccessible client(s): ${invalidIds.join(', ')}`, 400));
        }
    }

    // Check if case with same case number exists in organization
    const existingCase = await Case.findOne({
        organization: organizationId,
        caseNumber: caseNumber.trim(),
        deletedAt: null
    });

    if (existingCase) {
        return next(new ErrorResponse('A case with this case number already exists in your organization', 400));
    }

    // Do not auto-assign to creator.
    let effectiveAssignedTo = null;
    if (assignedTo !== undefined && assignedTo !== null && String(assignedTo).trim() !== '') {
        effectiveAssignedTo = assignedTo;
        if (String(effectiveAssignedTo) !== String(userId) && req.userRole && !canAssignModule(req.userRole, 'cases')) {
            return next(new ErrorResponse('You do not have permission to assign cases to other users', 403));
        }
    }

    const newCase = await Case.create({
        caseNumber: caseNumber.trim(),
        caseType: caseType.trim(),
        partyName: partyName.trim(),
        stage: stage ? stage.trim() : undefined,
        courtName: courtName ? courtName.trim() : undefined,
        courtPremises: courtPremises || undefined,
        assignedTo: effectiveAssignedTo,
        clientCount: clientCountNum,
        clients: clientsArr,
        organization: organizationId,
        createdBy: userId,
        notes: notes ? notes.trim() : undefined
    });

    console.log('✅ Case created:', {
        id: newCase._id,
        caseNumber: newCase.caseNumber,
        partyName: newCase.partyName,
        organization: organizationId
    });

    // When creator does NOT have assignee permission, notify assignees
    const creatorHasAssignee = req.userRole && canAssignModule(req.userRole, 'cases');
    if (!creatorHasAssignee) {
        try {
            const assigneeUserIds = await getAssigneeUserIdsForModule(organizationId, 'cases');
            const creatorIdStr = userId.toString();
            const recipientIds = assigneeUserIds.filter((id) => id !== creatorIdStr);
            const caseLabel = newCase.caseNumber || 'New case';
            for (const assigneeId of recipientIds) {
                await Notification.create({
                    userId: assigneeId,
                    organization: organizationId,
                    type: 'case_created',
                    title: 'New case created',
                    message: `${caseLabel} (${newCase.partyName}) was created and may need to be assigned.`,
                    relatedEntityType: 'case',
                    relatedEntityId: newCase._id.toString(),
                    createdBy: creatorIdStr
                });
            }
            if (recipientIds.length > 0) {
                console.log('📬 Notified', recipientIds.length, 'assignee(s) of new case');
            }
        } catch (notifErr) {
            console.error('⚠️ Failed to create assignee notifications:', notifErr.message);
        }
    }

    await newCase.populate('assignedTo', 'firstName lastName email');
    await newCase.populate('createdBy', 'firstName lastName email');
    await newCase.populate('clients', 'firstName lastName email phone');

    res.status(201).json({
        success: true,
        message: 'Case created successfully',
        data: newCase
    });
});

/**
 * @desc    Get all cases with pagination and filters
 * @route   GET /api/cases
 * @access  Private (Requires 'read' permission on 'cases' module)
 */
exports.getCases = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;
    const userId = req.user._id;
    const {
        page = 1,
        limit = 10,
        status,
        assignedTo,
        search,
        caseType,
        caseNumber,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeDeleted = false
    } = req.query;

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

    if (caseType && String(caseType).trim()) {
        query.caseType = { $regex: caseType.trim(), $options: 'i' };
    }

    if (caseNumber && String(caseNumber).trim()) {
        query.caseNumber = { $regex: caseNumber.trim(), $options: 'i' };
    }

    if (!canViewAllCases(req.userRole)) {
        query.assignedTo = userId;
    }

    if (search) {
        query.$or = [
            { caseNumber: { $regex: search, $options: 'i' } },
            { caseType: { $regex: search, $options: 'i' } },
            { partyName: { $regex: search, $options: 'i' } },
            { stage: { $regex: search, $options: 'i' } },
            { courtName: { $regex: search, $options: 'i' } }
        ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const findOptions = showDeleted ? { includeDeleted: true } : {};
    const findQuery = Case.find(query).setOptions(findOptions);
    const countQuery = Case.countDocuments(query).setOptions(findOptions);

    const cases = await findQuery
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('clients', 'firstName lastName email phone')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

    const total = await countQuery;

    res.status(200).json({
        success: true,
        count: cases.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: cases
    });
});

/**
 * @desc    Get single case by ID
 * @route   GET /api/cases/:id
 * @access  Private (Requires 'read' permission on 'cases' module)
 */
exports.getCase = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const caseDoc = await Case.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    })
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .populate('clients', 'firstName lastName email phone');

    if (!caseDoc) {
        return next(new ErrorResponse('Case not found', 404));
    }

    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo?._id || caseDoc.assignedTo) !== String(userId)) {
        return next(new ErrorResponse('You do not have permission to view this case', 403));
    }

    const data = caseDoc.toObject ? caseDoc.toObject() : caseDoc;

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * @desc    Update case
 * @route   PUT /api/cases/:id
 * @access  Private (Requires 'update' permission on 'cases' module)
 */
exports.updateCase = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const userId = req.user._id;

    let caseDoc = await Case.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!caseDoc) {
        return next(new ErrorResponse('Case not found', 404));
    }

    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo) !== String(userId)) {
        return next(new ErrorResponse('You do not have permission to update this case', 403));
    }

    if (req.body.caseNumber !== undefined && req.body.caseNumber.trim() !== caseDoc.caseNumber) {
        const existingCase = await Case.findOne({
            organization: organizationId,
            caseNumber: req.body.caseNumber.trim(),
            _id: { $ne: id },
            deletedAt: null
        });
        if (existingCase) {
            return next(new ErrorResponse('A case with this case number already exists', 400));
        }
    }

    if (req.body.assignedTo !== undefined && String(req.body.assignedTo) !== String(caseDoc.assignedTo)) {
        if (!req.userRole || !canAssignModule(req.userRole, 'cases')) {
            return next(new ErrorResponse('You do not have permission to assign cases to other users', 403));
        }
    }

    // clientCount and clients - only assignees can update
    if (req.body.clientCount !== undefined || req.body.clients !== undefined) {
        if (!req.userRole || !canAssignModule(req.userRole, 'cases')) {
            return next(new ErrorResponse('Only users with case assignee permission can link clients to cases', 403));
        }
        const newClientCount = req.body.clientCount !== undefined
            ? (parseInt(req.body.clientCount, 10) || 0)
            : (caseDoc.clientCount || 0);
        const newClients = req.body.clients !== undefined
            ? (Array.isArray(req.body.clients) ? req.body.clients : [req.body.clients].filter(Boolean))
            : (caseDoc.clients || []).map((c) => (typeof c === 'object' ? c._id : c).toString());
        if (newClients.length > newClientCount) {
            return next(new ErrorResponse(`Cannot assign more than ${newClientCount} client(s). clientCount is ${newClientCount}.`, 400));
        }
        const validClients = await Client.find({
            _id: { $in: newClients },
            organization: organizationId,
            deletedAt: null
        }).select('_id').lean();
        const validIds = new Set(validClients.map((c) => c._id.toString()));
        const invalidIds = newClients.filter((id) => !validIds.has(String(id)));
        if (invalidIds.length > 0) {
            return next(new ErrorResponse(`Invalid or inaccessible client(s): ${invalidIds.join(', ')}`, 400));
        }
        caseDoc.clientCount = newClientCount;
        caseDoc.clients = newClients;
    }

    const updateFields = [
        'caseNumber', 'caseType', 'partyName', 'stage', 'courtName', 'courtPremises',
        'assignedTo', 'status', 'notes'
    ];

    updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
            const val = req.body[field];
            caseDoc[field] = typeof val === 'string' ? val.trim() : val;
        }
    });

    caseDoc.updatedBy = userId;
    await caseDoc.save();

    await caseDoc.populate('assignedTo', 'firstName lastName email');
    await caseDoc.populate('createdBy', 'firstName lastName email');
    await caseDoc.populate('updatedBy', 'firstName lastName email');
    await caseDoc.populate('clients', 'firstName lastName email phone');

    console.log('✅ Case updated:', { id: caseDoc._id, caseNumber: caseDoc.caseNumber });

    res.status(200).json({
        success: true,
        message: 'Case updated successfully',
        data: caseDoc
    });
});

/**
 * @desc    Delete case (soft delete)
 * @route   DELETE /api/cases/:id
 * @access  Private (Requires 'delete' permission on 'cases' module)
 */
exports.deleteCase = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const caseDoc = await Case.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!caseDoc) {
        return next(new ErrorResponse('Case not found', 404));
    }

    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo) !== String(userId)) {
        return next(new ErrorResponse('You do not have permission to delete this case', 403));
    }

    caseDoc.deletedAt = new Date();
    caseDoc.deletedBy = userId;
    caseDoc.status = 'inactive';
    await caseDoc.save();

    console.log('✅ Case deleted:', { id: caseDoc._id, caseNumber: caseDoc.caseNumber });

    res.status(200).json({
        success: true,
        message: 'Case deleted successfully'
    });
});

/**
 * @desc    Restore deleted case
 * @route   PUT /api/cases/:id/restore
 * @access  Private (Requires 'update' permission on 'cases' module)
 */
exports.restoreCase = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const caseDoc = await Case.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: { $ne: null }
    }).setOptions({ includeDeleted: true });

    if (!caseDoc) {
        return next(new ErrorResponse('Deleted case not found', 404));
    }

    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo) !== String(userId)) {
        return next(new ErrorResponse('You do not have permission to restore this case', 403));
    }

    caseDoc.deletedAt = null;
    caseDoc.deletedBy = null;
    caseDoc.status = 'active';
    await caseDoc.save();

    res.status(200).json({
        success: true,
        message: 'Case restored successfully',
        data: caseDoc
    });
});

/**
 * @desc    Archive case
 * @route   PUT /api/cases/:id/archive
 * @access  Private (Requires 'update' permission on 'cases' module)
 */
exports.archiveCase = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const caseDoc = await Case.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!caseDoc) {
        return next(new ErrorResponse('Case not found', 404));
    }

    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo) !== String(userId)) {
        return next(new ErrorResponse('You do not have permission to archive this case', 403));
    }

    caseDoc.status = 'archived';
    await caseDoc.save();

    res.status(200).json({
        success: true,
        message: 'Case archived successfully',
        data: caseDoc
    });
});

/**
 * @desc    Unarchive case
 * @route   PUT /api/cases/:id/unarchive
 * @access  Private (Requires 'update' permission on 'cases' module)
 */
exports.unarchiveCase = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const caseDoc = await Case.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!caseDoc) {
        return next(new ErrorResponse('Case not found', 404));
    }

    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo) !== String(userId)) {
        return next(new ErrorResponse('You do not have permission to unarchive this case', 403));
    }

    caseDoc.status = 'active';
    await caseDoc.save();

    res.status(200).json({
        success: true,
        message: 'Case unarchived successfully',
        data: caseDoc
    });
});
