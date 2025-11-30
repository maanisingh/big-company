import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import {
  LoginScreen,
  HomeScreen,
  TopUpScreen,
  CardsScreen,
  LinkCardScreen,
  ProfileScreen,
} from '../screens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Icons
const TabIcon: React.FC<{ name: string; focused: boolean }> = ({ name, focused }) => {
  const icons: Record<string, string> = {
    Home: '🏠',
    Wallet: '💰',
    Cards: '💳',
    Profile: '👤',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icons[name]}</Text>
    </View>
  );
};

// Main Tab Navigator (for authenticated users)
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#00d4aa',
        tabBarInactiveTintColor: '#666',
        tabBarIcon: ({ focused }) => <TabIcon name={route.name.replace('Tab', '')} focused={focused} />,
        tabBarLabel: ({ focused, color }) => (
          <Text style={[styles.tabLabel, { color }]}>
            {route.name.replace('Tab', '')}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
      <Tab.Screen name="WalletTab" component={WalletStack} options={{ title: 'Wallet' }} />
      <Tab.Screen name="CardsTab" component={CardsStack} options={{ title: 'Cards' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

// Home Stack
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
  </Stack.Navigator>
);

// Wallet Stack
const WalletStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="WalletHome" component={HomeScreen} />
    <Stack.Screen name="TopUp" component={TopUpScreen} />
    <Stack.Screen name="Transactions" component={HomeScreen} /> {/* Placeholder */}
    <Stack.Screen name="Transfer" component={HomeScreen} /> {/* Placeholder */}
  </Stack.Navigator>
);

// Cards Stack
const CardsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Cards" component={CardsScreen} />
    <Stack.Screen name="LinkCard" component={LinkCardScreen} />
  </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

// Auth Stack (for unauthenticated users)
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Main App Navigator
const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>BIG</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a1929',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00d4aa',
    marginBottom: 16,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
  },
  tabBar: {
    backgroundColor: '#0a1929',
    borderTopColor: '#132f4c',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default AppNavigator;
