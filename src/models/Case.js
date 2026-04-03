// models/Case.js
// Case model for legal case management

const mongoose = require('mongoose');
const { generateCaseId } = require('../utils/idGenerator');

// Static enums - can be expanded later
const COURT_PREMISES_ENUM = ['District Court', 'High Court', 'Supreme Court', 'Tribunal', 'Other'];
const COURT_NAME_ENUM = ['District Court Delhi', 'High Court Delhi', 'Supreme Court', 'Consumer Forum', 'Labour Court', 'Family Court', 'Other'];

const CaseStageSchema = new mongoose.Schema({
    stageName: {
        type: String,
        required: [true, 'Stage name is required'],
        trim: true,
        maxlength: [150, 'Stage name cannot exceed 150 characters']
    },
    todaySummary: {
        type: String,
        trim: true,
        maxlength: [2000, 'Today summary cannot exceed 2000 characters']
    },
    nextDate: {
        type: Date,
        default: null
    },
    nextDatePurpose: {
        type: String,
        trim: true,
        maxlength: [500, 'Next date purpose cannot exceed 500 characters']
    },
    nextDatePreparation: {
        type: String,
        trim: true,
        maxlength: [2000, 'Next date preparation cannot exceed 2000 characters']
    },
    confirmedBy: {
        type: String,
        ref: 'User',
        required: [true, 'Confirmed by is required']
    },
    confirmedAt: {
        type: Date,
        default: null
    },
    reminderMeta: {
        before5DaysSentAt: { type: Date, default: null },
        before2DaysSentAt: { type: Date, default: null },
        before1DaySentAt: { type: Date, default: null },
        afterDateSentAt: { type: Date, default: null }
    },
    createdBy: {
        type: String,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: String,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

const CaseSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: generateCaseId
    },
    caseNumber: {
        type: String,
        required: [true, 'Case number is required'],
        trim: true,
        maxlength: [100, 'Case number cannot exceed 100 characters']
    },
    caseType: {
        type: String,
        required: [true, 'Case type is required'],
        trim: true,
        maxlength: [100, 'Case type cannot exceed 100 characters']
    },
    partyName: {
        type: String,
        required: [true, 'Party name is required'],
        trim: true,
        maxlength: [200, 'Party name cannot exceed 200 characters']
    },
    stages: [CaseStageSchema],
    courtName: {
        type: String,
        enum: COURT_NAME_ENUM,
        trim: true
    },
    courtPremises: {
        type: String,
        enum: COURT_PREMISES_ENUM,
        trim: true
    },
    /** How many clients can be assigned to this case (input from frontend) */
    clientCount: {
        type: Number,
        default: 0,
        min: [0, 'Client count cannot be negative'],
        required: false
    },
    /** Linked clients - only clientCount can be assigned; only assignees can assign */
    clients: [{
        type: String,
        ref: 'Client'
    }],
    // Organization Reference
    organization: {
        type: String,
        ref: 'Organization',
        required: [true, 'Case must belong to an organization'],
        index: true
    },
    // Assigned User
    assignedTo: {
        type: String,
        ref: 'User',
        required: false
    },
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
        index: true
    },
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    // Soft Delete
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: String,
        ref: 'User',
        default: null
    },
    // Created/Updated by
    createdBy: {
        type: String,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: String,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Indexes for better query performance
CaseSchema.index({ organization: 1, status: 1 });
CaseSchema.index({ organization: 1, caseNumber: 1 });
CaseSchema.index({ organization: 1, status: 1, 'stages.nextDate': 1 });
CaseSchema.index({ assignedTo: 1 });
CaseSchema.index({ deletedAt: 1 });

// Prevent querying deleted cases by default
CaseSchema.pre(/^find/, function(next) {
    if (this.getOptions().includeDeleted !== true) {
        this.where({ deletedAt: null });
    }
    next();
});

module.exports = mongoose.model('Case', CaseSchema);
