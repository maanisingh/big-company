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
  Modal,
  message,
  Spin,
  Statistic,
  Timeline,
  Empty,
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
import { retailerApi } from '../../services/apiService';

const { Title, Text } = Typography;

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

export const OrdersPage = () => {
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

  // View modal
  const [viewModal, setViewModal] = useState<{ visible: boolean; order: Order | null }>({
    visible: false,
    order: null,
  });
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(true), 30000);
    return () => clearInterval(interval);
  }, [statusFilter, paymentFilter, pagination.current]);

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await retailerApi.getOrders({
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
        search: searchTerm || undefined,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      });

      const data = response.data;
      setOrders(data.orders || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));

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

  const loadOrderDetail = async (orderId: string) => {
    setViewLoading(true);
    try {
      const response = await retailerApi.getOrder(orderId);
      const order = response.data.order || response.data;
      setViewModal({ visible: true, order });
    } catch (error) {
      console.error('Failed to load order:', error);
      message.error('Failed to load order details');
    } finally {
      setViewLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal.order || !actionModal.action) return;

    setActionLoading(true);
    try {
      const { order, action } = actionModal;

      switch (action) {
        case 'accept':
          await retailerApi.updateOrderStatus(order.id, 'processing', actionNotes);
          message.success('Order accepted');
          break;
        case 'reject':
        case 'cancel':
          if (!actionNotes.trim()) {
            message.error('Please provide a reason');
            setActionLoading(false);
            return;
          }
          await retailerApi.cancelOrder(order.id, actionNotes);
          message.success('Order cancelled');
          break;
        case 'ready':
          await retailerApi.updateOrderStatus(order.id, 'ready', actionNotes);
          message.success('Order marked as ready');
          break;
        case 'complete':
          await retailerApi.fulfillOrder(order.id);
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
        <Button type="link" onClick={() => loadOrderDetail(record.id)}>
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
        <Text strong style={{ color: '#0ea5e9' }}>{value?.toLocaleString()} RWF</Text>
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
    },
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => <Text>{getRelativeTime(value)}</Text>,
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
            onClick={() => loadOrderDetail(record.id)}
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
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Pending"
                value={stats.pending}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Processing"
                value={stats.processing}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Ready"
                value={stats.ready}
                valueStyle={{ color: '#13c2c2' }}
                prefix={<TruckOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Completed"
                value={stats.completed_today}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title="Cancelled"
                value={stats.cancelled_today}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
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
          <Col xs={24} sm={12} md={6}>
            <Input.Search
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={() => loadOrders()}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
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
          <Col xs={12} sm={6} md={4}>
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
          scroll={{ x: 'max-content' }}
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
                <Text strong>{actionModal.order.total?.toLocaleString()} RWF</Text>
              </Descriptions.Item>
            </Descriptions>

            {(actionModal.action === 'reject' || actionModal.action === 'cancel') && (
              <Form.Item label="Reason" required style={{ marginBottom: 0 }}>
                <Input.TextArea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                />
              </Form.Item>
            )}

            {(actionModal.action === 'accept' || actionModal.action === 'ready') && (
              <Form.Item label="Notes (optional)" style={{ marginBottom: 0 }}>
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

      {/* View Order Modal */}
      <Modal
        title={`Order #${viewModal.order?.display_id || viewModal.order?.id?.slice(0, 8) || ''}`}
        open={viewModal.visible}
        onCancel={() => setViewModal({ visible: false, order: null })}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print
          </Button>,
          <Button key="close" onClick={() => setViewModal({ visible: false, order: null })}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {viewLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : viewModal.order ? (
          <div>
            {/* Status Steps */}
            {viewModal.order.status !== 'cancelled' && (
              <Steps
                current={['pending', 'processing', 'ready', 'completed'].indexOf(viewModal.order.status)}
                size="small"
                style={{ marginBottom: 24 }}
                items={[
                  { title: 'Pending' },
                  { title: 'Processing' },
                  { title: 'Ready' },
                  { title: 'Completed' },
                ]}
              />
            )}

            {viewModal.order.status === 'cancelled' && (
              <div style={{ background: '#fff1f0', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                <Text strong style={{ color: '#ff4d4f' }}>Order Cancelled</Text>
                {viewModal.order.cancel_reason && (
                  <div><Text type="secondary">Reason: {viewModal.order.cancel_reason}</Text></div>
                )}
              </div>
            )}

            <Descriptions column={2} size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Customer">{viewModal.order.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{viewModal.order.customer_phone}</Descriptions.Item>
              <Descriptions.Item label="Payment">
                <Tag color={paymentColors[viewModal.order.payment_method]}>
                  {paymentLabels[viewModal.order.payment_method]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[viewModal.order.status]}>
                  {viewModal.order.status?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Created">{formatDate(viewModal.order.created_at)}</Descriptions.Item>
              {viewModal.order.completed_at && (
                <Descriptions.Item label="Completed">{formatDate(viewModal.order.completed_at)}</Descriptions.Item>
              )}
            </Descriptions>

            <Table
              dataSource={viewModal.order.items}
              pagination={false}
              rowKey="id"
              size="small"
              columns={[
                {
                  title: 'Product',
                  dataIndex: 'product_name',
                  key: 'product_name',
                },
                {
                  title: 'Qty',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  align: 'center',
                },
                {
                  title: 'Price',
                  dataIndex: 'unit_price',
                  key: 'unit_price',
                  render: (value: number) => `${value?.toLocaleString()} RWF`,
                  align: 'right',
                },
                {
                  title: 'Total',
                  dataIndex: 'total',
                  key: 'total',
                  render: (value: number) => <Text strong>{value?.toLocaleString()} RWF</Text>,
                  align: 'right',
                },
              ]}
              summary={() => (
                <>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}><Text>Subtotal</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text>{viewModal.order?.subtotal?.toLocaleString()} RWF</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  {(viewModal.order?.discount || 0) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><Text type="success">Discount</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text type="success">-{viewModal.order?.discount?.toLocaleString()} RWF</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}><Title level={5} style={{ margin: 0 }}>Total</Title></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Title level={5} style={{ margin: 0, color: '#0ea5e9' }}>
                        {viewModal.order?.total?.toLocaleString()} RWF
                      </Title>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </>
              )}
            />
          </div>
        ) : (
          <Empty description="Order not found" />
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

export default OrdersPage;
