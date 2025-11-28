import { useEffect, useState } from 'react';
import { List, ShowButton, NumberField } from '@refinedev/antd';
import {
  Table,
  Space,
  Card,
  Typography,
  Descriptions,
  Button,
  Tag,
  Progress,
  Statistic,
  Row,
  Col,
  Spin,
  Alert,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Tabs,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReloadOutlined,
  TeamOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { retailersApi } from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Retailer {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  location: string;
  address: string;
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  status: 'active' | 'inactive' | 'blocked' | 'pending';
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  on_time_payments: number;
  late_payments: number;
  last_order_date?: string;
  joined_at: string;
}

interface RetailerOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_type: string;
  items_count: number;
  created_at: string;
}

interface RetailerStats {
  total_retailers: number;
  active_retailers: number;
  new_this_month: number;
  total_credit_extended: number;
  total_credit_used: number;
  credit_utilization: number;
}

export const RetailersList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [stats, setStats] = useState<RetailerStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [creditFilter, setCreditFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Modals
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [form] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRetailers = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await retailersApi.getRetailers({
        status: statusFilter as any || undefined,
        credit_status: creditFilter as any || undefined,
        search: searchQuery || undefined,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      });

      setRetailers(data.retailers || []);
      setPagination(prev => ({ ...prev, total: data.total || 0 }));

      // Calculate stats from data
      const totalRetailers = data.total || 0;
      const activeCount = data.retailers?.filter((r: Retailer) => r.status === 'active').length || 0;
      setStats({
        total_retailers: totalRetailers,
        active_retailers: activeCount,
        new_this_month: data.new_this_month || 0,
        total_credit_extended: data.total_credit_extended || 0,
        total_credit_used: data.total_credit_used || 0,
        credit_utilization: data.credit_utilization || 0,
      });
    } catch (err: any) {
      console.error('Retailers error:', err);
      setError(err.response?.data?.error || 'Failed to load retailers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, [statusFilter, creditFilter, searchQuery, pagination.current, pagination.pageSize]);

  const getCreditStatus = (used: number, limit: number) => {
    if (limit === 0) return { color: 'default', text: 'No Credit', status: 'normal' as const };
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return { color: 'red', text: 'Critical', status: 'exception' as const };
    if (percentage >= 70) return { color: 'orange', text: 'High Usage', status: 'normal' as const };
    return { color: 'green', text: 'Good', status: 'success' as const };
  };

  const handleUpdateCreditLimit = async () => {
    if (!selectedRetailer) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await retailersApi.updateRetailerCreditLimit(selectedRetailer.id, values.credit_limit);
      message.success('Credit limit updated successfully');
      setCreditModalOpen(false);
      setSelectedRetailer(null);
      form.resetFields();
      fetchRetailers(true);
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || 'Failed to update credit limit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockRetailer = async () => {
    if (!selectedRetailer) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await retailersApi.blockRetailer(selectedRetailer.id, values.reason);
      message.success('Retailer blocked successfully');
      setBlockModalOpen(false);
      setSelectedRetailer(null);
      form.resetFields();
      fetchRetailers(true);
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || 'Failed to block retailer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockRetailer = async (retailer: Retailer) => {
    try {
      await retailersApi.unblockRetailer(retailer.id);
      message.success('Retailer unblocked successfully');
      fetchRetailers(true);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to unblock retailer');
    }
  };

  const columns = [
    {
      title: 'Business Name',
      dataIndex: 'business_name',
      key: 'business_name',
      render: (value: string, record: Retailer) => (
        <div>
          <div><strong>{value}</strong></div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.owner_name}</Text>
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Credit Usage',
      key: 'credit',
      render: (_: any, record: Retailer) => {
        if (record.credit_limit === 0) {
          return <Text type="secondary">No credit line</Text>;
        }
        const percentage = (record.credit_used / record.credit_limit) * 100;
        const status = getCreditStatus(record.credit_used, record.credit_limit);
        return (
          <div style={{ width: 180 }}>
            <Progress
              percent={Math.min(percentage, 100)}
              size="small"
              status={status.status}
              format={() => `${record.credit_used.toLocaleString()} / ${record.credit_limit.toLocaleString()}`}
            />
          </div>
        );
      },
    },
    {
      title: 'Orders',
      dataIndex: 'total_orders',
      key: 'total_orders',
      render: (value: number, record: Retailer) => (
        <div>
          <div>{value}</div>
          {record.pending_orders > 0 && (
            <Tag color="orange" style={{ fontSize: '10px' }}>{record.pending_orders} pending</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Revenue',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      render: (value: number) => (
        <Text strong style={{ color: '#7c3aed' }}>
          {value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value.toLocaleString()} RWF
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => {
        const colors: Record<string, string> = {
          active: 'green',
          inactive: 'default',
          blocked: 'red',
          pending: 'orange',
        };
        return <Tag color={colors[value] || 'default'}>{value.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Retailer) => (
        <Space>
          <ShowButton hideText size="small" recordItemId={record.id} />
          <Button
            size="small"
            onClick={() => {
              setSelectedRetailer(record);
              form.setFieldsValue({ credit_limit: record.credit_limit });
              setCreditModalOpen(true);
            }}
          >
            Credit
          </Button>
          {record.status === 'active' ? (
            <Button
              size="small"
              danger
              onClick={() => {
                setSelectedRetailer(record);
                form.resetFields();
                setBlockModalOpen(true);
              }}
            >
              Block
            </Button>
          ) : record.status === 'blocked' ? (
            <Button
              size="small"
              type="primary"
              ghost
              onClick={() => handleUnblockRetailer(record)}
            >
              Unblock
            </Button>
          ) : null}
        </Space>
      ),
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
        <Title level={3} style={{ margin: 0 }}>Retailers</Title>
        <Button
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={() => fetchRetailers(true)}
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
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Retailers"
              value={stats?.total_retailers || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Active"
              value={stats?.active_retailers || 0}
              valueStyle={{ color: '#22c55e' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Credit Extended"
              value={stats?.total_credit_extended || 0}
              suffix="RWF"
              prefix={<DollarOutlined />}
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Credit Utilization"
              value={stats?.credit_utilization || 0}
              suffix="%"
              valueStyle={{ color: (stats?.credit_utilization || 0) > 70 ? '#f97316' : '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Input.Search
            placeholder="Search retailers..."
            allowClear
            style={{ width: 200 }}
            onSearch={(value) => {
              setSearchQuery(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
          />
        </Space>
      </Card>

      {/* Retailers Table */}
      <Card>
        <Table
          dataSource={retailers}
          columns={columns}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} retailers`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }));
            },
          }}
        />
      </Card>

      {/* Credit Limit Modal */}
      <Modal
        title={`Adjust Credit Limit: ${selectedRetailer?.business_name}`}
        open={creditModalOpen}
        onCancel={() => {
          setCreditModalOpen(false);
          setSelectedRetailer(null);
          form.resetFields();
        }}
        onOk={handleUpdateCreditLimit}
        confirmLoading={actionLoading}
        okText="Update Credit Limit"
      >
        {selectedRetailer && (
          <div style={{ marginBottom: '16px' }}>
            <Text>Current Credit Used: <strong>{selectedRetailer.credit_used.toLocaleString()} RWF</strong></Text>
            <br />
            <Text>Current Limit: <strong>{selectedRetailer.credit_limit.toLocaleString()} RWF</strong></Text>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="credit_limit"
            label="New Credit Limit (RWF)"
            rules={[{ required: true, message: 'Enter credit limit' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Block Retailer Modal */}
      <Modal
        title={`Block Retailer: ${selectedRetailer?.business_name}`}
        open={blockModalOpen}
        onCancel={() => {
          setBlockModalOpen(false);
          setSelectedRetailer(null);
          form.resetFields();
        }}
        onOk={handleBlockRetailer}
        confirmLoading={actionLoading}
        okText="Block Retailer"
        okButtonProps={{ danger: true }}
      >
        <Alert
          message="Warning"
          description="Blocking this retailer will prevent them from placing new orders and using credit."
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="Reason for Blocking"
            rules={[{ required: true, message: 'Please provide a reason' }]}
          >
            <TextArea rows={4} placeholder="Enter the reason for blocking this retailer..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export const RetailerShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [recentOrders, setRecentOrders] = useState<RetailerOrder[]>([]);
  const [retailerStats, setRetailerStats] = useState<any>(null);

  const fetchRetailer = async () => {
    setLoading(true);
    setError(null);
    try {
      const [retailerData, ordersData, statsData] = await Promise.all([
        retailersApi.getRetailer(id!),
        retailersApi.getRetailerOrders(id!, 10),
        retailersApi.getRetailerStats(id!),
      ]);
      setRetailer(retailerData);
      setRecentOrders(ordersData.orders || []);
      setRetailerStats(statsData);
    } catch (err: any) {
      console.error('Retailer fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load retailer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchRetailer();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !retailer) {
    return (
      <Alert
        message="Error"
        description={error || 'Retailer not found'}
        type="error"
        showIcon
        action={<Button onClick={() => navigate('/retailers')}>Back to Retailers</Button>}
      />
    );
  }

  const creditUsagePercentage = retailer.credit_limit > 0
    ? (retailer.credit_used / retailer.credit_limit) * 100
    : 0;
  const paymentSuccessRate = retailer.total_orders > 0
    ? ((retailer.on_time_payments / retailer.total_orders) * 100).toFixed(1)
    : 0;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>{retailer.business_name}</Title>
          <Text type="secondary">{retailer.owner_name} • {retailer.location}</Text>
        </div>
        <Tag
          color={retailer.status === 'active' ? 'green' : retailer.status === 'blocked' ? 'red' : 'default'}
          style={{ fontSize: '14px', padding: '4px 12px' }}
        >
          {retailer.status.toUpperCase()}
        </Tag>
      </div>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={retailer.total_orders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#7c3aed' }}
            />
            {retailer.pending_orders > 0 && (
              <Tag color="orange" style={{ marginTop: '8px' }}>{retailer.pending_orders} pending</Tag>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={retailer.total_revenue}
              suffix="RWF"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#22c55e' }}
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Credit Limit"
              value={retailer.credit_limit}
              suffix="RWF"
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Payment Success"
              value={paymentSuccessRate}
              suffix="%"
              valueStyle={{ color: Number(paymentSuccessRate) >= 90 ? '#22c55e' : '#f97316' }}
            />
            {retailer.late_payments > 0 && (
              <Text type="danger" style={{ fontSize: '12px' }}>{retailer.late_payments} late payments</Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* Business Details */}
          <Card title="Business Details" style={{ marginBottom: '16px' }}>
            <Descriptions column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Business Name">{retailer.business_name}</Descriptions.Item>
              <Descriptions.Item label="Owner">{retailer.owner_name}</Descriptions.Item>
              <Descriptions.Item label="Email">{retailer.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{retailer.phone}</Descriptions.Item>
              <Descriptions.Item label="Location">{retailer.location}</Descriptions.Item>
              <Descriptions.Item label="Address">{retailer.address}</Descriptions.Item>
              <Descriptions.Item label="Member Since">{retailer.joined_at}</Descriptions.Item>
              <Descriptions.Item label="Last Order">
                {retailer.last_order_date || 'Never'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={retailer.status === 'active' ? 'green' : 'red'}>
                  {retailer.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Recent Orders */}
          <Card title="Recent Orders" extra={<a href={`/orders?retailer_id=${retailer.id}`}>View All</a>}>
            <Table
              dataSource={recentOrders}
              pagination={false}
              rowKey="id"
              columns={[
                {
                  title: 'Order #',
                  dataIndex: 'order_number',
                  key: 'order_number',
                  render: (v: string) => <Text code>{v}</Text>,
                },
                {
                  title: 'Items',
                  dataIndex: 'items_count',
                  key: 'items_count',
                },
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
                  render: (value: string) => {
                    const colors: Record<string, string> = {
                      pending: 'orange',
                      confirmed: 'blue',
                      shipped: 'purple',
                      delivered: 'green',
                      cancelled: 'red',
                    };
                    return <Tag color={colors[value] || 'default'}>{value.toUpperCase()}</Tag>;
                  },
                },
                {
                  title: 'Date',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (v: string) => new Date(v).toLocaleDateString(),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Credit Status */}
          <Card title="Credit Status" style={{ marginBottom: '16px' }}>
            {retailer.credit_limit > 0 ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <Text>Credit Utilization</Text>
                  <Progress
                    percent={Math.min(creditUsagePercentage, 100)}
                    status={creditUsagePercentage >= 90 ? 'exception' : creditUsagePercentage >= 70 ? 'normal' : 'success'}
                    format={() => `${creditUsagePercentage.toFixed(1)}%`}
                  />
                </div>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Credit Limit">
                    {retailer.credit_limit.toLocaleString()} RWF
                  </Descriptions.Item>
                  <Descriptions.Item label="Credit Used">
                    <Text type={creditUsagePercentage >= 70 ? 'danger' : undefined}>
                      {retailer.credit_used.toLocaleString()} RWF
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Available">
                    <Text type="success">
                      {retailer.credit_available.toLocaleString()} RWF
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </>
            ) : (
              <Text type="secondary">No credit line assigned</Text>
            )}
            <div style={{ marginTop: '16px' }}>
              <Button type="primary" block>
                Adjust Credit Limit
              </Button>
            </div>
          </Card>

          {/* Payment History */}
          <Card title="Payment History">
            <div style={{ marginBottom: '16px' }}>
              <Text>On-Time Payment Rate</Text>
              <Progress
                percent={Number(paymentSuccessRate)}
                status={Number(paymentSuccessRate) >= 90 ? 'success' : Number(paymentSuccessRate) >= 75 ? 'normal' : 'exception'}
                format={() => `${retailer.on_time_payments}/${retailer.total_orders}`}
              />
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="On Time"
                  value={retailer.on_time_payments}
                  valueStyle={{ color: '#22c55e', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Late"
                  value={retailer.late_payments}
                  valueStyle={{ color: retailer.late_payments > 0 ? '#ef4444' : '#22c55e', fontSize: '20px' }}
                />
              </Col>
            </Row>
          </Card>

          {/* Actions */}
          <Card title="Actions" style={{ marginTop: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block>View Credit History</Button>
              <Button block>Contact Retailer</Button>
              {retailer.status === 'active' ? (
                <Button block danger>Block Retailer</Button>
              ) : retailer.status === 'blocked' ? (
                <Button block type="primary">Unblock Retailer</Button>
              ) : null}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RetailersList;
