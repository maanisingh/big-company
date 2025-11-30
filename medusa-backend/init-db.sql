-- Initialize BigCompany Database
-- Create schemas for different services

-- Schema for n8n workflows
CREATE SCHEMA IF NOT EXISTS n8n;

-- Schema for Blnk ledger (it creates its own tables)
CREATE SCHEMA IF NOT EXISTS blnk;

-- Schema for custom BigCompany extensions
CREATE SCHEMA IF NOT EXISTS bigcompany;

-- Grant permissions (safe for any setup)
-- Note: Railway and other cloud DBs may use different user names
DO $$
DECLARE
    role_exists BOOLEAN;
BEGIN
    -- Check if bigcompany role exists before trying to grant
    SELECT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'bigcompany'
    ) INTO role_exists;

    IF role_exists THEN
        EXECUTE 'GRANT ALL ON SCHEMA n8n TO bigcompany';
        EXECUTE 'GRANT ALL ON SCHEMA blnk TO bigcompany';
        EXECUTE 'GRANT ALL ON SCHEMA bigcompany TO bigcompany';
        RAISE NOTICE 'Granted schema permissions to bigcompany role';
    ELSE
        RAISE NOTICE 'Skipping GRANT - bigcompany role does not exist (using cloud database with different user)';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'GRANT skipped: %', SQLERRM;
END $$;

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
-- MULTI-BRANCH SUPPORT
-- =====================================================

-- Store Branches (Retail Outlets)
CREATE TABLE IF NOT EXISTS bigcompany.store_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID REFERENCES bigcompany.retailer_profiles(id),
    branch_code VARCHAR(20) NOT NULL UNIQUE,
    branch_name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    phone VARCHAR(20),
    manager_name VARCHAR(255),
    manager_phone VARCHAR(20),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    is_active BOOLEAN DEFAULT true,
    is_main_branch BOOLEAN DEFAULT false,
    operating_hours JSONB DEFAULT '{"mon":"08:00-20:00","tue":"08:00-20:00","wed":"08:00-20:00","thu":"08:00-20:00","fri":"08:00-20:00","sat":"09:00-18:00","sun":"closed"}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- POS Terminals (linked to branches)
CREATE TABLE IF NOT EXISTS bigcompany.pos_terminals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES bigcompany.store_branches(id),
    terminal_code VARCHAR(20) NOT NULL UNIQUE,
    terminal_name VARCHAR(100),
    device_type VARCHAR(50) DEFAULT 'standard', -- standard, mobile, tablet
    serial_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- POS Transactions (all card payments linked to branch/terminal)
CREATE TABLE IF NOT EXISTS bigcompany.pos_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_ref VARCHAR(50) NOT NULL UNIQUE,
    branch_id UUID REFERENCES bigcompany.store_branches(id),
    terminal_id UUID REFERENCES bigcompany.pos_terminals(id),
    card_uid VARCHAR(100) NOT NULL,
    customer_id VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RWF',
    transaction_type VARCHAR(50) DEFAULT 'payment', -- payment, refund, void
    payment_method VARCHAR(50) DEFAULT 'nfc_card', -- nfc_card, wallet_qr
    status VARCHAR(50) DEFAULT 'completed', -- completed, refunded, voided
    pin_used BOOLEAN DEFAULT false,
    cashier_id VARCHAR(255),
    cashier_name VARCHAR(100),
    receipt_number VARCHAR(50),
    items JSONB DEFAULT '[]',
    blnk_transaction_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branch Daily Summary (for reports)
CREATE TABLE IF NOT EXISTS bigcompany.branch_daily_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES bigcompany.store_branches(id),
    summary_date DATE NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    total_refunds DECIMAL(15,2) DEFAULT 0,
    card_payments_count INTEGER DEFAULT 0,
    card_payments_amount DECIMAL(15,2) DEFAULT 0,
    wallet_payments_count INTEGER DEFAULT 0,
    wallet_payments_amount DECIMAL(15,2) DEFAULT 0,
    average_transaction DECIMAL(15,2) DEFAULT 0,
    peak_hour INTEGER,
    unique_customers INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, summary_date)
);

-- Wallet Transactions (enhanced with branch tracking)
CREATE TABLE IF NOT EXISTS bigcompany.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- wallet_topup, gas_purchase, nfc_payment, loan_disbursement, loan_repayment, refund
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RWF',
    direction VARCHAR(10) DEFAULT 'debit', -- debit, credit
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    reference VARCHAR(100) UNIQUE,
    description TEXT,
    branch_id UUID REFERENCES bigcompany.store_branches(id),
    terminal_id UUID REFERENCES bigcompany.pos_terminals(id),
    payment_method VARCHAR(50), -- mtn_momo, airtel_money, nfc_card, wallet_transfer
    external_ref VARCHAR(255), -- Mobile money reference, etc.
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, reversed
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rewards Ledger (points system)
CREATE TABLE IF NOT EXISTS bigcompany.rewards_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL, -- earned, redeemed
    points INTEGER NOT NULL,
    source VARCHAR(50), -- purchase, referral, bonus, redemption
    source_ref VARCHAR(255), -- Order ID, promo code, etc.
    branch_id UUID REFERENCES bigcompany.store_branches(id),
    description TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retailer Profiles (enhanced for multi-branch)
CREATE TABLE IF NOT EXISTS bigcompany.retailer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    business_registration_no VARCHAR(100),
    tax_id VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address JSONB DEFAULT '{}',
    credit_limit DECIMAL(15,2) DEFAULT 0,
    credit_used DECIMAL(15,2) DEFAULT 0,
    wholesaler_id UUID REFERENCES bigcompany.wholesaler_profiles(id),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    verified_by VARCHAR(255),
    blnk_account_id VARCHAR(255),
    total_branches INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wholesaler Profiles
CREATE TABLE IF NOT EXISTS bigcompany.wholesaler_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    business_registration_no VARCHAR(100),
    tax_id VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    blnk_account_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Loans (enhanced)
CREATE TABLE IF NOT EXISTS bigcompany.customer_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES bigcompany.loan_products(id),
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) DEFAULT 0,
    total_repayment DECIMAL(15,2) NOT NULL,
    outstanding_balance DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'RWF',
    loan_type VARCHAR(50) DEFAULT 'food',
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, disbursed, paid, defaulted, rejected
    due_date DATE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rejected_by VARCHAR(255),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    disbursed_at TIMESTAMP,
    paid_at TIMESTAMP,
    blnk_loan_account_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users
CREATE TABLE IF NOT EXISTS bigcompany.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'admin', -- super_admin, admin, support
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform Settings
CREATE TABLE IF NOT EXISTS bigcompany.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retailer Orders (B2B orders from retailers to wholesalers)
CREATE TABLE IF NOT EXISTS bigcompany.retailer_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    retailer_id UUID REFERENCES bigcompany.retailer_profiles(id),
    wholesaler_id UUID REFERENCES bigcompany.wholesaler_profiles(id),
    branch_id UUID REFERENCES bigcompany.store_branches(id),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RWF',
    payment_method VARCHAR(50), -- cash, credit, wallet
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, partial, paid
    order_status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
    delivery_address JSONB DEFAULT '{}',
    delivery_date DATE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit Requests (retailers requesting credit from wholesalers)
CREATE TABLE IF NOT EXISTS bigcompany.credit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) NOT NULL UNIQUE,
    retailer_id UUID REFERENCES bigcompany.retailer_profiles(id),
    wholesaler_id UUID REFERENCES bigcompany.wholesaler_profiles(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RWF',
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    approved_amount DECIMAL(15,2),
    rejection_reason TEXT,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Multi-branch indexes
CREATE INDEX IF NOT EXISTS idx_store_branches_retailer ON bigcompany.store_branches(retailer_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_branch ON bigcompany.pos_terminals(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_branch ON bigcompany.pos_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_customer ON bigcompany.pos_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date ON bigcompany.pos_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_branch_summary_date ON bigcompany.branch_daily_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON bigcompany.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_branch ON bigcompany.wallet_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_rewards_ledger_user ON bigcompany.rewards_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_retailer_profiles_user ON bigcompany.retailer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_wholesaler_profiles_user ON bigcompany.wholesaler_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_loans_customer ON bigcompany.customer_loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_loans_status ON bigcompany.customer_loans(status);
CREATE INDEX IF NOT EXISTS idx_retailer_orders_retailer ON bigcompany.retailer_orders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_orders_wholesaler ON bigcompany.retailer_orders(wholesaler_id);
CREATE INDEX IF NOT EXISTS idx_retailer_orders_status ON bigcompany.retailer_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_credit_requests_retailer ON bigcompany.credit_requests(retailer_id);
CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON bigcompany.credit_requests(status);

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
