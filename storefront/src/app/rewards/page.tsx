'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Gift,
  Star,
  Trophy,
  Clock,
  ArrowRight,
  Loader2,
  Share2,
  Copy,
  CheckCircle,
  ChevronRight,
  Flame,
  Wallet,
  Award,
  TrendingUp,
  Users
} from 'lucide-react';
import { rewardsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

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
  BRONZE: { color: 'from-amber-600 to-amber-800', icon: '🥉', min: 0 },
  SILVER: { color: 'from-gray-400 to-gray-600', icon: '🥈', min: 1000 },
  GOLD: { color: 'from-yellow-400 to-yellow-600', icon: '🥇', min: 5000 },
  PLATINUM: { color: 'from-purple-400 to-purple-600', icon: '💎', min: 15000 },
};

const transactionTypeConfig = {
  earned: { color: 'text-green-600 bg-green-100', icon: '+', label: 'Earned' },
  redeemed: { color: 'text-blue-600 bg-blue-100', icon: '-', label: 'Redeemed' },
  expired: { color: 'text-red-600 bg-red-100', icon: '-', label: 'Expired' },
  bonus: { color: 'text-purple-600 bg-purple-100', icon: '+', label: 'Bonus' },
  referral: { color: 'text-orange-600 bg-orange-100', icon: '+', label: 'Referral' },
};

type TabType = 'overview' | 'history' | 'redeem' | 'leaderboard';

export default function RewardsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [balance, setBalance] = useState<RewardsBalance | null>(null);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/rewards');
    }
  }, [isAuthenticated, router]);

  // Fetch rewards data
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;

      setLoading(true);
      try {
        const [balanceData, historyData, referralData, leaderboardData] = await Promise.all([
          rewardsApi.getBalance(),
          rewardsApi.getHistory(20),
          rewardsApi.getReferralCode(),
          rewardsApi.getLeaderboard('month'),
        ]);

        setBalance(balanceData);
        setTransactions(historyData.transactions || []);
        setReferralCode(referralData.referral_code || '');
        setLeaderboard(leaderboardData.leaderboard || []);
      } catch (error) {
        console.error('Failed to fetch rewards data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Copy referral code
  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share referral code
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

  // Redeem points
  const handleRedeem = async () => {
    const points = parseInt(redeemAmount);
    if (!points || points < 100) {
      setError('Minimum 100 points to redeem');
      return;
    }
    if (balance && points > balance.points) {
      setError('Insufficient points');
      return;
    }

    setRedeeming(true);
    setError('');
    setSuccess('');

    try {
      const response = await rewardsApi.redeem(points);
      if (response.success) {
        setSuccess(`Redeemed ${points} points for ${(points * 10).toLocaleString()} RWF wallet credit!`);
        setBalance((prev) => prev ? { ...prev, points: prev.points - points } : null);
        setRedeemAmount('');
      } else {
        setError(response.error || 'Failed to redeem points');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to redeem points');
    } finally {
      setRedeeming(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-RW', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const currentTier = balance?.tier || 'BRONZE';
  const tierInfo = tierConfig[currentTier];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Card */}
      <div className={`bg-gradient-to-br ${tierInfo.color} text-white p-6`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{tierInfo.icon}</span>
              <div>
                <p className="text-sm opacity-80">Current Tier</p>
                <p className="font-bold text-lg">{currentTier}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Multiplier</p>
              <p className="font-bold text-lg">{balance?.multiplier}x</p>
            </div>
          </div>

          <div className="bg-white/20 rounded-xl p-4">
            <div className="text-center mb-4">
              <p className="text-sm opacity-80">Available Points</p>
              <p className="text-4xl font-bold">{balance?.points.toLocaleString()}</p>
              <p className="text-sm opacity-80 mt-1">
                ≈ {((balance?.points || 0) * 10).toLocaleString()} RWF value
              </p>
            </div>

            {/* Tier Progress */}
            {balance?.next_tier && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>{currentTier}</span>
                  <span>{balance.next_tier}</span>
                </div>
                <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${balance.tier_progress}%` }}
                  />
                </div>
                <p className="text-xs text-center mt-2 opacity-80">
                  {balance.points_to_next_tier?.toLocaleString()} points to {balance.next_tier}
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-sm mt-4 opacity-80">
            Lifetime: {balance?.lifetime_points.toLocaleString()} points earned
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white sticky top-14 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto flex">
          {[
            { key: 'overview', label: 'Overview', icon: Gift },
            { key: 'history', label: 'History', icon: Clock },
            { key: 'redeem', label: 'Redeem', icon: Wallet },
            { key: 'leaderboard', label: 'Ranking', icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors flex flex-col items-center gap-1 ${
                activeTab === tab.key
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* How to Earn */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                How to Earn Points
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <Flame className="w-8 h-8 text-orange-500" />
                  <div className="flex-1">
                    <p className="font-medium">Buy Gas</p>
                    <p className="text-sm text-gray-600">
                      Earn 12% of gas profit as points (min. 1000 RWF profit)
                    </p>
                  </div>
                  <span className="text-orange-600 font-semibold">12%</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <Users className="w-8 h-8 text-purple-500" />
                  <div className="flex-1">
                    <p className="font-medium">Refer Friends</p>
                    <p className="text-sm text-gray-600">
                      Get 500 points per successful referral
                    </p>
                  </div>
                  <span className="text-purple-600 font-semibold">500</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Award className="w-8 h-8 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium">Tier Bonuses</p>
                    <p className="text-sm text-gray-600">
                      Higher tiers earn more points per transaction
                    </p>
                  </div>
                  <span className="text-blue-600 font-semibold">Up to 2x</span>
                </div>
              </div>
            </div>

            {/* Referral Section */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary-600" />
                Invite Friends
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Share your referral code and earn 500 points for each friend who signs up!
              </p>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono font-bold text-center">
                  {referralCode}
                </div>
                <button
                  onClick={copyReferralCode}
                  className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={shareReferralCode}
                  className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tier Benefits */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3">Tier Benefits</h3>
              <div className="space-y-3">
                {Object.entries(tierConfig).map(([tier, config]) => {
                  const isCurrentTier = tier === currentTier;
                  const multipliers: Record<string, string> = {
                    BRONZE: '1.0x',
                    SILVER: '1.25x',
                    GOLD: '1.5x',
                    PLATINUM: '2.0x',
                  };

                  return (
                    <div
                      key={tier}
                      className={`p-3 rounded-lg flex items-center gap-3 ${
                        isCurrentTier ? 'bg-primary-50 border-2 border-primary-500' : 'bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl">{config.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tier}</p>
                          {isCurrentTier && (
                            <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {config.min.toLocaleString()}+ lifetime points
                        </p>
                      </div>
                      <span className="font-bold text-primary-600">{multipliers[tier]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No History Yet</h3>
                <p className="text-gray-500">
                  Start earning points by buying gas or referring friends!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((tx) => {
                  const config = transactionTypeConfig[tx.type] || transactionTypeConfig.earned;

                  return (
                    <div key={tx.id} className="p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                        <span className="font-bold">{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{tx.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                      </div>
                      <span className={`font-semibold ${
                        tx.type === 'earned' || tx.type === 'bonus' || tx.type === 'referral'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {tx.type === 'earned' || tx.type === 'bonus' || tx.type === 'referral' ? '+' : '-'}
                        {tx.points.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Redeem Tab */}
        {activeTab === 'redeem' && (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {success}
              </div>
            )}

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3">Redeem Points</h3>
              <p className="text-sm text-gray-600 mb-4">
                Convert your points to wallet credit. 10 RWF per point.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points to Redeem
                  </label>
                  <input
                    type="number"
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                    placeholder="Enter points (min. 100)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="100"
                    max={balance?.points}
                  />
                </div>

                {redeemAmount && parseInt(redeemAmount) >= 100 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Points to redeem</span>
                      <span className="font-medium">{parseInt(redeemAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Wallet credit</span>
                      <span className="font-semibold text-primary-600">
                        {(parseInt(redeemAmount) * 10).toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick Select Amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {[100, 500, 1000, balance?.points || 0].map((amount, index) => (
                    <button
                      key={amount}
                      onClick={() => setRedeemAmount(amount.toString())}
                      disabled={amount > (balance?.points || 0)}
                      className="py-2 px-3 border border-gray-200 rounded-lg text-sm font-medium hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {index === 3 ? 'All' : amount.toLocaleString()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleRedeem}
                  disabled={redeeming || !redeemAmount || parseInt(redeemAmount) < 100}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {redeeming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Redeeming...
                    </>
                  ) : (
                    'Redeem Points'
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold">Monthly Leaderboard</h3>
              <p className="text-sm text-gray-600">Top earners this month</p>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Rankings Yet</h3>
                <p className="text-gray-500">Start earning points to appear on the leaderboard!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {leaderboard.map((entry) => {
                  const tierEmoji = tierConfig[entry.tier as keyof typeof tierConfig]?.icon || '🥉';

                  return (
                    <div
                      key={entry.rank}
                      className={`p-4 flex items-center gap-3 ${
                        entry.is_current_user ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                        entry.rank === 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {entry.rank}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{entry.name}</p>
                          {entry.is_current_user && (
                            <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{entry.tier}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg mr-1">{tierEmoji}</span>
                        <span className="font-bold">{entry.points.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
