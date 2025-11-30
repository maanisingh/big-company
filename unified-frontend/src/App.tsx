import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';

// Context
import { AuthProvider } from './contexts/AuthContext';

// Components
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { ShopPage } from './pages/consumer/ShopPage';
import { RetailerDashboard } from './pages/retailer/RetailerDashboard';
import { WholesalerDashboard } from './pages/wholesaler/WholesalerDashboard';

// Placeholder pages (to be implemented)
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ textAlign: 'center', padding: 48 }}>
    <h2>{title}</h2>
    <p>This page is under construction</p>
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

            {/* Consumer Routes */}
            <Route
              path="/consumer"
              element={
                <ProtectedRoute allowedRoles={['consumer']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/consumer/shop" replace />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="orders" element={<PlaceholderPage title="My Orders" />} />
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
              <Route path="inventory" element={<PlaceholderPage title="Inventory Management" />} />
              <Route path="orders" element={<PlaceholderPage title="Orders" />} />
              <Route path="wallet" element={<PlaceholderPage title="Wallet" />} />
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
              <Route path="inventory" element={<PlaceholderPage title="Inventory Management" />} />
              <Route path="orders" element={<PlaceholderPage title="Retailer Orders" />} />
              <Route path="retailers" element={<PlaceholderPage title="My Retailers" />} />
              <Route path="credit" element={<PlaceholderPage title="Credit Approvals" />} />
              <Route path="analytics" element={<PlaceholderPage title="Analytics" />} />
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
