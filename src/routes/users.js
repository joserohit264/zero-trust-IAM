/**
 * User Management Routes
 * Admin-only CRUD operations for users
 */
const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Role = require('../models/Role');
const Session = require('../models/Session');
const { authenticate, requireMfaVerified } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const { logAction } = require('../middleware/auditLogger');
const { createAccountLimiter } = require('../middleware/rateLimiter');
const { HTTP_STATUS, AUDIT_ACTIONS, ROLES } = require('../config/constants');

// All routes require authentication, MFA verification, and admin role
router.use(authenticate, requireMfaVerified);

/**
 * GET /api/users
 * List all users with pagination
 */
router.get('/', requirePermission('users:read'), async (req, res) => {
    try {
        const { page, limit, search } = req.query;

        const result = await User.findAll({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            search: search || ''
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to list users'
        });
    }
});

/**
 * GET /api/users/:id
 * Get single user by ID
 */
router.get('/:id', requirePermission('users:read'), validateParams('uuidParam'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'User not found'
            });
        }

        // Remove sensitive fields
        delete user.password_hash;
        delete user.totp_secret_encrypted;

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to get user'
        });
    }
});

/**
 * POST /api/users
 * Create new user (Admin only)
 */
router.post('/', requirePermission('users:create'), createAccountLimiter, validateBody('createUser'), async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, roleId } = req.validatedBody;

        // Check if username exists
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Check if email exists
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            return res.status(HTTP_STATUS.CONFLICT).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password,
            firstName,
            lastName
        });

        // Assign role if provided
        if (roleId) {
            const role = await Role.findById(roleId);
            if (role) {
                await Role.assignToUser(user.id, roleId, req.user.id);
            }
        } else {
            // Assign default 'user' role
            const defaultRole = await Role.findByName(ROLES.USER);
            if (defaultRole) {
                await Role.assignToUser(user.id, defaultRole.id, req.user.id);
            }
        }

        // Log user creation
        await logAction(req, AUDIT_ACTIONS.USER_CREATED, 'users', {
            resourceId: user.id,
            username,
            email,
            createdBy: req.user.username
        });

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: 'User created successfully',
            data: user
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to create user'
        });
    }
});

/**
 * PATCH /api/users/:id
 * Update user (Admin only)
 */
router.patch('/:id', requirePermission('users:update'), validateParams('uuidParam'), validateBody('updateUser'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check email uniqueness if changing
        if (req.validatedBody.email && req.validatedBody.email !== user.email) {
            const existingEmail = await User.findByEmail(req.validatedBody.email);
            if (existingEmail) {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        const updatedUser = await User.update(req.params.id, req.validatedBody);

        // Log user update
        await logAction(req, AUDIT_ACTIONS.USER_UPDATED, 'users', {
            resourceId: req.params.id,
            changes: req.validatedBody,
            updatedBy: req.user.username
        });

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
router.delete('/:id', requirePermission('users:delete'), validateParams('uuidParam'), async (req, res) => {
    try {
        // Prevent self-deletion
        if (req.params.id === req.user.id) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'User not found'
            });
        }

        // Invalidate all sessions for this user
        await Session.invalidateAllForUser(req.params.id);

        // Delete user
        await User.delete(req.params.id);

        // Log user deletion
        await logAction(req, AUDIT_ACTIONS.USER_DELETED, 'users', {
            resourceId: req.params.id,
            username: user.username,
            deletedBy: req.user.username
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

/**
 * POST /api/users/:id/roles
 * Assign role to user (Admin only)
 */
router.post('/:id/roles', requirePermission('roles:assign'), validateParams('uuidParam'), validateBody('assignRole'), async (req, res) => {
    try {
        const { roleId } = req.validatedBody;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'User not found'
            });
        }

        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Role not found'
            });
        }

        await Role.assignToUser(req.params.id, roleId, req.user.id);

        // Log role assignment
        await logAction(req, AUDIT_ACTIONS.ROLE_ASSIGNED, 'user-roles', {
            userId: req.params.id,
            username: user.username,
            roleId,
            roleName: role.name,
            assignedBy: req.user.username
        });

        res.json({
            success: true,
            message: `Role '${role.name}' assigned to user '${user.username}'`
        });
    } catch (error) {
        console.error('Assign role error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to assign role'
        });
    }
});

/**
 * DELETE /api/users/:id/roles/:roleId
 * Revoke role from user (Admin only)
 */
router.delete('/:id/roles/:roleId', requirePermission('roles:revoke'), async (req, res) => {
    try {
        const { id, roleId } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'User not found'
            });
        }

        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Role not found'
            });
        }

        await Role.revokeFromUser(id, roleId);

        // Log role revocation
        await logAction(req, AUDIT_ACTIONS.ROLE_REVOKED, 'user-roles', {
            userId: id,
            username: user.username,
            roleId,
            roleName: role.name,
            revokedBy: req.user.username
        });

        res.json({
            success: true,
            message: `Role '${role.name}' revoked from user '${user.username}'`
        });
    } catch (error) {
        console.error('Revoke role error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to revoke role'
        });
    }
});

/**
 * PATCH /api/users/:id/mfa
 * Enable/disable MFA for user (Admin only)
 */
router.patch('/:id/mfa', requirePermission('mfa:manage'), validateParams('uuidParam'), async (req, res) => {
    try {
        const { enabled } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'User not found'
            });
        }

        if (enabled === false) {
            // Disable MFA
            await User.updateMfa(req.params.id, {
                totpSecret: null,
                mfaEnabled: false
            });

            await logAction(req, AUDIT_ACTIONS.MFA_DISABLED, 'user-mfa', {
                userId: req.params.id,
                username: user.username,
                disabledBy: req.user.username
            });

            res.json({
                success: true,
                message: 'MFA disabled for user'
            });
        } else {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Admin can only disable MFA. User must enable it themselves.'
            });
        }
    } catch (error) {
        console.error('Update MFA error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to update MFA settings'
        });
    }
});

/**
 * PATCH /api/users/:id/status
 * Activate/deactivate user (Admin only)
 */
router.patch('/:id/status', requirePermission('users:update'), validateParams('uuidParam'), async (req, res) => {
    try {
        const { active } = req.body;

        // Prevent self-deactivation
        if (req.params.id === req.user.id && active === false) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'User not found'
            });
        }

        await User.update(req.params.id, { is_active: active });

        if (!active) {
            // Invalidate all sessions when deactivating
            await Session.invalidateAllForUser(req.params.id);
        }

        const action = active ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED;
        await logAction(req, action, 'user-status', {
            userId: req.params.id,
            username: user.username,
            changedBy: req.user.username
        });

        res.json({
            success: true,
            message: `User ${active ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to update user status'
        });
    }
});

module.exports = router;
