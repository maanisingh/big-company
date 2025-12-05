'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, Flame, CreditCard, ShoppingBag, Package } from 'lucide-react';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/orders', icon: Package, label: 'My Orders' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/gas', icon: Flame, label: 'Gas' },
  { href: '/cards', icon: CreditCard, label: 'Cards' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Top Header */}
      <header className="bg-primary-600 text-white p-4 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            BIG Company
          </Link>
          <div className="text-sm">
            <span className="opacity-80">Rwanda</span>
          </div>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
