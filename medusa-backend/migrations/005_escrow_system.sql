-- ============================================
-- ESCROW SYSTEM MIGRATION
-- ============================================
-- Purpose: Enable company to hold funds in escrow for retailer B2B orders
-- Flow: Retailer orders → Company pays wholesaler → Retailer owes company
-- Features: Auto-release, repayment tracking, auto-deduct from sales

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
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  CONSTRAINT fk_retailer FOREIGN KEY (retailer_id) REFERENCES bigcompany.retailers(id) ON DELETE CASCADE,
  CONSTRAINT fk_wholesaler FOREIGN KEY (wholesaler_id) REFERENCES bigcompany.wholesalers(id) ON DELETE CASCADE
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
  payment_details JSONB, -- Store payment provider response, etc.
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,

  -- Indexes
  CONSTRAINT fk_retailer_repayment FOREIGN KEY (retailer_id) REFERENCES bigcompany.retailers(id) ON DELETE CASCADE
);

CREATE INDEX idx_repayment_escrow ON bigcompany.escrow_repayments(escrow_transaction_id);
CREATE INDEX idx_repayment_retailer ON bigcompany.escrow_repayments(retailer_id);
CREATE INDEX idx_repayment_status ON bigcompany.escrow_repayments(status);
CREATE INDEX idx_repayment_created ON bigcompany.escrow_repayments(created_at);

-- ============================================
-- 3. RETAILER ESCROW SUMMARY VIEW
-- ============================================
-- Provides quick overview of retailer's escrow obligations
CREATE OR REPLACE VIEW bigcompany.retailer_escrow_summary AS
SELECT
  r.id AS retailer_id,
  r.business_name,

  -- Escrow Statistics
  COUNT(DISTINCT et.id) FILTER (WHERE et.status = 'held') AS active_escrow_count,
  COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status = 'held'), 0) AS total_held_amount,
  COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status = 'released'), 0) AS total_released_amount,

  -- Repayment Statistics
  COALESCE(SUM(rep.repayment_amount) FILTER (WHERE rep.status = 'completed'), 0) AS total_repaid,

  -- Calculated Obligations
  COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status IN ('held', 'released')), 0) -
  COALESCE(SUM(rep.repayment_amount) FILTER (WHERE rep.status = 'completed'), 0) AS outstanding_balance,

  -- Recent Activity
  MAX(et.created_at) AS last_escrow_date,
  MAX(rep.created_at) AS last_repayment_date

FROM bigcompany.retailers r
LEFT JOIN bigcompany.escrow_transactions et ON r.id = et.retailer_id
LEFT JOIN bigcompany.escrow_repayments rep ON r.id = rep.retailer_id
GROUP BY r.id, r.business_name;

-- ============================================
-- 4. ESCROW SETTINGS TABLE
-- ============================================
-- Configurable settings for escrow system
CREATE TABLE IF NOT EXISTS bigcompany.escrow_settings (
  id SERIAL PRIMARY KEY,

  -- Auto-Release Configuration
  auto_release_days INTEGER DEFAULT 7 CHECK (auto_release_days > 0),
  require_confirmation BOOLEAN DEFAULT TRUE,

  -- Repayment Configuration
  auto_deduct_enabled BOOLEAN DEFAULT TRUE,
  auto_deduct_percentage DECIMAL(5, 2) DEFAULT 30.00 CHECK (auto_deduct_percentage BETWEEN 0 AND 100), -- Deduct 30% of daily sales
  min_repayment_amount DECIMAL(10, 2) DEFAULT 1000, -- Minimum amount to trigger auto-deduct

  -- Escrow Pool Ledger (Blnk)
  blnk_escrow_pool_id VARCHAR(255), -- Company's escrow pool ledger balance ID
  blnk_escrow_account VARCHAR(255), -- Company escrow account identifier

  -- Notification Settings
  notify_wholesaler_on_hold BOOLEAN DEFAULT TRUE,
  notify_retailer_on_release BOOLEAN DEFAULT TRUE,
  notify_admin_on_dispute BOOLEAN DEFAULT TRUE,

  -- Audit
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255)
);

-- Insert default settings
INSERT INTO bigcompany.escrow_settings (id, auto_release_days, require_confirmation, auto_deduct_enabled, auto_deduct_percentage)
VALUES (1, 7, TRUE, TRUE, 30.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. AUTO-DEDUCT TRACKING TABLE
-- ============================================
-- Tracks daily auto-deductions from retailer sales
CREATE TABLE IF NOT EXISTS bigcompany.escrow_auto_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Retailer & Date
  retailer_id VARCHAR(255) NOT NULL,
  deduction_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Sales & Deduction Calculation
  daily_sales_total DECIMAL(10, 2) NOT NULL,
  deduction_percentage DECIMAL(5, 2) NOT NULL,
  deduction_amount DECIMAL(10, 2) NOT NULL CHECK (deduction_amount >= 0),

  -- Applied To Escrow
  escrow_transaction_id UUID REFERENCES bigcompany.escrow_transactions(id) ON DELETE SET NULL,

  -- Processing Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processed',
    'failed',
    'skipped'    -- Skipped if below minimum threshold
  )),

  -- Transaction Reference
  blnk_transaction_ref VARCHAR(255),

  -- Metadata
  failure_reason TEXT,
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,

  -- Constraints
  CONSTRAINT fk_retailer_deduction FOREIGN KEY (retailer_id) REFERENCES bigcompany.retailers(id) ON DELETE CASCADE,
  CONSTRAINT unique_retailer_date UNIQUE (retailer_id, deduction_date)
);

CREATE INDEX idx_deduction_retailer ON bigcompany.escrow_auto_deductions(retailer_id);
CREATE INDEX idx_deduction_date ON bigcompany.escrow_auto_deductions(deduction_date);
CREATE INDEX idx_deduction_status ON bigcompany.escrow_auto_deductions(status);

-- ============================================
-- 6. TRIGGER: UPDATE TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION update_escrow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_transaction_update
  BEFORE UPDATE ON bigcompany.escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_escrow_timestamp();

-- ============================================
-- 7. HELPER FUNCTION: GET RETAILER BALANCE
-- ============================================
-- Calculate retailer's total outstanding escrow obligation
CREATE OR REPLACE FUNCTION bigcompany.get_retailer_escrow_balance(
  p_retailer_id VARCHAR(255)
)
RETURNS TABLE (
  total_held DECIMAL(10, 2),
  total_released DECIMAL(10, 2),
  total_repaid DECIMAL(10, 2),
  outstanding DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status = 'held'), 0)::DECIMAL(10, 2) AS total_held,
    COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status = 'released'), 0)::DECIMAL(10, 2) AS total_released,
    COALESCE(SUM(rep.repayment_amount) FILTER (WHERE rep.status = 'completed'), 0)::DECIMAL(10, 2) AS total_repaid,
    (
      COALESCE(SUM(et.escrow_amount) FILTER (WHERE et.status IN ('held', 'released')), 0) -
      COALESCE(SUM(rep.repayment_amount) FILTER (WHERE rep.status = 'completed'), 0)
    )::DECIMAL(10, 2) AS outstanding
  FROM bigcompany.escrow_transactions et
  LEFT JOIN bigcompany.escrow_repayments rep ON et.retailer_id = rep.retailer_id
  WHERE et.retailer_id = p_retailer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE bigcompany.escrow_transactions IS 'Tracks company escrow holdings for retailer B2B orders';
COMMENT ON TABLE bigcompany.escrow_repayments IS 'Records retailer repayments to company for escrow advances';
COMMENT ON TABLE bigcompany.escrow_settings IS 'Global configuration for escrow system behavior';
COMMENT ON TABLE bigcompany.escrow_auto_deductions IS 'Tracks daily automatic deductions from retailer sales';
COMMENT ON VIEW bigcompany.retailer_escrow_summary IS 'Quick overview of each retailer escrow obligations';

COMMENT ON COLUMN bigcompany.escrow_transactions.auto_release_at IS 'Timestamp when funds auto-release to wholesaler if not confirmed';
COMMENT ON COLUMN bigcompany.escrow_transactions.blnk_escrow_balance_id IS 'Reference to Blnk ledger escrow pool balance';
COMMENT ON COLUMN bigcompany.escrow_settings.auto_deduct_percentage IS 'Percentage of daily sales to auto-deduct for repayment (default 30%)';
COMMENT ON COLUMN bigcompany.escrow_auto_deductions.deduction_amount IS 'Calculated amount deducted based on sales * percentage';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Execute this migration with: psql -U <user> -d bigcompany -f migrations/005_escrow_system.sql
