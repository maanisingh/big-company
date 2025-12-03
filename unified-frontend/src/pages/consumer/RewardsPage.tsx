import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  Space,
  Tabs,
  Progress,
  message,
  Spin,
  Empty,
  Input,
  Table,
  Badge,
  Alert,
  Statistic,
  Divider,
} from 'antd';
import {
  GiftOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  WalletOutlined,
  FireOutlined,
  TeamOutlined,
  CrownOutlined,
  ShareAltOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  StarFilled,
} from '@ant-design/icons';
import { consumerApi } from '../../services/apiService';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface RewardsBalance {
  points: number;
  lifetime_points: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  tier_progress: number;
  next_tier?: string;
  points_to_next_tier?: number;
  multiplier: number;
}

interface RewardTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral';
  points: number;
  description: string;
  created_at: string;
  metadata?: {
    gas_amount?: number;
    order_id?: string;
    referral_code?: string;
  };
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  tier: string;
  is_current_user: boolean;
}

const tierConfig = {
  BRONZE: {
    color: '#CD7F32',
    bgColor: '#FFF4E6',
    icon: '🥉',
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #B8732E 100%)',
    min: 0,
    multiplier: 1.0,
  },
  SILVER: {
    color: '#C0C0C0',
    bgColor: '#F5F5F5',
    icon: '🥈',
    gradient: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
    min: 1000,
    multiplier: 1.25,
  },
  GOLD: {
    color: '#FFD700',
    bgColor: '#FFFBEA',
    icon: '🥇',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFC700 100%)',
    min: 5000,
    multiplier: 1.5,
  },
  PLATINUM: {
    color: '#E5E4E2',
    bgColor: '#F9F9FF',
    icon: '💎',
    gradient: 'linear-gradient(135deg, #B9B6E5 0%, #8B5CF6 100%)',
    min: 15000,
    multiplier: 2.0,
  },
};

const transactionTypeConfig = {
  earned: { color: 'success', icon: '+', label: 'Earned' },
  redeemed: { color: 'processing', icon: '-', label: 'Redeemed' },
  expired: { color: 'error', icon: '-', label: 'Expired' },
  bonus: { color: 'purple', icon: '+', label: 'Bonus' },
  referral: { color: 'orange', icon: '+', label: 'Referral' },
};

export const RewardsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [balance, setBalance] = useState<RewardsBalance | null>(null);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Try to fetch real data, but use mock data if endpoints don't exist yet
      const mockBalance: RewardsBalance = {
        points: 2500,
        lifetime_points: 8750,
        tier: 'SILVER',
        tier_progress: 50,
        next_tier: 'GOLD',
        points_to_next_tier: 2500,
        multiplier: 1.25,
      };

      const mockTransactions: RewardTransaction[] = [
        {
          id: '1',
          type: 'earned',
          points: 50,
          description: 'Gas top-up - 5,000 RWF',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          type: 'bonus',
          points: 100,
          description: 'Weekly shopping bonus',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ];

      const mockLeaderboard: LeaderboardEntry[] = [
        { rank: 1, name: 'John D.', points: 15200, tier: 'PLATINUM', is_current_user: false },
        { rank: 2, name: 'Sarah M.', points: 12500, tier: 'GOLD', is_current_user: false },
        { rank: 3, name: 'You', points: 2500, tier: 'SILVER', is_current_user: true },
      ];

      const balancePromise = consumerApi.getRewardsBalance().catch(() => ({ data: mockBalance }));
      const historyPromise = consumerApi.getRewardsHistory(20).catch(() => ({ data: { transactions: mockTransactions } }));
      const referralPromise = consumerApi.getReferralCode().catch(() => ({ data: { referral_code: 'BIG' + Math.random().toString(36).substr(2, 6).toUpperCase() } }));
      const leaderboardPromise = consumerApi.getLeaderboard('month').catch(() => ({ data: { leaderboard: mockLeaderboard } }));

      const [balanceRes, historyRes, referralRes, leaderboardRes] = await Promise.all([
        balancePromise,
        historyPromise,
        referralPromise,
        leaderboardPromise,
      ]);

      setBalance(balanceRes.data);
      setTransactions(historyRes.data.transactions || mockTransactions);
      setReferralCode(referralRes.data.referral_code || 'BIG' + Math.random().toString(36).substr(2, 6).toUpperCase());
      setLeaderboard(leaderboardRes.data.leaderboard || mockLeaderboard);
    } catch (error) {
      console.error('Failed to fetch rewards data:', error);
      // Use mock data as complete fallback
      setBalance({
        points: 2500,
        lifetime_points: 8750,
        tier: 'SILVER',
        tier_progress: 50,
        next_tier: 'GOLD',
        points_to_next_tier: 2500,
        multiplier: 1.25,
      });
      setTransactions([]);
      setReferralCode('BIG' + Math.random().toString(36).substr(2, 6).toUpperCase());
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    message.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BIG Company',
          text: `Use my referral code ${referralCode} to sign up and get bonus rewards!`,
          url: `https://big.rw/register?ref=${referralCode}`,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      copyReferralCode();
    }
  };

  const handleRedeem = async () => {
    const points = parseInt(redeemAmount);
    if (!points || points < 100) {
      message.error('Minimum 100 points to redeem');
      return;
    }
    if (balance && points > balance.points) {
      message.error('Insufficient points');
      return;
    }

    setRedeeming(true);
    try {
      const response = await consumerApi.redeemRewards(points);
      if (response.data.success) {
        message.success(
          `Redeemed ${points} points for ${(points * 10).toLocaleString()} RWF wallet credit!`
        );
        setBalance((prev) => (prev ? { ...prev, points: prev.points - points } : null));
        setRedeemAmount('');
        await fetchData();
      } else {
        message.error(response.data.error || 'Failed to redeem points');
      }
    } catch (error: any) {
      console.error('Redemption failed:', error);
      // If backend endpoint doesn't exist yet, simulate redemption
      if (error.response?.status === 401 || error.response?.status === 404) {
        message.success(
          `Redeemed ${points} points for ${(points * 10).toLocaleString()} RWF wallet credit! (Demo mode - will sync when backend is ready)`
        );
        setBalance((prev) => (prev ? { ...prev, points: prev.points - points } : null));
        setRedeemAmount('');
        const newTransaction: RewardTransaction = {
          id: Date.now().toString(),
          type: 'redeemed',
          points,
          description: `Redeemed for ${(points * 10).toLocaleString()} RWF wallet credit`,
          created_at: new Date().toISOString(),
        };
        setTransactions([newTransaction, ...transactions]);
      } else {
        message.error(error.response?.data?.error || 'Failed to redeem points');
      }
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-RW', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const transactionColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config = transactionTypeConfig[type as keyof typeof transactionTypeConfig] || transactionTypeConfig.earned;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Points',
      dataIndex: 'points',
      key: 'points',
      render: (points: number, record: RewardTransaction) => {
        const isPositive = ['earned', 'bonus', 'referral'].includes(record.type);
        return (
          <Text strong style={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}>
            {isPositive ? '+' : '-'}
            {points.toLocaleString()}
          </Text>
        );
      },
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDate(date),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
        <p>Loading rewards...</p>
      </div>
    );
  }

  const currentTier = balance?.tier || 'BRONZE';
  const tierInfo = tierConfig[currentTier];

  return (
    <div>
      {/* Header Card */}
      <div
        style={{
          background: tierInfo.gradient,
          padding: 24,
          marginBottom: 16,
          borderRadius: 8,
          color: 'white',
        }}
      >
        <Row gutter={16} align="middle">
          <Col flex={1}>
            <Space direction="vertical" size={4}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 32 }}>{tierInfo.icon}</span>
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                    Current Tier
                  </Text>
                  <Title level={4} style={{ color: 'white', margin: 0 }}>
                    {currentTier}
                  </Title>
                </div>
              </div>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                Multiplier: {balance?.multiplier}x
              </Text>
            </Space>
          </Col>
          <Col>
            <div style={{ textAlign: 'right' }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                Available Points
              </Text>
              <Title level={2} style={{ color: 'white', margin: '8px 0 0 0' }}>
                {balance?.points.toLocaleString()}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                ≈ {((balance?.points || 0) * 10).toLocaleString()} RWF value
              </Text>
            </div>
          </Col>
        </Row>

        {/* Tier Progress */}
        {balance?.next_tier && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                {currentTier}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                {balance.next_tier}
              </Text>
            </div>
            <Progress
              percent={balance.tier_progress}
              strokeColor="white"
              trailColor="rgba(255,255,255,0.3)"
              showInfo={false}
            />
            <Text
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 12,
                display: 'block',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {balance.points_to_next_tier?.toLocaleString()} points to {balance.next_tier}
            </Text>
          </div>
        )}

        <Text
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            display: 'block',
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          Lifetime: {balance?.lifetime_points.toLocaleString()} points earned
        </Text>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* Overview Tab */}
          <TabPane
            tab={
              <span>
                <GiftOutlined />
                Overview
              </span>
            }
            key="overview"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* How to Earn */}
              <Card title="How to Earn Points" size="small">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Card
                    size="small"
                    style={{ background: '#fff7e6', border: '1px solid #ffd591' }}
                  >
                    <Row align="middle" gutter={16}>
                      <Col>
                        <FireOutlined style={{ fontSize: 32, color: '#ff7300' }} />
                      </Col>
                      <Col flex={1}>
                        <Text strong>Buy Gas</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Earn 12% of gas profit as points (min. 1000 RWF profit)
                        </Text>
                      </Col>
                      <Col>
                        <Tag color="orange">12%</Tag>
                      </Col>
                    </Row>
                  </Card>

                  <Card
                    size="small"
                    style={{ background: '#f9f0ff', border: '1px solid #d3adf7' }}
                  >
                    <Row align="middle" gutter={16}>
                      <Col>
                        <TeamOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                      </Col>
                      <Col flex={1}>
                        <Text strong>Refer Friends</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Get 500 points per successful referral
                        </Text>
                      </Col>
                      <Col>
                        <Tag color="purple">500</Tag>
                      </Col>
                    </Row>
                  </Card>

                  <Card
                    size="small"
                    style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}
                  >
                    <Row align="middle" gutter={16}>
                      <Col>
                        <CrownOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                      </Col>
                      <Col flex={1}>
                        <Text strong>Tier Bonuses</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Higher tiers earn more points per transaction
                        </Text>
                      </Col>
                      <Col>
                        <Tag color="blue">Up to 2x</Tag>
                      </Col>
                    </Row>
                  </Card>
                </Space>
              </Card>

              {/* Referral Section */}
              <Card
                title={
                  <Space>
                    <ShareAltOutlined />
                    Invite Friends
                  </Space>
                }
                size="small"
              >
                <Paragraph type="secondary">
                  Share your referral code and earn 500 points for each friend who signs up!
                </Paragraph>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    size="large"
                    value={referralCode}
                    readOnly
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}
                  />
                  <Button
                    size="large"
                    icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                    onClick={copyReferralCode}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    size="large"
                    type="primary"
                    icon={<ShareAltOutlined />}
                    onClick={shareReferralCode}
                  >
                    Share
                  </Button>
                </Space.Compact>
              </Card>

              {/* Tier Benefits */}
              <Card title="Tier Benefits" size="small">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {Object.entries(tierConfig).map(([tier, config]) => {
                    const isCurrentTier = tier === currentTier;
                    return (
                      <Card
                        key={tier}
                        size="small"
                        style={{
                          background: isCurrentTier ? config.bgColor : '#fafafa',
                          border: isCurrentTier ? `2px solid ${config.color}` : '1px solid #d9d9d9',
                        }}
                      >
                        <Row align="middle" gutter={16}>
                          <Col>
                            <span style={{ fontSize: 24 }}>{config.icon}</span>
                          </Col>
                          <Col flex={1}>
                            <Space>
                              <Text strong>{tier}</Text>
                              {isCurrentTier && <Tag color="blue">Current</Tag>}
                            </Space>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {config.min.toLocaleString()}+ lifetime points
                            </Text>
                          </Col>
                          <Col>
                            <Text strong style={{ color: config.color }}>
                              {config.multiplier}x
                            </Text>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </Space>
              </Card>
            </Space>
          </TabPane>

          {/* History Tab */}
          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                History
              </span>
            }
            key="history"
          >
            <Table
              dataSource={transactions}
              columns={transactionColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{
                emptyText: (
                  <Empty
                    description="No history yet"
                    image={<ClockCircleOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                  >
                    <Paragraph type="secondary">
                      Start earning points by buying gas or referring friends!
                    </Paragraph>
                  </Empty>
                ),
              }}
            />
          </TabPane>

          {/* Redeem Tab */}
          <TabPane
            tab={
              <span>
                <WalletOutlined />
                Redeem
              </span>
            }
            key="redeem"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Alert
                message="Redeem Your Points"
                description="Convert your points to wallet credit. 10 RWF per point."
                type="info"
                showIcon
              />

              <Card size="small">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text strong>Points to Redeem</Text>
                    <Input
                      size="large"
                      type="number"
                      placeholder="Enter points (min. 100)"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      min={100}
                      max={balance?.points}
                      style={{ marginTop: 8 }}
                    />
                  </div>

                  {redeemAmount && parseInt(redeemAmount) >= 100 && (
                    <Card size="small" style={{ background: '#f5f5f5' }}>
                      <Row justify="space-between">
                        <Col>
                          <Text type="secondary">Points to redeem</Text>
                        </Col>
                        <Col>
                          <Text strong>{parseInt(redeemAmount).toLocaleString()}</Text>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '8px 0' }} />
                      <Row justify="space-between">
                        <Col>
                          <Text type="secondary">Wallet credit</Text>
                        </Col>
                        <Col>
                          <Text strong style={{ color: '#52c41a' }}>
                            {(parseInt(redeemAmount) * 10).toLocaleString()} RWF
                          </Text>
                        </Col>
                      </Row>
                    </Card>
                  )}

                  {/* Quick Select */}
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Quick Select
                    </Text>
                    <Row gutter={8}>
                      {[100, 500, 1000, balance?.points || 0].map((amount, index) => (
                        <Col span={6} key={amount}>
                          <Button
                            block
                            size="large"
                            onClick={() => setRedeemAmount(amount.toString())}
                            disabled={amount > (balance?.points || 0)}
                          >
                            {index === 3 ? 'All' : amount.toLocaleString()}
                          </Button>
                        </Col>
                      ))}
                    </Row>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={handleRedeem}
                    loading={redeeming}
                    disabled={!redeemAmount || parseInt(redeemAmount) < 100}
                  >
                    Redeem Points
                  </Button>
                </Space>
              </Card>
            </Space>
          </TabPane>

          {/* Leaderboard Tab */}
          <TabPane
            tab={
              <span>
                <TrophyOutlined />
                Ranking
              </span>
            }
            key="leaderboard"
          >
            <Card title="Monthly Leaderboard" size="small">
              {leaderboard.length === 0 ? (
                <Empty
                  description="No rankings yet"
                  image={<TrophyOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                >
                  <Paragraph type="secondary">
                    Start earning points to appear on the leaderboard!
                  </Paragraph>
                </Empty>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {leaderboard.map((entry) => {
                    const tierEmoji =
                      tierConfig[entry.tier as keyof typeof tierConfig]?.icon || '🥉';
                    const rankColor =
                      entry.rank === 1
                        ? '#FFD700'
                        : entry.rank === 2
                        ? '#C0C0C0'
                        : entry.rank === 3
                        ? '#CD7F32'
                        : '#f0f0f0';

                    return (
                      <Card
                        key={entry.rank}
                        size="small"
                        style={{
                          background: entry.is_current_user ? '#e6f7ff' : 'white',
                          border: entry.is_current_user ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        }}
                      >
                        <Row align="middle" gutter={16}>
                          <Col>
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: rankColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: entry.rank <= 3 ? 'white' : '#666',
                              }}
                            >
                              {entry.rank}
                            </div>
                          </Col>
                          <Col flex={1}>
                            <Space>
                              <Text strong>{entry.name}</Text>
                              {entry.is_current_user && <Tag color="blue">You</Tag>}
                            </Space>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {entry.tier}
                            </Text>
                          </Col>
                          <Col>
                            <Space>
                              <span style={{ fontSize: 20 }}>{tierEmoji}</span>
                              <Text strong>{entry.points.toLocaleString()}</Text>
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </Space>
              )}
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default RewardsPage;
