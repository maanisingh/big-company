import { List, ShowButton, NumberField } from '@refinedev/antd';
import { Table, Space, Card, Typography, Descriptions, Button, Tag, Progress, Statistic, Row, Col } from 'antd';
import { useParams } from 'react-router-dom';

const { Title } = Typography;

// Mock retailers data
const mockRetailers = [
  {
    id: '1',
    business_name: 'Kigali Mini Mart',
    owner_name: 'Jean Pierre',
    phone: '+250788123456',
    location: 'Kigali, Nyarugenge',
    credit_limit: 500000,
    credit_used: 150000,
    status: 'active',
    total_orders: 45,
    total_revenue: 2500000,
    joined_at: '2023-06-15',
  },
  {
    id: '2',
    business_name: 'Musanze Corner Shop',
    owner_name: 'Marie Claire',
    phone: '+250788654321',
    location: 'Musanze',
    credit_limit: 300000,
    credit_used: 280000,
    status: 'active',
    total_orders: 28,
    total_revenue: 1200000,
    joined_at: '2023-08-20',
  },
  {
    id: '3',
    business_name: 'Huye Supermarket',
    owner_name: 'Emmanuel',
    phone: '+250788999888',
    location: 'Huye',
    credit_limit: 1000000,
    credit_used: 0,
    status: 'active',
    total_orders: 62,
    total_revenue: 4500000,
    joined_at: '2023-03-10',
  },
];

export const RetailersList = () => {
  const getCreditStatus = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return { color: 'red', text: 'Critical' };
    if (percentage >= 70) return { color: 'orange', text: 'High Usage' };
    return { color: 'green', text: 'Good' };
  };

  const columns = [
    {
      title: 'Business Name',
      dataIndex: 'business_name',
      key: 'business_name',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: 'Owner',
      dataIndex: 'owner_name',
      key: 'owner_name',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Credit Usage',
      key: 'credit',
      render: (_: any, record: any) => {
        const percentage = (record.credit_used / record.credit_limit) * 100;
        return (
          <div style={{ width: 150 }}>
            <Progress
              percent={percentage}
              size="small"
              status={percentage >= 90 ? 'exception' : percentage >= 70 ? 'normal' : 'success'}
              format={() => `${record.credit_used.toLocaleString()} / ${record.credit_limit.toLocaleString()}`}
            />
          </div>
        );
      },
    },
    {
      title: 'Total Orders',
      dataIndex: 'total_orders',
      key: 'total_orders',
    },
    {
      title: 'Revenue',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (value: number) => `${value.toLocaleString()} RWF`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={value === 'active' ? 'green' : 'red'}>
          {value.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <ShowButton hideText size="small" recordItemId={record.id} />
          <Button size="small">Adjust Credit</Button>
        </Space>
      ),
    },
  ];

  return (
    <List>
      <Table dataSource={mockRetailers} columns={columns} rowKey="id" />
    </List>
  );
};

export const RetailerShow = () => {
  const { id } = useParams();
  const retailer = mockRetailers.find((r) => r.id === id) || mockRetailers[0];

  const recentOrders = [
    { id: '1', date: '2024-01-14', items: 15, total: 125000, status: 'completed' },
    { id: '2', date: '2024-01-10', items: 8, total: 67000, status: 'completed' },
    { id: '3', date: '2024-01-05', items: 22, total: 189000, status: 'completed' },
  ];

  const creditUsagePercentage = (retailer.credit_used / retailer.credit_limit) * 100;

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>{retailer.business_name}</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={retailer.total_orders}
              valueStyle={{ color: '#7c3aed' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={retailer.total_revenue}
              suffix="RWF"
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Credit Limit"
              value={retailer.credit_limit}
              suffix="RWF"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Credit Used"
              value={retailer.credit_used}
              suffix="RWF"
              valueStyle={{ color: creditUsagePercentage >= 70 ? '#f97316' : '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Business Details" style={{ marginBottom: '16px' }}>
        <Descriptions column={2}>
          <Descriptions.Item label="Business Name">{retailer.business_name}</Descriptions.Item>
          <Descriptions.Item label="Owner">{retailer.owner_name}</Descriptions.Item>
          <Descriptions.Item label="Phone">{retailer.phone}</Descriptions.Item>
          <Descriptions.Item label="Location">{retailer.location}</Descriptions.Item>
          <Descriptions.Item label="Member Since">{retailer.joined_at}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={retailer.status === 'active' ? 'green' : 'red'}>
              {retailer.status.toUpperCase()}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Credit Status" style={{ marginBottom: '16px' }}>
        <div style={{ maxWidth: 400 }}>
          <Progress
            percent={creditUsagePercentage}
            status={creditUsagePercentage >= 90 ? 'exception' : creditUsagePercentage >= 70 ? 'normal' : 'success'}
            format={() => `${retailer.credit_used.toLocaleString()} / ${retailer.credit_limit.toLocaleString()} RWF`}
          />
          <div style={{ marginTop: 16 }}>
            <Button type="primary">Increase Credit Limit</Button>
            <Button style={{ marginLeft: 8 }}>View Credit History</Button>
          </div>
        </div>
      </Card>

      <Card title="Recent Orders">
        <Table
          dataSource={recentOrders}
          pagination={false}
          rowKey="id"
          columns={[
            { title: 'Date', dataIndex: 'date', key: 'date' },
            { title: 'Items', dataIndex: 'items', key: 'items' },
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
              render: (value: string) => <Tag color="green">{value.toUpperCase()}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default RetailersList;
