'use client';

import { useState, useEffect } from 'react';
import { Flame, Plus, History, Check, AlertCircle } from 'lucide-react';
import { gasApi } from '@/lib/api';
import { useWalletStore } from '@/lib/store';

const predefinedAmounts = [300, 500, 1000, 2000, 5000, 10000];

export default function GasPage() {
  const { balance } = useWalletStore();
  const [meters, setMeters] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState<any>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [newMeterNumber, setNewMeterNumber] = useState('');
  const [newMeterAlias, setNewMeterAlias] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [metersData, historyData] = await Promise.all([
        gasApi.getMeters(),
        gasApi.getHistory(),
      ]);
      setMeters(metersData.meters || []);
      setHistory(historyData.history || []);
    } catch (error) {
      console.error('Failed to fetch gas data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeter = async () => {
    if (!newMeterNumber) return;

    setProcessing(true);
    try {
      await gasApi.registerMeter(newMeterNumber, newMeterAlias);
      await fetchData();
      setShowAddMeter(false);
      setNewMeterNumber('');
      setNewMeterAlias('');
    } catch (error) {
      console.error('Failed to add meter:', error);
      alert('Failed to add meter. Please check the meter number.');
    } finally {
      setProcessing(false);
    }
  };

  const handleTopup = async () => {
    if (!selectedMeter || !selectedAmount) return;

    if (balance < selectedAmount) {
      alert('Insufficient wallet balance. Please top up your wallet first.');
      return;
    }

    setProcessing(true);
    try {
      const data = await gasApi.topUp(selectedMeter.meter_number, selectedAmount, 'wallet');
      setResult(data);
    } catch (error: any) {
      console.error('Gas top-up failed:', error);
      alert(error.response?.data?.error || 'Gas top-up failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const resetTopup = () => {
    setShowTopup(false);
    setSelectedMeter(null);
    setSelectedAmount(null);
    setResult(null);
    fetchData();
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <div className="flex items-center gap-4">
          <Flame className="w-12 h-12" />
          <div>
            <h1 className="text-xl font-semibold">Gas Top-up</h1>
            <p className="text-sm opacity-80">Buy prepaid gas for your meter</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => meters.length > 0 ? setShowTopup(true) : setShowAddMeter(true)}
            className="flex-1 bg-white text-orange-700 py-3 rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            Buy Gas
          </button>
          <button
            onClick={() => setShowAddMeter(true)}
            className="bg-white/20 px-4 rounded-lg hover:bg-white/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* My Meters */}
      <section>
        <h2 className="text-lg font-semibold mb-3">My Gas Meters</h2>
        {loading ? (
          <div className="card text-center py-8 text-gray-500">Loading...</div>
        ) : meters.length === 0 ? (
          <div className="card text-center py-8">
            <Flame className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No meters registered yet</p>
            <button
              onClick={() => setShowAddMeter(true)}
              className="btn-primary mt-4"
            >
              Add Your First Meter
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {meters.map((meter) => (
              <div
                key={meter.id}
                className="card flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setSelectedMeter(meter);
                  setShowTopup(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Flame className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{meter.alias || 'Gas Meter'}</p>
                    <p className="text-sm text-gray-500">{meter.meter_number}</p>
                  </div>
                </div>
                <span className="text-primary-600 font-medium">Top Up</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Top-ups */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold">Recent Top-ups</h2>
        </div>
        <div className="card">
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No top-ups yet</p>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 5).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{item.meter_alias}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-600">
                      {item.amount.toLocaleString()} RWF
                    </p>
                    <p className="text-xs text-gray-500">{item.units_purchased} units</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Add Meter Modal */}
      {showAddMeter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Add Gas Meter</h2>
              <button
                onClick={() => setShowAddMeter(false)}
                className="text-gray-500"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meter Number
                </label>
                <input
                  type="text"
                  value={newMeterNumber}
                  onChange={(e) => setNewMeterNumber(e.target.value)}
                  placeholder="Enter your meter number"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={newMeterAlias}
                  onChange={(e) => setNewMeterAlias(e.target.value)}
                  placeholder="e.g., Home, Office"
                  className="input"
                />
              </div>

              <button
                onClick={handleAddMeter}
                disabled={!newMeterNumber || processing}
                className="btn-primary w-full py-3"
              >
                {processing ? 'Adding...' : 'Add Meter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-up Modal */}
      {showTopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            {result ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">Gas Top-up Successful!</h2>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                  <p className="text-sm text-gray-600">Meter</p>
                  <p className="font-medium">{result.meter_number}</p>
                  <p className="text-sm text-gray-600 mt-3">Units Credited</p>
                  <p className="font-medium">{result.units} units</p>
                  <p className="text-sm text-gray-600 mt-3">Token</p>
                  <p className="font-mono font-bold text-lg">{result.token}</p>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Token has been sent to your registered phone via SMS.
                </p>
                <button onClick={resetTopup} className="btn-primary w-full mt-6 py-3">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Buy Gas</h2>
                  <button onClick={resetTopup} className="text-gray-500">
                    Cancel
                  </button>
                </div>

                {/* Select Meter */}
                {!selectedMeter && meters.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Meter
                    </label>
                    <div className="space-y-2">
                      {meters.map((meter) => (
                        <button
                          key={meter.id}
                          onClick={() => setSelectedMeter(meter)}
                          className="w-full p-4 border-2 rounded-lg flex items-center gap-3 hover:border-orange-500 transition-colors"
                        >
                          <Flame className="w-6 h-6 text-orange-500" />
                          <div className="text-left">
                            <p className="font-medium">{meter.alias}</p>
                            <p className="text-sm text-gray-500">{meter.meter_number}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Meter Info */}
                {selectedMeter && (
                  <>
                    <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600">Meter</p>
                      <p className="font-semibold">{selectedMeter.alias}</p>
                      <p className="text-sm text-gray-600">{selectedMeter.meter_number}</p>
                    </div>

                    {/* Amount Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Amount
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {predefinedAmounts.map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setSelectedAmount(amount)}
                            className={`amount-btn ${
                              selectedAmount === amount
                                ? 'border-orange-600 bg-orange-50 text-orange-700'
                                : 'amount-btn-unselected'
                            }`}
                          >
                            {amount.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Balance Warning */}
                    {selectedAmount && balance < selectedAmount && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-sm text-red-700">
                          Insufficient balance. Please top up your wallet.
                        </p>
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      onClick={handleTopup}
                      disabled={!selectedAmount || processing || balance < (selectedAmount || 0)}
                      className="btn-primary w-full py-3 bg-orange-600 hover:bg-orange-700"
                    >
                      {processing
                        ? 'Processing...'
                        : `Buy Gas ${selectedAmount?.toLocaleString() || ''} RWF`}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
