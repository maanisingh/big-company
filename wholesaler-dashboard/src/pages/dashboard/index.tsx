import { Card, Col, Row, Statistic, Table, Tag, Typography, Progress } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  TeamOutlined,
  RiseOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const { Title, Text } = Typography;

// Mock wholesaler data
const weeklySales = [
  { date: 'Mon', sales: 2450000 },
  { date: 'Tue', sales: 3200000 },
  { date: 'Wed', sales: 2800000 },
  { date: 'Thu', sales: 3650000 },
  { date: 'Fri', sales: 4200000 },
  { date: 'Sat', sales: 3900000 },
  { date: 'Sun', sales: 2100000 },
];

const topRetailers = [
  { name: 'Huye Supermarket', orders: 62, revenue: 4500000, trend: '+15%' },
  { name: 'Kigali Mini Mart', orders: 45, revenue: 2500000, trend: '+8%' },
  { name: 'Musanze Corner Shop', orders: 28, revenue: 1200000, trend: '+12%' },
  { name: 'Rubavu Store', orders: 22, revenue: 890000, trend: '-3%' },
];

const pendingOrders = [
  { id: '1', retailer: 'Kigali Mini Mart', items: 25, total: 450000, time: '30 min ago' },
  { id: '2', retailer: 'Musanze Corner Shop', items: 18, total: 235000, time: '1 hour ago' },
  { id: '3', retailer: 'Rubavu Store', items: 32, total: 567000, time: '2 hours ago' },
];

const creditDistribution = [
  { name: 'Good Standing', value: 65, color: '#22c55e' },
  { name: 'High Usage', value: 25, color: '#f97316' },
  { name: 'Critical', value: 10, color: '#ef4444' },
];

const lowStockItems = [
  { id: '1', sku: 'RICE-5KG', name: 'Rice (5kg)', stock: 120, threshold: 200 },
  { id: '2', sku: 'OIL-1L', name: 'Cooking Oil (1L)', stock: 85, threshold: 150 },
  { id: '3', sku: 'SUGAR-1KG', name: 'Sugar (1kg)', stock: 45, threshold: 100 },
];

export const DashboardPage = () => {
  const orderColumns = [
    { title: 'Retailer', dataIndex: 'retailer', key: 'retailer' },
    { title: 'Items', dataIndex: 'items', key: 'items' },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => `${value.toLocaleString()} RWF`,
    },
    { title: 'Time', dataIndex: 'time', key: 'time' },
  ];

  const retailerColumns = [
    { title: 'Retailer', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: 'Orders', dataIndex: 'orders', key: 'orders' },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => `${(value / 1000000).toFixed(1)}M RWF`,
    },
    {
      title: 'Trend',
      dataIndex: 'trend',
      key: 'trend',
      render: (trend: string) => (
        <span style={{ color: trend.startsWith('+') ? '#22c55e' : '#ef4444' }}>
          {trend}
        </span>
      ),
    },
  ];

  const stockColumns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v: string) => <code>{v}</code> },
    { title: 'Product', dataIndex: 'name', key: 'name' },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number, record: any) => (
        <span style={{ color: stock < record.threshold / 2 ? '#ef4444' : '#f97316' }}>
          {stock} units
        </span>
      ),
    },
    { title: 'Threshold', dataIndex: 'threshold', key: 'threshold' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>Wholesaler Dashboard</Title>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="This Week's Revenue"
              value={22300000}
              suffix="RWF"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <RiseOutlined /> +18% from last week
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Orders"
              value={12}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#f97316' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              3 need urgent processing
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Retailers"
              value={48}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#7c3aed' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              5 new this month
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Credit Requests"
              value={4}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#f97316' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Pending approval
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={16}>
          <Card title="Weekly Sales Revenue">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} RWF`} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Retailer Credit Health" style={{ height: '100%' }}>
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
          </Card>
        </Col>
      </Row>

      {/* Tables Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} lg={12}>
          <Card
            title="Pending Orders"
            extra={<a href="/orders">View All</a>}
          >
            <Table
              dataSource={pendingOrders}
              columns={orderColumns}
              pagination={false}
              size="small"
              rowKey="id"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Top Retailers"
            extra={<a href="/retailers">View All</a>}
          >
            <Table
              dataSource={topRetailers}
              columns={retailerColumns}
              pagination={false}
              size="small"
              rowKey="name"
            />
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
            extra={<a href="/inventory">Manage Inventory</a>}
          >
            <Table
              dataSource={lowStockItems}
              columns={stockColumns}
              pagination={false}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
