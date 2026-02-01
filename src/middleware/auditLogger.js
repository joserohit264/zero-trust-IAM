/**
 * Audit Logger Middleware
 * Automatic logging of HTTP requests
 */
const AuditLog = require('../models/AuditLog');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Log resource access
 */
const auditLogger = async (req, res, next) => {
    // Store original end function
    const originalEnd = res.end;
    const startTime = Date.now();

    // Override end function to log after response
    res.end = async function (...args) {
        const duration = Date.now() - startTime;

        // Only log for authenticated users and specific routes
        if (req.user && shouldLog(req)) {
            try {
                await AuditLog.create({
                    userId: req.user.id,
                    username: req.user.username,
                    actionType: AUDIT_ACTIONS.RESOURCE_ACCESS,
                    resource: `${req.method} ${req.originalUrl}`,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: {
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode,
                        duration
                    },
                    success: res.statusCode < 400
                });
            } catch (error) {
                console.error('Audit logging error:', error.message);
            }
        }

        // Call original end function
        originalEnd.apply(res, args);
    };

    next();
};

/**
 * Determine if request should be logged
 */
const shouldLog = (req) => {
    // Skip health checks and static assets
    const skipPaths = ['/api/health', '/favicon.ico'];

    if (skipPaths.includes(req.path)) {
        return false;
    }

    // Skip GET requests to reduce log volume (optional)
    // Uncomment if you want to only log mutations
    // if (req.method === 'GET') return false;

    return true;
};

/**
 * Create a specific audit log entry
 */
const logAction = async (req, actionType, resource, metadata = {}, success = true, errorMessage = null) => {
    try {
        await AuditLog.create({
            userId: req.user?.id || null,
            username: req.user?.username || metadata.username || 'system',
            actionType,
            resource,
            resourceId: metadata.resourceId || null,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            metadata,
            success,
            errorMessage
        });
    } catch (error) {
        console.error('Audit logging error:', error.message);
    }
};

module.exports = {
    auditLogger,
    logAction
};
