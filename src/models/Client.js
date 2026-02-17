// models/Client.js
// Client model for case management system

const mongoose = require('mongoose');
const { generateClientId } = require('../utils/idGenerator');

const ClientSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: generateClientId
    },
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'Please add a first name'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Please add a last name'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    // Contact Information
    email: {
        type: String,
        required: false, // Email is optional for clients
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number'],
        match: [/^\d{10}$/, 'Phone number must be a 10-digit number']
    },
    alternatePhone: {
        type: String,
        match: [/^\d{10}$/, 'Alternate phone number must be a 10-digit number']
    },
    // Address Information
    streetAddress: {
        type: String,
        required: [true, 'Please add a street address'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'Please add a city'],
        trim: true
    },
    province: {
        type: String,
        required: [true, 'Please add a province/state'],
        trim: true
    },
    postalCode: {
        type: String,
        required: [true, 'Please add a postal code'],
        trim: true
    },
    country: {
        type: String,
        default: 'India',
        trim: true
    },
    // Additional Information
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
        trim: true
    },
    occupation: {
        type: String,
        trim: true,
        maxlength: [100, 'Occupation cannot exceed 100 characters']
    },
    companyName: {
        type: String,
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    // Legal Information
    aadharCardNumber: {
        type: String,
        match: [/^\d{12}$/, 'Aadhar card number must be 12 digits']
    },
    // Aadhar card image (URL from upload API)
    aadharImageUrl: {
        type: String,
        required: false,
        trim: true
    },
    panCardNumber: {
        type: String,
        match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN card number must be in valid format']
    },
    // Financial Information
    fees: {
        type: Number,
        required: [true, 'Please add client fees'],
        min: [0, 'Fees cannot be negative']
    },
    // Organization Reference
    organization: {
        type: String,
        ref: 'Organization',
        required: [true, 'Client must belong to an organization'],
        index: true
    },
    // Assigned Employee/Admin
    assignedTo: {
        type: String,
        ref: 'User',
        required: false
    },
    // Status
    status: {
        type: String,
        // 'prospect' added as requested, 'archived' kept for internal soft‑delete/archive handling
        enum: ['active', 'inactive', 'prospect', 'archived'],
        default: 'active',
        index: true
    },
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
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
ClientSchema.index({ organization: 1, status: 1 });
ClientSchema.index({ organization: 1, email: 1 });
ClientSchema.index({ organization: 1, phone: 1 });
ClientSchema.index({ assignedTo: 1 });
ClientSchema.index({ deletedAt: 1 });

// Virtual for full name
ClientSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
ClientSchema.set('toJSON', { virtuals: true });
ClientSchema.set('toObject', { virtuals: true });

// Prevent querying deleted clients by default
ClientSchema.pre(/^find/, function(next) {
    if (this.getOptions().includeDeleted !== true) {
        this.where({ deletedAt: null });
    }
    next();
});

module.exports = mongoose.model('Client', ClientSchema);
