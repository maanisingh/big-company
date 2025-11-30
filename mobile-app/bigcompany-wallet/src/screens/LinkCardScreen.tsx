import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { nfcService } from '../services';
import { useNFC } from '../hooks/useNFC';

const LinkCardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isSupported, isEnabled, startScan, isScanning, error: nfcError } = useNFC();

  const [cardUid, setCardUid] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'scan' | 'pin'>('scan');

  const handleScanCard = async () => {
    if (!isSupported) {
      Alert.alert(
        'NFC Not Supported',
        'Your device does not support NFC. You can enter the card ID manually.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isEnabled) {
      Alert.alert(
        'NFC Disabled',
        'Please enable NFC in your device settings to scan the card.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Scan Card',
      'Hold your NFC card near the back of your phone.',
      [{ text: 'Cancel', style: 'cancel' }],
      { cancelable: true }
    );

    const result = await startScan();
    if (result) {
      setCardUid(result.uid);
      Alert.alert('Card Detected!', `Card ID: ${result.uid}`, [
        { text: 'Continue', onPress: () => setStep('pin') },
      ]);
    }
  };

  const handleContinue = async () => {
    if (!cardUid) {
      Alert.alert('Error', 'Please scan or enter a card ID');
      return;
    }

    // Check if card is available
    try {
      setIsLoading(true);
      const availability = await nfcService.checkCardAvailability(cardUid);
      if (!availability.available) {
        Alert.alert('Card Unavailable', availability.message);
        return;
      }
      setStep('pin');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check card');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkCard = async () => {
    if (!pin || pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match');
      return;
    }

    setIsLoading(true);

    try {
      await nfcService.linkCard(cardUid, pin, nickname || undefined);
      Alert.alert('Success!', 'Your card has been linked successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to link card');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Link NFC Card</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, styles.progressStepActive]}>
            <Text style={styles.progressStepText}>1</Text>
          </View>
          <View style={[styles.progressLine, step === 'pin' && styles.progressLineActive]} />
          <View style={[styles.progressStep, step === 'pin' && styles.progressStepActive]}>
            <Text style={styles.progressStepText}>2</Text>
          </View>
        </View>

        {step === 'scan' ? (
          <>
            {/* Scan Card Step */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Step 1: Identify Your Card</Text>
              <Text style={styles.sectionDescription}>
                Scan your NFC card using your phone or enter the card ID manually.
              </Text>

              {/* NFC Scan Button */}
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleScanCard}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator color="#0a1929" />
                ) : (
                  <>
                    <Text style={styles.scanIcon}>📱</Text>
                    <Text style={styles.scanButtonText}>Tap to Scan NFC Card</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.orText}>OR</Text>

              {/* Manual Entry */}
              <Text style={styles.inputLabel}>Enter Card ID Manually</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., A1B2C3D4E5F6"
                placeholderTextColor="#666"
                value={cardUid}
                onChangeText={(text) => setCardUid(text.toUpperCase())}
                autoCapitalize="characters"
              />

              {cardUid ? (
                <View style={styles.cardPreview}>
                  <Text style={styles.cardPreviewLabel}>Card ID</Text>
                  <Text style={styles.cardPreviewValue}>{cardUid}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.continueButton, !cardUid && styles.continueButtonDisabled]}
                onPress={handleContinue}
                disabled={!cardUid || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0a1929" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Set PIN Step */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Step 2: Set Your PIN</Text>
              <Text style={styles.sectionDescription}>
                Create a 4-digit PIN to secure your card. You'll need this PIN for purchases over
                5,000 RWF.
              </Text>

              {/* Card ID Display */}
              <View style={styles.cardPreview}>
                <Text style={styles.cardPreviewLabel}>Card ID</Text>
                <Text style={styles.cardPreviewValue}>{cardUid}</Text>
              </View>

              {/* Nickname (Optional) */}
              <Text style={styles.inputLabel}>Card Nickname (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., My Work Card"
                placeholderTextColor="#666"
                value={nickname}
                onChangeText={setNickname}
              />

              {/* PIN */}
              <Text style={styles.inputLabel}>Create 4-Digit PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="••••"
                placeholderTextColor="#666"
                value={pin}
                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />

              {/* Confirm PIN */}
              <Text style={styles.inputLabel}>Confirm PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="••••"
                placeholderTextColor="#666"
                value={confirmPin}
                onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.backStepButton} onPress={() => setStep('scan')}>
                  <Text style={styles.backStepButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.linkButton,
                    (pin.length !== 4 || pin !== confirmPin) && styles.linkButtonDisabled,
                  ]}
                  onPress={handleLinkCard}
                  disabled={pin.length !== 4 || pin !== confirmPin || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0a1929" />
                  ) : (
                    <Text style={styles.linkButtonText}>Link Card</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Where to Find Card ID?</Text>
          <Text style={styles.infoText}>
            The card ID is printed on the back of your NFC card, or you can scan it using your
            phone's NFC reader.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#132f4c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#132f4c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#00d4aa',
  },
  progressStepText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#132f4c',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#00d4aa',
  },
  section: {},
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#999',
    fontSize: 14,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: '#00d4aa',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  scanButtonText: {
    color: '#0a1929',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orText: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  inputLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  cardPreview: {
    backgroundColor: '#1e4976',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  cardPreviewLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  cardPreviewValue: {
    color: '#00d4aa',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  continueButton: {
    backgroundColor: '#00d4aa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#0a1929',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backStepButton: {
    flex: 1,
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  backStepButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    flex: 2,
    backgroundColor: '#00d4aa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  linkButtonDisabled: {
    opacity: 0.5,
  },
  linkButtonText: {
    color: '#0a1929',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default LinkCardScreen;
