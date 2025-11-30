import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Icons as SVG components
const ShoppingCartIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ShopIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const TeamIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

// Animated counter component
const AnimatedCounter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({
  end,
  suffix = '',
  duration = 2000
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
};

// Floating particles component
const FloatingParticles: React.FC = () => {
  return (
    <div className="particles-container">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 15}s`,
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
          }}
        />
      ))}
    </div>
  );
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [activePreviewTab, setActivePreviewTab] = useState('consumer');
  const [copiedCredential, setCopiedCredential] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCredential(label);
    setTimeout(() => setCopiedCredential(null), 2000);
  };

  const handleGetStarted = (role: string) => {
    if (isAuthenticated && user) {
      const redirects: Record<string, string> = {
        consumer: '/consumer/shop',
        retailer: '/retailer/dashboard',
        wholesaler: '/wholesaler/dashboard',
      };
      navigate(redirects[user.role]);
    } else {
      navigate(`/login?role=${role}`);
    }
  };

  const features = [
    {
      icon: <GlobeIcon />,
      title: 'Rwanda-Wide Network',
      description: 'Connect with verified wholesalers and retailers across all 30 districts of Rwanda',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: <TruckIcon />,
      title: 'Fast Delivery',
      description: 'Same-day delivery in Kigali, next-day delivery to all provinces nationwide',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
    },
    {
      icon: <ChartIcon />,
      title: 'Smart Analytics',
      description: 'Real-time insights on sales, inventory, and market trends to grow your business',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
    },
    {
      icon: <ShieldIcon />,
      title: 'Verified Products',
      description: 'Quality assurance with verified suppliers and genuine product authentication',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
    },
    {
      icon: <CreditCardIcon />,
      title: 'Flexible Payments',
      description: 'Multiple payment options including mobile money, bank transfer, and credit facilities',
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-50',
    },
    {
      icon: <TeamIcon />,
      title: 'Dedicated Support',
      description: '24/7 customer support in Kinyarwanda, English, and French for all users',
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50',
    },
  ];

  const portals = [
    {
      key: 'consumer',
      title: 'Consumer Store',
      subtitle: 'Shop Quality Products',
      description: 'Browse and order quality products from verified local retailers at competitive prices',
      icon: <ShoppingCartIcon />,
      gradient: 'from-emerald-500 to-green-600',
      features: ['Browse thousands of products', 'Easy mobile ordering', 'Track your deliveries', 'Secure payments'],
      authType: 'phone' as const,
      credentials: { phone: '250788100001', pin: '1234' },
    },
    {
      key: 'retailer',
      title: 'Retailer Dashboard',
      subtitle: 'Grow Your Business',
      description: 'Manage inventory, order from wholesalers, and grow your retail business efficiently',
      icon: <ShopIcon />,
      gradient: 'from-blue-500 to-indigo-600',
      features: ['Real-time inventory', 'Wholesale ordering', 'Credit facilities', 'Sales analytics'],
      authType: 'email' as const,
      credentials: { email: 'retailer@bigcompany.rw', password: 'retailer123' },
    },
    {
      key: 'wholesaler',
      title: 'Wholesaler Portal',
      subtitle: 'Expand Distribution',
      description: 'Manage your retailer network, process orders, and expand your distribution reach',
      icon: <TeamIcon />,
      gradient: 'from-purple-500 to-violet-600',
      features: ['Retailer management', 'Bulk order processing', 'Credit approvals', 'Distribution analytics'],
      authType: 'email' as const,
      credentials: { email: 'wholesaler@bigcompany.rw', password: 'wholesaler123' },
    },
  ];

  const stats = [
    { value: 500, suffix: '+', label: 'Active Retailers' },
    { value: 10000, suffix: '+', label: 'Products Listed' },
    { value: 30, suffix: '', label: 'Districts Covered' },
    { value: 99, suffix: '%', label: 'Customer Satisfaction' },
  ];

  const testimonials = [
    {
      name: 'Jean-Pierre Uwimana',
      role: 'Retailer, Kigali',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      text: 'BIG Company has transformed how I manage my shop. I can now order stock with just a few clicks and track everything in real-time.',
    },
    {
      name: 'Marie Claire Ingabire',
      role: 'Wholesaler, Muhanga',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      text: 'The platform helped me expand my distribution network from 20 to over 100 retailers in just 6 months. Incredible growth!',
    },
    {
      name: 'Emmanuel Habimana',
      role: 'Consumer, Rubavu',
      avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
      text: 'I love being able to shop from multiple stores in one place. The delivery is always fast and the products are genuine.',
    },
  ];

  const previewImages: Record<string, string> = {
    consumer: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    retailer: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    wholesaler: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80',
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                B
              </div>
              <span className="text-xl font-bold text-gray-900">BIG Company</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#portals" className="text-gray-600 hover:text-gray-900 transition-colors">Portals</a>
              <a href="#stats" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <button
                  onClick={() => handleGetStarted(user?.role || 'consumer')}
                  className="btn-gradient"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/login?role=consumer')}
                    className="btn-gradient"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center gradient-animate overflow-hidden pt-16">
        <FloatingParticles />

        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl float-animation" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl float-animation-delayed" />

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white/90 text-sm mb-8 fade-in-up">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Serving Rwanda Since 2020
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 fade-in-up" style={{ animationDelay: '0.1s' }}>
            Connecting Rwanda's
            <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-pink-200 to-cyan-200">
              Business Ecosystem
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto fade-in-up" style={{ animationDelay: '0.2s' }}>
            The complete B2B and B2C distribution platform connecting wholesalers, retailers, and consumers across all 30 districts of Rwanda
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => navigate('/login?role=consumer')}
              className="group bg-white text-gray-900 font-semibold py-4 px-8 rounded-full hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Start Shopping
              <ArrowRightIcon />
            </button>
            <button
              onClick={() => navigate('/login?role=retailer')}
              className="group bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-full border-2 border-white/30 hover:bg-white/20 transition-all duration-300"
            >
              Business Portal
            </button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
              <div className="w-1 h-3 bg-white/50 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding bg-gray-50">
        <div className="container-max">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose <span className="gradient-text">BIG Company</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to succeed in Rwanda's fast-growing retail market
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`icon-wrapper ${feature.bgColor}`}>
                  <div className={`bg-gradient-to-r ${feature.color} text-white p-3 rounded-xl`}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="section-padding gradient-animate">
        <div className="container-max">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Powerful Dashboards
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Experience intuitive interfaces designed for every user type
            </p>

            {/* Preview Tabs */}
            <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-full p-1">
              {['consumer', 'retailer', 'wholesaler'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActivePreviewTab(tab)}
                  className={`preview-tab ${activePreviewTab === tab ? 'active' : ''}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-4 text-sm text-gray-500">dashboard.bigcompany.rw</span>
              </div>
              <img
                src={previewImages[activePreviewTab]}
                alt={`${activePreviewTab} dashboard preview`}
                className="w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Portal Cards Section with Demo Credentials */}
      <section id="portals" className="section-padding bg-white">
        <div className="container-max">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choose Your <span className="gradient-text">Portal</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Access tailored dashboards designed for your specific business needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {portals.map((portal, index) => (
              <div
                key={portal.key}
                className={`portal-card bg-gradient-to-br ${portal.gradient} text-white fade-in-up`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  {portal.icon}
                </div>

                <h3 className="text-2xl font-bold mb-2">{portal.title}</h3>
                <p className="text-white/70 text-sm mb-4">{portal.subtitle}</p>
                <p className="text-white/90 mb-6">{portal.description}</p>

                <ul className="space-y-2 mb-6">
                  {portal.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-white/90">
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Demo Credentials Box */}
                <div className="credential-box bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 text-white font-semibold mb-3">
                    <KeyIcon />
                    <span>Demo Credentials</span>
                  </div>
                  <div className="space-y-2">
                    {portal.authType === 'phone' ? (
                      <>
                        <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                          <span className="text-sm text-white/80">Phone:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-sm">{portal.credentials.phone}</code>
                            <button
                              onClick={() => copyToClipboard(portal.credentials.phone || '', `${portal.key}-phone`)}
                              className="hover:bg-white/20 p-1 rounded transition-colors"
                              title="Copy phone"
                            >
                              {copiedCredential === `${portal.key}-phone` ? (
                                <CheckIcon />
                              ) : (
                                <CopyIcon />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                          <span className="text-sm text-white/80">PIN:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-sm">{portal.credentials.pin}</code>
                            <button
                              onClick={() => copyToClipboard(portal.credentials.pin || '', `${portal.key}-pin`)}
                              className="hover:bg-white/20 p-1 rounded transition-colors"
                              title="Copy PIN"
                            >
                              {copiedCredential === `${portal.key}-pin` ? (
                                <CheckIcon />
                              ) : (
                                <CopyIcon />
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                          <span className="text-sm text-white/80">Email:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-sm">{portal.credentials.email}</code>
                            <button
                              onClick={() => copyToClipboard(portal.credentials.email || '', `${portal.key}-email`)}
                              className="hover:bg-white/20 p-1 rounded transition-colors"
                              title="Copy email"
                            >
                              {copiedCredential === `${portal.key}-email` ? (
                                <CheckIcon />
                              ) : (
                                <CopyIcon />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                          <span className="text-sm text-white/80">Password:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-sm">{portal.credentials.password}</code>
                            <button
                              onClick={() => copyToClipboard(portal.credentials.password || '', `${portal.key}-pass`)}
                              className="hover:bg-white/20 p-1 rounded transition-colors"
                              title="Copy password"
                            >
                              {copiedCredential === `${portal.key}-pass` ? (
                                <CheckIcon />
                              ) : (
                                <CopyIcon />
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleGetStarted(portal.key)}
                  className="w-full bg-white text-gray-900 font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isAuthenticated && user?.role === portal.key ? 'Go to Dashboard' : `Access ${portal.title}`}
                  <ArrowRightIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className="section-padding bg-gray-900">
        <div className="container-max">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Our Impact in Numbers
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Trusted by businesses across Rwanda for reliable distribution
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="stat-number">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied businesses and consumers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="testimonial-card fade-in-up"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="testimonial-avatar"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-500 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">"{testimonial.text}"</p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="section-padding bg-white">
        <div className="container-max">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Get in Touch
              </h2>
              <p className="text-xl text-gray-600">
                Have questions? We'd love to hear from you.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Office Address</h4>
                      <p className="text-gray-600">KG 123 St, Kigali, Rwanda</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Email</h4>
                      <p className="text-gray-600">info@bigcompany.rw</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Phone</h4>
                      <p className="text-gray-600">+250 788 123 456</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <form className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Your Name"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Your Email"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <textarea
                      placeholder="Your Message"
                      rows={4}
                      className="form-input resize-none"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="btn-gradient w-full"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4">
        <div className="container-max">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  B
                </div>
                <span className="text-xl font-bold">BIG Company</span>
              </div>
              <p className="text-gray-400">
                Connecting Rwanda's business ecosystem through innovative distribution solutions.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="footer-link">Features</a></li>
                <li><a href="#portals" className="footer-link">Portals</a></li>
                <li><a href="#stats" className="footer-link">About Us</a></li>
                <li><a href="#contact" className="footer-link">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Portals</h4>
              <ul className="space-y-2">
                <li><button onClick={() => navigate('/login?role=consumer')} className="footer-link">Consumer Store</button></li>
                <li><button onClick={() => navigate('/login?role=retailer')} className="footer-link">Retailer Dashboard</button></li>
                <li><button onClick={() => navigate('/login?role=wholesaler')} className="footer-link">Wholesaler Portal</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Connect With Us</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.016 18.6c-.24.12-.504.12-.744 0-.24-.12-.384-.336-.384-.6V6c0-.264.144-.48.384-.6.24-.12.504-.12.744 0l6 3.6c.24.144.384.36.384.6s-.144.456-.384.6l-6 3.6z"/></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 BIG Company Rwanda Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
