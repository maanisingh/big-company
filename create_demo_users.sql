-- Create demo users for testing
-- PIN hash is SHA256(pin + 'bigcompany_pin_secret')
-- Using PIN '1234' for all demo users

-- Consumer demo user
INSERT INTO customer (id, email, first_name, last_name, phone, metadata, has_account, created_at, updated_at)
VALUES (
  'cus_demo_consumer_001',
  '250788100001@bigcompany.rw',
  'Demo',
  'Consumer',
  '250788100001',
  '{"phone": "250788100001", "pin_hash": "a9c655598ffba7e324d95c32219cf25007dfe4bba482e2b34cc42c4d1bbf5a88", "registered_via": "demo", "kyc_status": "verified"}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Retailer demo user (in bigcompany schema)
INSERT INTO bigcompany.retailers (id, phone_number, name, shop_name, pin_hash, email, status, wallet_balance, credit_limit, credit_used, created_at, updated_at)
VALUES (
  'ret_demo_001',
  '250788123456',
  'Demo Retailer',
  'Kigali Demo Shop',
  'a9c655598ffba7e324d95c32219cf25007dfe4bba482e2b34cc42c4d1bbf5a88',
  'retailer@demo.bigcompany.rw',
  'active',
  0,
  500000,
  0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  pin_hash = EXCLUDED.pin_hash,
  updated_at = NOW();

-- Wholesaler demo user
INSERT INTO bigcompany.wholesalers (id, phone_number, name, company_name, pin_hash, email, status, wallet_balance, created_at, updated_at)
VALUES (
  'whl_demo_001',
  '250788654321',
  'Demo Wholesaler',
  'BIG Wholesale Ltd',
  'a9c655598ffba7e324d95c32219cf25007dfe4bba482e2b34cc42c4d1bbf5a88',
  'wholesaler@demo.bigcompany.rw',
  'active',
  0,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  pin_hash = EXCLUDED.pin_hash,
  updated_at = NOW();

SELECT 'Demo users created successfully' as result;
