import { List, ShowButton, DateField, NumberField } from '@refinedev/antd';
import { Table, Space, Card, Typography, Descriptions, Button, Tag, Timeline, Progress, Row, Col, Statistic, Modal, Form, InputNumber, Input, message } from 'antd';
import { useParams } from 'react-router-dom';
import { useState } from 'react';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Mock credit approval requests from retailers
const mockCreditApprovals = [
  {
    id: '1',
    request_number: 'CRA-2024-001',
    retailer_name: 'Kigali Mini Mart',
    owner_name: 'Jean Pierre',
    phone: '+250788123456',
    location: 'Kigali, Nyarugenge',
    current_limit: 500000,
    requested_limit: 750000,
    credit_used: 150000,
    total_orders: 45,
    total_revenue: 2500000,
    on_time_payments: 42,
    late_payments: 3,
    status: 'pending',
    reason: 'Business expansion - opening second location',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    request_number: 'CRA-2024-002',
    retailer_name: 'Musanze Corner Shop',
    owner_name: 'Marie Claire',
    phone: '+250788654321',
    location: 'Musanze',
    current_limit: 300000,
    requested_limit: 500000,
    credit_used: 280000,
    total_orders: 28,
    total_revenue: 1200000,
    on_time_payments: 20,
    late_payments: 8,
    status: 'pending',
    reason: 'Seasonal demand increase',
    created_at: '2024-01-14T14:20:00Z',
  },
  {
    id: '3',
    request_number: 'CRA-2024-003',
    retailer_name: 'Huye Supermarket',
    owner_name: 'Emmanuel',
    phone: '+250788999888',
    location: 'Huye',
    current_limit: 800000,
    requested_limit: 1000000,
    credit_used: 0,
    total_orders: 62,
    total_revenue: 4500000,
    on_time_payments: 62,
    late_payments: 0,
    status: 'approved',
    reason: 'Excellent payment history - bulk ordering',
    created_at: '2024-01-10T11:15:00Z',
    approved_at: '2024-01-11T09:00:00Z',
    approved_limit: 1000000,
  },
  {
    id: '4',
    request_number: 'CRA-2024-004',
    retailer_name: 'Rubavu Store',
    owner_name: 'Patrick',
    phone: '+250788777666',
    location: 'Rubavu',
    current_limit: 200000,
    requested_limit: 400000,
    credit_used: 195000,
    total_orders: 15,
    total_revenue: 450000,
    on_time_payments: 10,
    late_payments: 5,
    status: 'rejected',
    reason: 'Need more credit for inventory',
    created_at: '2024-01-12T16:45:00Z',
    rejected_at: '2024-01-13T10:00:00Z',
    rejection_reason: 'High late payment rate (33%). Recommend improving payment history first.',
  },
];

export const CreditApprovalList = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getRiskLevel = (latePayments: number, totalOrders: number) => {
    const rate = totalOrders > 0 ? (latePayments / totalOrders) * 100 : 0;
    if (rate >= 25) return { color: 'red', text: 'High Risk' };
    if (rate >= 10) return { color: 'orange', text: 'Medium Risk' };
    return { color: 'green', text: 'Low Risk' };
  };

  const columns = [
    {
      title: 'Request #',
      dataIndex: 'request_number',
      key: 'request_number',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: 'Retailer',
      key: 'retailer',
      render: (_: any, record: any) => (
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
      render: (value: number) => (
        <NumberField
          value={value}
          options={{ style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }}
        />
      ),
    },
    {
      title: 'Requested',
      dataIndex: 'requested_limit',
      key: 'requested_limit',
      render: (value: number, record: any) => (
        <div>
          <NumberField
            value={value}
            options={{ style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }}
          />
          <div style={{ fontSize: '11px', color: '#22c55e' }}>
            +{((value - record.current_limit) / record.current_limit * 100).toFixed(0)}%
          </div>
        </div>
      ),
    },
    {
      title: 'Risk Level',
      key: 'risk',
      render: (_: any, record: any) => {
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
      render: (_: any, record: any) => (
        <Space>
          <ShowButton hideText size="small" recordItemId={record.id} />
          {record.status === 'pending' && (
            <>
              <Button type="primary" size="small">Approve</Button>
              <Button danger size="small">Reject</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <List title="Credit Limit Requests">
      <Table dataSource={mockCreditApprovals} columns={columns} rowKey="id" />
    </List>
  );
};

export const CreditApprovalShow = () => {
  const { id } = useParams();
  const approval = mockCreditApprovals.find((a) => a.id === id) || mockCreditApprovals[0];
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [form] = Form.useForm();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const paymentSuccessRate = approval.total_orders > 0
    ? ((approval.on_time_payments / approval.total_orders) * 100).toFixed(1)
    : 0;

  const creditUtilization = approval.current_limit > 0
    ? ((approval.credit_used / approval.current_limit) * 100)
    : 0;

  const handleApprove = () => {
    message.success('Credit limit approved successfully');
    setApproveModalOpen(false);
  };

  const handleReject = () => {
    message.success('Credit request rejected');
    setRejectModalOpen(false);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>Credit Approval - {approval.request_number}</Title>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={approval.total_orders}
              valueStyle={{ color: '#7c3aed' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Revenue Generated"
              value={approval.total_revenue}
              suffix="RWF"
              valueStyle={{ color: '#22c55e' }}
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
              value={approval.late_payments}
              valueStyle={{ color: approval.late_payments > 3 ? '#ef4444' : '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Request Details */}
      <Card title="Request Details" style={{ marginBottom: '16px' }}>
        <Descriptions column={2}>
          <Descriptions.Item label="Request Number">{approval.request_number}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(approval.status)}>
              {approval.status.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Retailer">{approval.retailer_name}</Descriptions.Item>
          <Descriptions.Item label="Owner">{approval.owner_name}</Descriptions.Item>
          <Descriptions.Item label="Phone">{approval.phone}</Descriptions.Item>
          <Descriptions.Item label="Location">{approval.location}</Descriptions.Item>
          <Descriptions.Item label="Submitted">
            <DateField value={approval.created_at} format="DD MMMM YYYY HH:mm" />
          </Descriptions.Item>
          <Descriptions.Item label="Reason">
            <Text italic>{approval.reason}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Credit Details */}
      <Card title="Credit Analysis" style={{ marginBottom: '16px' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Current Credit Limit</Text>
              <div style={{ fontSize: '24px', color: '#7c3aed' }}>
                {approval.current_limit.toLocaleString()} RWF
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Requested Limit</Text>
              <div style={{ fontSize: '24px', color: '#22c55e' }}>
                {approval.requested_limit.toLocaleString()} RWF
                <Tag color="green" style={{ marginLeft: '8px' }}>
                  +{((approval.requested_limit - approval.current_limit) / approval.current_limit * 100).toFixed(0)}%
                </Tag>
              </div>
            </div>
            <div>
              <Text strong>Increase Amount</Text>
              <div style={{ fontSize: '20px' }}>
                {(approval.requested_limit - approval.current_limit).toLocaleString()} RWF
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ marginBottom: '24px' }}>
              <Text strong>Current Credit Utilization</Text>
              <Progress
                percent={creditUtilization}
                status={creditUtilization >= 90 ? 'exception' : creditUtilization >= 70 ? 'normal' : 'success'}
                format={() => `${approval.credit_used.toLocaleString()} / ${approval.current_limit.toLocaleString()} RWF`}
              />
            </div>
            <div>
              <Text strong>Payment History</Text>
              <Progress
                percent={Number(paymentSuccessRate)}
                status={Number(paymentSuccessRate) >= 90 ? 'success' : Number(paymentSuccessRate) >= 75 ? 'normal' : 'exception'}
                format={() => `${approval.on_time_payments}/${approval.total_orders} on-time`}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Timeline */}
      <Card title="Request Timeline" style={{ marginBottom: '16px' }}>
        <Timeline
          items={[
            {
              color: 'blue',
              children: (
                <>
                  <strong>Request Submitted</strong>
                  <br />
                  <DateField value={approval.created_at} format="DD/MM/YYYY HH:mm" />
                </>
              ),
            },
            ...(approval.approved_at
              ? [{
                  color: 'green' as const,
                  children: (
                    <>
                      <strong>Approved</strong>
                      <br />
                      <Text>New limit: {approval.approved_limit?.toLocaleString()} RWF</Text>
                      <br />
                      <DateField value={approval.approved_at} format="DD/MM/YYYY HH:mm" />
                    </>
                  ),
                }]
              : []),
            ...(approval.rejected_at
              ? [{
                  color: 'red' as const,
                  children: (
                    <>
                      <strong>Rejected</strong>
                      <br />
                      <Text type="secondary">{approval.rejection_reason}</Text>
                      <br />
                      <DateField value={approval.rejected_at} format="DD/MM/YYYY HH:mm" />
                    </>
                  ),
                }]
              : []),
          ]}
        />
      </Card>

      {/* Action Buttons */}
      <Space>
        {approval.status === 'pending' && (
          <>
            <Button type="primary" size="large" onClick={() => setApproveModalOpen(true)}>
              Approve Request
            </Button>
            <Button danger size="large" onClick={() => setRejectModalOpen(true)}>
              Reject Request
            </Button>
          </>
        )}
        <Button size="large">View Order History</Button>
        <Button size="large">Contact Retailer</Button>
      </Space>

      {/* Approve Modal */}
      <Modal
        title="Approve Credit Limit"
        open={approveModalOpen}
        onCancel={() => setApproveModalOpen(false)}
        onOk={handleApprove}
        okText="Approve"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Approved Credit Limit (RWF)"
            name="approved_limit"
            initialValue={approval.requested_limit}
            rules={[{ required: true }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
              min={approval.current_limit}
            />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <TextArea rows={3} placeholder="Optional notes about this approval..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Credit Request"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleReject}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Rejection Reason"
            name="rejection_reason"
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
