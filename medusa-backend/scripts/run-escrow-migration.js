const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://bigcompany_user:bigcompany_password@localhost:5435/bigcompany',
  });

  try {
    console.log('🔄 Connecting to database...');

    // Read the migration file (standalone version without FK constraints)
    const migrationPath = path.join(__dirname, '../migrations/005_escrow_system_standalone.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('🚀 Executing escrow system migration...\n');

    // Execute the migration
    await db.query(migrationSQL);

    console.log('✅ Migration executed successfully!');
    console.log('\n📊 Verifying tables created...');

    // Verify tables were created
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'bigcompany'
      AND table_name IN ('escrow_transactions', 'escrow_repayments', 'escrow_settings', 'escrow_auto_deductions')
      ORDER BY table_name;
    `;

    const result = await db.query(tablesQuery);
    console.log(`✅ Created ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Verify view was created
    const viewQuery = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'bigcompany'
      AND table_name = 'retailer_escrow_summary';
    `;

    const viewResult = await db.query(viewQuery);
    if (viewResult.rows.length > 0) {
      console.log('✅ Created view: retailer_escrow_summary');
    }

    // Verify function was created
    const functionQuery = `
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'bigcompany'
      AND routine_name = 'get_retailer_escrow_balance';
    `;

    const functionResult = await db.query(functionQuery);
    if (functionResult.rows.length > 0) {
      console.log('✅ Created function: get_retailer_escrow_balance');
    }

    // Check escrow settings
    const settingsQuery = 'SELECT setting_key, setting_value FROM bigcompany.escrow_settings ORDER BY setting_key';
    const settingsResult = await db.query(settingsQuery);
    if (settingsResult.rows.length > 0) {
      console.log('\n⚙️  Escrow Settings:');
      settingsResult.rows.forEach(row => {
        console.log(`   - ${row.setting_key}: ${row.setting_value}`);
      });
    }

    console.log('\n🎉 Escrow system migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runMigration();
