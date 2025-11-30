import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';

/**
 * AuthCallback page handles the token passed from the marketing site login
 * It extracts the token from URL, stores it in localStorage, and redirects to dashboard
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Store the token in localStorage
      localStorage.setItem('retailer_token', token);

      // Redirect to dashboard
      navigate('/', { replace: true });
    } else {
      // No token provided, redirect to login
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <Spin size="large" />
      <p style={{ color: '#666' }}>Authenticating...</p>
    </div>
  );
};
