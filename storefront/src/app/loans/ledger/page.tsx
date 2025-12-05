'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CreditCard,
  DollarSign,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Smartphone,
  Wallet as WalletIcon,
  CheckCircle,
} from 'lucide-react';
import { loansApi, walletApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface LoanLedger {
  id: string;
  loan_number: string;
  principal: number;
  outstanding_balance: number;
  status: string;
  disbursement_date: string;
  next_payment_date: string;
  next_payment_amount: number;
  repayment_frequency: 'daily' | 'weekly';
  payments: PaymentSchedule[];
}

interface PaymentSchedule {
  payment_number: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_date?: string;
}

export default function LoanLedgerPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [loanLedger, setLoanLedger] = useState<LoanLedger | null>(null);
  const [dashboardBalance, setDashboardBalance] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'dashboard' | 'mobile_money'>('dashboard');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch loan ledger data
  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const [ledgerData, walletData] = await Promise.all([
        loansApi.getActiveLoanLedger(),
        walletApi.getBalance(),
      ]);
      setLoanLedger(ledgerData.loan);
      setDashboardBalance(walletData.dashboardBalance || 0);
    } catch (error) {
      console.error('Failed to fetch ledger data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/loans/ledger');
      return;
    }
    fetchLedgerData();
  }, [isAuthenticated, router]);

  // Handle payment
  const handlePayLoan = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'dashboard' && amount > dashboardBalance) {
      alert('Insufficient dashboard balance');
      return;
    }

    setProcessing(true);
    try {
      await loansApi.makePayment(loanLedger!.id, amount, paymentMethod);
      setShowPaymentModal(false);
      setPaymentAmount('');
      await fetchLedgerData();
      alert('Payment successful!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-RW', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const target = new Date(dateString);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!loanLedger) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto mt-8">
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">No Active Loan</h2>
            <p className="text-gray-600 mb-6">You don't have any active loans at the moment.</p>
            <button
              onClick={() => router.push('/wallet')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              Request a Loan
            </button>
          </div>
        </div>
      </div>
    );
  }

  const daysUntilNext = getDaysUntil(loanLedger.next_payment_date);
  const isOverdue = daysUntilNext < 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Credit Ledger</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Loan Overview */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-90">Outstanding Balance</span>
            <CreditCard className="w-5 h-5 opacity-90" />
          </div>
          <h2 className="text-3xl font-bold mb-1">{formatPrice(loanLedger.outstanding_balance)}</h2>
          <p className="text-xs opacity-75">Loan #{loanLedger.loan_number}</p>
        </div>

        {/* Payment Status Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Payment Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Loan Given</span>
              </div>
              <span className="font-medium">{formatDate(loanLedger.disbursement_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-green-600'}`} />
                <span className="text-sm text-gray-600">Next Payment Due</span>
              </div>
              <div className="text-right">
                <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(loanLedger.next_payment_date)}
                </p>
                <p className="text-xs text-gray-500">
                  {isOverdue ? `${Math.abs(daysUntilNext)} days overdue` : `in ${daysUntilNext} days`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-900">Next Payment Amount</span>
              <span className="text-lg font-bold text-purple-600">{formatPrice(loanLedger.next_payment_amount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Actions */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Make a Payment</h3>
          <p className="text-sm text-gray-600 mb-4">
            Pay your loan using your dashboard balance or mobile money
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setPaymentMethod('dashboard');
                setPaymentAmount(loanLedger.next_payment_amount.toString());
                setShowPaymentModal(true);
              }}
              className="flex flex-col items-center gap-2 p-4 border-2 border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
              disabled={dashboardBalance < loanLedger.next_payment_amount}
            >
              <WalletIcon className="w-6 h-6 text-primary-600" />
              <span className="text-sm font-medium">Dashboard Balance</span>
              <span className="text-xs text-gray-500">{formatPrice(dashboardBalance)}</span>
            </button>
            <button
              onClick={() => {
                setPaymentMethod('mobile_money');
                setPaymentAmount(loanLedger.next_payment_amount.toString());
                setShowPaymentModal(true);
              }}
              className="flex flex-col items-center gap-2 p-4 border-2 border-green-300 rounded-lg hover:bg-green-50 transition-colors"
            >
              <Smartphone className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium">Mobile Money</span>
              <span className="text-xs text-gray-500">MTN/Airtel</span>
            </button>
          </div>
        </div>

        {/* Loan Details */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Loan Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Principal Amount</span>
              <span className="font-medium">{formatPrice(loanLedger.principal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Repayment Frequency</span>
              <span className="font-medium capitalize">{loanLedger.repayment_frequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                loanLedger.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {loanLedger.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3">Payment Schedule</h3>
          <div className="space-y-2">
            {loanLedger.payments.map((payment) => (
              <div
                key={payment.payment_number}
                className={`p-3 rounded-lg border ${
                  payment.status === 'paid'
                    ? 'border-green-200 bg-green-50'
                    : payment.status === 'overdue'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {payment.status === 'paid' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    <span className="text-sm font-medium">Payment #{payment.payment_number}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(payment.amount)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-600">
                    {payment.status === 'paid' ? `Paid on ${formatDate(payment.paid_date!)}` : `Due ${formatDate(payment.due_date)}`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    payment.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : payment.status === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Pay Loan</h2>
              <p className="text-sm text-gray-600 mt-1">
                Pay using {paymentMethod === 'dashboard' ? 'Dashboard Balance' : 'Mobile Money'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (RWF)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Next payment: {formatPrice(loanLedger.next_payment_amount)}
                </p>
              </div>
              {paymentMethod === 'dashboard' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    Available Balance: {formatPrice(dashboardBalance)}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount('');
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayLoan}
                  disabled={processing}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
