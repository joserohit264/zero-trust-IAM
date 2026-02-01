/**
 * Profile Routes
 * User self-service profile management
 */
const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Session = require('../models/Session');
const { authenticate, requireMfaVerified } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { logAction } = require('../middleware/auditLogger');
const { HTTP_STATUS, AUDIT_ACTIONS } = require('../config/constants');

// All routes require authentication and MFA verification
router.use(authenticate, requireMfaVerified);

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get('/', async (req, res) => {
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
                passwordChangedAt: req.user.password_changed_at,
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

/**
 * PATCH /api/profile
 * Update current user's profile
 */
router.patch('/', validateBody('updateUser'), async (req, res) => {
    try {
        const updates = req.validatedBody;

        // Users can only update their own first_name, last_name, and email
        const allowedUpdates = {};
        if (updates.firstName !== undefined) allowedUpdates.first_name = updates.firstName;
        if (updates.lastName !== undefined) allowedUpdates.last_name = updates.lastName;
        if (updates.email !== undefined) {
            // Check email uniqueness
            const existingEmail = await User.findByEmail(updates.email);
            if (existingEmail && existingEmail.id !== req.user.id) {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            allowedUpdates.email = updates.email;
        }

        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const updatedUser = await User.update(req.user.id, allowedUpdates);

        await logAction(req, AUDIT_ACTIONS.USER_UPDATED, 'profile', {
            changes: Object.keys(allowedUpdates)
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

/**
 * POST /api/profile/change-password
 * Change current user's password
 */
router.post('/change-password', validateBody('changePassword'), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.validatedBody;

        // Verify current password
        const isValid = await User.verifyPassword(req.user, currentPassword);
        if (!isValid) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        await User.updatePassword(req.user.id, newPassword);

        // Invalidate all other sessions
        await Session.invalidateAllForUser(req.user.id);

        await logAction(req, AUDIT_ACTIONS.USER_UPDATED, 'password-change', {
            note: 'Password changed by user'
        });

        res.json({
            success: true,
            message: 'Password changed successfully. Please login again.'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

/**
 * GET /api/profile/sessions
 * Get current user's active sessions
 */
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await Session.getActiveSessions(req.user.id);

        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to get sessions'
        });
    }
});

/**
 * DELETE /api/profile/sessions
 * Invalidate all sessions except current
 */
router.delete('/sessions', async (req, res) => {
    try {
        await Session.invalidateAllForUser(req.user.id);

        res.json({
            success: true,
            message: 'All other sessions have been invalidated'
        });
    } catch (error) {
        console.error('Invalidate sessions error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to invalidate sessions'
        });
    }
});

module.exports = router;
