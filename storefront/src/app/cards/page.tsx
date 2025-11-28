'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Check, Nfc } from 'lucide-react';
import { nfcApi } from '@/lib/api';

export default function CardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [cardUid, setCardUid] = useState('');
  const [cardAlias, setCardAlias] = useState('');
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchCards();
    // Check if Web NFC is supported
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  const fetchCards = async () => {
    try {
      const data = await nfcApi.getCards();
      setCards(data.cards || []);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
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

  const handleRemoveCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to unlink this card?')) return;

    try {
      await nfcApi.unlinkCard(cardId);
      await fetchCards();
    } catch (error) {
      console.error('Failed to unlink card:', error);
      alert('Failed to unlink card');
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

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-br from-gray-800 to-gray-900 text-white">
        <div className="flex items-center gap-4">
          <CreditCard className="w-12 h-12" />
          <div>
            <h1 className="text-xl font-semibold">BIG Shop Cards</h1>
            <p className="text-sm opacity-80">Link your NFC card for tap-to-pay</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="mt-4 w-full bg-white text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Link New Card
        </button>
      </div>

      {/* How It Works */}
      <section className="card bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">How It Works</h3>
        <ol className="text-sm text-blue-700 space-y-2">
          <li>1. Get a BIG Company NFC card from any retailer</li>
          <li>2. Link the card to your account here</li>
          <li>3. Set a 4-digit PIN for security</li>
          <li>4. Tap your card at any BIG retailer POS to pay</li>
        </ol>
      </section>

      {/* My Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-3">My Cards</h2>
        {loading ? (
          <div className="card text-center py-8 text-gray-500">Loading...</div>
        ) : cards.length === 0 ? (
          <div className="card text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No cards linked yet</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
              Link Your First Card
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div key={card.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">{card.card_alias || 'My Card'}</p>
                      <p className="text-sm text-gray-500">ID: {card.dashboard_id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCard(card.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span
                    className={`px-2 py-1 rounded-full ${
                      card.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {card.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-gray-500">
                    Linked: {new Date(card.linked_at).toLocaleDateString()}
                  </span>
                </div>
                {card.last_used_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last used: {new Date(card.last_used_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Card Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            {result ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">Card Linked!</h2>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Dashboard ID</p>
                  <p className="font-mono font-bold text-lg">{result.card.dashboard_id}</p>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Write this ID on your card for reference.
                </p>
                <button onClick={resetForm} className="btn-primary w-full mt-6 py-3">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Link NFC Card</h2>
                  <button onClick={resetForm} className="text-gray-500">
                    Cancel
                  </button>
                </div>

                {/* NFC Scan Option */}
                {nfcSupported && (
                  <button
                    onClick={scanNfcCard}
                    disabled={scanning}
                    className="w-full mb-6 p-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-3 hover:border-primary-500 hover:bg-primary-50 transition-colors"
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
                      className="input"
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
                      className="input"
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
                      className="input text-center text-2xl tracking-widest"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      You'll enter this PIN when paying at retailers
                    </p>
                  </div>

                  <button
                    onClick={handleAddCard}
                    disabled={!cardUid || pin.length !== 4 || processing}
                    className="btn-primary w-full py-3"
                  >
                    {processing ? 'Linking...' : 'Link Card'}
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
