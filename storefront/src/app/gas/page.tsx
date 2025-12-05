'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Plus,
  History,
  Check,
  AlertCircle,
  Wallet,
  CreditCard,
  Phone,
  User,
  IdCard,
  Loader2,
  TrendingUp,
  TrendingDown,
  Gift
} from 'lucide-react';
import { gasApi, walletApi } from '@/lib/api';
import { useAuthStore, useWalletStore } from '@/lib/store';

const predefinedAmounts = [300, 500, 1000, 2000, 5000, 10000];

interface GasMeter {
  id: string;
  meter_id: string;
  registered_name: string;
  id_number: string;
  phone_number: string;
  alias?: string;
  gas_from_topups: number;
  gas_from_rewards: number;
  created_at: string;
}

interface GasHistory {
  id: string;
  meter_id: string;
  amount: number;
  units: number;
  source: 'topup' | 'reward';
  created_at: string;
}

type PaymentMethod = 'wallet' | 'mobile_money';
type MobileProvider = 'mtn' | 'airtel';

export default function GasPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { balance } = useWalletStore();

  const [meters, setMeters] = useState<GasMeter[]>([]);
  const [history, setHistory] = useState<GasHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardBalance, setDashboardBalance] = useState(0);

  // Modals
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [showUsageHistory, setShowUsageHistory] = useState(false);

  // Add meter form
  const [newMeter, setNewMeter] = useState({
    meter_id: '',
    registered_name: '',
    id_number: '',
    phone_number: '',
    alias: ''
  });

  // Top-up form
  const [selectedMeter, setSelectedMeter] = useState<GasMeter | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [mobileProvider, setMobileProvider] = useState<MobileProvider>('mtn');
  const [mobileNumber, setMobileNumber] = useState('');
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Usage history
  const [selectedMeterForHistory, setSelectedMeterForHistory] = useState<GasMeter | null>(null);
  const [meterUsageHistory, setMeterUsageHistory] = useState<GasHistory[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/gas');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metersData, historyData, walletData] = await Promise.all([
        gasApi.getMeters(),
        gasApi.getHistory(),
        walletApi.getBalance()
      ]);
      setMeters(metersData.meters || []);
      setHistory(historyData.history || []);
      setDashboardBalance(walletData.dashboardBalance || 0);
    } catch (error) {
      console.error('Failed to fetch gas data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeter = async () => {
    if (!newMeter.meter_id || !newMeter.registered_name || !newMeter.id_number || !newMeter.phone_number) {
      alert('Please fill all required fields');
      return;
    }

    setProcessing(true);
    try {
      await gasApi.addMeter(newMeter);
      await fetchData();
      setShowAddMeter(false);
      setNewMeter({ meter_id: '', registered_name: '', id_number: '', phone_number: '', alias: '' });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add meter');
    } finally {
      setProcessing(false);
    }
  };

  const handleTopup = async () => {
    if (!selectedMeter || !selectedAmount || !pin) {
      alert('Please fill all required fields');
      return;
    }

    if (paymentMethod === 'wallet' && dashboardBalance < selectedAmount) {
      alert('Insufficient dashboard balance');
      return;
    }

    if (paymentMethod === 'mobile_money' && !mobileNumber) {
      alert('Please enter mobile number');
      return;
    }

    setProcessing(true);
    try {
      const data = await gasApi.topUp({
        meter_id: selectedMeter.meter_id,
        amount: selectedAmount,
        payment_method: paymentMethod,
        payment_details: {
          mobile_provider: paymentMethod === 'mobile_money' ? mobileProvider : undefined,
          mobile_number: paymentMethod === 'mobile_money' ? mobileNumber : undefined,
          pin: pin
        }
      });
      setResult(data);
      await fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gas top-up failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewUsageHistory = async (meter: GasMeter) => {
    setSelectedMeterForHistory(meter);
    setShowUsageHistory(true);
    try {
      const data = await gasApi.getMeterUsage(meter.meter_id);
      setMeterUsageHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch usage history:', error);
    }
  };

  const resetTopup = () => {
    setShowTopup(false);
    setSelectedMeter(null);
    setSelectedAmount(null);
    setPaymentMethod('wallet');
    setMobileNumber('');
    setPin('');
    setResult(null);
  };

  const formatPrice = (amount: number) => `${amount.toLocaleString()} RWF`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-RW', {
      day: 'numeric',
      month: 'short',
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
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Flame className="w-12 h-12" />
            <div>
              <h1 className="text-2xl font-bold">Gas Top-up</h1>
              <p className="text-sm opacity-90">Buy prepaid gas for your meter</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-xl p-4">
            <p className="text-sm opacity-90 mb-1">Dashboard Balance</p>
            <p className="text-2xl font-bold">{formatPrice(dashboardBalance)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => meters.length > 0 ? setShowTopup(true) : setShowAddMeter(true)}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <span className="font-medium">Buy Gas</span>
          </button>
          <button
            onClick={() => setShowAddMeter(true)}
            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-medium">Add Meter</span>
          </button>
        </div>

        {/* My Gas Meters */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold">My Gas Meters</h2>
            <p className="text-xs text-gray-500">Manage your registered meters</p>
          </div>
          {meters.length === 0 ? (
            <div className="p-8 text-center">
              <Flame className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No meters registered yet</p>
              <button onClick={() => setShowAddMeter(true)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                Add Your First Meter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {meters.map((meter) => (
                <div key={meter.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Flame className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">{meter.alias || 'Gas Meter'}</p>
                        <p className="text-sm text-gray-500">{meter.meter_id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMeter(meter);
                        setShowTopup(true);
                      }}
                      className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Top Up
                    </button>
                  </div>

                  {/* Meter Details */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{meter.registered_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">ID:</span>
                      <span className="font-medium">{meter.id_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{meter.phone_number}</span>
                    </div>
                  </div>

                  {/* Gas Usage */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-blue-700 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">From Top-ups</span>
                      </div>
                      <p className="text-lg font-bold text-blue-700">{meter.gas_from_topups || 0} M³</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-green-700 mb-1">
                        <Gift className="w-4 h-4" />
                        <span className="text-xs font-medium">From Rewards</span>
                      </div>
                      <p className="text-lg font-bold text-green-700">{meter.gas_from_rewards || 0} M³</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewUsageHistory(meter)}
                    className="w-full mt-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    View Usage History
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Top-ups */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold">Recent Top-ups</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No top-ups yet</p>
            ) : (
              history.slice(0, 5).map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.source === 'reward' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {item.source === 'reward' ? (
                        <Gift className="w-5 h-5 text-green-600" />
                      ) : (
                        <Flame className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.meter_id}</p>
                      <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(item.amount)}</p>
                    <p className="text-xs text-gray-500">{item.units} M³</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Meter Modal */}
      {showAddMeter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Add Gas Meter</h2>
              <p className="text-sm text-gray-600 mt-1">Register a new meter to your account</p>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meter ID *</label>
                <input
                  type="text"
                  value={newMeter.meter_id}
                  onChange={(e) => setNewMeter({...newMeter, meter_id: e.target.value})}
                  placeholder="Enter meter ID"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registered Name *</label>
                <input
                  type="text"
                  value={newMeter.registered_name}
                  onChange={(e) => setNewMeter({...newMeter, registered_name: e.target.value})}
                  placeholder="Name on meter registration"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Number *</label>
                <input
                  type="text"
                  value={newMeter.id_number}
                  onChange={(e) => setNewMeter({...newMeter, id_number: e.target.value})}
                  placeholder="National ID number"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={newMeter.phone_number}
                  onChange={(e) => setNewMeter({...newMeter, phone_number: e.target.value})}
                  placeholder="07xxxxxxxx"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nickname (Optional)</label>
                <input
                  type="text"
                  value={newMeter.alias}
                  onChange={(e) => setNewMeter({...newMeter, alias: e.target.value})}
                  placeholder="e.g., Home, Office"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowAddMeter(false);
                    setNewMeter({ meter_id: '', registered_name: '', id_number: '', phone_number: '', alias: '' });
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMeter}
                  disabled={processing}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Adding...' : 'Add Meter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top-up Modal */}
      {showTopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden">
            {result ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Gas Top-up Successful!</h2>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Meter</p>
                    <p className="font-medium">{result.meter_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Units Credited</p>
                    <p className="font-medium">{result.units} M³</p>
                  </div>
                  {result.token && (
                    <div>
                      <p className="text-sm text-gray-600">Token</p>
                      <p className="font-mono font-bold text-lg">{result.token}</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Token has been sent to your registered phone via SMS.
                </p>
                <button onClick={resetTopup} className="w-full mt-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold">Buy Gas</h2>
                  <p className="text-sm text-gray-600 mt-1">Top up your gas meter</p>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Select Meter */}
                  {!selectedMeter && meters.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Select Meter</label>
                      <div className="space-y-2">
                        {meters.map((meter) => (
                          <button
                            key={meter.id}
                            onClick={() => setSelectedMeter(meter)}
                            className="w-full p-4 border-2 rounded-lg flex items-center gap-3 hover:border-orange-500 transition-colors text-left"
                          >
                            <Flame className="w-6 h-6 text-orange-500" />
                            <div>
                              <p className="font-medium">{meter.alias || 'Gas Meter'}</p>
                              <p className="text-sm text-gray-500">{meter.meter_id}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedMeter && (
                    <>
                      {/* Selected Meter */}
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600">Meter</p>
                        <p className="font-semibold">{selectedMeter.alias || 'Gas Meter'}</p>
                        <p className="text-sm text-gray-600">{selectedMeter.meter_id}</p>
                      </div>

                      {/* Amount Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Select Amount</label>
                        <div className="grid grid-cols-3 gap-2">
                          {predefinedAmounts.map((amount) => (
                            <button
                              key={amount}
                              onClick={() => setSelectedAmount(amount)}
                              className={`p-3 rounded-lg font-medium border-2 transition-colors ${
                                selectedAmount === amount
                                  ? 'border-orange-600 bg-orange-50 text-orange-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {formatPrice(amount)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Payment Method */}
                      {selectedAmount && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                            <div className="space-y-2">
                              <button
                                onClick={() => setPaymentMethod('wallet')}
                                className={`w-full p-4 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                                  paymentMethod === 'wallet' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                                }`}
                              >
                                <Wallet className="w-5 h-5" />
                                <div className="flex-1 text-left">
                                  <p className="font-medium">Dashboard Balance</p>
                                  <p className="text-sm text-gray-500">{formatPrice(dashboardBalance)}</p>
                                </div>
                              </button>
                              <button
                                onClick={() => setPaymentMethod('mobile_money')}
                                className={`w-full p-4 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                                  paymentMethod === 'mobile_money' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                                }`}
                              >
                                <CreditCard className="w-5 h-5" />
                                <div className="flex-1 text-left">
                                  <p className="font-medium">Mobile Money</p>
                                  <p className="text-sm text-gray-500">MTN or Airtel</p>
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* Mobile Money Details */}
                          {paymentMethod === 'mobile_money' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => setMobileProvider('mtn')}
                                  className={`p-3 rounded-lg border-2 transition-colors ${
                                    mobileProvider === 'mtn' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'
                                  }`}
                                >
                                  <p className="font-medium text-sm">MTN MoMo</p>
                                </button>
                                <button
                                  onClick={() => setMobileProvider('airtel')}
                                  className={`p-3 rounded-lg border-2 transition-colors ${
                                    mobileProvider === 'airtel' ? 'border-red-500 bg-red-50' : 'border-gray-200'
                                  }`}
                                >
                                  <p className="font-medium text-sm">Airtel Money</p>
                                </button>
                              </div>
                              <input
                                type="tel"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                                placeholder="Mobile Number (07xxxxxxxx)"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </>
                          )}

                          {/* PIN */}
                          <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Enter PIN to confirm"
                            maxLength={4}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />

                          {/* Balance Warning */}
                          {paymentMethod === 'wallet' && dashboardBalance < selectedAmount && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-red-500" />
                              <p className="text-sm text-red-700">Insufficient dashboard balance</p>
                            </div>
                          )}

                          {/* Submit */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={resetTopup}
                              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleTopup}
                              disabled={processing || (paymentMethod === 'wallet' && dashboardBalance < selectedAmount)}
                              className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                            >
                              {processing ? 'Processing...' : `Buy Gas ${formatPrice(selectedAmount)}`}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Usage History Modal */}
      {showUsageHistory && selectedMeterForHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Gas Usage History</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedMeterForHistory.meter_id}</p>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {meterUsageHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No usage history</p>
              ) : (
                <div className="space-y-3">
                  {meterUsageHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.source === 'reward' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {item.source === 'reward' ? (
                            <Gift className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {item.source === 'reward' ? 'From Rewards' : 'From Top-up'}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{item.units} M³</p>
                        <p className="text-xs text-gray-500">{formatPrice(item.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowUsageHistory(false);
                  setSelectedMeterForHistory(null);
                }}
                className="w-full py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
