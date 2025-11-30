export type UserRole = 'consumer' | 'retailer' | 'wholesaler';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  shop_name?: string;      // For retailers
  company_name?: string;   // For wholesalers
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user?: User;
  message?: string;
}
