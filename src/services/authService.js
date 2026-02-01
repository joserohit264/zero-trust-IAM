/**
 * Auth Service
 * JWT token generation and validation
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
    return jwt.sign(
        {
            ...payload,
            type: 'access'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(
        {
            ...payload,
            type: 'refresh'
        },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} user - User object
 * @returns {Object} Access and refresh tokens with expiry info
 */
const generateTokenPair = (user) => {
    const payload = {
        userId: user.id,
        username: user.username,
        mfaEnabled: user.mfa_enabled,
        mfaVerified: !user.mfa_enabled // Auto-verified if MFA not enabled
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Calculate expiry timestamps
    const accessExpiry = new Date(Date.now() + parseExpiry(JWT_EXPIRES_IN));
    const refreshExpiry = new Date(Date.now() + parseExpiry(JWT_REFRESH_EXPIRES_IN));

    return {
        accessToken,
        refreshToken,
        accessExpiresAt: accessExpiry,
        refreshExpiresAt: refreshExpiry
    };
};

/**
 * Verify token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Decode token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
};

/**
 * Parse expiry string to milliseconds
 * @param {string} expiry - Expiry string (e.g., '15m', '7d')
 * @returns {number} Milliseconds
 */
const parseExpiry = (expiry) => {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900000; // Default 15 minutes

    const [, value, unit] = match;
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return parseInt(value) * multipliers[unit];
};

/**
 * Generate a secure random token
 * @param {number} length - Byte length
 * @returns {string} Hex-encoded token
 */
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyToken,
    decodeToken,
    parseExpiry,
    generateSecureToken
};
