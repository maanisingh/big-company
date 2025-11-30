// User & Auth Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
}

export interface AuthResponse {
  customer: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Wallet Types
export interface WalletBalance {
  balance: number;
  currency: string;
  food_loan_credit: number;
  total_available: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  reference?: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  metadata?: Record<string, any>;
}

export interface TransactionHistory {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

// NFC Card Types
export interface NFCCard {
  id: string;
  uid: string;
  card_number: string;
  status: 'active' | 'blocked' | 'inactive';
  is_primary: boolean;
  linked_at: string;
  last_used?: string;
  nickname?: string;
}

export interface NFCCardList {
  cards: NFCCard[];
  total: number;
}

// Top-up Types
export interface TopUpOption {
  amount: number;
  label: string;
  bonus?: number;
}

export interface TopUpRequest {
  amount: number;
  provider: 'mtn_momo' | 'airtel_money';
  phone_number: string;
}

export interface TopUpResponse {
  success: boolean;
  message: string;
  transaction_id?: string;
  reference?: string;
}

// Payment Types
export interface PaymentMethod {
  id: string;
  type: 'mtn_momo' | 'airtel_money' | 'nfc_card' | 'wallet';
  label: string;
  icon: string;
  available: boolean;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Wallet: undefined;
  TopUp: undefined;
  Cards: undefined;
  LinkCard: undefined;
  ScanNFC: undefined;
  Transactions: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  WalletTab: undefined;
  CardsTab: undefined;
  ProfileTab: undefined;
};
