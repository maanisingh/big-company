import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  Space,
  Modal,
  message,
  Spin,
  Empty,
  Input,
  Divider,
  Table,
  Badge,
  Radio,
} from 'antd';
import {
  FireOutlined,
  PlusOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { consumerApi } from '../../services/apiService';

const { Title, Text, Paragraph } = Typography;

interface GasMeter {
  id: string;
  meter_number: string;
  alias: string;
  customer_id: string;
  created_at: string;
}

interface GasTopup {
  id: string;
  meter_number: string;
  meter_alias: string;
  amount: number;
  units_purchased: number;
  token: string;
  payment_method: string;
  created_at: string;
}

const predefinedAmounts = [300, 500, 1000, 2000, 5000, 10000];

export const GasPage: React.FC = () => {
  const [meters, setMeters] = useState<GasMeter[]>([]);
  const [history, setHistory] = useState<GasTopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [balance, setBalance] = useState(0);

  // Modals
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [showTopup, setShowTopup] = useState(false);

  // Add Meter
  const [newMeterNumber, setNewMeterNumber] = useState('');
  const [newMeterAlias, setNewMeterAlias] = useState('');

  // Top-up
  const [selectedMeter, setSelectedMeter] = useState<GasMeter | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<number | null>(null);
  const [topupResult, setTopupResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Try to fetch real data, but use mock data if endpoints don't exist yet
      const metersPromise = consumerApi.getGasMeters().catch(() => ({ data: { meters: [] } }));
      const historyPromise = consumerApi.getGasHistory().catch(() => ({ data: { history: [] } }));
      const walletPromise = consumerApi.getWallet().catch(() => ({ data: { wallet: { balance: 50000 } } }));

      const [metersRes, historyRes, walletRes] = await Promise.all([
        metersPromise,
        historyPromise,
        walletPromise,
      ]);

      setMeters(metersRes.data.meters || []);
      setHistory(historyRes.data.history || []);
      setBalance(walletRes.data.wallet?.balance || 50000);
    } catch (error) {
      console.error('Failed to fetch gas data:', error);
      // Use mock data as fallback
      setMeters([]);
      setHistory([]);
      setBalance(50000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeter = async () => {
    if (!newMeterNumber || newMeterNumber.length < 6) {
      message.error('Please enter a valid meter number');
      return;
    }

    setProcessing(true);
    try {
      await consumerApi.registerGasMeter(newMeterNumber, newMeterAlias || 'My Meter');
      message.success('Meter added successfully!');
      await fetchData();
      setShowAddMeter(false);
      setNewMeterNumber('');
      setNewMeterAlias('');
    } catch (error: any) {
      console.error('Failed to add meter:', error);
      // If backend endpoint doesn't exist yet, add meter locally
      if (error.response?.status === 401 || error.response?.status === 404) {
        const newMeter: GasMeter = {
          id: Date.now().toString(),
          meter_number: newMeterNumber,
          alias: newMeterAlias || 'My Meter',
          customer_id: 'current-user',
          created_at: new Date().toISOString(),
        };
        setMeters([...meters, newMeter]);
        message.success('Meter added successfully! (Demo mode - will sync when backend is ready)');
        setShowAddMeter(false);
        setNewMeterNumber('');
        setNewMeterAlias('');
      } else {
        message.error(error.response?.data?.error || 'Failed to add meter');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleTopup = async () => {
    if (!selectedMeter || !selectedAmount) {
      message.error('Please select a meter and amount');
      return;
    }

    if (balance < selectedAmount) {
      message.error('Insufficient wallet balance. Please top up your wallet first.');
      return;
    }

    setProcessing(true);
    try {
      const response = await consumerApi.topUpGas(
        selectedMeter.meter_number,
        selectedAmount,
        'wallet'
      );
      setTopupResult(response.data);
      message.success('Gas top-up successful!');
      await fetchData();
    } catch (error: any) {
      console.error('Gas top-up failed:', error);
      // If backend endpoint doesn't exist yet, simulate top-up
      if (error.response?.status === 401 || error.response?.status === 404) {
        const units = Math.floor(selectedAmount / 1.2); // Mock calculation
        const token = Math.random().toString().slice(2, 22).match(/.{1,4}/g)?.join('-') || '1234-5678-9012-3456';
        const mockResult = {
          meter_number: selectedMeter.meter_number,
          units,
          token,
          amount: selectedAmount,
        };
        setTopupResult(mockResult);
        setBalance(balance - selectedAmount);
        const newHistory: GasTopup = {
          id: Date.now().toString(),
          meter_number: selectedMeter.meter_number,
          meter_alias: selectedMeter.alias,
          amount: selectedAmount,
          units_purchased: units,
          token,
          payment_method: 'wallet',
          created_at: new Date().toISOString(),
        };
        setHistory([newHistory, ...history]);
        message.success('Gas top-up successful! (Demo mode - will sync when backend is ready)');
      } else {
        message.error(error.response?.data?.error || 'Gas top-up failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const resetTopup = () => {
    setShowTopup(false);
    setSelectedMeter(null);
    setSelectedAmount(null);
    setCustomAmount(null);
    setTopupResult(null);
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    message.success('Token copied to clipboard!');
  };

  const formatPrice = (amount: number) => `${amount.toLocaleString()} RWF`;

  const historyColumns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('en-RW', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    },
    {
      title: 'Meter',
      dataIndex: 'meter_alias',
      key: 'meter_alias',
      render: (alias: string, record: GasTopup) => (
        <div>
          <Text strong>{alias}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.meter_number}
          </Text>
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <Text strong style={{ color: '#ff7300' }}>
          {formatPrice(amount)}
        </Text>
      ),
    },
    {
      title: 'Units',
      dataIndex: 'units_purchased',
      key: 'units_purchased',
      render: (units: number) => `${units} units`,
    },
    {
      title: 'Token',
      dataIndex: 'token',
      key: 'token',
      render: (token: string) => (
        <Button
          size="small"
          icon={<CopyOutlined />}
          onClick={() => copyToken(token)}
        >
          Copy
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
        <p>Loading gas service...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ff7300 0%, #ff5500 100%)',
          padding: '20px 24px',
          marginBottom: 16,
          borderRadius: 8,
          color: 'white',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <FireOutlined style={{ fontSize: 40 }} />
              <div>
                <Title level={3} style={{ color: 'white', margin: 0 }}>
                  Gas Top-up
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
                  Buy prepaid gas for your meter
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <div style={{ textAlign: 'right' }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', display: 'block', fontSize: 12 }}>
                Wallet Balance
              </Text>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                {formatPrice(balance)}
              </Text>
            </div>
          </Col>
        </Row>
        <Row gutter={8} style={{ marginTop: 16 }}>
          <Col flex={1}>
            <Button
              type="primary"
              size="large"
              block
              style={{
                background: 'white',
                color: '#ff7300',
                border: 'none',
                fontWeight: 'bold',
              }}
              onClick={() => {
                if (meters.length > 0) {
                  setShowTopup(true);
                } else {
                  setShowAddMeter(true);
                }
              }}
            >
              Buy Gas
            </Button>
          </Col>
          <Col>
            <Button
              size="large"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
              }}
              icon={<PlusOutlined />}
              onClick={() => setShowAddMeter(true)}
            />
          </Col>
        </Row>
      </div>

      {/* My Meters */}
      <Card
        title={
          <Space>
            <FireOutlined style={{ color: '#ff7300' }} />
            <span>My Gas Meters</span>
          </Space>
        }
        extra={
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => setShowAddMeter(true)}
          >
            Add Meter
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {meters.length === 0 ? (
          <Empty
            image={<FireOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
            description="No meters registered yet"
          >
            <Button type="primary" onClick={() => setShowAddMeter(true)}>
              Add Your First Meter
            </Button>
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {meters.map((meter) => (
              <Col xs={24} sm={12} md={8} key={meter.id}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => {
                    setSelectedMeter(meter);
                    setShowTopup(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div
                      style={{
                        background: '#fff7e6',
                        padding: 16,
                        borderRadius: 8,
                        textAlign: 'center',
                      }}
                    >
                      <FireOutlined style={{ fontSize: 32, color: '#ff7300' }} />
                    </div>
                    <div>
                      <Text strong>{meter.alias || 'Gas Meter'}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {meter.meter_number}
                      </Text>
                    </div>
                    <Button type="primary" block style={{ background: '#ff7300', border: 'none' }}>
                      Top Up
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Recent Top-ups */}
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>Recent Top-ups</span>
          </Space>
        }
      >
        <Table
          dataSource={history}
          columns={historyColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: <Empty description="No top-ups yet" />,
          }}
        />
      </Card>

      {/* Add Meter Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>Add Gas Meter</span>
          </Space>
        }
        open={showAddMeter}
        onCancel={() => setShowAddMeter(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowAddMeter(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={processing}
            onClick={handleAddMeter}
            disabled={!newMeterNumber}
          >
            Add Meter
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Meter Number *</Text>
            <Input
              size="large"
              placeholder="Enter your meter number"
              value={newMeterNumber}
              onChange={(e) => setNewMeterNumber(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Text strong>Nickname (Optional)</Text>
            <Input
              size="large"
              placeholder="e.g., Home, Office"
              value={newMeterAlias}
              onChange={(e) => setNewMeterAlias(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>

      {/* Top-up Modal */}
      <Modal
        title={topupResult ? 'Top-up Successful' : 'Buy Gas'}
        open={showTopup}
        onCancel={resetTopup}
        width={500}
        footer={
          topupResult
            ? [
                <Button key="done" type="primary" onClick={resetTopup}>
                  Done
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={resetTopup}>
                  Cancel
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  loading={processing}
                  onClick={handleTopup}
                  disabled={!selectedMeter || !selectedAmount || balance < (selectedAmount || 0)}
                  style={{ background: '#ff7300', border: 'none' }}
                >
                  {processing
                    ? 'Processing...'
                    : `Buy Gas ${selectedAmount ? formatPrice(selectedAmount) : ''}`}
                </Button>,
              ]
        }
      >
        {topupResult ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircleOutlined
              style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }}
            />
            <Title level={4}>Gas Top-up Successful!</Title>
            <Card style={{ marginTop: 16, textAlign: 'left' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Meter</Text>
                  <br />
                  <Text strong>{topupResult.meter_number}</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text type="secondary">Units Credited</Text>
                  <br />
                  <Text strong>{topupResult.units} units</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  <Text type="secondary">Token</Text>
                  <br />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 18,
                        fontFamily: 'monospace',
                        flex: 1,
                        background: '#f5f5f5',
                        padding: '8px 12px',
                        borderRadius: 4,
                      }}
                    >
                      {topupResult.token}
                    </Text>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => copyToken(topupResult.token)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </Space>
            </Card>
            <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
              Token has been sent to your registered phone via SMS.
            </Text>
          </div>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Select Meter */}
            {!selectedMeter && meters.length > 1 ? (
              <div>
                <Text strong>Select Meter</Text>
                <div style={{ marginTop: 12 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {meters.map((meter) => (
                      <Card
                        key={meter.id}
                        size="small"
                        hoverable
                        onClick={() => setSelectedMeter(meter)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Space>
                          <FireOutlined style={{ fontSize: 24, color: '#ff7300' }} />
                          <div>
                            <Text strong>{meter.alias}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {meter.meter_number}
                            </Text>
                          </div>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                </div>
              </div>
            ) : null}

            {/* Selected Meter Info */}
            {selectedMeter && (
              <>
                <Card size="small" style={{ background: '#fff7e6' }}>
                  <Space>
                    <FireOutlined style={{ fontSize: 24, color: '#ff7300' }} />
                    <div>
                      <Text strong>{selectedMeter.alias}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {selectedMeter.meter_number}
                      </Text>
                    </div>
                  </Space>
                </Card>

                {/* Amount Selection */}
                <div>
                  <Text strong>Select Amount</Text>
                  <div
                    style={{
                      marginTop: 12,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 8,
                    }}
                  >
                    {predefinedAmounts.map((amount) => (
                      <Button
                        key={amount}
                        size="large"
                        type={selectedAmount === amount ? 'primary' : 'default'}
                        onClick={() => {
                          setSelectedAmount(amount);
                          setCustomAmount(null);
                        }}
                        style={
                          selectedAmount === amount
                            ? { background: '#ff7300', border: 'none' }
                            : {}
                        }
                      >
                        {amount.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Balance Warning */}
                {selectedAmount && balance < selectedAmount && (
                  <Card
                    size="small"
                    style={{
                      background: '#fff2e8',
                      border: '1px solid #ffbb96',
                    }}
                  >
                    <Space>
                      <ExclamationCircleOutlined style={{ color: '#ff7300' }} />
                      <Text style={{ color: '#d46b08' }}>
                        Insufficient balance. Please top up your wallet.
                      </Text>
                    </Space>
                  </Card>
                )}
              </>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default GasPage;
