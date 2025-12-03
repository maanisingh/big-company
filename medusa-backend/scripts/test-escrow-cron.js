/**
 * Test Script for Escrow Cron Jobs
 *
 * This script tests the cron job functionality without waiting for scheduled times.
 * It manually triggers both auto-release and auto-deduct jobs.
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bigcompany_user:bigcompany_password@localhost:5435/bigcompany',
});

async function testAutoRelease() {
  console.log('\n🧪 Testing Auto-Release Job...\n');

  try {
    // 1. Check for escrows past auto_release_at
    const checkQuery = `
      SELECT id, order_id, retailer_id, wholesaler_id, order_amount, auto_release_at
      FROM bigcompany.escrow_transactions
      WHERE status = 'held' AND auto_release_at <= NOW()
    `;

    const result = await pool.query(checkQuery);

    console.log(`📊 Found ${result.rows.length} escrows eligible for auto-release:`);

    if (result.rows.length > 0) {
      result.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Order ${row.order_id}: ${row.order_amount} RWF (expired ${row.auto_release_at})`);
      });

      console.log('\n⚠️  In production, these would be released automatically at 2 AM daily');
      console.log('   To trigger manually: POST /admin/escrow-jobs/trigger-auto-release');
    } else {
      console.log('   ✅ No expired escrows found (all up to date)');
    }

  } catch (error) {
    console.error('❌ Error testing auto-release:', error.message);
  }
}

async function testAutoDeduct() {
  console.log('\n🧪 Testing Auto-Deduct Job...\n');

  try {
    // 1. Get retailers with auto-deduct enabled and outstanding debt
    const query = `
      SELECT
        ad.retailer_id,
        ad.enabled,
        ad.deduction_percentage,
        ad.minimum_balance_rwf,
        COALESCE(SUM(et.escrow_amount), 0) as total_held,
        COALESCE((SELECT SUM(repayment_amount)
                  FROM bigcompany.escrow_repayments
                  WHERE retailer_id = ad.retailer_id), 0) as total_repaid,
        COALESCE(SUM(et.escrow_amount), 0) - COALESCE((SELECT SUM(repayment_amount)
                                                        FROM bigcompany.escrow_repayments
                                                        WHERE retailer_id = ad.retailer_id), 0) as outstanding_debt
      FROM bigcompany.escrow_auto_deductions ad
      LEFT JOIN bigcompany.escrow_transactions et ON et.retailer_id = ad.retailer_id
        AND et.status IN ('released', 'expired')
      WHERE ad.enabled = TRUE
      GROUP BY ad.retailer_id, ad.enabled, ad.deduction_percentage, ad.minimum_balance_rwf
      HAVING COALESCE(SUM(et.escrow_amount), 0) - COALESCE((SELECT SUM(repayment_amount)
                                                              FROM bigcompany.escrow_repayments
                                                              WHERE retailer_id = ad.retailer_id), 0) > 0
    `;

    const result = await pool.query(query);

    console.log(`📊 Found ${result.rows.length} retailers with auto-deduct enabled:`);

    if (result.rows.length > 0) {
      result.rows.forEach((row, index) => {
        const deductionAmount = (row.outstanding_debt * (row.deduction_percentage / 100)).toFixed(2);
        console.log(`   ${index + 1}. Retailer ${row.retailer_id}:`);
        console.log(`      Outstanding: ${parseFloat(row.outstanding_debt).toFixed(2)} RWF`);
        console.log(`      Deduction rate: ${row.deduction_percentage}%`);
        console.log(`      Would deduct: ${deductionAmount} RWF (if wallet balance > ${row.minimum_balance_rwf})`);
      });

      console.log('\n⚠️  In production, these deductions run automatically at 11 PM daily');
      console.log('   To trigger manually: POST /admin/escrow-jobs/trigger-auto-deduct');
    } else {
      console.log('   ✅ No retailers with outstanding debt found');
    }

  } catch (error) {
    console.error('❌ Error testing auto-deduct:', error.message);
  }
}

async function showCronSchedule() {
  console.log('\n📅 Cron Job Schedule:\n');
  console.log('   ⏰ Auto-Release: Daily at 2:00 AM EAT');
  console.log('      Purpose: Release escrows past their auto_release_at date');
  console.log('      Cron pattern: 0 2 * * *');
  console.log('');
  console.log('   ⏰ Auto-Deduct: Daily at 11:00 PM EAT');
  console.log('      Purpose: Deduct repayments from retailer wallets');
  console.log('      Cron pattern: 0 23 * * *');
  console.log('');
}

async function createTestData() {
  console.log('\n🔧 Creating test data for cron job testing...\n');

  try {
    // Create a test escrow that's already expired (for auto-release testing)
    const createExpiredEscrow = `
      INSERT INTO bigcompany.escrow_transactions (
        order_id, retailer_id, wholesaler_id, order_amount, escrow_amount,
        status, auto_release_at
      ) VALUES (
        'TEST_ORDER_' || gen_random_uuid(),
        'test_retailer_001',
        'test_wholesaler_001',
        100000,
        100000,
        'held',
        NOW() - INTERVAL '1 day'
      ) RETURNING id, order_id;
    `;

    const expiredResult = await pool.query(createExpiredEscrow);
    console.log(`✅ Created expired test escrow: ${expiredResult.rows[0].order_id}`);

    // Create auto-deduct settings for test retailer
    const createAutoDeductSettings = `
      INSERT INTO bigcompany.escrow_auto_deductions (
        retailer_id, enabled, deduction_percentage, minimum_balance_rwf
      ) VALUES (
        'test_retailer_001',
        TRUE,
        30.00,
        10000.00
      ) ON CONFLICT (retailer_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        deduction_percentage = EXCLUDED.deduction_percentage;
    `;

    await pool.query(createAutoDeductSettings);
    console.log('✅ Created auto-deduct settings for test retailer');

    // Create a released escrow to simulate outstanding debt
    const createReleasedEscrow = `
      INSERT INTO bigcompany.escrow_transactions (
        order_id, retailer_id, wholesaler_id, order_amount, escrow_amount,
        status
      ) VALUES (
        'TEST_ORDER_RELEASED_' || gen_random_uuid(),
        'test_retailer_001',
        'test_wholesaler_001',
        200000,
        200000,
        'released'
      ) RETURNING id, order_id;
    `;

    const releasedResult = await pool.query(createReleasedEscrow);
    console.log(`✅ Created released test escrow (simulating debt): ${releasedResult.rows[0].order_id}`);

    console.log('\n✅ Test data created successfully!');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...\n');

  try {
    // Delete test escrows
    await pool.query(`
      DELETE FROM bigcompany.escrow_transactions
      WHERE order_id LIKE 'TEST_ORDER%' OR retailer_id LIKE 'test_%'
    `);

    // Delete test auto-deduct settings
    await pool.query(`
      DELETE FROM bigcompany.escrow_auto_deductions
      WHERE retailer_id LIKE 'test_%'
    `);

    console.log('✅ Test data cleaned up successfully!');

  } catch (error) {
    console.error('❌ Error cleaning up test data:', error.message);
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('           ESCROW CRON JOB TEST SCRIPT');
  console.log('═══════════════════════════════════════════════════════════');

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'create-test-data') {
      await createTestData();
    } else if (command === 'cleanup') {
      await cleanupTestData();
    } else {
      // Default: run tests with existing data
      await showCronSchedule();
      await testAutoRelease();
      await testAutoDeduct();

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('   To create test data: node scripts/test-escrow-cron.js create-test-data');
      console.log('   To cleanup test data: node scripts/test-escrow-cron.js cleanup');
      console.log('═══════════════════════════════════════════════════════════\n');
    }

  } catch (error) {
    console.error('\n❌ Test script failed:', error);
  } finally {
    await pool.end();
  }
}

main();
