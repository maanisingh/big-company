import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, Tabs, Typography, message, Space, Divider } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  ShopOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';

const { Title, Text, Paragraph } = Typography;

const roleConfig = {
  consumer: {
    title: 'Consumer Login',
    subtitle: 'Shop amazing products from local retailers',
    icon: <ShoppingCartOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
    color: '#52c41a',
    redirect: '/consumer/shop',
  },
  retailer: {
    title: 'Retailer Login',
    subtitle: 'Manage your shop inventory and orders',
    icon: <ShopOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
    color: '#1890ff',
    redirect: '/retailer/dashboard',
  },
  wholesaler: {
    title: 'Wholesaler Login',
    subtitle: 'Distribute products to your retailer network',
    icon: <TeamOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
    color: '#722ed1',
    redirect: '/wholesaler/dashboard',
  },
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading } = useAuth();

  // Get role from URL or default to consumer
  const initialRole = (searchParams.get('role') as UserRole) || 'consumer';
  const [activeRole, setActiveRole] = useState<UserRole>(initialRole);
  const [form] = Form.useForm();

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      await login(values, activeRole);
      message.success('Login successful!');
      navigate(roleConfig[activeRole].redirect);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const config = roleConfig[activeRole];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#333' }}>
            BIG Company Rwanda
          </Title>
          <Text type="secondary">Your one-stop distribution platform</Text>
        </div>

        {/* Role Selection Tabs */}
        <Tabs
          activeKey={activeRole}
          onChange={(key) => setActiveRole(key as UserRole)}
          centered
          items={[
            {
              key: 'consumer',
              label: (
                <span>
                  <ShoppingCartOutlined /> Consumer
                </span>
              ),
            },
            {
              key: 'retailer',
              label: (
                <span>
                  <ShopOutlined /> Retailer
                </span>
              ),
            },
            {
              key: 'wholesaler',
              label: (
                <span>
                  <TeamOutlined /> Wholesaler
                </span>
              ),
            },
          ]}
        />

        {/* Role Icon & Description */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {config.icon}
          <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
            {config.title}
          </Title>
          <Text type="secondary">{config.subtitle}</Text>
        </div>

        {/* Login Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleLogin}
          autoComplete="off"
          initialValues={{
            email:
              activeRole === 'retailer'
                ? 'retailer@bigcompany.rw'
                : activeRole === 'wholesaler'
                  ? 'wholesaler@bigcompany.rw'
                  : '',
            password: activeRole !== 'consumer' ? 'password123' : '',
          }}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email address"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
              style={{ backgroundColor: config.color, borderColor: config.color }}
            >
              Sign In as {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}
            </Button>
          </Form.Item>
        </Form>

        {/* Demo Credentials */}
        {activeRole !== 'consumer' && (
          <>
            <Divider>Demo Credentials</Divider>
            <div
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <Space direction="vertical" size={4}>
                <Text code>
                  Email: {activeRole}@bigcompany.rw
                </Text>
                <Text code>Password: password123</Text>
              </Space>
            </div>
          </>
        )}

        {/* Back to marketing site */}
        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Button type="link" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            &larr; Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
};
