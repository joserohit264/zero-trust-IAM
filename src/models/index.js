/**
 * Models Index
 * Export all models from a single entry point
 */
const User = require('./User');
const Role = require('./Role');
const AuditLog = require('./AuditLog');
const Session = require('./Session');

module.exports = {
    User,
    Role,
    AuditLog,
    Session
};
