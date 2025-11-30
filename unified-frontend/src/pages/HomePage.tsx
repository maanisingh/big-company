import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Simple Icon Components
const ShoppingBagIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const StoreIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePortalClick = (role: string) => {
    if (isAuthenticated && user?.role === role) {
      // Already logged in as this role - go to dashboard
      const dashboards: Record<string, string> = {
        consumer: '/consumer/shop',
        retailer: '/retailer/dashboard',
        wholesaler: '/wholesaler/dashboard',
      };
      navigate(dashboards[role]);
    } else {
      // Go to login page with role pre-selected
      navigate(`/login?role=${role}`);
    }
  };

  const portals = [
    {
      id: 'consumer',
      title: 'Consumer',
      subtitle: 'Shop & Order',
      description: 'Browse products, place orders, manage your wallet and NFC cards',
      icon: <ShoppingBagIcon />,
      gradient: 'from-emerald-500 to-teal-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-teal-700',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      features: ['Browse Products', 'Mobile Wallet', 'NFC Cards', 'Order Tracking'],
      authType: 'phone',
      credentials: { label1: 'Phone', value1: '250788100001', label2: 'PIN', value2: '1234' },
      dashboard: '/consumer/shop',
    },
    {
      id: 'retailer',
      title: 'Retailer',
      subtitle: 'Manage Your Shop',
      description: 'POS system, inventory management, order from wholesalers',
      icon: <StoreIcon />,
      gradient: 'from-blue-500 to-indigo-600',
      hoverGradient: 'hover:from-blue-600 hover:to-indigo-700',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      features: ['POS System', 'Inventory', 'Wholesaler Orders', 'NFC Management'],
      authType: 'email',
      credentials: { label1: 'Email', value1: 'retailer@bigcompany.rw', label2: 'Password', value2: 'retailer123' },
      dashboard: '/retailer/dashboard',
    },
    {
      id: 'wholesaler',
      title: 'Wholesaler',
      subtitle: 'Distribution Hub',
      description: 'Manage retailers, process bulk orders, credit approvals',
      icon: <TruckIcon />,
      gradient: 'from-purple-500 to-violet-600',
      hoverGradient: 'hover:from-purple-600 hover:to-violet-700',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
      features: ['Retailer Network', 'Bulk Orders', 'Credit Management', 'Analytics'],
      authType: 'email',
      credentials: { label1: 'Email', value1: 'wholesaler@bigcompany.rw', label2: 'Password', value2: 'wholesaler123' },
      dashboard: '/wholesaler/dashboard',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              B
            </div>
            <span className="text-white text-xl font-bold">BIG Company</span>
          </div>
          {isAuthenticated && user && (
            <button
              onClick={() => handlePortalClick(user.role)}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
          Rwanda's Complete
          <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Distribution Platform
          </span>
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
          Connecting consumers, retailers, and wholesalers across all 30 districts with digital wallets, NFC cards, and seamless ordering.
        </p>
      </section>

      {/* Portal Cards */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Choose Your Portal
          </h2>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {portals.map((portal) => (
              <div
                key={portal.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-300 hover:transform hover:scale-[1.02]"
              >
                {/* Card Header */}
                <div className={`bg-gradient-to-r ${portal.gradient} p-6 text-white`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-white/20 rounded-xl p-3">
                      {portal.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{portal.title}</h3>
                      <p className="text-white/80">{portal.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-white/90">{portal.description}</p>
                </div>

                {/* Features */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {portal.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-gray-300 text-sm">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${portal.gradient}`} />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Demo Credentials */}
                  <div className={`${portal.bgLight} rounded-xl p-4 mb-6`}>
                    <p className={`${portal.textColor} font-semibold text-sm mb-3`}>Demo Credentials</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                        <span className="text-gray-500 text-xs">{portal.credentials.label1}:</span>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-gray-800">{portal.credentials.value1}</code>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(portal.credentials.value1, `${portal.id}-1`);
                            }}
                            className={`p-1 rounded ${portal.bgLight} hover:opacity-70`}
                          >
                            {copiedField === `${portal.id}-1` ? <CheckIcon /> : <CopyIcon />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
                        <span className="text-gray-500 text-xs">{portal.credentials.label2}:</span>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-gray-800">{portal.credentials.value2}</code>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(portal.credentials.value2, `${portal.id}-2`);
                            }}
                            className={`p-1 rounded ${portal.bgLight} hover:opacity-70`}
                          >
                            {copiedField === `${portal.id}-2` ? <CheckIcon /> : <CopyIcon />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handlePortalClick(portal.id)}
                    className={`w-full bg-gradient-to-r ${portal.gradient} ${portal.hoverGradient} text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg`}
                  >
                    {isAuthenticated && user?.role === portal.id ? (
                      <>Go to Dashboard</>
                    ) : (
                      <>Access {portal.title} Portal</>
                    )}
                    <ArrowRightIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Info */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Retailers' },
              { value: '10K+', label: 'Products' },
              { value: '30', label: 'Districts' },
              { value: '24/7', label: 'Support' },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>&copy; 2024 BIG Company Rwanda Ltd. All rights reserved.</p>
          <p className="mt-2 text-sm">Digital Wallet &bull; NFC Cards &bull; POS System &bull; B2B Distribution</p>
        </div>
      </footer>
    </div>
  );
};
