/**
 * Application Constants
 * Central location for all application constants and enums
 */

// User Roles
const ROLES = {
    ADMIN: 'admin',
    USER: 'user',
    AUDITOR: 'auditor'
};

// Permissions for each role
const PERMISSIONS = {
    [ROLES.ADMIN]: [
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'roles:assign',
        'roles:revoke',
        'mfa:manage',
        'logs:read',
        'logs:export',
        'dashboard:access'
    ],
    [ROLES.USER]: [
        'profile:read',
        'profile:update',
        'mfa:setup'
    ],
    [ROLES.AUDITOR]: [
        'logs:read',
        'logs:export',
        'users:read'
    ]
};

// Audit Log Action Types
const AUDIT_ACTIONS = {
    // Authentication
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    MFA_SETUP_INITIATED: 'MFA_SETUP_INITIATED',
    MFA_ENABLED: 'MFA_ENABLED',
    MFA_DISABLED: 'MFA_DISABLED',
    MFA_VERIFY_SUCCESS: 'MFA_VERIFY_SUCCESS',
    MFA_VERIFY_FAILURE: 'MFA_VERIFY_FAILURE',

    // User Management
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_DELETED: 'USER_DELETED',
    USER_ACTIVATED: 'USER_ACTIVATED',
    USER_DEACTIVATED: 'USER_DEACTIVATED',

    // Role Management
    ROLE_ASSIGNED: 'ROLE_ASSIGNED',
    ROLE_REVOKED: 'ROLE_REVOKED',

    // Resource Access
    RESOURCE_ACCESS: 'RESOURCE_ACCESS',
    RESOURCE_DENIED: 'RESOURCE_DENIED',

    // Logs
    LOGS_VIEWED: 'LOGS_VIEWED',
    LOGS_EXPORTED: 'LOGS_EXPORTED'
};

// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500
};

module.exports = {
    ROLES,
    PERMISSIONS,
    AUDIT_ACTIONS,
    HTTP_STATUS
};
