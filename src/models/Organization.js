// models/Organization.js

const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: [true, 'Please add a company name'],
        unique: true, // Company names should be unique
        trim: true,
        maxlength: [100, 'Company name can not be more than 100 characters']
    },
    companyEmail: {
        type: String,
        required: [true, 'Please add a company email'],
        unique: true, // Company emails should be unique
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid company email'
        ]
    },
    companyPhone: {
        type: String, // Storing as string to preserve formatting/leading zeros if needed, but validated as 10 digits
        required: [true, 'Please add a company phone number'],
        match: [/^\d{10}$/, 'Phone number must be a 10-digit number'] // Frontend validates 10 digits
    },
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
    province: { // Corresponds to Indian states
        type: String,
        required: [true, 'Please add a province/state'],
        trim: true
        // You might want to add an enum here based on `indianStates` array from frontend
    },
    postalCode: {
        type: String,
        required: [true, 'Please add a postal code'],
        trim: true
    },
    country: {
        type: String,
        required: [true, 'Please add a country'],
        default: 'India', // Matches frontend default
        trim: true
    },
    companyWebsite: {
        type: String,
        match: [
            /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
            'Please enter a valid website URL'
        ],
        trim: true,
        default: '' // Allow empty string if not provided
    },
    industry: {
        type: String,
        required: [true, 'Please add an industry'],
        trim: true
        // You might want to add an enum here as well
    },
    practiceAreas: {
        type: [String], // Array of strings
        required: [true, 'Please select at least one practice area'],
        default: [],
        // You could add custom validation here to ensure practice areas are from a predefined list if needed
    },
    // Reference to the super admin user, though the user will also reference the organization
    superAdmin: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: false // Will be added after user is created
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('Organization', OrganizationSchema);