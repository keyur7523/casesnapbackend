// controllers/caseController.js
// Case CRUD operations with RBAC

const Case = require('../models/Case');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { canAssignModule, getAssigneeUserIdsForModule } = require('../utils/assigneeUtils');
const { sendEncryptedJson } = require('../utils/responseEncryption');
const { parseExcelFromBuffer, writeExcelToBuffer, toSafeString, toOptionalNumber, formatMongooseErrorForUser } = require('../utils/excelUtils');

const canViewAllCases = (userRole) => canAssignModule(userRole, 'cases');

const CASE_EXCEL_SHEET = 'Cases';
const CASE_COURT_PREMISES_ENUM = Case.schema?.path('courtPremises')?.enumValues || [];
// One row can represent one case-client link. If caseNumber is provided, duplicate caseNumber rows are merged into one case with multiple clients.
// For client resolution, provide clientId OR clientPhone OR clientEmail. If none match and you want auto-create,
// provide required client creation fields.
const CASE_EXCEL_HEADERS_V2 = [
    'caseType',
    'partyName',
    'stage',
    'courtName',
    'courtPremises',
    'clientCount',
    'notes',
    'clientId',
    'clientPhone',
    'clientEmail',
    'clientFirstName',
    'clientLastName',
    'clientStreetAddress',
    'clientCity',
    'clientProvince',
    'clientPostalCode',
    'clientCountry',
    'clientFees'
];

// Backward compatible: older templates included caseNumber as first column.
const CASE_EXCEL_HEADERS_V1 = ['caseNumber', ...CASE_EXCEL_HEADERS_V2];

function parseCaseExcel(buffer, { sheetName, maxRows } = {}) {
    const v2 = parseExcelFromBuffer(buffer, { sheetName, expectedHeaders: CASE_EXCEL_HEADERS_V2, maxRows });
    if (v2.ok) return { ...v2, version: 2 };

    const v1 = parseExcelFromBuffer(buffer, { sheetName, expectedHeaders: CASE_EXCEL_HEADERS_V1, maxRows });
    if (v1.ok) return { ...v1, version: 1 };

    return v2; // return v2 error by default
}

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
    if (!caseType || !partyName) {
        return next(new ErrorResponse('Case type and party name are required', 400));
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

    // Check if case with same case number exists in organization (only if provided)
    const effectiveCaseNumber = typeof caseNumber === 'string' ? caseNumber.trim() : '';
    if (effectiveCaseNumber) {
        const existingCase = await Case.findOne({
            organization: organizationId,
            caseNumber: effectiveCaseNumber,
            deletedAt: null
        });

        if (existingCase) {
            return next(new ErrorResponse('A case with this case number already exists in your organization', 400));
        }
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
        ...(effectiveCaseNumber ? { caseNumber: effectiveCaseNumber } : {}),
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
        .populate('clients', 'firstName lastName email phone');

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

/**
 * @desc    Download case Excel template (strict headers)
 * @route   GET /api/cases/excel/template
 * @access  Private (Requires 'read' permission on 'cases' module)
 */
exports.downloadCaseExcelTemplate = asyncHandler(async (req, res) => {
    const buffer = writeExcelToBuffer({
        sheetName: CASE_EXCEL_SHEET,
        headers: CASE_EXCEL_HEADERS_V2,
        rows: []
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="cases-template.xlsx"');
    res.status(200).send(buffer);
});

/**
 * @desc    Export cases to Excel
 * @route   GET /api/cases/excel/export
 * @access  Private (Requires 'read' permission on 'cases' module)
 */
exports.exportCasesToExcel = asyncHandler(async (req, res) => {
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const {
        status,
        assignedTo,
        search,
        caseType,
        caseNumber,
        includeDeleted = false,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const query = { organization: organizationId };
    const showDeleted = includeDeleted === true || includeDeleted === 'true';
    if (!showDeleted) query.deletedAt = null;

    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (caseType && String(caseType).trim()) query.caseType = { $regex: String(caseType).trim(), $options: 'i' };
    if (caseNumber && String(caseNumber).trim()) query.caseNumber = { $regex: String(caseNumber).trim(), $options: 'i' };
    if (search) {
        query.$or = [
            { caseNumber: { $regex: search, $options: 'i' } },
            { caseType: { $regex: search, $options: 'i' } },
            { partyName: { $regex: search, $options: 'i' } },
            { stage: { $regex: search, $options: 'i' } },
            { courtName: { $regex: search, $options: 'i' } }
        ];
    }

    if (!canViewAllCases(req.userRole)) {
        query.assignedTo = userId;
    }

    const findOptions = showDeleted ? { includeDeleted: true } : {};
    const cases = await Case.find(query)
        .setOptions(findOptions)
        .populate('clients', 'firstName lastName email phone streetAddress city province postalCode country fees')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .lean();

    // Flatten: one row per case-client (or one row with empty client fields if no clients)
    const rows = [];
    for (const c of cases) {
        const clients = Array.isArray(c.clients) ? c.clients : [];
        if (clients.length === 0) {
            rows.push({
                caseNumber: c.caseNumber ?? '',
                caseType: c.caseType ?? '',
                partyName: c.partyName ?? '',
                stage: c.stage ?? '',
                courtName: c.courtName ?? '',
                courtPremises: c.courtPremises ?? '',
                clientCount: c.clientCount ?? 0,
                notes: c.notes ?? '',
                clientId: '',
                clientPhone: '',
                clientEmail: '',
                clientFirstName: '',
                clientLastName: '',
                clientStreetAddress: '',
                clientCity: '',
                clientProvince: '',
                clientPostalCode: '',
                clientCountry: '',
                clientFees: ''
            });
            continue;
        }
        for (const cl of clients) {
            rows.push({
                caseNumber: c.caseNumber ?? '',
                caseType: c.caseType ?? '',
                partyName: c.partyName ?? '',
                stage: c.stage ?? '',
                courtName: c.courtName ?? '',
                courtPremises: c.courtPremises ?? '',
                clientCount: c.clientCount ?? clients.length,
                notes: c.notes ?? '',
                clientId: cl?._id ?? '',
                clientPhone: cl?.phone ?? '',
                clientEmail: cl?.email ?? '',
                clientFirstName: cl?.firstName ?? '',
                clientLastName: cl?.lastName ?? '',
                clientStreetAddress: cl?.streetAddress ?? '',
                clientCity: cl?.city ?? '',
                clientProvince: cl?.province ?? '',
                clientPostalCode: cl?.postalCode ?? '',
                clientCountry: cl?.country ?? '',
                clientFees: cl?.fees ?? ''
            });
        }
    }

    const buffer = writeExcelToBuffer({
        sheetName: CASE_EXCEL_SHEET,
        headers: CASE_EXCEL_HEADERS_V1,
        rows
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="cases-export.xlsx"');
    res.status(200).send(buffer);
});

/**
 * @desc    Import cases from Excel (strict template). Auto-creates clients if missing.
 * @route   POST /api/cases/excel/import
 * @access  Private (Requires 'create' permission on 'cases' module)
 */
exports.importCasesFromExcel = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const file = req.file;
    if (!file || !file.buffer) {
        return next(new ErrorResponse('Excel file is required (form-data field: file)', 400));
    }

    const parsed = parseCaseExcel(file.buffer, { sheetName: CASE_EXCEL_SHEET, maxRows: 5000 });
    if (!parsed.ok) return next(new ErrorResponse(parsed.error, 400));

    const canAssign = req.userRole && canAssignModule(req.userRole, 'cases');
    const importerIsAssignee = !!canAssign;

    // Group rows by caseNumber (trimmed) if present. If missing, each row becomes its own case.
    const groups = new Map();
    const errors = [];

    for (const row of parsed.rows) {
        const r = row.rowNumber;
        const d = row.data;

        const caseNumber = toSafeString(d.caseNumber);
        const key = caseNumber ? caseNumber.trim() : `__row_${r}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ rowNumber: r, data: d });
    }

    let createdCases = 0;
    let createdClients = 0;
    let linkedExistingClients = 0;
    let skippedCases = 0;

    for (const [caseKey, rows] of groups.entries()) {
        const first = rows[0];
        const d0 = first.data;
        const rowIssues = [];

        const caseNumber = toSafeString(d0.caseNumber).trim();
        const caseType = toSafeString(d0.caseType).trim();
        const partyName = toSafeString(d0.partyName).trim();
        const stage = toSafeString(d0.stage) || undefined;
        const courtName = toSafeString(d0.courtName) || undefined;
        const courtPremises = toSafeString(d0.courtPremises) || undefined;
        const notes = toSafeString(d0.notes) || undefined;
        const clientCount = toOptionalNumber(d0.clientCount);

        if (!caseType) rowIssues.push('caseType is required');
        if (!partyName) rowIssues.push('partyName is required');
        if (courtPremises && CASE_COURT_PREMISES_ENUM.length > 0 && !CASE_COURT_PREMISES_ENUM.includes(courtPremises)) {
            rowIssues.push(`courtPremises must be one of: ${CASE_COURT_PREMISES_ENUM.join(', ')}`);
        }

        const anyClientFields = rows.some((rr) =>
            toSafeString(rr.data.clientId) ||
            toSafeString(rr.data.clientPhone) ||
            toSafeString(rr.data.clientEmail) ||
            toSafeString(rr.data.clientFirstName) ||
            toSafeString(rr.data.clientLastName)
        );
        if (!canAssign && anyClientFields) {
            rowIssues.push('Only users with case assignee permission can link/create clients during import');
        }

        if (caseNumber) {
            const existing = await Case.findOne({ organization: organizationId, caseNumber, deletedAt: null }).lean();
            if (existing) {
                rowIssues.push('A case with this caseNumber already exists');
            }
        }

        if (rowIssues.length > 0) {
            errors.push({ row: first.rowNumber, ...(caseNumber ? { caseNumber } : {}), errors: rowIssues });
            skippedCases++;
            continue;
        }

        const clientIds = [];
        const clientIdSeen = new Set();

        for (const rr of rows) {
            const r = rr.rowNumber;
            const d = rr.data;

            const clientId = toSafeString(d.clientId);
            const clientPhoneRaw = toSafeString(d.clientPhone);
            const clientPhone = clientPhoneRaw ? clientPhoneRaw.replace(/\D/g, '') : '';
            const clientEmail = toSafeString(d.clientEmail).toLowerCase();

            let resolvedClientId = null;

            if (clientId) {
                const cl = await Client.findOne({ _id: clientId, organization: organizationId, deletedAt: null }).select('_id').lean();
                if (!cl) {
                    errors.push({ row: r, ...(caseNumber ? { caseNumber } : {}), errors: [`clientId "${clientId}" not found in your organization`] });
                    continue;
                }
                resolvedClientId = cl._id.toString();
                linkedExistingClients++;
            } else if (clientPhone || clientEmail) {
                // If both phone and email provided, they must resolve to the same client.
                // If either one matches multiple clients, treat as ambiguity.
                const byPhone = clientPhone
                    ? await Client.find({ organization: organizationId, deletedAt: null, phone: clientPhone }).select('_id').lean()
                    : [];
                const byEmail = clientEmail
                    ? await Client.find({ organization: organizationId, deletedAt: null, email: clientEmail }).select('_id').lean()
                    : [];

                if (byPhone.length > 1) {
                    errors.push({ row: r, ...(caseNumber ? { caseNumber } : {}), errors: [`clientPhone "${clientPhoneRaw}" matches multiple clients. Please fix duplicates or use clientId.`] });
                    continue;
                }
                if (byEmail.length > 1) {
                    errors.push({ row: r, ...(caseNumber ? { caseNumber } : {}), errors: [`clientEmail "${clientEmail}" matches multiple clients. Please fix duplicates or use clientId.`] });
                    continue;
                }

                const phoneId = byPhone[0]?._id?.toString();
                const emailId = byEmail[0]?._id?.toString();
                if (phoneId && emailId && phoneId !== emailId) {
                    errors.push({ row: r, ...(caseNumber ? { caseNumber } : {}), errors: ['clientPhone and clientEmail belong to different clients. Please correct or use clientId.'] });
                    continue;
                }

                resolvedClientId = phoneId || emailId || null;
                if (resolvedClientId) linkedExistingClients++;
            }

            if (!resolvedClientId && (clientPhone || clientEmail || toSafeString(d.clientFirstName) || toSafeString(d.clientLastName))) {
                // Auto-create client - enforce required client fields
                const cf = toSafeString(d.clientFirstName);
                const cln = toSafeString(d.clientLastName);
                const streetAddress = toSafeString(d.clientStreetAddress);
                const city = toSafeString(d.clientCity);
                const province = toSafeString(d.clientProvince);
                const postalCode = toSafeString(d.clientPostalCode);
                const country = toSafeString(d.clientCountry) || 'India';
                const fees = toOptionalNumber(d.clientFees);

                const clientIssues = [];
                if (!clientPhone && !clientEmail) clientIssues.push('clientPhone or clientEmail is required to match/create client');
                if (clientPhone && clientPhone.length !== 10) clientIssues.push('clientPhone must be a 10-digit number');
                if (!cf) clientIssues.push('clientFirstName is required to create client');
                if (!cln) clientIssues.push('clientLastName is required to create client');
                if (!streetAddress) clientIssues.push('clientStreetAddress is required to create client');
                if (!city) clientIssues.push('clientCity is required to create client');
                if (!province) clientIssues.push('clientProvince is required to create client');
                if (!postalCode) clientIssues.push('clientPostalCode is required to create client');
                if (fees === undefined || Number.isNaN(fees)) clientIssues.push('clientFees is required to create client and must be a number');

                if (clientIssues.length > 0) {
                    errors.push({ row: r, ...(caseNumber ? { caseNumber } : {}), errors: clientIssues });
                    continue;
                }

                // If phone/email already exists, link instead of creating (but reject ambiguity)
                const byPhone = clientPhone
                    ? await Client.find({ organization: organizationId, deletedAt: null, phone: clientPhone }).select('_id').lean()
                    : [];
                const byEmail = clientEmail
                    ? await Client.find({ organization: organizationId, deletedAt: null, email: clientEmail }).select('_id').lean()
                    : [];
                if (byPhone.length > 1) {
                    errors.push({ row: r, ...(caseNumber ? { caseNumber } : {}), errors: [`clientPhone "${clientPhoneRaw}" matches multiple clients. Please fix duplicates or use clientId.`] });
                    continue;
                }
                if (byEmail.length > 1) {
                    errors.push({ row: r, ...(caseNumber ? { caseNumber } : {}), errors: [`clientEmail "${clientEmail}" matches multiple clients. Please fix duplicates or use clientId.`] });
                    continue;
                }
                const phoneId = byPhone[0]?._id?.toString();
                const emailId = byEmail[0]?._id?.toString();
                if (phoneId && emailId && phoneId !== emailId) {
                    errors.push({ row: r, ...(caseNumber ? { caseNumber } : {}), errors: ['clientPhone and clientEmail belong to different clients. Please correct or use clientId.'] });
                    continue;
                }
                if (phoneId || emailId) {
                    resolvedClientId = phoneId || emailId;
                    linkedExistingClients++;
                }

                if (!resolvedClientId) {
                try {
                    const created = await Client.create({
                        firstName: cf,
                        lastName: cln,
                        email: clientEmail || undefined,
                        phone: clientPhone,
                        streetAddress,
                        city,
                        province,
                        postalCode,
                        country,
                        fees,
                        organization: organizationId,
                        createdBy: userId,
                        // Case import template does not include assignedTo; default is unassigned.
                        assignedTo: null
                    });
                    resolvedClientId = created._id.toString();
                    createdClients++;
                } catch (e) {
                    errors.push({ row: r, ...(caseNumber ? { caseNumber } : {}), errors: formatMongooseErrorForUser(e) });
                    continue;
                }
                }
            }

            if (resolvedClientId && !clientIdSeen.has(resolvedClientId)) {
                clientIdSeen.add(resolvedClientId);
                clientIds.push(resolvedClientId);
            }
        }

        const effectiveClientCount = clientCount === undefined ? clientIds.length : (Number.isNaN(clientCount) ? NaN : clientCount);
        if (Number.isNaN(effectiveClientCount)) {
            errors.push({ row: first.rowNumber, ...(caseNumber ? { caseNumber } : {}), errors: ['clientCount must be a number'] });
            skippedCases++;
            continue;
        }
        if (clientIds.length > effectiveClientCount) {
            errors.push({
                row: first.rowNumber,
                ...(caseNumber ? { caseNumber } : {}),
                errors: [`Cannot assign more than ${effectiveClientCount} client(s). Found ${clientIds.length} client rows for this caseNumber.`]
            });
            skippedCases++;
            continue;
        }

        try {
            await Case.create({
                ...(caseNumber ? { caseNumber } : {}),
                caseType,
                partyName,
                stage,
                courtName,
                courtPremises,
                assignedTo: null,
                clientCount: effectiveClientCount,
                clients: clientIds,
                notes,
                organization: organizationId,
                createdBy: userId
            });
            createdCases++;
        } catch (e) {
            errors.push({ row: first.rowNumber, ...(caseNumber ? { caseNumber } : {}), errors: formatMongooseErrorForUser(e) });
            skippedCases++;
        }
    }

    // Notify assignees when a non-assignee bulk-imports unassigned cases
    if (!importerIsAssignee && createdCases > 0) {
        try {
            const assigneeUserIds = await getAssigneeUserIdsForModule(organizationId, 'cases');
            const creatorIdStr = userId.toString();
            const recipientIds = assigneeUserIds.filter((id) => id !== creatorIdStr);
            for (const assigneeId of recipientIds) {
                await Notification.create({
                    userId: assigneeId,
                    organization: organizationId,
                    type: 'case_bulk_imported',
                    title: 'Cases imported',
                    message: `${createdCases} case(s) were imported and are unassigned.`,
                    relatedEntityType: 'case',
                    relatedEntityId: null,
                    createdBy: creatorIdStr
                });
            }
        } catch (notifErr) {
            console.error('⚠️ Failed to create bulk-import notifications:', notifErr.message);
        }
    }

    res.status(200).json({
        success: true,
        message: 'Case Excel import completed',
        data: {
            createdCases,
            skippedCases,
            createdClients,
            linkedExistingClients,
            errors
        }
    });
});

/**
 * @desc    Preview case Excel import (no DB writes). Shows what cases/clients will be created/linked.
 * @route   POST /api/cases/excel/preview
 * @access  Private (Requires 'create' permission on 'cases' module)
 */
exports.previewCasesExcelImport = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;
    const userId = req.user._id;

    const file = req.file;
    if (!file || !file.buffer) {
        return next(new ErrorResponse('Excel file is required (form-data field: file)', 400));
    }

    const parsed = parseCaseExcel(file.buffer, { sheetName: CASE_EXCEL_SHEET, maxRows: 5000 });
    if (!parsed.ok) return next(new ErrorResponse(parsed.error, 400));

    const canAssign = req.userRole && canAssignModule(req.userRole, 'cases');

    // Group rows by caseNumber (trimmed) if present. If missing, each row becomes its own case.
    const groups = new Map();
    const errors = [];

    for (const row of parsed.rows) {
        const r = row.rowNumber;
        const d = row.data;

        const caseNumber = toSafeString(d.caseNumber);
        const key = caseNumber ? caseNumber.trim() : `__row_${r}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ rowNumber: r, data: d });
    }

    const preview = [];

    for (const [caseKey, rows] of groups.entries()) {
        const first = rows[0];
        const d0 = first.data;
        const caseNumber = toSafeString(d0.caseNumber).trim();
        const caseType = toSafeString(d0.caseType).trim();
        const partyName = toSafeString(d0.partyName).trim();
        const stage = toSafeString(d0.stage) || undefined;
        const courtName = toSafeString(d0.courtName) || undefined;
        const courtPremises = toSafeString(d0.courtPremises) || undefined;
        const notes = toSafeString(d0.notes) || undefined;
        const clientCount = toOptionalNumber(d0.clientCount);

        const caseIssues = [];
        if (!caseType) caseIssues.push('caseType is required');
        if (!partyName) caseIssues.push('partyName is required');
        if (courtPremises && CASE_COURT_PREMISES_ENUM.length > 0 && !CASE_COURT_PREMISES_ENUM.includes(courtPremises)) {
            caseIssues.push(`courtPremises must be one of: ${CASE_COURT_PREMISES_ENUM.join(', ')}`);
        }

        const anyClientFields = rows.some((rr) =>
            toSafeString(rr.data.clientId) ||
            toSafeString(rr.data.clientPhone) ||
            toSafeString(rr.data.clientEmail) ||
            toSafeString(rr.data.clientFirstName) ||
            toSafeString(rr.data.clientLastName)
        );
        if (!canAssign && anyClientFields) {
            caseIssues.push('Only users with case assignee permission can link/create clients during import');
        }

        if (caseNumber) {
            const existingCase = await Case.findOne({ organization: organizationId, caseNumber, deletedAt: null }).select('_id').lean();
            if (existingCase) {
                caseIssues.push('A case with this caseNumber already exists');
            }
        }

        const clientPreviews = [];
        const resolvedClientIds = new Set();

        for (const rr of rows) {
            const r = rr.rowNumber;
            const d = rr.data;

            const clientId = toSafeString(d.clientId);
            const clientPhoneRaw = toSafeString(d.clientPhone);
            const clientPhone = clientPhoneRaw ? clientPhoneRaw.replace(/\D/g, '') : '';
            const clientEmail = toSafeString(d.clientEmail).toLowerCase();

            const clientIssues = [];
            let action = 'none'; // none | link_existing | create_new | invalid
            let linkedClientId = null;

            if (clientId) {
                const cl = await Client.findOne({ _id: clientId, organization: organizationId, deletedAt: null }).select('_id').lean();
                if (!cl) {
                    clientIssues.push(`clientId "${clientId}" not found in your organization`);
                } else {
                    action = 'link_existing';
                    linkedClientId = cl._id.toString();
                }
            } else if (clientPhone || clientEmail) {
                const byPhone = clientPhone
                    ? await Client.find({ organization: organizationId, deletedAt: null, phone: clientPhone }).select('_id').lean()
                    : [];
                const byEmail = clientEmail
                    ? await Client.find({ organization: organizationId, deletedAt: null, email: clientEmail }).select('_id').lean()
                    : [];

                if (byPhone.length > 1) clientIssues.push(`clientPhone "${clientPhoneRaw}" matches multiple clients`);
                if (byEmail.length > 1) clientIssues.push(`clientEmail "${clientEmail}" matches multiple clients`);

                const phoneId = byPhone[0]?._id?.toString();
                const emailId = byEmail[0]?._id?.toString();
                if (phoneId && emailId && phoneId !== emailId) {
                    clientIssues.push('clientPhone and clientEmail belong to different clients');
                }

                const resolved = phoneId || emailId || null;
                if (!clientIssues.length && resolved) {
                    action = 'link_existing';
                    linkedClientId = resolved;
                }
            }

            if (!linkedClientId && (clientPhone || clientEmail || toSafeString(d.clientFirstName) || toSafeString(d.clientLastName))) {
                const cf = toSafeString(d.clientFirstName);
                const cln = toSafeString(d.clientLastName);
                const streetAddress = toSafeString(d.clientStreetAddress);
                const city = toSafeString(d.clientCity);
                const province = toSafeString(d.clientProvince);
                const postalCode = toSafeString(d.clientPostalCode);
                const country = toSafeString(d.clientCountry) || 'India';
                const fees = toOptionalNumber(d.clientFees);

                if (!clientPhone && !clientEmail) clientIssues.push('clientPhone or clientEmail is required to match/create client');
                if (clientPhone && clientPhone.length !== 10) clientIssues.push('clientPhone must be a 10-digit number');
                if (!cf) clientIssues.push('clientFirstName is required to create client');
                if (!cln) clientIssues.push('clientLastName is required to create client');
                if (!streetAddress) clientIssues.push('clientStreetAddress is required to create client');
                if (!city) clientIssues.push('clientCity is required to create client');
                if (!province) clientIssues.push('clientProvince is required to create client');
                if (!postalCode) clientIssues.push('clientPostalCode is required to create client');
                if (fees === undefined || Number.isNaN(fees)) clientIssues.push('clientFees is required to create client and must be a number');

                if (!clientIssues.length) {
                    action = 'create_new';
                }

                clientPreviews.push({
                    row: r,
                    action,
                    issues: clientIssues,
                    match: { clientId: linkedClientId || null },
                    data: {
                        clientPhone: clientPhone || '',
                        clientEmail: clientEmail || '',
                        clientFirstName: cf || '',
                        clientLastName: cln || '',
                        clientStreetAddress: streetAddress || '',
                        clientCity: city || '',
                        clientProvince: province || '',
                        clientPostalCode: postalCode || '',
                        clientCountry: country || 'India',
                        clientFees: fees ?? ''
                    }
                });
            } else if (linkedClientId) {
                clientPreviews.push({
                    row: r,
                    action: 'link_existing',
                    issues: clientIssues,
                    match: { clientId: linkedClientId },
                    data: {
                        clientPhone: clientPhone || '',
                        clientEmail: clientEmail || ''
                    }
                });
            } else {
                // no client info in this row
                clientPreviews.push({ row: r, action: 'none', issues: clientIssues, match: { clientId: null }, data: {} });
            }

            if (!clientIssues.length && linkedClientId) resolvedClientIds.add(linkedClientId);
        }

        const effectiveClientCount = clientCount === undefined ? resolvedClientIds.size : (Number.isNaN(clientCount) ? NaN : clientCount);
        if (Number.isNaN(effectiveClientCount)) caseIssues.push('clientCount must be a number');
        if (resolvedClientIds.size > effectiveClientCount) {
            caseIssues.push(`Cannot assign more than ${effectiveClientCount} client(s). Found ${resolvedClientIds.size} unique linked client(s).`);
        }

        const willCreateCase = caseIssues.length === 0 && clientPreviews.every((cp) => (cp.issues || []).length === 0);
        if (caseIssues.length > 0) errors.push({ row: first.rowNumber, ...(caseNumber ? { caseNumber } : {}), errors: caseIssues });
        for (const cp of clientPreviews) {
            if (cp.issues && cp.issues.length > 0) errors.push({ row: cp.row, ...(caseNumber ? { caseNumber } : {}), errors: cp.issues });
        }

        preview.push({
            ...(caseNumber ? { caseNumber } : {}),
            willCreate: willCreateCase,
            issues: caseIssues,
            data: {
                caseType,
                partyName,
                stage: stage || '',
                courtName: courtName || '',
                courtPremises: courtPremises || '',
                clientCount: effectiveClientCount,
                assignedTo: '',
                notes: notes || ''
            },
            clients: clientPreviews
        });
    }

    res.status(200).json({
        success: true,
        message: 'Case Excel preview generated',
        data: {
            cases: preview,
            totals: {
                totalCases: preview.length,
                validCases: preview.filter((p) => p.willCreate).length,
                invalidCases: preview.filter((p) => !p.willCreate).length
            },
            errors
        }
    });
});
