import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { walletService } from '../services';
import { WalletBalance, Transaction } from '../types';

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [balanceData, transactionsData] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions(1, 5),
      ]);
      setBalance(balanceData);
      setRecentTransactions(transactionsData.transactions);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' RWF';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d4aa" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4aa" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>
              {user?.first_name || user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('ProfileTab')}
          >
            <Text style={styles.profileInitial}>
              {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(balance?.total_available || 0)}
          </Text>
          <View style={styles.balanceDetails}>
            <View style={styles.balanceDetail}>
              <Text style={styles.balanceDetailLabel}>Wallet</Text>
              <Text style={styles.balanceDetailValue}>
                {formatCurrency(balance?.balance || 0)}
              </Text>
            </View>
            {(balance?.food_loan_credit || 0) > 0 && (
              <View style={styles.balanceDetail}>
                <Text style={styles.balanceDetailLabel}>Food Credit</Text>
                <Text style={styles.balanceDetailValue}>
                  {formatCurrency(balance?.food_loan_credit || 0)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('TopUp')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>+</Text>
            </View>
            <Text style={styles.actionLabel}>Top Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CardsTab')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>💳</Text>
            </View>
            <Text style={styles.actionLabel}>My Cards</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Transactions')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📊</Text>
            </View>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Transfer')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>↗️</Text>
            </View>
            <Text style={styles.actionLabel}>Transfer</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          ) : (
            recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Text style={styles.transactionIconText}>
                    {transaction.type === 'credit' ? '↓' : '↑'}
                  </Text>
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.created_at)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    transaction.type === 'credit' ? styles.creditAmount : styles.debitAmount,
                  ]}
                >
                  {transaction.type === 'credit' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    color: '#999',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00d4aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#0a1929',
    fontSize: 20,
    fontWeight: 'bold',
  },
  balanceCard: {
    backgroundColor: '#132f4c',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  balanceLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  balanceDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  balanceDetail: {},
  balanceDetailLabel: {
    color: '#666',
    fontSize: 12,
  },
  balanceDetailValue: {
    color: '#00d4aa',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#132f4c',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionLabel: {
    color: '#999',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    color: '#00d4aa',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e4976',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 18,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  creditAmount: {
    color: '#00d4aa',
  },
  debitAmount: {
    color: '#ff6b6b',
  },
});

export default HomeScreen;
