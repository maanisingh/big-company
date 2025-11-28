'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowDownCircle, ArrowUpCircle, Clock, Check } from 'lucide-react';
import { walletApi } from '@/lib/api';
import { useWalletStore } from '@/lib/store';

const predefinedAmounts = [300, 500, 1000, 2000, 5000, 10000];
const paymentMethods = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', color: 'bg-yellow-500' },
  { id: 'airtel_money', name: 'Airtel Money', color: 'bg-red-500' },
];

export default function WalletPage() {
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');
  const initialAmount = searchParams.get('amount');

  const { balance, setBalance } = useWalletStore();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTopup, setShowTopup] = useState(initialAction === 'topup');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(
    initialAmount ? parseInt(initialAmount) : null
  );
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceData, transactionsData] = await Promise.all([
          walletApi.getBalance(),
          walletApi.getTransactions(),
        ]);
        setBalance(balanceData.balance);
        setTransactions(transactionsData.transactions || []);
      } catch (error) {
        console.error('Failed to fetch wallet data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setBalance]);

  const handleTopup = async () => {
    if (!selectedAmount || !selectedPayment || !phone) return;

    setProcessing(true);
    try {
      await walletApi.topUp(selectedAmount, selectedPayment, phone);
      setSuccess(true);
      setTimeout(() => {
        setShowTopup(false);
        setSuccess(false);
        setSelectedAmount(null);
        setSelectedPayment(null);
        setPhone('');
      }, 3000);
    } catch (error) {
      console.error('Top-up failed:', error);
      alert('Top-up failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Balance Card */}
      <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
        <p className="text-sm opacity-80">Available Balance</p>
        <p className="text-4xl font-bold mt-2">
          {loading ? '...' : `${balance.toLocaleString()} RWF`}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setShowTopup(true)}
            className="flex-1 bg-white text-green-700 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowDownCircle className="w-5 h-5" />
            Top Up
          </button>
          <button
            disabled
            className="flex-1 bg-white/20 py-3 rounded-lg font-medium flex items-center justify-center gap-2 opacity-60"
          >
            <ArrowUpCircle className="w-5 h-5" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Top-up Modal */}
      {showTopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">Payment Request Sent!</h2>
                <p className="text-gray-600 mt-2">
                  Please approve the payment on your phone.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Top Up Wallet</h2>
                  <button
                    onClick={() => setShowTopup(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>

                {/* Amount Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Amount
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {predefinedAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setSelectedAmount(amount)}
                        className={`amount-btn ${
                          selectedAmount === amount
                            ? 'amount-btn-selected'
                            : 'amount-btn-unselected'
                        }`}
                      >
                        {amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Method
                  </label>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPayment(method.id)}
                        className={`w-full p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                          selectedPayment === method.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`${method.color} w-10 h-10 rounded-lg`} />
                        <span className="font-medium">{method.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone Number */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="078XXXXXXX"
                    className="input"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleTopup}
                  disabled={!selectedAmount || !selectedPayment || !phone || processing}
                  className="btn-primary w-full py-3"
                >
                  {processing
                    ? 'Processing...'
                    : `Top Up ${selectedAmount?.toLocaleString() || ''} RWF`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Transactions</h2>
        <div className="card space-y-4">
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No transactions yet</p>
          ) : (
            transactions.slice(0, 10).map((tx: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {tx.type === 'credit' ? (
                      <ArrowDownCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowUpCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.type === 'credit' ? '+' : '-'}
                  {tx.amount.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
