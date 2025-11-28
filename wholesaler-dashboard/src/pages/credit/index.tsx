import { useEffect, useState } from 'react';
import { List, ShowButton, DateField, NumberField } from '@refinedev/antd';
import {
  Table,
  Space,
  Card,
  Typography,
  Descriptions,
  Button,
  Tag,
  Timeline,
  Progress,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Spin,
  Alert,
  Select,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { creditApi } from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CreditRequest {
  id: string;
  request_number: string;
  retailer_id: string;
  retailer_name: string;
  owner_name: string;
  phone: string;
  location: string;
  current_limit: number;
  requested_limit: number;
  credit_used: number;
  total_orders: number;
  total_revenue: number;
  on_time_payments: number;
  late_payments: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  created_at: string;
  approved_at?: string;
  approved_limit?: number;
  approved_by?: string;
  terms?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

interface CreditStats {
  total_requests: number;
  pending_requests: number;
  approved_this_month: number;
  rejected_this_month: number;
  total_credit_extended: number;
  approval_rate: number;
}

export const CreditApprovalList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Modals
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CreditRequest | null>(null);
  const [form] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [requestsData, statsData] = await Promise.all([
        creditApi.getCreditRequests({
          status: statusFilter as any || undefined,
          limit: pagination.pageSize,
          offset: (pagination.current - 1) * pagination.pageSize,
        }),
        creditApi.getCreditStats(),
      ]);

      setRequests(requestsData.requests || []);
      setPagination(prev => ({ ...prev, total: requestsData.total || 0 }));
      setStats(statsData);
    } catch (err: any) {
      console.error('Credit requests error:', err);
      setError(err.response?.data?.error || 'Failed to load credit requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, pagination.current, pagination.pageSize]);

  // Auto-refresh every 30 seconds for pending requests
  useEffect(() => {
    const interval = setInterval(() => fetchRequests(true), 30000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getRiskLevel = (latePayments: number, totalOrders: number) => {
    if (totalOrders === 0) return { color: 'default', text: 'New' };
    const rate = (latePayments / totalOrders) * 100;
    if (rate >= 25) return { color: 'red', text: 'High Risk' };
    if (rate >= 10) return { color: 'orange', text: 'Medium Risk' };
    return { color: 'green', text: 'Low Risk' };
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await creditApi.approveCreditRequest(selectedRequest.id, values.credit_limit, values.terms);
      message.success(`Credit request ${selectedRequest.request_number} approved`);
      setApproveModalOpen(false);
      setSelectedRequest(null);
      form.resetFields();
      fetchRequests(true);
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await creditApi.rejectCreditRequest(selectedRequest.id, values.reason);
      message.success(`Credit request ${selectedRequest.request_number} rejected`);
      setRejectModalOpen(false);
      setSelectedRequest(null);
      form.resetFields();
      fetchRequests(true);
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Request #',
      dataIndex: 'request_number',
      key: 'request_number',
      render: (value: string) => <Text code strong>{value}</Text>,
    },
    {
      title: 'Retailer',
      key: 'retailer',
      render: (_: any, record: CreditRequest) => (
        <div>
          <div><strong>{record.retailer_name}</strong></div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.owner_name}</Text>
        </div>
      ),
    },
    {
      title: 'Current Limit',
      dataIndex: 'current_limit',
      key: 'current_limit',
      render: (value: number) => `${value.toLocaleString()} RWF`,
    },
    {
      title: 'Requested',
      key: 'requested',
      render: (_: any, record: CreditRequest) => {
        const increase = ((record.requested_limit - record.current_limit) / record.current_limit * 100);
        return (
          <div>
            <div>{record.requested_limit.toLocaleString()} RWF</div>
            <Text type="success" style={{ fontSize: '11px' }}>
              +{isFinite(increase) ? increase.toFixed(0) : 100}%
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Risk Level',
      key: 'risk',
      render: (_: any, record: CreditRequest) => {
        const risk = getRiskLevel(record.late_payments, record.total_orders);
        return <Tag color={risk.color}>{risk.text}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={getStatusColor(value)}>
          {value.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => <DateField value={value} format="DD/MM/YYYY" />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: CreditRequest) => (
        <Space>
          <ShowButton hideText size="small" recordItemId={record.id} />
          {record.status === 'pending' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setSelectedRequest(record);
                  form.setFieldsValue({ credit_limit: record.requested_limit });
                  setApproveModalOpen(true);
                }}
              >
                Approve
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setSelectedRequest(record);
                  form.resetFields();
                  setRejectModalOpen(true);
                }}
              >
                Reject
              </Button>
            </>
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
        <Title level={3} style={{ margin: 0 }}>Credit Limit Requests</Title>
        <Button
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={() => fetchRequests(true)}
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
              title="Pending Requests"
              value={stats?.pending_requests || 0}
              valueStyle={{ color: '#f97316' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Approved (Month)"
              value={stats?.approved_this_month || 0}
              valueStyle={{ color: '#22c55e' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Approval Rate"
              value={stats?.approval_rate || 0}
              suffix="%"
              valueStyle={{ color: (stats?.approval_rate || 0) >= 70 ? '#22c55e' : '#f97316' }}
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
              formatter={(value) => {
                const num = Number(value);
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                return num.toLocaleString();
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: 150 }}
            value={statusFilter || undefined}
            onChange={(value) => {
              setStatusFilter(value || '');
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
          >
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="approved">Approved</Select.Option>
            <Select.Option value="rejected">Rejected</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Requests Table */}
      <Card>
        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} requests`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }));
            },
          }}
        />
      </Card>

      {/* Approve Modal */}
      <Modal
        title={`Approve Credit Request: ${selectedRequest?.request_number}`}
        open={approveModalOpen}
        onCancel={() => {
          setApproveModalOpen(false);
          setSelectedRequest(null);
          form.resetFields();
        }}
        onOk={handleApprove}
        confirmLoading={actionLoading}
        okText="Approve Request"
      >
        {selectedRequest && (
          <div style={{ marginBottom: '16px' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Retailer">{selectedRequest.retailer_name}</Descriptions.Item>
              <Descriptions.Item label="Current Limit">
                {selectedRequest.current_limit.toLocaleString()} RWF
              </Descriptions.Item>
              <Descriptions.Item label="Requested">
                {selectedRequest.requested_limit.toLocaleString()} RWF
              </Descriptions.Item>
              <Descriptions.Item label="Total Orders">{selectedRequest.total_orders}</Descriptions.Item>
              <Descriptions.Item label="On-Time Payments">
                {selectedRequest.on_time_payments}/{selectedRequest.total_orders}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="credit_limit"
            label="Approved Credit Limit (RWF)"
            rules={[{ required: true, message: 'Enter approved credit limit' }]}
          >
            <InputNumber
              min={selectedRequest?.current_limit || 0}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item name="terms" label="Terms & Conditions">
            <TextArea rows={3} placeholder="Any specific terms for this credit approval..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={`Reject Credit Request: ${selectedRequest?.request_number}`}
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          setSelectedRequest(null);
          form.resetFields();
        }}
        onOk={handleReject}
        confirmLoading={actionLoading}
        okText="Reject Request"
        okButtonProps={{ danger: true }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="Rejection Reason"
            rules={[{ required: true, message: 'Please provide a reason for rejection' }]}
          >
            <TextArea rows={4} placeholder="Explain why this credit request is being rejected..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export const CreditApprovalShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<CreditRequest | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await creditApi.getCreditRequest(id!);
      setRequest(data);
    } catch (err: any) {
      console.error('Credit request fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load credit request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchRequest();
  }, [id]);

  const handleApprove = async () => {
    if (!request) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await creditApi.approveCreditRequest(request.id, values.credit_limit, values.terms);
      message.success('Credit request approved');
      setApproveModalOpen(false);
      form.resetFields();
      fetchRequest();
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await creditApi.rejectCreditRequest(request.id, values.reason);
      message.success('Credit request rejected');
      setRejectModalOpen(false);
      form.resetFields();
      fetchRequest();
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <Alert
        message="Error"
        description={error || 'Credit request not found'}
        type="error"
        showIcon
        action={<Button onClick={() => navigate('/credit-approvals')}>Back to Credit Requests</Button>}
      />
    );
  }

  const paymentSuccessRate = request.total_orders > 0
    ? ((request.on_time_payments / request.total_orders) * 100).toFixed(1)
    : 0;
  const creditUtilization = request.current_limit > 0
    ? ((request.credit_used / request.current_limit) * 100)
    : 0;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Credit Request {request.request_number}</Title>
          <Text type="secondary">{request.retailer_name}</Text>
        </div>
        <Tag
          color={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : 'orange'}
          style={{ fontSize: '14px', padding: '4px 12px' }}
        >
          {request.status.toUpperCase()}
        </Tag>
      </div>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={request.total_orders}
              valueStyle={{ color: '#7c3aed' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Revenue Generated"
              value={request.total_revenue}
              suffix="RWF"
              valueStyle={{ color: '#22c55e' }}
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="On-Time Payments"
              value={paymentSuccessRate}
              suffix="%"
              valueStyle={{ color: Number(paymentSuccessRate) >= 90 ? '#22c55e' : '#f97316' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Late Payments"
              value={request.late_payments}
              valueStyle={{ color: request.late_payments > 3 ? '#ef4444' : '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* Request Details */}
          <Card title="Request Details" style={{ marginBottom: '16px' }}>
            <Descriptions column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Request Number">
                <Text code>{request.request_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : 'orange'}>
                  {request.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Retailer">{request.retailer_name}</Descriptions.Item>
              <Descriptions.Item label="Owner">{request.owner_name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{request.phone}</Descriptions.Item>
              <Descriptions.Item label="Location">{request.location}</Descriptions.Item>
              <Descriptions.Item label="Submitted">
                <DateField value={request.created_at} format="DD MMMM YYYY HH:mm" />
              </Descriptions.Item>
              <Descriptions.Item label="Reason for Request">
                <Text italic>{request.reason}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Credit Analysis */}
          <Card title="Credit Analysis" style={{ marginBottom: '16px' }}>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Current Credit Limit</Text>
                  <div style={{ fontSize: '24px', color: '#7c3aed' }}>
                    {request.current_limit.toLocaleString()} RWF
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Requested Limit</Text>
                  <div style={{ fontSize: '24px', color: '#22c55e' }}>
                    {request.requested_limit.toLocaleString()} RWF
                    <Tag color="green" style={{ marginLeft: '8px' }}>
                      +{request.current_limit > 0
                        ? ((request.requested_limit - request.current_limit) / request.current_limit * 100).toFixed(0)
                        : 100}%
                    </Tag>
                  </div>
                </div>
                <div>
                  <Text strong>Increase Amount</Text>
                  <div style={{ fontSize: '20px' }}>
                    {(request.requested_limit - request.current_limit).toLocaleString()} RWF
                  </div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ marginBottom: '24px' }}>
                  <Text strong>Current Credit Utilization</Text>
                  <Progress
                    percent={Math.min(creditUtilization, 100)}
                    status={creditUtilization >= 90 ? 'exception' : creditUtilization >= 70 ? 'normal' : 'success'}
                    format={() => `${request.credit_used.toLocaleString()} / ${request.current_limit.toLocaleString()} RWF`}
                  />
                </div>
                <div>
                  <Text strong>Payment History</Text>
                  <Progress
                    percent={Number(paymentSuccessRate)}
                    status={Number(paymentSuccessRate) >= 90 ? 'success' : Number(paymentSuccessRate) >= 75 ? 'normal' : 'exception'}
                    format={() => `${request.on_time_payments}/${request.total_orders} on-time`}
                  />
                </div>
              </Col>
            </Row>
          </Card>

          {/* Timeline */}
          <Card title="Request Timeline">
            <Timeline
              items={[
                {
                  color: 'blue',
                  children: (
                    <>
                      <strong>Request Submitted</strong>
                      <br />
                      <DateField value={request.created_at} format="DD/MM/YYYY HH:mm" />
                    </>
                  ),
                },
                ...(request.approved_at
                  ? [{
                      color: 'green' as const,
                      children: (
                        <>
                          <strong>Approved</strong>
                          <br />
                          <Text>New limit: {request.approved_limit?.toLocaleString()} RWF</Text>
                          {request.terms && (
                            <>
                              <br />
                              <Text type="secondary">Terms: {request.terms}</Text>
                            </>
                          )}
                          <br />
                          <DateField value={request.approved_at} format="DD/MM/YYYY HH:mm" />
                        </>
                      ),
                    }]
                  : []),
                ...(request.rejected_at
                  ? [{
                      color: 'red' as const,
                      children: (
                        <>
                          <strong>Rejected</strong>
                          <br />
                          <Text type="secondary">{request.rejection_reason}</Text>
                          <br />
                          <DateField value={request.rejected_at} format="DD/MM/YYYY HH:mm" />
                        </>
                      ),
                    }]
                  : []),
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Actions */}
          <Card title="Actions" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {request.status === 'pending' && (
                <>
                  <Button
                    type="primary"
                    block
                    size="large"
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      form.setFieldsValue({ credit_limit: request.requested_limit });
                      setApproveModalOpen(true);
                    }}
                  >
                    Approve Request
                  </Button>
                  <Button
                    danger
                    block
                    size="large"
                    icon={<CloseCircleOutlined />}
                    onClick={() => {
                      form.resetFields();
                      setRejectModalOpen(true);
                    }}
                  >
                    Reject Request
                  </Button>
                </>
              )}
              <Button block size="large">View Order History</Button>
              <Button block size="large">Contact Retailer</Button>
            </Space>
          </Card>

          {/* Risk Assessment */}
          <Card title="Risk Assessment">
            <div style={{ marginBottom: '16px' }}>
              <Text>Late Payment Rate</Text>
              <Progress
                percent={request.total_orders > 0 ? (request.late_payments / request.total_orders) * 100 : 0}
                status={
                  request.total_orders > 0 && (request.late_payments / request.total_orders) >= 0.25
                    ? 'exception'
                    : (request.late_payments / request.total_orders) >= 0.1
                    ? 'normal'
                    : 'success'
                }
                format={(percent) => `${percent?.toFixed(1)}%`}
              />
            </div>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Risk Level">
                <Tag color={
                  request.late_payments / request.total_orders >= 0.25 ? 'red'
                    : request.late_payments / request.total_orders >= 0.1 ? 'orange'
                    : 'green'
                }>
                  {request.late_payments / request.total_orders >= 0.25 ? 'High Risk'
                    : request.late_payments / request.total_orders >= 0.1 ? 'Medium Risk'
                    : 'Low Risk'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Credit Score Factor">
                {Number(paymentSuccessRate) >= 90 ? 'Excellent' : Number(paymentSuccessRate) >= 75 ? 'Good' : 'Poor'}
              </Descriptions.Item>
              <Descriptions.Item label="Recommendation">
                {Number(paymentSuccessRate) >= 85 && request.late_payments <= 3
                  ? 'Approve'
                  : Number(paymentSuccessRate) >= 70
                  ? 'Review'
                  : 'Decline'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Approve Modal */}
      <Modal
        title="Approve Credit Request"
        open={approveModalOpen}
        onCancel={() => {
          setApproveModalOpen(false);
          form.resetFields();
        }}
        onOk={handleApprove}
        confirmLoading={actionLoading}
        okText="Approve"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="credit_limit"
            label="Approved Credit Limit (RWF)"
            rules={[{ required: true, message: 'Enter approved credit limit' }]}
          >
            <InputNumber
              min={request.current_limit}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item name="terms" label="Terms & Notes">
            <TextArea rows={3} placeholder="Optional notes about this approval..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Credit Request"
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          form.resetFields();
        }}
        onOk={handleReject}
        confirmLoading={actionLoading}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="Rejection Reason"
            rules={[{ required: true, message: 'Please provide a reason for rejection' }]}
          >
            <TextArea rows={4} placeholder="Explain why this request is being rejected..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CreditApprovalList;
