import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';

// Context
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

// Components
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { ShopPage } from './pages/consumer/ShopPage';
import { OrdersPage as ConsumerOrdersPage } from './pages/consumer/OrdersPage';
import ConsumerWalletPage from './pages/consumer/WalletPage';

// Retailer Pages
import { RetailerDashboard } from './pages/retailer/RetailerDashboard';
import { InventoryPage as RetailerInventoryPage } from './pages/retailer/InventoryPage';
import { OrdersPage as RetailerOrdersPage } from './pages/retailer/OrdersPage';
import POSPage from './pages/retailer/POSPage';
import { WalletPage } from './pages/retailer/WalletPage';
import NFCCardsPage from './pages/retailer/NFCCardsPage';

// Wholesaler Pages
import { WholesalerDashboard } from './pages/wholesaler/WholesalerDashboard';
import { InventoryPage as WholesalerInventoryPage } from './pages/wholesaler/InventoryPage';
import WholesalerOrdersPage from './pages/wholesaler/OrdersPage';
import RetailersPage from './pages/wholesaler/RetailersPage';
import WholesalerAnalyticsPage from './pages/wholesaler/AnalyticsPage';

// Placeholder for pages not yet implemented
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ textAlign: 'center', padding: 48 }}>
    <h2>{title}</h2>
    <p>Coming soon</p>
  </div>
);

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Consumer Routes - wrapped with CartProvider */}
            <Route
              path="/consumer"
              element={
                <ProtectedRoute allowedRoles={['consumer']}>
                  <CartProvider>
                    <AppLayout />
                  </CartProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/consumer/shop" replace />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="orders" element={<ConsumerOrdersPage />} />
              <Route path="wallet" element={<ConsumerWalletPage />} />
              <Route path="profile" element={<PlaceholderPage title="Profile" />} />
            </Route>

            {/* Retailer Routes */}
            <Route
              path="/retailer"
              element={
                <ProtectedRoute allowedRoles={['retailer']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/retailer/dashboard" replace />} />
              <Route path="dashboard" element={<RetailerDashboard />} />
              <Route path="inventory" element={<RetailerInventoryPage />} />
              <Route path="orders" element={<RetailerOrdersPage />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="nfc-cards" element={<NFCCardsPage />} />
              <Route path="analytics" element={<PlaceholderPage title="Analytics" />} />
              <Route path="profile" element={<PlaceholderPage title="Profile" />} />
            </Route>

            {/* Wholesaler Routes */}
            <Route
              path="/wholesaler"
              element={
                <ProtectedRoute allowedRoles={['wholesaler']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/wholesaler/dashboard" replace />} />
              <Route path="dashboard" element={<WholesalerDashboard />} />
              <Route path="inventory" element={<WholesalerInventoryPage />} />
              <Route path="orders" element={<WholesalerOrdersPage />} />
              <Route path="retailers" element={<RetailersPage />} />
              <Route path="credit" element={<PlaceholderPage title="Credit Approvals" />} />
              <Route path="analytics" element={<WholesalerAnalyticsPage />} />
              <Route path="profile" element={<PlaceholderPage title="Profile" />} />
            </Route>

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
