import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Statistic,
  message,
  Tabs,
  Alert,
  Empty,
  Spin,
  Divider,
  Badge,
  Tooltip,
} from 'antd';
import {
  WalletOutlined,
  CreditCardOutlined,
  HistoryOutlined,
  PlusOutlined,
  SendOutlined,
  PhoneOutlined,
  BankOutlined,
  SafetyOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  StarOutlined,
  StarFilled,
  QrcodeOutlined,
  MobileOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { nfcApi, walletApi } from '../../services/apiService';

const { Title, Text, Paragraph } = Typography;

// Types
interface WalletBalance {
  balance: number;
  currency: string;
  food_loan_credit: number;
  total_available: number;
}

interface NFCCard {
  id: string;
  uid: string;
  card_number: string;
  status: 'active' | 'blocked' | 'inactive';
  is_primary: boolean;
  linked_at: string;
  last_used?: string;
  nickname?: string;
}

interface Transaction {
  id: string;
  type: 'payment' | 'topup' | 'transfer' | 'refund';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  merchant_name?: string;
}

const ConsumerWalletPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [linkCardModalVisible, setLinkCardModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [changePinModalVisible, setChangePinModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<NFCCard | null>(null);
  const [activeTab, setActiveTab] = useState('wallet');

  const [topUpForm] = Form.useForm();
  const [linkCardForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [changePinForm] = Form.useForm();

  // Mock data
  const mockBalance: WalletBalance = {
    balance: 25000,
    currency: 'RWF',
    food_loan_credit: 5000,
    total_available: 30000,
  };

  const mockCards: NFCCard[] = [
    {
      id: '1',
      uid: '04:A1:B2:C3:D4:E5:F6',
      card_number: 'NFC-001-2024',
      status: 'active',
      is_primary: true,
      linked_at: '2024-01-15T10:30:00Z',
      last_used: '2024-11-30T09:15:00Z',
      nickname: 'My Main Card',
    },
    {
      id: '2',
      uid: '04:F1:E2:D3:C4:B5:A6',
      card_number: 'NFC-002-2024',
      status: 'active',
      is_primary: false,
      linked_at: '2024-06-20T14:45:00Z',
      last_used: '2024-11-25T16:30:00Z',
      nickname: 'Backup Card',
    },
  ];

  const mockTransactions: Transaction[] = [
    { id: '1', type: 'payment', amount: -2500, description: 'Purchase at Kigali Shop', status: 'completed', created_at: '2024-11-30T09:15:00Z', merchant_name: 'Kigali Shop' },
    { id: '2', type: 'topup', amount: 10000, description: 'MTN MoMo Top-up', status: 'completed', created_at: '2024-11-29T14:30:00Z' },
    { id: '3', type: 'payment', amount: -1500, description: 'Purchase at Downtown Store', status: 'completed', created_at: '2024-11-28T11:00:00Z', merchant_name: 'Downtown Store' },
    { id: '4', type: 'transfer', amount: -5000, description: 'Transfer to +250788******', status: 'completed', created_at: '2024-11-27T16:45:00Z' },
    { id: '5', type: 'refund', amount: 500, description: 'Refund from Kigali Shop', status: 'completed', created_at: '2024-11-26T10:20:00Z' },
    { id: '6', type: 'topup', amount: 20000, description: 'Airtel Money Top-up', status: 'completed', created_at: '2024-11-25T09:00:00Z' },
  ];

  interface CreditTransaction {
    id: string;
    type: 'approval' | 'purchase' | 'repayment';
    amount: number;
    description: string;
    status: 'completed' | 'pending';
    created_at: string;
    merchant_name?: string;
    balance_after: number;
  }

  const mockCreditTransactions: CreditTransaction[] = [
    { id: 'c1', type: 'approval', amount: 5000, description: 'Food Credit Approval', status: 'completed', created_at: '2024-11-20T10:00:00Z', balance_after: 5000 },
    { id: 'c2', type: 'purchase', amount: -1500, description: 'Purchase at Kigali Shop (Food)', status: 'completed', created_at: '2024-11-22T14:30:00Z', merchant_name: 'Kigali Shop', balance_after: 3500 },
    { id: 'c3', type: 'purchase', amount: -800, description: 'Purchase at Nyamirambo Market (Food)', status: 'completed', created_at: '2024-11-25T09:15:00Z', merchant_name: 'Nyamirambo Market', balance_after: 2700 },
    { id: 'c4', type: 'repayment', amount: -2700, description: 'Credit Repayment via Wallet', status: 'completed', created_at: '2024-11-28T16:00:00Z', balance_after: 0 },
    { id: 'c5', type: 'approval', amount: 5000, description: 'Food Credit Approval', status: 'completed', created_at: '2024-11-29T11:00:00Z', balance_after: 5000 },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Use mock data for now
      setBalance(mockBalance);
      setCards(mockCards);
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      setBalance(mockBalance);
      setCards(mockCards);
      setTransactions(mockTransactions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTopUp = async (values: any) => {
    try {
      setLoading(true);
      // await walletApi.topUpMobileMoney(values.amount, values.phone, values.provider);
      message.success(`Top-up request of ${values.amount.toLocaleString()} RWF submitted! Check your ${values.provider.toUpperCase()} for confirmation.`);
      setTopUpModalVisible(false);
      topUpForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Top-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCard = async (values: any) => {
    try {
      setLoading(true);
      // await nfcApi.linkCard(values.uid, values.pin, values.nickname);
      message.success('NFC card linked successfully!');
      setLinkCardModalVisible(false);
      linkCardForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to link card');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (values: any) => {
    try {
      setLoading(true);
      // await walletApi.transfer(values.recipient_phone, values.amount, values.pin, values.description);
      message.success(`${values.amount.toLocaleString()} RWF sent to ${values.recipient_phone}`);
      setTransferModalVisible(false);
      transferForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (values: any) => {
    if (!selectedCard) return;
    try {
      setLoading(true);
      // await nfcApi.setCardPin(selectedCard.id, values.old_pin, values.new_pin);
      message.success('Card PIN changed successfully!');
      setChangePinModalVisible(false);
      changePinForm.resetFields();
      setSelectedCard(null);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to change PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (card: NFCCard) => {
    try {
      // await nfcApi.setPrimaryCard(card.id);
      message.success(`${card.nickname || card.card_number} set as primary card`);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to set primary card');
    }
  };

  const handleUnlinkCard = async (card: NFCCard) => {
    Modal.confirm({
      title: 'Unlink Card',
      content: `Are you sure you want to unlink ${card.nickname || card.card_number}? You will need to re-link it if you want to use it again.`,
      okText: 'Unlink',
      okType: 'danger',
      onOk: async () => {
        try {
          // await nfcApi.unlinkCard(card.id);
          message.success('Card unlinked successfully');
          loadData();
        } catch (error: any) {
          message.error(error.response?.data?.message || 'Failed to unlink card');
        }
      },
    });
  };

  const creditTransactionColumns: ColumnsType<CreditTransaction> = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
      width: 100,
    },
    {
      title: 'Description',
      key: 'description',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.description}</Text>
          {record.merchant_name && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.merchant_name}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const config: Record<string, { color: string; label: string }> = {
          approval: { color: 'green', label: 'Credit Approved' },
          purchase: { color: 'orange', label: 'Purchase' },
          repayment: { color: 'blue', label: 'Repayment' },
        };
        const { color, label } = config[type] || { color: 'default', label: type };
        return <Tag color={color}>{label}</Tag>;
      },
      width: 130,
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
      align: 'right',
      width: 120,
    },
    {
      title: 'Balance',
      dataIndex: 'balance_after',
      key: 'balance_after',
      render: (balance) => (
        <Text>{balance.toLocaleString()} RWF</Text>
      ),
      align: 'right',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'completed' ? 'success' : 'warning';
        return <Tag color={color}>{status}</Tag>;
      },
      width: 100,
    },
  ];

  const transactionColumns: ColumnsType<Transaction> = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
      width: 100,
    },
    {
      title: 'Description',
      key: 'description',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.description}</Text>
          {record.merchant_name && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.merchant_name}</Text>
          )}
        </Space>
      ),
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
      width: 100,
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
      align: 'right',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'completed' ? 'success' : status === 'pending' ? 'warning' : 'error';
        return <Tag color={color}>{status}</Tag>;
      },
      width: 100,
    },
  ];

  return (
    <div style={{ padding: '16px' }} className="wallet-page">
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Title level={3} style={{ margin: 0 }}>
            <WalletOutlined style={{ marginRight: 12 }} />
            My Wallet
          </Title>
          <Text type="secondary">Manage your digital wallet and NFC payment cards</Text>
        </Col>
      </Row>

      {/* Balance Card */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12} lg={8}>
          <Card
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 16,
            }}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                  Available Balance
                </Text>
                <Title level={2} style={{ color: 'white', margin: 0 }}>
                  {balance?.total_available?.toLocaleString() || 0} RWF
                </Title>
              </div>
              {balance?.food_loan_credit && balance.food_loan_credit > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                  Includes {balance.food_loan_credit.toLocaleString()} RWF Food Credit
                </Text>
              )}
              <Button
                type="primary"
                ghost
                icon={<PlusOutlined />}
                onClick={() => setTopUpModalVisible(true)}
                style={{ borderColor: 'white', color: 'white' }}
              >
                Top Up
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={8}>
          <Card>
            <Statistic
              title="Linked NFC Cards"
              value={cards.filter(c => c.status === 'active').length}
              suffix={`/ ${cards.length}`}
              prefix={<CreditCardOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={() => setLinkCardModalVisible(true)}
              style={{ padding: 0, marginTop: 8 }}
            >
              Link New Card
            </Button>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={8}>
          <Card>
            <Statistic
              title="This Month's Spending"
              value={12500}
              suffix="RWF"
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              15 transactions
            </Text>
          </Card>
        </Col>
      </Row>

      {/* USSD Info */}
      <Alert
        message="Access your wallet via USSD"
        description={
          <span>
            Dial <Text strong code>*939#</Text> from your registered phone to check balance,
            transfer money, or manage your cards without internet.
          </span>
        }
        type="info"
        showIcon
        icon={<MobileOutlined />}
        style={{ marginBottom: 24 }}
      />

      {/* Tabs for Cards and Transactions */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'wallet',
              label: (
                <span>
                  <HistoryOutlined /> Transactions
                </span>
              ),
              children: (
                <Table
                  columns={transactionColumns}
                  dataSource={transactions}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 600 }}
                  size="small"
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => `${total} transactions`,
                    size: 'small',
                  }}
                />
              ),
            },
            {
              key: 'cards',
              label: (
                <span>
                  <CreditCardOutlined /> My NFC Cards
                </span>
              ),
              children: cards.length > 0 ? (
                <Row gutter={[16, 16]}>
                  {cards.map((card) => (
                    <Col xs={24} sm={12} lg={8} key={card.id}>
                      <Card
                        style={{
                          background: card.is_primary
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
                          color: 'white',
                          borderRadius: 12,
                        }}
                        actions={[
                          <Tooltip title={card.is_primary ? 'Primary Card' : 'Set as Primary'}>
                            <Button
                              type="text"
                              icon={card.is_primary ? <StarFilled style={{ color: '#fadb14' }} /> : <StarOutlined />}
                              onClick={() => !card.is_primary && handleSetPrimary(card)}
                              style={{ color: 'white' }}
                            />
                          </Tooltip>,
                          <Tooltip title="Change PIN">
                            <Button
                              type="text"
                              icon={<LockOutlined />}
                              onClick={() => {
                                setSelectedCard(card);
                                setChangePinModalVisible(true);
                              }}
                              style={{ color: 'white' }}
                            />
                          </Tooltip>,
                          <Tooltip title="Unlink Card">
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleUnlinkCard(card)}
                              style={{ color: '#ff7875' }}
                            />
                          </Tooltip>,
                        ]}
                      >
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <CreditCardOutlined style={{ fontSize: 32 }} />
                            {card.is_primary && (
                              <Tag color="gold">Primary</Tag>
                            )}
                          </div>
                          <div style={{ marginTop: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                              {card.nickname || 'NFC Card'}
                            </Text>
                            <Title level={4} style={{ color: 'white', margin: 0, letterSpacing: 2 }}>
                              {card.card_number}
                            </Title>
                          </div>
                          <div>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                              UID: {card.uid}
                            </Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                              Status: <Badge status={card.status === 'active' ? 'success' : 'error'} text={<span style={{ color: 'white' }}>{card.status}</span>} />
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                              Linked: {new Date(card.linked_at).toLocaleDateString()}
                            </Text>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                  <Col xs={24} sm={12} lg={8}>
                    <Card
                      style={{
                        height: '100%',
                        minHeight: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #d9d9d9',
                        cursor: 'pointer',
                      }}
                      onClick={() => setLinkCardModalVisible(true)}
                    >
                      <Space direction="vertical" align="center">
                        <PlusOutlined style={{ fontSize: 32, color: '#999' }} />
                        <Text type="secondary">Link New Card</Text>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              ) : (
                <Empty
                  image={<CreditCardOutlined style={{ fontSize: 64, color: '#ccc' }} />}
                  description="No NFC cards linked yet"
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setLinkCardModalVisible(true)}
                  >
                    Link Your First Card
                  </Button>
                </Empty>
              ),
            },
            {
              key: 'credit',
              label: (
                <span>
                  <FileTextOutlined /> Credit Ledger
                </span>
              ),
              children: (
                <>
                  <Alert
                    message="Food Credit Usage"
                    description={
                      <span>
                        Current Credit: <Text strong>{balance?.food_loan_credit?.toLocaleString() || 0} RWF</Text>
                        <br />
                        This credit can only be used for food purchases at approved retailers.
                      </span>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Table
                    columns={creditTransactionColumns}
                    dataSource={mockCreditTransactions}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 700 }}
                    size="small"
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => `${total} credit transactions`,
                      size: 'small',
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Top Up Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#52c41a' }} />
            Top Up Wallet
          </Space>
        }
        open={topUpModalVisible}
        onCancel={() => {
          setTopUpModalVisible(false);
          topUpForm.resetFields();
        }}
        footer={null}
        width={480}
      >
        <Form
          form={topUpForm}
          layout="vertical"
          onFinish={handleTopUp}
        >
          <Form.Item
            name="provider"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select
              placeholder="Select payment method"
              options={[
                { value: 'mtn', label: <><PhoneOutlined /> MTN Mobile Money (078)</> },
                { value: 'airtel', label: <><PhoneOutlined /> Airtel Money (073)</> },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: 'Please enter phone number' },
              { pattern: /^(\+?250)?(78|73|72)\d{7}$/, message: 'Please enter valid Rwandan phone number' },
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="+250788123456" />
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
              style={{ width: '100%' }}
              placeholder="0"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
            />
          </Form.Item>
          <Alert
            message="Quick amounts"
            description={
              <Space wrap>
                {[500, 1000, 2000, 5000, 10000, 20000].map((amount) => (
                  <Button
                    key={amount}
                    size="small"
                    onClick={() => topUpForm.setFieldValue('amount', amount)}
                  >
                    {amount.toLocaleString()}
                  </Button>
                ))}
              </Space>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block icon={<PlusOutlined />}>
              Top Up Now
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Link Card Modal */}
      <Modal
        title={
          <Space>
            <CreditCardOutlined style={{ color: '#667eea' }} />
            Link NFC Card
          </Space>
        }
        open={linkCardModalVisible}
        onCancel={() => {
          setLinkCardModalVisible(false);
          linkCardForm.resetFields();
        }}
        footer={null}
        width={480}
      >
        <Alert
          message="How to link your NFC card"
          description="Open the BigCompany Wallet app on your phone and tap 'Scan Card'. Hold the NFC tag/sticker near your phone to read its UID, then enter it below."
          type="info"
          showIcon
          icon={<QrcodeOutlined />}
          style={{ marginBottom: 24 }}
        />
        <Form
          form={linkCardForm}
          layout="vertical"
          onFinish={handleLinkCard}
        >
          <Form.Item
            name="uid"
            label="NFC Card UID"
            rules={[{ required: true, message: 'Please enter card UID' }]}
            extra="The unique ID from your NFC tag (e.g., 04:A1:B2:C3:D4:E5:F6)"
          >
            <Input prefix={<CreditCardOutlined />} placeholder="04:A1:B2:C3:D4:E5:F6" />
          </Form.Item>
          <Form.Item
            name="pin"
            label="Set Card PIN"
            rules={[
              { required: true, message: 'Please set a 4-digit PIN' },
              { pattern: /^\d{4}$/, message: 'PIN must be exactly 4 digits' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} maxLength={4} placeholder="4-digit PIN" />
          </Form.Item>
          <Form.Item
            name="confirm_pin"
            label="Confirm PIN"
            dependencies={['pin']}
            rules={[
              { required: true, message: 'Please confirm PIN' },
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
            <Input.Password prefix={<LockOutlined />} maxLength={4} placeholder="Confirm PIN" />
          </Form.Item>
          <Form.Item
            name="nickname"
            label="Card Nickname (Optional)"
          >
            <Input placeholder="e.g., My Main Card" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block icon={<CreditCardOutlined />}>
              Link Card
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: '#1890ff' }} />
            Transfer Money
          </Space>
        }
        open={transferModalVisible}
        onCancel={() => {
          setTransferModalVisible(false);
          transferForm.resetFields();
        }}
        footer={null}
        width={480}
      >
        <Form
          form={transferForm}
          layout="vertical"
          onFinish={handleTransfer}
        >
          <Form.Item
            name="recipient_phone"
            label="Recipient Phone"
            rules={[
              { required: true, message: 'Please enter recipient phone' },
              { pattern: /^(\+?250)?(78|73|72)\d{7}$/, message: 'Please enter valid phone number' },
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="+250788123456" />
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
              style={{ width: '100%' }}
              placeholder="0"
              max={balance?.total_available || 0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
            />
          </Form.Item>
          <Form.Item
            name="pin"
            label="Your PIN"
            rules={[
              { required: true, message: 'Please enter your PIN' },
              { pattern: /^\d{4}$/, message: 'PIN must be 4 digits' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} maxLength={4} placeholder="4-digit PIN" />
          </Form.Item>
          <Form.Item name="description" label="Note (Optional)">
            <Input placeholder="What's this for?" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block icon={<SendOutlined />}>
              Send Money
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Change PIN Modal */}
      <Modal
        title={
          <Space>
            <LockOutlined style={{ color: '#faad14' }} />
            Change Card PIN
          </Space>
        }
        open={changePinModalVisible}
        onCancel={() => {
          setChangePinModalVisible(false);
          changePinForm.resetFields();
          setSelectedCard(null);
        }}
        footer={null}
        width={400}
      >
        {selectedCard && (
          <Form
            form={changePinForm}
            layout="vertical"
            onFinish={handleChangePin}
          >
            <Alert
              message={`Changing PIN for: ${selectedCard.nickname || selectedCard.card_number}`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              name="old_pin"
              label="Current PIN"
              rules={[
                { required: true, message: 'Please enter current PIN' },
                { pattern: /^\d{4}$/, message: 'PIN must be 4 digits' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} maxLength={4} placeholder="Current 4-digit PIN" />
            </Form.Item>
            <Form.Item
              name="new_pin"
              label="New PIN"
              rules={[
                { required: true, message: 'Please enter new PIN' },
                { pattern: /^\d{4}$/, message: 'PIN must be 4 digits' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} maxLength={4} placeholder="New 4-digit PIN" />
            </Form.Item>
            <Form.Item
              name="confirm_new_pin"
              label="Confirm New PIN"
              dependencies={['new_pin']}
              rules={[
                { required: true, message: 'Please confirm new PIN' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_pin') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('PINs do not match'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} maxLength={4} placeholder="Confirm new PIN" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Change PIN
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ConsumerWalletPage;
