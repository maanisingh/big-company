import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Typography, Progress, Spin, Alert, Button } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  TeamOutlined,
  RiseOutlined,
  WarningOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
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

interface DashboardStats {
  weekly_revenue: number;
  revenue_growth: number;
  pending_orders: number;
  urgent_orders: number;
  active_retailers: number;
  new_retailers_month: number;
  pending_credit_requests: number;
  low_stock_count: number;
  total_orders_week: number;
  total_products: number;
}

interface WeeklySalesData {
  date: string;
  day: string;
  sales: number;
  orders: number;
}

interface TopRetailer {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  trend: string;
  trend_percentage: number;
}

interface PendingOrder {
  id: string;
  order_number: string;
  retailer: string;
  retailer_id: string;
  items: number;
  total: number;
  time_ago: string;
  created_at: string;
  payment_type: string;
}

interface CreditHealthData {
  good_standing: number;
  high_usage: number;
  critical: number;
  total_retailers: number;
}

interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  stock: number;
  threshold: number;
  category: string;
}

export const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklySales, setWeeklySales] = useState<WeeklySalesData[]>([]);
  const [topRetailers, setTopRetailers] = useState<TopRetailer[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [creditHealth, setCreditHealth] = useState<CreditHealthData | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  const fetchDashboardData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statsData, salesData, retailersData, ordersData, creditData, stockData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getWeeklySales(),
        dashboardApi.getTopRetailers(5),
        dashboardApi.getPendingOrders(5),
        dashboardApi.getCreditHealth(),
        dashboardApi.getLowStockItems(5),
      ]);

      setStats(statsData);
      setWeeklySales(salesData.data || []);
      setTopRetailers(retailersData.retailers || []);
      setPendingOrders(ordersData.orders || []);
      setCreditHealth(creditData);
      setLowStockItems(stockData.items || []);
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => fetchDashboardData(true), 120000);
    return () => clearInterval(interval);
  }, []);

  // Credit distribution for pie chart
  const creditDistribution = creditHealth ? [
    { name: 'Good Standing', value: creditHealth.good_standing, color: '#22c55e' },
    { name: 'High Usage', value: creditHealth.high_usage, color: '#f97316' },
    { name: 'Critical', value: creditHealth.critical, color: '#ef4444' },
  ] : [];

  const orderColumns = [
    {
      title: 'Order',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (v: string) => <Text code>{v}</Text>,
    },
    { title: 'Retailer', dataIndex: 'retailer', key: 'retailer' },
    { title: 'Items', dataIndex: 'items', key: 'items' },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => (
        <Text strong>{value.toLocaleString()} RWF</Text>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'time_ago',
      key: 'time_ago',
      render: (v: string) => (
        <Text type="secondary">
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {v}
        </Text>
      ),
    },
  ];

  const retailerColumns = [
    {
      title: 'Retailer',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <strong>{v}</strong>
    },
    { title: 'Orders', dataIndex: 'orders', key: 'orders' },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => {
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M RWF`;
        }
        return `${value.toLocaleString()} RWF`;
      },
    },
    {
      title: 'Trend',
      dataIndex: 'trend',
      key: 'trend',
      render: (trend: string, record: TopRetailer) => (
        <span style={{ color: record.trend_percentage >= 0 ? '#22c55e' : '#ef4444' }}>
          {trend}
        </span>
      ),
    },
  ];

  const stockColumns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (v: string) => <code>{v}</code>
    },
    { title: 'Product', dataIndex: 'name', key: 'name' },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number, record: LowStockItem) => (
        <Text type={stock < record.threshold / 2 ? 'danger' : 'warning'} strong>
          {stock} units
        </Text>
      ),
    },
    {
      title: 'Threshold',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (v: number) => `${v} units`,
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
        <Title level={3} style={{ margin: 0 }}>Wholesaler Dashboard</Title>
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
              title="This Week's Revenue"
              value={stats?.weekly_revenue || 0}
              suffix="RWF"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#22c55e' }}
              formatter={(value) => value?.toLocaleString()}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {(stats?.revenue_growth || 0) >= 0 ? (
                <span style={{ color: '#22c55e' }}>
                  <RiseOutlined /> +{stats?.revenue_growth || 0}% from last week
                </span>
              ) : (
                <span style={{ color: '#ef4444' }}>
                  {stats?.revenue_growth || 0}% from last week
                </span>
              )}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Orders"
              value={stats?.pending_orders || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#f97316' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {stats?.urgent_orders || 0} need urgent processing
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Retailers"
              value={stats?.active_retailers || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#7c3aed' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <span style={{ color: '#22c55e' }}>{stats?.new_retailers_month || 0}</span> new this month
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Credit Requests"
              value={stats?.pending_credit_requests || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: (stats?.pending_credit_requests || 0) > 0 ? '#f97316' : '#22c55e' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Pending approval
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Secondary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Total Orders This Week"
              value={stats?.total_orders_week || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Total Products"
              value={stats?.total_products || 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Low Stock Items"
              value={stats?.low_stock_count || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: (stats?.low_stock_count || 0) > 0 ? '#ef4444' : '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={16}>
          <Card title="Weekly Sales Revenue">
            {weeklySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} RWF`, 'Sales']}
                    labelFormatter={(label) => `Day: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#7c3aed"
                    fill="#7c3aed"
                    fillOpacity={0.3}
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
          <Card title="Retailer Credit Health" style={{ height: '100%' }}>
            {creditHealth && creditHealth.total_retailers > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={creditDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {creditDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ textAlign: 'center' }}>
                  {creditDistribution.map((item) => (
                    <Tag key={item.name} color={item.color} style={{ margin: '4px' }}>
                      {item.name}: {item.value}%
                    </Tag>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Text type="secondary">No credit data available</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Tables Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <ClockCircleOutlined style={{ color: '#f97316', marginRight: '8px' }} />
                Pending Orders
              </span>
            }
            extra={<a href="/orders">View All</a>}
          >
            {pendingOrders.length > 0 ? (
              <Table
                dataSource={pendingOrders}
                columns={orderColumns}
                pagination={false}
                size="small"
                rowKey="id"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="success">
                  <CheckCircleOutlined style={{ marginRight: 8 }} />
                  No pending orders
                </Text>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Top Retailers"
            extra={<a href="/retailers">View All</a>}
          >
            {topRetailers.length > 0 ? (
              <Table
                dataSource={topRetailers}
                columns={retailerColumns}
                pagination={false}
                size="small"
                rowKey="id"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">No retailer data available</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Low Stock Alert */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: '#f97316', marginRight: '8px' }} />
                Low Stock Alert
              </span>
            }
            extra={<a href="/inventory?low_stock=true">Manage Inventory</a>}
          >
            {lowStockItems.length > 0 ? (
              <Table
                dataSource={lowStockItems}
                columns={stockColumns}
                pagination={false}
                rowKey="id"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="success">
                  <CheckCircleOutlined style={{ marginRight: 8 }} />
                  All products are well-stocked!
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
