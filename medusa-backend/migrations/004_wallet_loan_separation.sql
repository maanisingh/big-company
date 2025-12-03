-- Migration: Wallet and Loan Balance Separation
-- Purpose: Separate wallet_balance from loan_balance to prevent loan funds from being used for transfers/withdrawals
-- Created: 2025-12-02
-- Sprint: 4

-- ==================== WALLET BALANCES TABLE ====================

-- Create new table to track separate balances
CREATE TABLE IF NOT EXISTS bigcompany.wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('consumer', 'retailer', 'wholesaler')),

  -- Separate balance tracking
  wallet_balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL CHECK (wallet_balance >= 0),
  loan_balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL CHECK (loan_balance >= 0),

  -- Calculated fields
  total_balance DECIMAL(15, 2) GENERATED ALWAYS AS (wallet_balance + loan_balance) STORED,
  available_for_transfer DECIMAL(15, 2) GENERATED ALWAYS AS (wallet_balance) STORED,

  -- Limits
  loan_limit DECIMAL(15, 2) DEFAULT 0.00,
  daily_transfer_limit DECIMAL(15, 2) DEFAULT 100000.00,

  -- Tracking
  last_loan_disbursement TIMESTAMP,
  last_transfer TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  currency VARCHAR(3) DEFAULT 'RWF',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- Blnk integration (Sprint 4)
  blnk_wallet_balance_id VARCHAR(100),
  blnk_loan_balance_id VARCHAR(100)
);

-- Indexes for performance
CREATE INDEX idx_wallet_balances_user ON bigcompany.wallet_balances(user_id);
CREATE INDEX idx_wallet_balances_user_type ON bigcompany.wallet_balances(user_type);
CREATE INDEX idx_wallet_balances_active ON bigcompany.wallet_balances(is_active);
CREATE INDEX idx_wallet_balances_blnk_wallet ON bigcompany.wallet_balances(blnk_wallet_balance_id);
CREATE INDEX idx_wallet_balances_blnk_loan ON bigcompany.wallet_balances(blnk_loan_balance_id);

-- ==================== BALANCE TRANSACTIONS TABLE ====================

-- Track all balance changes with source tracking
CREATE TABLE IF NOT EXISTS bigcompany.balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Transaction details
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
    'top_up', 'loan_disbursement', 'purchase', 'transfer_out', 'transfer_in',
    'refund', 'loan_repayment', 'gas_reward', 'commission', 'penalty', 'adjustment'
  )),

  -- Balance affected
  balance_type VARCHAR(10) NOT NULL CHECK (balance_type IN ('wallet', 'loan')),

  -- Amount and direction
  amount DECIMAL(15, 2) NOT NULL,
  direction VARCHAR(6) NOT NULL CHECK (direction IN ('credit', 'debit')),

  -- Balance snapshots
  wallet_balance_before DECIMAL(15, 2) NOT NULL,
  wallet_balance_after DECIMAL(15, 2) NOT NULL,
  loan_balance_before DECIMAL(15, 2) NOT NULL,
  loan_balance_after DECIMAL(15, 2) NOT NULL,

  -- Reference
  reference_id UUID,
  reference_type VARCHAR(30),
  description TEXT,

  -- Metadata
  blnk_transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,

  CONSTRAINT fk_balance_tx_user FOREIGN KEY (user_id) REFERENCES bigcompany.wallet_balances(user_id)
);

-- Indexes
CREATE INDEX idx_balance_tx_user ON bigcompany.balance_transactions(user_id);
CREATE INDEX idx_balance_tx_type ON bigcompany.balance_transactions(transaction_type);
CREATE INDEX idx_balance_tx_balance_type ON bigcompany.balance_transactions(balance_type);
CREATE INDEX idx_balance_tx_reference ON bigcompany.balance_transactions(reference_id, reference_type);
CREATE INDEX idx_balance_tx_created ON bigcompany.balance_transactions(created_at DESC);
CREATE INDEX idx_balance_tx_blnk ON bigcompany.balance_transactions(blnk_transaction_id);

-- ==================== TRANSFER RESTRICTIONS TABLE ====================

-- Track attempts to transfer loan funds (for audit)
CREATE TABLE IF NOT EXISTS bigcompany.restricted_transfer_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  attempted_amount DECIMAL(15, 2) NOT NULL,
  wallet_balance DECIMAL(15, 2) NOT NULL,
  loan_balance DECIMAL(15, 2) NOT NULL,
  reason VARCHAR(100) DEFAULT 'Insufficient wallet balance (loan balance cannot be transferred)',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_restricted_user FOREIGN KEY (user_id) REFERENCES bigcompany.wallet_balances(user_id)
);

-- Index
CREATE INDEX idx_restricted_attempts_user ON bigcompany.restricted_transfer_attempts(user_id);
CREATE INDEX idx_restricted_attempts_created ON bigcompany.restricted_transfer_attempts(created_at DESC);

-- ==================== FUNCTIONS ====================

-- Function to get user balance details
CREATE OR REPLACE FUNCTION bigcompany.get_balance_details(p_user_id UUID)
RETURNS TABLE (
  wallet_balance DECIMAL(15, 2),
  loan_balance DECIMAL(15, 2),
  total_balance DECIMAL(15, 2),
  available_for_transfer DECIMAL(15, 2),
  available_for_purchase DECIMAL(15, 2),
  loan_limit DECIMAL(15, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wb.wallet_balance,
    wb.loan_balance,
    wb.total_balance,
    wb.available_for_transfer,
    wb.total_balance as available_for_purchase, -- Can use both for purchases
    wb.loan_limit
  FROM bigcompany.wallet_balances wb
  WHERE wb.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate transfer amount
CREATE OR REPLACE FUNCTION bigcompany.can_transfer(p_user_id UUID, p_amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
  v_wallet_balance DECIMAL(15, 2);
BEGIN
  SELECT wallet_balance INTO v_wallet_balance
  FROM bigcompany.wallet_balances
  WHERE user_id = p_user_id;

  -- Can only transfer from wallet balance, not loan balance
  RETURN v_wallet_balance >= p_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to validate purchase amount
CREATE OR REPLACE FUNCTION bigcompany.can_purchase(p_user_id UUID, p_amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_balance DECIMAL(15, 2);
BEGIN
  SELECT total_balance INTO v_total_balance
  FROM bigcompany.wallet_balances
  WHERE user_id = p_user_id;

  -- Can use both wallet and loan balance for purchases
  RETURN v_total_balance >= p_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to record balance transaction
CREATE OR REPLACE FUNCTION bigcompany.record_balance_transaction(
  p_user_id UUID,
  p_transaction_type VARCHAR,
  p_balance_type VARCHAR,
  p_amount DECIMAL,
  p_direction VARCHAR,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_blnk_transaction_id VARCHAR DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_wallet_before DECIMAL(15, 2);
  v_wallet_after DECIMAL(15, 2);
  v_loan_before DECIMAL(15, 2);
  v_loan_after DECIMAL(15, 2);
BEGIN
  -- Get current balances
  SELECT wallet_balance, loan_balance INTO v_wallet_before, v_loan_before
  FROM bigcompany.wallet_balances
  WHERE user_id = p_user_id;

  -- Calculate new balances
  IF p_balance_type = 'wallet' THEN
    IF p_direction = 'credit' THEN
      v_wallet_after := v_wallet_before + p_amount;
    ELSE
      v_wallet_after := v_wallet_before - p_amount;
    END IF;
    v_loan_after := v_loan_before;
  ELSE -- loan
    IF p_direction = 'credit' THEN
      v_loan_after := v_loan_before + p_amount;
    ELSE
      v_loan_after := v_loan_before - p_amount;
    END IF;
    v_wallet_after := v_wallet_before;
  END IF;

  -- Update wallet_balances
  UPDATE bigcompany.wallet_balances
  SET
    wallet_balance = v_wallet_after,
    loan_balance = v_loan_after,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert transaction record
  INSERT INTO bigcompany.balance_transactions (
    user_id, transaction_type, balance_type, amount, direction,
    wallet_balance_before, wallet_balance_after,
    loan_balance_before, loan_balance_after,
    reference_id, reference_type, description,
    blnk_transaction_id, created_by
  ) VALUES (
    p_user_id, p_transaction_type, p_balance_type, p_amount, p_direction,
    v_wallet_before, v_wallet_after,
    v_loan_before, v_loan_after,
    p_reference_id, p_reference_type, p_description,
    p_blnk_transaction_id, p_created_by
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log restricted transfer attempt
CREATE OR REPLACE FUNCTION bigcompany.log_restricted_transfer(
  p_user_id UUID,
  p_attempted_amount DECIMAL,
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_wallet_balance DECIMAL(15, 2);
  v_loan_balance DECIMAL(15, 2);
BEGIN
  -- Get current balances
  SELECT wallet_balance, loan_balance INTO v_wallet_balance, v_loan_balance
  FROM bigcompany.wallet_balances
  WHERE user_id = p_user_id;

  -- Insert log
  INSERT INTO bigcompany.restricted_transfer_attempts (
    user_id, attempted_amount, wallet_balance, loan_balance,
    ip_address, user_agent
  ) VALUES (
    p_user_id, p_attempted_amount, v_wallet_balance, v_loan_balance,
    p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION bigcompany.update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wallet_timestamp ON bigcompany.wallet_balances;
CREATE TRIGGER trigger_update_wallet_timestamp
  BEFORE UPDATE ON bigcompany.wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION bigcompany.update_wallet_timestamp();

-- ==================== DATA MIGRATION ====================

-- Migrate existing wallet data (if any) from old structure
-- This assumes there's an existing wallets or consumers table with balance field
-- Adjust table/column names as needed based on your current schema

-- For consumers (if balance exists in consumers table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bigcompany'
    AND table_name = 'consumers'
    AND column_name = 'wallet_balance'
  ) THEN
    INSERT INTO bigcompany.wallet_balances (user_id, user_type, wallet_balance, loan_balance)
    SELECT
      id as user_id,
      'consumer' as user_type,
      COALESCE(wallet_balance, 0) as wallet_balance,
      0 as loan_balance
    FROM bigcompany.consumers
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- For retailers (if balance exists in retailers table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bigcompany'
    AND table_name = 'retailers'
    AND column_name = 'wallet_balance'
  ) THEN
    INSERT INTO bigcompany.wallet_balances (user_id, user_type, wallet_balance, loan_balance)
    SELECT
      id as user_id,
      'retailer' as user_type,
      COALESCE(wallet_balance, 0) as wallet_balance,
      0 as loan_balance
    FROM bigcompany.retailers
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- For wholesalers (if balance exists in wholesalers table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bigcompany'
    AND table_name = 'wholesalers'
    AND column_name = 'wallet_balance'
  ) THEN
    INSERT INTO bigcompany.wallet_balances (user_id, user_type, wallet_balance, loan_balance)
    SELECT
      id as user_id,
      'wholesaler' as user_type,
      COALESCE(wallet_balance, 0) as wallet_balance,
      0 as loan_balance
    FROM bigcompany.wholesalers
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- ==================== VIEWS ====================

-- View for easy balance querying
CREATE OR REPLACE VIEW bigcompany.v_wallet_summary AS
SELECT
  wb.user_id,
  wb.user_type,
  wb.wallet_balance,
  wb.loan_balance,
  wb.total_balance,
  wb.available_for_transfer,
  wb.loan_limit,
  wb.currency,
  wb.is_active,
  wb.last_loan_disbursement,
  wb.last_transfer,
  wb.created_at,
  wb.updated_at,
  COUNT(DISTINCT bt.id) as transaction_count,
  MAX(bt.created_at) as last_transaction_at
FROM bigcompany.wallet_balances wb
LEFT JOIN bigcompany.balance_transactions bt ON wb.user_id = bt.user_id
GROUP BY
  wb.user_id, wb.user_type, wb.wallet_balance, wb.loan_balance,
  wb.total_balance, wb.available_for_transfer, wb.loan_limit,
  wb.currency, wb.is_active, wb.last_loan_disbursement,
  wb.last_transfer, wb.created_at, wb.updated_at;

-- ==================== COMMENTS ====================

COMMENT ON TABLE bigcompany.wallet_balances IS 'Separate tracking of wallet and loan balances with transfer restrictions';
COMMENT ON COLUMN bigcompany.wallet_balances.wallet_balance IS 'Regular wallet balance - can be used for transfers, withdrawals, and purchases';
COMMENT ON COLUMN bigcompany.wallet_balances.loan_balance IS 'Loan/credit balance - can ONLY be used for purchases, NOT transfers or withdrawals';
COMMENT ON COLUMN bigcompany.wallet_balances.total_balance IS 'Computed: wallet_balance + loan_balance';
COMMENT ON COLUMN bigcompany.wallet_balances.available_for_transfer IS 'Computed: only wallet_balance (loan cannot be transferred)';

COMMENT ON TABLE bigcompany.balance_transactions IS 'Audit trail of all balance changes with before/after snapshots';
COMMENT ON COLUMN bigcompany.balance_transactions.balance_type IS 'Which balance was affected: wallet or loan';
COMMENT ON COLUMN bigcompany.balance_transactions.direction IS 'Credit (increase) or Debit (decrease)';

COMMENT ON TABLE bigcompany.restricted_transfer_attempts IS 'Log of attempts to transfer loan balance (for security audit)';

COMMENT ON FUNCTION bigcompany.get_balance_details(UUID) IS 'Get comprehensive balance information for a user';
COMMENT ON FUNCTION bigcompany.can_transfer(UUID, DECIMAL) IS 'Check if user has sufficient wallet balance (not loan) for transfer';
COMMENT ON FUNCTION bigcompany.can_purchase(UUID, DECIMAL) IS 'Check if user has sufficient total balance (wallet + loan) for purchase';
COMMENT ON FUNCTION bigcompany.record_balance_transaction IS 'Record a balance transaction with full audit trail';
COMMENT ON FUNCTION bigcompany.log_restricted_transfer IS 'Log an attempt to transfer loan funds (for security monitoring)';

-- ==================== GRANTS ====================

-- Grant necessary permissions to application user
GRANT SELECT, INSERT, UPDATE ON bigcompany.wallet_balances TO bigcompany_app;
GRANT SELECT, INSERT ON bigcompany.balance_transactions TO bigcompany_app;
GRANT SELECT, INSERT ON bigcompany.restricted_transfer_attempts TO bigcompany_app;
GRANT SELECT ON bigcompany.v_wallet_summary TO bigcompany_app;

GRANT EXECUTE ON FUNCTION bigcompany.get_balance_details(UUID) TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.can_transfer(UUID, DECIMAL) TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.can_purchase(UUID, DECIMAL) TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.record_balance_transaction TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.log_restricted_transfer TO bigcompany_app;

-- ==================== SAMPLE DATA (for testing) ====================

-- Create test wallet balances
INSERT INTO bigcompany.wallet_balances (user_id, user_type, wallet_balance, loan_balance, loan_limit) VALUES
  (gen_random_uuid(), 'consumer', 50000.00, 10000.00, 30000.00),
  (gen_random_uuid(), 'consumer', 25000.00, 0.00, 10000.00),
  (gen_random_uuid(), 'retailer', 150000.00, 50000.00, 200000.00),
  (gen_random_uuid(), 'wholesaler', 500000.00, 0.00, 1000000.00)
ON CONFLICT (user_id) DO NOTHING;
