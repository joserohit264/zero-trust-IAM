/**
 * Encryption Service
 * AES-256-GCM encryption for TOTP secrets
 */
const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment
const getKey = () => {
    const key = process.env.MFA_ENCRYPTION_KEY;
    if (!key || key.length !== 32) {
        throw new Error('MFA_ENCRYPTION_KEY must be exactly 32 characters');
    }
    return Buffer.from(key);
};

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted string (iv:authTag:ciphertext in base64)
 */
const encrypt = (text) => {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
};

/**
 * Decrypt a string using AES-256-GCM
 * @param {string} encryptedText - Encrypted string (iv:authTag:ciphertext)
 * @returns {string} Decrypted plain text
 */
const decrypt = (encryptedText) => {
    const key = getKey();

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

module.exports = {
    encrypt,
    decrypt
};
