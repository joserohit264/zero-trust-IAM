/**
 * MFA Service
 * TOTP-based Multi-Factor Authentication
 * Compatible with Google Authenticator and Microsoft Authenticator
 */
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { encrypt, decrypt } = require('./encryptionService');

const ISSUER = 'IAM System';
const TOTP_WINDOW = 1; // Allow 1 time step before/after current time

/**
 * Generate a new TOTP secret for a user
 * @param {string} username - User's username
 * @returns {Object} Secret details and QR code
 */
const generateSecret = async (username) => {
    const secret = speakeasy.generateSecret({
        name: `${ISSUER}:${username}`,
        issuer: ISSUER,
        length: 20
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
        qrCode: qrCodeDataUrl
    };
};

/**
 * Encrypt TOTP secret for database storage
 * @param {string} secret - Base32 encoded TOTP secret
 * @returns {string} Encrypted secret
 */
const encryptSecret = (secret) => {
    return encrypt(secret);
};

/**
 * Decrypt TOTP secret from database
 * @param {string} encryptedSecret - Encrypted TOTP secret
 * @returns {string} Base32 encoded TOTP secret
 */
const decryptSecret = (encryptedSecret) => {
    return decrypt(encryptedSecret);
};

/**
 * Verify a TOTP token
 * @param {string} token - 6-digit TOTP token
 * @param {string} encryptedSecret - Encrypted TOTP secret from database
 * @returns {boolean} True if token is valid
 */
const verifyToken = (token, encryptedSecret) => {
    try {
        const secret = decryptSecret(encryptedSecret);

        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: TOTP_WINDOW
        });
    } catch (error) {
        console.error('MFA verification error:', error.message);
        return false;
    }
};

/**
 * Generate a current TOTP token (for testing purposes)
 * @param {string} secret - Base32 encoded TOTP secret
 * @returns {string} Current TOTP token
 */
const generateToken = (secret) => {
    return speakeasy.totp({
        secret,
        encoding: 'base32'
    });
};

/**
 * Get time remaining until next token
 * @returns {number} Seconds remaining
 */
const getTimeRemaining = () => {
    return 30 - Math.floor((Date.now() / 1000) % 30);
};

module.exports = {
    generateSecret,
    encryptSecret,
    decryptSecret,
    verifyToken,
    generateToken,
    getTimeRemaining
};
