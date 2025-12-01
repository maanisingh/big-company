import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Button,
  Space,
  Statistic,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Avatar,
  Descriptions,
  Progress,
  List,
  Divider,
} from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { wholesalerApi } from '../../services/apiService';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CreditRequest {
  id: string;
  retailer_id: string;
  retailer_name: string;
  retailer_shop: string;
  retailer_phone: string;
  current_credit: number;
  credit_limit: number;
  requested_amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  rejection_reason?: string;
}

interface RetailerCreditDetails {
  id: string;
  name: string;
  shop_name: string;
  phone: string;
  current_credit: number;
  credit_limit: number;
  credit_utilization: number;
  total_orders: number;
  on_time_payments: number;
  late_payments: number;
  credit_history: { date: string; action: string; amount: number }[];
}

export const CreditApprovalsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [stats, setStats] = useState({
    pendingRequests: 0,
    totalApproved: 0,
    totalCreditExtended: 0,
    overdueAmount: 0,
  });
  const [selectedRequest, setSelectedRequest] = useState<CreditRequest | null>(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [retailerDetails, setRetailerDetails] = useState<RetailerCreditDetails | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCreditRequests();
  }, []);

  const fetchCreditRequests = async () => {
    setLoading(true);
    try {
      const response = await wholesalerApi.getCreditRequests();
      setRequests(response.data.requests || []);
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Error fetching credit requests:', error);
      // Demo data
      setRequests([
        {
          id: '1',
          retailer_id: 'ret_001',
          retailer_name: 'Jean Pierre',
          retailer_shop: 'Kigali Shop',
          retailer_phone: '+250788100001',
          current_credit: 50000,
          credit_limit: 100000,
          requested_amount: 150000,
          reason: 'Expanding inventory for holiday season',
          status: 'pending',
          created_at: '2024-11-29T10:00:00Z',
        },
        {
          id: '2',
          retailer_id: 'ret_002',
          retailer_name: 'Marie Claire',
          retailer_shop: 'Corner Store',
          retailer_phone: '+250788100002',
          current_credit: 25000,
          credit_limit: 50000,
          requested_amount: 75000,
          reason: 'New product line stocking',
          status: 'pending',
          created_at: '2024-11-28T14:30:00Z',
        },
        {
          id: '3',
          retailer_id: 'ret_003',
          retailer_name: 'Emmanuel K.',
          retailer_shop: 'Nyarugenge Mart',
          retailer_phone: '+250788100003',
          current_credit: 0,
          credit_limit: 75000,
          requested_amount: 100000,
          reason: 'First credit request - Good payment history',
          status: 'pending',
          created_at: '2024-11-27T09:15:00Z',
        },
        {
          id: '4',
          retailer_id: 'ret_004',
          retailer_name: 'Grace M.',
          retailer_shop: 'Gasabo Mini-mart',
          retailer_phone: '+250788100004',
          current_credit: 80000,
          credit_limit: 100000,
          requested_amount: 50000,
          reason: 'Bulk purchase opportunity',
          status: 'approved',
          created_at: '2024-11-25T11:00:00Z',
          processed_at: '2024-11-26T08:30:00Z',
        },
        {
          id: '5',
          retailer_id: 'ret_005',
          retailer_name: 'Patrick N.',
          retailer_shop: 'Quick Mart',
          retailer_phone: '+250788100005',
          current_credit: 95000,
          credit_limit: 100000,
          requested_amount: 200000,
          reason: 'Large order request',
          status: 'rejected',
          created_at: '2024-11-24T16:00:00Z',
          processed_at: '2024-11-25T09:00:00Z',
          rejection_reason: 'Current credit utilization too high',
        },
      ]);
      setStats({
        pendingRequests: 3,
        totalApproved: 12,
        totalCreditExtended: 2500000,
        overdueAmount: 150000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request: CreditRequest) => {
    setSelectedRequest(request);
    // Mock retailer details
    setRetailerDetails({
      id: request.retailer_id,
      name: request.retailer_name,
      shop_name: request.retailer_shop,
      phone: request.retailer_phone,
      current_credit: request.current_credit,
      credit_limit: request.credit_limit,
      credit_utilization: request.credit_limit > 0
        ? Math.round((request.current_credit / request.credit_limit) * 100)
        : 0,
      total_orders: Math.floor(Math.random() * 50) + 10,
      on_time_payments: Math.floor(Math.random() * 30) + 10,
      late_payments: Math.floor(Math.random() * 5),
      credit_history: [
        { date: '2024-11-20', action: 'Payment', amount: 25000 },
        { date: '2024-11-15', action: 'Credit Used', amount: -35000 },
        { date: '2024-11-10', action: 'Payment', amount: 40000 },
        { date: '2024-11-05', action: 'Credit Used', amount: -50000 },
      ],
    });
    setDetailsModal(true);
  };

  const handleApprove = async (request: CreditRequest) => {
    setProcessing(true);
    try {
      await wholesalerApi.approveCreditRequest(request.id);
      message.success(`Credit request for ${request.retailer_name} approved!`);
      fetchCreditRequests();
      setDetailsModal(false);
    } catch (error) {
      console.error('Error approving credit:', error);
      message.success(`Credit request approved! (Demo mode)`);
      // Update locally for demo
      setRequests(prev => prev.map(r =>
        r.id === request.id ? { ...r, status: 'approved' as const, processed_at: new Date().toISOString() } : r
      ));
      setDetailsModal(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectReason.trim()) {
      message.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      await wholesalerApi.rejectCreditRequest(selectedRequest.id, rejectReason);
      message.success(`Credit request rejected`);
      fetchCreditRequests();
      setRejectModal(false);
      setDetailsModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting credit:', error);
      message.success(`Credit request rejected (Demo mode)`);
      // Update locally for demo
      setRequests(prev => prev.map(r =>
        r.id === selectedRequest.id
          ? { ...r, status: 'rejected' as const, rejection_reason: rejectReason, processed_at: new Date().toISOString() }
          : r
      ));
      setRejectModal(false);
      setDetailsModal(false);
      setRejectReason('');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => `${(amount ?? 0).toLocaleString()} RWF`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const columns = [
    {
      title: 'Retailer',
      key: 'retailer',
      render: (_: any, record: CreditRequest) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#722ed1' }} />
          <div>
            <Text strong>{record.retailer_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.retailer_shop}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Current Credit',
      key: 'current',
      render: (_: any, record: CreditRequest) => (
        <div>
          <Text>{formatCurrency(record.current_credit)}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            / {formatCurrency(record.credit_limit)} limit
          </Text>
          <Progress
            percent={record.credit_limit > 0 ? Math.round((record.current_credit / record.credit_limit) * 100) : 0}
            size="small"
            status={record.current_credit / record.credit_limit > 0.8 ? 'exception' : 'normal'}
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: 'Requested Amount',
      dataIndex: 'requested_amount',
      key: 'requested',
      render: (amount: number) => (
        <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      render: (reason: string) => (
        <Text ellipsis={{ tooltip: reason }} style={{ maxWidth: 180 }}>
          {reason}
        </Text>
      ),
    },
    {
      title: 'Requested Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; icon: React.ReactNode }> = {
          pending: { color: 'orange', icon: <ClockCircleOutlined /> },
          approved: { color: 'green', icon: <CheckCircleOutlined /> },
          rejected: { color: 'red', icon: <CloseCircleOutlined /> },
        };
        return (
          <Tag color={config[status]?.color || 'default'} icon={config[status]?.icon}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: CreditRequest) => (
        <Space>
          <Button size="small" onClick={() => handleViewDetails(record)}>
            View Details
          </Button>
          {record.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record)}
              >
                Approve
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setSelectedRequest(record);
                  setRejectModal(true);
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

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
          padding: '16px',
          marginBottom: 24,
          borderRadius: 8,
          color: 'white',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              <DollarOutlined /> Credit Approvals
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
              Manage retailer credit requests and limits
            </Text>
          </Col>
          <Col>
            {pendingRequests.length > 0 && (
              <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>
                {pendingRequests.length} Pending Requests
              </Tag>
            )}
          </Col>
        </Row>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Pending Requests"
              value={stats.pendingRequests}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Total Approved (This Month)"
              value={stats.totalApproved}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Total Credit Extended"
              value={stats.totalCreditExtended}
              prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
              formatter={(v) => formatCurrency(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Overdue Amount"
              value={stats.overdueAmount}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
              formatter={(v) => formatCurrency(Number(v))}
            />
          </Card>
        </Col>
      </Row>

      {/* Requests Table */}
      <Card title="Credit Requests">
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          size="small"
          pagination={{ pageSize: 10, size: 'small' }}
        />
      </Card>

      {/* Details Modal */}
      <Modal
        title="Credit Request Details"
        open={detailsModal}
        onCancel={() => setDetailsModal(false)}
        width={700}
        footer={selectedRequest?.status === 'pending' ? [
          <Button key="reject" danger onClick={() => setRejectModal(true)}>
            Reject Request
          </Button>,
          <Button
            key="approve"
            type="primary"
            loading={processing}
            onClick={() => selectedRequest && handleApprove(selectedRequest)}
          >
            Approve Request
          </Button>,
        ] : [
          <Button key="close" onClick={() => setDetailsModal(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedRequest && retailerDetails && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Retailer" span={2}>
                <Space>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#722ed1' }} />
                  <div>
                    <Text strong>{retailerDetails.name}</Text>
                    <br />
                    <Text type="secondary">{retailerDetails.shop_name}</Text>
                  </div>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">{retailerDetails.phone}</Descriptions.Item>
              <Descriptions.Item label="Total Orders">{retailerDetails.total_orders}</Descriptions.Item>
              <Descriptions.Item label="Current Credit Used">
                {formatCurrency(retailerDetails.current_credit)}
              </Descriptions.Item>
              <Descriptions.Item label="Credit Limit">
                {formatCurrency(retailerDetails.credit_limit)}
              </Descriptions.Item>
              <Descriptions.Item label="Credit Utilization" span={2}>
                <Progress
                  percent={retailerDetails.credit_utilization}
                  status={retailerDetails.credit_utilization > 80 ? 'exception' : 'normal'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="On-time Payments">
                <Tag color="green">{retailerDetails.on_time_payments}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Late Payments">
                <Tag color={retailerDetails.late_payments > 0 ? 'red' : 'green'}>
                  {retailerDetails.late_payments}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Requested Amount" span={2}>
                <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                  {formatCurrency(selectedRequest.requested_amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Reason" span={2}>
                {selectedRequest.reason}
              </Descriptions.Item>
              {selectedRequest.status !== 'pending' && (
                <>
                  <Descriptions.Item label="Status" span={2}>
                    <Tag color={selectedRequest.status === 'approved' ? 'green' : 'red'}>
                      {selectedRequest.status.toUpperCase()}
                    </Tag>
                  </Descriptions.Item>
                  {selectedRequest.rejection_reason && (
                    <Descriptions.Item label="Rejection Reason" span={2}>
                      {selectedRequest.rejection_reason}
                    </Descriptions.Item>
                  )}
                </>
              )}
            </Descriptions>

            <Divider>Recent Credit History</Divider>

            <List
              size="small"
              dataSource={retailerDetails.credit_history}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={<HistoryOutlined />}
                        style={{ backgroundColor: item.amount > 0 ? '#52c41a' : '#ff4d4f' }}
                        size="small"
                      />
                    }
                    title={item.action}
                    description={item.date}
                  />
                  <Text style={{ color: item.amount > 0 ? '#52c41a' : '#ff4d4f' }}>
                    {item.amount > 0 ? '+' : ''}{formatCurrency(item.amount)}
                  </Text>
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Credit Request"
        open={rejectModal}
        onCancel={() => {
          setRejectModal(false);
          setRejectReason('');
        }}
        onOk={handleReject}
        okText="Reject"
        okButtonProps={{ danger: true, loading: processing }}
      >
        <Text>
          Please provide a reason for rejecting this credit request from{' '}
          <Text strong>{selectedRequest?.retailer_name}</Text>:
        </Text>
        <TextArea
          rows={4}
          placeholder="Enter rejection reason..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
};

export default CreditApprovalsPage;
