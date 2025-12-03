import { Router } from 'express';
import { wrapHandler } from '@medusajs/medusa';
import jwt from 'jsonwebtoken';

const router = Router();

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'bigcompany_customer_secret_2024';

// Authentication middleware for customer endpoints
const authenticateCustomer = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.customer = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Mock data for retailers (in production, this would come from database)
const mockRetailers = [
  {
    id: 'ret_001',
    name: 'Kigali Central Shop',
    shop_name: 'Kigali Central Shop',
    coordinates: { lat: -1.9441, lng: 30.0619 },
    location: 'KN 5 Rd, Kigali',
    address: 'KN 5 Rd, Kigali',
    distance: 0.5,
    rating: 4.8,
    is_open: true,
    categories: ['beverages', 'food', 'household'],
    phone: '+250788000001',
    opening_hours: '07:00 - 22:00',
    delivery_time: '20-30 min',
  },
  {
    id: 'ret_002',
    name: 'Nyarugenge Mini-mart',
    shop_name: 'Nyarugenge Mini-mart',
    coordinates: { lat: -1.9503, lng: 30.0588 },
    location: 'KN 3 Ave, Nyarugenge',
    address: 'KN 3 Ave, Nyarugenge',
    distance: 1.2,
    rating: 4.5,
    is_open: true,
    categories: ['beverages', 'food', 'personal_care'],
    phone: '+250788000002',
    opening_hours: '06:00 - 21:00',
    delivery_time: '30-45 min',
  },
  {
    id: 'ret_003',
    name: 'Gasabo Store',
    shop_name: 'Gasabo Store',
    coordinates: { lat: -1.9256, lng: 30.1025 },
    location: 'KG 7 Ave, Gasabo',
    address: 'KG 7 Ave, Gasabo',
    distance: 2.5,
    rating: 4.7,
    is_open: true,
    categories: ['food', 'household', 'electronics'],
    phone: '+250788000003',
    opening_hours: '08:00 - 20:00',
    delivery_time: '25-40 min',
  },
  {
    id: 'ret_004',
    name: 'Kimironko Market Shop',
    shop_name: 'Kimironko Market Shop',
    coordinates: { lat: -1.9356, lng: 30.1145 },
    location: 'KG 15 Rd, Kimironko',
    address: 'KG 15 Rd, Kimironko',
    distance: 3.0,
    rating: 4.3,
    is_open: false,
    categories: ['beverages', 'food'],
    phone: '+250788000004',
    opening_hours: '07:00 - 19:00',
    delivery_time: '15-25 min',
  },
  {
    id: 'ret_005',
    name: 'Remera Corner Store',
    shop_name: 'Remera Corner Store',
    coordinates: { lat: -1.9578, lng: 30.1089 },
    location: 'KG 11 Ave, Remera',
    address: 'KG 11 Ave, Remera',
    distance: 1.8,
    rating: 4.6,
    is_open: true,
    categories: ['beverages', 'food', 'personal_care', 'household'],
    phone: '+250788000005',
    opening_hours: '06:30 - 22:00',
    delivery_time: '20-35 min',
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

// Helper function to get product image URL
const getProductImageUrl = (productName: string, productId: string) => {
  // Use product-specific placeholder images from Unsplash
  const imageMap: Record<string, string> = {
    'milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    'beer': 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop',
    'bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    'sugar': 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400&h=400&fit=crop',
    'oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop',
    'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    'soap': 'https://images.unsplash.com/photo-1622137500141-e0c0ecbd7ec8?w=400&h=400&fit=crop',
    'toothpaste': 'https://images.unsplash.com/photo-1622654862197-c7f5b9e30b8f?w=400&h=400&fit=crop',
    'detergent': 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=400&h=400&fit=crop',
    'water': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop',
    'eggs': 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',
    'tomatoes': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=400&fit=crop',
    'onions': 'https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?w=400&h=400&fit=crop',
    'fanta': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop',
    'tissue': 'https://images.unsplash.com/photo-1584556326561-c8746083993b?w=400&h=400&fit=crop',
  };

  // Try to find a matching key in the product name
  const nameKey = Object.keys(imageMap).find(key =>
    productName.toLowerCase().includes(key)
  );

  return nameKey ? imageMap[nameKey] : `https://via.placeholder.com/400x400/52c41a/ffffff?text=${encodeURIComponent(productName.substring(0, 20))}`;
};

// Mock customer orders
const mockOrders = [
  {
    id: 'ord_001',
    customer_id: 'cus_demo_consumer_001',
    retailer_id: 'ret_001',
    retailer_name: 'Kigali Central Shop',
    status: 'delivered',
    total: 4600,
    created_at: '2024-11-25T10:30:00Z',
    delivered_at: '2024-11-25T14:20:00Z',
    items: [
      { product_id: 'prod_001', name: 'Inyange Milk 1L', quantity: 2, price: 900 },
      { product_id: 'prod_003', name: 'Bread (Large)', quantity: 1, price: 500 },
      { product_id: 'prod_010', name: 'Bottled Water 500ml', quantity: 10, price: 300 },
    ],
    payment_method: 'NFC Card',
    delivery_address: 'KN 10 Rd, Kigali',
  },
  {
    id: 'ord_002',
    customer_id: 'cus_demo_consumer_001',
    retailer_id: 'ret_002',
    retailer_name: 'Nyarugenge Mini-mart',
    status: 'pending',
    total: 7500,
    created_at: '2024-11-28T08:15:00Z',
    items: [
      { product_id: 'prod_004', name: 'Sugar 1kg', quantity: 2, price: 1000 },
      { product_id: 'prod_005', name: 'Cooking Oil 1L', quantity: 1, price: 2000 },
      { product_id: 'prod_011', name: 'Eggs (Tray of 30)', quantity: 1, price: 4500 },
    ],
    payment_method: 'Wallet',
    delivery_address: 'KN 10 Rd, Kigali',
  },
  {
    id: 'ord_003',
    customer_id: 'cus_demo_consumer_001',
    retailer_id: 'ret_005',
    retailer_name: 'Remera Corner Store',
    status: 'in_transit',
    total: 2800,
    created_at: '2024-11-29T16:45:00Z',
    items: [
      { product_id: 'prod_014', name: 'Soda (Fanta 500ml)', quantity: 4, price: 500 },
      { product_id: 'prod_015', name: 'Tissue Paper (Pack)', quantity: 1, price: 800 },
    ],
    payment_method: 'NFC Card',
    delivery_address: 'KN 10 Rd, Kigali',
  },
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
        distance: calculateDistance(userLat, userLng, r.coordinates.lat, r.coordinates.lng),
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

    // Transform products to match frontend expectations
    const transformedProducts = products.map(p => ({
      id: p.id,
      title: p.name,
      description: p.name,
      thumbnail: getProductImageUrl(p.name, p.id),
      variants: [{
        id: `${p.id}_v1`,
        title: 'Default',
        prices: [{ amount: p.price, currency_code: 'RWF' }],
        inventory_quantity: p.stock,
      }],
      categories: [{
        id: `cat_${p.category}`,
        name: p.category.charAt(0).toUpperCase() + p.category.slice(1),
      }],
    }));

    res.json({
      products: transformedProducts,
      count: transformedProducts.length,
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

    // Transform to match frontend expectations
    const transformedProduct = {
      id: product.id,
      title: product.name,
      description: product.name,
      thumbnail: getProductImageUrl(product.name, product.id),
      variants: [{
        id: `${product.id}_v1`,
        title: 'Default',
        prices: [{ amount: product.price, currency_code: 'RWF' }],
        inventory_quantity: product.stock,
      }],
      categories: [{
        id: `cat_${product.category}`,
        name: product.category.charAt(0).toUpperCase() + product.category.slice(1),
      }],
      retailer: retailer ? {
        id: retailer.id,
        name: retailer.name,
        address: retailer.address,
        is_open: retailer.is_open,
      } : null,
    };

    res.json(transformedProduct);
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

/**
 * Get current customer info
 * GET /store/customers/me
 */
router.get('/customers/me', authenticateCustomer, wrapHandler(async (req: any, res) => {
  try {
    const customer = req.customer;
    const metadata = customer.metadata || {};

    res.json({
      id: customer.customer_id || customer.id,
      phone: customer.phone,
      email: customer.email,
      first_name: customer.first_name || 'Demo',
      last_name: customer.last_name || 'Customer',
      wallet_balance: 50000, // Mock wallet balance
      meter_id: metadata.meter_id || null,
      address: metadata.address || null,
    });
  } catch (error: any) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Update customer profile
 * PUT /store/customers/me
 */
router.put('/customers/me', authenticateCustomer, wrapHandler(async (req: any, res) => {
  try {
    const customer = req.customer;
    const { first_name, last_name, email, meter_id, address } = req.body;

    const customerId = customer.customer_id || customer.id;

    // Get current customer data
    const result = await db.query('SELECT * FROM customer WHERE id = $1', [customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const currentCustomer = result.rows[0];
    const metadata = currentCustomer.metadata || {};

    // Update metadata with new values
    if (meter_id !== undefined) metadata.meter_id = meter_id;
    if (address !== undefined) metadata.address = address;

    // Update customer
    await db.query(`
      UPDATE customer
      SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        metadata = $4,
        updated_at = NOW()
      WHERE id = $5
    `, [
      first_name,
      last_name,
      email,
      JSON.stringify(metadata),
      customerId
    ]);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      customer: {
        id: customerId,
        first_name: first_name || currentCustomer.first_name,
        last_name: last_name || currentCustomer.last_name,
        email: email || currentCustomer.email,
        meter_id: metadata.meter_id,
        address: metadata.address,
      }
    });
  } catch (error: any) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get customer orders
 * GET /store/customers/me/orders
 */
router.get('/customers/me/orders', authenticateCustomer, wrapHandler(async (req: any, res) => {
  try {
    const customer = req.customer;
    const customerId = customer.customer_id || customer.id;
    const { status, limit = 20, offset = 0 } = req.query;

    let orders = mockOrders.filter(o => o.customer_id === customerId);

    // Filter by status if provided
    if (status) {
      orders = orders.filter(o => o.status === String(status).toLowerCase());
    }

    const total = orders.length;

    // Apply pagination
    const start = parseInt(String(offset));
    const end = start + parseInt(String(limit));
    orders = orders.slice(start, end);

    // Transform orders to match frontend expectations
    const transformedOrders = orders.map(order => {
      // Find retailer details
      const retailer = mockRetailers.find(r => r.id === order.retailer_id);

      // Transform items to match frontend interface
      const transformedItems = order.items.map(item => ({
        id: `${order.id}_${item.product_id}`,
        product_id: item.product_id,
        product_name: item.name, // Rename 'name' to 'product_name'
        quantity: item.quantity,
        unit_price: item.price, // Rename 'price' to 'unit_price'
        total: item.price * item.quantity, // Calculate total
      }));

      // Calculate subtotal from items
      const subtotal = transformedItems.reduce((sum, item) => sum + item.total, 0);
      const delivery_fee = 500; // Mock delivery fee

      return {
        id: order.id,
        order_number: `ORD-${order.id.toUpperCase()}`, // Generate order_number
        status: order.status,
        retailer: {
          id: order.retailer_id,
          name: retailer?.name || order.retailer_name || 'Unknown Store',
          location: retailer?.address || 'Kigali, Rwanda',
          phone: retailer?.phone || '+250 788 000 000',
        },
        items: transformedItems,
        subtotal,
        delivery_fee,
        total: order.total,
        delivery_address: order.delivery_address,
        notes: order.payment_method ? `Payment: ${order.payment_method}` : undefined,
        created_at: order.created_at,
        updated_at: order.delivered_at || order.created_at, // Use delivered_at or created_at
        estimated_delivery: order.status === 'in_transit' ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : undefined,
      };
    });

    res.json({
      orders: transformedOrders,
      count: transformedOrders.length,
      total,
      offset: start,
      limit: parseInt(String(limit)),
    });
  } catch (error: any) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Get single order by ID
 * GET /store/customers/me/orders/:id
 */
router.get('/customers/me/orders/:id', authenticateCustomer, wrapHandler(async (req: any, res) => {
  try {
    const customer = req.customer;
    const customerId = customer.customer_id || customer.id;
    const { id } = req.params;

    const order = mockOrders.find(o => o.id === id && o.customer_id === customerId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Transform order to match frontend expectations
    const retailer = mockRetailers.find(r => r.id === order.retailer_id);

    const transformedItems = order.items.map(item => ({
      id: `${order.id}_${item.product_id}`,
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total: item.price * item.quantity,
    }));

    const subtotal = transformedItems.reduce((sum, item) => sum + item.total, 0);
    const delivery_fee = 500;

    const transformedOrder = {
      id: order.id,
      order_number: `ORD-${order.id.toUpperCase()}`,
      status: order.status,
      retailer: {
        id: order.retailer_id,
        name: retailer?.name || order.retailer_name || 'Unknown Store',
        location: retailer?.address || 'Kigali, Rwanda',
        phone: retailer?.phone || '+250 788 000 000',
      },
      items: transformedItems,
      subtotal,
      delivery_fee,
      total: order.total,
      delivery_address: order.delivery_address,
      notes: order.payment_method ? `Payment: ${order.payment_method}` : undefined,
      created_at: order.created_at,
      updated_at: order.delivered_at || order.created_at,
      estimated_delivery: order.status === 'in_transit' ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : undefined,
    };

    res.json(transformedOrder);
  } catch (error: any) {
    console.error('Get order error:', error);
    res.status(500).json({ error: error.message });
  }
}));

/**
 * Track order
 * GET /store/customers/me/orders/:id/track
 */
router.get('/customers/me/orders/:id/track', authenticateCustomer, wrapHandler(async (req: any, res) => {
  try {
    const customer = req.customer;
    const customerId = customer.customer_id || customer.id;
    const { id } = req.params;

    const order = mockOrders.find(o => o.id === id && o.customer_id === customerId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Mock tracking data
    const trackingData = {
      order_id: order.id,
      status: order.status,
      current_location: order.status === 'delivered'
        ? order.delivery_address
        : order.status === 'in_transit'
        ? 'En route to delivery address'
        : order.retailer_name,
      estimated_delivery: order.status === 'delivered'
        ? order.delivered_at
        : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      history: [
        { status: 'pending', timestamp: order.created_at, location: order.retailer_name },
        ...(order.status !== 'pending' ? [{ status: 'confirmed', timestamp: order.created_at, location: order.retailer_name }] : []),
        ...(order.status === 'in_transit' || order.status === 'delivered' ? [{ status: 'in_transit', timestamp: order.created_at, location: 'On delivery truck' }] : []),
        ...(order.status === 'delivered' ? [{ status: 'delivered', timestamp: order.delivered_at, location: order.delivery_address }] : []),
      ],
    };

    res.json(trackingData);
  } catch (error: any) {
    console.error('Track order error:', error);
    res.status(500).json({ error: error.message });
  }
}));

export default router;
