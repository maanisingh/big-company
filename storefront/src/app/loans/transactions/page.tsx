'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  CreditCard,
  DollarSign,
  Calendar,
  Loader2,
  Filter,
  Receipt,
} from 'lucide-react';
import { loansApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface CreditTransaction {
  id: string;
  type: 'loan_given' | 'credit_paid' | 'card_credit_order';
  amount: number;
  balance_after: number;
  date: string;
  description: string;
  reference: string;
  order_id?: string;
  shop_name?: string;
}

type FilterType = 'all' | 'loan_given' | 'credit_paid' | 'card_credit_order';

export default function CreditTransactionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/loans/transactions');
      return;
    }
    fetchTransactions();
  }, [isAuthenticated, router, filter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await loansApi.getCreditTransactions(filter);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch credit transactions:', error);
    } finally {
      setLoading(false);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'loan_given':
        return { icon: TrendingUp, bg: 'bg-green-100', color: 'text-green-600' };
      case 'credit_paid':
        return { icon: TrendingDown, bg: 'bg-blue-100', color: 'text-blue-600' };
      case 'card_credit_order':
        return { icon: CreditCard, bg: 'bg-purple-100', color: 'text-purple-600' };
      default:
        return { icon: DollarSign, bg: 'bg-gray-100', color: 'text-gray-600' };
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'loan_given':
        return 'Loan Disbursed';
      case 'credit_paid':
        return 'Payment Made';
      case 'card_credit_order':
        return 'Card Order (Credit)';
      default:
        return 'Transaction';
    }
  };

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.type === filter);

  const transactionsByType = {
    all: transactions.length,
    loan_given: transactions.filter(tx => tx.type === 'loan_given').length,
    credit_paid: transactions.filter(tx => tx.type === 'credit_paid').length,
    card_credit_order: transactions.filter(tx => tx.type === 'card_credit_order').length,
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
      <div className="bg-white sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Credit Transactions</h1>
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          >
            <Filter className="w-5 h-5" />
            {filter !== 'all' && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary-600 rounded-full"></span>
            )}
          </button>
        </div>

        {/* Filter Dropdown */}
        {showFilter && (
          <div className="max-w-lg mx-auto px-4 pb-3">
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={() => {
                  setFilter('all');
                  setShowFilter(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  filter === 'all' ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <span className="font-medium">All Transactions</span>
                <span className="text-sm text-gray-500">({transactionsByType.all})</span>
              </button>
              <button
                onClick={() => {
                  setFilter('loan_given');
                  setShowFilter(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between border-t border-gray-100 ${
                  filter === 'loan_given' ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <span className="font-medium">Loans Given</span>
                <span className="text-sm text-gray-500">({transactionsByType.loan_given})</span>
              </button>
              <button
                onClick={() => {
                  setFilter('credit_paid');
                  setShowFilter(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between border-t border-gray-100 ${
                  filter === 'credit_paid' ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <span className="font-medium">Payments Made</span>
                <span className="text-sm text-gray-500">({transactionsByType.credit_paid})</span>
              </button>
              <button
                onClick={() => {
                  setFilter('card_credit_order');
                  setShowFilter(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between border-t border-gray-100 ${
                  filter === 'card_credit_order' ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <span className="font-medium">Card Credit Orders</span>
                <span className="text-sm text-gray-500">({transactionsByType.card_credit_order})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Loans</span>
            </div>
            <p className="text-lg font-bold">{transactionsByType.loan_given}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">Payments</span>
            </div>
            <p className="text-lg font-bold">{transactionsByType.credit_paid}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-600">Card Orders</span>
            </div>
            <p className="text-lg font-bold">{transactionsByType.card_credit_order}</p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold">Transaction History</h2>
            <p className="text-xs text-gray-500">
              {filter === 'all' ? 'All' : getTransactionLabel(filter)} transactions
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No transactions found</p>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const { icon: Icon, bg, color } = getTransactionIcon(tx.type);
                const isCredit = tx.type === 'loan_given';

                return (
                  <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="font-medium text-sm">{getTransactionLabel(tx.type)}</p>
                            <p className="text-xs text-gray-500">{tx.description}</p>
                          </div>
                          <span className={`text-lg font-bold whitespace-nowrap ml-2 ${
                            isCredit ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {isCredit ? '+' : '-'}{formatPrice(tx.amount)}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(tx.date)}</span>
                          </div>
                          {tx.reference && (
                            <span className="font-mono text-xs">
                              Ref: {tx.reference}
                            </span>
                          )}
                        </div>

                        {/* Card Order Details */}
                        {tx.type === 'card_credit_order' && tx.shop_name && (
                          <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-2 text-xs">
                            <p className="text-purple-900">
                              <strong>Shop:</strong> {tx.shop_name}
                            </p>
                            {tx.order_id && (
                              <p className="text-purple-700">
                                Order: {tx.order_id}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Balance After */}
                        <div className="mt-2 text-xs text-gray-500">
                          Balance after: <span className="font-medium text-gray-700">{formatPrice(tx.balance_after)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Transaction Types</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Loan Given:</strong> Credit added to your account</p>
            <p>• <strong>Payment Made:</strong> Loan repayments from balance or mobile money</p>
            <p>• <strong>Card Credit Orders:</strong> Physical store purchases on credit via NFC card</p>
          </div>
        </div>
      </div>
    </div>
  );
}
