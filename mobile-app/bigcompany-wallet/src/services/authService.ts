import api, { handleApiError } from './api';
import * as SecureStore from 'expo-secure-store';
import { User, LoginCredentials, AuthResponse } from '../types';

export const authService = {
  // Login with email and password
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await api.post<AuthResponse>('/store/auth', credentials);
      const user = response.data.customer;

      // Store user data securely
      await SecureStore.setItemAsync('user_data', JSON.stringify(user));
      await SecureStore.setItemAsync('session_token', `session_${user.id}`);

      return user;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Login with NFC Card ID and PIN
  async loginWithCard(cardId: string, pin: string): Promise<User> {
    try {
      const response = await api.post('/store/auth/card', {
        card_uid: cardId,
        pin: pin,
      });
      const user = response.data.customer;

      await SecureStore.setItemAsync('user_data', JSON.stringify(user));
      await SecureStore.setItemAsync('session_token', `session_${user.id}`);

      return user;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Register new customer
  async register(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<User> {
    try {
      const response = await api.post<AuthResponse>('/store/customers', data);
      const user = response.data.customer;

      await SecureStore.setItemAsync('user_data', JSON.stringify(user));
      await SecureStore.setItemAsync('session_token', `session_${user.id}`);

      return user;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await api.delete('/store/auth');
    } catch (error) {
      // Ignore logout errors
    } finally {
      await SecureStore.deleteItemAsync('user_data');
      await SecureStore.deleteItemAsync('session_token');
    }
  },

  // Get current user from secure storage
  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await SecureStore.getItemAsync('user_data');
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  // Check if user is logged in
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync('session_token');
      return !!token;
    } catch (error) {
      return false;
    }
  },

  // Get session info from server
  async getSession(): Promise<User | null> {
    try {
      const response = await api.get<AuthResponse>('/store/auth');
      if (response.data.customer) {
        await SecureStore.setItemAsync('user_data', JSON.stringify(response.data.customer));
        return response.data.customer;
      }
      return null;
    } catch (error) {
      return null;
    }
  },
};

export default authService;
