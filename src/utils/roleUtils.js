// utils/roleUtils.js
// Utility functions for role management

const Role = require('../models/Role');
const Module = require('../models/Module');

/**
 * Get the next suggested priority for a new role in an organization
 * @param {String} organizationId - Organization ID
 * @returns {Promise<Number>} Suggested priority (highest existing priority + 1)
 */
exports.getSuggestedPriority = async (organizationId) => {
    try {
        // Find the role with highest priority in the organization
        const highestPriorityRole = await Role.findOne({ organization: organizationId })
            .sort({ priority: -1 })
            .select('priority')
            .lean();

        if (!highestPriorityRole) {
            // No roles exist yet, suggest priority 2 (1 is reserved for SUPER_ADMIN)
            return 2;
        }

        // Suggest next priority (highest + 1)
        return highestPriorityRole.priority + 1;
    } catch (error) {
        console.error('❌ Error getting suggested priority:', error.message);
        throw error;
    }
};

/**
 * Validate that a user can create a role with the given priority
 * @param {Object} userRole - User's role object
 * @param {Number} newPriority - Priority of the role being created
 * @returns {Object} { valid: boolean, error: string }
 */
exports.validateRoleCreation = (userRole, newPriority) => {
    // SUPER_ADMIN (priority 1) can create any role
    if (userRole.priority === 1) {
        return { valid: true };
    }

    // User can only create roles with higher priority (lower authority)
    if (userRole.priority >= newPriority) {
        return {
            valid: false,
            error: `You can only create roles with priority higher than ${userRole.priority}. Requested priority: ${newPriority}`
        };
    }

    return { valid: true };
};

/**
 * Get all active modules from database
 * @returns {Promise<Array>} Array of module names
 */
exports.getActiveModules = async () => {
    try {
        const modules = await Module.find({ isActive: true })
            .select('name displayName')
            .lean();
        return modules.map(m => m.name);
    } catch (error) {
        console.error('❌ Error getting active modules:', error.message);
        // Fallback to default modules if database query fails
        return ['client', 'cases'];
    }
};

/**
 * Validate permissions structure
 * @param {Array} permissions - Array of permission objects
 * @returns {Promise<Object>} { valid: boolean, error: string }
 */
exports.validatePermissions = async (permissions) => {
    if (!Array.isArray(permissions)) {
        return { valid: false, error: 'Permissions must be an array' };
    }

    // Get valid modules from database
    const validModules = await exports.getActiveModules();
    const validActions = ['create', 'read', 'update', 'delete'];

    const seenModules = new Set();

    for (const permission of permissions) {
        // Normalize module name to lowercase
        const moduleName = permission.module ? permission.module.toLowerCase().trim() : null;
        
        // Check module
        if (!moduleName || !validModules.includes(moduleName)) {
            return {
                valid: false,
                error: `Invalid module: ${permission.module}. Must be one of: ${validModules.join(', ')}`
            };
        }

        // Check for duplicate modules
        if (seenModules.has(moduleName)) {
            return {
                valid: false,
                error: `Duplicate module: ${permission.module}`
            };
        }
        seenModules.add(moduleName);

        // Check actions
        if (!permission.actions || !Array.isArray(permission.actions) || permission.actions.length === 0) {
            return {
                valid: false,
                error: `Module ${permission.module} must have at least one action`
            };
        }

        // Validate each action
        for (const action of permission.actions) {
            if (!validActions.includes(action)) {
                return {
                    valid: false,
                    error: `Invalid action: ${action} for module ${permission.module}. Must be one of: ${validActions.join(', ')}`
                };
            }
        }
    }

    return { valid: true };
};
