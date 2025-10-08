const crypto = require('crypto');

// Generate a 256-bit hex-encoded secret
const secret = crypto.randomBytes(32).toString('hex');

console.log(secret);