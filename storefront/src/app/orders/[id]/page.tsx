'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Loader2,
  MapPin,
  Phone,
  User,
  FileText,
  Download,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  thumbnail?: string;
}

interface Order {
  id: string;
  display_id: string;
  status: 'pending' | 'packaged' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'awaiting' | 'captured' | 'refunded';
  total: number;
  subtotal: number;
  shipping_total: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  retailer?: { name: string; contact?: string };
  shipping_address?: { address_1: string; city?: string; postal_code?: string };
  packager?: {
    name: string;
    contact: string;
    packed_at: string;
  };
  shipper?: {
    name: string;
    contact: string;
    shipped_at: string;
    expected_delivery: string;
  };
  cancellation_reason?: string;
  cancelled_by?: 'customer' | 'retailer';
  can_cancel: boolean;
  receipt_url?: string;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { isAuthenticated } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/orders');
    }
  }, [isAuthenticated, router]);

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      try {
        const data = await ordersApi.getOrderById(orderId);
        setOrder(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchOrder();
    }
  }, [orderId, isAuthenticated]);

  // Handle cancel order
  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setCancelling(true);
    try {
      await ordersApi.cancelOrder(orderId, cancelReason);
      // Refresh order
      const data = await ordersApi.getOrderById(orderId);
      setOrder(data);
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  // Handle confirm delivery
  const handleConfirmDelivery = async () => {
    if (!confirm('Are you sure you want to confirm that this order has been delivered?')) {
      return;
    }

    setConfirming(true);
    try {
      await ordersApi.confirmDelivery(orderId);
      // Refresh order
      const data = await ordersApi.getOrderById(orderId);
      setOrder(data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm delivery');
    } finally {
      setConfirming(false);
    }
  };

  // Download receipt
  const handleDownloadReceipt = async () => {
    try {
      const blob = await ordersApi.downloadReceipt(orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${order?.display_id || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download receipt');
    }
  };

  // View receipt
  const handleViewReceipt = () => {
    if (order?.receipt_url) {
      window.open(order.receipt_url, '_blank');
    }
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
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
        <p className="text-gray-600 mb-4">{error || 'This order does not exist'}</p>
        <Link
          href="/orders"
          className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    packaged: { label: 'Packaged', color: 'bg-blue-100 text-blue-700', icon: Package },
    shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

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
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Order #{order.display_id || order.id.slice(0, 8)}</h1>
            <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Order Status */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${config.color}`}>
              <StatusIcon className="w-5 h-5" />
              {config.label}
            </span>
          </div>

          {/* Cancellation Info */}
          {order.status === 'cancelled' && order.cancellation_reason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">
                    Cancelled by {order.cancelled_by === 'retailer' ? 'Retailer' : 'You'}
                  </p>
                  <p className="text-sm text-red-600 mt-1">{order.cancellation_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Progress */}
          {['pending', 'packaged', 'shipped'].includes(order.status) && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                {['pending', 'packaged', 'shipped', 'delivered'].map((step, index) => {
                  const stepIndex = ['pending', 'packaged', 'shipped', 'delivered'].indexOf(order.status);
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
                <span>Packaged</span>
                <span>Shipped</span>
                <span>Delivered</span>
              </div>
            </div>
          )}
        </div>

        {/* Packager Info */}
        {order.packager && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-600" />
              Packager Information
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{order.packager.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${order.packager.contact}`} className="text-sm text-primary-600 hover:underline">
                  {order.packager.contact}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Packed: {formatDate(order.packager.packed_at)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Shipper Info */}
        {order.shipper && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary-600" />
              Shipper Information
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{order.shipper.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${order.shipper.contact}`} className="text-sm text-primary-600 hover:underline">
                  {order.shipper.contact}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Shipped: {formatDate(order.shipper.shipped_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Expected Delivery: {formatDate(order.shipper.expected_delivery)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Retailer Info */}
        {order.retailer && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Store Information</h2>
            <div className="space-y-2">
              <p className="text-sm font-medium">{order.retailer.name}</p>
              {order.retailer.contact && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${order.retailer.contact}`} className="text-sm text-primary-600 hover:underline">
                    {order.retailer.contact}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shipping Address */}
        {order.shipping_address && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              Delivery Address
            </h2>
            <p className="text-sm text-gray-700">{order.shipping_address.address_1}</p>
            {order.shipping_address.city && (
              <p className="text-sm text-gray-500">{order.shipping_address.city}</p>
            )}
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold">Order Items ({order.items.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  <p className="text-sm text-gray-500">{formatPrice(item.unit_price)} each</p>
                </div>
                <p className="font-semibold">{formatPrice(item.unit_price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPrice(order.subtotal || order.total)}</span>
            </div>
            {order.shipping_total > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span>{formatPrice(order.shipping_total)}</span>
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

        {/* Receipt Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Order Receipt
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleViewReceipt}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Receipt
            </button>
            <button
              onClick={handleDownloadReceipt}
              className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Cancel Order Button */}
          {order.can_cancel && !['cancelled', 'delivered'].includes(order.status) && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-3 border-2 border-red-500 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          )}

          {/* Confirm Delivery Button */}
          {order.status === 'shipped' && (
            <button
              onClick={handleConfirmDelivery}
              disabled={confirming}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirm Delivery
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Cancel Order</h2>
              <p className="text-sm text-gray-600 mt-1">Please tell us why you're cancelling this order</p>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter your reason for cancellation..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={4}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling || !cancelReason.trim()}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
