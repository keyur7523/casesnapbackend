// controllers/caseController.js
// Case CRUD operations with RBAC

const Case = require('../models/Case');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { canAssignModule, getAssigneeUserIdsForModule } = require('../utils/assigneeUtils');
const { sendEncryptedJson } = require('../utils/responseEncryption');

const canViewAllCases = (userRole) => canAssignModule(userRole, 'cases');
const STAGE_CONFIRM_USER_SELECT = '_id firstName lastName email';

const normalizeOrganizationId = (org) => {
    if (!org) return null;
    if (typeof org === 'string') return org;
    if (org._id) return org._id.toString();
    if (org.toString) return org.toString();
    return null;
};

const sanitizeStagePayload = (payload = {}) => ({
    stageName: payload.stageName ? String(payload.stageName).trim() : '',
    todaySummary: payload.todaySummary ? String(payload.todaySummary).trim() : '',
    nextDate: payload.nextDate ? new Date(payload.nextDate) : null,
    nextDatePurpose: payload.nextDatePurpose ? String(payload.nextDatePurpose).trim() : '',
    nextDatePreparation: payload.nextDatePreparation ? String(payload.nextDatePreparation).trim() : '',
    confirmedBy: payload.confirmedBy ? String(payload.confirmedBy).trim() : ''
});

const isValidDateOrNull = (d) => d === null || (d instanceof Date && !Number.isNaN(d.getTime()));

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
    await newCase.populate('stages.confirmedBy', STAGE_CONFIRM_USER_SELECT);

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
            { 'stages.stageName': { $regex: search, $options: 'i' } },
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
        .populate('stages.confirmedBy', STAGE_CONFIRM_USER_SELECT)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

    const total = await countQuery;

    sendEncryptedJson(res, 200, {
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
        .populate('clients', 'firstName lastName email phone')
        .populate('stages.confirmedBy', STAGE_CONFIRM_USER_SELECT);

    if (!caseDoc) {
        return next(new ErrorResponse('Case not found', 404));
    }

    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo?._id || caseDoc.assignedTo) !== String(userId)) {
        return next(new ErrorResponse('You do not have permission to view this case', 403));
    }

    const data = caseDoc.toObject ? caseDoc.toObject() : caseDoc;

    sendEncryptedJson(res, 200, { success: true, data });
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
        'caseNumber', 'caseType', 'partyName', 'courtName', 'courtPremises',
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
    await caseDoc.populate('stages.confirmedBy', STAGE_CONFIRM_USER_SELECT);

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

/**
 * @desc    Get case assignees for dropdown (confirm by)
 * @route   GET /api/cases/assignees
 * @access  Private (Requires 'read' permission on 'cases' module)
 */
exports.getCaseAssignees = asyncHandler(async (req, res, next) => {
    const organizationId = normalizeOrganizationId(req.user.organization);
    const assigneeUserIds = await getAssigneeUserIdsForModule(organizationId, 'cases');

    const users = await User.find({
        _id: { $in: assigneeUserIds },
        organization: organizationId,
        status: { $nin: ['terminated'] }
    })
        .select('_id firstName lastName email')
        .sort({ firstName: 1, lastName: 1 })
        .lean();

    const data = users.map((u) => ({
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email
    }));

    return res.status(200).json({
        success: true,
        count: data.length,
        data
    });
});

/**
 * @desc    Add stage row for a case
 * @route   POST /api/cases/:id/stages
 * @access  Private (Requires 'update' permission on 'cases' module)
 */
exports.addCaseStage = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const organizationId = normalizeOrganizationId(req.user.organization);
    const userId = req.user._id.toString();

    const caseDoc = await Case.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!caseDoc) {
        return next(new ErrorResponse('Case not found', 404));
    }

    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo) !== userId) {
        return next(new ErrorResponse('You do not have permission to add case stages', 403));
    }

    const inputStages = Array.isArray(req.body) ? req.body : [req.body];
    if (inputStages.length === 0) {
        return next(new ErrorResponse('At least one stage is required', 400));
    }

    const validAssignees = await getAssigneeUserIdsForModule(organizationId, 'cases');

    const stagesToInsert = [];
    for (const raw of inputStages) {
        const stageData = sanitizeStagePayload(raw);

        if (!stageData.stageName) {
            return next(new ErrorResponse('Stage name is required', 400));
        }

        if (!stageData.confirmedBy) {
            return next(new ErrorResponse('Confirmed by is required', 400));
        }

        if (!isValidDateOrNull(stageData.nextDate)) {
            return next(new ErrorResponse('Invalid next date', 400));
        }

        if (!validAssignees.includes(stageData.confirmedBy)) {
            return next(new ErrorResponse('Confirmed by must be a valid case assignee', 400));
        }

        stagesToInsert.push({
            stageName: stageData.stageName,
            todaySummary: stageData.todaySummary || undefined,
            nextDate: stageData.nextDate || null,
            nextDatePurpose: stageData.nextDatePurpose || undefined,
            nextDatePreparation: stageData.nextDatePreparation || undefined,
            confirmedBy: stageData.confirmedBy,
            createdBy: userId,
            updatedBy: userId
        });
    }

    // Ensure confirmedBy users exist in the organization (avoid dangling ids)
    const confirmIds = [...new Set(stagesToInsert.map((s) => s.confirmedBy))];
    const confirmUsersCount = await User.countDocuments({
        _id: { $in: confirmIds },
        organization: organizationId,
        status: { $nin: ['terminated'] }
    });
    if (confirmUsersCount !== confirmIds.length) {
        return next(new ErrorResponse('One or more confirmedBy users are invalid for this organization', 400));
    }

    const beforeLen = caseDoc.stages.length;
    caseDoc.stages.push(...stagesToInsert);

    caseDoc.updatedBy = userId;
    await caseDoc.save();
    await caseDoc.populate('stages.confirmedBy', STAGE_CONFIRM_USER_SELECT);

    const createdStages = caseDoc.stages.slice(beforeLen);

    // Notify confirmedBy users to confirm stage(s)
    try {
        for (const stage of createdStages) {
            await Notification.create({
                userId: stage.confirmedBy.toString(),
                organization: organizationId,
                type: 'case_stage_needs_confirmation',
                title: 'Stage needs confirmation',
                message: `${caseDoc.caseNumber || caseDoc._id} - Please confirm stage: ${stage.stageName}`,
                relatedEntityType: 'case',
                relatedEntityId: caseDoc._id.toString(),
                createdBy: userId
            });
        }
    } catch (err) {
        console.error('⚠️ Failed to create stage confirmation notifications:', err.message);
    }

    return res.status(201).json({
        success: true,
        message: 'Case stage(s) added successfully',
        count: createdStages.length,
        data: createdStages
    });
});

/**
 * @desc    Update a case stage (only confirmedBy can edit)
 * @route   PUT /api/cases/:id/stages/:stageId
 * @access  Private (Requires 'update' permission on 'cases' module)
 */
exports.updateCaseStage = asyncHandler(async (req, res, next) => {
    const { id, stageId } = req.params;
    const organizationId = normalizeOrganizationId(req.user.organization);
    const userId = req.user._id.toString();

    const caseDoc = await Case.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!caseDoc) {
        return next(new ErrorResponse('Case not found', 404));
    }

    // Must be able to update the case in general
    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo) !== userId) {
        return next(new ErrorResponse('You do not have permission to update case stages', 403));
    }

    const stage = (caseDoc.stages || []).id(stageId);
    if (!stage) {
        return next(new ErrorResponse('Case stage not found', 404));
    }

    // Lock AFTER confirmation: only confirmedBy can edit this stage
    if (stage.confirmedAt && String(stage.confirmedBy) !== userId) {
        return next(new ErrorResponse('Stage is confirmed. Only the confirmedBy user can edit it.', 403));
    }

    const payload = sanitizeStagePayload(req.body);

    if (payload.stageName !== '') stage.stageName = payload.stageName;
    if (req.body.todaySummary !== undefined) stage.todaySummary = payload.todaySummary || undefined;
    if (req.body.nextDatePurpose !== undefined) stage.nextDatePurpose = payload.nextDatePurpose || undefined;
    if (req.body.nextDatePreparation !== undefined) stage.nextDatePreparation = payload.nextDatePreparation || undefined;

    if (req.body.nextDate !== undefined) {
        if (!isValidDateOrNull(payload.nextDate)) {
            return next(new ErrorResponse('Invalid next date', 400));
        }

        const oldNextDate = stage.nextDate ? new Date(stage.nextDate) : null;
        stage.nextDate = payload.nextDate;

        // If nextDate changed, reset reminderMeta so reminders can fire again for new date.
        const oldTime = oldNextDate ? oldNextDate.getTime() : null;
        const newTime = payload.nextDate ? payload.nextDate.getTime() : null;
        if (oldTime !== newTime) {
            stage.reminderMeta = {
                before5DaysSentAt: null,
                before2DaysSentAt: null,
                before1DaySentAt: null,
                afterDateSentAt: null
            };
        }
    }

    // confirmedBy is NOT editable (keeps lock consistent)
    stage.updatedBy = userId;
    caseDoc.updatedBy = userId;
    await caseDoc.save();
    await caseDoc.populate('stages.confirmedBy', STAGE_CONFIRM_USER_SELECT);

    return res.status(200).json({
        success: true,
        message: 'Case stage updated successfully',
        data: stage
    });
});

/**
 * @desc    Confirm a case stage (only confirmedBy can confirm)
 * @route   PATCH /api/cases/:id/stages/:stageId/confirm
 * @access  Private (Requires 'update' permission on 'cases' module)
 */
exports.confirmCaseStage = asyncHandler(async (req, res, next) => {
    const { id, stageId } = req.params;
    const organizationId = normalizeOrganizationId(req.user.organization);
    const userId = req.user._id.toString();

    const caseDoc = await Case.findOne({
        _id: id,
        organization: organizationId,
        deletedAt: null
    });

    if (!caseDoc) {
        return next(new ErrorResponse('Case not found', 404));
    }

    // Must be able to update the case in general
    if (!canViewAllCases(req.userRole) && String(caseDoc.assignedTo) !== userId) {
        return next(new ErrorResponse('You do not have permission to confirm case stages', 403));
    }

    const stage = (caseDoc.stages || []).id(stageId);
    if (!stage) {
        return next(new ErrorResponse('Case stage not found', 404));
    }

    if (String(stage.confirmedBy) !== userId) {
        return next(new ErrorResponse('Only the confirmedBy user can confirm this stage', 403));
    }

    if (stage.confirmedAt) {
        return res.status(200).json({
            success: true,
            message: 'Stage already confirmed',
            data: stage
        });
    }

    stage.confirmedAt = new Date();
    stage.updatedBy = userId;
    caseDoc.updatedBy = userId;
    await caseDoc.save();
    await caseDoc.populate('stages.confirmedBy', STAGE_CONFIRM_USER_SELECT);

    return res.status(200).json({
        success: true,
        message: 'Stage confirmed successfully',
        data: stage
    });
});
