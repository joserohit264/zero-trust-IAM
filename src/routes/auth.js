/**
 * Authentication Routes
 * Login, logout, MFA setup and verification
 */
const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const { generateTokenPair, parseExpiry } = require('../services/authService');
const { generateSecret, encryptSecret, verifyToken } = require('../services/mfaService');
const { authenticate, requireMfaVerified } = require('../middleware/auth');
const { loginLimiter, mfaLimiter } = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validation');
const { logAction } = require('../middleware/auditLogger');
const { HTTP_STATUS, AUDIT_ACTIONS } = require('../config/constants');

/**
 * POST /api/auth/login
 * User login with username and password
 */
router.post('/login', loginLimiter, validateBody('login'), async (req, res) => {
    try {
        const { username, password } = req.validatedBody;

        // Find user
        const user = await User.findByUsername(username);
        if (!user) {
            await logAction(req, AUDIT_ACTIONS.LOGIN_FAILURE, 'auth/login', { username }, false, 'User not found');
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is locked
        if (await User.isLocked(user.id)) {
            await logAction(req, AUDIT_ACTIONS.LOGIN_FAILURE, 'auth/login', { username }, false, 'Account locked');
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                message: 'Account is temporarily locked. Please try again later.'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            await logAction(req, AUDIT_ACTIONS.LOGIN_FAILURE, 'auth/login', { username }, false, 'Account inactive');
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                message: 'Account is deactivated. Please contact administrator.'
            });
        }

        // Verify password
        const isValid = await User.verifyPassword(user, password);
        if (!isValid) {
            await User.incrementFailedAttempts(user.id);
            await logAction(req, AUDIT_ACTIONS.LOGIN_FAILURE, 'auth/login', { username }, false, 'Invalid password');
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate tokens
        const tokens = generateTokenPair(user);

        // Create session
        await Session.create({
            userId: user.id,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            expiresAt: tokens.accessExpiresAt
        });

        // Update last login
        await User.updateLastLogin(user.id);

        // Log successful login
        await logAction(req, AUDIT_ACTIONS.LOGIN_SUCCESS, 'auth/login', {
            username,
            mfaEnabled: user.mfa_enabled,
            roles: user.roles.map(r => r.name)
        });

        // Set cookies for web clients
        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: parseExpiry(process.env.JWT_EXPIRES_IN || '15m')
        });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    roles: user.roles.map(r => ({ id: r.id, name: r.name })),
                    mfaEnabled: user.mfa_enabled
                },
                requiresMfa: user.mfa_enabled,
                accessToken: tokens.accessToken,
                expiresAt: tokens.accessExpiresAt
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Login failed'
        });
    }
});

/**
 * POST /api/auth/verify-mfa
 * Verify TOTP code after login
 */
router.post('/verify-mfa', authenticate, mfaLimiter, validateBody('mfaVerify'), async (req, res) => {
    try {
        const { token } = req.validatedBody;

        if (!req.user.mfa_enabled || !req.user.totp_secret_encrypted) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'MFA is not enabled for this account'
            });
        }

        // Verify TOTP token
        const isValid = verifyToken(token, req.user.totp_secret_encrypted);

        if (!isValid) {
            await logAction(req, AUDIT_ACTIONS.MFA_VERIFY_FAILURE, 'auth/verify-mfa', {}, false, 'Invalid TOTP code');
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        // Mark session as MFA verified
        await Session.markMfaVerified(req.token);

        // Log successful MFA verification
        await logAction(req, AUDIT_ACTIONS.MFA_VERIFY_SUCCESS, 'auth/verify-mfa');

        res.json({
            success: true,
            message: 'MFA verification successful'
        });
    } catch (error) {
        console.error('MFA verification error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'MFA verification failed'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', authenticate, async (req, res) => {
    try {
        // Invalidate session
        await Session.invalidate(req.token);

        // Log logout
        await logAction(req, AUDIT_ACTIONS.LOGOUT, 'auth/logout');

        // Clear cookie
        res.clearCookie('accessToken');

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

/**
 * GET /api/auth/mfa/setup
 * Get QR code for MFA enrollment
 */
router.get('/mfa/setup', authenticate, requireMfaVerified, async (req, res) => {
    try {
        if (req.user.mfa_enabled) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'MFA is already enabled'
            });
        }

        // Generate new TOTP secret
        const { secret, qrCode, otpauthUrl } = await generateSecret(req.user.username);

        // Temporarily store encrypted secret (not enabled yet)
        const encryptedSecret = encryptSecret(secret);
        await User.updateMfa(req.user.id, {
            totpSecret: encryptedSecret,
            mfaEnabled: false
        });

        // Log MFA setup initiation
        await logAction(req, AUDIT_ACTIONS.MFA_SETUP_INITIATED, 'auth/mfa/setup');

        res.json({
            success: true,
            data: {
                qrCode,
                secret, // For manual entry
                otpauthUrl
            }
        });
    } catch (error) {
        console.error('MFA setup error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'MFA setup failed'
        });
    }
});

/**
 * POST /api/auth/mfa/enable
 * Enable MFA after verifying TOTP code
 */
router.post('/mfa/enable', authenticate, requireMfaVerified, validateBody('mfaVerify'), async (req, res) => {
    try {
        const { token } = req.validatedBody;

        if (req.user.mfa_enabled) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'MFA is already enabled'
            });
        }

        if (!req.user.totp_secret_encrypted) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Please initiate MFA setup first'
            });
        }

        // Verify the token before enabling
        const isValid = verifyToken(token, req.user.totp_secret_encrypted);

        if (!isValid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Invalid verification code. Please try again.'
            });
        }

        // Enable MFA
        await User.updateMfa(req.user.id, {
            totpSecret: req.user.totp_secret_encrypted,
            mfaEnabled: true
        });

        // Log MFA enabled
        await logAction(req, AUDIT_ACTIONS.MFA_ENABLED, 'auth/mfa/enable');

        res.json({
            success: true,
            message: 'MFA has been enabled successfully'
        });
    } catch (error) {
        console.error('MFA enable error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to enable MFA'
        });
    }
});

/**
 * POST /api/auth/mfa/disable
 * Disable MFA (requires current TOTP or admin action)
 */
router.post('/mfa/disable', authenticate, requireMfaVerified, validateBody('mfaVerify'), async (req, res) => {
    try {
        const { token } = req.validatedBody;

        if (!req.user.mfa_enabled) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'MFA is not enabled'
            });
        }

        // Verify current TOTP before disabling
        const isValid = verifyToken(token, req.user.totp_secret_encrypted);

        if (!isValid) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        // Disable MFA
        await User.updateMfa(req.user.id, {
            totpSecret: null,
            mfaEnabled: false
        });

        // Log MFA disabled
        await logAction(req, AUDIT_ACTIONS.MFA_DISABLED, 'auth/mfa/disable');

        res.json({
            success: true,
            message: 'MFA has been disabled'
        });
    } catch (error) {
        console.error('MFA disable error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to disable MFA'
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, requireMfaVerified, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                firstName: req.user.first_name,
                lastName: req.user.last_name,
                roles: req.user.roles.map(r => ({ id: r.id, name: r.name })),
                mfaEnabled: req.user.mfa_enabled,
                lastLogin: req.user.last_login,
                createdAt: req.user.created_at
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
});

module.exports = router;
