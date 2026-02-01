/**
 * User Model
 * Database operations for user management
 */
const db = require('../config/database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

class User {
    /**
     * Create a new user
     */
    static async create({ username, email, password, firstName, lastName }) {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, first_name, last_name, mfa_enabled, is_active, created_at`,
            [username, email, passwordHash, firstName, lastName]
        );

        return result.rows[0];
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        const result = await db.query(
            `SELECT u.*, 
              COALESCE(json_agg(
                json_build_object('id', r.id, 'name', r.name, 'permissions', r.permissions)
              ) FILTER (WHERE r.id IS NOT NULL), '[]') as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id`,
            [id]
        );

        return result.rows[0] || null;
    }

    /**
     * Find user by username
     */
    static async findByUsername(username) {
        const result = await db.query(
            `SELECT u.*, 
              COALESCE(json_agg(
                json_build_object('id', r.id, 'name', r.name, 'permissions', r.permissions)
              ) FILTER (WHERE r.id IS NOT NULL), '[]') as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.username = $1
       GROUP BY u.id`,
            [username]
        );

        return result.rows[0] || null;
    }

    /**
     * Find user by email
     */
    static async findByEmail(email) {
        const result = await db.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );

        return result.rows[0] || null;
    }

    /**
     * Get all users with pagination
     */
    static async findAll({ page = 1, limit = 10, search = '' }) {
        const offset = (page - 1) * limit;

        let whereClause = '';
        const params = [limit, offset];

        if (search) {
            whereClause = `WHERE username ILIKE $3 OR email ILIKE $3 OR first_name ILIKE $3 OR last_name ILIKE $3`;
            params.push(`%${search}%`);
        }

        const result = await db.query(
            `SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
              u.mfa_enabled, u.is_active, u.last_login, u.created_at,
              COALESCE(json_agg(
                json_build_object('id', r.id, 'name', r.name)
              ) FILTER (WHERE r.id IS NOT NULL), '[]') as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
            params
        );

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) FROM users ${whereClause}`,
            search ? [`%${search}%`] : []
        );

        return {
            users: result.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit
        };
    }

    /**
     * Update user
     */
    static async update(id, updates) {
        const allowedFields = ['email', 'first_name', 'last_name', 'is_active'];
        const setClause = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (setClause.length === 0) {
            return null;
        }

        values.push(id);

        const result = await db.query(
            `UPDATE users SET ${setClause.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, email, first_name, last_name, mfa_enabled, is_active, updated_at`,
            values
        );

        return result.rows[0] || null;
    }

    /**
     * Update password
     */
    static async updatePassword(id, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        const result = await db.query(
            `UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id`,
            [passwordHash, id]
        );

        return result.rows[0] || null;
    }

    /**
     * Verify password
     */
    static async verifyPassword(user, password) {
        return bcrypt.compare(password, user.password_hash);
    }

    /**
     * Update MFA settings
     */
    static async updateMfa(id, { totpSecret, mfaEnabled }) {
        const result = await db.query(
            `UPDATE users SET totp_secret_encrypted = $1, mfa_enabled = $2
       WHERE id = $3
       RETURNING id, mfa_enabled`,
            [totpSecret, mfaEnabled, id]
        );

        return result.rows[0] || null;
    }

    /**
     * Update last login
     */
    static async updateLastLogin(id) {
        await db.query(
            `UPDATE users SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0
       WHERE id = $1`,
            [id]
        );
    }

    /**
     * Increment failed login attempts
     */
    static async incrementFailedAttempts(id) {
        const result = await db.query(
            `UPDATE users SET failed_login_attempts = failed_login_attempts + 1
       WHERE id = $1
       RETURNING failed_login_attempts`,
            [id]
        );

        // Lock account after 5 failed attempts
        if (result.rows[0]?.failed_login_attempts >= 5) {
            await db.query(
                `UPDATE users SET locked_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
         WHERE id = $1`,
                [id]
            );
        }

        return result.rows[0];
    }

    /**
     * Check if account is locked
     */
    static async isLocked(id) {
        const result = await db.query(
            `SELECT locked_until FROM users WHERE id = $1`,
            [id]
        );

        if (!result.rows[0]?.locked_until) return false;

        return new Date(result.rows[0].locked_until) > new Date();
    }

    /**
     * Delete user
     */
    static async delete(id) {
        const result = await db.query(
            `DELETE FROM users WHERE id = $1 RETURNING id`,
            [id]
        );

        return result.rows[0] || null;
    }
}

module.exports = User;
