import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Typography, Spin, Alert, Button, DatePicker } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  AppstoreOutlined,
  RiseOutlined,
  WarningOutlined,
  ReloadOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardApi } from '../../lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface DashboardStats {
  today_sales: number;
  today_orders: number;
  total_products: number;
  growth_percentage: number;
  pending_orders: number;
  low_stock_count: number;
  credit_pending: number;
  nfc_transactions_today: number;
}

interface SalesDataPoint {
  date: string;
  sales: number;
  orders: number;
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  threshold: number;
  category: string;
}

interface RecentOrder {
  id: string;
  display_id: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_method: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'orange',
  processing: 'blue',
  completed: 'green',
  cancelled: 'red',
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const fetchDashboardData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statsData, salesChartData, lowStockData, ordersData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getSalesChart('week'),
        dashboardApi.getLowStockItems(5),
        dashboardApi.getRecentOrders(5),
      ]);

      setStats(statsData);
      setSalesData(salesChartData.data || []);
      setLowStockItems(lowStockData.items || []);
      setRecentOrders(ordersData.orders || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchDashboardData(true), 300000);
    return () => clearInterval(interval);
  }, []);

  const orderColumns = [
    {
      title: 'Order ID',
      dataIndex: 'display_id',
      key: 'display_id',
      render: (id: string) => <Text code>#{id}</Text>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (name: string, record: RecentOrder) => (
        <div>
          <div>{name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.customer_phone}</Text>
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => (
        <Text strong>{value.toLocaleString()} RWF</Text>
      ),
    },
    {
      title: 'Payment',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method: string) => {
        const labels: Record<string, string> = {
          cash: 'Cash',
          wallet: 'Wallet',
          nfc: 'NFC Card',
          credit: 'Credit',
        };
        return labels[method] || method;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return d.toLocaleDateString();
      },
    },
  ];

  const stockColumns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: LowStockItem) => (
        <div>
          <div>{name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.sku}</Text>
        </div>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number, record: LowStockItem) => (
        <Text
          type={stock === 0 ? 'danger' : 'warning'}
          strong
        >
          {stock} units
          {stock === 0 && ' (OUT)'}
        </Text>
      ),
    },
    {
      title: 'Threshold',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (threshold: number) => `${threshold} units`,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
        <Button
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={() => fetchDashboardData(true)}
          loading={refreshing}
        >
          Refresh
        </Button>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Sales"
              value={stats?.today_sales || 0}
              suffix="RWF"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Orders Today"
              value={stats?.today_orders || 0}
              prefix={<ShoppingCartOutlined />}
              suffix={
                stats?.pending_orders ? (
                  <Tag color="orange" style={{ marginLeft: '8px' }}>
                    {stats.pending_orders} pending
                  </Tag>
                ) : null
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Products"
              value={stats?.total_products || 0}
              prefix={<AppstoreOutlined />}
              suffix={
                stats?.low_stock_count ? (
                  <Tag color="red" style={{ marginLeft: '8px' }}>
                    <WarningOutlined /> {stats.low_stock_count} low
                  </Tag>
                ) : null
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Weekly Growth"
              value={stats?.growth_percentage || 0}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: (stats?.growth_percentage || 0) >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Secondary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small">
            <Statistic
              title="NFC Transactions Today"
              value={stats?.nfc_transactions_today || 0}
              prefix={<CreditCardOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small">
            <Statistic
              title="Pending Credit Orders"
              value={stats?.credit_pending || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: (stats?.credit_pending || 0) > 0 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small">
            <Statistic
              title="Low Stock Items"
              value={stats?.low_stock_count || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: (stats?.low_stock_count || 0) > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts and Tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Weekly Sales Performance">
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'sales' ? `${value.toLocaleString()} RWF` : value,
                      name === 'sales' ? 'Sales' : 'Orders',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#0ea5e9"
                    fill="#0ea5e9"
                    fillOpacity={0.3}
                    name="sales"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Text type="secondary">No sales data available</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: '#faad14', marginRight: '8px' }} />
                Low Stock Alert
              </span>
            }
            style={{ height: '100%' }}
            extra={<a href="/inventory?low_stock=true">View All</a>}
          >
            {lowStockItems.length > 0 ? (
              <Table
                dataSource={lowStockItems}
                columns={stockColumns}
                pagination={false}
                size="small"
                rowKey="id"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="success">All products are well-stocked!</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24}>
          <Card
            title="Recent Orders"
            extra={<a href="/orders">View All</a>}
          >
            {recentOrders.length > 0 ? (
              <Table
                dataSource={recentOrders}
                columns={orderColumns}
                pagination={false}
                rowKey="id"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">No orders yet today</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
