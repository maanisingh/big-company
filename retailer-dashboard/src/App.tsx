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

// Icons
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  CreditCardOutlined,
  DollarOutlined,
} from '@ant-design/icons';

const API_URL = import.meta.env.VITE_MEDUSA_BACKEND_URL || 'http://localhost:9000';

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#0ea5e9',
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
              ]}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
              }}
            >
              <Routes>
                <Route
                  element={
                    <ThemedLayoutV2
                      Title={({ collapsed }) => (
                        <ThemedTitleV2
                          collapsed={collapsed}
                          text="BIG Retailer"
                        />
                      )}
                      Sider={() => <ThemedSiderV2 />}
                    >
                      <Outlet />
                    </ThemedLayoutV2>
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
