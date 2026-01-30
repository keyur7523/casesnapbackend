// models/Notification.js
// In-app notifications (e.g. new client created → notify assignees)

const mongoose = require('mongoose');
const { generateNotificationId } = require('../utils/idGenerator');

const NotificationSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: generateNotificationId
    },
    userId: {
        type: String,
        ref: 'User',
        required: true,
        index: true
    },
    organization: {
        type: String,
        ref: 'Organization',
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        trim: true,
        enum: ['client_created', 'case_created'],
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
        type: String,
        trim: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    relatedEntityType: {
        type: String,
        trim: true,
        enum: ['client', 'case'],
        default: 'client'
    },
    relatedEntityId: {
        type: String,
        trim: true,
        index: true
    },
    createdBy: {
        type: String,
        ref: 'User',
        trim: true
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
