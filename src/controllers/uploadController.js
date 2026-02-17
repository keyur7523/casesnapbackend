// controllers/uploadController.js
// Generic image upload to Cloudinary (max 1 MB). Use anywhere — profile, Aadhar, documents, etc.

const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Upload image to Cloudinary (max 1 MB)
 * @route   POST /api/upload
 * @access  Private
 * @body    multipart/form-data with field "file", "image", or "aadharImage"
 */
exports.uploadAadharImage = asyncHandler(async (req, res, next) => {
    if (!req.file || !req.file.buffer) {
        return next(new ErrorResponse('No image uploaded. Send multipart/form-data with field "file", "image", or "aadharImage" (max 1 MB)', 400));
    }

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'casesnap/uploads',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    });

    const url = result.secure_url || result.url;
    const size = result.bytes ?? req.file.size ?? null;

    res.status(200).json({
        success: true,
        data: {
            url,
            size,
            filename: result.public_id,
            originalName: req.file.originalname
        }
    });
});
