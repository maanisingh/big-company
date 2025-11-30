import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Table,
  Tag,
  Button,
  Space,
  Progress,
  message,
} from 'antd';
import {
  ShoppingOutlined,
  DollarOutlined,
  InboxOutlined,
  RiseOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { retailerApi } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  inventoryItems: number;
  lowStockItems: number;
  walletBalance: number;
  creditLimit: number;
}

export const RetailerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await retailerApi.getDashboardStats();
      setStats(response.data);
      setRecentOrders(response.data.recentOrders || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      // Use mock data for demo
      setStats({
        totalOrders: 156,
        pendingOrders: 8,
        totalRevenue: 2450000,
        inventoryItems: 89,
        lowStockItems: 12,
        walletBalance: 150000,
        creditLimit: 500000,
      });
      setRecentOrders([
        { id: '1', customer: 'John Doe', total: 15000, status: 'completed', date: '2024-11-30' },
        { id: '2', customer: 'Jane Smith', total: 8500, status: 'pending', date: '2024-11-30' },
        { id: '3', customer: 'Bob Wilson', total: 22000, status: 'processing', date: '2024-11-29' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
  };

  const orderColumns = [
    { title: 'Order ID', dataIndex: 'id', key: 'id', render: (id: string) => `#${id}` },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => formatCurrency(total),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          completed: 'green',
          pending: 'orange',
          processing: 'blue',
          cancelled: 'red',
        };
        return <Tag color={colors[status] || 'default'}>{status.toUpperCase()}</Tag>;
      },
    },
    { title: 'Date', dataIndex: 'date', key: 'date' },
  ];

  return (
    <div>
      {/* Welcome Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          padding: '24px',
          marginBottom: 24,
          borderRadius: 8,
          color: 'white',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              Welcome back, {user?.shop_name || 'Retailer'}!
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
              Here's what's happening with your shop today
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchDashboardData} style={{ borderColor: 'white', color: 'white', background: 'rgba(255,255,255,0.1)' }}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} style={{ borderColor: 'white', color: 'white', background: 'rgba(255,255,255,0.2)' }}>
                New Order
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Total Orders"
              value={stats?.totalOrders || 0}
              prefix={<ShoppingOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Text type="secondary">{stats?.pendingOrders || 0} pending</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Revenue"
              value={stats?.totalRevenue || 0}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Text type="secondary">
              <RiseOutlined /> +12% this month
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Inventory Items"
              value={stats?.inventoryItems || 0}
              prefix={<InboxOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="danger">{stats?.lowStockItems || 0} low stock</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Wallet Balance"
              value={stats?.walletBalance || 0}
              prefix={<DollarOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Progress
              percent={Math.round(
                ((stats?.walletBalance || 0) / (stats?.creditLimit || 1)) * 100
              )}
              size="small"
              status="active"
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Orders */}
      <Card title="Recent Orders" extra={<Button type="link">View All</Button>}>
        <Table
          columns={orderColumns}
          dataSource={recentOrders}
          rowKey="id"
          pagination={false}
          loading={loading}
        />
      </Card>
    </div>
  );
};
