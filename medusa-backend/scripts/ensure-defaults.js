#!/usr/bin/env node
/**
 * Ensure Medusa defaults exist before starting the server
 * This prevents the "Error starting server" during "Initializing defaults"
 *
 * The issue: Medusa's initializeDefaults() can fail if:
 * 1. Currency doesn't exist (RWF is not in default list)
 * 2. A previous run left the database in an inconsistent state
 * 3. Transaction rollbacks leave orphaned references
 */

const { Pool } = require('pg');

async function ensureDefaults() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('[ensure-defaults] ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  console.log('[ensure-defaults] Ensuring Medusa defaults exist...');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway.app') ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Ensure RWF currency exists
    console.log('[ensure-defaults] Checking currencies...');
    const currencyCheck = await pool.query(
      `SELECT code FROM public.currency WHERE code = 'rwf'`
    );

    if (currencyCheck.rows.length === 0) {
      console.log('[ensure-defaults] Adding RWF currency...');
      await pool.query(`
        INSERT INTO public.currency (code, symbol, symbol_native, name)
        VALUES ('rwf', 'RF', 'FRw', 'Rwandan Franc')
        ON CONFLICT (code) DO NOTHING
      `);
    } else {
      console.log('[ensure-defaults] RWF currency exists');
    }

    // Also ensure USD exists (backup currency)
    const usdCheck = await pool.query(
      `SELECT code FROM public.currency WHERE code = 'usd'`
    );
    if (usdCheck.rows.length === 0) {
      console.log('[ensure-defaults] Adding USD currency...');
      await pool.query(`
        INSERT INTO public.currency (code, symbol, symbol_native, name)
        VALUES ('usd', '$', '$', 'US Dollar')
        ON CONFLICT (code) DO NOTHING
      `);
    }

    // 2. Check if store exists
    console.log('[ensure-defaults] Checking store...');
    const storeCheck = await pool.query(
      `SELECT id FROM public.store LIMIT 1`
    );

    if (storeCheck.rows.length === 0) {
      console.log('[ensure-defaults] Creating default store...');
      await pool.query(`
        INSERT INTO public.store (id, name, default_currency_code, created_at, updated_at)
        VALUES (
          'store_01',
          'BIG Company',
          'rwf',
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING
      `);

      // Link currencies to the store
      await pool.query(`
        INSERT INTO public.store_currencies (store_id, currency_code)
        VALUES ('store_01', 'rwf'), ('store_01', 'usd')
        ON CONFLICT DO NOTHING
      `);
    } else {
      console.log('[ensure-defaults] Store already exists');

      // Ensure the store has the correct default currency
      await pool.query(`
        UPDATE public.store
        SET default_currency_code = 'rwf'
        WHERE default_currency_code IS NULL OR default_currency_code = ''
      `);
    }

    // 3. Check if default region exists
    console.log('[ensure-defaults] Checking regions...');
    const regionCheck = await pool.query(
      `SELECT id FROM public.region WHERE currency_code = 'rwf' LIMIT 1`
    );

    if (regionCheck.rows.length === 0) {
      console.log('[ensure-defaults] Creating default Rwanda region...');

      // First, ensure RW country exists
      await pool.query(`
        INSERT INTO public.country (id, iso_2, iso_3, num_code, name, display_name)
        VALUES (
          250,
          'rw',
          'rwa',
          646,
          'RWANDA',
          'Rwanda'
        )
        ON CONFLICT (iso_2) DO NOTHING
      `);

      // Create the region
      await pool.query(`
        INSERT INTO public.region (id, name, currency_code, tax_rate, created_at, updated_at)
        VALUES (
          'reg_rwanda',
          'Rwanda',
          'rwf',
          18,
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `);

      // Link country to region
      await pool.query(`
        UPDATE public.country
        SET region_id = 'reg_rwanda'
        WHERE iso_2 = 'rw'
      `);
    } else {
      console.log('[ensure-defaults] Rwanda region exists');
    }

    // 4. Link fulfillment and payment providers to region
    console.log('[ensure-defaults] Linking providers to region...');

    // Check if manual fulfillment provider exists
    const fulfillmentCheck = await pool.query(
      `SELECT id FROM public.fulfillment_provider WHERE id = 'manual' LIMIT 1`
    );

    if (fulfillmentCheck.rows.length > 0) {
      await pool.query(`
        INSERT INTO public.region_fulfillment_providers (region_id, provider_id)
        VALUES ('reg_rwanda', 'manual')
        ON CONFLICT DO NOTHING
      `);
    }

    // Check if manual payment provider exists
    const paymentCheck = await pool.query(
      `SELECT id FROM public.payment_provider WHERE id = 'manual' LIMIT 1`
    );

    if (paymentCheck.rows.length > 0) {
      await pool.query(`
        INSERT INTO public.region_payment_providers (region_id, provider_id)
        VALUES ('reg_rwanda', 'manual')
        ON CONFLICT DO NOTHING
      `);
    }

    console.log('[ensure-defaults] Defaults ensured successfully!');

  } catch (error) {
    // Log the error but don't fail - let Medusa handle it
    console.error('[ensure-defaults] Error (continuing anyway):', error.message);
  } finally {
    await pool.end();
  }
}

ensureDefaults();
