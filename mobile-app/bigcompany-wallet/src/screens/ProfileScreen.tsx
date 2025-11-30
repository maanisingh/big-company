import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const menuItems = [
    { id: 'personal', icon: '👤', label: 'Personal Information', screen: 'PersonalInfo' },
    { id: 'security', icon: '🔒', label: 'Security Settings', screen: 'Security' },
    { id: 'notifications', icon: '🔔', label: 'Notifications', screen: 'Notifications' },
    { id: 'help', icon: '❓', label: 'Help & Support', screen: 'Help' },
    { id: 'about', icon: 'ℹ️', label: 'About', screen: 'About' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.first_name
              ? `${user.first_name} ${user.last_name || ''}`
              : user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* USSD Info */}
        <View style={styles.ussdSection}>
          <Text style={styles.ussdTitle}>Access via USSD</Text>
          <Text style={styles.ussdCode}>*939#</Text>
          <Text style={styles.ussdDescription}>
            Check balance, top-up, and manage your account from any phone - no internet required!
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>BigCompany Wallet v1.0.0</Text>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00d4aa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#0a1929',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#999',
    fontSize: 14,
  },
  userPhone: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: '#132f4c',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e4976',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  menuLabel: {
    color: '#fff',
    fontSize: 16,
  },
  menuArrow: {
    color: '#666',
    fontSize: 24,
  },
  ussdSection: {
    backgroundColor: '#132f4c',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  ussdTitle: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  ussdCode: {
    color: '#00d4aa',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  ussdDescription: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: '#ff6b6b20',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ProfileScreen;
