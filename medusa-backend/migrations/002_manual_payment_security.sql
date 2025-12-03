-- Migration: Manual Card Payment Security
-- Purpose: Support 3 payment verification methods (PIN, one-time code, SMS OTP)
-- Created: 2025-12-02

-- ==================== PAYMENT VERIFICATION CODES ====================

-- One-time payment codes (8-digit, 10-minute expiry)
CREATE TABLE IF NOT EXISTS bigcompany.payment_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id VARCHAR(50) NOT NULL,
  code VARCHAR(8) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  retailer_id UUID NOT NULL,
  branch_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  is_used BOOLEAN DEFAULT false,
  customer_phone VARCHAR(20),
  CONSTRAINT fk_retailer FOREIGN KEY (retailer_id) REFERENCES bigcompany.retailer_profiles(id) ON DELETE CASCADE
);

-- Index for quick lookup and cleanup
CREATE INDEX idx_payment_codes_card ON bigcompany.payment_codes(card_id);
CREATE INDEX idx_payment_codes_expires ON bigcompany.payment_codes(expires_at);
CREATE INDEX idx_payment_codes_retailer ON bigcompany.payment_codes(retailer_id);

-- ==================== EXTEND OTP SYSTEM FOR PAYMENTS ====================

-- Extend existing otp_codes table to support payment purpose
-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS bigcompany.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  purpose VARCHAR(50) DEFAULT 'login',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  is_verified BOOLEAN DEFAULT false,
  metadata JSONB
);

-- Add purpose index if not exists
CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON bigcompany.otp_codes(purpose);

-- ==================== PAYMENT VERIFICATION ATTEMPTS ====================

-- Track verification attempts for rate limiting and security
CREATE TABLE IF NOT EXISTS bigcompany.payment_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id VARCHAR(50) NOT NULL,
  retailer_id UUID NOT NULL,
  verification_method VARCHAR(20) NOT NULL, -- 'pin', 'code', 'otp'
  success BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_retailer_attempts FOREIGN KEY (retailer_id) REFERENCES bigcompany.retailer_profiles(id) ON DELETE CASCADE
);

-- Indexes for rate limiting queries
CREATE INDEX idx_attempts_card_time ON bigcompany.payment_verification_attempts(card_id, created_at);
CREATE INDEX idx_attempts_retailer_time ON bigcompany.payment_verification_attempts(retailer_id, created_at);

-- ==================== CARD LOCKOUT TRACKING ====================

-- Track locked cards due to too many failed attempts
CREATE TABLE IF NOT EXISTS bigcompany.card_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id VARCHAR(50) NOT NULL UNIQUE,
  locked_at TIMESTAMP DEFAULT NOW(),
  unlock_at TIMESTAMP NOT NULL,
  reason TEXT,
  locked_by_retailer_id UUID,
  CONSTRAINT fk_locked_by_retailer FOREIGN KEY (locked_by_retailer_id) REFERENCES bigcompany.retailer_profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_card_lockouts_card ON bigcompany.card_lockouts(card_id);
CREATE INDEX idx_card_lockouts_unlock ON bigcompany.card_lockouts(unlock_at);

-- ==================== PAYMENT AUDIT LOGS ====================

-- Comprehensive audit trail for all manual payment attempts
CREATE TABLE IF NOT EXISTS bigcompany.manual_payment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id VARCHAR(50) NOT NULL,
  retailer_id UUID NOT NULL,
  branch_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  verification_method VARCHAR(20) NOT NULL,
  verification_code VARCHAR(10), -- masked (e.g., '****5678')
  success BOOLEAN NOT NULL,
  error_message TEXT,
  transaction_id UUID, -- links to successful transaction
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_retailer_audit FOREIGN KEY (retailer_id) REFERENCES bigcompany.retailer_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_manual_payment_audit_card ON bigcompany.manual_payment_audit(card_id);
CREATE INDEX idx_manual_payment_audit_retailer ON bigcompany.manual_payment_audit(retailer_id);
CREATE INDEX idx_manual_payment_audit_time ON bigcompany.manual_payment_audit(created_at);
CREATE INDEX idx_manual_payment_audit_transaction ON bigcompany.manual_payment_audit(transaction_id);

-- ==================== CLEANUP FUNCTIONS ====================

-- Function to clean up expired payment codes (run via cron job)
CREATE OR REPLACE FUNCTION bigcompany.cleanup_expired_payment_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM bigcompany.payment_codes
  WHERE expires_at < NOW() AND is_used = false;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION bigcompany.cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM bigcompany.otp_codes
  WHERE expires_at < NOW() AND is_verified = false;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically unlock cards after lockout period
CREATE OR REPLACE FUNCTION bigcompany.unlock_expired_lockouts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM bigcompany.card_lockouts
  WHERE unlock_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==================== SECURITY FUNCTIONS ====================

-- Check if card is currently locked
CREATE OR REPLACE FUNCTION bigcompany.is_card_locked(p_card_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bigcompany.card_lockouts
    WHERE card_id = p_card_id AND unlock_at > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Count failed attempts in last N minutes
CREATE OR REPLACE FUNCTION bigcompany.count_failed_attempts(
  p_card_id VARCHAR,
  p_minutes INTEGER DEFAULT 15
)
RETURNS INTEGER AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM bigcompany.payment_verification_attempts
  WHERE card_id = p_card_id
    AND success = false
    AND created_at > NOW() - (p_minutes || ' minutes')::INTERVAL;

  RETURN attempt_count;
END;
$$ LANGUAGE plpgsql;

-- Lock card for specified duration
CREATE OR REPLACE FUNCTION bigcompany.lock_card(
  p_card_id VARCHAR,
  p_duration_minutes INTEGER DEFAULT 30,
  p_reason TEXT DEFAULT 'Too many failed attempts',
  p_retailer_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO bigcompany.card_lockouts (card_id, unlock_at, reason, locked_by_retailer_id)
  VALUES (
    p_card_id,
    NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
    p_reason,
    p_retailer_id
  )
  ON CONFLICT (card_id) DO UPDATE
  SET unlock_at = NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
      locked_at = NOW(),
      reason = p_reason;
END;
$$ LANGUAGE plpgsql;

-- ==================== COMMENTS ====================

COMMENT ON TABLE bigcompany.payment_codes IS 'One-time 8-digit codes for manual card payments (10-minute expiry)';
COMMENT ON TABLE bigcompany.payment_verification_attempts IS 'Track all verification attempts for rate limiting and fraud detection';
COMMENT ON TABLE bigcompany.card_lockouts IS 'Cards locked due to security issues (too many failed attempts)';
COMMENT ON TABLE bigcompany.manual_payment_audit IS 'Comprehensive audit trail for all manual payment transactions';

COMMENT ON FUNCTION bigcompany.cleanup_expired_payment_codes() IS 'Remove expired unused payment codes (scheduled job)';
COMMENT ON FUNCTION bigcompany.cleanup_expired_otps() IS 'Remove expired unverified OTPs (scheduled job)';
COMMENT ON FUNCTION bigcompany.unlock_expired_lockouts() IS 'Automatically unlock cards after lockout period expires';
COMMENT ON FUNCTION bigcompany.is_card_locked(VARCHAR) IS 'Check if card is currently locked';
COMMENT ON FUNCTION bigcompany.count_failed_attempts(VARCHAR, INTEGER) IS 'Count failed verification attempts in time window';
COMMENT ON FUNCTION bigcompany.lock_card(VARCHAR, INTEGER, TEXT, UUID) IS 'Lock card for specified duration';

-- ==================== GRANTS ====================

-- Grant necessary permissions to application user
GRANT SELECT, INSERT, UPDATE ON bigcompany.payment_codes TO bigcompany_app;
GRANT SELECT, INSERT, UPDATE ON bigcompany.otp_codes TO bigcompany_app;
GRANT SELECT, INSERT ON bigcompany.payment_verification_attempts TO bigcompany_app;
GRANT SELECT, INSERT, DELETE ON bigcompany.card_lockouts TO bigcompany_app;
GRANT SELECT, INSERT ON bigcompany.manual_payment_audit TO bigcompany_app;

GRANT EXECUTE ON FUNCTION bigcompany.cleanup_expired_payment_codes() TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.cleanup_expired_otps() TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.unlock_expired_lockouts() TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.is_card_locked(VARCHAR) TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.count_failed_attempts(VARCHAR, INTEGER) TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.lock_card(VARCHAR, INTEGER, TEXT, UUID) TO bigcompany_app;
