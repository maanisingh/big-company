import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';

const router = Router();

// Mock data for retailers (in production, this would come from database)
const mockRetailers = [
  {
    id: 'ret_001',
    name: 'Kigali Central Shop',
    shop_name: 'Kigali Central Shop',
    location: { lat: -1.9441, lng: 30.0619 },
    address: 'KN 5 Rd, Kigali',
    distance: 0.5,
    rating: 4.8,
    is_open: true,
    categories: ['beverages', 'food', 'household'],
    phone: '+250788000001',
    opening_hours: '07:00 - 22:00',
  },
  {
    id: 'ret_002',
    name: 'Nyarugenge Mini-mart',
    shop_name: 'Nyarugenge Mini-mart',
    location: { lat: -1.9503, lng: 30.0588 },
    address: 'KN 3 Ave, Nyarugenge',
    distance: 1.2,
    rating: 4.5,
    is_open: true,
    categories: ['beverages', 'food', 'personal_care'],
    phone: '+250788000002',
    opening_hours: '06:00 - 21:00',
  },
  {
    id: 'ret_003',
    name: 'Gasabo Store',
    shop_name: 'Gasabo Store',
    location: { lat: -1.9256, lng: 30.1025 },
    address: 'KG 7 Ave, Gasabo',
    distance: 2.5,
    rating: 4.7,
    is_open: true,
    categories: ['food', 'household', 'electronics'],
    phone: '+250788000003',
    opening_hours: '08:00 - 20:00',
  },
  {
    id: 'ret_004',
    name: 'Kimironko Market Shop',
    shop_name: 'Kimironko Market Shop',
    location: { lat: -1.9356, lng: 30.1145 },
    address: 'KG 15 Rd, Kimironko',
    distance: 3.0,
    rating: 4.3,
    is_open: false,
    categories: ['beverages', 'food'],
    phone: '+250788000004',
    opening_hours: '07:00 - 19:00',
  },
  {
    id: 'ret_005',
    name: 'Remera Corner Store',
    shop_name: 'Remera Corner Store',
    location: { lat: -1.9578, lng: 30.1089 },
    address: 'KG 11 Ave, Remera',
    distance: 1.8,
    rating: 4.6,
    is_open: true,
    categories: ['beverages', 'food', 'personal_care', 'household'],
    phone: '+250788000005',
    opening_hours: '06:30 - 22:00',
  },
];

// Mock categories
const mockCategories = [
  { id: 'cat_001', name: 'Beverages', slug: 'beverages', icon: 'coffee', product_count: 45 },
  { id: 'cat_002', name: 'Food & Snacks', slug: 'food', icon: 'shopping-bag', product_count: 120 },
  { id: 'cat_003', name: 'Household', slug: 'household', icon: 'home', product_count: 65 },
  { id: 'cat_004', name: 'Personal Care', slug: 'personal_care', icon: 'heart', product_count: 38 },
  { id: 'cat_005', name: 'Electronics', slug: 'electronics', icon: 'smartphone', product_count: 22 },
  { id: 'cat_006', name: 'Baby Products', slug: 'baby', icon: 'baby', product_count: 18 },
  { id: 'cat_007', name: 'Cleaning', slug: 'cleaning', icon: 'droplet', product_count: 30 },
  { id: 'cat_008', name: 'Gas & Fuel', slug: 'gas', icon: 'flame', product_count: 5 },
];

// Mock products
const mockProducts = [
  { id: 'prod_001', name: 'Inyange Milk 1L', category: 'beverages', price: 900, image: '/images/milk.jpg', retailer_id: 'ret_001', stock: 50, unit: 'Liter' },
  { id: 'prod_002', name: 'Bralirwa Beer 500ml', category: 'beverages', price: 900, image: '/images/beer.jpg', retailer_id: 'ret_001', stock: 100, unit: 'Bottle' },
  { id: 'prod_003', name: 'Bread (Large)', category: 'food', price: 500, image: '/images/bread.jpg', retailer_id: 'ret_001', stock: 30, unit: 'Loaf' },
  { id: 'prod_004', name: 'Sugar 1kg', category: 'food', price: 1000, image: '/images/sugar.jpg', retailer_id: 'ret_002', stock: 45, unit: 'Kg' },
  { id: 'prod_005', name: 'Cooking Oil 1L', category: 'food', price: 2000, image: '/images/oil.jpg', retailer_id: 'ret_002', stock: 25, unit: 'Liter' },
  { id: 'prod_006', name: 'Rice 5kg', category: 'food', price: 5500, image: '/images/rice.jpg', retailer_id: 'ret_003', stock: 40, unit: 'Kg' },
  { id: 'prod_007', name: 'Soap Bar', category: 'personal_care', price: 300, image: '/images/soap.jpg', retailer_id: 'ret_003', stock: 80, unit: 'Piece' },
  { id: 'prod_008', name: 'Toothpaste', category: 'personal_care', price: 1200, image: '/images/toothpaste.jpg', retailer_id: 'ret_004', stock: 35, unit: 'Tube' },
  { id: 'prod_009', name: 'Detergent 1kg', category: 'cleaning', price: 1500, image: '/images/detergent.jpg', retailer_id: 'ret_005', stock: 60, unit: 'Kg' },
  { id: 'prod_010', name: 'Bottled Water 500ml', category: 'beverages', price: 300, image: '/images/water.jpg', retailer_id: 'ret_001', stock: 200, unit: 'Bottle' },
  { id: 'prod_011', name: 'Eggs (Tray of 30)', category: 'food', price: 4500, image: '/images/eggs.jpg', retailer_id: 'ret_002', stock: 20, unit: 'Tray' },
  { id: 'prod_012', name: 'Tomatoes 1kg', category: 'food', price: 800, image: '/images/tomatoes.jpg', retailer_id: 'ret_003', stock: 50, unit: 'Kg' },
  { id: 'prod_013', name: 'Onions 1kg', category: 'food', price: 600, image: '/images/onions.jpg', retailer_id: 'ret_004', stock: 55, unit: 'Kg' },
  { id: 'prod_014', name: 'Soda (Fanta 500ml)', category: 'beverages', price: 500, image: '/images/fanta.jpg', retailer_id: 'ret_005', stock: 120, unit: 'Bottle' },
  { id: 'prod_015', name: 'Tissue Paper (Pack)', category: 'household', price: 800, image: '/images/tissue.jpg', retailer_id: 'ret_001', stock: 40, unit: 'Pack' },
];

/**
 * Get list of retailers
 * GET /store/retailers
 */
router.get('/retailers', wrapHandler(async (req, res) => {
  try {
    const { lat, lng, category, search, limit = 20 } = req.query;

    let retailers = [...mockRetailers];

    // Filter by category if provided
    if (category) {
      retailers = retailers.filter(r =>
        r.categories.includes(String(category).toLowerCase())
      );
    }

    // Filter by search term
    if (search) {
      const searchTerm = String(search).toLowerCase();
      retailers = retailers.filter(r =>
        r.name.toLowerCase().includes(searchTerm) ||
        r.address.toLowerCase().includes(searchTerm)
      );
    }

    // Calculate distance if coordinates provided
    if (lat && lng) {
      const userLat = parseFloat(String(lat));
      const userLng = parseFloat(String(lng));

      retailers = retailers.map(r => ({
        ...r,
        distance: calculateDistance(userLat, userLng, r.location.lat, r.location.lng),
      }));

      // Sort by distance
      retailers.sort((a, b) => a.distance - b.distance);
    }

    // Apply limit
    retailers = retailers.slice(0, parseInt(String(limit)));

    res.json({
      retailers,
      count: retailers.length,
      total: mockRetailers.length,
    });
  } catch (error: any) {
    console.error('Get retailers error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get single retailer by ID
 * GET /store/retailers/:id
 */
router.get('/retailers/:id', wrapHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const retailer = mockRetailers.find(r => r.id === id);

    if (!retailer) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    // Get products for this retailer
    const products = mockProducts.filter(p => p.retailer_id === id);

    res.json({
      ...retailer,
      products,
    });
  } catch (error: any) {
    console.error('Get retailer error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get product categories
 * GET /store/categories
 */
router.get('/categories', wrapHandler(async (req, res) => {
  try {
    res.json({
      categories: mockCategories,
      count: mockCategories.length,
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get products
 * GET /store/products
 */
router.get('/products', wrapHandler(async (req, res) => {
  try {
    const { retailerId, category, search, limit = 50, offset = 0 } = req.query;

    let products = [...mockProducts];

    // Filter by retailer
    if (retailerId) {
      products = products.filter(p => p.retailer_id === String(retailerId));
    }

    // Filter by category
    if (category) {
      products = products.filter(p => p.category === String(category).toLowerCase());
    }

    // Filter by search term
    if (search) {
      const searchTerm = String(search).toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm)
      );
    }

    const total = products.length;

    // Apply pagination
    const start = parseInt(String(offset));
    const end = start + parseInt(String(limit));
    products = products.slice(start, end);

    res.json({
      products,
      count: products.length,
      total,
      offset: start,
      limit: parseInt(String(limit)),
    });
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get single product by ID
 * GET /store/products/:id
 */
router.get('/products/:id', wrapHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const product = mockProducts.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get retailer info
    const retailer = mockRetailers.find(r => r.id === product.retailer_id);

    res.json({
      ...product,
      retailer: retailer ? {
        id: retailer.id,
        name: retailer.name,
        address: retailer.address,
        is_open: retailer.is_open,
      } : null,
    });
  } catch (error: any) {
    console.error('Get product error:', error);
    res.status(500).json({ error: error.message });
  }
}));

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default router;
