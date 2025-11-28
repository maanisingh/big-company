const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9002;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://bigcompany:bigcompany_secure_2024@localhost:5434/bigcompany',
});

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: [
    'https://bigcompany-retailer.alexandratechlab.com',
    'https://bigcompany-wholesaler.alexandratechlab.com',
    'https://bigcompany.alexandratechlab.com',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://localhost:3003'
  ],
  credentials: true
}));
app.use(express.json());

// Initialize database table
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_barcodes (
        id SERIAL PRIMARY KEY,
        barcode VARCHAR(50) UNIQUE NOT NULL,
        product_id VARCHAR(100),
        product_name VARCHAR(255) NOT NULL,
        sku VARCHAR(50),
        price DECIMAL(10, 2),
        currency VARCHAR(10) DEFAULT 'RWF',
        category VARCHAR(100),
        description TEXT,
        image_url TEXT,
        stock_quantity INTEGER DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'piece',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_barcode ON product_barcodes(barcode);
      CREATE INDEX IF NOT EXISTS idx_sku ON product_barcodes(sku);
      CREATE INDEX IF NOT EXISTS idx_product_name ON product_barcodes(product_name);
    `);
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'barcode-service', timestamp: new Date().toISOString() });
});

// ==================== BARCODE ENDPOINTS ====================

// Scan/lookup barcode
app.get('/api/barcode/scan', async (req, res) => {
  try {
    const { barcode } = req.query;

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    const result = await pool.query(
      'SELECT * FROM product_barcodes WHERE barcode = $1',
      [barcode.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        barcode: barcode,
        message: 'No product found for this barcode'
      });
    }

    const product = result.rows[0];
    res.json({
      success: true,
      product: {
        id: product.product_id || product.id,
        barcode: product.barcode,
        name: product.product_name,
        sku: product.sku,
        price: parseFloat(product.price),
        currency: product.currency,
        category: product.category,
        description: product.description,
        image: product.image_url,
        stock: product.stock_quantity,
        unit: product.unit
      }
    });
  } catch (error) {
    console.error('Barcode scan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search products by name or SKU
app.get('/api/barcode/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await pool.query(
      `SELECT * FROM product_barcodes
       WHERE product_name ILIKE $1 OR sku ILIKE $1 OR barcode ILIKE $1
       ORDER BY product_name
       LIMIT $2`,
      [`%${q}%`, parseInt(limit)]
    );

    res.json({
      success: true,
      count: result.rows.length,
      products: result.rows.map(p => ({
        id: p.product_id || p.id,
        barcode: p.barcode,
        name: p.product_name,
        sku: p.sku,
        price: parseFloat(p.price),
        currency: p.currency,
        category: p.category,
        stock: p.stock_quantity
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products
app.get('/api/barcode/products', async (req, res) => {
  try {
    const { category, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM product_barcodes';
    const params = [];

    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }

    query += ' ORDER BY product_name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM product_barcodes' + (category ? ' WHERE category = $1' : ''),
      category ? [category] : []
    );

    res.json({
      success: true,
      total: parseInt(countResult.rows[0].count),
      count: result.rows.length,
      products: result.rows.map(p => ({
        id: p.product_id || p.id,
        barcode: p.barcode,
        name: p.product_name,
        sku: p.sku,
        price: parseFloat(p.price),
        currency: p.currency,
        category: p.category,
        stock: p.stock_quantity,
        unit: p.unit
      }))
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
app.get('/api/barcode/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category, COUNT(*) as product_count FROM product_barcodes GROUP BY category ORDER BY category'
    );

    res.json({
      success: true,
      categories: result.rows.map(r => ({
        name: r.category,
        count: parseInt(r.product_count)
      }))
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new product with barcode
app.post('/api/barcode/products', async (req, res) => {
  try {
    const { barcode, product_name, sku, price, category, description, image_url, stock_quantity, unit, product_id } = req.body;

    if (!barcode || !product_name) {
      return res.status(400).json({ error: 'Barcode and product name are required' });
    }

    const result = await pool.query(
      `INSERT INTO product_barcodes
       (barcode, product_id, product_name, sku, price, category, description, image_url, stock_quantity, unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (barcode) DO UPDATE SET
         product_name = EXCLUDED.product_name,
         sku = EXCLUDED.sku,
         price = EXCLUDED.price,
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         image_url = EXCLUDED.image_url,
         stock_quantity = EXCLUDED.stock_quantity,
         unit = EXCLUDED.unit,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [barcode, product_id, product_name, sku, price || 0, category, description, image_url, stock_quantity || 0, unit || 'piece']
    );

    res.status(201).json({
      success: true,
      message: 'Product saved',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Product save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update stock quantity
app.patch('/api/barcode/products/:barcode/stock', async (req, res) => {
  try {
    const { barcode } = req.params;
    const { quantity, operation = 'set' } = req.body;

    let query;
    if (operation === 'add') {
      query = 'UPDATE product_barcodes SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE barcode = $2 RETURNING *';
    } else if (operation === 'subtract') {
      query = 'UPDATE product_barcodes SET stock_quantity = GREATEST(0, stock_quantity - $1), updated_at = CURRENT_TIMESTAMP WHERE barcode = $2 RETURNING *';
    } else {
      query = 'UPDATE product_barcodes SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE barcode = $2 RETURNING *';
    }

    const result = await pool.query(query, [quantity, barcode]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Stock update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
app.delete('/api/barcode/products/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;

    const result = await pool.query(
      'DELETE FROM product_barcodes WHERE barcode = $1 RETURNING *',
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Product deleted',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate barcode (EAN-13 format for Rwanda)
app.get('/api/barcode/generate', (req, res) => {
  // Rwanda GS1 prefix is 619
  const prefix = '619';
  const companyCode = '0001'; // BIG Company code
  const randomProduct = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  const baseCode = prefix + companyCode + randomProduct;

  // Calculate check digit (EAN-13)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(baseCode[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  const barcode = baseCode + checkDigit;

  res.json({
    success: true,
    barcode: barcode,
    format: 'EAN-13',
    prefix: 'Rwanda (619)'
  });
});

// Start server
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Barcode Service running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Scan endpoint: http://localhost:${PORT}/api/barcode/scan?barcode=XXX`);
  });
});
