import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  TeamOutlined,
  DollarOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  ShopOutlined,
  HomeOutlined,
  ScanOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// Menu items per role
const menuItems: Record<UserRole, { key: string; icon: React.ReactNode; label: string; path: string }[]> = {
  consumer: [
    { key: 'shop', icon: <ShoppingCartOutlined />, label: 'Shop', path: '/consumer/shop' },
    { key: 'orders', icon: <InboxOutlined />, label: 'My Orders', path: '/consumer/orders' },
    { key: 'wallet', icon: <CreditCardOutlined />, label: 'Wallet & Cards', path: '/consumer/wallet' },
    { key: 'profile', icon: <UserOutlined />, label: 'Profile', path: '/consumer/profile' },
  ],
  retailer: [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/retailer/dashboard' },
    { key: 'pos', icon: <ScanOutlined />, label: 'POS', path: '/retailer/pos' },
    { key: 'inventory', icon: <InboxOutlined />, label: 'Inventory', path: '/retailer/inventory' },
    { key: 'orders', icon: <ShoppingCartOutlined />, label: 'Orders', path: '/retailer/orders' },
    { key: 'wallet', icon: <DollarOutlined />, label: 'Wallet & Credit', path: '/retailer/wallet' },
    { key: 'nfc-cards', icon: <CreditCardOutlined />, label: 'NFC Cards', path: '/retailer/nfc-cards' },
    { key: 'analytics', icon: <BarChartOutlined />, label: 'Analytics', path: '/retailer/analytics' },
  ],
  wholesaler: [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/wholesaler/dashboard' },
    { key: 'inventory', icon: <InboxOutlined />, label: 'Inventory', path: '/wholesaler/inventory' },
    { key: 'orders', icon: <ShoppingCartOutlined />, label: 'Retailer Orders', path: '/wholesaler/orders' },
    { key: 'retailers', icon: <TeamOutlined />, label: 'My Retailers', path: '/wholesaler/retailers' },
    { key: 'credit', icon: <DollarOutlined />, label: 'Credit Approvals', path: '/wholesaler/credit' },
    { key: 'analytics', icon: <BarChartOutlined />, label: 'Analytics', path: '/wholesaler/analytics' },
  ],
};

// Theme colors per role
const themeColors: Record<UserRole, string> = {
  consumer: '#52c41a',
  retailer: '#1890ff',
  wholesaler: '#722ed1',
};

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);

  if (!user) return null;

  const currentMenuItems = menuItems[user.role];
  const themeColor = themeColors[user.role];

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate(`/${user.role}/profile`),
    },
    {
      key: 'divider',
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout,
    },
  ];

  // Find active menu key based on current path
  const activeKey = currentMenuItems?.find((item) =>
    location.pathname.startsWith(item.path)
  )?.key || currentMenuItems?.[0]?.key || 'dashboard';

  // Ensure menu items exist
  if (!currentMenuItems || currentMenuItems.length === 0) {
    console.error('No menu items found for role:', user.role);
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {collapsed ? (
            <ShopOutlined style={{ fontSize: 24, color: themeColor }} />
          ) : (
            <Space>
              <ShopOutlined style={{ fontSize: 24, color: themeColor }} />
              <Text strong style={{ color: themeColor }}>
                BIG Company
              </Text>
            </Space>
          )}
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          style={{ borderRight: 0, marginTop: 8 }}
          items={currentMenuItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => handleMenuClick(item.path),
          }))}
        />
      </Sider>

      <Layout>
        {/* Header */}
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <Space>
            <Button
              type="text"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
            >
              Home
            </Button>
          </Space>

          {/* User dropdown */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                style={{ backgroundColor: themeColor }}
                icon={<UserOutlined />}
              />
              <div style={{ maxWidth: 150, overflow: 'hidden' }}>
                <Text strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name || user.email}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              </div>
            </Space>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            minHeight: 'calc(100vh - 64px - 48px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
