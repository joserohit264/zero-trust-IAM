/**
 * Audit Log Routes
 * View and export audit logs (Admin and Auditor access)
 */
const express = require('express');
const router = express.Router();

const AuditLog = require('../models/AuditLog');
const { authenticate, requireMfaVerified } = require('../middleware/auth');
const { requireAnyPermission } = require('../middleware/rbac');
const { validateQuery } = require('../middleware/validation');
const { logAction } = require('../middleware/auditLogger');
const { HTTP_STATUS, AUDIT_ACTIONS } = require('../config/constants');

// All routes require authentication, MFA verification, and log read permission
router.use(authenticate, requireMfaVerified, requireAnyPermission('logs:read'));

/**
 * GET /api/logs
 * List audit logs with filtering
 */
router.get('/', validateQuery('logFilters'), async (req, res) => {
    try {
        const filters = req.validatedQuery || {};

        const result = await AuditLog.findAll(filters);

        // Log that someone viewed the logs
        await logAction(req, AUDIT_ACTIONS.LOGS_VIEWED, 'audit-logs', {
            filters,
            resultCount: result.logs.length
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('List logs error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to list audit logs'
        });
    }
});

/**
 * GET /api/logs/action-types
 * Get list of distinct action types for filtering
 */
router.get('/action-types', async (req, res) => {
    try {
        const actionTypes = await AuditLog.getActionTypes();

        res.json({
            success: true,
            data: actionTypes
        });
    } catch (error) {
        console.error('Get action types error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to get action types'
        });
    }
});

/**
 * GET /api/logs/statistics
 * Get audit log statistics
 */
router.get('/statistics', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const statistics = await AuditLog.getStatistics(days);

        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to get statistics'
        });
    }
});

/**
 * GET /api/logs/export
 * Export logs in CSV or JSON format
 */
router.get('/export', requireAnyPermission('logs:export'), validateQuery('logFilters'), async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const filters = req.validatedQuery || {};

        let data;
        let contentType;
        let filename;

        if (format === 'csv') {
            data = await AuditLog.exportToCSV(filters);
            contentType = 'text/csv';
            filename = `audit_logs_${Date.now()}.csv`;
        } else {
            data = await AuditLog.exportToJSON(filters);
            contentType = 'application/json';
            filename = `audit_logs_${Date.now()}.json`;
        }

        // Log export action
        await logAction(req, AUDIT_ACTIONS.LOGS_EXPORTED, 'audit-logs', {
            format,
            filters,
            exportedBy: req.user.username
        });

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(data);
    } catch (error) {
        console.error('Export logs error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to export audit logs'
        });
    }
});

/**
 * GET /api/logs/integrity
 * Verify audit log chain integrity
 */
router.get('/integrity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 1000;
        const result = await AuditLog.verifyIntegrity(limit);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Verify integrity error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to verify log integrity'
        });
    }
});

/**
 * GET /api/logs/user/:userId
 * Get logs for a specific user
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await AuditLog.findByUserId(req.params.userId, limit);

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Get user logs error:', error);
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({
            success: false,
            message: 'Failed to get user logs'
        });
    }
});

module.exports = router;
