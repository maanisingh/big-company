'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Phone, Lock, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type Step = 'phone' | 'otp' | 'pin';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, isAuthenticated } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [hasPin, setHasPin] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Format phone number for Rwanda
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return '250' + cleaned.substring(1);
    }
    if (cleaned.startsWith('250')) {
      return cleaned;
    }
    if (cleaned.length <= 9) {
      return '250' + cleaned;
    }
    return cleaned;
  };

  // Handle phone submission
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formattedPhone = formatPhone(phone);
    if (formattedPhone.length !== 12) {
      setError('Please enter a valid Rwanda phone number');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.requestOTP(formattedPhone);

      if (response.success) {
        setHasPin(response.hasPin);

        // If user has PIN, offer PIN login option
        if (response.hasPin) {
          setStep('pin');
        } else {
          setStep('otp');
          setCountdown(60);
        }
        setSuccess(response.message || 'Check your phone for the OTP');
      } else {
        setError(response.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      setLoading(false);
      return;
    }

    try {
      const formattedPhone = formatPhone(phone);
      const response = await authApi.verifyOTP(formattedPhone, otpCode);

      if (response.success && response.access_token) {
        // Fetch user data
        const userData = await authApi.getMe();
        setUser(userData.customer);

        setSuccess('Login successful!');
        setTimeout(() => router.push('/'), 1000);
      } else {
        setError(response.error || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle PIN login
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (pin.length < 4 || pin.length > 6) {
      setError('PIN must be 4-6 digits');
      setLoading(false);
      return;
    }

    try {
      const formattedPhone = formatPhone(phone);
      const response = await authApi.loginWithPIN(formattedPhone, pin);

      if (response.success && response.access_token) {
        const userData = await authApi.getMe();
        setUser(userData.customer);

        setSuccess('Login successful!');
        setTimeout(() => router.push('/'), 1000);
      } else {
        setError(response.error || 'Invalid PIN');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;

    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhone(phone);
      await authApi.requestOTP(formattedPhone);
      setSuccess('New OTP sent!');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Switch to OTP login
  const switchToOTP = async () => {
    setError('');
    setLoading(true);
    try {
      const formattedPhone = formatPhone(phone);
      await authApi.requestOTP(formattedPhone);
      setStep('otp');
      setCountdown(60);
      setSuccess('OTP sent to your phone');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-700 flex flex-col">
      {/* Header */}
      <div className="p-6 text-white text-center">
        <h1 className="text-3xl font-bold mb-2">BIG Company</h1>
        <p className="opacity-80">Shop, Pay, Save</p>
      </div>

      {/* Login Card */}
      <div className="flex-1 bg-white rounded-t-3xl p-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-2">Welcome Back</h2>
          <p className="text-gray-600 mb-6">
            {step === 'phone' && 'Enter your phone number to continue'}
            {step === 'otp' && 'Enter the 6-digit code sent to your phone'}
            {step === 'pin' && 'Enter your PIN to login'}
          </p>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Step 1: Phone Number */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07X XXX XXXX"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Enter your Rwanda phone number</p>
              </div>

              <button
                type="submit"
                disabled={loading || !phone}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  Enter Verification Code
                </label>
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !digit && index > 0) {
                          otpRefs.current[index - 1]?.focus();
                        }
                      }}
                      className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      maxLength={1}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.some(d => !d)}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Verify'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                  className="text-primary-600 text-sm hover:underline disabled:text-gray-400"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-gray-600 text-sm hover:underline"
              >
                Change phone number
              </button>
            </form>
          )}

          {/* Step 3: PIN Login */}
          {step === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter your 4-6 digit PIN"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    inputMode="numeric"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || pin.length < 4}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Login'
                )}
              </button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={switchToOTP}
                  disabled={loading}
                  className="text-primary-600 text-sm hover:underline block mx-auto"
                >
                  Login with OTP instead
                </button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-gray-600 text-sm hover:underline block mx-auto"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}

          {/* USSD Info */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              <strong>No data?</strong> Dial <span className="font-mono">*939#</span> to access your account
            </p>
          </div>

          {/* Registration Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              First time using BIG Company?{' '}
              <Link href="/auth/register" className="text-primary-600 font-medium hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
