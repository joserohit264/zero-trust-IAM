/**
 * Database Seeder
 * Creates default admin user for initial setup
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

async function seed() {
    console.log('🌱 Seeding database...\n');

    const client = await pool.connect();

    try {
        // Create default admin user
        const adminPassword = await bcrypt.hash('Admin123!', 12);

        // Check if admin already exists
        const existingAdmin = await client.query(
            'SELECT id FROM users WHERE username = $1',
            ['admin']
        );

        if (existingAdmin.rows.length === 0) {
            // Create admin user
            const userResult = await client.query(
                `INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
                ['admin', 'admin@example.com', adminPassword, 'System', 'Administrator', true]
            );

            const adminUserId = userResult.rows[0].id;

            // Get admin role
            const roleResult = await client.query(
                'SELECT id FROM roles WHERE name = $1',
                ['admin']
            );

            if (roleResult.rows.length > 0) {
                // Assign admin role
                await client.query(
                    `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)`,
                    [adminUserId, roleResult.rows[0].id]
                );
            }

            console.log('✅ Created admin user (username: admin, password: Admin123!)');
        } else {
            console.log('ℹ️  Admin user already exists, skipping...');
        }

        // Create test user
        const userPassword = await bcrypt.hash('User123!', 12);

        const existingUser = await client.query(
            'SELECT id FROM users WHERE username = $1',
            ['testuser']
        );

        if (existingUser.rows.length === 0) {
            const userResult = await client.query(
                `INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
                ['testuser', 'user@example.com', userPassword, 'Test', 'User', true]
            );

            const userId = userResult.rows[0].id;

            // Get user role
            const roleResult = await client.query(
                'SELECT id FROM roles WHERE name = $1',
                ['user']
            );

            if (roleResult.rows.length > 0) {
                await client.query(
                    `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)`,
                    [userId, roleResult.rows[0].id]
                );
            }

            console.log('✅ Created test user (username: testuser, password: User123!)');
        }

        // Create auditor user
        const auditorPassword = await bcrypt.hash('Auditor123!', 12);

        const existingAuditor = await client.query(
            'SELECT id FROM users WHERE username = $1',
            ['auditor']
        );

        if (existingAuditor.rows.length === 0) {
            const auditorResult = await client.query(
                `INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
                ['auditor', 'auditor@example.com', auditorPassword, 'System', 'Auditor', true]
            );

            const auditorId = auditorResult.rows[0].id;

            // Get auditor role
            const roleResult = await client.query(
                'SELECT id FROM roles WHERE name = $1',
                ['auditor']
            );

            if (roleResult.rows.length > 0) {
                await client.query(
                    `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)`,
                    [auditorId, roleResult.rows[0].id]
                );
            }

            console.log('✅ Created auditor user (username: auditor, password: Auditor123!)');
        }

        console.log('\n🎉 Database seeding completed!');
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
