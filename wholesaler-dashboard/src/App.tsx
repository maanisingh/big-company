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
import { RetailerOrderList, RetailerOrderShow } from './pages/orders';
import { InventoryList, InventoryCreate, InventoryEdit } from './pages/inventory';
import { RetailersList, RetailerShow } from './pages/retailers';
import { CreditApprovalList, CreditApprovalShow } from './pages/credit';
import { LoginPage } from './pages/auth/Login';

// Components
import { Authenticated } from './components/Authenticated';

// Icons
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  TeamOutlined,
  DollarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';

const API_URL = import.meta.env.VITE_MEDUSA_BACKEND_URL || 'http://localhost:9000';

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#7c3aed', // Purple for wholesaler
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
                  name: 'retailer-orders',
                  list: '/orders',
                  show: '/orders/show/:id',
                  meta: {
                    label: 'Retailer Orders',
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
                  name: 'retailers',
                  list: '/retailers',
                  show: '/retailers/show/:id',
                  meta: {
                    label: 'My Retailers',
                    icon: <TeamOutlined />,
                  },
                },
                {
                  name: 'credit-approvals',
                  list: '/credit-approvals',
                  show: '/credit-approvals/show/:id',
                  meta: {
                    label: 'Credit Approvals',
                    icon: <DollarOutlined />,
                  },
                },
                {
                  name: 'analytics',
                  list: '/analytics',
                  meta: {
                    label: 'Analytics',
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

                {/* Protected Routes */}
                <Route
                  element={
                    <Authenticated>
                      <ThemedLayoutV2
                        Title={({ collapsed }) => (
                          <ThemedTitleV2
                            collapsed={collapsed}
                            text="BIG Wholesaler"
                            icon={<TeamOutlined style={{ color: '#7c3aed' }} />}
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
                  <Route path="/orders">
                    <Route index element={<RetailerOrderList />} />
                    <Route path="show/:id" element={<RetailerOrderShow />} />
                  </Route>
                  <Route path="/inventory">
                    <Route index element={<InventoryList />} />
                    <Route path="create" element={<InventoryCreate />} />
                    <Route path="edit/:id" element={<InventoryEdit />} />
                  </Route>
                  <Route path="/retailers">
                    <Route index element={<RetailersList />} />
                    <Route path="show/:id" element={<RetailerShow />} />
                  </Route>
                  <Route path="/credit-approvals">
                    <Route index element={<CreditApprovalList />} />
                    <Route path="show/:id" element={<CreditApprovalShow />} />
                  </Route>
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
