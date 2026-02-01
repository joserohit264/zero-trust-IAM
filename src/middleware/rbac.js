/**
 * RBAC Middleware
 * Role-Based Access Control
 */
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const { HTTP_STATUS, AUDIT_ACTIONS } = require('../config/constants');

/**
 * Check if user has required role(s)
 * @param {...string} roles - Required roles (any match allows access)
 */
const requireRole = (...roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userRoles = req.user.roles.map(r => r.name);
            const hasRole = roles.some(role => userRoles.includes(role));

            if (!hasRole) {
                // Log unauthorized access attempt
                await AuditLog.create({
                    userId: req.user.id,
                    username: req.user.username,
                    actionType: AUDIT_ACTIONS.RESOURCE_DENIED,
                    resource: req.originalUrl,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: { requiredRoles: roles, userRoles },
                    success: false,
                    errorMessage: 'Insufficient role permissions'
                });

                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            next();
        } catch (error) {
            console.error('RBAC error:', error);
            return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

/**
 * Check if user has required permission(s)
 * @param {...string} permissions - Required permissions (all must match)
 */
const requirePermission = (...permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userPermissions = await Role.getUserPermissions(req.user.id);
            const hasAllPermissions = permissions.every(p => userPermissions.includes(p));

            if (!hasAllPermissions) {
                // Log unauthorized access attempt
                await AuditLog.create({
                    userId: req.user.id,
                    username: req.user.username,
                    actionType: AUDIT_ACTIONS.RESOURCE_DENIED,
                    resource: req.originalUrl,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: { requiredPermissions: permissions, userPermissions },
                    success: false,
                    errorMessage: 'Insufficient permissions'
                });

                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            next();
        } catch (error) {
            console.error('RBAC error:', error);
            return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

/**
 * Check if user has any of the required permissions
 * @param {...string} permissions - Required permissions (any match allows access)
 */
const requireAnyPermission = (...permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userPermissions = await Role.getUserPermissions(req.user.id);
            const hasAnyPermission = permissions.some(p => userPermissions.includes(p));

            if (!hasAnyPermission) {
                await AuditLog.create({
                    userId: req.user.id,
                    username: req.user.username,
                    actionType: AUDIT_ACTIONS.RESOURCE_DENIED,
                    resource: req.originalUrl,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: { requiredPermissions: permissions, userPermissions },
                    success: false,
                    errorMessage: 'Insufficient permissions'
                });

                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            next();
        } catch (error) {
            console.error('RBAC error:', error);
            return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

module.exports = {
    requireRole,
    requirePermission,
    requireAnyPermission
};
