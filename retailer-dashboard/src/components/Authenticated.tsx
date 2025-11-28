import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { authApi } from '../lib/api';

interface AuthenticatedProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Authenticated: React.FC<AuthenticatedProps> = ({ children, fallback }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('retailer_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        // Verify token by calling profile endpoint
        await authApi.getProfile();
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('retailer_token');
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      fallback || (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #22c55e 100%)',
        }}>
          <Spin size="large" />
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default Authenticated;
