// controllers/roleController.js
// Role management controller with priority-based RBAC

const Role = require('../models/Role');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Module = require('../models/Module');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { getSuggestedPriority, validateRoleCreation, validatePermissions } = require('../utils/roleUtils');

/**
 * @desc    Get suggested priority for new role
 * @route   GET /api/roles/suggest-priority
 * @access  Private (Admin with role)
 */
exports.getSuggestedPriority = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;

    const suggestedPriority = await getSuggestedPriority(organizationId);

    res.status(200).json({
        success: true,
        data: {
            suggestedPriority
        }
    });
});

/**
 * @desc    Create a new role
 * @route   POST /api/roles
 * @access  Private (Admin with role)
 */
exports.createRole = asyncHandler(async (req, res, next) => {
    const { name, description, priority, permissions } = req.body;
    const organizationId = req.user.organization;
    const creatorRole = req.userRole;

    // Validate required fields
    if (!name) {
        return next(new ErrorResponse('Role name is required', 400));
    }

    if (!priority || priority < 1) {
        return next(new ErrorResponse('Priority must be a positive number', 400));
    }

    // Validate permissions structure (async)
    const permissionValidation = await validatePermissions(permissions || []);
    if (!permissionValidation.valid) {
        return next(new ErrorResponse(permissionValidation.error, 400));
    }

    // Check if user can create this role
    const creationValidation = validateRoleCreation(creatorRole, priority);
    if (!creationValidation.valid) {
        return next(new ErrorResponse(creationValidation.error, 403));
    }

    // Check if priority already exists in organization
    const existingRole = await Role.findOne({
        organization: organizationId,
        priority: priority
    });

    if (existingRole) {
        return next(new ErrorResponse(
            `Priority ${priority} already exists in this organization`,
            400
        ));
    }

    // Prevent creating role with priority 1 (reserved for SUPER_ADMIN)
    if (priority === 1 && !creatorRole.isSuperAdmin) {
        return next(new ErrorResponse(
            'Priority 1 is reserved for SUPER_ADMIN',
            403
        ));
    }

    // Create role
    const role = await Role.create({
        name,
        description,
        organization: organizationId,
        priority,
        permissions: permissions || [],
        createdBy: req.user._id
    });

    console.log('✅ Role created:', {
        id: role._id,
        name: role.name,
        priority: role.priority,
        organization: organizationId,
        createdBy: req.user._id
    });

    // Get available modules
    const modules = await Module.find({ isActive: true })
        .select('name displayName description')
        .sort({ name: 1 });

    res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: {
            role: {
                id: role._id,
                name: role.name,
                description: role.description,
                priority: role.priority,
                permissions: role.permissions,
                organization: role.organization,
                createdAt: role.createdAt
            },
            suggestedPriority: await getSuggestedPriority(organizationId),
            modules: modules // Include available modules in response
        }
    });
});

/**
 * @desc    Get all roles for an organization
 * @route   GET /api/roles
 * @access  Private (Admin with role)
 */
exports.getRoles = asyncHandler(async (req, res, next) => {
    const organizationId = req.user.organization;

    const roles = await Role.find({ organization: organizationId })
        .populate('createdBy', 'firstName lastName email')
        .sort({ priority: 1 }); // Sort by priority ascending (1 = highest authority)

    // Get available modules
    const modules = await Module.find({ isActive: true })
        .select('name displayName description')
        .sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: roles.length,
        data: roles,
        modules: modules // Include available modules in response
    });
});

/**
 * @desc    Get single role by ID
 * @route   GET /api/roles/:roleId
 * @access  Private (Admin with role)
 */
exports.getRole = asyncHandler(async (req, res, next) => {
    const { roleId } = req.params;
    const organizationId = req.user.organization;

    const role = await Role.findOne({
        _id: roleId,
        organization: organizationId
    }).populate('createdBy', 'firstName lastName email');

    if (!role) {
        return next(new ErrorResponse('Role not found', 404));
    }

    res.status(200).json({
        success: true,
        data: role
    });
});

/**
 * @desc    Update role (name, description, permissions only - priority is immutable)
 * @route   PUT /api/roles/:roleId
 * @access  Private (Admin with role that can manage target role)
 */
exports.updateRole = asyncHandler(async (req, res, next) => {
    const { roleId } = req.params;
    const { name, description, permissions } = req.body;
    const organizationId = req.user.organization;
    const creatorRole = req.userRole;

    // Find role
    const role = await Role.findOne({
        _id: roleId,
        organization: organizationId
    });

    if (!role) {
        return next(new ErrorResponse('Role not found', 404));
    }

    // Check if user can manage this role
    if (!creatorRole.canManageRole(role)) {
        return next(new ErrorResponse(
            `You cannot manage roles with priority ${role.priority} or lower`,
            403
        ));
    }

    // Prevent updating priority (immutable)
    if (req.body.priority && req.body.priority !== role.priority) {
        return next(new ErrorResponse('Role priority cannot be modified', 400));
    }

    // Validate permissions if provided
    if (permissions) {
        const permissionValidation = validatePermissions(permissions);
        if (!permissionValidation.valid) {
            return next(new ErrorResponse(permissionValidation.error, 400));
        }
    }

    // Update role
    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;

    await role.save();

    console.log('✅ Role updated:', {
        id: role._id,
        name: role.name,
        updatedBy: req.user._id
    });

    res.status(200).json({
        success: true,
        message: 'Role updated successfully',
        data: role
    });
});

/**
 * @desc    Delete role
 * @route   DELETE /api/roles/:roleId
 * @access  Private (Admin with role that can manage target role)
 */
exports.deleteRole = asyncHandler(async (req, res, next) => {
    const { roleId } = req.params;
    const organizationId = req.user.organization;
    const creatorRole = req.userRole;

    // Find role
    const role = await Role.findOne({
        _id: roleId,
        organization: organizationId
    });

    if (!role) {
        return next(new ErrorResponse('Role not found', 404));
    }

    // Prevent deleting SUPER_ADMIN role
    if (role.isSuperAdmin) {
        return next(new ErrorResponse('Cannot delete SUPER_ADMIN role', 403));
    }

    // Check if user can manage this role
    if (!creatorRole.canManageRole(role)) {
        return next(new ErrorResponse(
            `You cannot delete roles with priority ${role.priority} or lower`,
            403
        ));
    }

    // Check if any users are assigned to this role
    const usersWithRole = await User.countDocuments({ role: roleId });
    if (usersWithRole > 0) {
        return next(new ErrorResponse(
            `Cannot delete role: ${usersWithRole} user(s) are assigned to this role`,
            400
        ));
    }

    await role.deleteOne();

    console.log('✅ Role deleted:', {
        id: roleId,
        name: role.name,
        deletedBy: req.user._id
    });

    res.status(200).json({
        success: true,
        message: 'Role deleted successfully',
        data: {}
    });
});

/**
 * @desc    Assign role to user
 * @route   POST /api/roles/:roleId/assign/:userId
 * @access  Private (Admin with role that can manage target role)
 */
exports.assignRoleToUser = asyncHandler(async (req, res, next) => {
    const { roleId, userId } = req.params;
    const organizationId = req.user.organization;
    const creatorRole = req.userRole;

    // Find role
    const role = await Role.findOne({
        _id: roleId,
        organization: organizationId
    });

    if (!role) {
        return next(new ErrorResponse('Role not found', 404));
    }

    // Check if user can manage this role
    if (!creatorRole.canManageRole(role)) {
        return next(new ErrorResponse(
            `You cannot assign roles with priority ${role.priority} or lower`,
            403
        ));
    }

    // Find user
    const user = await User.findOne({
        _id: userId,
        organization: organizationId
    });

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    // Assign role
    user.role = roleId;
    await user.save();

    console.log('✅ Role assigned:', {
        roleId: roleId,
        roleName: role.name,
        userId: userId,
        userName: `${user.firstName} ${user.lastName}`,
        assignedBy: req.user._id
    });

    res.status(200).json({
        success: true,
        message: 'Role assigned successfully',
        data: {
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: {
                    id: role._id,
                    name: role.name,
                    priority: role.priority
                }
            }
        }
    });
});
