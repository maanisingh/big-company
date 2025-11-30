import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';

// Icons
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

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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

const UserIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const roleConfig = {
  consumer: {
    title: 'Consumer Store',
    subtitle: 'Shop amazing products from local retailers',
    icon: <ShoppingCartIcon />,
    gradient: 'from-emerald-500 to-green-600',
    bgGradient: 'from-emerald-400 via-green-500 to-teal-600',
    lightBg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
    redirect: '/consumer/shop',
    credentials: { email: 'customer@test.com', password: 'customer123' },
  },
  retailer: {
    title: 'Retailer Dashboard',
    subtitle: 'Manage your shop inventory and orders',
    icon: <ShopIcon />,
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-400 via-indigo-500 to-purple-600',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    redirect: '/retailer/dashboard',
    credentials: { email: 'retailer@bigcompany.rw', password: 'retailer123' },
  },
  wholesaler: {
    title: 'Wholesaler Portal',
    subtitle: 'Distribute products to your retailer network',
    icon: <TeamIcon />,
    gradient: 'from-purple-500 to-violet-600',
    bgGradient: 'from-purple-400 via-violet-500 to-indigo-600',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
    redirect: '/wholesaler/dashboard',
    credentials: { email: 'wholesaler@bigcompany.rw', password: 'wholesaler123' },
  },
};

// Floating particles component for background
const FloatingParticles: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading } = useAuth();

  // Get role from URL or default to consumer
  const initialRole = (searchParams.get('role') as UserRole) || 'consumer';
  const [activeRole, setActiveRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const config = roleConfig[activeRole];

  // Update credentials when role changes
  useEffect(() => {
    setEmail(config.credentials.email);
    setPassword(config.credentials.password);
  }, [activeRole, config.credentials.email, config.credentials.password]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password }, activeRole);
      message.success('Login successful!');
      navigate(config.redirect);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const fillDemoCredentials = () => {
    setEmail(config.credentials.email);
    setPassword(config.credentials.password);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} flex items-center justify-center p-4 relative overflow-hidden`}>
      <FloatingParticles />

      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon />
          <span>Back to Home</span>
        </button>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${config.gradient} p-8 text-center text-white`}>
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {config.icon}
            </div>
            <h1 className="text-2xl font-bold mb-2">{config.title}</h1>
            <p className="text-white/80">{config.subtitle}</p>
          </div>

          {/* Role Selection Tabs */}
          <div className="flex border-b border-gray-200">
            {(['consumer', 'retailer', 'wholesaler'] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex-1 py-4 text-sm font-medium transition-all relative ${
                  activeRole === role
                    ? `${roleConfig[role].textColor}`
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
                {activeRole === role && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${roleConfig[role].gradient}`} />
                )}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Demo Credentials Box - PROMINENTLY DISPLAYED */}
            <div className={`credential-box ${config.lightBg} border-2 ${config.borderColor} rounded-2xl p-6 mb-8`}>
              <div className={`flex items-center gap-2 ${config.textColor} font-semibold mb-4`}>
                <KeyIcon />
                <span>Demo Login Credentials</span>
              </div>

              <div className="space-y-3">
                {/* Email */}
                <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500 block">Email</span>
                    <code className="text-sm font-mono text-gray-800">{config.credentials.email}</code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(config.credentials.email, 'email')}
                    className={`p-2 rounded-lg ${config.lightBg} hover:opacity-80 transition-opacity`}
                    title="Copy email"
                  >
                    {copiedField === 'email' ? (
                      <CheckIcon />
                    ) : (
                      <CopyIcon />
                    )}
                  </button>
                </div>

                {/* Password */}
                <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500 block">Password</span>
                    <code className="text-sm font-mono text-gray-800">{config.credentials.password}</code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(config.credentials.password, 'password')}
                    className={`p-2 rounded-lg ${config.lightBg} hover:opacity-80 transition-opacity`}
                    title="Copy password"
                  >
                    {copiedField === 'password' ? (
                      <CheckIcon />
                    ) : (
                      <CopyIcon />
                    )}
                  </button>
                </div>
              </div>

              {/* Auto-fill button */}
              <button
                onClick={fillDemoCredentials}
                className={`w-full mt-4 py-2 px-4 rounded-xl border-2 ${config.borderColor} ${config.textColor} font-medium hover:${config.lightBg} transition-colors flex items-center justify-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Auto-fill Demo Credentials
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockIcon />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    defaultChecked
                  />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className={`${config.textColor} hover:underline`}>
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full ${config.buttonColor} text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in as {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Don't have an account?</span>
              </div>
            </div>

            {/* Sign up link */}
            <div className="text-center">
              <p className="text-gray-600">
                Contact us to create your {activeRole} account
              </p>
              <a href="mailto:info@bigcompany.rw" className={`${config.textColor} font-semibold hover:underline`}>
                info@bigcompany.rw
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-8">
          © 2024 BIG Company Rwanda Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
};
