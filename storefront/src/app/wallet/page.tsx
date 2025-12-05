'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  DollarSign,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from 'lucide-react';
import { walletApi, loansApi } from '@/lib/api';
import { useAuthStore, useWalletStore } from '@/lib/store';

interface Transaction {
  id: string;
  type: 'top_up' | 'gas_payment' | 'order_payment' | 'refund' | 'credit_payment' | 'loan_disbursement';
  amount: number;
  balance_type: 'dashboard' | 'credit';
  created_at: string;
  description: string;
  reference?: string;
}

interface RefundRequest {
  amount: number;
  phoneNumber: string;
  reason: string;
}

export default function WalletPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { balance, setBalance } = useWalletStore();

  const [loading, setLoading] = useState(true);
  const [dashboardBalance, setDashboardBalance] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showRequestLoanModal, setShowRequestLoanModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [refundRequest, setRefundRequest] = useState<RefundRequest>({
    amount: 0,
    phoneNumber: '',
    reason: ''
  });
  const [loanAmount, setLoanAmount] = useState('');
  const [repaymentFrequency, setRepaymentFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/wallet');
    }
  }, [isAuthenticated, router]);

  // Fetch wallet data
  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [walletData, transactionsData] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions()
      ]);

      const dashboard = walletData.dashboardBalance || 0;
      const credit = walletData.creditBalance || 0;

      setDashboardBalance(dashboard);
      setCreditBalance(credit);
      setAvailableBalance(dashboard + credit);
      setBalance(dashboard + credit);
      setTransactions(transactionsData.transactions || []);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWalletData();
    }
  }, [isAuthenticated]);

  // Handle top up
  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await walletApi.topUpDashboard(amount);
      await fetchWalletData();
      setShowTopUpModal(false);
      setTopUpAmount('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to top up');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle refund request
  const handleRefundRequest = async () => {
    if (!refundRequest.amount || !refundRequest.phoneNumber || !refundRequest.reason) {
      alert('Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      await walletApi.requestRefund(refundRequest);
      setShowRefundModal(false);
      setRefundRequest({ amount: 0, phoneNumber: '', reason: '' });
      alert('Refund request submitted successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit refund request');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle loan request
  const handleLoanRequest = async () => {
    const amount = parseFloat(loanAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await loansApi.requestLoan(amount, repaymentFrequency);
      setShowRequestLoanModal(false);
      setLoanAmount('');
      setRepaymentFrequency('weekly');
      alert('Loan request submitted successfully');
      router.push('/loans');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit loan request');
    } finally {
      setSubmitting(false);
    }
  };

  // Format price
  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-14 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Wallet & Cards</h1>
          <button
            onClick={fetchWalletData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Available Balance (No Top Up) */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Available Balance</span>
            <Wallet className="w-5 h-5 opacity-90" />
          </div>
          <h2 className="text-3xl font-bold mb-1">{formatPrice(availableBalance)}</h2>
          <p className="text-xs opacity-75">Dashboard + Credit Balance</p>
        </div>

        {/* Dashboard Balance (Replaced "Linked NFC Cards") */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Dashboard Balance</h3>
                <p className="text-xs text-gray-500">Main wallet</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-blue-600">{formatPrice(dashboardBalance)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTopUpModal(true)}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Top Up
            </button>
            <button
              onClick={() => setShowRefundModal(true)}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Request Refund
            </button>
          </div>
        </div>

        {/* Credit Balance (Replaced "This Month's Spending") */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Credit Balance</h3>
                <p className="text-xs text-gray-500">Available credit</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-green-600">{formatPrice(creditBalance)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRequestLoanModal(true)}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Request Loan
            </button>
            <button
              onClick={() => router.push('/loans')}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>

        {/* Recent Transactions (ALL: NFC + Credit) */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold">Recent Transactions</h2>
            <p className="text-xs text-gray-500">Dashboard & Credit transactions</p>
          </div>
          <div className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              transactions.slice(0, 10).map((txn) => {
                const isIncoming = ['top_up', 'refund', 'loan_disbursement'].includes(txn.type);
                return (
                  <div key={txn.id} className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isIncoming ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {isIncoming ? (
                        <ArrowDownRight className={`w-5 h-5 text-green-600`} />
                      ) : (
                        <ArrowUpRight className={`w-5 h-5 text-red-600`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(txn.created_at)} • {txn.balance_type === 'dashboard' ? 'Dashboard' : 'Credit'}
                      </p>
                    </div>
                    <span className={`font-semibold ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                      {isIncoming ? '+' : '-'}{formatPrice(txn.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {transactions.length > 10 && (
            <div className="p-4 border-t border-gray-100">
              <button className="w-full text-primary-600 text-sm font-medium hover:underline">
                View All Transactions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Top Up Dashboard Balance</h2>
              <p className="text-sm text-gray-600 mt-1">Add funds to your wallet</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (RWF)</label>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowTopUpModal(false);
                    setTopUpAmount('');
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTopUp}
                  disabled={submitting}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Top Up'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Request Refund</h2>
              <p className="text-sm text-gray-600 mt-1">Request a refund from your dashboard balance</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (RWF)</label>
                <input
                  type="number"
                  value={refundRequest.amount || ''}
                  onChange={(e) => setRefundRequest({...refundRequest, amount: parseFloat(e.target.value)})}
                  placeholder="Enter amount"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={refundRequest.phoneNumber}
                  onChange={(e) => setRefundRequest({...refundRequest, phoneNumber: e.target.value})}
                  placeholder="Phone number linked to account"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Must be the number linked to your account</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Refund</label>
                <textarea
                  value={refundRequest.reason}
                  onChange={(e) => setRefundRequest({...refundRequest, reason: e.target.value})}
                  placeholder="Explain why you need a refund..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundRequest({ amount: 0, phoneNumber: '', reason: '' });
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefundRequest}
                  disabled={submitting}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Loan Modal */}
      {showRequestLoanModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Request Loan</h2>
              <p className="text-sm text-gray-600 mt-1">Apply for a credit loan</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount (RWF)</label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="Enter loan amount"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Repayment Frequency</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRepaymentFrequency('daily')}
                    className={`p-3 border-2 rounded-lg font-medium transition-all ${
                      repaymentFrequency === 'daily'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepaymentFrequency('weekly')}
                    className={`p-3 border-2 rounded-lg font-medium transition-all ${
                      repaymentFrequency === 'weekly'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Weekly
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Choose how often you want to make loan payments
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Your loan application will be reviewed by our team
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowRequestLoanModal(false);
                    setLoanAmount('');
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLoanRequest}
                  disabled={submitting}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
