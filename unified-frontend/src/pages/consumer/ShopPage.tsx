import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Input,
  Button,
  Tag,
  Space,
  Badge,
  message,
  Spin,
  Empty,
  Modal,
  Drawer,
  InputNumber,
  Divider,
  Rate,
  Alert,
} from 'antd';
import {
  ShoppingCartOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  ClockCircleOutlined,
  StarFilled,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CloseOutlined,
  FilterOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { consumerApi } from '../../services/apiService';
import { useCart, Retailer } from '../../contexts/CartContext';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface Product {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  variants: Array<{
    id: string;
    title: string;
    prices: Array<{ amount: number; currency_code: string }>;
    inventory_quantity: number;
  }>;
  categories?: Array<{ id: string; name: string }>;
  tags?: Array<{ value: string }>;
}

interface Category {
  id: string;
  name: string;
  handle: string;
  product_count?: number;
}

export const ShopPage: React.FC = () => {
  // Cart context
  const {
    items: cartItems,
    selectedRetailer,
    total: cartTotal,
    itemCount: cartItemCount,
    addItem,
    updateQuantity,
    clearCart,
    selectRetailer,
    getItemQuantity,
  } = useCart();

  // Local state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showRetailerModal, setShowRetailerModal] = useState(!selectedRetailer);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch retailers and categories on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [retailersRes, categoriesRes] = await Promise.all([
          consumerApi.getRetailers(),
          consumerApi.getCategories(),
        ]);
        setRetailers(retailersRes.data.retailers || getMockRetailers());
        setCategories(categoriesRes.data.product_categories || getMockCategories());
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        // Use mock data for demo
        setRetailers(getMockRetailers());
        setCategories(getMockCategories());
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch products when retailer or category changes
  const fetchProducts = useCallback(async () => {
    if (!selectedRetailer) return;

    setLoadingProducts(true);
    try {
      const response = await consumerApi.getProducts({
        retailerId: selectedRetailer.id,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setProducts(response.data.products || getMockProducts());
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts(getMockProducts());
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedRetailer, selectedCategory, searchQuery]);

  useEffect(() => {
    if (selectedRetailer) {
      fetchProducts();
    }
  }, [selectedRetailer, selectedCategory, fetchProducts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedRetailer && searchQuery) {
        fetchProducts();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format price
  const formatPrice = (amount: number) => `${amount.toLocaleString()} RWF`;

  // Handle retailer selection
  const handleSelectRetailer = (retailer: Retailer) => {
    if (cartItems.length > 0 && selectedRetailer && selectedRetailer.id !== retailer.id) {
      Modal.confirm({
        title: 'Change Store?',
        content: 'Changing the store will clear your current cart. Continue?',
        okText: 'Yes, Change Store',
        cancelText: 'Cancel',
        onOk: () => {
          selectRetailer(retailer);
          setShowRetailerModal(false);
        },
      });
    } else {
      selectRetailer(retailer);
      setShowRetailerModal(false);
    }
  };

  // Handle add to cart
  const handleAddToCart = (product: Product) => {
    const variant = product.variants?.[0];
    if (!variant) return;

    const price =
      variant.prices?.find((p) => p.currency_code === 'rwf' || p.currency_code === 'RWF')?.amount ||
      variant.prices?.[0]?.amount ||
      0;

    addItem({
      id: `${product.id}-${variant.id}`,
      productId: product.id,
      name: product.title,
      price,
      image: product.thumbnail,
    });
    message.success('Added to cart!');
  };

  // Handle checkout
  const handleCheckout = () => {
    if (selectedRetailer?.minimum_order && cartTotal < selectedRetailer.minimum_order) {
      message.warning(
        `Minimum order is ${formatPrice(selectedRetailer.minimum_order)}. Add ${formatPrice(
          selectedRetailer.minimum_order - cartTotal
        )} more to checkout.`
      );
      return;
    }
    message.info('Checkout functionality - redirecting to payment...');
    // In production: navigate to checkout page
    // window.location.href = '/consumer/checkout';
  };

  // Mock data for demo
  const getMockRetailers = (): Retailer[] => [
    {
      id: 'ret_001',
      name: 'Kigali Shop',
      location: 'Kigali City Center, KN 78 St',
      rating: 4.5,
      distance: 1.2,
      is_open: true,
      delivery_time: '20-30 min',
      minimum_order: 5000,
    },
    {
      id: 'ret_002',
      name: 'Nyamirambo Market',
      location: 'Nyamirambo, Kigali',
      rating: 4.2,
      distance: 2.5,
      is_open: true,
      delivery_time: '30-45 min',
      minimum_order: 3000,
    },
    {
      id: 'ret_003',
      name: 'Kimironko Fresh',
      location: 'Kimironko, KG 11 Ave',
      rating: 4.8,
      distance: 3.0,
      is_open: true,
      delivery_time: '25-35 min',
      minimum_order: 4000,
    },
    {
      id: 'ret_004',
      name: 'Remera Convenience',
      location: 'Remera, Kigali',
      rating: 3.9,
      distance: 1.8,
      is_open: false,
      delivery_time: '15-25 min',
      minimum_order: 2000,
    },
  ];

  const getMockCategories = (): Category[] => [
    { id: 'cat_1', name: 'Beverages', handle: 'beverages', product_count: 24 },
    { id: 'cat_2', name: 'Dairy', handle: 'dairy', product_count: 18 },
    { id: 'cat_3', name: 'Grains & Rice', handle: 'grains', product_count: 15 },
    { id: 'cat_4', name: 'Cooking Oil', handle: 'cooking', product_count: 12 },
    { id: 'cat_5', name: 'Snacks', handle: 'snacks', product_count: 30 },
    { id: 'cat_6', name: 'Personal Care', handle: 'personal-care', product_count: 22 },
  ];

  const getMockProducts = (): Product[] => [
    {
      id: '1',
      title: 'Fanta Orange 500ml',
      description: 'Refreshing orange flavored carbonated drink',
      variants: [{ id: 'v1', title: 'Default', prices: [{ amount: 500, currency_code: 'RWF' }], inventory_quantity: 100 }],
      categories: [{ id: 'cat_1', name: 'Beverages' }],
    },
    {
      id: '2',
      title: 'Coca-Cola 500ml',
      description: 'Classic cola carbonated drink',
      variants: [{ id: 'v2', title: 'Default', prices: [{ amount: 500, currency_code: 'RWF' }], inventory_quantity: 150 }],
      categories: [{ id: 'cat_1', name: 'Beverages' }],
    },
    {
      id: '3',
      title: 'Inyange Milk 1L',
      description: 'Fresh pasteurized milk',
      variants: [{ id: 'v3', title: 'Default', prices: [{ amount: 1200, currency_code: 'RWF' }], inventory_quantity: 80 }],
      categories: [{ id: 'cat_2', name: 'Dairy' }],
    },
    {
      id: '4',
      title: 'Blue Band 500g',
      description: 'Quality margarine spread',
      variants: [{ id: 'v4', title: 'Default', prices: [{ amount: 2500, currency_code: 'RWF' }], inventory_quantity: 60 }],
      categories: [{ id: 'cat_2', name: 'Dairy' }],
    },
    {
      id: '5',
      title: 'Mukamira Rice 5kg',
      description: 'Premium local rice',
      variants: [{ id: 'v5', title: 'Default', prices: [{ amount: 8000, currency_code: 'RWF' }], inventory_quantity: 40 }],
      categories: [{ id: 'cat_3', name: 'Grains & Rice' }],
    },
    {
      id: '6',
      title: 'Sunflower Oil 1L',
      description: 'Pure sunflower cooking oil',
      variants: [{ id: 'v6', title: 'Default', prices: [{ amount: 3500, currency_code: 'RWF' }], inventory_quantity: 70 }],
      categories: [{ id: 'cat_4', name: 'Cooking Oil' }],
    },
    {
      id: '7',
      title: 'Primus Beer 500ml',
      description: 'Local Rwandan beer',
      variants: [{ id: 'v7', title: 'Default', prices: [{ amount: 800, currency_code: 'RWF' }], inventory_quantity: 200 }],
      categories: [{ id: 'cat_1', name: 'Beverages' }],
    },
    {
      id: '8',
      title: 'Bread Loaf',
      description: 'Fresh baked bread',
      variants: [{ id: 'v8', title: 'Default', prices: [{ amount: 600, currency_code: 'RWF' }], inventory_quantity: 50 }],
      categories: [{ id: 'cat_3', name: 'Grains & Rice' }],
    },
  ];

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
        <p>Loading store...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Retailer Selection Modal */}
      <Modal
        open={showRetailerModal && !selectedRetailer}
        title={
          <Space>
            <ShopOutlined />
            <span>Select a Store</span>
          </Space>
        }
        footer={null}
        closable={false}
        width={500}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Choose a retailer near you to start shopping
        </Text>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {retailers.length === 0 ? (
            <Empty description="No retailers available" />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {retailers.map((retailer) => (
                <Card
                  key={retailer.id}
                  size="small"
                  hoverable={retailer.is_open}
                  style={{
                    opacity: retailer.is_open ? 1 : 0.6,
                    cursor: retailer.is_open ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => retailer.is_open && handleSelectRetailer(retailer)}
                >
                  <Row align="middle" gutter={12}>
                    <Col>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          background: '#f5f5f5',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShopOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                      </div>
                    </Col>
                    <Col flex={1}>
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Space>
                          <Text strong>{retailer.name}</Text>
                          <Tag color={retailer.is_open ? 'success' : 'error'}>
                            {retailer.is_open ? 'Open' : 'Closed'}
                          </Tag>
                        </Space>
                        <Space size={4}>
                          <EnvironmentOutlined style={{ color: '#999' }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {retailer.location}
                          </Text>
                        </Space>
                        <Space size={16}>
                          <Space size={4}>
                            <StarFilled style={{ color: '#faad14' }} />
                            <Text>{retailer.rating.toFixed(1)}</Text>
                          </Space>
                          {retailer.distance && (
                            <Text type="secondary">{retailer.distance.toFixed(1)} km</Text>
                          )}
                          {retailer.delivery_time && (
                            <Space size={4}>
                              <ClockCircleOutlined style={{ color: '#999' }} />
                              <Text type="secondary">{retailer.delivery_time}</Text>
                            </Space>
                          )}
                        </Space>
                        {retailer.minimum_order && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Min. order: {formatPrice(retailer.minimum_order)}
                          </Text>
                        )}
                      </Space>
                    </Col>
                    <Col>
                      <RightOutlined style={{ color: '#999' }} />
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
          )}
        </div>
      </Modal>

      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
          padding: '20px 24px',
          marginBottom: 16,
          borderRadius: 8,
          color: 'white',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: 'white', margin: 0 }}>
              Shop Products
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
              Browse and order from local retailers
            </Text>
          </Col>
          <Col>
            <Badge count={cartItemCount} showZero>
              <Button
                size="large"
                icon={<ShoppingCartOutlined />}
                onClick={() => setShowCartDrawer(true)}
                style={{ borderRadius: 8 }}
              >
                {formatPrice(cartTotal)}
              </Button>
            </Badge>
          </Col>
        </Row>
      </div>

      {/* Selected Retailer Bar */}
      {selectedRetailer && (
        <Card
          size="small"
          style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}
          bodyStyle={{ padding: '8px 16px' }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <ShopOutlined style={{ color: '#52c41a' }} />
                <Text strong style={{ color: '#389e0d' }}>
                  {selectedRetailer.name}
                </Text>
                <Tag color={selectedRetailer.is_open ? 'success' : 'error'}>
                  {selectedRetailer.is_open ? 'Open' : 'Closed'}
                </Tag>
              </Space>
            </Col>
            <Col>
              <Button type="link" onClick={() => setShowRetailerModal(true)}>
                Change Store
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* Search and Filter */}
      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col flex={1}>
          <Search
            placeholder="Search products..."
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Col>
        <Col>
          <Button
            size="large"
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
            type={showFilters || selectedCategory ? 'primary' : 'default'}
          />
        </Col>
      </Row>

      {/* Category Filters */}
      {showFilters && (
        <div style={{ marginBottom: 16, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 8 }}>
          <Space>
            <Button
              type={!selectedCategory ? 'primary' : 'default'}
              onClick={() => setSelectedCategory('')}
              shape="round"
            >
              All Products
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                type={selectedCategory === category.id ? 'primary' : 'default'}
                onClick={() => setSelectedCategory(category.id)}
                shape="round"
              >
                {category.name}
              </Button>
            ))}
          </Space>
        </div>
      )}

      {/* Products Grid */}
      {!selectedRetailer ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <ShopOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
          <Title level={4} style={{ marginTop: 16 }}>
            Select a Store
          </Title>
          <Text type="secondary">Choose a retailer to see their products</Text>
          <br />
          <Button
            type="primary"
            size="large"
            onClick={() => setShowRetailerModal(true)}
            style={{ marginTop: 16 }}
          >
            Browse Stores
          </Button>
        </div>
      ) : loadingProducts ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <p>Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Empty
          description={
            searchQuery ? `No results for "${searchQuery}"` : 'No products in this category'
          }
        />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredProducts.map((product) => {
            const variant = product.variants?.[0];
            const price =
              variant?.prices?.find((p) => (p.currency_code || '').toLowerCase() === 'rwf')?.amount ||
              variant?.prices?.[0]?.amount ||
              0;
            const stock = variant?.inventory_quantity || 0;
            const quantity = getItemQuantity(product.id);

            return (
              <Col xs={12} sm={12} md={8} lg={6} key={product.id}>
                <Card
                  hoverable
                  cover={
                    <div
                      style={{
                        height: 140,
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {product.thumbnail ? (
                        <img
                          src={product.thumbnail}
                          alt={product.title}
                          style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: 48 }}>📦</span>
                      )}
                      {stock === 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Tag color="error">Out of Stock</Tag>
                        </div>
                      )}
                    </div>
                  }
                  bodyStyle={{ padding: 12 }}
                >
                  <Text strong style={{ display: 'block', marginBottom: 4 }} ellipsis>
                    {product.title}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }} ellipsis>
                    {product.description}
                  </Text>
                  <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                    {formatPrice(price)}
                  </Text>

                  {/* Add to Cart */}
                  <div style={{ marginTop: 12 }}>
                    {quantity > 0 ? (
                      <Space.Compact style={{ width: '100%' }}>
                        <Button
                          icon={<MinusOutlined />}
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                        />
                        <InputNumber
                          value={quantity}
                          min={0}
                          style={{ flex: 1, textAlign: 'center' }}
                          controls={false}
                          onChange={(val) => updateQuantity(product.id, val || 0)}
                        />
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={stock === 0}
                        />
                      </Space.Compact>
                    ) : (
                      <Button
                        type="primary"
                        block
                        icon={<PlusOutlined />}
                        onClick={() => handleAddToCart(product)}
                        disabled={stock === 0}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Floating Cart Button */}
      {cartItemCount > 0 && !showCartDrawer && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
          }}
        >
          <Button
            type="primary"
            size="large"
            onClick={() => setShowCartDrawer(true)}
            style={{
              height: 56,
              paddingLeft: 24,
              paddingRight: 24,
              borderRadius: 28,
              boxShadow: '0 4px 16px rgba(82, 196, 26, 0.4)',
              background: '#52c41a',
            }}
          >
            <Space>
              <Badge count={cartItemCount} size="small">
                <ShoppingCartOutlined style={{ fontSize: 20, color: 'white' }} />
              </Badge>
              <span>View Cart</span>
              <span style={{ fontWeight: 'bold' }}>{formatPrice(cartTotal)}</span>
            </Space>
          </Button>
        </div>
      )}

      {/* Cart Drawer */}
      <Drawer
        title={
          <Space>
            <ShoppingCartOutlined />
            <span>Your Cart</span>
          </Space>
        }
        placement="right"
        width={400}
        open={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        extra={
          cartItems.length > 0 && (
            <Button type="text" danger onClick={clearCart}>
              Clear All
            </Button>
          )
        }
      >
        {/* Store Info */}
        {selectedRetailer && (
          <Alert
            type="info"
            showIcon
            icon={<ShopOutlined />}
            message={selectedRetailer.name}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Cart Items */}
        {cartItems.length === 0 ? (
          <Empty description="Your cart is empty" />
        ) : (
          <>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {cartItems.map((item) => (
                <Card key={item.id} size="small">
                  <Row gutter={12} align="middle">
                    <Col>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          background: '#f5f5f5',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ maxWidth: '100%', maxHeight: '100%' }}
                          />
                        ) : (
                          <span style={{ fontSize: 24 }}>📦</span>
                        )}
                      </div>
                    </Col>
                    <Col flex={1}>
                      <Text strong ellipsis style={{ display: 'block' }}>
                        {item.name}
                      </Text>
                      <Text type="secondary">{formatPrice(item.price)}</Text>
                    </Col>
                    <Col>
                      <Space>
                        <Button
                          size="small"
                          icon={<MinusOutlined />}
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        />
                        <Text strong>{item.quantity}</Text>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        />
                      </Space>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>

            <Divider />

            {/* Summary */}
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Col>
                <Text>Subtotal</Text>
              </Col>
              <Col>
                <Text strong>{formatPrice(cartTotal)}</Text>
              </Col>
            </Row>

            {selectedRetailer?.minimum_order && cartTotal < selectedRetailer.minimum_order && (
              <Alert
                type="warning"
                showIcon
                message={`Minimum order is ${formatPrice(selectedRetailer.minimum_order)}`}
                description={`Add ${formatPrice(selectedRetailer.minimum_order - cartTotal)} more to checkout.`}
                style={{ marginBottom: 16 }}
              />
            )}

            <Button
              type="primary"
              size="large"
              block
              onClick={handleCheckout}
              disabled={
                selectedRetailer?.minimum_order ? cartTotal < selectedRetailer.minimum_order : false
              }
              style={{ marginTop: 16 }}
            >
              Proceed to Checkout
            </Button>
          </>
        )}
      </Drawer>
    </div>
  );
};
