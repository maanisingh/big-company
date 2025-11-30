import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthState, LoginCredentials } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials, role: UserRole) => Promise<void>;
  logout: () => void;
  setUserFromToken: (token: string, role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'bigcompany_token';
const USER_KEY = 'bigcompany_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Load auth state from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (credentials: LoginCredentials, role: UserRole) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await authService.login(credentials, role);

      // Decode user info from token or use response
      const user: User = {
        id: response.user?.id || 'unknown',
        email: credentials.email,
        role,
        name: response.user?.name,
        shop_name: response.user?.shop_name,
        company_name: response.user?.company_name,
      };

      localStorage.setItem(TOKEN_KEY, response.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      setState({
        user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const setUserFromToken = (token: string, role: UserRole) => {
    // Parse JWT to get user info
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const user: User = {
        id: payload.id || 'unknown',
        email: payload.email || 'unknown',
        role,
        name: payload.name,
        shop_name: payload.shop_name,
        company_name: payload.company_name,
      };

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      console.error('Failed to parse token');
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setUserFromToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
