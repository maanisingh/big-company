'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChevronRight,
  Loader2,
  ShoppingBag,
  RefreshCw,
  AlertCircle
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
  payment_method?: 'wallet' | 'cash_on_delivery' | 'food_loan' | 'card_credit' | 'mobile_money';
  fulfillment_status: 'not_fulfilled' | 'partially_fulfilled' | 'fulfilled' | 'shipped' | 'delivered';
  total: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  retailer?: { name: string };
  shipping_address?: { address_1: string };
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
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  packaged: { label: 'Packaged', color: 'bg-blue-100 text-blue-700', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

type FilterStatus = 'all' | 'active' | 'completed' | 'credit';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/orders');
    }
  }, [isAuthenticated, router]);

  // Fetch orders
  const fetchOrders = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // TODO: Replace with real API call when backend is ready
      // const data = await ordersApi.getOrders(50, 0);
      // setOrders(data.orders || []);

      // MOCK DATA - Remove this when backend API is ready
      await new Promise(resolve => setTimeout(resolve, 600));

      const mockOrders: Order[] = [
        {
          id: 'ord-1',
          display_id: 'ORD-2024-789',
          status: 'delivered',
          payment_status: 'captured',
          payment_method: 'card_credit',
          fulfillment_status: 'delivered',
          total: 25000,
          items: [
            { id: 'item-1', title: 'Rice 5kg', quantity: 2, unit_price: 5000 },
            { id: 'item-2', title: 'Cooking Oil 2L', quantity: 3, unit_price: 5000 }
          ],
          created_at: '2024-12-05T14:30:00Z',
          updated_at: '2024-12-05T18:00:00Z',
          retailer: { name: 'Kigali Fresh Market' },
          can_cancel: false
        },
        {
          id: 'ord-2',
          display_id: 'ORD-2024-812',
          status: 'shipped',
          payment_status: 'captured',
          payment_method: 'wallet',
          fulfillment_status: 'shipped',
          total: 45000,
          items: [
            { id: 'item-3', title: 'Sugar 2kg', quantity: 4, unit_price: 3000 },
            { id: 'item-4', title: 'Flour 5kg', quantity: 3, unit_price: 11000 }
          ],
          created_at: '2024-12-04T10:15:00Z',
          updated_at: '2024-12-04T16:30:00Z',
          retailer: { name: 'City Supermarket' },
          can_cancel: false
        },
        {
          id: 'ord-3',
          display_id: 'ORD-2024-845',
          status: 'pending',
          payment_status: 'captured',
          payment_method: 'food_loan',
          fulfillment_status: 'not_fulfilled',
          total: 35000,
          items: [
            { id: 'item-5', title: 'Beans 2kg', quantity: 5, unit_price: 3000 },
            { id: 'item-6', title: 'Maize Flour 5kg', quantity: 4, unit_price: 5000 }
          ],
          created_at: '2024-12-03T09:45:00Z',
          updated_at: '2024-12-03T09:45:00Z',
          retailer: { name: 'Nyamirambo Superstore' },
          can_cancel: true
        },
        {
          id: 'ord-4',
          display_id: 'ORD-2024-756',
          status: 'delivered',
          payment_status: 'captured',
          payment_method: 'mobile_money',
          fulfillment_status: 'delivered',
          total: 18000,
          items: [
            { id: 'item-7', title: 'Tomatoes 1kg', quantity: 6, unit_price: 3000 }
          ],
          created_at: '2024-12-01T16:20:00Z',
          updated_at: '2024-12-02T10:00:00Z',
          retailer: { name: 'Kigali Fresh Market' },
          can_cancel: false
        },
        {
          id: 'ord-5',
          display_id: 'ORD-2024-698',
          status: 'delivered',
          payment_status: 'captured',
          payment_method: 'card_credit',
          fulfillment_status: 'delivered',
          total: 52000,
          items: [
            { id: 'item-8', title: 'Chicken 2kg', quantity: 2, unit_price: 13000 },
            { id: 'item-9', title: 'Fish 1.5kg', quantity: 2, unit_price: 13000 }
          ],
          created_at: '2024-11-28T11:30:00Z',
          updated_at: '2024-11-28T19:00:00Z',
          retailer: { name: 'City Supermarket' },
          can_cancel: false
        },
        {
          id: 'ord-6',
          display_id: 'ORD-2024-623',
          status: 'packaged',
          payment_status: 'captured',
          payment_method: 'food_loan',
          fulfillment_status: 'fulfilled',
          total: 28000,
          items: [
            { id: 'item-10', title: 'Milk 2L', quantity: 4, unit_price: 3500 },
            { id: 'item-11', title: 'Bread', quantity: 6, unit_price: 2500 }
          ],
          created_at: '2024-11-25T14:00:00Z',
          updated_at: '2024-11-25T15:30:00Z',
          retailer: { name: 'Nyamirambo Superstore' },
          can_cancel: false
        }
      ];

      setOrders(mockOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') {
      return ['pending', 'packaged', 'shipped'].includes(order.status);
    }
    if (filterStatus === 'completed') {
      return ['delivered', 'cancelled'].includes(order.status);
    }
    if (filterStatus === 'credit') {
      // Show orders paid on credit (via card or loan)
      return order.payment_method === 'food_loan' || order.payment_method === 'card_credit';
    }
    return true;
  });

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

  // Get relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
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
      <div className="bg-white sticky top-14 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">My Orders</h1>
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'All Orders' },
              { key: 'active', label: 'Active' },
              { key: 'completed', label: 'Completed' },
              { key: 'credit', label: 'Credit Orders' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key as FilterStatus)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  filterStatus === tab.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-lg mx-auto p-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Orders Found</h3>
            <p className="text-gray-500 mb-4">
              {filterStatus === 'all'
                ? "You haven't placed any orders yet"
                : `No ${filterStatus} orders`}
            </p>
            <Link
              href="/shop"
              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold">Order #{order.display_id || order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-500">{getRelativeTime(order.created_at)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${config.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {config.label}
                    </span>
                  </div>

                  {/* Payment Method Badge */}
                  {(order.payment_method === 'food_loan' || order.payment_method === 'card_credit') && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {order.payment_method === 'food_loan' ? 'Paid on Credit (Loan)' : 'Paid on Credit (Card)'}
                      </span>
                    </div>
                  )}

                  {/* Cancellation Notice */}
                  {order.status === 'cancelled' && order.cancellation_reason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-red-700">
                            Cancelled by {order.cancelled_by === 'retailer' ? 'Retailer' : 'You'}
                          </p>
                          <p className="text-xs text-red-600">{order.cancellation_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Items Preview */}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div
                        key={item.id}
                        className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden"
                      >
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500">
                          +{order.items.length - 3}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </p>
                      {order.retailer?.name && (
                        <p className="text-xs text-gray-500">{order.retailer.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatPrice(order.total)}</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Order Progress for active orders */}
                {['pending', 'packaged', 'shipped'].includes(order.status) && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-1">
                      {['pending', 'packaged', 'shipped', 'delivered'].map((step, index) => {
                        const stepIndex = ['pending', 'packaged', 'shipped', 'delivered'].indexOf(order.status);
                        const isCompleted = index <= stepIndex;

                        return (
                          <div
                            key={step}
                            className={`flex-1 h-1 rounded-full ${
                              isCompleted ? 'bg-primary-600' : 'bg-gray-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>Placed</span>
                      <span>Packaged</span>
                      <span>Shipped</span>
                      <span>Delivered</span>
                    </div>
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
