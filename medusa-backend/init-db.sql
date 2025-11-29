-- Initialize BigCompany Database
-- Create schemas for different services

-- Schema for n8n workflows
CREATE SCHEMA IF NOT EXISTS n8n;

-- Schema for Blnk ledger (it creates its own tables)
CREATE SCHEMA IF NOT EXISTS blnk;

-- Schema for custom BigCompany extensions
CREATE SCHEMA IF NOT EXISTS bigcompany;

-- Grant permissions
GRANT ALL ON SCHEMA n8n TO bigcompany;
GRANT ALL ON SCHEMA blnk TO bigcompany;
GRANT ALL ON SCHEMA bigcompany TO bigcompany;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- BIGCOMPANY CUSTOM TABLES (Beyond Medusa/Blnk)
-- =====================================================

-- Utility Meters (Gas, Electric, Water)
CREATE TABLE IF NOT EXISTS bigcompany.utility_meters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- References Medusa customer
    meter_type VARCHAR(50) NOT NULL DEFAULT 'gas', -- gas, electricity, water
    meter_number VARCHAR(100) NOT NULL,
    provider VARCHAR(100) DEFAULT 'generic',
    alias VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meter_number, provider)
);

-- Utility Top-ups
CREATE TABLE IF NOT EXISTS bigcompany.utility_topups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    meter_id UUID REFERENCES bigcompany.utility_meters(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RWF',
    token VARCHAR(255), -- STS token from provider
    units_purchased DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, success, failed
    blnk_transaction_id VARCHAR(255), -- Reference to Blnk ledger
    provider_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan Products
CREATE TABLE IF NOT EXISTS bigcompany.loan_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) DEFAULT 0, -- 0 for food loans
    term_days INTEGER DEFAULT 30,
    loan_type VARCHAR(50) DEFAULT 'food', -- food, cash
    requirements JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans
CREATE TABLE IF NOT EXISTS bigcompany.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    borrower_id VARCHAR(255) NOT NULL, -- References Medusa customer
    loan_product_id UUID REFERENCES bigcompany.loan_products(id),
    principal DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) DEFAULT 0,
    total_repayment DECIMAL(15,2) NOT NULL,
    outstanding_balance DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RWF',
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, disbursed, active, paid, defaulted
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    disbursed_at TIMESTAMP,
    due_date DATE,
    blnk_account_id VARCHAR(255), -- Loan account in Blnk
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan Repayments
CREATE TABLE IF NOT EXISTS bigcompany.loan_repayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES bigcompany.loans(id),
    amount DECIMAL(15,2) NOT NULL,
    principal_portion DECIMAL(15,2),
    interest_portion DECIMAL(15,2),
    payment_method VARCHAR(50), -- wallet, mobile_money, gas_reward
    blnk_transaction_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NFC Cards
CREATE TABLE IF NOT EXISTS bigcompany.nfc_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- References Medusa customer
    card_uid VARCHAR(100) NOT NULL UNIQUE, -- NFC tag UID
    dashboard_id VARCHAR(50) NOT NULL UNIQUE, -- Printed on card
    card_alias VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    pin_hash VARCHAR(255), -- Hashed PIN for card payments
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Merchant Profiles (extends Medusa vendors)
CREATE TABLE IF NOT EXISTS bigcompany.merchant_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medusa_vendor_id VARCHAR(255) UNIQUE, -- References Medusa marketplace vendor
    merchant_type VARCHAR(50) NOT NULL, -- retailer, wholesaler
    business_name VARCHAR(255) NOT NULL,
    business_registration_no VARCHAR(100),
    tax_id VARCHAR(100),
    phone VARCHAR(20),
    address JSONB DEFAULT '{}',
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    credit_used DECIMAL(15,2) DEFAULT 0,
    blnk_account_id VARCHAR(255), -- Merchant wallet in Blnk
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rating DECIMAL(3,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Merchant Relationships (Retailer-Wholesaler)
CREATE TABLE IF NOT EXISTS bigcompany.merchant_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID REFERENCES bigcompany.merchant_profiles(id),
    wholesaler_id UUID REFERENCES bigcompany.merchant_profiles(id),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    credit_used DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(retailer_id, wholesaler_id)
);

-- Credit Orders (B2B)
CREATE TABLE IF NOT EXISTS bigcompany.credit_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medusa_order_id VARCHAR(255), -- References Medusa order
    retailer_id UUID REFERENCES bigcompany.merchant_profiles(id),
    wholesaler_id UUID REFERENCES bigcompany.merchant_profiles(id),
    credit_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RWF',
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending_approval', -- pending_approval, approved, rejected, paid, overdue
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    blnk_transaction_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gas Rewards
CREATE TABLE IF NOT EXISTS bigcompany.gas_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    order_id VARCHAR(255), -- Medusa order that triggered reward
    profit_amount DECIMAL(15,2) NOT NULL, -- Profit from the sale
    reward_percentage DECIMAL(5,2) DEFAULT 12.00,
    reward_amount DECIMAL(15,2) NOT NULL, -- Gas value rewarded
    meter_id UUID REFERENCES bigcompany.utility_meters(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, credited, failed
    credited_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USSD Sessions
CREATE TABLE IF NOT EXISTS bigcompany.ussd_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    user_id VARCHAR(255), -- Linked Medusa customer if found
    service_code VARCHAR(20),
    current_state VARCHAR(100) DEFAULT 'main_menu',
    session_data JSONB DEFAULT '{}',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    last_input VARCHAR(255)
);

-- SMS Messages Log
CREATE TABLE IF NOT EXISTS bigcompany.sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    phone_number VARCHAR(20) NOT NULL,
    user_id VARCHAR(255),
    message TEXT NOT NULL,
    provider_message_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    cost DECIMAL(10,4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Provider Configurations
CREATE TABLE IF NOT EXISTS bigcompany.payment_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- mtn_momo, airtel_money
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}', -- Encrypted in production
    supported_currencies VARCHAR[] DEFAULT ARRAY['RWF'],
    sandbox_mode BOOLEAN DEFAULT true,
    webhook_url VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings
CREATE TABLE IF NOT EXISTS bigcompany.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    is_encrypted BOOLEAN DEFAULT false,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, key)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS bigcompany.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_utility_meters_user ON bigcompany.utility_meters(user_id);
CREATE INDEX IF NOT EXISTS idx_utility_topups_user ON bigcompany.utility_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_utility_topups_meter ON bigcompany.utility_topups(meter_id);
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON bigcompany.loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON bigcompany.loans(status);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_user ON bigcompany.nfc_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_uid ON bigcompany.nfc_cards(card_uid);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_type ON bigcompany.merchant_profiles(merchant_type);
CREATE INDEX IF NOT EXISTS idx_credit_orders_retailer ON bigcompany.credit_orders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_credit_orders_status ON bigcompany.credit_orders(status);
CREATE INDEX IF NOT EXISTS idx_gas_rewards_user ON bigcompany.gas_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_phone ON bigcompany.ussd_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_phone ON bigcompany.sms_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON bigcompany.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON bigcompany.audit_logs(entity_type, entity_id);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default Loan Products
INSERT INTO bigcompany.loan_products (name, description, min_amount, max_amount, interest_rate, term_days, loan_type)
VALUES
    ('Food Loan - Small', 'Small food loan for essential items', 300, 2000, 0, 30, 'food'),
    ('Food Loan - Medium', 'Medium food loan for weekly shopping', 2000, 5000, 0, 30, 'food'),
    ('Food Loan - Large', 'Large food loan for bulk purchases', 5000, 10000, 0, 30, 'food')
ON CONFLICT DO NOTHING;

-- Default Payment Providers (credentials to be added via admin)
INSERT INTO bigcompany.payment_providers (name, display_name, is_active, sandbox_mode, supported_currencies)
VALUES
    ('mtn_momo', 'MTN Mobile Money', false, true, ARRAY['RWF']),
    ('airtel_money', 'Airtel Money', false, true, ARRAY['RWF'])
ON CONFLICT (name) DO NOTHING;

-- Default System Settings
INSERT INTO bigcompany.system_settings (category, key, value, description)
VALUES
    ('general', 'company_name', '"BIG Company"', 'Company display name'),
    ('general', 'default_currency', '"RWF"', 'Default currency code'),
    ('general', 'country', '"RW"', 'Country code'),
    ('general', 'timezone', '"Africa/Kigali"', 'Default timezone'),
    ('gas_rewards', 'min_profit_threshold', '1000', 'Minimum profit (RWF) to trigger gas reward'),
    ('gas_rewards', 'reward_percentage', '12', 'Percentage of profit given as gas reward'),
    ('topup', 'predefined_amounts', '[300, 500, 1000, 2000, 5000, 10000]', 'Predefined top-up amounts in RWF'),
    ('sms', 'provider', '"africastalking"', 'SMS provider'),
    ('ussd', 'service_code', '"*939#"', 'USSD service code')
ON CONFLICT (category, key) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'BigCompany database initialized successfully!';
END $$;
