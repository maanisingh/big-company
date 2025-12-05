'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Gift,
  Clock,
  Loader2,
  Share2,
  ShoppingBag,
  Users,
  MessageCircle,
  UserPlus,
  Flame,
  FileText,
  ExternalLink
} from 'lucide-react';
import { rewardsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface RewardTransaction {
  id: string;
  date: string;
  meter_id: string;
  order_amount: number;
  gas_amount_m3: number;
  order_id: string;
  created_at: string;
}

type TabType = 'overview' | 'history';

export default function RewardsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(true);

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
        const [historyData, inviteData] = await Promise.all([
          rewardsApi.getHistory(50),
          rewardsApi.getInviteLink(),
        ]);

        setTransactions(historyData.transactions || []);
        setInviteLink(inviteData.invite_link || '');
      } catch (error) {
        console.error('Failed to fetch rewards data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Share invite link
  const shareInviteLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BIG Company',
          text: 'Sign up with BIG Company and start earning gas rewards when you shop!',
          url: inviteLink,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied to clipboard!');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-RW', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gas Rewards</h1>
              <p className="text-sm opacity-90">Earn free gas as you shop</p>
            </div>
          </div>

          <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Total Gas Rewards Earned</p>
            <p className="text-4xl font-bold">
              {transactions.reduce((sum, tx) => sum + tx.gas_amount_m3, 0).toFixed(2)} M³
            </p>
            <p className="text-xs opacity-80 mt-2">
              From {transactions.length} reward{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white sticky top-14 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto flex">
          {[
            { key: 'overview', label: 'Overview', icon: Gift },
            { key: 'history', label: 'History', icon: Clock },
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
            {/* How It Works */}
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
              {/* Shop and get free gas */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                <div className="bg-green-50 p-3 rounded-xl">
                  <ShoppingBag className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Shop and get free gas</h3>
                  <p className="text-sm text-gray-600">
                    Earn gas rewards as you shop with BIG stores
                  </p>
                </div>
              </div>

              {/* Share your gas rewards */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <Flame className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Share your gas rewards with your friends</h3>
                  <p className="text-sm text-gray-600">
                    While shopping, share your gas rewards to your friend's meter ID
                  </p>
                </div>
              </div>

              {/* Share your experience */}
              <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                <div className="bg-purple-50 p-3 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Share your experience with friends</h3>
                  <p className="text-sm text-gray-600">
                    Inform friends and family, this information should be known by all
                  </p>
                </div>
              </div>

              {/* Invite friends */}
              <div className="flex items-start gap-4">
                <div className="bg-orange-50 p-3 rounded-xl">
                  <UserPlus className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Invite friends</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Share the BIG Company webapp with friends and family
                  </p>
                  {inviteLink && (
                    <button
                      onClick={shareInviteLink}
                      className="w-full bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Invite Link
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Rewards Information */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-5 shadow-sm border border-primary-200">
              <h3 className="font-semibold text-primary-900 mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                About Gas Rewards
              </h3>
              <div className="space-y-2 text-sm text-primary-800">
                <p>• Gas rewards are earned automatically when you shop at BIG stores</p>
                <p>• Rewards are added directly to your gas meter</p>
                <p>• Track all your gas rewards in the History tab</p>
                <p>• Share rewards with friends by providing their meter ID during checkout</p>
              </div>
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Rewards Yet</h3>
                <p className="text-gray-500 mb-4">
                  Start shopping at BIG stores to earn gas rewards!
                </p>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-green-100 p-2 rounded-lg">
                          <Flame className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Gas Reward</p>
                          <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          +{tx.gas_amount_m3.toFixed(2)} M³
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500 mb-0.5">Meter ID</p>
                        <p className="font-mono font-medium text-xs">{tx.meter_id}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500 mb-0.5">Order Amount</p>
                        <p className="font-semibold">{tx.order_amount.toLocaleString()} RWF</p>
                      </div>
                    </div>

                    {/* Order Link */}
                    <Link
                      href={`/orders/${tx.order_id}`}
                      className="mt-3 flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      View Order Invoice
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
