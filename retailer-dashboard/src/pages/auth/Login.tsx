import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined, CopyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../lib/api';

const { Title, Text, Paragraph } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('retailer_token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const response = await authApi.login(values.email, values.password);
      message.success(`Welcome back, ${response.retailer?.name || 'Retailer'}!`);
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied: ${text}`);
  };

  const fillDemoCredentials = () => {
    form.setFieldsValue({
      email: 'retailer@bigcompany.rw',
      password: 'retailer123',
    });
    message.info('Demo credentials filled!');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #22c55e 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 450,
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShopOutlined style={{ fontSize: 32, color: 'white' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#166534' }}>
            Retailer Portal
          </Title>
          <Text type="secondary">BIG Company Rwanda</Text>
        </div>

        {/* Demo Credentials */}
        <Card
          size="small"
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            marginBottom: 24,
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ color: '#166534' }}>
              <LockOutlined /> Demo Credentials
            </Text>
            <Button type="link" size="small" onClick={fillDemoCredentials}>
              Auto-fill
            </Button>
          </div>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">Email:</Text>
              <Space>
                <Text code style={{ color: '#166534' }}>retailer@bigcompany.rw</Text>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard('retailer@bigcompany.rw')}
                />
              </Space>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">Password:</Text>
              <Space>
                <Text code style={{ color: '#166534' }}>retailer123</Text>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard('retailer123')}
                />
              </Space>
            </div>
          </Space>
        </Card>

        {/* Login Form */}
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          initialValues={{
            email: 'retailer@bigcompany.rw',
            password: 'retailer123',
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
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Email address"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Password"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 48,
                borderRadius: 8,
                background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                border: 'none',
                fontWeight: 600,
              }}
            >
              Sign In to Dashboard
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text type="secondary" style={{ fontSize: 12 }}>
            BIG Company Rwanda E-Commerce Platform
          </Text>
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Need help?{' '}
            <a href="https://bigcompany-site.alexandratechlab.com" target="_blank" rel="noopener noreferrer">
              Visit our website
            </a>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
