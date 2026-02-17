// routes/uploadRoutes.js
// Client Aadhar card image only — stored in Cloudinary (max 1 MB).

const express = require('express');
const multer = require('multer');
const { uploadAadharImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

const router = express.Router();

const uploadAadhar = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, JPEG, PNG and WebP images are allowed for Aadhar card (max 1 MB)'), false);
        }
    }
});

const normalizeAadharFile = (req, res, next) => {
    if (req.file) return next();
    if (req.files) {
        const f = req.files.aadharImage?.[0] || req.files.image?.[0] || req.files.file?.[0];
        if (f) req.file = f;
    }
    next();
};

// Accept common field names so frontend can use "file", "image", or "aadharImage". Single file, max 1 MB.
router.post('/', protect, uploadAadhar.fields([
    { name: 'aadharImage', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 }
]), normalizeAadharFile, uploadAadharImage);

module.exports = router;
