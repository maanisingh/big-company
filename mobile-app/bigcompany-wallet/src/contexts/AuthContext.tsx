import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services';
import { User, LoginCredentials } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithCard: (cardId: string, pin: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        // Try to get user from local storage first
        const localUser = await authService.getCurrentUser();
        if (localUser) {
          setUser(localUser);
        }
        // Then validate with server
        const serverUser = await authService.getSession();
        if (serverUser) {
          setUser(serverUser);
        } else {
          // Session invalid, clear local data
          await authService.logout();
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const userData = await authService.login(credentials);
    setUser(userData);
  };

  const loginWithCard = async (cardId: string, pin: string) => {
    const userData = await authService.loginWithCard(cardId, pin);
    setUser(userData);
  };

  const register = async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) => {
    const userData = await authService.register(data);
    setUser(userData);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const userData = await authService.getSession();
    if (userData) {
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithCard,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
