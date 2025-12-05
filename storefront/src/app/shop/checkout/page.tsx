'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Package,
  MapPin,
  Wallet,
  CreditCard,
  Banknote,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Store,
  Clock,
  ShoppingBag
} from 'lucide-react';
import { ordersApi, walletApi, loansApi } from '@/lib/api';
import { useCartStore, useAuthStore, useWalletStore } from '@/lib/store';

type PaymentMethod = 'wallet' | 'mobile_money';
type WalletType = 'dashboard' | 'credit';
type MobileProvider = 'mtn' | 'airtel';

interface LoanEligibility {
  eligible: boolean;
  max_amount: number;
  available_credit: number;
  current_loan?: { amount: number; balance: number };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { items, total, clearCart } = useCartStore();
  const { balance, setBalance } = useWalletStore();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [walletType, setWalletType] = useState<WalletType>('dashboard');
  const [mobileProvider, setMobileProvider] = useState<MobileProvider>('mtn');
  const [mobileNumber, setMobileNumber] = useState('');
  const [meterId, setMeterId] = useState('');
  const [pin, setPin] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [dashboardBalance, setDashboardBalance] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);

  // Get selected retailer from localStorage
  const [retailerId, setRetailerId] = useState<string>('');
  const [retailerName, setRetailerName] = useState<string>('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/shop/checkout');
    }
  }, [isAuthenticated, router]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !success) {
      router.push('/shop');
    }
  }, [items, success, router]);

  // Fetch wallet balances
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const walletData = await walletApi.getBalance();
        setDashboardBalance(walletData.dashboardBalance || 0);
        setCreditBalance(walletData.creditBalance || 0);
        setBalance(walletData.dashboardBalance + walletData.creditBalance);
      } catch (error) {
        console.error('Failed to fetch checkout data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, setBalance]);

  // Get retailer info from cart storage
  useEffect(() => {
    const cartStorage = localStorage.getItem('cart-storage');
    if (cartStorage) {
      try {
        const data = JSON.parse(cartStorage);
        if (data.state?.retailerId) {
          setRetailerId(data.state.retailerId);
          setRetailerName(data.state.retailerName || 'Selected Store');
        }
      } catch (e) {
        console.error('Failed to parse cart storage');
      }
    }
    // Also check for a dedicated retailer storage
    const retailerStorage = localStorage.getItem('selected-retailer');
    if (retailerStorage) {
      try {
        const retailer = JSON.parse(retailerStorage);
        setRetailerId(retailer.id);
        setRetailerName(retailer.name);
      } catch (e) {
        console.error('Failed to parse retailer storage');
      }
    }
  }, []);

  // Calculate totals
  const subtotal = total();
  const deliveryFee = subtotal >= 10000 ? 0 : 500; // Free delivery over 10,000 RWF
  const orderTotal = subtotal + deliveryFee;

  // Check if payment method is valid
  const isPaymentValid = () => {
    if (paymentMethod === 'wallet') {
      if (walletType === 'dashboard') {
        return dashboardBalance >= orderTotal && meterId && pin;
      } else {
        return creditBalance >= orderTotal && pin;
      }
    }
    if (paymentMethod === 'mobile_money') {
      return mobileNumber && meterId && pin;
    }
    return false;
  };

  // Handle order submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const orderData = {
        retailerId: retailerId || 'default-retailer',
        items: items.map((item) => ({
          variantId: item.id,
          quantity: item.quantity,
        })),
        paymentMethod,
        paymentDetails: {
          walletType: paymentMethod === 'wallet' ? walletType : undefined,
          mobileProvider: paymentMethod === 'mobile_money' ? mobileProvider : undefined,
          mobileNumber: paymentMethod === 'mobile_money' ? mobileNumber : undefined,
          meterId,
          pin,
        },
        deliveryAddress: deliveryAddress || undefined,
        notes: notes || undefined,
      };

      const response = await ordersApi.createOrder(orderData);

      if (response.success || response.order) {
        setSuccess(true);
        setOrderId(response.order?.id || response.order_id);
        clearCart();

        // Update wallet balance if paid with wallet
        if (paymentMethod === 'wallet') {
          if (walletType === 'dashboard') {
            setDashboardBalance(dashboardBalance - orderTotal);
          } else {
            setCreditBalance(creditBalance - orderTotal);
          }
          setBalance(balance - orderTotal);
        }
      } else {
        setError(response.error || 'Failed to create order');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format price
  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
          <p className="text-gray-600 mb-6">
            Your order has been placed successfully. You will receive a confirmation shortly.
          </p>

          {orderId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500">Order ID</p>
              <p className="font-mono font-semibold">{orderId}</p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href={`/orders/${orderId}`}
              className="block w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Track Order
            </Link>
            <Link
              href="/shop"
              className="block w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-14 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Checkout</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Store Info */}
        {retailerName && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ordering from</p>
                <p className="font-semibold">{retailerName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Order Items ({items.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={56}
                      height={56}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Delivery Address
          </h2>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Enter your delivery address (optional for pickup)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={2}
          />
          <p className="text-xs text-gray-500 mt-2">
            Leave empty for store pickup
          </p>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Payment Method</h2>
          <div className="space-y-3">
            {/* Wallet Payment */}
            <div className="border-2 border-primary-500 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`w-full p-4 transition-all ${
                  paymentMethod === 'wallet' ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${paymentMethod === 'wallet' ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <Wallet className={`w-5 h-5 ${paymentMethod === 'wallet' ? 'text-primary-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">BIG Wallet</p>
                    <p className="text-sm text-gray-500">
                      Dashboard: {formatPrice(dashboardBalance)} | Credit: {formatPrice(creditBalance)}
                    </p>
                  </div>
                </div>
              </button>

              {/* Wallet Sub-options */}
              {paymentMethod === 'wallet' && (
                <div className="p-4 bg-gray-50 border-t space-y-3">
                  {/* Dashboard Balance */}
                  <div
                    onClick={() => setWalletType('dashboard')}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      walletType === 'dashboard'
                        ? 'border-primary-500 bg-white'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">Dashboard Balance</p>
                      <p className="text-sm font-semibold">{formatPrice(dashboardBalance)}</p>
                    </div>
                    {walletType === 'dashboard' && (
                      <div className="space-y-2 mt-3">
                        <input
                          type="text"
                          placeholder="Enter Meter ID"
                          value={meterId}
                          onChange={(e) => setMeterId(e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="password"
                          placeholder="Enter PIN"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          maxLength={4}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500">Rewards will be added to your meter</p>
                      </div>
                    )}
                  </div>

                  {/* Credit Balance */}
                  <div
                    onClick={() => setWalletType('credit')}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      walletType === 'credit'
                        ? 'border-primary-500 bg-white'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">Credit Balance</p>
                      <p className="text-sm font-semibold">{formatPrice(creditBalance)}</p>
                    </div>
                    {walletType === 'credit' && (
                      <div className="space-y-2 mt-3">
                        <input
                          type="password"
                          placeholder="Enter PIN"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          maxLength={4}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500">No rewards on credit payments</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Money */}
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setPaymentMethod('mobile_money')}
                className={`w-full p-4 transition-all ${
                  paymentMethod === 'mobile_money' ? 'bg-primary-50 border-primary-500' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${paymentMethod === 'mobile_money' ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <CreditCard className={`w-5 h-5 ${paymentMethod === 'mobile_money' ? 'text-primary-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Mobile Money</p>
                    <p className="text-sm text-gray-500">MTN or Airtel</p>
                  </div>
                </div>
              </button>

              {/* Mobile Money Sub-options */}
              {paymentMethod === 'mobile_money' && (
                <div className="p-4 bg-gray-50 border-t space-y-3">
                  {/* Provider Selection */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileProvider('mtn')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        mobileProvider === 'mtn'
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm">MTN MoMo</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileProvider('airtel')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        mobileProvider === 'airtel'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm">Airtel Money</p>
                    </button>
                  </div>

                  {/* Mobile Number */}
                  <input
                    type="tel"
                    placeholder="Mobile Number (07xxxxxxxx)"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />

                  {/* Meter ID */}
                  <input
                    type="text"
                    placeholder="Enter Meter ID for Gas Rewards"
                    value={meterId}
                    onChange={(e) => setMeterId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />

                  {/* PIN */}
                  <input
                    type="password"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />

                  <p className="text-xs text-gray-500">
                    You will receive a notification on your phone to confirm the payment
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Notes */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Order Notes (Optional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions for your order?"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={2}
          />
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee</span>
              <span>
                {deliveryFee === 0 ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  formatPrice(deliveryFee)
                )}
              </span>
            </div>
            {deliveryFee > 0 && (
              <p className="text-xs text-gray-500">
                Free delivery on orders over 10,000 RWF
              </p>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(orderTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isPaymentValid()}
            className="w-full bg-primary-600 text-white py-4 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                Place Order - {formatPrice(orderTotal)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
