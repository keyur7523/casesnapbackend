// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Will use for password hashing

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please add a username'],
        unique: true,
        trim: true,
        maxlength: [50, 'Username can not be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // When we query a user, the password won't be returned by default
    },
    role: {
        type: String,
        enum: ['user', 'admin'], // Defines possible roles
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // This will automatically add `createdAt` and `updatedAt` fields
});

// --------------------------------------------------------------------------
// Mongoose Middleware (runs before saving to DB)
// --------------------------------------------------------------------------

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) { // Only hash if the password has been modified (or is new)
        next();
    }
    const salt = await bcrypt.genSalt(10); // Generate a salt with a strength of 10
    this.password = await bcrypt.hash(this.password, salt); // Hash the password
    next();
});

// Method to compare entered password with hashed password in DB
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};


module.exports = mongoose.model('User', UserSchema);