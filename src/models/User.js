// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    // We'll use email as the primary login identifier and also as the username
    // The frontend's superAdminData doesn't have a separate username field,
    // and login uses email, so this makes sense.
    // We will populate this `username` with the `email` value for consistency.
    username: {
        type: String,
        required: [true, 'Please add a username'],
        unique: true, // Must be unique across all users
        trim: true,
        lowercase: true, // Store usernames as lowercase
        maxlength: [50, 'Username can not be more than 50 characters']
    },
    firstName: { // <--- NEW FIELD
        type: String,
        required: [true, 'Please add a first name'],
        trim: true
    },
    lastName: { // <--- NEW FIELD
        type: String,
        required: [true, 'Please add a last name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true, // Must be unique across all users
        lowercase: true, // Store emails as lowercase
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    phone: { // <--- NEW FIELD
        type: String, // Store as string, validate as 10 digits
        required: [true, 'Please add a phone number'],
        match: [/^\d{10}$/, 'Phone number must be a 10-digit number']
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    organization: { // <--- NEW FIELD: Link to the organization
        type: mongoose.Schema.ObjectId,
        ref: 'Organization', // References the Organization model
        required: [true, 'User must belong to an organization'] // Every user belongs to an organization
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Mongoose Middleware (runs before saving to DB)
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id, role: this.role, organization: this.organization }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Method to compare entered password with hashed password in DB
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);