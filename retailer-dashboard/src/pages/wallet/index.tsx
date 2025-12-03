import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Alert,
  Spin,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Tag,
  Space,
  Divider,
} from 'antd';
import {
  WalletOutlined,
  DollarOutlined,
  SwapOutlined,
  ShoppingCartOutlined,
  ReloadOutlined,
  PlusOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { walletApi } from '../../lib/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface WalletBalance {
  wallet_balance: number;
  loan_balance: number;
  total_balance: number;
  available_for_transfer: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_type: 'wallet' | 'loan';
  description: string;
  wallet_balance_after: number;
  loan_balance_after: number;
  created_at: string;
}

export const WalletPage: React.FC = () => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Fetch wallet balance
  const fetchBalance = async () => {
    try {
      setError(null);
      const data = await walletApi.getBalance();
      setBalance(data);
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
      setError(err.response?.data?.error || 'Failed to load wallet balance');
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const data = await walletApi.getTransactions({ limit: 50 });
      setTransactions(data.transactions || []);
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBalance(), fetchTransactions()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), fetchTransactions()]);
    setRefreshing(false);
  };

  // Handle top-up
  const handleTopUp = async (values: any) => {
    try {
      setTopUpLoading(true);
      await walletApi.topUp(values.amount, values.paymentMethod);
      setTopUpModalVisible(false);
      form.resetFields();
      await handleRefresh();
    } catch (err: any) {
      console.error('Top-up failed:', err);
      setError(err.response?.data?.error || 'Failed to process top-up');
    } finally {
      setTopUpLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Transaction table columns
  const columns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => <Text type="secondary">{formatDate(date)}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Type',
      dataIndex: 'balance_type',
      key: 'balance_type',
      render: (type: string) => (
        <Tag color={type === 'wallet' ? 'blue' : 'orange'}>
          {type === 'wallet' ? 'Wallet' : 'Loan'}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number, record: Transaction) => {
        const isCredit = ['top_up', 'loan_disbursement', 'refund', 'transfer_in'].includes(record.type);
        return (
          <Text type={isCredit ? 'success' : 'danger'}>
            {isCredit ? '+' : '-'}{formatCurrency(Math.abs(amount))}
          </Text>
        );
      },
    },
    {
      title: 'Balance After',
      key: 'balance_after',
      align: 'right' as const,
      render: (_: any, record: Transaction) => {
        const balance = record.balance_type === 'wallet'
          ? record.wallet_balance_after
          : record.loan_balance_after;
        return <Text strong>{formatCurrency(balance)}</Text>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Wallet</Title>
          <Text type="secondary">Manage your wallet and loan balances</Text>
        </div>
        <Space>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => setTopUpModalVisible(true)}
          >
            Top Up Wallet
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Important Notice */}
      <Alert
        message="Balance Usage Rules"
        description={
          <div>
            <Text><strong>Wallet Balance:</strong> Can be used for purchases, transfers, and withdrawals.</Text>
            <br />
            <Text><strong>Loan Balance:</strong> Can ONLY be used for purchases. Cannot be transferred or withdrawn.</Text>
          </div>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Balance Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* Wallet Balance Card */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Wallet Balance"
              value={balance?.wallet_balance || 0}
              prefix={<WalletOutlined />}
              suffix="RWF"
              valueStyle={{ color: '#3f8600' }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              ✓ Transferable & Withdrawable
            </Text>
          </Card>
        </Col>

        {/* Loan Balance Card */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Loan Balance"
              value={balance?.loan_balance || 0}
              prefix={<DollarOutlined />}
              suffix="RWF"
              valueStyle={{ color: '#cf1322' }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              ⚠ Purchase-only (Non-transferable)
            </Text>
          </Card>
        </Col>

        {/* Total Balance Card */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Balance"
              value={balance?.total_balance || 0}
              prefix={<ShoppingCartOutlined />}
              suffix="RWF"
              valueStyle={{ color: '#1890ff' }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Available for Purchases
            </Text>
          </Card>
        </Col>

        {/* Available for Transfer Card */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Available for Transfer"
              value={balance?.available_for_transfer || 0}
              prefix={<SwapOutlined />}
              suffix="RWF"
              valueStyle={{ color: '#722ed1' }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Wallet balance only
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Transaction History */}
      <Card title="Transaction History">
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} transactions`,
          }}
          locale={{
            emptyText: 'No transactions yet',
          }}
        />
      </Card>

      {/* Top-Up Modal */}
      <Modal
        title="Top Up Wallet"
        open={topUpModalVisible}
        onCancel={() => {
          setTopUpModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleTopUp}
        >
          <Form.Item
            name="amount"
            label="Amount (RWF)"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', min: 100, message: 'Minimum amount is 100 RWF' },
            ]}
          >
            <Input
              type="number"
              placeholder="Enter amount"
              prefix="RWF"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select placeholder="Select payment method" size="large">
              <Option value="mtn_momo">MTN Mobile Money</Option>
              <Option value="airtel_money">Airtel Money</Option>
              <Option value="bank_transfer">Bank Transfer</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={topUpLoading}
              block
              size="large"
            >
              Proceed to Payment
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WalletPage;
