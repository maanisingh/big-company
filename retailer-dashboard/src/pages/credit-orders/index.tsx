import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  Spin,
  Alert,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Timeline,
  Divider,
  Badge,
  Progress,
  message,
  Tooltip,
} from 'antd';
import {
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  UserOutlined,
  PhoneOutlined,
  CalendarOutlined,
  BankOutlined,
  WarningOutlined,
  HistoryOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { creditApi } from '../../lib/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface CreditOrder {
  id: string;
  display_id: string;
  customer_name: string;
  customer_phone: string;
  customer_id: string;
  credit_score: number;
  credit_limit: number;
  total_amount: number;
  amount_paid: number;
  amount_pending: number;
  status: 'pending' | 'approved' | 'rejected' | 'repaid' | 'overdue';
  due_date: string;
  approved_date?: string;
  rejected_reason?: string;
  terms?: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  repayments: Array<{
    id: string;
    amount: number;
    payment_method: string;
    date: string;
    notes?: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface CreditStats {
  total_credit_extended: number;
  total_pending_approval: number;
  total_pending_amount: number;
  total_approved: number;
  total_approved_amount: number;
  total_repaid: number;
  total_repaid_amount: number;
  total_overdue: number;
  total_overdue_amount: number;
  average_credit_score: number;
  repayment_rate: number;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: 'orange', icon: <ClockCircleOutlined />, label: 'Pending Approval' },
  approved: { color: 'blue', icon: <CheckCircleOutlined />, label: 'Approved' },
  rejected: { color: 'red', icon: <CloseCircleOutlined />, label: 'Rejected' },
  repaid: { color: 'green', icon: <CheckCircleOutlined />, label: 'Fully Repaid' },
  overdue: { color: 'volcano', icon: <WarningOutlined />, label: 'Overdue' },
};

export const CreditOrdersPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<CreditOrder[]>([]);
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Modal states
  const [detailsModal, setDetailsModal] = useState<{ visible: boolean; order: CreditOrder | null }>({
    visible: false,
    order: null,
  });
  const [approveModal, setApproveModal] = useState<{ visible: boolean; order: CreditOrder | null }>({
    visible: false,
    order: null,
  });
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; order: CreditOrder | null }>({
    visible: false,
    order: null,
  });
  const [repaymentModal, setRepaymentModal] = useState<{ visible: boolean; order: CreditOrder | null }>({
    visible: false,
    order: null,
  });

  // Form states
  const [approveTerms, setApproveTerms] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0);
  const [repaymentMethod, setRepaymentMethod] = useState<string>('cash');
  const [processing, setProcessing] = useState(false);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [ordersData, statsData] = await Promise.all([
        creditApi.getOrders({
          status: statusFilter as any || undefined,
          limit: pagination.pageSize,
          offset: (pagination.current - 1) * pagination.pageSize,
        }),
        creditApi.getCreditStats(),
      ]);

      setOrders(ordersData.orders || []);
      setPagination(prev => ({ ...prev, total: ordersData.total || 0 }));
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load credit orders');
      console.error('Credit orders error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, pagination.current, pagination.pageSize]);

  const handleApprove = async () => {
    if (!approveModal.order) return;
    setProcessing(true);

    try {
      await creditApi.approveCredit(approveModal.order.id, approveTerms);
      message.success('Credit order approved successfully');
      setApproveModal({ visible: false, order: null });
      setApproveTerms('');
      fetchData(true);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to approve credit order');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.order || !rejectReason.trim()) {
      message.warning('Please provide a reason for rejection');
      return;
    }
    setProcessing(true);

    try {
      await creditApi.rejectCredit(rejectModal.order.id, rejectReason);
      message.success('Credit order rejected');
      setRejectModal({ visible: false, order: null });
      setRejectReason('');
      fetchData(true);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to reject credit order');
    } finally {
      setProcessing(false);
    }
  };

  const handleRecordRepayment = async () => {
    if (!repaymentModal.order || repaymentAmount <= 0) {
      message.warning('Please enter a valid repayment amount');
      return;
    }
    setProcessing(true);

    try {
      await creditApi.recordRepayment(repaymentModal.order.id, repaymentAmount, repaymentMethod);
      message.success(`Repayment of ${repaymentAmount.toLocaleString()} RWF recorded`);
      setRepaymentModal({ visible: false, order: null });
      setRepaymentAmount(0);
      setRepaymentMethod('cash');
      fetchData(true);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to record repayment');
    } finally {
      setProcessing(false);
    }
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#1890ff';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  };

  const getCreditScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.display_id.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_phone.includes(query)
    );
  });

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'display_id',
      key: 'display_id',
      render: (id: string) => <Text code>#{id}</Text>,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_: any, record: CreditOrder) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserOutlined />
            <Text strong>{record.customer_name}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <PhoneOutlined />
            <Text type="secondary">{record.customer_phone}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Credit Score',
      dataIndex: 'credit_score',
      key: 'credit_score',
      render: (score: number) => (
        <Tooltip title={getCreditScoreLabel(score)}>
          <Progress
            type="circle"
            percent={score}
            width={45}
            strokeColor={getCreditScoreColor(score)}
            format={(p) => p}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_: any, record: CreditOrder) => (
        <div>
          <div>
            <Text strong>{record.total_amount.toLocaleString()} RWF</Text>
          </div>
          {record.status === 'approved' && (
            <div>
              <Text type="success">{record.amount_paid.toLocaleString()} paid</Text>
              {record.amount_pending > 0 && (
                <Text type="warning" style={{ marginLeft: '8px' }}>
                  {record.amount_pending.toLocaleString()} due
                </Text>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string, record: CreditOrder) => {
        if (!date) return '-';
        const dueDate = new Date(date);
        const now = new Date();
        const isOverdue = record.status === 'approved' && dueDate < now && record.amount_pending > 0;
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return (
          <div>
            <div style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
              {dueDate.toLocaleDateString()}
            </div>
            {record.status === 'approved' && record.amount_pending > 0 && (
              <Text type={isOverdue ? 'danger' : daysLeft <= 3 ? 'warning' : 'secondary'}>
                {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = statusConfig[status] || { color: 'default', icon: null, label: status };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: CreditOrder) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => setDetailsModal({ visible: true, order: record })}
          >
            View
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                type="primary"
                size="small"
                onClick={() => setApproveModal({ visible: true, order: record })}
              >
                Approve
              </Button>
              <Button
                danger
                size="small"
                onClick={() => setRejectModal({ visible: true, order: record })}
              >
                Reject
              </Button>
            </>
          )}
          {record.status === 'approved' && record.amount_pending > 0 && (
            <Button
              type="primary"
              ghost
              size="small"
              icon={<DollarOutlined />}
              onClick={() => {
                setRepaymentAmount(record.amount_pending);
                setRepaymentModal({ visible: true, order: record });
              }}
            >
              Record Payment
            </Button>
          )}
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
        <Title level={3} style={{ margin: 0 }}>
          <CreditCardOutlined style={{ marginRight: '8px' }} />
          Credit Orders
        </Title>
        <Button
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={() => fetchData(true)}
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
              title="Total Credit Extended"
              value={stats?.total_credit_extended || 0}
              suffix="RWF"
              prefix={<BankOutlined />}
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Approval"
              value={stats?.total_pending_amount || 0}
              suffix="RWF"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
              formatter={(value) => value?.toLocaleString()}
            />
            <Text type="secondary">{stats?.total_pending_approval || 0} orders</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Outstanding Amount"
              value={stats?.total_approved_amount || 0}
              suffix="RWF"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
              formatter={(value) => value?.toLocaleString()}
            />
            <Text type="secondary">{stats?.total_approved || 0} active orders</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Repayment Rate"
              value={stats?.repayment_rate || 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: (stats?.repayment_rate || 0) >= 80 ? '#52c41a' : '#faad14' }}
            />
            <Text type="secondary">{stats?.total_repaid_amount?.toLocaleString() || 0} RWF repaid</Text>
          </Card>
        </Col>
      </Row>

      {/* Overdue Alert */}
      {stats?.total_overdue && stats.total_overdue > 0 && (
        <Alert
          message={`${stats.total_overdue} Overdue Orders`}
          description={`Total overdue amount: ${stats.total_overdue_amount?.toLocaleString() || 0} RWF. Please follow up with customers.`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by order ID, customer name or phone"
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="">All Statuses</Option>
              <Option value="pending">Pending Approval</Option>
              <Option value="approved">Approved</Option>
              <Option value="rejected">Rejected</Option>
              <Option value="repaid">Fully Repaid</Option>
              <Option value="overdue">Overdue</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table
          dataSource={filteredOrders}
          columns={columns}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
          }}
          rowClassName={(record) => {
            if (record.status === 'overdue') return 'row-overdue';
            if (record.status === 'pending') return 'row-pending';
            return '';
          }}
        />
      </Card>

      {/* Details Modal */}
      <Modal
        title={
          <span>
            <CreditCardOutlined style={{ marginRight: '8px' }} />
            Credit Order Details - #{detailsModal.order?.display_id}
          </span>
        }
        open={detailsModal.visible}
        onCancel={() => setDetailsModal({ visible: false, order: null })}
        footer={null}
        width={800}
      >
        {detailsModal.order && (
          <div>
            <Row gutter={24}>
              <Col span={12}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Customer">
                    <div>
                      <div><UserOutlined /> {detailsModal.order.customer_name}</div>
                      <div><PhoneOutlined /> {detailsModal.order.customer_phone}</div>
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Credit Score">
                    <Progress
                      percent={detailsModal.order.credit_score}
                      strokeColor={getCreditScoreColor(detailsModal.order.credit_score)}
                      format={(p) => `${p} - ${getCreditScoreLabel(p || 0)}`}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Credit Limit">
                    {detailsModal.order.credit_limit?.toLocaleString()} RWF
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={statusConfig[detailsModal.order.status]?.color}>
                      {statusConfig[detailsModal.order.status]?.label}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={12}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Total Amount">
                    <Text strong>{detailsModal.order.total_amount.toLocaleString()} RWF</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Amount Paid">
                    <Text type="success">{detailsModal.order.amount_paid.toLocaleString()} RWF</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Amount Pending">
                    <Text type="warning">{detailsModal.order.amount_pending.toLocaleString()} RWF</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Due Date">
                    {detailsModal.order.due_date ? new Date(detailsModal.order.due_date).toLocaleDateString() : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            {detailsModal.order.terms && (
              <Alert
                message="Credit Terms"
                description={detailsModal.order.terms}
                type="info"
                style={{ marginTop: '16px' }}
              />
            )}

            {detailsModal.order.rejected_reason && (
              <Alert
                message="Rejection Reason"
                description={detailsModal.order.rejected_reason}
                type="error"
                style={{ marginTop: '16px' }}
              />
            )}

            <Divider>Order Items</Divider>
            <Table
              dataSource={detailsModal.order.items}
              columns={[
                { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
                { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
                {
                  title: 'Price',
                  dataIndex: 'price',
                  key: 'price',
                  render: (v: number) => `${v.toLocaleString()} RWF`,
                },
                {
                  title: 'Total',
                  dataIndex: 'total',
                  key: 'total',
                  render: (v: number) => <Text strong>{v.toLocaleString()} RWF</Text>,
                },
              ]}
              pagination={false}
              size="small"
              rowKey="id"
            />

            {detailsModal.order.repayments && detailsModal.order.repayments.length > 0 && (
              <>
                <Divider>
                  <HistoryOutlined /> Repayment History
                </Divider>
                <Timeline>
                  {detailsModal.order.repayments.map((repayment) => (
                    <Timeline.Item key={repayment.id} color="green">
                      <div>
                        <Text strong>{repayment.amount.toLocaleString()} RWF</Text>
                        <Text type="secondary" style={{ marginLeft: '8px' }}>
                          via {repayment.payment_method}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          {new Date(repayment.date).toLocaleString()}
                        </Text>
                      </div>
                      {repayment.notes && (
                        <div>
                          <Text type="secondary" italic>{repayment.notes}</Text>
                        </div>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </>
            )}

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Text type="secondary">
                Created: {new Date(detailsModal.order.created_at).toLocaleString()}
              </Text>
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        title="Approve Credit Order"
        open={approveModal.visible}
        onCancel={() => {
          setApproveModal({ visible: false, order: null });
          setApproveTerms('');
        }}
        onOk={handleApprove}
        confirmLoading={processing}
        okText="Approve"
        okButtonProps={{ type: 'primary' }}
      >
        {approveModal.order && (
          <div>
            <Alert
              message={`Approve ${approveModal.order.total_amount.toLocaleString()} RWF credit for ${approveModal.order.customer_name}?`}
              description={
                <div>
                  <p>Credit Score: <strong>{approveModal.order.credit_score}</strong> ({getCreditScoreLabel(approveModal.order.credit_score)})</p>
                  <p>Credit Limit: <strong>{approveModal.order.credit_limit?.toLocaleString()} RWF</strong></p>
                </div>
              }
              type="info"
              style={{ marginBottom: '16px' }}
            />
            <Form layout="vertical">
              <Form.Item label="Credit Terms (Optional)">
                <TextArea
                  rows={3}
                  placeholder="Enter payment terms, conditions, or notes..."
                  value={approveTerms}
                  onChange={(e) => setApproveTerms(e.target.value)}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Credit Order"
        open={rejectModal.visible}
        onCancel={() => {
          setRejectModal({ visible: false, order: null });
          setRejectReason('');
        }}
        onOk={handleReject}
        confirmLoading={processing}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        {rejectModal.order && (
          <div>
            <Alert
              message={`Reject ${rejectModal.order.total_amount.toLocaleString()} RWF credit request from ${rejectModal.order.customer_name}?`}
              type="warning"
              style={{ marginBottom: '16px' }}
            />
            <Form layout="vertical">
              <Form.Item
                label="Rejection Reason"
                required
                rules={[{ required: true, message: 'Please provide a reason' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="Enter reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* Repayment Modal */}
      <Modal
        title="Record Repayment"
        open={repaymentModal.visible}
        onCancel={() => {
          setRepaymentModal({ visible: false, order: null });
          setRepaymentAmount(0);
          setRepaymentMethod('cash');
        }}
        onOk={handleRecordRepayment}
        confirmLoading={processing}
        okText="Record Payment"
      >
        {repaymentModal.order && (
          <div>
            <Descriptions column={1} size="small" style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="Customer">
                {repaymentModal.order.customer_name}
              </Descriptions.Item>
              <Descriptions.Item label="Outstanding Amount">
                <Text type="warning" strong>
                  {repaymentModal.order.amount_pending.toLocaleString()} RWF
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Form layout="vertical">
              <Form.Item label="Payment Amount (RWF)" required>
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={repaymentModal.order.amount_pending}
                  value={repaymentAmount}
                  onChange={(v) => setRepaymentAmount(v || 0)}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value?.replace(/,/g, '') || 0)}
                />
              </Form.Item>
              <Form.Item label="Payment Method" required>
                <Select
                  value={repaymentMethod}
                  onChange={setRepaymentMethod}
                  style={{ width: '100%' }}
                >
                  <Option value="cash">Cash</Option>
                  <Option value="momo">MTN Mobile Money</Option>
                  <Option value="airtel">Airtel Money</Option>
                  <Option value="bank">Bank Transfer</Option>
                  <Option value="nfc">NFC Card</Option>
                </Select>
              </Form.Item>
            </Form>

            {repaymentAmount >= repaymentModal.order.amount_pending && (
              <Alert
                message="Full Payment"
                description="This payment will fully settle the credit order."
                type="success"
                style={{ marginTop: '16px' }}
              />
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .row-overdue {
          background-color: #fff2f0;
        }
        .row-pending {
          background-color: #fffbe6;
        }
      `}</style>
    </div>
  );
};

export default CreditOrdersPage;
