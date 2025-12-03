-- Migration: Categories Management
-- Purpose: Product categories for inventory organization
-- Created: 2025-12-02

-- ==================== PRODUCT CATEGORIES TABLE ====================

CREATE TABLE IF NOT EXISTS bigcompany.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID, -- retailer or wholesaler who created it
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX idx_categories_code ON bigcompany.product_categories(code);
CREATE INDEX idx_categories_name ON bigcompany.product_categories(name);
CREATE INDEX idx_categories_created_by ON bigcompany.product_categories(created_by);
CREATE INDEX idx_categories_active ON bigcompany.product_categories(is_active);

-- ==================== UPDATE PRODUCTS TABLE ====================

-- Add category_id to existing products table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bigcompany'
    AND table_name = 'products'
    AND column_name = 'category_id'
  ) THEN
    ALTER TABLE bigcompany.products
    ADD COLUMN category_id UUID REFERENCES bigcompany.product_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index on category_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON bigcompany.products(category_id);

-- ==================== FUNCTIONS ====================

-- Function to check if category has products before deletion
CREATE OR REPLACE FUNCTION bigcompany.category_has_products(p_category_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count
  FROM bigcompany.products
  WHERE category_id = p_category_id;

  RETURN product_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get product count for a category
CREATE OR REPLACE FUNCTION bigcompany.get_category_product_count(p_category_id UUID)
RETURNS INTEGER AS $$
DECLARE
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count
  FROM bigcompany.products
  WHERE category_id = p_category_id;

  RETURN product_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique category code
CREATE OR REPLACE FUNCTION bigcompany.generate_category_code(p_name VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_code VARCHAR(20);
  v_prefix VARCHAR(3);
  v_number INTEGER;
  v_exists BOOLEAN;
BEGIN
  -- Get first 3 letters of name (uppercase)
  v_prefix := UPPER(SUBSTRING(REGEXP_REPLACE(p_name, '[^a-zA-Z]', '', 'g'), 1, 3));

  -- If prefix less than 3 chars, pad with 'X'
  WHILE LENGTH(v_prefix) < 3 LOOP
    v_prefix := v_prefix || 'X';
  END LOOP;

  -- Generate random 4-digit number
  v_number := floor(random() * 9000 + 1000)::INTEGER;
  v_code := v_prefix || '-' || v_number::TEXT;

  -- Check if code exists, regenerate if needed
  SELECT EXISTS(SELECT 1 FROM bigcompany.product_categories WHERE code = v_code) INTO v_exists;

  WHILE v_exists LOOP
    v_number := floor(random() * 9000 + 1000)::INTEGER;
    v_code := v_prefix || '-' || v_number::TEXT;
    SELECT EXISTS(SELECT 1 FROM bigcompany.product_categories WHERE code = v_code) INTO v_exists;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION bigcompany.update_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_category_timestamp ON bigcompany.product_categories;
CREATE TRIGGER trigger_update_category_timestamp
  BEFORE UPDATE ON bigcompany.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION bigcompany.update_category_timestamp();

-- ==================== SEED DEFAULT CATEGORIES ====================

-- Insert common product categories
INSERT INTO bigcompany.product_categories (code, name, description) VALUES
  ('BEV-1001', 'Beverages', 'Soft drinks, juices, water, and other beverages'),
  ('FOD-1002', 'Food Items', 'Packaged food, snacks, and groceries'),
  ('DAI-1003', 'Dairy Products', 'Milk, cheese, yogurt, and dairy items'),
  ('BAK-1004', 'Bakery', 'Bread, cakes, pastries, and baked goods'),
  ('HYG-1005', 'Hygiene Products', 'Soap, detergent, toothpaste, and cleaning supplies'),
  ('ELE-1006', 'Electronics', 'Mobile accessories, batteries, and small electronics'),
  ('STA-1007', 'Stationery', 'Pens, notebooks, paper, and office supplies'),
  ('CLO-1008', 'Clothing', 'Apparel, shoes, and accessories'),
  ('HAR-1009', 'Hardware', 'Tools, nails, and basic hardware items'),
  ('OTH-1010', 'Other', 'Miscellaneous products')
ON CONFLICT (code) DO NOTHING;

-- ==================== COMMENTS ====================

COMMENT ON TABLE bigcompany.product_categories IS 'Product categories for inventory organization';
COMMENT ON COLUMN bigcompany.product_categories.code IS 'Unique category code (e.g., BEV-1234)';
COMMENT ON COLUMN bigcompany.product_categories.name IS 'Category display name';
COMMENT ON COLUMN bigcompany.product_categories.description IS 'Optional category description';
COMMENT ON COLUMN bigcompany.product_categories.created_by IS 'User ID who created the category';
COMMENT ON COLUMN bigcompany.product_categories.is_active IS 'Soft delete flag';

COMMENT ON FUNCTION bigcompany.category_has_products(UUID) IS 'Check if category has associated products';
COMMENT ON FUNCTION bigcompany.get_category_product_count(UUID) IS 'Get count of products in category';
COMMENT ON FUNCTION bigcompany.generate_category_code(VARCHAR) IS 'Generate unique category code from name';

-- ==================== GRANTS ====================

-- Grant necessary permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON bigcompany.product_categories TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.category_has_products(UUID) TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.get_category_product_count(UUID) TO bigcompany_app;
GRANT EXECUTE ON FUNCTION bigcompany.generate_category_code(VARCHAR) TO bigcompany_app;
