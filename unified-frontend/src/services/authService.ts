import axios from 'axios';
import { LoginCredentials, AuthResponse, UserRole } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'https://bigcompany-api.alexandratechlab.com';

// Role-specific endpoints
const AUTH_ENDPOINTS: Record<UserRole, string> = {
  consumer: `${API_URL}/store/auth`,
  retailer: `${API_URL}/retailer/auth/login`,
  wholesaler: `${API_URL}/wholesaler/auth/login`,
};

export const authService = {
  async login(credentials: LoginCredentials, role: UserRole): Promise<AuthResponse> {
    const endpoint = AUTH_ENDPOINTS[role];

    const response = await axios.post(endpoint, credentials, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  },

  async register(data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    shop_name?: string;
    company_name?: string;
  }): Promise<AuthResponse> {
    const endpoint = data.role === 'consumer'
      ? `${API_URL}/store/customers`
      : data.role === 'retailer'
        ? `${API_URL}/retailer/auth/register`
        : `${API_URL}/wholesaler/auth/register`;

    const response = await axios.post(endpoint, data, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  },
};
