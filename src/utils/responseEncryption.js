// utils/responseEncryption.js
// Encrypts API response data using AES-256-GCM

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get the encryption key from env.
 * RESPONSE_ENCRYPTION_KEY: 64 hex chars (= 32 bytes) or any string (hashed to 32 bytes)
 * Falls back to JWT_SECRET if RESPONSE_ENCRYPTION_KEY not set (for backward compat)
 */
function getEncryptionKey() {
    const key = process.env.RESPONSE_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!key || key.length < 16) {
        return null;
    }
    if (key.length === 64 && /^[a-fA-F0-9]+$/.test(key)) {
        return Buffer.from(key, 'hex');
    }
    return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt data (object or array) and return base64-encoded result
 * @param {Object|Array} data - Data to encrypt (will be JSON stringified)
 * @returns {Object} { encrypted: string, iv: string, authTag: string } or null if encryption disabled
 */
function encryptResponseData(data) {
    const key = getEncryptionKey();
    if (!key) {
        return null;
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const jsonStr = JSON.stringify(data);
    const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    };
}

/**
 * Send JSON response with encrypted data.
 * If encryption key is not configured, sends plain response (for dev/backward compatibility).
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {Object} payload - Response object: { success, data?, count?, total?, page?, pages?, message? }
 * @param {string} dataKey - Key holding the data to encrypt (default: 'data')
 */
function sendEncryptedJson(res, statusCode, payload, dataKey = 'data') {
    const dataToEncrypt = payload[dataKey];
    const encryptedResult = dataToEncrypt !== undefined ? encryptResponseData(dataToEncrypt) : null;

    if (encryptedResult) {
        const { encrypted, iv, authTag } = encryptedResult;
        const response = { ...payload, [dataKey]: encrypted, iv, authTag, encrypted: true };
        return res.status(statusCode).json(response);
    }

    // No encryption key or encryption disabled - send plain
    res.status(statusCode).json(payload);
}

/**
 * Decrypt response data (for frontend or testing).
 * Uses same key derivation: RESPONSE_ENCRYPTION_KEY or JWT_SECRET (hashed).
 * @param {string} encryptedBase64 - Base64 encrypted payload
 * @param {string} ivBase64 - Base64 IV
 * @param {string} authTagBase64 - Base64 auth tag
 * @returns {Object|Array} Decrypted data (parsed JSON)
 */
function decryptResponseData(encryptedBase64, ivBase64, authTagBase64) {
    const key = getEncryptionKey();
    if (!key) {
        throw new Error('Encryption key not configured');
    }
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
}

module.exports = {
    encryptResponseData,
    decryptResponseData,
    sendEncryptedJson,
    getEncryptionKey
};
