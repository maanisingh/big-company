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
  List,
  Avatar,
  Badge,
} from 'antd';
import {
  TeamOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { wholesalerApi } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

interface DashboardStats {
  totalRetailers: number;
  activeRetailers: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  inventoryValue: number;
  pendingCreditRequests: number;
}

export const WholesalerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [creditRequests, setCreditRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await wholesalerApi.getDashboardStats();
      setStats(response.data);
      // Ensure pendingOrders is an array (API may return count instead of list)
      const ordersData = response.data.pendingOrdersList || response.data.pendingOrders;
      setPendingOrders(Array.isArray(ordersData) ? ordersData : []);
      const creditData = response.data.creditRequestsList || response.data.creditRequests;
      setCreditRequests(Array.isArray(creditData) ? creditData : []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      // Use mock data for demo
      setStats({
        totalRetailers: 45,
        activeRetailers: 38,
        totalOrders: 1256,
        pendingOrders: 23,
        totalRevenue: 45000000,
        inventoryValue: 12500000,
        pendingCreditRequests: 5,
      });
      setPendingOrders([
        { id: '1', retailer: 'Kigali Shop', items: 12, total: 150000, status: 'pending', date: '2024-11-30' },
        { id: '2', retailer: 'Nyarugenge Store', items: 8, total: 85000, status: 'pending', date: '2024-11-30' },
        { id: '3', retailer: 'Gasabo Mini-mart', items: 15, total: 220000, status: 'processing', date: '2024-11-29' },
      ]);
      setCreditRequests([
        { id: '1', retailer: 'New Shop', amount: 100000, status: 'pending' },
        { id: '2', retailer: 'Corner Store', amount: 50000, status: 'pending' },
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
    { title: 'Retailer', dataIndex: 'retailer', key: 'retailer' },
    { title: 'Items', dataIndex: 'items', key: 'items' },
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
          pending: 'orange',
          processing: 'blue',
          shipped: 'cyan',
          delivered: 'green',
        };
        return <Tag color={colors[status] || 'default'}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" type="primary">
            Process
          </Button>
          <Button size="small">View</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Welcome Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
          padding: '24px',
          marginBottom: 24,
          borderRadius: 8,
          color: 'white',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              Welcome back, {user?.company_name || 'Wholesaler'}!
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
              Manage your retailer network and orders
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchDashboardData} style={{ borderColor: 'white', color: 'white', background: 'rgba(255,255,255,0.1)' }}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} style={{ borderColor: 'white', color: 'white', background: 'rgba(255,255,255,0.2)' }}>
                Add Inventory
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
              title="Total Retailers"
              value={stats?.totalRetailers || 0}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary">{stats?.activeRetailers || 0} active</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Total Orders"
              value={stats?.totalOrders || 0}
              prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Badge status="processing" text={`${stats?.pendingOrders || 0} pending`} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Total Revenue"
              value={stats?.totalRevenue || 0}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Inventory Value"
              value={stats?.inventoryValue || 0}
              prefix={<InboxOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Pending Orders */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                Pending Retailer Orders
              </Space>
            }
            extra={<Button type="link">View All</Button>}
          >
            <Table
              columns={orderColumns}
              dataSource={pendingOrders}
              rowKey="id"
              pagination={false}
              loading={loading}
            />
          </Card>
        </Col>

        {/* Credit Requests */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <DollarOutlined />
                Credit Requests ({creditRequests.length})
              </Space>
            }
            extra={<Button type="link">View All</Button>}
          >
            <List
              dataSource={creditRequests}
              loading={loading}
              renderItem={(item: any) => (
                <List.Item
                  actions={[
                    <Button
                      key="approve"
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                    >
                      Approve
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<TeamOutlined />} />}
                    title={item.retailer}
                    description={`Requesting ${formatCurrency(item.amount)}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
