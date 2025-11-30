import React, { useState, useEffect } from 'react';
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
} from 'antd';
import {
  ShoppingCartOutlined,
  SearchOutlined,
  HeartOutlined,
  HeartFilled,
} from '@ant-design/icons';
import { consumerApi } from '../../services/apiService';

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
  tags?: Array<{ value: string }>;
}

export const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await consumerApi.getProducts();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Use mock data for demo
      setProducts(getMockProducts());
    } finally {
      setLoading(false);
    }
  };

  const getMockProducts = (): Product[] => [
    {
      id: '1',
      title: 'Fanta Orange 500ml',
      description: 'Refreshing orange flavored carbonated drink',
      variants: [{ id: 'v1', title: 'Default', prices: [{ amount: 500, currency_code: 'RWF' }], inventory_quantity: 100 }],
      tags: [{ value: 'Beverages' }],
    },
    {
      id: '2',
      title: 'Coca-Cola 500ml',
      description: 'Classic cola carbonated drink',
      variants: [{ id: 'v2', title: 'Default', prices: [{ amount: 500, currency_code: 'RWF' }], inventory_quantity: 150 }],
      tags: [{ value: 'Beverages' }],
    },
    {
      id: '3',
      title: 'Inyange Milk 1L',
      description: 'Fresh pasteurized milk',
      variants: [{ id: 'v3', title: 'Default', prices: [{ amount: 1200, currency_code: 'RWF' }], inventory_quantity: 80 }],
      tags: [{ value: 'Dairy' }],
    },
    {
      id: '4',
      title: 'Blue Band 500g',
      description: 'Quality margarine spread',
      variants: [{ id: 'v4', title: 'Default', prices: [{ amount: 2500, currency_code: 'RWF' }], inventory_quantity: 60 }],
      tags: [{ value: 'Dairy' }],
    },
    {
      id: '5',
      title: 'Mukamira Rice 5kg',
      description: 'Premium local rice',
      variants: [{ id: 'v5', title: 'Default', prices: [{ amount: 8000, currency_code: 'RWF' }], inventory_quantity: 40 }],
      tags: [{ value: 'Grains' }],
    },
    {
      id: '6',
      title: 'Sunflower Oil 1L',
      description: 'Pure sunflower cooking oil',
      variants: [{ id: 'v6', title: 'Default', prices: [{ amount: 3500, currency_code: 'RWF' }], inventory_quantity: 70 }],
      tags: [{ value: 'Cooking' }],
    },
  ];

  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const newFav = new Set(prev);
      if (newFav.has(productId)) {
        newFav.delete(productId);
      } else {
        newFav.add(productId);
      }
      return newFav;
    });
  };

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      newCart.set(productId, (newCart.get(productId) || 0) + 1);
      return newCart;
    });
    message.success('Added to cart!');
  };

  const cartTotal = Array.from(cart.entries()).reduce((total, [productId, qty]) => {
    const product = products.find((p) => p.id === productId);
    if (product && product.variants[0]) {
      return total + product.variants[0].prices[0].amount * qty;
    }
    return total;
  }, 0);

  const cartItemCount = Array.from(cart.values()).reduce((a, b) => a + b, 0);

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
          padding: '24px',
          marginBottom: 24,
          borderRadius: 8,
          color: 'white',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              Shop Products
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
              Browse and order from local retailers
            </Text>
          </Col>
          <Col>
            <Badge count={cartItemCount} showZero>
              <Button
                size="large"
                icon={<ShoppingCartOutlined />}
                style={{ borderRadius: 8 }}
              >
                Cart ({formatPrice(cartTotal)})
              </Button>
            </Badge>
          </Col>
        </Row>
      </div>

      {/* Search */}
      <Search
        placeholder="Search products..."
        allowClear
        size="large"
        prefix={<SearchOutlined />}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: 24 }}
      />

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Empty description="No products found" />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredProducts.map((product) => {
            const price = product.variants[0]?.prices[0]?.amount || 0;
            const stock = product.variants[0]?.inventory_quantity || 0;
            const inCart = cart.get(product.id) || 0;

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                <Card
                  hoverable
                  cover={
                    <div
                      style={{
                        height: 160,
                        background: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 48,
                      }}
                    >
                      {product.thumbnail ? (
                        <img
                          src={product.thumbnail}
                          alt={product.title}
                          style={{ maxHeight: '100%', maxWidth: '100%' }}
                        />
                      ) : (
                        '📦'
                      )}
                    </div>
                  }
                  actions={[
                    <Button
                      key="favorite"
                      type="text"
                      icon={
                        favorites.has(product.id) ? (
                          <HeartFilled style={{ color: '#ff4d4f' }} />
                        ) : (
                          <HeartOutlined />
                        )
                      }
                      onClick={() => toggleFavorite(product.id)}
                    />,
                    <Button
                      key="cart"
                      type="primary"
                      icon={<ShoppingCartOutlined />}
                      onClick={() => addToCart(product.id)}
                      disabled={stock === 0}
                    >
                      {inCart > 0 ? `(${inCart})` : 'Add'}
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={product.title}
                    description={
                      <Space direction="vertical" size={4}>
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{ margin: 0, minHeight: 44 }}
                        >
                          {product.description}
                        </Paragraph>
                        <div>
                          {product.tags?.map((tag) => (
                            <Tag key={tag.value} color="green">
                              {tag.value}
                            </Tag>
                          ))}
                        </div>
                        <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
                          {formatPrice(price)}
                        </Text>
                        <Text type={stock > 0 ? 'success' : 'danger'}>
                          {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};
