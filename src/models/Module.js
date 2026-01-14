// models/Module.js
// Module model for dynamic module management

const mongoose = require('mongoose');
const { generateModuleId } = require('../utils/idGenerator');

const ModuleSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: generateModuleId
    },
    name: {
        type: String,
        required: [true, 'Module name is required'],
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: [50, 'Module name cannot exceed 50 characters']
    },
    displayName: {
        type: String,
        required: [true, 'Module display name is required'],
        trim: true,
        maxlength: [100, 'Display name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    isActive: {
        type: Boolean,
        default: true
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

// Index for faster lookups
ModuleSchema.index({ name: 1 });
ModuleSchema.index({ isActive: 1 });

module.exports = mongoose.model('Module', ModuleSchema);
