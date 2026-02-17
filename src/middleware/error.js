// middleware/error.js

const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
    let error = { ...err }; // Copy the error object
    error.message = err.message; // Ensure message is copied

    // Log to console for dev
    console.error(err);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = new ErrorResponse(message, 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        // Extract the duplicated field name from the error message
        const duplicatedField = Object.keys(err.keyValue)[0];
        const message = `Duplicate field value entered for ${duplicatedField}.`;
        error = new ErrorResponse(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        error = new ErrorResponse(messages.join(', '), 400);
    }

    // Multer errors (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
        error = new ErrorResponse('File too large. Aadhar image max size is 1 MB', 400);
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error = new ErrorResponse('Use form field name: file, image, or aadharImage', 400);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        error = new ErrorResponse(err.message || 'File upload limit exceeded', 400);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

module.exports = errorHandler;