// config/cloudinary.js
// Cloudinary config for client Aadhar card image uploads.
// Required in .env:
//   CLOUDINARY_CLOUD_NAME=xxxxx
//   CLOUDINARY_API_KEY=xxxxx
//   CLOUDINARY_API_SECRET=xxxxx

const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });
} else {
    console.warn('Cloudinary env not set (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Aadhar upload will fail until configured.');
}

module.exports = cloudinary;
