import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Descriptions,
  Tabs,
  Alert,
  Tooltip,
  Badge,
  Divider,
  Empty,
  Spin,
} from 'antd';
import {
  CreditCardOutlined,
  ScanOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  ReloadOutlined,
  WalletOutlined,
  HistoryOutlined,
  UserOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { nfcApi } from '../../services/apiService';

const { Title, Text, Paragraph } = Typography;

// Types for NFC Card data
interface NFCCard {
  id: string;
  uid: string;
  card_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  status: 'active' | 'blocked' | 'inactive';
  balance: number;
  is_primary: boolean;
  linked_at: string;
  last_used?: string;
  nickname?: string;
}

interface NFCTransaction {
  id: string;
  type: 'payment' | 'topup' | 'transfer' | 'refund';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  merchant_name?: string;
}

interface CardStats {
  total_cards: number;
  active_cards: number;
  blocked_cards: number;
  total_balance: number;
  transactions_today: number;
  revenue_today: number;
}

const NFCCardsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [selectedCard, setSelectedCard] = useState<NFCCard | null>(null);
  const [cardTransactions, setCardTransactions] = useState<NFCTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [balanceCheckModalVisible, setBalanceCheckModalVisible] = useState(false);
  const [cardDetailsModalVisible, setCardDetailsModalVisible] = useState(false);
  const [issueCardModalVisible, setIssueCardModalVisible] = useState(false);
  const [cardBalance, setCardBalance] = useState<{ balance: number; available: number } | null>(null);
  const [paymentForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('cards');

  // Mock data for demonstration (will be replaced with API calls)
  const mockCards: NFCCard[] = [
    {
      id: '1',
      uid: '04:A1:B2:C3:D4:E5:F6',
      card_number: 'NFC-001-2024',
      customer_id: 'cust_001',
      customer_name: 'Jean Baptiste',
      customer_phone: '+250788123456',
      status: 'active',
      balance: 15000,
      is_primary: true,
      linked_at: '2024-01-15T10:30:00Z',
      last_used: '2024-11-30T09:15:00Z',
      nickname: 'Main Card',
    },
    {
      id: '2',
      uid: '04:F1:E2:D3:C4:B5:A6',
      card_number: 'NFC-002-2024',
      customer_id: 'cust_002',
      customer_name: 'Marie Claire',
      customer_phone: '+250738654321',
      status: 'active',
      balance: 8500,
      is_primary: true,
      linked_at: '2024-02-20T14:45:00Z',
      last_used: '2024-11-29T16:30:00Z',
    },
    {
      id: '3',
      uid: '04:11:22:33:44:55:66',
      card_number: 'NFC-003-2024',
      customer_id: 'cust_003',
      customer_name: 'Patrick Habimana',
      customer_phone: '+250788999888',
      status: 'blocked',
      balance: 0,
      is_primary: false,
      linked_at: '2024-03-10T09:00:00Z',
      last_used: '2024-10-15T11:20:00Z',
      nickname: 'Old Card',
    },
  ];

  const mockStats: CardStats = {
    total_cards: 156,
    active_cards: 142,
    blocked_cards: 14,
    total_balance: 2450000,
    transactions_today: 78,
    revenue_today: 145000,
  };

  const mockTransactions: NFCTransaction[] = [
    { id: '1', type: 'payment', amount: -2500, description: 'Purchase at Shop A', status: 'completed', created_at: '2024-11-30T09:15:00Z', merchant_name: 'Kigali Shop' },
    { id: '2', type: 'topup', amount: 10000, description: 'MTN MoMo Top-up', status: 'completed', created_at: '2024-11-29T14:30:00Z' },
    { id: '3', type: 'payment', amount: -1500, description: 'Purchase at Shop B', status: 'completed', created_at: '2024-11-28T11:00:00Z', merchant_name: 'Downtown Store' },
    { id: '4', type: 'transfer', amount: -5000, description: 'Transfer to +250788******', status: 'completed', created_at: '2024-11-27T16:45:00Z' },
    { id: '5', type: 'refund', amount: 500, description: 'Refund from Shop A', status: 'completed', created_at: '2024-11-26T10:20:00Z' },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Try to load real data, fall back to mock
      // const [cardsRes, statsRes] = await Promise.all([
      //   nfcApi.getAllCards(),
      //   nfcApi.getCardStats(),
      // ]);
      // setCards(cardsRes.data.cards);
      // setStats(statsRes.data);

      // Using mock data for now
      setCards(mockCards);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load NFC cards:', error);
      // Use mock data on error
      setCards(mockCards);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadCardTransactions = async (cardId: string) => {
    setTransactionsLoading(true);
    try {
      // const response = await nfcApi.getCardTransactions(cardId);
      // setCardTransactions(response.data.transactions);
      setCardTransactions(mockTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setCardTransactions(mockTransactions);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleProcessPayment = async (values: any) => {
    try {
      setLoading(true);
      // await nfcApi.processNFCPayment(values.card_uid, values.pin, values.amount, values.description);
      message.success(`Payment of ${values.amount.toLocaleString()} RWF processed successfully!`);
      setPaymentModalVisible(false);
      paymentForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckBalance = async (values: any) => {
    try {
      setLoading(true);
      // const response = await nfcApi.checkCardBalance(values.card_uid, values.pin);
      // setCardBalance(response.data);
      setCardBalance({ balance: 15000, available: 14500 });
      message.success('Balance retrieved successfully');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to check balance');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockCard = async (card: NFCCard) => {
    Modal.confirm({
      title: 'Block Card',
      content: `Are you sure you want to block card ${card.card_number}? The customer will not be able to make payments.`,
      okText: 'Block',
      okType: 'danger',
      onOk: async () => {
        try {
          // await nfcApi.blockCard(card.id, 'Blocked by retailer');
          message.success('Card blocked successfully');
          loadData();
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to block card');
        }
      },
    });
  };

  const handleUnblockCard = async (card: NFCCard) => {
    Modal.confirm({
      title: 'Unblock Card',
      content: `Are you sure you want to unblock card ${card.card_number}?`,
      okText: 'Unblock',
      onOk: async () => {
        try {
          // await nfcApi.unblockCard(card.id);
          message.success('Card unblocked successfully');
          loadData();
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to unblock card');
        }
      },
    });
  };

  const handleIssueCard = async (values: any) => {
    try {
      setLoading(true);
      // await nfcApi.issueNewCard(values.customer_id, values.uid, values.pin);
      message.success('New card issued successfully!');
      setIssueCardModalVisible(false);
      issueForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to issue card');
    } finally {
      setLoading(false);
    }
  };

  const viewCardDetails = (card: NFCCard) => {
    setSelectedCard(card);
    loadCardTransactions(card.id);
    setCardDetailsModalVisible(true);
  };

  const columns: ColumnsType<NFCCard> = [
    {
      title: 'Card Number',
      dataIndex: 'card_number',
      key: 'card_number',
      render: (text, record) => (
        <Space>
          <CreditCardOutlined style={{ color: '#667eea' }} />
          <Text strong>{text}</Text>
          {record.is_primary && <Tag color="gold">Primary</Tag>}
        </Space>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.customer_name || 'Unknown'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.customer_phone}</Text>
        </Space>
      ),
    },
    {
      title: 'UID',
      dataIndex: 'uid',
      key: 'uid',
      render: (text) => <Text code style={{ fontSize: 11 }}>{text}</Text>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (amount) => (
        <Text strong style={{ color: amount > 0 ? '#52c41a' : '#999' }}>
          {amount.toLocaleString()} RWF
        </Text>
      ),
      sorter: (a, b) => a.balance - b.balance,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config: Record<string, { color: string; icon: React.ReactNode }> = {
          active: { color: 'success', icon: <CheckCircleOutlined /> },
          blocked: { color: 'error', icon: <CloseCircleOutlined /> },
          inactive: { color: 'default', icon: <CloseCircleOutlined /> },
        };
        const { color, icon } = config[status] || config.inactive;
        return <Tag color={color} icon={icon}>{status.toUpperCase()}</Tag>;
      },
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Blocked', value: 'blocked' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used',
      key: 'last_used',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'Never',
      sorter: (a, b) => new Date(a.last_used || 0).getTime() - new Date(b.last_used || 0).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => viewCardDetails(record)}
            />
          </Tooltip>
          {record.status === 'active' ? (
            <Tooltip title="Block Card">
              <Button
                type="text"
                danger
                icon={<LockOutlined />}
                onClick={() => handleBlockCard(record)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Unblock Card">
              <Button
                type="text"
                icon={<UnlockOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleUnblockCard(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const transactionColumns: ColumnsType<NFCTransaction> = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const config: Record<string, { color: string; label: string }> = {
          payment: { color: 'red', label: 'Payment' },
          topup: { color: 'green', label: 'Top-up' },
          transfer: { color: 'blue', label: 'Transfer' },
          refund: { color: 'orange', label: 'Refund' },
        };
        const { color, label } = config[type] || { color: 'default', label: type };
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong style={{ color: amount > 0 ? '#52c41a' : '#ff4d4f' }}>
          {amount > 0 ? '+' : ''}{amount.toLocaleString()} RWF
        </Text>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'completed' ? 'success' : status === 'pending' ? 'warning' : 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Title level={3} style={{ margin: 0 }}>
            <CreditCardOutlined style={{ marginRight: 12 }} />
            NFC Card Management
          </Title>
          <Text type="secondary">Manage customer NFC payment cards and process transactions</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<ScanOutlined />}
              onClick={() => setBalanceCheckModalVisible(true)}
            >
              Check Balance
            </Button>
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => setPaymentModalVisible(true)}
              style={{ background: '#52c41a' }}
            >
              Process Payment
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Total Cards"
                value={stats.total_cards}
                prefix={<CreditCardOutlined />}
                valueStyle={{ color: '#667eea' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Active Cards"
                value={stats.active_cards}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Blocked Cards"
                value={stats.blocked_cards}
                prefix={<LockOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Total Balance"
                value={stats.total_balance}
                suffix="RWF"
                prefix={<WalletOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Today's Transactions"
                value={stats.transactions_today}
                prefix={<HistoryOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card>
              <Statistic
                title="Today's Revenue"
                value={stats.revenue_today}
                suffix="RWF"
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Info Alert */}
      <Alert
        message="NFC Card Payment System"
        description={
          <span>
            Use cheap NFC tags/stickers and scan them with any NFC-enabled smartphone.
            Customers can top up their wallet via MTN MoMo or Airtel Money and pay using their NFC card.
            <br />
            <strong>USSD Access:</strong> Dial *939# to manage wallet balance via feature phones.
          </span>
        }
        type="info"
        showIcon
        icon={<SafetyOutlined />}
        style={{ marginBottom: 24 }}
      />

      {/* Cards Table */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'cards',
              label: (
                <span>
                  <CreditCardOutlined /> All Cards
                </span>
              ),
              children: (
                <Table
                  columns={columns}
                  dataSource={cards}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Total ${total} cards`,
                  }}
                />
              ),
            },
            {
              key: 'issue',
              label: (
                <span>
                  <CreditCardOutlined /> Issue New Card
                </span>
              ),
              children: (
                <Card style={{ maxWidth: 600 }}>
                  <Title level={4}>Issue New NFC Card</Title>
                  <Paragraph type="secondary">
                    Link a new cheap NFC tag/sticker to a customer account. The customer can then
                    use their phone's NFC reader or present the card at any NFC-enabled POS.
                  </Paragraph>
                  <Form
                    form={issueForm}
                    layout="vertical"
                    onFinish={handleIssueCard}
                    style={{ marginTop: 24 }}
                  >
                    <Form.Item
                      name="customer_phone"
                      label="Customer Phone"
                      rules={[{ required: true, message: 'Please enter customer phone' }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="+250788123456"
                      />
                    </Form.Item>
                    <Form.Item
                      name="uid"
                      label="NFC Card UID"
                      rules={[{ required: true, message: 'Please enter or scan the NFC UID' }]}
                      extra="Scan the NFC tag with your phone to get the UID, or enter it manually"
                    >
                      <Input
                        prefix={<CreditCardOutlined />}
                        placeholder="04:A1:B2:C3:D4:E5:F6"
                        addonAfter={
                          <Tooltip title="Use BigCompany Wallet app to scan">
                            <ScanOutlined style={{ cursor: 'pointer' }} />
                          </Tooltip>
                        }
                      />
                    </Form.Item>
                    <Form.Item
                      name="pin"
                      label="Initial PIN"
                      rules={[
                        { required: true, message: 'Please set a 4-digit PIN' },
                        { pattern: /^\d{4}$/, message: 'PIN must be exactly 4 digits' },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        maxLength={4}
                        placeholder="4-digit PIN"
                      />
                    </Form.Item>
                    <Form.Item
                      name="confirm_pin"
                      label="Confirm PIN"
                      dependencies={['pin']}
                      rules={[
                        { required: true, message: 'Please confirm the PIN' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('pin') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('PINs do not match'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        maxLength={4}
                        placeholder="Confirm 4-digit PIN"
                      />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<CreditCardOutlined />}
                        loading={loading}
                        size="large"
                        block
                      >
                        Issue Card
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              ),
            },
          ]}
        />
      </Card>

      {/* Process Payment Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#52c41a' }} />
            Process NFC Payment
          </Space>
        }
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          paymentForm.resetFields();
        }}
        footer={null}
        width={480}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handleProcessPayment}
        >
          <Alert
            message="Scan the customer's NFC card to get the UID, then enter their PIN to process payment."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Form.Item
            name="card_uid"
            label="Card UID"
            rules={[{ required: true, message: 'Please enter card UID' }]}
          >
            <Input
              prefix={<CreditCardOutlined />}
              placeholder="04:A1:B2:C3:D4:E5:F6"
              addonAfter={<ScanOutlined />}
            />
          </Form.Item>
          <Form.Item
            name="pin"
            label="Card PIN"
            rules={[
              { required: true, message: 'Please enter card PIN' },
              { pattern: /^\d{4}$/, message: 'PIN must be 4 digits' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              maxLength={4}
              placeholder="4-digit PIN"
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Amount (RWF)"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', min: 100, message: 'Minimum amount is 100 RWF' },
            ]}
          >
            <InputNumber
              prefix={<DollarOutlined />}
              placeholder="0"
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea
              placeholder="Purchase description..."
              rows={2}
            />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setPaymentModalVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<CheckCircleOutlined />}
                style={{ background: '#52c41a' }}
              >
                Process Payment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Check Balance Modal */}
      <Modal
        title={
          <Space>
            <WalletOutlined style={{ color: '#1890ff' }} />
            Check Card Balance
          </Space>
        }
        open={balanceCheckModalVisible}
        onCancel={() => {
          setBalanceCheckModalVisible(false);
          balanceForm.resetFields();
          setCardBalance(null);
        }}
        footer={null}
        width={480}
      >
        <Form
          form={balanceForm}
          layout="vertical"
          onFinish={handleCheckBalance}
        >
          <Form.Item
            name="card_uid"
            label="Card UID"
            rules={[{ required: true, message: 'Please enter card UID' }]}
          >
            <Input
              prefix={<CreditCardOutlined />}
              placeholder="04:A1:B2:C3:D4:E5:F6"
              addonAfter={<ScanOutlined />}
            />
          </Form.Item>
          <Form.Item
            name="pin"
            label="Card PIN"
            rules={[
              { required: true, message: 'Please enter card PIN' },
              { pattern: /^\d{4}$/, message: 'PIN must be 4 digits' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              maxLength={4}
              placeholder="4-digit PIN"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<ScanOutlined />}
              block
            >
              Check Balance
            </Button>
          </Form.Item>

          {cardBalance && (
            <Card style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Balance"
                    value={cardBalance.balance}
                    suffix="RWF"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Available"
                    value={cardBalance.available}
                    suffix="RWF"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Form>
      </Modal>

      {/* Card Details Modal */}
      <Modal
        title={
          <Space>
            <CreditCardOutlined style={{ color: '#667eea' }} />
            Card Details
          </Space>
        }
        open={cardDetailsModalVisible}
        onCancel={() => {
          setCardDetailsModalVisible(false);
          setSelectedCard(null);
          setCardTransactions([]);
        }}
        footer={null}
        width={800}
      >
        {selectedCard && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Card Number">
                <Text strong>{selectedCard.card_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="UID">
                <Text code>{selectedCard.uid}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                {selectedCard.customer_name || 'Unknown'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedCard.customer_phone}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedCard.status === 'active' ? 'success' : 'error'}>
                  {selectedCard.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Balance">
                <Text strong style={{ color: '#52c41a', fontSize: 18 }}>
                  {selectedCard.balance.toLocaleString()} RWF
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Linked At">
                {new Date(selectedCard.linked_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Last Used">
                {selectedCard.last_used ? new Date(selectedCard.last_used).toLocaleString() : 'Never'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Transaction History</Divider>

            {transactionsLoading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin size="large" />
              </div>
            ) : cardTransactions.length > 0 ? (
              <Table
                columns={transactionColumns}
                dataSource={cardTransactions}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            ) : (
              <Empty description="No transactions found" />
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default NFCCardsPage;
