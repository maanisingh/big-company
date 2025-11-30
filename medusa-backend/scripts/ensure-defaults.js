#!/usr/bin/env node
/**
 * Ensure Medusa defaults exist before starting the server
 * This prevents the "Error starting server" during "Initializing defaults"
 *
 * The issue: Medusa's initializeDefaults() can fail if:
 * 1. Currency doesn't exist (RWF is not in default list)
 * 2. A previous run left the database in an inconsistent state
 * 3. Transaction rollbacks leave orphaned references
 * 4. Store record missing required fields
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
    // 1. Check current database state for debugging
    console.log('[ensure-defaults] Checking database state...');

    const storeCount = await pool.query(`SELECT COUNT(*) as count FROM public.store`);
    const currencyCount = await pool.query(`SELECT COUNT(*) as count FROM public.currency`);
    const regionCount = await pool.query(`SELECT COUNT(*) as count FROM public.region`);

    console.log(`[ensure-defaults] Current state: stores=${storeCount.rows[0].count}, currencies=${currencyCount.rows[0].count}, regions=${regionCount.rows[0].count}`);

    // 2. Ensure RWF currency exists
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

    // 3. Check if store exists and has all required fields
    console.log('[ensure-defaults] Checking store...');
    const storeCheck = await pool.query(
      `SELECT id, name, default_currency_code, default_sales_channel_id FROM public.store LIMIT 1`
    );

    if (storeCheck.rows.length === 0) {
      console.log('[ensure-defaults] No store found - Medusa will create one');
      // Don't create store manually - let Medusa do it with all required fields
    } else {
      const store = storeCheck.rows[0];
      console.log(`[ensure-defaults] Store exists: id=${store.id}, currency=${store.default_currency_code}, channel=${store.default_sales_channel_id}`);

      // If store exists but has wrong currency, update it
      if (store.default_currency_code !== 'rwf') {
        console.log('[ensure-defaults] Updating store currency to rwf...');
        await pool.query(`
          UPDATE public.store
          SET default_currency_code = 'rwf', updated_at = NOW()
          WHERE id = $1
        `, [store.id]);
      }

      // Ensure store_currencies table has the currencies linked
      // First check if entries exist, then insert if not (avoids type inference issues)
      const rwfExists = await pool.query(
        `SELECT 1 FROM public.store_currencies WHERE store_id = $1 AND currency_code = $2`,
        [store.id, 'rwf']
      );
      if (rwfExists.rows.length === 0) {
        console.log('[ensure-defaults] Linking RWF currency to store...');
        await pool.query(
          `INSERT INTO public.store_currencies (store_id, currency_code) VALUES ($1, $2)`,
          [store.id, 'rwf']
        );
      }

      const usdExists = await pool.query(
        `SELECT 1 FROM public.store_currencies WHERE store_id = $1 AND currency_code = $2`,
        [store.id, 'usd']
      );
      if (usdExists.rows.length === 0) {
        console.log('[ensure-defaults] Linking USD currency to store...');
        await pool.query(
          `INSERT INTO public.store_currencies (store_id, currency_code) VALUES ($1, $2)`,
          [store.id, 'usd']
        );
      }
    }

    // 4. Check regions
    console.log('[ensure-defaults] Checking regions...');
    const regionCheck = await pool.query(
      `SELECT id, name, currency_code FROM public.region LIMIT 5`
    );

    if (regionCheck.rows.length === 0) {
      console.log('[ensure-defaults] No regions found - Medusa will create default');
    } else {
      console.log(`[ensure-defaults] Found ${regionCheck.rows.length} regions:`, regionCheck.rows.map(r => `${r.name}(${r.currency_code})`).join(', '));
    }

    // 5. Check and CREATE sales channels if missing (Medusa 1.20+ requires this)
    // This is CRITICAL - Medusa's initializeDefaults() can fail silently if it can't create the channel
    console.log('[ensure-defaults] Checking sales channels...');
    const channelCheck = await pool.query(
      `SELECT id, name, is_disabled FROM public.sales_channel LIMIT 5`
    );

    let defaultChannelId = null;
    if (channelCheck.rows.length === 0) {
      console.log('[ensure-defaults] No sales channels found - creating default channel...');
      try {
        // Generate a unique ID for the sales channel
        const channelId = 'sc_bigcompany_' + Date.now().toString(36);
        await pool.query(`
          INSERT INTO public.sales_channel (id, name, description, is_disabled, created_at, updated_at)
          VALUES ($1, 'BigCompany Store', 'Default sales channel for BigCompany', false, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [channelId]);
        defaultChannelId = channelId;
        console.log('[ensure-defaults] Created default sales channel:', channelId);
      } catch (scError) {
        console.error('[ensure-defaults] Failed to create sales channel:', scError.message);
        // Continue anyway - Medusa might be able to create it
      }
    } else {
      defaultChannelId = channelCheck.rows[0].id;
      console.log(`[ensure-defaults] Found ${channelCheck.rows.length} sales channels:`, channelCheck.rows.map(c => c.name).join(', '));
    }

    // 5b. Link store to sales channel if not already linked
    if (storeCheck.rows.length > 0 && defaultChannelId) {
      const store = storeCheck.rows[0];
      if (!store.default_sales_channel_id) {
        console.log('[ensure-defaults] Linking store to default sales channel...');
        try {
          await pool.query(`
            UPDATE public.store
            SET default_sales_channel_id = $1, updated_at = NOW()
            WHERE id = $2
          `, [defaultChannelId, store.id]);
          console.log('[ensure-defaults] Store linked to sales channel');
        } catch (linkError) {
          console.error('[ensure-defaults] Failed to link store to channel:', linkError.message);
        }
      }
    }

    // 6. Check and CREATE fulfillment and payment providers
    // These are REQUIRED for Medusa to start - initializeDefaults() fails without them
    console.log('[ensure-defaults] Checking providers...');

    // Check fulfillment providers
    const fulfillmentCheck = await pool.query(
      `SELECT id, is_installed FROM public.fulfillment_provider`
    );

    if (fulfillmentCheck.rows.length === 0) {
      console.log('[ensure-defaults] No fulfillment providers - creating manual provider...');
      try {
        await pool.query(`
          INSERT INTO public.fulfillment_provider (id, is_installed)
          VALUES ('manual', true)
          ON CONFLICT (id) DO NOTHING
        `);
        console.log('[ensure-defaults] Created manual fulfillment provider');
      } catch (fpErr) {
        console.error('[ensure-defaults] Failed to create fulfillment provider:', fpErr.message);
      }
    } else {
      console.log(`[ensure-defaults] Fulfillment providers: ${fulfillmentCheck.rows.map(f => f.id).join(', ')}`);
    }

    // Check payment providers
    const paymentCheck = await pool.query(
      `SELECT id, is_installed FROM public.payment_provider`
    );

    if (paymentCheck.rows.length === 0) {
      console.log('[ensure-defaults] No payment providers - creating manual provider...');
      try {
        await pool.query(`
          INSERT INTO public.payment_provider (id, is_installed)
          VALUES ('manual', true)
          ON CONFLICT (id) DO NOTHING
        `);
        console.log('[ensure-defaults] Created manual payment provider');
      } catch (ppErr) {
        console.error('[ensure-defaults] Failed to create payment provider:', ppErr.message);
      }
    } else {
      console.log(`[ensure-defaults] Payment providers: ${paymentCheck.rows.map(p => p.id).join(', ')}`);
    }

    // 7. Link providers to region if region exists
    if (regionCheck.rows.length > 0) {
      const regionId = regionCheck.rows[0].id;
      console.log(`[ensure-defaults] Checking provider links for region ${regionId}...`);

      // Link fulfillment provider to region
      const fpLinkCheck = await pool.query(
        `SELECT 1 FROM public.region_fulfillment_providers WHERE region_id = $1 AND provider_id = 'manual'`,
        [regionId]
      );
      if (fpLinkCheck.rows.length === 0) {
        console.log('[ensure-defaults] Linking manual fulfillment provider to region...');
        try {
          await pool.query(
            `INSERT INTO public.region_fulfillment_providers (region_id, provider_id) VALUES ($1, 'manual')`,
            [regionId]
          );
        } catch (linkErr) {
          console.error('[ensure-defaults] Failed to link fulfillment provider:', linkErr.message);
        }
      }

      // Link payment provider to region
      const ppLinkCheck = await pool.query(
        `SELECT 1 FROM public.region_payment_providers WHERE region_id = $1 AND provider_id = 'manual'`,
        [regionId]
      );
      if (ppLinkCheck.rows.length === 0) {
        console.log('[ensure-defaults] Linking manual payment provider to region...');
        try {
          await pool.query(
            `INSERT INTO public.region_payment_providers (region_id, provider_id) VALUES ($1, 'manual')`,
            [regionId]
          );
        } catch (linkErr) {
          console.error('[ensure-defaults] Failed to link payment provider:', linkErr.message);
        }
      }
    }

    console.log('[ensure-defaults] Database check complete!');

  } catch (error) {
    // Log the full error for debugging
    console.error('[ensure-defaults] Error:', error.message);
    console.error('[ensure-defaults] Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

ensureDefaults();
