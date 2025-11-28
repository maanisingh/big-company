import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table,
  Space,
  Card,
  Typography,
  Descriptions,
  Button,
  Tag,
  Steps,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Modal,
  message,
  Spin,
  Statistic,
  Divider,
  Timeline,
  Empty,
  Tabs,
  Form,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  PrinterOutlined,
  TruckOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { ordersApi } from '../../lib/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Order {
  id: string;
  display_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'wallet' | 'nfc' | 'credit';
  payment_status: 'pending' | 'paid' | 'refunded';
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
}

interface OrderStats {
  pending: number;
  processing: number;
  ready: number;
  completed_today: number;
  cancelled_today: number;
  total_revenue_today: number;
}

const statusColors: Record<string, string> = {
  pending: 'orange',
  processing: 'blue',
  ready: 'cyan',
  completed: 'green',
  cancelled: 'red',
};

const paymentColors: Record<string, string> = {
  cash: 'green',
  wallet: 'blue',
  nfc: 'purple',
  credit: 'orange',
};

const paymentLabels: Record<string, string> = {
  cash: 'Cash',
  wallet: 'Wallet',
  nfc: 'NFC Card',
  credit: 'Credit',
};

export const OrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<OrderStats | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Action modal
  const [actionModal, setActionModal] = useState<{
    visible: boolean;
    order: Order | null;
    action: 'accept' | 'reject' | 'ready' | 'complete' | 'cancel' | null;
  }>({ visible: false, order: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    loadOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadOrders(true), 30000);
    return () => clearInterval(interval);
  }, [statusFilter, paymentFilter, pagination.current]);

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await ordersApi.getOrders({
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
        search: searchTerm || undefined,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      });

      setOrders(data.orders || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));

      // Calculate stats
      const allOrders = data.orders || [];
      setStats({
        pending: allOrders.filter((o: Order) => o.status === 'pending').length,
        processing: allOrders.filter((o: Order) => o.status === 'processing').length,
        ready: allOrders.filter((o: Order) => o.status === 'ready').length,
        completed_today: allOrders.filter((o: Order) => o.status === 'completed').length,
        cancelled_today: allOrders.filter((o: Order) => o.status === 'cancelled').length,
        total_revenue_today: allOrders
          .filter((o: Order) => o.status === 'completed')
          .reduce((sum: number, o: Order) => sum + o.total, 0),
      });
    } catch (error) {
      console.error('Failed to load orders:', error);
      message.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal.order || !actionModal.action) return;

    setActionLoading(true);
    try {
      const { order, action } = actionModal;

      switch (action) {
        case 'accept':
          await ordersApi.updateOrderStatus(order.id, 'processing', actionNotes);
          message.success('Order accepted');
          break;
        case 'reject':
        case 'cancel':
          if (!actionNotes.trim()) {
            message.error('Please provide a reason');
            setActionLoading(false);
            return;
          }
          await ordersApi.cancelOrder(order.id, actionNotes);
          message.success('Order cancelled');
          break;
        case 'ready':
          await ordersApi.updateOrderStatus(order.id, 'ready', actionNotes);
          message.success('Order marked as ready');
          break;
        case 'complete':
          await ordersApi.fulfillOrder(order.id);
          message.success('Order completed');
          break;
      }

      setActionModal({ visible: false, order: null, action: null });
      setActionNotes('');
      loadOrders();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getActionTitle = () => {
    switch (actionModal.action) {
      case 'accept': return 'Accept Order';
      case 'reject': return 'Reject Order';
      case 'ready': return 'Mark as Ready';
      case 'complete': return 'Complete Order';
      case 'cancel': return 'Cancel Order';
      default: return 'Order Action';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-RW', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return formatDate(dateString);
  };

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'display_id',
      key: 'display_id',
      render: (value: string, record: Order) => (
        <Button type="link" onClick={() => navigate(`/orders/${record.id}`)}>
          <Text strong>#{value || record.id.slice(0, 8)}</Text>
        </Button>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (name: string, record: Order) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.customer_phone}</Text>
        </div>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_: any, record: Order) => (
        <Badge count={record.items?.length || 0} showZero>
          <ShoppingCartOutlined style={{ fontSize: 18 }} />
        </Badge>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => (
        <Text strong style={{ color: '#0ea5e9' }}>{value.toLocaleString()} RWF</Text>
      ),
      sorter: (a: Order, b: Order) => a.total - b.total,
    },
    {
      title: 'Payment',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (value: string) => (
        <Tag color={paymentColors[value] || 'default'}>
          {paymentLabels[value] || value?.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Cash', value: 'cash' },
        { text: 'Wallet', value: 'wallet' },
        { text: 'NFC Card', value: 'nfc' },
        { text: 'Credit', value: 'credit' },
      ],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={statusColors[value] || 'default'}>
          {value?.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Processing', value: 'processing' },
        { text: 'Ready', value: 'ready' },
        { text: 'Completed', value: 'completed' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => (
        <div>
          <Text>{getRelativeTime(value)}</Text>
        </div>
      ),
      sorter: (a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Order) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${record.id}`)}
          />
          {record.status === 'pending' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => setActionModal({ visible: true, order: record, action: 'accept' })}
              >
                Accept
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setActionModal({ visible: true, order: record, action: 'reject' })}
              >
                Reject
              </Button>
            </>
          )}
          {record.status === 'processing' && (
            <Button
              type="primary"
              size="small"
              onClick={() => setActionModal({ visible: true, order: record, action: 'ready' })}
            >
              Ready
            </Button>
          )}
          {record.status === 'ready' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => setActionModal({ visible: true, order: record, action: 'complete' })}
            >
              Complete
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Orders</Title>
        <Button
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={() => loadOrders(true)}
          loading={refreshing}
        >
          Refresh
        </Button>
      </Row>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="Pending"
                value={stats.pending}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="Processing"
                value={stats.processing}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="Ready"
                value={stats.ready}
                valueStyle={{ color: '#13c2c2' }}
                prefix={<TruckOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="Completed"
                value={stats.completed_today}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="Cancelled"
                value={stats.cancelled_today}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="Revenue"
                value={stats.total_revenue_today}
                suffix="RWF"
                valueStyle={{ color: '#3f8600', fontSize: '16px' }}
                prefix={<DollarOutlined />}
                formatter={(value) => value?.toLocaleString()}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input.Search
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={() => loadOrders()}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="">All Status</Select.Option>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="processing">Processing</Select.Option>
              <Select.Option value="ready">Ready</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="Payment"
              value={paymentFilter}
              onChange={setPaymentFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="">All Payments</Select.Option>
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="wallet">Wallet</Select.Option>
              <Select.Option value="nfc">NFC Card</Select.Option>
              <Select.Option value="credit">Credit</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} orders`,
            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
          }}
          rowClassName={(record) =>
            record.status === 'pending' ? 'ant-table-row-pending' : ''
          }
        />
      </Card>

      {/* Action Modal */}
      <Modal
        title={getActionTitle()}
        open={actionModal.visible}
        onCancel={() => {
          setActionModal({ visible: false, order: null, action: null });
          setActionNotes('');
        }}
        onOk={handleAction}
        confirmLoading={actionLoading}
        okText={actionModal.action === 'reject' || actionModal.action === 'cancel' ? 'Confirm Cancel' : 'Confirm'}
        okButtonProps={{
          danger: actionModal.action === 'reject' || actionModal.action === 'cancel',
        }}
      >
        {actionModal.order && (
          <div>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Order">
                #{actionModal.order.display_id || actionModal.order.id.slice(0, 8)}
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                {actionModal.order.customer_name}
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                <Text strong>{actionModal.order.total.toLocaleString()} RWF</Text>
              </Descriptions.Item>
            </Descriptions>

            {(actionModal.action === 'reject' || actionModal.action === 'cancel') && (
              <Form.Item
                label="Reason"
                required
                style={{ marginBottom: 0 }}
              >
                <Input.TextArea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                />
              </Form.Item>
            )}

            {(actionModal.action === 'accept' || actionModal.action === 'ready') && (
              <Form.Item
                label="Notes (optional)"
                style={{ marginBottom: 0 }}
              >
                <Input.TextArea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={2}
                />
              </Form.Item>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .ant-table-row-pending {
          background-color: #fff7e6;
        }
        .ant-table-row-pending:hover > td {
          background-color: #fff1b8 !important;
        }
      `}</style>
    </div>
  );
};

export const OrderShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await ordersApi.getOrder(id);
      setOrder(data.order || data);
    } catch (error) {
      console.error('Failed to load order:', error);
      message.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    const steps = ['pending', 'processing', 'ready', 'completed'];
    const index = steps.indexOf(status);
    return index >= 0 ? index : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-RW');
  };

  const printReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <Card>
        <Empty description="Order not found" />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <div>
          <Button type="link" onClick={() => navigate('/orders')} style={{ padding: 0 }}>
            ← Back to Orders
          </Button>
          <Title level={3} style={{ margin: '8px 0 0 0' }}>
            Order #{order.display_id || order.id.slice(0, 8)}
          </Title>
        </div>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={printReceipt}>
            Print Receipt
          </Button>
          <Button onClick={loadOrder} icon={<ReloadOutlined />}>
            Refresh
          </Button>
        </Space>
      </Row>

      {/* Status Steps */}
      {order.status !== 'cancelled' && (
        <Card style={{ marginBottom: 24 }}>
          <Steps
            current={getStatusStep(order.status)}
            items={[
              { title: 'Pending', description: 'Order placed' },
              { title: 'Processing', description: 'Being prepared' },
              { title: 'Ready', description: 'Ready for pickup' },
              { title: 'Completed', description: 'Order fulfilled' },
            ]}
          />
        </Card>
      )}

      {order.status === 'cancelled' && (
        <Card style={{ marginBottom: 24, borderColor: '#ff4d4f' }}>
          <Row align="middle" gutter={16}>
            <Col>
              <ExclamationCircleOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
            </Col>
            <Col>
              <Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>Order Cancelled</Title>
              {order.cancel_reason && (
                <Text type="secondary">Reason: {order.cancel_reason}</Text>
              )}
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={24}>
        {/* Order Details */}
        <Col span={16}>
          <Card title="Order Details" style={{ marginBottom: 24 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="Order ID">
                {order.display_id || order.id.slice(0, 8)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[order.status]}>
                  {order.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                {order.customer_name}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {order.customer_phone}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag color={paymentColors[order.payment_method]}>
                  {paymentLabels[order.payment_method]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag color={order.payment_status === 'paid' ? 'green' : 'orange'}>
                  {order.payment_status?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatDate(order.created_at)}
              </Descriptions.Item>
              {order.completed_at && (
                <Descriptions.Item label="Completed">
                  {formatDate(order.completed_at)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Order Items */}
          <Card title="Order Items">
            <Table
              dataSource={order.items}
              pagination={false}
              rowKey="id"
              columns={[
                {
                  title: 'Product',
                  dataIndex: 'product_name',
                  key: 'product_name',
                  render: (name: string, record: OrderItem) => (
                    <div>
                      <Text strong>{name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>{record.sku}</Text>
                    </div>
                  ),
                },
                {
                  title: 'Quantity',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  align: 'center',
                },
                {
                  title: 'Unit Price',
                  dataIndex: 'unit_price',
                  key: 'unit_price',
                  render: (value: number) => `${value.toLocaleString()} RWF`,
                  align: 'right',
                },
                {
                  title: 'Total',
                  dataIndex: 'total',
                  key: 'total',
                  render: (value: number) => (
                    <Text strong>{value.toLocaleString()} RWF</Text>
                  ),
                  align: 'right',
                },
              ]}
              summary={() => (
                <>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text>Subtotal</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text>{order.subtotal?.toLocaleString()} RWF</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  {order.discount > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <Text type="success">Discount</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text type="success">-{order.discount?.toLocaleString()} RWF</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Title level={4} style={{ margin: 0 }}>Total</Title>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Title level={4} style={{ margin: 0, color: '#0ea5e9' }}>
                        {order.total?.toLocaleString()} RWF
                      </Title>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </>
              )}
            />
          </Card>
        </Col>

        {/* Sidebar */}
        <Col span={8}>
          {/* Summary */}
          <Card title="Summary" style={{ marginBottom: 24 }}>
            <Row gutter={[0, 16]}>
              <Col span={24}>
                <Statistic
                  title="Order Total"
                  value={order.total}
                  suffix="RWF"
                  valueStyle={{ color: '#0ea5e9' }}
                  formatter={(value) => value?.toLocaleString()}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Items"
                  value={order.items?.length || 0}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Quantity"
                  value={order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                />
              </Col>
            </Row>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card title="Notes" style={{ marginBottom: 24 }}>
              <Text>{order.notes}</Text>
            </Card>
          )}

          {/* Timeline */}
          <Card title="Activity">
            <Timeline
              items={[
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>Order Created</Text>
                      <br />
                      <Text type="secondary">{formatDate(order.created_at)}</Text>
                    </>
                  ),
                },
                ...(order.status !== 'pending' ? [{
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>Order Accepted</Text>
                      <br />
                      <Text type="secondary">Processing started</Text>
                    </>
                  ),
                }] : []),
                ...(order.status === 'ready' || order.status === 'completed' ? [{
                  color: 'cyan',
                  children: (
                    <>
                      <Text strong>Order Ready</Text>
                      <br />
                      <Text type="secondary">Ready for pickup</Text>
                    </>
                  ),
                }] : []),
                ...(order.status === 'completed' && order.completed_at ? [{
                  color: 'green',
                  children: (
                    <>
                      <Text strong>Order Completed</Text>
                      <br />
                      <Text type="secondary">{formatDate(order.completed_at)}</Text>
                    </>
                  ),
                }] : []),
                ...(order.status === 'cancelled' && order.cancelled_at ? [{
                  color: 'red',
                  children: (
                    <>
                      <Text strong>Order Cancelled</Text>
                      <br />
                      <Text type="secondary">{formatDate(order.cancelled_at)}</Text>
                      {order.cancel_reason && (
                        <>
                          <br />
                          <Text type="secondary">Reason: {order.cancel_reason}</Text>
                        </>
                      )}
                    </>
                  ),
                }] : []),
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderList;
