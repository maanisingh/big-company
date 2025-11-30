import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNFC } from '../hooks/useNFC';

type LoginMethod = 'email' | 'card';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login, loginWithCard } = useAuth();
  const { isSupported: nfcSupported, isEnabled: nfcEnabled, startScan, isScanning } = useNFC();

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cardId, setCardId] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardLogin = async () => {
    if (!cardId || !pin) {
      setError('Please enter card ID and PIN');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginWithCard(cardId, pin);
    } catch (err: any) {
      setError(err.message || 'Card login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNFCScan = async () => {
    if (!nfcSupported) {
      Alert.alert('NFC Not Supported', 'Your device does not support NFC.');
      return;
    }

    if (!nfcEnabled) {
      Alert.alert('NFC Disabled', 'Please enable NFC in your device settings.');
      return;
    }

    Alert.alert('Scan NFC Card', 'Hold your NFC card near the back of your phone.');

    const result = await startScan();
    if (result) {
      setCardId(result.uid);
      Alert.alert('Card Detected', `Card ID: ${result.uid}\nNow enter your PIN to login.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo/Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>BIG</Text>
            <Text style={styles.logoSubtext}>COMPANY</Text>
            <Text style={styles.title}>Digital Wallet</Text>
          </View>

          {/* Login Method Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, loginMethod === 'email' && styles.activeTab]}
              onPress={() => setLoginMethod('email')}
            >
              <Text style={[styles.tabText, loginMethod === 'email' && styles.activeTabText]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, loginMethod === 'card' && styles.activeTab]}
              onPress={() => setLoginMethod('card')}
            >
              <Text style={[styles.tabText, loginMethod === 'card' && styles.activeTabText]}>
                NFC Card
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Login Form */}
          <View style={styles.form}>
            {loginMethod === 'email' ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleEmailLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Login</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.cardInputContainer}>
                  <TextInput
                    style={[styles.input, styles.cardInput]}
                    placeholder="Card ID"
                    placeholderTextColor="#999"
                    value={cardId}
                    onChangeText={setCardId}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={handleNFCScan}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.scanButtonText}>SCAN</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="4-digit PIN"
                  placeholderTextColor="#999"
                  value={pin}
                  onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleCardLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Login with Card</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00d4aa',
  },
  logoSubtext: {
    fontSize: 18,
    color: '#fff',
    letterSpacing: 8,
    marginTop: -5,
  },
  title: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#132f4c',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#00d4aa',
  },
  tabText: {
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#0a1929',
  },
  form: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#132f4c',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    color: '#fff',
    fontSize: 16,
  },
  cardInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  cardInput: {
    flex: 1,
  },
  scanButton: {
    backgroundColor: '#00d4aa',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButtonText: {
    color: '#0a1929',
    fontWeight: 'bold',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#00d4aa',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#0a1929',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#999',
  },
  registerLink: {
    color: '#00d4aa',
    fontWeight: '600',
  },
});

export default LoginScreen;
