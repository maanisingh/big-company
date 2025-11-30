import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { nfcService } from '../services';
import { NFCCard } from '../types';

const CardsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCards = useCallback(async () => {
    try {
      const data = await nfcService.getCards();
      setCards(data.cards);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCards();
  };

  const handleBlockCard = async (card: NFCCard) => {
    Alert.alert(
      'Block Card',
      `Are you sure you want to block "${card.nickname || card.card_number}"? You can unblock it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await nfcService.blockCard(card.id);
              loadCards();
              Alert.alert('Success', 'Card has been blocked');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to block card');
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (card: NFCCard) => {
    try {
      await nfcService.setPrimaryCard(card.id);
      loadCards();
      Alert.alert('Success', 'Card set as primary');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set primary card');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#00d4aa';
      case 'blocked':
        return '#ff6b6b';
      default:
        return '#999';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
          <Text style={styles.title}>My NFC Cards</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('LinkCard')}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Cards List */}
        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>No Cards Linked</Text>
            <Text style={styles.emptyDescription}>
              Link an NFC card to make payments at any BIG Company POS terminal.
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('LinkCard')}
            >
              <Text style={styles.linkButtonText}>Link Your First Card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          cards.map((card) => (
            <View key={card.id} style={styles.cardItem}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNickname}>
                    {card.nickname || 'NFC Card'}
                    {card.is_primary && (
                      <Text style={styles.primaryBadge}> ★ Primary</Text>
                    )}
                  </Text>
                  <Text style={styles.cardNumber}>{card.card_number}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(card.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(card.status) }]}>
                    {card.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Linked</Text>
                  <Text style={styles.detailValue}>{formatDate(card.linked_at)}</Text>
                </View>
                {card.last_used && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Last Used</Text>
                    <Text style={styles.detailValue}>{formatDate(card.last_used)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                {card.status === 'active' && !card.is_primary && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetPrimary(card)}
                  >
                    <Text style={styles.actionButtonText}>Set Primary</Text>
                  </TouchableOpacity>
                )}
                {card.status === 'active' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.blockButton]}
                    onPress={() => handleBlockCard(card)}
                  >
                    <Text style={[styles.actionButtonText, styles.blockButtonText]}>Block</Text>
                  </TouchableOpacity>
                )}
                {card.status === 'blocked' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('UnblockCard', { card })}
                  >
                    <Text style={styles.actionButtonText}>Unblock</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('ChangePin', { card })}
                >
                  <Text style={styles.actionButtonText}>Change PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About NFC Cards</Text>
          <Text style={styles.infoText}>
            NFC cards allow you to make quick tap-to-pay purchases at any BIG Company POS terminal.
            For amounts over 5,000 RWF, you'll need to enter your 4-digit PIN.
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
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#00d4aa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#0a1929',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#132f4c',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyDescription: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  linkButton: {
    backgroundColor: '#00d4aa',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#0a1929',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardItem: {
    backgroundColor: '#132f4c',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardInfo: {},
  cardNickname: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  primaryBadge: {
    color: '#00d4aa',
    fontSize: 12,
  },
  cardNumber: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: '#1e4976',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    color: '#666',
    fontSize: 12,
  },
  detailValue: {
    color: '#999',
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#1e4976',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#00d4aa',
    fontSize: 12,
    fontWeight: '500',
  },
  blockButton: {
    backgroundColor: '#ff6b6b20',
  },
  blockButtonText: {
    color: '#ff6b6b',
  },
  infoSection: {
    backgroundColor: '#132f4c',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
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

export default CardsScreen;
