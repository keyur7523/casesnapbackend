// models/Employee.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeSchema = new mongoose.Schema({
    // Admin Reference
    adminId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Admin ID is required']
    },
    
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
        required: false, // Only required during full registration
        match: [/^\d{10}$/, 'Phone number must be a 10-digit number']
    },
    address: {
        type: String,
        required: false, // Only required during full registration
        trim: true,
        maxlength: [200, 'Address cannot be more than 200 characters']
    },
    
    // Personal Information
    gender: {
        type: String,
        required: false, // Only required during full registration
        enum: ['Male', 'Female', 'Other', 'Prefer not to say']
    },
    dateOfBirth: {
        type: Date,
        required: false // Only required during full registration
    },
    age: {
        type: Number,
        required: false, // Only required during full registration
        min: [18, 'Age must be at least 18'],
        max: [100, 'Age cannot exceed 100']
    },
    aadharCardNumber: {
        type: String,
        required: false, // Only required during full registration
        match: [/^\d{12}$/, 'Aadhar card number must be 12 digits'],
        unique: true,
        sparse: true // Allows null values but ensures uniqueness when present
    },
    
    // Employment Information
    employeeType: {
        type: String,
        required: false, // Only required during full registration
        enum: ['advocate', 'intern', 'staff', 'other']
    },
    advocateLicenseNumber: {
        type: String,
        required: function() {
            return this.employeeType === 'advocate';
        },
        trim: true
    },
    internYear: {
        type: Number,
        required: function() {
            return this.employeeType === 'intern';
        },
        min: [1, 'Intern year must be at least 1'],
        max: [4, 'Intern year cannot exceed 4']
    },
    salary: {
        type: Number,
        required: [true, 'Salary is required'],
        min: [0, 'Salary cannot be negative']
    },
    department: {
        type: String,
        required: false, // Only required during full registration
        trim: true,
        maxlength: [100, 'Department name cannot exceed 100 characters']
    },
    position: {
        type: String,
        required: false, // Only required during full registration
        trim: true,
        maxlength: [100, 'Position cannot exceed 100 characters']
    },
    startDate: {
        type: Date,
        required: false // Only required during full registration
    },
    
    // Emergency Contact Information
    emergencyContactName: {
        type: String,
        required: false, // Only required during full registration
        trim: true,
        maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    emergencyContactPhone: {
        type: String,
        required: false, // Only required during full registration
        match: [/^\d{10}$/, 'Emergency contact phone must be a 10-digit number']
    },
    emergencyContactRelation: {
        type: String,
        required: false, // Only required during full registration
        trim: true,
        maxlength: [50, 'Emergency contact relation cannot exceed 50 characters']
    },
    
    // Authentication
    password: {
        type: String,
        required: false, // Only required during full registration
        minlength: [6, 'Password must be at least 6 characters']
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
        enum: ['pending', 'active', 'inactive', 'terminated'],
        default: 'pending'
    },
    
    // Employment Status (for archiving old employees)
    employmentStatus: {
        type: String,
        enum: ['employed', 'archived'],
        default: 'employed'
    },
    archivedAt: {
        type: Date,
        default: null
    },
    archivedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    },
    archiveReason: {
        type: String,
        maxlength: [200, 'Archive reason cannot exceed 200 characters'],
        default: null
    },
    
    // Soft Delete (for mistakes/errors)
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    
    // Status History for Audit Trail
    statusHistory: [{
        from: {
            type: String,
            enum: ['pending', 'active', 'inactive', 'terminated']
        },
        to: {
            type: String,
            enum: ['pending', 'active', 'inactive', 'terminated']
        },
        changedBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        reason: {
            type: String,
            maxlength: [200, 'Reason cannot exceed 200 characters']
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters']
        }
    }],
    
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

// Hash password before saving
EmployeeSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new) and is not empty
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Match password method
EmployeeSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual for full name
EmployeeSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
EmployeeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
