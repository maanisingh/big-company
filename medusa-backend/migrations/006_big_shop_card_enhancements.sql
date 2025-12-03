-- Migration: BIG Shop Card Payment Enhancements
-- Purpose: Add NFC transactions table and enhance card payment functionality
-- Created: 2025-12-03

-- ==================== NFC TRANSACTIONS TABLE ====================

CREATE TABLE IF NOT EXISTS bigcompany.nfc_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_uid VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(30) CHECK (transaction_type IN ('payment', 'refund', 'top_up', 'link', 'unlink')),
  amount DECIMAL(15, 2),
  balance_type VARCHAR(10) CHECK (balance_type IN ('wallet', 'loan')),
  order_id VARCHAR(255),
  retailer_id UUID,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_nfc_card FOREIGN KEY (card_uid) REFERENCES bigcompany.nfc_cards(card_uid)
);

-- Indexes for performance
CREATE INDEX idx_nfc_tx_card ON bigcompany.nfc_transactions(card_uid);
CREATE INDEX idx_nfc_tx_user ON bigcompany.nfc_transactions(user_id);
CREATE INDEX idx_nfc_tx_type ON bigcompany.nfc_transactions(transaction_type);
CREATE INDEX idx_nfc_tx_order ON bigcompany.nfc_transactions(order_id);
CREATE INDEX idx_nfc_tx_retailer ON bigcompany.nfc_transactions(retailer_id);
CREATE INDEX idx_nfc_tx_created ON bigcompany.nfc_transactions(created_at DESC);
CREATE INDEX idx_nfc_tx_status ON bigcompany.nfc_transactions(status);

-- ==================== ENHANCE NFC CARDS TABLE ====================

-- Add updated_at if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bigcompany'
    AND table_name = 'nfc_cards'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE bigcompany.nfc_cards
    ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Ensure PIN hash column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bigcompany'
    AND table_name = 'nfc_cards'
    AND column_name = 'pin_hash'
  ) THEN
    ALTER TABLE bigcompany.nfc_cards
    ADD COLUMN pin_hash VARCHAR(255);
  END IF;
END $$;

-- ==================== FUNCTIONS ====================

-- Function to get card payment history
CREATE OR REPLACE FUNCTION bigcompany.get_card_payment_history(p_card_uid VARCHAR)
RETURNS TABLE (
  transaction_id UUID,
  transaction_type VARCHAR,
  amount DECIMAL,
  balance_type VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id as transaction_id,
    nfc_transactions.transaction_type,
    nfc_transactions.amount,
    nfc_transactions.balance_type,
    nfc_transactions.status,
    nfc_transactions.created_at
  FROM bigcompany.nfc_transactions
  WHERE card_uid = p_card_uid
  ORDER BY created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's card transaction summary
CREATE OR REPLACE FUNCTION bigcompany.get_user_card_summary(p_user_id VARCHAR)
RETURNS TABLE (
  total_spent DECIMAL,
  wallet_spent DECIMAL,
  credit_spent DECIMAL,
  transaction_count BIGINT,
  last_transaction TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN transaction_type = 'payment' THEN amount END), 0) as total_spent,
    COALESCE(SUM(CASE WHEN transaction_type = 'payment' AND balance_type = 'wallet' THEN amount END), 0) as wallet_spent,
    COALESCE(SUM(CASE WHEN transaction_type = 'payment' AND balance_type = 'loan' THEN amount END), 0) as credit_spent,
    COUNT(*) as transaction_count,
    MAX(created_at) as last_transaction
  FROM bigcompany.nfc_transactions
  WHERE user_id = p_user_id AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update nfc_cards.updated_at
CREATE OR REPLACE FUNCTION bigcompany.update_nfc_card_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_nfc_card_timestamp ON bigcompany.nfc_cards;
CREATE TRIGGER trigger_update_nfc_card_timestamp
  BEFORE UPDATE ON bigcompany.nfc_cards
  FOR EACH ROW
  EXECUTE FUNCTION bigcompany.update_nfc_card_timestamp();

-- ==================== VIEWS ====================

-- View for card usage analytics
CREATE OR REPLACE VIEW bigcompany.v_card_usage_analytics AS
SELECT
  nc.card_uid,
  nc.dashboard_id,
  nc.user_id,
  nc.is_active,
  nc.linked_at,
  nc.last_used_at,
  COUNT(nt.id) as total_transactions,
  COALESCE(SUM(CASE WHEN nt.transaction_type = 'payment' THEN nt.amount END), 0) as total_spent,
  COALESCE(SUM(CASE WHEN nt.transaction_type = 'payment' AND nt.balance_type = 'wallet' THEN nt.amount END), 0) as wallet_spent,
  COALESCE(SUM(CASE WHEN nt.transaction_type = 'payment' AND nt.balance_type = 'loan' THEN nt.amount END), 0) as credit_spent,
  MAX(nt.created_at) as last_transaction_at
FROM bigcompany.nfc_cards nc
LEFT JOIN bigcompany.nfc_transactions nt ON nc.card_uid = nt.card_uid
GROUP BY nc.card_uid, nc.dashboard_id, nc.user_id, nc.is_active, nc.linked_at, nc.last_used_at;

-- View for used cards only (for retailer portal)
CREATE OR REPLACE VIEW bigcompany.v_used_cards AS
SELECT
  nc.*,
  COUNT(nt.id) as transaction_count,
  MAX(nt.created_at) as last_transaction_at
FROM bigcompany.nfc_cards nc
INNER JOIN bigcompany.nfc_transactions nt ON nc.card_uid = nt.card_uid
WHERE nc.last_used_at IS NOT NULL
GROUP BY nc.card_uid, nc.id;

-- ==================== COMMENTS ====================

COMMENT ON TABLE bigcompany.nfc_transactions IS 'Transaction history for all BIG Shop Card payments and activities';
COMMENT ON COLUMN bigcompany.nfc_transactions.transaction_type IS 'Type of transaction: payment, refund, top_up, link, unlink';
COMMENT ON COLUMN bigcompany.nfc_transactions.balance_type IS 'Which balance was used: wallet or loan (credit)';
COMMENT ON COLUMN bigcompany.nfc_transactions.status IS 'Transaction status: pending, completed, failed, refunded';

COMMENT ON FUNCTION bigcompany.get_card_payment_history(VARCHAR) IS 'Get payment history for a specific card';
COMMENT ON FUNCTION bigcompany.get_user_card_summary(VARCHAR) IS 'Get transaction summary for all user cards';

COMMENT ON VIEW bigcompany.v_card_usage_analytics IS 'Analytics view for card usage statistics';
COMMENT ON VIEW bigcompany.v_used_cards IS 'View showing only cards that have been used (for retailer portal)';

-- ==================== GRANTS ====================

GRANT SELECT, INSERT, UPDATE ON bigcompany.nfc_transactions TO bigcompany_app;
GRANT SELECT ON bigcompany.v_card_usage_analytics TO bigcompany_app;
GRANT SELECT ON bigcompany.v_used_cards TO bigcompany_app;

GRANT EXECUTE ON FUNCTION bigcompany.get_card_payment_history(VARCHAR) TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.get_user_card_summary(VARCHAR) TO bigcompany_app;

-- ==================== SAMPLE DATA (for testing) ====================

-- This will be populated automatically as transactions occur
-- No sample data needed
