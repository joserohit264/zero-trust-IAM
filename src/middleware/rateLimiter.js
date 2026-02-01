/**
 * Rate Limiter Middleware
 * Protects against brute force attacks
 */
const rateLimit = require('express-rate-limit');
const { HTTP_STATUS } = require('../config/constants');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip;
    }
});

// Strict limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use combination of IP and username
        return `${req.ip}-${req.body?.username || 'unknown'}`;
    },
    skipSuccessfulRequests: true // Don't count successful logins
});

// Strict limiter for MFA verification
const mfaLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: parseInt(process.env.MFA_RATE_LIMIT_MAX) || 3,
    message: {
        success: false,
        message: 'Too many MFA attempts, please try again after 5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return `mfa-${req.ip}-${req.user?.id || 'unknown'}`;
    },
    skipSuccessfulRequests: true
});

// Limiter for password reset
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        success: false,
        message: 'Too many password reset attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Limiter for account creation
const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
        success: false,
        message: 'Too many account creation attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,
    loginLimiter,
    mfaLimiter,
    passwordResetLimiter,
    createAccountLimiter
};
