import { useState, useEffect, useCallback } from 'react';
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';
import { Platform, Alert } from 'react-native';

interface NFCScanResult {
  uid: string;
  techType: string;
  data?: string;
}

interface UseNFCReturn {
  isSupported: boolean;
  isEnabled: boolean;
  isScanning: boolean;
  lastScannedTag: NFCScanResult | null;
  startScan: () => Promise<NFCScanResult | null>;
  stopScan: () => Promise<void>;
  checkNFCStatus: () => Promise<void>;
  error: string | null;
}

export const useNFC = (): UseNFCReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedTag, setLastScannedTag] = useState<NFCScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize NFC manager
  useEffect(() => {
    const initNFC = async () => {
      try {
        const supported = await NfcManager.isSupported();
        setIsSupported(supported);

        if (supported) {
          await NfcManager.start();
          const enabled = await NfcManager.isEnabled();
          setIsEnabled(enabled);
        }
      } catch (err) {
        console.error('NFC init error:', err);
        setError('Failed to initialize NFC');
      }
    };

    initNFC();

    // Cleanup on unmount
    return () => {
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.setEventListener(NfcEvents.SessionClosed, null);
    };
  }, []);

  // Check NFC status (useful for when user returns from settings)
  const checkNFCStatus = useCallback(async () => {
    try {
      if (isSupported) {
        const enabled = await NfcManager.isEnabled();
        setIsEnabled(enabled);
      }
    } catch (err) {
      console.error('NFC status check error:', err);
    }
  }, [isSupported]);

  // Start scanning for NFC tags (cheap NFC stickers/tags)
  const startScan = useCallback(async (): Promise<NFCScanResult | null> => {
    if (!isSupported) {
      setError('NFC is not supported on this device');
      return null;
    }

    if (!isEnabled) {
      setError('NFC is disabled. Please enable NFC in settings.');
      Alert.alert(
        'NFC Disabled',
        'Please enable NFC in your device settings to scan cards.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => NfcManager.goToNfcSetting()
          },
        ]
      );
      return null;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Request NFC technology - NfcA is most common for cheap NFC tags
      await NfcManager.requestTechnology([
        NfcTech.NfcA,
        NfcTech.NfcB,
        NfcTech.NfcF,
        NfcTech.NfcV,
        NfcTech.IsoDep,
        NfcTech.MifareClassic,
        NfcTech.MifareUltralight,
      ]);

      // Get tag info
      const tag = await NfcManager.getTag();

      if (tag) {
        // Extract UID (unique identifier) - this is what we use to identify the card
        const uid = tag.id || '';

        // Convert UID bytes to hex string if needed
        const uidHex = Array.isArray(uid)
          ? uid.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
          : uid.toUpperCase();

        const result: NFCScanResult = {
          uid: uidHex,
          techType: tag.techTypes?.[0] || 'Unknown',
          data: tag.ndefMessage
            ? Ndef.text.decodePayload(tag.ndefMessage[0].payload as any)
            : undefined,
        };

        setLastScannedTag(result);
        return result;
      }

      return null;
    } catch (err: any) {
      if (err.message !== 'cancelled') {
        console.error('NFC scan error:', err);
        setError(err.message || 'Failed to scan NFC tag');
      }
      return null;
    } finally {
      setIsScanning(false);
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }, [isSupported, isEnabled]);

  // Stop scanning
  const stopScan = useCallback(async () => {
    setIsScanning(false);
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (err) {
      // Ignore errors when stopping scan
    }
  }, []);

  return {
    isSupported,
    isEnabled,
    isScanning,
    lastScannedTag,
    startScan,
    stopScan,
    checkNFCStatus,
    error,
  };
};

export default useNFC;
