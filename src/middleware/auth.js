/**
 * Authentication Middleware
 * JWT token verification and user extraction
 */
const { verifyToken } = require('../services/authService');
const User = require('../models/User');
const Session = require('../models/Session');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header or cookie
        let token = req.headers.authorization?.replace('Bearer ', '');

        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Check if session is valid
        const session = await Session.findByToken(token);
        if (!session) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Session not found or expired'
            });
        }

        // Get full user data
        const user = await User.findById(decoded.userId);
        if (!user || !user.is_active) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        // Attach to request
        req.user = user;
        req.token = token;
        req.session = session;
        req.mfaVerified = session.mfa_verified;

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Check if MFA is verified (for routes requiring full authentication)
 */
const requireMfaVerified = (req, res, next) => {
    if (req.user.mfa_enabled && !req.mfaVerified) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            message: 'MFA verification required',
            requiresMfa: true
        });
    }
    next();
};

/**
 * Optional authentication - attach user if token present but don't fail
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token = req.headers.authorization?.replace('Bearer ', '');

        if (!token && req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                const user = await User.findById(decoded.userId);
                if (user && user.is_active) {
                    req.user = user;
                    req.token = token;
                }
            }
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authenticate,
    requireMfaVerified,
    optionalAuth
};
