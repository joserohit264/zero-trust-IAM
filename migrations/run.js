/**
 * Database Migration Runner
 * Executes SQL migration files against the database
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function runMigrations() {
    console.log('🚀 Starting database migrations...\n');

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const client = await pool.connect();

    try {
        for (const file of files) {
            console.log(`📄 Running migration: ${file}`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            await client.query(sql);
            console.log(`✅ Completed: ${file}\n`);
        }

        console.log('🎉 All migrations completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
