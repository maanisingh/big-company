const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://bigcompany:bigcompany_secure_2024@localhost:5434/bigcompany',
});

// Rwanda FMCG products with realistic barcodes
const products = [
  // BEVERAGES
  { barcode: '6190001000011', name: 'Inyange Water 500ml', sku: 'INY-W500', price: 300, category: 'Beverages', stock: 500, unit: 'bottle' },
  { barcode: '6190001000028', name: 'Inyange Water 1.5L', sku: 'INY-W1500', price: 600, category: 'Beverages', stock: 300, unit: 'bottle' },
  { barcode: '6190001000035', name: 'Bralirwa Primus Beer 500ml', sku: 'BRA-PRI500', price: 1200, category: 'Beverages', stock: 400, unit: 'bottle' },
  { barcode: '6190001000042', name: 'Bralirwa Mutzig Beer 500ml', sku: 'BRA-MUT500', price: 1300, category: 'Beverages', stock: 350, unit: 'bottle' },
  { barcode: '6190001000059', name: 'Urwagwa Banana Wine 1L', sku: 'URW-BAN1L', price: 8000, category: 'Beverages', stock: 100, unit: 'bottle' },
  { barcode: '6190001000066', name: 'Inyange Apple Juice 1L', sku: 'INY-JAP1L', price: 2500, category: 'Beverages', stock: 200, unit: 'carton' },
  { barcode: '6190001000073', name: 'Inyange Passion Fruit Juice 1L', sku: 'INY-JPA1L', price: 2500, category: 'Beverages', stock: 200, unit: 'carton' },
  { barcode: '6190001000080', name: 'Coca Cola 500ml', sku: 'COC-500', price: 800, category: 'Beverages', stock: 600, unit: 'bottle' },
  { barcode: '6190001000097', name: 'Fanta Orange 500ml', sku: 'FAN-ORA500', price: 800, category: 'Beverages', stock: 500, unit: 'bottle' },
  { barcode: '6190001000103', name: 'Sprite 500ml', sku: 'SPR-500', price: 800, category: 'Beverages', stock: 450, unit: 'bottle' },

  // DAIRY
  { barcode: '6190002000010', name: 'Inyange Fresh Milk 500ml', sku: 'INY-M500', price: 800, category: 'Dairy', stock: 300, unit: 'pack' },
  { barcode: '6190002000027', name: 'Inyange Fresh Milk 1L', sku: 'INY-M1L', price: 1500, category: 'Dairy', stock: 250, unit: 'pack' },
  { barcode: '6190002000034', name: 'Ikivuguto Traditional Yogurt 500ml', sku: 'IKI-YOG500', price: 1200, category: 'Dairy', stock: 150, unit: 'pack' },
  { barcode: '6190002000041', name: 'Inyange Strawberry Yogurt 250ml', sku: 'INY-YST250', price: 900, category: 'Dairy', stock: 200, unit: 'cup' },
  { barcode: '6190002000058', name: 'Inyange Butter 250g', sku: 'INY-BUT250', price: 3500, category: 'Dairy', stock: 100, unit: 'pack' },
  { barcode: '6190002000065', name: 'Inyange Cheese 200g', sku: 'INY-CHE200', price: 4500, category: 'Dairy', stock: 80, unit: 'pack' },

  // FOOD & GROCERIES
  { barcode: '6190003000019', name: 'Rice Local 5kg', sku: 'RIC-LOC5K', price: 7500, category: 'Food & Groceries', stock: 200, unit: 'bag' },
  { barcode: '6190003000026', name: 'Isombe Cassava Leaves 500g', sku: 'ISO-CAS500', price: 2000, category: 'Food & Groceries', stock: 150, unit: 'pack' },
  { barcode: '6190003000033', name: 'Ubugari Cassava Flour 2kg', sku: 'UBU-FLO2K', price: 3500, category: 'Food & Groceries', stock: 180, unit: 'pack' },
  { barcode: '6190003000040', name: 'Red Beans 1kg', sku: 'BEA-RED1K', price: 2200, category: 'Food & Groceries', stock: 250, unit: 'pack' },
  { barcode: '6190003000057', name: 'Maize Flour 2kg', sku: 'MAI-FLO2K', price: 2800, category: 'Food & Groceries', stock: 200, unit: 'pack' },
  { barcode: '6190003000064', name: 'Sugar 1kg', sku: 'SUG-1K', price: 1800, category: 'Food & Groceries', stock: 300, unit: 'pack' },
  { barcode: '6190003000071', name: 'Ubuki Honey 500g', sku: 'UBU-HON500', price: 12000, category: 'Food & Groceries', stock: 80, unit: 'jar' },
  { barcode: '6190003000088', name: 'Rice Basmati 5kg', sku: 'RIC-BAS5K', price: 12000, category: 'Food & Groceries', stock: 120, unit: 'bag' },
  { barcode: '6190003000095', name: 'Spaghetti 500g', sku: 'SPA-500', price: 1500, category: 'Food & Groceries', stock: 300, unit: 'pack' },

  // COOKING ESSENTIALS
  { barcode: '6190004000018', name: 'Akabanga Hot Chili Oil 100ml', sku: 'AKA-CHI100', price: 6000, category: 'Cooking Essentials', stock: 200, unit: 'bottle' },
  { barcode: '6190004000025', name: 'Vegetable Cooking Oil 1L', sku: 'VEG-OIL1L', price: 4500, category: 'Cooking Essentials', stock: 250, unit: 'bottle' },
  { barcode: '6190004000032', name: 'Palm Oil 500ml', sku: 'PAL-OIL500', price: 3500, category: 'Cooking Essentials', stock: 150, unit: 'bottle' },
  { barcode: '6190004000049', name: 'Iodized Salt 1kg', sku: 'SAL-IOD1K', price: 800, category: 'Cooking Essentials', stock: 400, unit: 'pack' },
  { barcode: '6190004000056', name: 'Tomato Paste 400g', sku: 'TOM-PAS400', price: 2500, category: 'Cooking Essentials', stock: 180, unit: 'can' },
  { barcode: '6190004000063', name: 'Royco Seasoning 100g', sku: 'ROY-SEA100', price: 1200, category: 'Cooking Essentials', stock: 350, unit: 'pack' },
  { barcode: '6190004000070', name: 'Maggi Cubes 20pcs', sku: 'MAG-CUB20', price: 500, category: 'Cooking Essentials', stock: 500, unit: 'pack' },

  // PERSONAL CARE
  { barcode: '6190005000017', name: 'Geisha Soap Bar 175g', sku: 'GEI-SOA175', price: 1200, category: 'Personal Care', stock: 300, unit: 'bar' },
  { barcode: '6190005000024', name: 'Close Up Toothpaste 100ml', sku: 'CLO-TOO100', price: 2000, category: 'Personal Care', stock: 200, unit: 'tube' },
  { barcode: '6190005000031', name: 'Moisturizing Body Lotion 400ml', sku: 'BOD-LOT400', price: 5500, category: 'Personal Care', stock: 120, unit: 'bottle' },
  { barcode: '6190005000048', name: 'OMO Washing Powder 1kg', sku: 'OMO-WAS1K', price: 4000, category: 'Personal Care', stock: 180, unit: 'pack' },
  { barcode: '6190005000055', name: 'Sunlight Dish Soap 750ml', sku: 'SUN-DIS750', price: 2500, category: 'Personal Care', stock: 200, unit: 'bottle' },
  { barcode: '6190005000062', name: 'Colgate Toothbrush', sku: 'COL-BRU', price: 1500, category: 'Personal Care', stock: 250, unit: 'piece' },
  { barcode: '6190005000079', name: 'Dettol Hand Sanitizer 250ml', sku: 'DET-SAN250', price: 3500, category: 'Personal Care', stock: 180, unit: 'bottle' },

  // GAS & FUEL
  { barcode: '6190006000016', name: 'LPG Gas Cylinder 6kg Refill', sku: 'LPG-6K-REF', price: 8500, category: 'Gas & Fuel', stock: 100, unit: 'refill' },
  { barcode: '6190006000023', name: 'LPG Gas Cylinder 6kg New', sku: 'LPG-6K-NEW', price: 35000, category: 'Gas & Fuel', stock: 50, unit: 'cylinder' },
  { barcode: '6190006000030', name: 'LPG Gas Cylinder 12kg Refill', sku: 'LPG-12K-REF', price: 16500, category: 'Gas & Fuel', stock: 80, unit: 'refill' },
  { barcode: '6190006000047', name: 'LPG Gas Cylinder 12kg New', sku: 'LPG-12K-NEW', price: 55000, category: 'Gas & Fuel', stock: 30, unit: 'cylinder' },
  { barcode: '6190006000054', name: 'Charcoal 50kg', sku: 'CHA-50K', price: 25000, category: 'Gas & Fuel', stock: 60, unit: 'bag' },

  // SNACKS
  { barcode: '6190007000015', name: 'Pringles Original 165g', sku: 'PRI-ORI165', price: 3500, category: 'Snacks', stock: 150, unit: 'can' },
  { barcode: '6190007000022', name: 'Oreo Cookies 154g', sku: 'ORE-COO154', price: 2500, category: 'Snacks', stock: 200, unit: 'pack' },
  { barcode: '6190007000039', name: 'Digestive Biscuits 400g', sku: 'DIG-BIS400', price: 2000, category: 'Snacks', stock: 180, unit: 'pack' },
  { barcode: '6190007000046', name: 'Cashew Nuts 200g', sku: 'CAS-NUT200', price: 5000, category: 'Snacks', stock: 100, unit: 'pack' },
  { barcode: '6190007000053', name: 'Roasted Peanuts 300g', sku: 'PEA-ROA300', price: 2500, category: 'Snacks', stock: 150, unit: 'pack' },

  // BABY PRODUCTS
  { barcode: '6190008000014', name: 'Pampers Diapers Size 3 (28pcs)', sku: 'PAM-DIA3-28', price: 12000, category: 'Baby Products', stock: 80, unit: 'pack' },
  { barcode: '6190008000021', name: 'Pampers Diapers Size 4 (24pcs)', sku: 'PAM-DIA4-24', price: 12000, category: 'Baby Products', stock: 80, unit: 'pack' },
  { barcode: '6190008000038', name: 'Baby Cerelac 400g', sku: 'CER-BAB400', price: 8500, category: 'Baby Products', stock: 60, unit: 'box' },
  { barcode: '6190008000045', name: 'Johnson Baby Powder 200g', sku: 'JOH-POW200', price: 3500, category: 'Baby Products', stock: 100, unit: 'bottle' },
  { barcode: '6190008000052', name: 'Baby Wipes 80pcs', sku: 'BAB-WIP80', price: 4000, category: 'Baby Products', stock: 120, unit: 'pack' }
];

async function seed() {
  console.log('🌱 Seeding product barcodes...\n');

  // Create table if not exists
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
  `);

  let inserted = 0;
  let updated = 0;

  for (const product of products) {
    try {
      const result = await pool.query(
        `INSERT INTO product_barcodes
         (barcode, product_name, sku, price, category, stock_quantity, unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (barcode) DO UPDATE SET
           product_name = EXCLUDED.product_name,
           sku = EXCLUDED.sku,
           price = EXCLUDED.price,
           category = EXCLUDED.category,
           stock_quantity = EXCLUDED.stock_quantity,
           unit = EXCLUDED.unit,
           updated_at = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS inserted`,
        [product.barcode, product.name, product.sku, product.price, product.category, product.stock, product.unit]
      );

      if (result.rows[0].inserted) {
        inserted++;
        console.log(`✅ Inserted: ${product.name} (${product.barcode})`);
      } else {
        updated++;
        console.log(`🔄 Updated: ${product.name} (${product.barcode})`);
      }
    } catch (error) {
      console.error(`❌ Error with ${product.name}:`, error.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total: ${products.length}`);

  // Show categories summary
  const categories = await pool.query(
    'SELECT category, COUNT(*) as count FROM product_barcodes GROUP BY category ORDER BY category'
  );
  console.log(`\n📦 Categories:`);
  categories.rows.forEach(c => console.log(`   ${c.category}: ${c.count} products`));

  await pool.end();
  console.log('\n✅ Seeding complete!');
}

seed().catch(console.error);
