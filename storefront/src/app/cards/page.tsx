'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  Plus,
  Trash2,
  Check,
  Nfc,
  AlertCircle,
  FileText,
  Loader2,
  ExternalLink,
  ShoppingBag,
  Store,
  Calendar
} from 'lucide-react';
import { nfcApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface CardTransaction {
  id: string;
  amount: number;
  type: 'payment' | 'refund';
  description: string;
  order_id?: string;
  created_at: string;
}

interface CardOrder {
  id: string;
  order_id: string;
  shop_name: string;
  shop_location?: string;
  amount: number;
  items_count?: number;
  date: string;
  invoice_url?: string;
  status: string;
}

interface NFCCard {
  id: string;
  card_uid: string;
  card_alias?: string;
  dashboard_id: string;
  is_active: boolean;
  linked_at: string;
  last_used_at?: string;
  transactions: CardTransaction[];
  orders?: CardOrder[];
}

export default function CardsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [cards, setCards] = useState<NFCCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showTransactions, setShowTransactions] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState<string | null>(null);
  const [cardUid, setCardUid] = useState('');
  const [cardAlias, setCardAlias] = useState('');
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/cards');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCards();
    }
    // Check if Web NFC is supported
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, [isAuthenticated]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      // TODO: Replace with real API call when backend is ready
      // const data = await nfcApi.getCards();
      // setCards(data.cards || []);

      // MOCK DATA - Remove this when backend API is ready
      await new Promise(resolve => setTimeout(resolve, 600));

      const mockCards: NFCCard[] = [
        {
          id: 'card-1',
          card_uid: '04:A3:2B:C1:4D:5E:80',
          card_alias: 'Blue Card',
          dashboard_id: 'BIG-CARD-001',
          is_active: true,
          linked_at: '2024-10-15T10:00:00Z',
          last_used_at: '2024-12-05T14:30:00Z',
          transactions: [
            { id: 'tx1', amount: 25000, type: 'payment', description: 'Grocery Shopping', order_id: 'ord-123', created_at: '2024-12-05T14:30:00Z' },
            { id: 'tx2', amount: 15000, type: 'payment', description: 'Pharmacy Purchase', order_id: 'ord-124', created_at: '2024-12-03T10:15:00Z' },
          ]
        },
        {
          id: 'card-2',
          card_uid: '04:B7:8A:F2:1C:9D:42',
          card_alias: 'Family Card',
          dashboard_id: 'BIG-CARD-002',
          is_active: true,
          linked_at: '2024-11-20T14:00:00Z',
          last_used_at: '2024-12-01T16:45:00Z',
          transactions: [
            { id: 'tx3', amount: 35000, type: 'payment', description: 'Restaurant', order_id: 'ord-125', created_at: '2024-12-01T16:45:00Z' },
          ]
        }
      ];

      setCards(mockCards);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCardOrders = async (cardId: string) => {
    setLoadingOrders(cardId);
    try {
      // TODO: Replace with real API call when backend is ready
      // const data = await nfcApi.getCardOrders(cardId);

      // MOCK DATA - Remove this when backend API is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockOrders: { [key: string]: CardOrder[] } = {
        'card-1': [
          {
            id: 'ord-1',
            order_id: 'ORD-2024-789',
            shop_name: 'Kigali Fresh Market',
            shop_location: 'Kimironko, Kigali',
            amount: 25000,
            items_count: 8,
            date: '2024-12-05T14:30:00Z',
            status: 'completed'
          },
          {
            id: 'ord-2',
            order_id: 'ORD-2024-812',
            shop_name: 'City Pharmacy',
            shop_location: 'Downtown, Kigali',
            amount: 15000,
            items_count: 3,
            date: '2024-12-03T10:15:00Z',
            status: 'completed'
          },
          {
            id: 'ord-3',
            order_id: 'ORD-2024-756',
            shop_name: 'Nyamirambo Superstore',
            shop_location: 'Nyamirambo, Kigali',
            amount: 42500,
            items_count: 12,
            date: '2024-11-28T09:20:00Z',
            status: 'completed'
          },
          {
            id: 'ord-4',
            order_id: 'ORD-2024-698',
            shop_name: 'Kigali Fresh Market',
            shop_location: 'Kimironko, Kigali',
            amount: 18000,
            items_count: 5,
            date: '2024-11-22T16:45:00Z',
            status: 'completed'
          }
        ],
        'card-2': [
          {
            id: 'ord-5',
            order_id: 'ORD-2024-845',
            shop_name: 'Heaven Restaurant',
            shop_location: 'Kacyiru, Kigali',
            amount: 35000,
            items_count: 4,
            date: '2024-12-01T16:45:00Z',
            status: 'completed'
          },
          {
            id: 'ord-6',
            order_id: 'ORD-2024-823',
            shop_name: 'MTN Service Center',
            shop_location: 'City Center, Kigali',
            amount: 50000,
            items_count: 1,
            date: '2024-11-25T11:30:00Z',
            status: 'completed'
          }
        ]
      };

      // Update the card with orders
      setCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId
            ? { ...card, orders: mockOrders[cardId] || [] }
            : card
        )
      );
      setShowOrders(cardId);
    } catch (error) {
      console.error('Failed to fetch card orders:', error);
      alert('Failed to load order history');
    } finally {
      setLoadingOrders(null);
    }
  };

  const toggleOrders = (cardId: string) => {
    if (showOrders === cardId) {
      setShowOrders(null);
    } else {
      const card = cards.find(c => c.id === cardId);
      if (!card?.orders) {
        fetchCardOrders(cardId);
      } else {
        setShowOrders(cardId);
      }
    }
  };

  const scanNfcCard = async () => {
    if (!nfcSupported) {
      alert('NFC is not supported on this device. Please enter card UID manually.');
      return;
    }

    setScanning(true);
    try {
      // @ts-ignore - Web NFC API
      const ndef = new NDEFReader();
      await ndef.scan();

      ndef.addEventListener('reading', ({ serialNumber }: any) => {
        setCardUid(serialNumber);
        setScanning(false);
      });
    } catch (error) {
      console.error('NFC scan error:', error);
      alert('Failed to scan NFC card. Please enter UID manually.');
      setScanning(false);
    }
  };

  const handleAddCard = async () => {
    if (cards.length >= 3) {
      alert('You can link a maximum of 3 cards. Please remove a card before adding a new one.');
      return;
    }

    if (!cardUid || !pin || pin.length !== 4) {
      alert('Please enter card UID and a 4-digit PIN');
      return;
    }

    setProcessing(true);
    try {
      const data = await nfcApi.linkCard(cardUid, pin, cardAlias);
      setResult(data);
    } catch (error: any) {
      console.error('Failed to link card:', error);
      alert(error.response?.data?.error || 'Failed to link card');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveCard = async (cardUid: string) => {
    if (!confirm('Are you sure you want to remove this card from your account?')) {
      return;
    }

    const cardPin = prompt('Enter your 4-digit card PIN to confirm removal:');
    if (!cardPin || cardPin.length !== 4) {
      alert('Please enter a valid 4-digit PIN');
      return;
    }

    try {
      await nfcApi.unlinkCard(cardUid, cardPin);
      await fetchCards();
    } catch (error: any) {
      console.error('Failed to unlink card:', error);
      alert(error.response?.data?.error || 'Failed to unlink card. Please check your PIN.');
    }
  };

  const resetForm = () => {
    setShowAdd(false);
    setCardUid('');
    setCardAlias('');
    setPin('');
    setResult(null);
    fetchCards();
  };

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-14 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-xl font-semibold">NFC Cards</h1>
          <p className="text-sm text-gray-600">Tap to pay at BIG stores</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Card Limit Notice */}
        {cards.length >= 3 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Maximum cards reached</p>
              <p className="text-xs text-yellow-700 mt-1">
                You've linked the maximum of 3 cards. Remove a card to add a new one.
              </p>
            </div>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">BIG Shop Cards</h2>
              <p className="text-sm opacity-80">Link your NFC card for tap-to-pay</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            disabled={cards.length >= 3}
            className="w-full bg-white text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Link New Card {cards.length > 0 && `(${cards.length}/3)`}
          </button>
        </div>

        {/* How It Works */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">How It Works</h3>
          <ol className="text-sm text-blue-700 space-y-2">
            <li>1. Get a BIG Company NFC card from any retailer</li>
            <li>2. Link the card to your account here (max 3 cards)</li>
            <li>3. Set a 4-digit PIN for security</li>
            <li>4. Tap your card at any BIG retailer POS to pay</li>
          </ol>
        </div>

        {/* My Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-3">
            My Cards {cards.length > 0 && `(${cards.length}/3)`}
          </h2>
          {cards.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No cards linked yet</p>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Link Your First Card
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div key={card.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Card Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-800 p-3 rounded-lg">
                          <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{card.card_alias || 'My Card'}</p>
                          <p className="text-sm text-gray-500 font-mono">ID: {card.dashboard_id}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCard(card.card_uid)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove card"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          card.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {card.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-gray-500 text-xs">
                        Linked: {new Date(card.linked_at).toLocaleDateString()}
                      </span>
                    </div>

                    {card.last_used_at && (
                      <p className="text-xs text-gray-400 mt-2">
                        Last used: {formatDate(card.last_used_at)}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {/* View Order History Button */}
                      <button
                        onClick={() => toggleOrders(card.id)}
                        disabled={loadingOrders === card.id}
                        className="flex items-center justify-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium py-2 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                      >
                        {loadingOrders === card.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShoppingBag className="w-4 h-4" />
                        )}
                        {showOrders === card.id ? 'Hide' : 'View'} Orders
                      </button>

                      {/* View Transactions Button */}
                      {card.transactions && card.transactions.length > 0 && (
                        <button
                          onClick={() => setShowTransactions(card.id === showTransactions ? null : card.id)}
                          className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium py-2 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          {showTransactions === card.id ? 'Hide' : 'View'} Transactions
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order History */}
                  {showOrders === card.id && (
                    <div className="border-t border-gray-100">
                      <div className="p-3 bg-purple-50">
                        <h4 className="text-sm font-semibold text-purple-900">Order History</h4>
                        <p className="text-xs text-purple-700">All purchases made with this card</p>
                      </div>
                      {card.orders && card.orders.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                          {card.orders.map((order) => (
                            <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                                  <Store className="w-5 h-5 text-purple-600" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="font-medium text-sm">{order.shop_name}</p>
                                      {order.shop_location && (
                                        <p className="text-xs text-gray-500">{order.shop_location}</p>
                                      )}
                                      <p className="text-xs text-gray-500 font-mono mt-1">
                                        Order: {order.order_id}
                                      </p>
                                    </div>
                                    <span className="text-lg font-bold text-purple-600 whitespace-nowrap ml-2">
                                      {order.amount.toLocaleString()} RWF
                                    </span>
                                  </div>

                                  {/* Details */}
                                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>{formatDate(order.date)}</span>
                                    </div>
                                    {order.items_count && (
                                      <span>{order.items_count} {order.items_count === 1 ? 'item' : 'items'}</span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </div>

                                  {/* Invoice Button */}
                                  {order.invoice_url ? (
                                    <a
                                      href={order.invoice_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium mt-1"
                                    >
                                      <FileText className="w-3 h-3" />
                                      View Invoice
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <Link
                                      href={`/orders/${order.order_id}`}
                                      className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium mt-1"
                                    >
                                      <FileText className="w-3 h-3" />
                                      View Order Details
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">No orders found for this card</p>
                          <p className="text-gray-400 text-xs mt-1">
                            Use this card at any BIG retailer to make purchases
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transactions List */}
                  {showTransactions === card.id && card.transactions && card.transactions.length > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="p-3 bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-700">Recent Transactions</h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {card.transactions.map((tx) => (
                          <div key={tx.id} className="p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium">{tx.description}</p>
                                <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                              </div>
                              <span className={`text-sm font-semibold ${
                                tx.type === 'payment' ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {tx.type === 'payment' ? '-' : '+'}{tx.amount.toLocaleString()} RWF
                              </span>
                            </div>
                            {tx.order_id && (
                              <Link
                                href={`/orders/${tx.order_id}`}
                                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                              >
                                <FileText className="w-3 h-3" />
                                View Invoice
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            {result ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Card Linked!</h2>
                <p className="text-sm text-gray-600 mb-4">Your NFC card has been successfully linked to your account</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Dashboard ID</p>
                  <p className="font-mono font-bold text-lg">{result.card.dashboard_id}</p>
                  <p className="text-xs text-gray-500 mt-2">Write this ID on your card for reference</p>
                </div>
                <button
                  onClick={resetForm}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors mt-6"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Link NFC Card</h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>

                {/* NFC Scan Option */}
                {nfcSupported && (
                  <button
                    onClick={scanNfcCard}
                    disabled={scanning}
                    className="w-full mb-6 p-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-3 hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    <Nfc className={`w-10 h-10 ${scanning ? 'text-primary-500 animate-pulse' : 'text-gray-400'}`} />
                    <span className="font-medium">
                      {scanning ? 'Hold card near phone...' : 'Tap to Scan Card'}
                    </span>
                  </button>
                )}

                {/* Manual Entry */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card UID {nfcSupported && '(or enter manually)'}
                    </label>
                    <input
                      type="text"
                      value={cardUid}
                      onChange={(e) => setCardUid(e.target.value)}
                      placeholder="Enter card UID"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      value={cardAlias}
                      onChange={(e) => setCardAlias(e.target.value)}
                      placeholder="e.g., My Blue Card"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Set 4-Digit PIN
                    </label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      maxLength={4}
                      className="w-full p-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      You'll enter this PIN when paying at retailers
                    </p>
                  </div>

                  <button
                    onClick={handleAddCard}
                    disabled={!cardUid || pin.length !== 4 || processing}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Linking...
                      </>
                    ) : (
                      'Link Card'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
