// models/Role.js
// Role model with hierarchical priority and module-based permissions

const mongoose = require('mongoose');
const { generateRoleId } = require('../utils/idGenerator');

const PermissionSchema = new mongoose.Schema({
    module: {
        type: String,
        required: [true, 'Module name is required'],
        trim: true,
        lowercase: true
        // Enum removed - will be validated dynamically against Module collection
    },
    actions: [{
        type: String,
        enum: ['create', 'read', 'update', 'delete', 'assignee'],
        required: true
    }]
}, { _id: false });

const RoleSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: generateRoleId
    },
    name: {
        type: String,
        required: [true, 'Role name is required'],
        trim: true,
        maxlength: [100, 'Role name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    organization: {
        type: String,
        ref: 'Organization',
        required: [true, 'Role must belong to an organization'],
        index: true
    },
    priority: {
        type: Number,
        required: [true, 'Priority is required'],
        min: [1, 'Priority must be at least 1'],
        // Priority must be unique per organization (enforced via compound index)
    },
    permissions: {
        type: [PermissionSchema],
        default: [],
        validate: {
            validator: function(permissions) {
                // Ensure no duplicate modules
                const modules = permissions.map(p => p.module);
                return modules.length === new Set(modules).size;
            },
            message: 'Each module can only appear once in permissions'
        }
    },
    isSystemRole: {
        type: Boolean,
        default: false // SUPER_ADMIN is a system role
    },
    createdBy: {
        type: String,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index: priority must be unique per organization
RoleSchema.index({ organization: 1, priority: 1 }, { unique: true });

// Index for faster queries
RoleSchema.index({ organization: 1, name: 1 });

// Prevent priority updates after creation
RoleSchema.pre('save', function(next) {
    if (this.isModified('priority') && !this.isNew) {
        return next(new Error('Role priority cannot be modified after creation'));
    }
    next();
});

// Virtual to check if role is SUPER_ADMIN
RoleSchema.virtual('isSuperAdmin').get(function() {
    return this.priority === 1 && this.isSystemRole;
});

// Method to check if role has permission for a module and action
RoleSchema.methods.hasPermission = function(module, action) {
    const permission = this.permissions.find(p => p.module === module);
    if (!permission) return false;
    return permission.actions.includes(action);
};

// Method to check if role can manage another role (based on priority)
RoleSchema.methods.canManageRole = function(targetRole) {
    // Can only manage roles with higher priority (lower authority)
    return this.priority < targetRole.priority;
};

module.exports = mongoose.model('Role', RoleSchema);
