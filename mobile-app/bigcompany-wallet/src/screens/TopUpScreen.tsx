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
import { walletService, TOP_UP_OPTIONS } from '../services';
import { TopUpOption } from '../types';

type Provider = 'mtn_momo' | 'airtel_money';

const TopUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [provider, setProvider] = useState<Provider>('mtn_momo');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    return parseInt(customAmount) || 0;
  };

  const handleTopUp = async () => {
    const amount = getAmount();
    if (amount < 100) {
      Alert.alert('Invalid Amount', 'Minimum top-up amount is 100 RWF');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    // Validate phone number prefix for provider
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (provider === 'mtn_momo' && !cleanPhone.startsWith('078') && !cleanPhone.startsWith('25078')) {
      Alert.alert('Invalid Number', 'MTN numbers start with 078');
      return;
    }
    if (provider === 'airtel_money' && !cleanPhone.startsWith('073') && !cleanPhone.startsWith('25073')) {
      Alert.alert('Invalid Number', 'Airtel numbers start with 073');
      return;
    }

    setIsLoading(true);

    try {
      const result = await walletService.topUp({
        amount,
        provider,
        phone_number: phoneNumber,
      });

      if (result.success) {
        Alert.alert(
          'Top-Up Initiated',
          `Please complete the payment on your phone.\n\nReference: ${result.reference}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Top-Up Failed', result.message || 'Please try again');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to initiate top-up');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW').format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Top Up Wallet</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Amount Selection */}
        <Text style={styles.sectionTitle}>Select Amount</Text>
        <View style={styles.amountGrid}>
          {TOP_UP_OPTIONS.map((option: TopUpOption) => (
            <TouchableOpacity
              key={option.amount}
              style={[
                styles.amountButton,
                selectedAmount === option.amount && styles.amountButtonSelected,
              ]}
              onPress={() => {
                setSelectedAmount(option.amount);
                setCustomAmount('');
              }}
            >
              <Text
                style={[
                  styles.amountText,
                  selectedAmount === option.amount && styles.amountTextSelected,
                ]}
              >
                {formatCurrency(option.amount)} RWF
              </Text>
              {option.bonus && (
                <Text style={styles.bonusText}>+{option.bonus} bonus</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Amount */}
        <Text style={styles.sectionTitle}>Or Enter Custom Amount</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount in RWF"
          placeholderTextColor="#666"
          value={customAmount}
          onChangeText={(text) => {
            setCustomAmount(text.replace(/[^0-9]/g, ''));
            setSelectedAmount(null);
          }}
          keyboardType="numeric"
        />

        {/* Payment Method */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.providerContainer}>
          <TouchableOpacity
            style={[styles.providerButton, provider === 'mtn_momo' && styles.providerSelected]}
            onPress={() => setProvider('mtn_momo')}
          >
            <View style={[styles.providerIcon, { backgroundColor: '#ffcc00' }]}>
              <Text style={styles.providerIconText}>MTN</Text>
            </View>
            <Text style={[styles.providerText, provider === 'mtn_momo' && styles.providerTextSelected]}>
              MTN MoMo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.providerButton, provider === 'airtel_money' && styles.providerSelected]}
            onPress={() => setProvider('airtel_money')}
          >
            <View style={[styles.providerIcon, { backgroundColor: '#ff0000' }]}>
              <Text style={styles.providerIconText}>AM</Text>
            </View>
            <Text style={[styles.providerText, provider === 'airtel_money' && styles.providerTextSelected]}>
              Airtel Money
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phone Number */}
        <Text style={styles.sectionTitle}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder={provider === 'mtn_momo' ? '078 XXX XXXX' : '073 XXX XXXX'}
          placeholderTextColor="#666"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={12}
        />

        {/* Summary */}
        {getAmount() > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>{formatCurrency(getAmount())} RWF</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Method</Text>
              <Text style={styles.summaryValue}>
                {provider === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'}
              </Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleTopUp}
          disabled={isLoading || getAmount() < 100}
        >
          {isLoading ? (
            <ActivityIndicator color="#0a1929" />
          ) : (
            <Text style={styles.submitButtonText}>
              Top Up {getAmount() > 0 ? `${formatCurrency(getAmount())} RWF` : ''}
            </Text>
          )}
        </TouchableOpacity>
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
  sectionTitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 12,
    marginTop: 16,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amountButton: {
    width: '31%',
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amountButtonSelected: {
    borderColor: '#00d4aa',
    backgroundColor: '#1a3a5c',
  },
  amountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  amountTextSelected: {
    color: '#00d4aa',
  },
  bonusText: {
    color: '#00d4aa',
    fontSize: 10,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  providerContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  providerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerSelected: {
    borderColor: '#00d4aa',
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerIconText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  providerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  providerTextSelected: {
    color: '#00d4aa',
  },
  summary: {
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#999',
    fontSize: 14,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#00d4aa',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0a1929',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TopUpScreen;
