'use client';

import Link from 'next/link';
import { Wallet, Flame, ShoppingBag, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { walletApi } from '@/lib/api';

const quickActions = [
  { href: '/wallet', icon: Wallet, label: 'Top Up Wallet', color: 'bg-green-500' },
  { href: '/gas', icon: Flame, label: 'Buy Gas', color: 'bg-orange-500' },
  { href: '/shop', icon: ShoppingBag, label: 'Shop Now', color: 'bg-blue-500' },
  { href: '/loans', icon: FileText, label: 'Food Loan', color: 'bg-purple-500' },
];

const predefinedAmounts = [300, 500, 1000, 2000, 5000, 10000];

export default function HomePage() {
  const { balance, setBalance } = useWalletStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const data = await walletApi.getBalance();
        setBalance(data.balance);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, [setBalance]);

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Welcome Card with Balance */}
      <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm opacity-80">Welcome back!</p>
            <h1 className="text-xl font-semibold">My Dashboard</h1>
          </div>
          <Link
            href="/wallet"
            className="bg-white/20 px-3 py-1 rounded-full text-sm hover:bg-white/30 transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="mt-6">
          <p className="text-sm opacity-80">Wallet Balance</p>
          <p className="text-3xl font-bold">
            {loading ? '...' : `${balance.toLocaleString()} RWF`}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/wallet?action=topup"
            className="flex-1 bg-white text-primary-700 py-2 rounded-lg text-center font-medium hover:bg-white/90 transition-colors"
          >
            Top Up
          </Link>
          <Link
            href="/wallet/history"
            className="flex-1 bg-white/20 py-2 rounded-lg text-center font-medium hover:bg-white/30 transition-colors"
          >
            History
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="card flex items-center gap-3 hover:shadow-lg transition-shadow"
            >
              <div className={`${action.color} p-3 rounded-lg`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-sm">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Top-up */}
      <section className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Quick Top-up</h2>
          <Link href="/wallet" className="text-primary-600 text-sm flex items-center gap-1">
            More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {predefinedAmounts.map((amount) => (
            <Link
              key={amount}
              href={`/wallet?action=topup&amount=${amount}`}
              className="border border-gray-200 rounded-lg py-3 text-center font-medium hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              {amount.toLocaleString()}
            </Link>
          ))}
        </div>
      </section>

      {/* NFC Card Promo */}
      <section className="card bg-gradient-to-r from-gray-800 to-gray-900 text-white">
        <div className="flex items-center gap-4">
          <CreditCard className="w-12 h-12" />
          <div className="flex-1">
            <h3 className="font-semibold">BIG Shop Card</h3>
            <p className="text-sm opacity-80">Link your NFC card for easy payments</p>
          </div>
          <Link
            href="/cards"
            className="bg-white text-gray-800 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
          >
            Setup
          </Link>
        </div>
      </section>

      {/* USSD Info */}
      <section className="card bg-yellow-50 border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>No data?</strong> Dial <span className="font-mono">*939#</span> to access
          your account, top up, and buy gas via USSD.
        </p>
      </section>
    </div>
  );
}
