import { Refine } from '@refinedev/core';
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar';
import {
  ErrorComponent,
  ThemedLayoutV2,
  ThemedSiderV2,
  ThemedTitleV2,
  useNotificationProvider,
} from '@refinedev/antd';
import routerBindings, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from '@refinedev/react-router-v6';
import dataProvider from '@refinedev/simple-rest';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';

import '@refinedev/antd/dist/reset.css';

// Pages
import { DashboardPage } from './pages/dashboard';
import { OrderList, OrderShow } from './pages/orders';
import { InventoryList, InventoryCreate, InventoryEdit } from './pages/inventory';
import { POSPage } from './pages/pos';
import { CreditOrderList, CreditOrderShow } from './pages/credit';
import { LoginPage } from './pages/auth/Login';
import { AuthCallback } from './pages/auth/AuthCallback';
import CategoriesPage from './pages/categories';
import ProfitMarginPage from './pages/reports/profit-margin';
import WalletPage from './pages/wallet';

// Components
import { Authenticated } from './components/Authenticated';

// Icons
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  CreditCardOutlined,
  DollarOutlined,
  ShopOutlined,
  TagsOutlined,
  BarChartOutlined,
  WalletOutlined,
} from '@ant-design/icons';

const API_URL = import.meta.env.VITE_MEDUSA_BACKEND_URL || 'http://localhost:9000';

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#16a34a',
            },
          }}
        >
          <AntdApp>
            <Refine
              dataProvider={dataProvider(`${API_URL}/admin`)}
              notificationProvider={useNotificationProvider}
              routerProvider={routerBindings}
              resources={[
                {
                  name: 'dashboard',
                  list: '/',
                  meta: {
                    label: 'Dashboard',
                    icon: <DashboardOutlined />,
                  },
                },
                {
                  name: 'pos',
                  list: '/pos',
                  meta: {
                    label: 'Point of Sale',
                    icon: <CreditCardOutlined />,
                  },
                },
                {
                  name: 'orders',
                  list: '/orders',
                  show: '/orders/show/:id',
                  meta: {
                    label: 'Orders',
                    icon: <ShoppingCartOutlined />,
                  },
                },
                {
                  name: 'inventory',
                  list: '/inventory',
                  create: '/inventory/create',
                  edit: '/inventory/edit/:id',
                  meta: {
                    label: 'Inventory',
                    icon: <AppstoreOutlined />,
                  },
                },
                {
                  name: 'credit-orders',
                  list: '/credit-orders',
                  show: '/credit-orders/show/:id',
                  meta: {
                    label: 'Credit Orders',
                    icon: <DollarOutlined />,
                  },
                },
                {
                  name: 'categories',
                  list: '/categories',
                  meta: {
                    label: 'Categories',
                    icon: <TagsOutlined />,
                  },
                },
                {
                  name: 'wallet',
                  list: '/wallet',
                  meta: {
                    label: 'Wallet',
                    icon: <WalletOutlined />,
                  },
                },
                {
                  name: 'reports',
                  list: '/reports/profit-margin',
                  meta: {
                    label: 'Reports',
                    icon: <BarChartOutlined />,
                  },
                },
              ]}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
              }}
            >
              <Routes>
                {/* Login Route - Outside of authenticated wrapper */}
                <Route path="/login" element={<LoginPage />} />

                {/* Auth Callback - Handles token from marketing site */}
                <Route path="/auth-callback" element={<AuthCallback />} />

                {/* Protected Routes */}
                <Route
                  element={
                    <Authenticated>
                      <ThemedLayoutV2
                        Title={({ collapsed }) => (
                          <ThemedTitleV2
                            collapsed={collapsed}
                            text="BIG Retailer"
                            icon={<ShopOutlined style={{ color: '#16a34a' }} />}
                          />
                        )}
                        Sider={() => <ThemedSiderV2 />}
                      >
                        <Outlet />
                      </ThemedLayoutV2>
                    </Authenticated>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="/pos" element={<POSPage />} />
                  <Route path="/orders">
                    <Route index element={<OrderList />} />
                    <Route path="show/:id" element={<OrderShow />} />
                  </Route>
                  <Route path="/inventory">
                    <Route index element={<InventoryList />} />
                    <Route path="create" element={<InventoryCreate />} />
                    <Route path="edit/:id" element={<InventoryEdit />} />
                  </Route>
                  <Route path="/credit-orders">
                    <Route index element={<CreditOrderList />} />
                    <Route path="show/:id" element={<CreditOrderShow />} />
                  </Route>
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/wallet" element={<WalletPage />} />
                  <Route path="/reports/profit-margin" element={<ProfitMarginPage />} />
                  <Route path="*" element={<ErrorComponent />} />
                </Route>
              </Routes>

              <RefineKbar />
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
          </AntdApp>
        </ConfigProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
