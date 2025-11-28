import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  AppstoreOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const { Title } = Typography;

// Mock data
const salesData = [
  { date: 'Mon', sales: 45000 },
  { date: 'Tue', sales: 52000 },
  { date: 'Wed', sales: 38000 },
  { date: 'Thu', sales: 65000 },
  { date: 'Fri', sales: 78000 },
  { date: 'Sat', sales: 92000 },
  { date: 'Sun', sales: 55000 },
];

const recentOrders = [
  { id: '1', customer: 'John Doe', total: 12500, status: 'completed', time: '10 min ago' },
  { id: '2', customer: 'Jane Smith', total: 8700, status: 'pending', time: '25 min ago' },
  { id: '3', customer: 'Mike Johnson', total: 23400, status: 'processing', time: '1 hour ago' },
  { id: '4', customer: 'Sarah Williams', total: 5600, status: 'completed', time: '2 hours ago' },
];

const lowStockItems = [
  { id: '1', name: 'Rice (5kg)', stock: 12, threshold: 20 },
  { id: '2', name: 'Cooking Oil (1L)', stock: 8, threshold: 15 },
  { id: '3', name: 'Sugar (1kg)', stock: 5, threshold: 25 },
];

export const DashboardPage = () => {
  const orderColumns = [
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => `${value.toLocaleString()} RWF`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'completed' ? 'green' : status === 'pending' ? 'orange' : 'blue';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    { title: 'Time', dataIndex: 'time', key: 'time' },
  ];

  const stockColumns = [
    { title: 'Product', dataIndex: 'name', key: 'name' },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (stock: number, record: any) => (
        <span style={{ color: stock < record.threshold / 2 ? 'red' : 'orange' }}>
          {stock} units
        </span>
      ),
    },
    { title: 'Threshold', dataIndex: 'threshold', key: 'threshold' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>Dashboard</Title>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Sales"
              value={425000}
              suffix="RWF"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Orders Today"
              value={42}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Products"
              value={156}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Growth"
              value={12.5}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts and Tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Weekly Sales">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} RWF`} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Low Stock Alert" style={{ height: '100%' }}>
            <Table
              dataSource={lowStockItems}
              columns={stockColumns}
              pagination={false}
              size="small"
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24}>
          <Card title="Recent Orders">
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
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
