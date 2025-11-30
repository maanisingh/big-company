import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Card, Row, Col, Space, Divider } from 'antd';
import {
  ShoppingCartOutlined,
  ShopOutlined,
  TeamOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // If authenticated, redirect to appropriate dashboard
  const handleGetStarted = (role: string) => {
    if (isAuthenticated && user) {
      // Go to user's dashboard
      const redirects: Record<string, string> = {
        consumer: '/consumer/shop',
        retailer: '/retailer/dashboard',
        wholesaler: '/wholesaler/dashboard',
      };
      navigate(redirects[user.role]);
    } else {
      navigate(`/login?role=${role}`);
    }
  };

  const features = [
    {
      icon: <GlobalOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      title: 'Rwanda-Wide Distribution',
      description: 'Connect with retailers and wholesalers across all provinces of Rwanda',
    },
    {
      icon: <RocketOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      title: 'Fast Delivery',
      description: 'Same-day delivery in Kigali, next-day delivery nationwide',
    },
    {
      icon: <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: 'Quality Products',
      description: 'Verified suppliers and genuine products guaranteed',
    },
  ];

  const userTypes = [
    {
      key: 'consumer',
      icon: <ShoppingCartOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
      title: 'Consumers',
      description: 'Shop quality products from local retailers at competitive prices',
      color: '#52c41a',
      features: ['Browse local products', 'Easy ordering', 'Track deliveries', 'Secure payments'],
    },
    {
      key: 'retailer',
      icon: <ShopOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
      title: 'Retailers',
      description: 'Manage your shop, order from wholesalers, and grow your business',
      color: '#1890ff',
      features: ['Inventory management', 'Wholesale ordering', 'Credit facilities', 'Sales analytics'],
    },
    {
      key: 'wholesaler',
      icon: <TeamOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
      title: 'Wholesalers',
      description: 'Distribute products efficiently to your network of retailers',
      color: '#722ed1',
      features: ['Retailer management', 'Order processing', 'Credit approvals', 'Distribution analytics'],
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '80px 24px',
          textAlign: 'center',
          color: 'white',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Title style={{ color: 'white', fontSize: 48, marginBottom: 16 }}>
            BIG Company Rwanda
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 20, marginBottom: 32 }}>
            Your complete B2B and B2C distribution platform connecting wholesalers, retailers, and consumers across Rwanda
          </Paragraph>
          <Space size="large">
            {isAuthenticated ? (
              <Button
                type="primary"
                size="large"
                onClick={() => handleGetStarted(user?.role || 'consumer')}
                style={{ height: 48, paddingInline: 32, fontSize: 16 }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/login')}
                  style={{ height: 48, paddingInline: 32, fontSize: 16 }}
                  ghost
                >
                  Sign In
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/login?role=consumer')}
                  style={{
                    height: 48,
                    paddingInline: 32,
                    fontSize: 16,
                    background: 'white',
                    color: '#667eea',
                  }}
                >
                  Get Started Free
                </Button>
              </>
            )}
          </Space>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ padding: '64px 24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[32, 32]}>
            {features.map((feature, index) => (
              <Col xs={24} md={8} key={index}>
                <Card style={{ textAlign: 'center', height: '100%' }}>
                  {feature.icon}
                  <Title level={4} style={{ marginTop: 16 }}>
                    {feature.title}
                  </Title>
                  <Text type="secondary">{feature.description}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* User Types Section */}
      <div style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
            Choose Your Portal
          </Title>
          <Row gutter={[24, 24]}>
            {userTypes.map((type) => (
              <Col xs={24} md={8} key={type.key}>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderTop: `4px solid ${type.color}`,
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    {type.icon}
                  </div>
                  <Title level={3} style={{ textAlign: 'center' }}>
                    {type.title}
                  </Title>
                  <Paragraph style={{ textAlign: 'center', color: '#666' }}>
                    {type.description}
                  </Paragraph>
                  <Divider />
                  <ul style={{ paddingLeft: 20 }}>
                    {type.features.map((feature, index) => (
                      <li key={index} style={{ marginBottom: 8 }}>
                        <Text>{feature}</Text>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="primary"
                    block
                    size="large"
                    onClick={() => handleGetStarted(type.key)}
                    style={{
                      marginTop: 16,
                      background: type.color,
                      borderColor: type.color,
                    }}
                  >
                    {isAuthenticated && user?.role === type.key
                      ? 'Go to Dashboard'
                      : `Login as ${type.title.slice(0, -1)}`}
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: '#001529',
          color: 'white',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <Title level={4} style={{ color: 'white' }}>
          BIG Company Rwanda Ltd.
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
          KG 123 St, Kigali, Rwanda | +250 788 123 456 | info@bigcompany.rw
        </Text>
        <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <Text style={{ color: 'rgba(255,255,255,0.45)' }}>
          © 2024 BIG Company Rwanda. All rights reserved.
        </Text>
      </div>
    </div>
  );
};
