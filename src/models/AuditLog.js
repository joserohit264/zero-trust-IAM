/**
 * Audit Log Model
 * Append-only audit trail for all system actions
 */
const db = require('../config/database');
const crypto = require('crypto');

class AuditLog {
    /**
     * Create a new audit log entry
     */
    static async create({
        userId,
        username,
        actionType,
        resource,
        resourceId,
        ipAddress,
        userAgent,
        metadata = {},
        success = true,
        errorMessage = null
    }) {
        // Get the previous log's hash for chain integrity
        const lastLog = await db.query(
            `SELECT current_hash FROM audit_logs ORDER BY created_at DESC LIMIT 1`
        );

        const previousHash = lastLog.rows[0]?.current_hash || null;

        // Create hash of current entry
        const hashData = JSON.stringify({
            userId,
            username,
            actionType,
            resource,
            resourceId,
            metadata,
            success,
            previousHash,
            timestamp: new Date().toISOString()
        });

        const currentHash = crypto
            .createHash('sha256')
            .update(hashData)
            .digest('hex');

        const result = await db.query(
            `INSERT INTO audit_logs 
       (user_id, username, action_type, resource, resource_id, ip_address, user_agent, metadata, success, error_message, previous_hash, current_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [
                userId,
                username,
                actionType,
                resource,
                resourceId,
                ipAddress,
                userAgent,
                JSON.stringify(metadata),
                success,
                errorMessage,
                previousHash,
                currentHash
            ]
        );

        return result.rows[0];
    }

    /**
     * Get audit logs with filters and pagination
     */
    static async findAll({
        page = 1,
        limit = 50,
        userId = null,
        actionType = null,
        startDate = null,
        endDate = null,
        success = null,
        search = null
    }) {
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let paramCount = 1;

        if (userId) {
            conditions.push(`user_id = $${paramCount}`);
            params.push(userId);
            paramCount++;
        }

        if (actionType) {
            conditions.push(`action_type = $${paramCount}`);
            params.push(actionType);
            paramCount++;
        }

        if (startDate) {
            conditions.push(`created_at >= $${paramCount}`);
            params.push(startDate);
            paramCount++;
        }

        if (endDate) {
            conditions.push(`created_at <= $${paramCount}`);
            params.push(endDate);
            paramCount++;
        }

        if (success !== null) {
            conditions.push(`success = $${paramCount}`);
            params.push(success);
            paramCount++;
        }

        if (search) {
            conditions.push(`(username ILIKE $${paramCount} OR resource ILIKE $${paramCount})`);
            params.push(`%${search}%`);
            paramCount++;
        }

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        // Add pagination params
        params.push(limit, offset);

        const result = await db.query(
            `SELECT * FROM audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
            params
        );

        // Get total count
        const countParams = params.slice(0, -2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
            countParams
        );

        return {
            logs: result.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit
        };
    }

    /**
     * Get logs by user ID
     */
    static async findByUserId(userId, limit = 100) {
        const result = await db.query(
            `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    }

    /**
     * Get distinct action types for filtering
     */
    static async getActionTypes() {
        const result = await db.query(
            `SELECT DISTINCT action_type FROM audit_logs ORDER BY action_type`
        );

        return result.rows.map(r => r.action_type);
    }

    /**
     * Get audit statistics
     */
    static async getStatistics(days = 7) {
        const result = await db.query(
            `SELECT 
         DATE(created_at) as date,
         action_type,
         COUNT(*) as count,
         SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
         SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failure_count
       FROM audit_logs
       WHERE created_at >= CURRENT_DATE - $1
       GROUP BY DATE(created_at), action_type
       ORDER BY date DESC, action_type`,
            [days]
        );

        return result.rows;
    }

    /**
     * Verify log chain integrity
     */
    static async verifyIntegrity(limit = 1000) {
        const result = await db.query(
            `SELECT id, user_id, username, action_type, resource, resource_id, 
              metadata, success, previous_hash, current_hash, created_at
       FROM audit_logs
       ORDER BY created_at ASC
       LIMIT $1`,
            [limit]
        );

        const logs = result.rows;
        const issues = [];

        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];

            // Verify previous hash chain
            if (i > 0 && log.previous_hash !== logs[i - 1].current_hash) {
                issues.push({
                    logId: log.id,
                    issue: 'Previous hash mismatch',
                    expected: logs[i - 1].current_hash,
                    actual: log.previous_hash
                });
            }

            // Verify first log has no previous hash
            if (i === 0 && log.previous_hash !== null) {
                issues.push({
                    logId: log.id,
                    issue: 'First log should have null previous_hash'
                });
            }
        }

        return {
            verified: issues.length === 0,
            totalLogs: logs.length,
            issues
        };
    }

    /**
     * Export logs to CSV format
     */
    static async exportToCSV(filters = {}) {
        const { logs } = await this.findAll({ ...filters, limit: 10000 });

        const headers = [
            'ID', 'Timestamp', 'User ID', 'Username', 'Action Type',
            'Resource', 'IP Address', 'Success', 'Error Message'
        ];

        const rows = logs.map(log => [
            log.id,
            log.created_at,
            log.user_id,
            log.username,
            log.action_type,
            log.resource,
            log.ip_address,
            log.success,
            log.error_message || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csv;
    }

    /**
     * Export logs to JSON format
     */
    static async exportToJSON(filters = {}) {
        const { logs } = await this.findAll({ ...filters, limit: 10000 });
        return JSON.stringify(logs, null, 2);
    }
}

module.exports = AuditLog;
