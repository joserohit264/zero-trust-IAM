/**
 * Session Model
 * Database operations for session management
 */
const db = require('../config/database');
const crypto = require('crypto');

class Session {
    /**
     * Create a new session
     */
    static async create({ userId, token, refreshToken, ipAddress, userAgent, expiresAt }) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const refreshTokenHash = refreshToken
            ? crypto.createHash('sha256').update(refreshToken).digest('hex')
            : null;

        const result = await db.query(
            `INSERT INTO sessions (user_id, token_hash, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [userId, tokenHash, refreshTokenHash, ipAddress, userAgent, expiresAt]
        );

        return result.rows[0];
    }

    /**
     * Find session by token
     */
    static async findByToken(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const result = await db.query(
            `SELECT * FROM sessions WHERE token_hash = $1 AND is_valid = true`,
            [tokenHash]
        );

        return result.rows[0] || null;
    }

    /**
     * Mark session as MFA verified
     */
    static async markMfaVerified(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const result = await db.query(
            `UPDATE sessions SET mfa_verified = true WHERE token_hash = $1 RETURNING *`,
            [tokenHash]
        );

        return result.rows[0] || null;
    }

    /**
     * Invalidate session
     */
    static async invalidate(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const result = await db.query(
            `UPDATE sessions SET is_valid = false WHERE token_hash = $1 RETURNING *`,
            [tokenHash]
        );

        return result.rows[0] || null;
    }

    /**
     * Invalidate all sessions for a user
     */
    static async invalidateAllForUser(userId) {
        const result = await db.query(
            `UPDATE sessions SET is_valid = false WHERE user_id = $1`,
            [userId]
        );

        return result.rowCount;
    }

    /**
     * Get active sessions for a user
     */
    static async getActiveSessions(userId) {
        const result = await db.query(
            `SELECT id, ip_address, user_agent, created_at, expires_at
       FROM sessions 
       WHERE user_id = $1 AND is_valid = true AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Clean up expired sessions
     */
    static async cleanupExpired() {
        const result = await db.query(
            `DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP OR is_valid = false`
        );

        return result.rowCount;
    }
}

module.exports = Session;
