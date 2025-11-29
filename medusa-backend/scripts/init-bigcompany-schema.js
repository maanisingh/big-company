#!/usr/bin/env node
/**
 * Initialize BigCompany custom schema and tables
 * This script runs before Medusa starts to ensure all custom tables exist
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initBigCompanySchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('[init-bigcompany-schema] ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  console.log('[init-bigcompany-schema] Initializing BigCompany custom schema...');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway.app') ? { rejectUnauthorized: false } : false
  });

  try {
    // Read the init-db.sql file
    const sqlFile = path.join(__dirname, '..', 'init-db.sql');

    if (!fs.existsSync(sqlFile)) {
      console.error('[init-bigcompany-schema] ERROR: init-db.sql not found at', sqlFile);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Execute the SQL
    await pool.query(sql);

    console.log('[init-bigcompany-schema] BigCompany schema initialized successfully!');

    // Verify key tables exist
    const checkTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'bigcompany'
      ORDER BY table_name
    `);

    console.log('[init-bigcompany-schema] Created tables:', checkTables.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    // Check if it's a benign error that we can safely ignore
    if (error.message && (
      error.message.includes('already exists') ||
      error.message.includes('role') ||
      error.message.includes('permission denied')
    )) {
      console.log('[init-bigcompany-schema] Non-critical issue (continuing):', error.message);
    } else {
      console.error('[init-bigcompany-schema] ERROR:', error.message);
      // Don't exit with error - the tables might already exist from a partial run
      // Let Medusa try to start and fail if there's a real problem
    }
  } finally {
    await pool.end();
  }
}

initBigCompanySchema();
