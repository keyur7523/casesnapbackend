// models/Employee.js

const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'Please add a first name'],
        trim: true,
        maxlength: [50, 'First name cannot be more than 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Please add a last name'],
        trim: true,
        maxlength: [50, 'Last name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    
    // Contact Information
    phone: {
        type: String,
        required: false, // Only required when completing registration
        match: [/^\d{10}$/, 'Phone number must be a 10-digit number']
    },
    address: {
        type: String,
        required: false, // Only required when completing registration
        trim: true,
        maxlength: [200, 'Address cannot be more than 200 characters']
    },
    
    // Personal Information
    gender: {
        type: String,
        required: false, // Only required when completing registration
        enum: ['Male', 'Female', 'Other', 'Prefer not to say']
    },
    dateOfBirth: {
        type: Date,
        required: false // Only required when completing registration
    },
    
    // Organization Reference
    organization: {
        type: mongoose.Schema.ObjectId,
        ref: 'Organization',
        required: [true, 'Employee must belong to an organization']
    },
    
    // Invitation Status
    invitationStatus: {
        type: String,
        enum: ['pending', 'completed', 'expired'],
        default: 'pending'
    },
    invitationToken: {
        type: String,
        sparse: true // Allows null values but ensures uniqueness when present
    },
    invitationExpires: {
        type: Date,
        default: function() {
            // Token expires in 7 days
            return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
    },
    
    // Employee Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'terminated'],
        default: 'active'
    },
    
    // Timestamps
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

// Index for better query performance
EmployeeSchema.index({ organization: 1, email: 1 });

// Virtual for full name
EmployeeSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
EmployeeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
