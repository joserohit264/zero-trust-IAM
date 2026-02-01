/**
 * Role Model
 * Database operations for role management
 */
const db = require('../config/database');

class Role {
    /**
     * Get all roles
     */
    static async findAll() {
        const result = await db.query(
            `SELECT * FROM roles ORDER BY name`
        );

        return result.rows;
    }

    /**
     * Find role by ID
     */
    static async findById(id) {
        const result = await db.query(
            `SELECT * FROM roles WHERE id = $1`,
            [id]
        );

        return result.rows[0] || null;
    }

    /**
     * Find role by name
     */
    static async findByName(name) {
        const result = await db.query(
            `SELECT * FROM roles WHERE name = $1`,
            [name]
        );

        return result.rows[0] || null;
    }

    /**
     * Assign role to user
     */
    static async assignToUser(userId, roleId, assignedBy) {
        const result = await db.query(
            `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING
       RETURNING *`,
            [userId, roleId, assignedBy]
        );

        return result.rows[0] || null;
    }

    /**
     * Revoke role from user
     */
    static async revokeFromUser(userId, roleId) {
        const result = await db.query(
            `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2
       RETURNING *`,
            [userId, roleId]
        );

        return result.rows[0] || null;
    }

    /**
     * Get user's roles
     */
    static async getUserRoles(userId) {
        const result = await db.query(
            `SELECT r.* FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Check if user has specific permission
     */
    static async userHasPermission(userId, permission) {
        const result = await db.query(
            `SELECT r.permissions FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
            [userId]
        );

        for (const row of result.rows) {
            if (row.permissions.includes(permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get all permissions for a user
     */
    static async getUserPermissions(userId) {
        const result = await db.query(
            `SELECT r.permissions FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
            [userId]
        );

        const permissions = new Set();
        for (const row of result.rows) {
            row.permissions.forEach(p => permissions.add(p));
        }

        return Array.from(permissions);
    }
}

module.exports = Role;
