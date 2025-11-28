'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  MapPin,
  Store,
  CreditCard,
  Phone,
  Loader2,
  RefreshCw,
  Copy,
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface OrderItem {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  thumbnail?: string;
  variant?: { title: string };
}

interface OrderTimeline {
  id: string;
  status: string;
  message: string;
  created_at: string;
}

interface Order {
  id: string;
  display_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'awaiting' | 'captured' | 'refunded';
  fulfillment_status: 'not_fulfilled' | 'partially_fulfilled' | 'fulfilled' | 'shipped' | 'delivered';
  total: number;
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  retailer?: { id: string; name: string; phone?: string };
  shipping_address?: {
    address_1: string;
    address_2?: string;
    city?: string;
    phone?: string;
  };
  payment_method?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  notes?: string;
  timeline?: OrderTimeline[];
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { isAuthenticated } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/orders/' + orderId);
    }
  }, [isAuthenticated, router, orderId]);

  // Fetch order details
  const fetchOrder = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await ordersApi.getOrder(orderId);
      setOrder(data.order);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && orderId) {
      fetchOrder();
    }
  }, [isAuthenticated, orderId]);

  // Auto-refresh for active orders
  useEffect(() => {
    if (order && ['pending', 'processing', 'shipped'].includes(order.status)) {
      const interval = setInterval(() => fetchOrder(true), 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [order?.status]);

  // Handle order cancellation
  const handleCancelOrder = async () => {
    setCancelling(true);
    setError('');

    try {
      const response = await ordersApi.cancelOrder(orderId, cancelReason);
      if (response.success || response.order) {
        setOrder({ ...order!, status: 'cancelled' });
        setShowCancelModal(false);
      } else {
        setError(response.error || 'Failed to cancel order');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  // Copy order ID
  const copyOrderId = () => {
    navigator.clipboard.writeText(order?.display_id || order?.id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format price
  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-RW', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get payment method label
  const getPaymentLabel = (method?: string) => {
    const labels: Record<string, string> = {
      wallet: 'BIG Wallet',
      food_loan: 'Food Loan',
      cash_on_delivery: 'Cash on Delivery',
      mtn_momo: 'MTN Mobile Money',
      airtel_money: 'Airtel Money',
    };
    return labels[method || ''] || method || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
        <p className="text-gray-600 mb-4">{error || 'Unable to load order details'}</p>
        <Link
          href="/orders"
          className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const config = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const canCancel = ['pending', 'processing'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-14 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/orders')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold">Order #{order.display_id || order.id.slice(0, 8)}</h1>
              <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
            </div>
          </div>
          <button
            onClick={() => fetchOrder(true)}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
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

        {/* Status Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-full ${config.color}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-lg">{config.label}</p>
              <p className="text-sm text-gray-500">
                {order.status === 'pending' && 'Your order is being reviewed'}
                {order.status === 'processing' && 'Your order is being prepared'}
                {order.status === 'shipped' && 'Your order is on the way'}
                {order.status === 'delivered' && 'Your order has been delivered'}
                {order.status === 'cancelled' && 'Your order was cancelled'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {!['cancelled'].includes(order.status) && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                {['pending', 'processing', 'shipped', 'delivered'].map((step, index) => {
                  const stepIndex = ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.status);
                  const isCompleted = index <= stepIndex;

                  return (
                    <div
                      key={step}
                      className={`flex-1 h-2 rounded-full ${
                        isCompleted ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Placed</span>
                <span>Processing</span>
                <span>Shipped</span>
                <span>Delivered</span>
              </div>
            </div>
          )}

          {/* Estimated Delivery */}
          {order.estimated_delivery && ['shipped'].includes(order.status) && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <Clock className="w-4 h-4 inline mr-2" />
                Estimated delivery: {formatDate(order.estimated_delivery)}
              </p>
            </div>
          )}

          {/* Tracking Number */}
          {order.tracking_number && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Tracking Number</p>
                <p className="font-mono font-medium">{order.tracking_number}</p>
              </div>
              <button
                onClick={copyOrderId}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold">Order Items</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  {item.variant?.title && (
                    <p className="text-xs text-gray-500">{item.variant.title}</p>
                  )}
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">{formatPrice(item.unit_price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Details */}
        {order.shipping_address && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Delivery Address
            </h2>
            <p className="text-gray-700">{order.shipping_address.address_1}</p>
            {order.shipping_address.address_2 && (
              <p className="text-gray-700">{order.shipping_address.address_2}</p>
            )}
            {order.shipping_address.city && (
              <p className="text-gray-500 text-sm">{order.shipping_address.city}</p>
            )}
            {order.shipping_address.phone && (
              <p className="text-gray-500 text-sm mt-2">
                <Phone className="w-4 h-4 inline mr-1" />
                {order.shipping_address.phone}
              </p>
            )}
          </div>
        )}

        {/* Retailer Info */}
        {order.retailer && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Store className="w-5 h-5" />
              Store
            </h2>
            <p className="text-gray-700 font-medium">{order.retailer.name}</p>
            {order.retailer.phone && (
              <a
                href={`tel:${order.retailer.phone}`}
                className="text-primary-600 text-sm flex items-center gap-1 mt-2"
              >
                <Phone className="w-4 h-4" />
                {order.retailer.phone}
              </a>
            )}
          </div>
        )}

        {/* Payment Details */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment
          </h2>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600">Method</span>
            <span className="font-medium">{getPaymentLabel(order.payment_method)}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery</span>
              <span>
                {order.shipping_total === 0 ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  formatPrice(order.shipping_total)
                )}
              </span>
            </div>
            {order.tax_total > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>{formatPrice(order.tax_total)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Notes */}
        {order.notes && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="text-gray-700 text-sm">{order.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {/* Contact Support */}
          <a
            href={`tel:+250788000000`}
            className="block w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-medium text-center hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Contact Support
          </a>

          {/* Cancel Order */}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full text-red-600 text-sm hover:underline"
            >
              Cancel Order
            </button>
          )}

          {/* Reorder */}
          {['delivered', 'cancelled'].includes(order.status) && (
            <Link
              href="/shop"
              className="block w-full bg-primary-600 text-white py-3 rounded-xl font-medium text-center hover:bg-primary-700 transition-colors"
            >
              Order Again
            </Link>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-2">Cancel Order</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
