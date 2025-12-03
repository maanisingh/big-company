-- ============================================
-- ESCROW SYSTEM MIGRATION (Standalone Version)
-- ============================================
-- Purpose: Enable company to hold funds in escrow for retailer B2B orders
-- Flow: Retailer orders → Company pays wholesaler → Retailer owes company
-- Features: Auto-release, repayment tracking, auto-deduct from sales
-- NOTE: Foreign key constraints removed - will be added when retailer/wholesaler tables exist

-- ============================================
-- 1. ESCROW TRANSACTIONS TABLE
-- ============================================
-- Tracks each escrow holding when retailer orders from wholesaler
CREATE TABLE IF NOT EXISTS bigcompany.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order Information
  order_id VARCHAR(255) NOT NULL UNIQUE,
  retailer_id VARCHAR(255) NOT NULL,
  wholesaler_id VARCHAR(255) NOT NULL,

  -- Financial Details
  order_amount DECIMAL(10, 2) NOT NULL CHECK (order_amount > 0),
  escrow_amount DECIMAL(10, 2) NOT NULL CHECK (escrow_amount > 0),
  currency VARCHAR(3) DEFAULT 'RWF',

  -- Ledger References (Blnk)
  blnk_escrow_balance_id VARCHAR(255), -- Company's escrow pool ledger
  blnk_transaction_ref VARCHAR(255), -- Transaction that moved funds to escrow

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'held' CHECK (status IN (
    'held',           -- Funds in escrow, awaiting confirmation
    'released',       -- Paid to wholesaler
    'disputed',       -- Issue raised, manual review needed
    'refunded',       -- Returned to company (order cancelled)
    'expired'         -- Auto-released after timeout
  )),

  -- Confirmation & Release
  confirmation_required BOOLEAN DEFAULT TRUE,
  confirmed_by VARCHAR(255), -- User who confirmed delivery
  confirmed_at TIMESTAMP,
  released_at TIMESTAMP,
  auto_release_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'), -- Default 7-day auto-release

  -- Dispute Management
  dispute_reason TEXT,
  dispute_raised_by VARCHAR(255),
  dispute_raised_at TIMESTAMP,
  dispute_resolved_at TIMESTAMP,

  -- Metadata
  order_details JSONB, -- Store order line items, etc.
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_escrow_retailer ON bigcompany.escrow_transactions(retailer_id);
CREATE INDEX idx_escrow_wholesaler ON bigcompany.escrow_transactions(wholesaler_id);
CREATE INDEX idx_escrow_status ON bigcompany.escrow_transactions(status);
CREATE INDEX idx_escrow_auto_release ON bigcompany.escrow_transactions(auto_release_at) WHERE status = 'held';
CREATE INDEX idx_escrow_order ON bigcompany.escrow_transactions(order_id);

-- ============================================
-- 2. ESCROW REPAYMENTS TABLE
-- ============================================
-- Tracks retailer payments back to company for escrow advances
CREATE TABLE IF NOT EXISTS bigcompany.escrow_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Escrow Reference
  escrow_transaction_id UUID NOT NULL REFERENCES bigcompany.escrow_transactions(id) ON DELETE CASCADE,
  retailer_id VARCHAR(255) NOT NULL,

  -- Repayment Details
  repayment_amount DECIMAL(10, 2) NOT NULL CHECK (repayment_amount > 0),
  repayment_method VARCHAR(50) NOT NULL CHECK (repayment_method IN (
    'auto_deduct',    -- Deducted from daily sales
    'mobile_money',   -- Manual payment via MTN/Airtel
    'bank_transfer',  -- Bank deposit
    'wallet',         -- From retailer wallet
    'offset'          -- Offset against future credit
  )),
  currency VARCHAR(3) DEFAULT 'RWF',

  -- Transaction References
  blnk_transaction_ref VARCHAR(255), -- Blnk ledger transaction ID
  payment_reference VARCHAR(255), -- External payment ref (MoMo, bank, etc.)

  -- Status
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN (
    'pending',
    'completed',
    'failed',
    'reversed'
  )),

  -- Metadata
  notes TEXT,
  payment_proof_url TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_repayment_escrow ON bigcompany.escrow_repayments(escrow_transaction_id);
CREATE INDEX idx_repayment_retailer ON bigcompany.escrow_repayments(retailer_id);
CREATE INDEX idx_repayment_status ON bigcompany.escrow_repayments(status);
CREATE INDEX idx_repayment_method ON bigcompany.escrow_repayments(repayment_method);

-- ============================================
-- 3. ESCROW AUTO-DEDUCTION SETTINGS
-- ============================================
-- Per-retailer settings for automatic repayment from daily sales
CREATE TABLE IF NOT EXISTS bigcompany.escrow_auto_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id VARCHAR(255) NOT NULL UNIQUE,

  -- Auto-Deduct Configuration
  enabled BOOLEAN DEFAULT TRUE,
  deduction_percentage DECIMAL(5, 2) DEFAULT 30.00 CHECK (deduction_percentage >= 0 AND deduction_percentage <= 100), -- % of daily sales
  minimum_balance_rwf DECIMAL(10, 2) DEFAULT 10000.00, -- Min wallet balance before deducting

  -- Limits
  max_daily_deduction_rwf DECIMAL(10, 2), -- Optional cap on daily deduction
  max_total_outstanding_rwf DECIMAL(10, 2) DEFAULT 5000000.00, -- Max debt allowed (5M RWF default)

  -- Status
  suspended BOOLEAN DEFAULT FALSE,
  suspended_reason TEXT,
  suspended_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auto_deduct_retailer ON bigcompany.escrow_auto_deductions(retailer_id);
CREATE INDEX idx_auto_deduct_enabled ON bigcompany.escrow_auto_deductions(enabled) WHERE enabled = TRUE;

-- ============================================
-- 4. ESCROW SETTINGS (Global)
-- ============================================
-- Company-wide escrow configuration
CREATE TABLE IF NOT EXISTS bigcompany.escrow_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255)
);

-- Insert default settings
INSERT INTO bigcompany.escrow_settings (setting_key, setting_value, description) VALUES
  ('auto_release_days', '7', 'Days until escrow auto-releases to wholesaler'),
  ('default_deduction_percentage', '30', 'Default % of sales to auto-deduct for repayment'),
  ('minimum_wallet_balance', '10000', 'Minimum retailer wallet balance (RWF) before deducting'),
  ('max_outstanding_debt', '5000000', 'Maximum total outstanding debt per retailer (RWF)'),
  ('escrow_enabled', 'true', 'Master switch for escrow system'),
  ('dispute_resolution_email', 'escrow@bigcompany.rw', 'Email for escrow disputes')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- 5. RETAILER ESCROW SUMMARY VIEW
-- ============================================
-- Aggregated view of each retailer's escrow position
CREATE OR REPLACE VIEW bigcompany.retailer_escrow_summary AS
SELECT
  et.retailer_id,
  COUNT(et.id) AS total_escrow_transactions,
  COUNT(et.id) FILTER (WHERE et.status = 'held') AS active_escrow_count,
  COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status = 'held'), 0) AS total_held_amount,
  COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status = 'released'), 0) AS total_released_amount,
  COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status = 'disputed'), 0) AS total_disputed_amount,
  COALESCE(SUM(er.repayment_amount) FILTER (WHERE er.status = 'completed'), 0) AS total_repaid_amount,
  COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status IN ('held', 'released')), 0) -
    COALESCE(SUM(er.repayment_amount) FILTER (WHERE er.status = 'completed'), 0) AS outstanding_debt,
  MAX(et.created_at) AS last_escrow_date,
  MAX(er.created_at) AS last_repayment_date
FROM bigcompany.escrow_transactions et
LEFT JOIN bigcompany.escrow_repayments er ON et.id = er.escrow_transaction_id
GROUP BY et.retailer_id;

-- ============================================
-- 6. UTILITY FUNCTION: GET RETAILER BALANCE
-- ============================================
-- Function to quickly get a retailer's escrow balance
CREATE OR REPLACE FUNCTION bigcompany.get_retailer_escrow_balance(p_retailer_id VARCHAR)
RETURNS TABLE (
  total_advanced DECIMAL,
  total_repaid DECIMAL,
  outstanding_debt DECIMAL,
  active_escrows INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status IN ('held', 'released')), 0) AS total_advanced,
    COALESCE(SUM(er.repayment_amount) FILTER (WHERE er.status = 'completed'), 0) AS total_repaid,
    COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status IN ('held', 'released')), 0) -
      COALESCE(SUM(er.repayment_amount) FILTER (WHERE er.status = 'completed'), 0) AS outstanding_debt,
    COUNT(et.id) FILTER (WHERE et.status = 'held')::INTEGER AS active_escrows
  FROM bigcompany.escrow_transactions et
  LEFT JOIN bigcompany.escrow_repayments er ON et.id = er.escrow_transaction_id
  WHERE et.retailer_id = p_retailer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify migration success:
-- SELECT * FROM bigcompany.escrow_settings;
-- SELECT * FROM bigcompany.retailer_escrow_summary;
-- SELECT * FROM bigcompany.get_retailer_escrow_balance('ret_001');
