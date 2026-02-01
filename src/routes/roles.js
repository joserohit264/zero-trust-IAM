/**
 * Role Management Routes
 * List available roles
 */
const express = require('express');
const router = express.Router();

const Role = require('../models/Role');
const { authenticate, requireMfaVerified } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { HTTP_STATUS } = require('../config/constants');

// All routes require authentication and MFA verification
router.use(authenticate, requireMfaVerified);

/**
 * GET /api/roles
 * List all available roles
 */
router.get('/', requirePermission('users:read'), async (req, res) => {
    try {
        const roles = await Role.findAll();

        res.json({
            success: true,
            data: roles
        });
    } catch (error) {
        console.error('List roles error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to list roles'
        });
    }
});

/**
 * GET /api/roles/:id
 * Get single role by ID
 */
router.get('/:id', requirePermission('users:read'), async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);

        if (!role) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Role not found'
            });
        }

        res.json({
            success: true,
            data: role
        });
    } catch (error) {
        console.error('Get role error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to get role'
        });
    }
});

module.exports = router;
