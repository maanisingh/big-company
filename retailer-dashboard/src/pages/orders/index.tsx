import {
  List,
  useTable,
  ShowButton,
  DateField,
  TagField,
  NumberField,
} from '@refinedev/antd';
import { Table, Space, Card, Typography, Descriptions, Button, Tag, Steps, List as AntdList } from 'antd';
import { useShow } from '@refinedev/core';
import { useParams } from 'react-router-dom';

const { Title } = Typography;

// Mock data for orders
const mockOrders = [
  {
    id: '1',
    order_number: 'ORD-2024-001',
    customer_name: 'John Doe',
    customer_phone: '+250788123456',
    total: 45000,
    status: 'pending',
    payment_type: 'wallet',
    items: 5,
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    order_number: 'ORD-2024-002',
    customer_name: 'Jane Smith',
    customer_phone: '+250788654321',
    total: 23500,
    status: 'processing',
    payment_type: 'mobile_money',
    items: 3,
    created_at: '2024-01-15T11:15:00Z',
  },
  {
    id: '3',
    order_number: 'ORD-2024-003',
    customer_name: 'Mike Johnson',
    customer_phone: '+250788999888',
    total: 67800,
    status: 'completed',
    payment_type: 'card',
    items: 8,
    created_at: '2024-01-15T09:45:00Z',
  },
];

export const OrderList = () => {
  const columns = [
    {
      title: 'Order #',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => (
        <NumberField
          value={value}
          options={{ style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }}
        />
      ),
    },
    {
      title: 'Payment',
      dataIndex: 'payment_type',
      key: 'payment_type',
      render: (value: string) => {
        const colors: Record<string, string> = {
          wallet: 'green',
          mobile_money: 'blue',
          card: 'purple',
          credit: 'orange',
        };
        return <Tag color={colors[value] || 'default'}>{value.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => {
        const colors: Record<string, string> = {
          pending: 'orange',
          processing: 'blue',
          completed: 'green',
          cancelled: 'red',
        };
        return <Tag color={colors[value] || 'default'}>{value.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => <DateField value={value} format="DD/MM/YYYY HH:mm" />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <ShowButton hideText size="small" recordItemId={record.id} />
          {record.status === 'pending' && (
            <>
              <Button type="primary" size="small">Accept</Button>
              <Button danger size="small">Reject</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <List>
      <Table dataSource={mockOrders} columns={columns} rowKey="id" />
    </List>
  );
};

export const OrderShow = () => {
  const { id } = useParams();
  const order = mockOrders.find((o) => o.id === id) || mockOrders[0];

  const orderItems = [
    { id: '1', name: 'Rice (5kg)', quantity: 2, price: 12000, total: 24000 },
    { id: '2', name: 'Cooking Oil (1L)', quantity: 3, price: 5000, total: 15000 },
    { id: '3', name: 'Sugar (1kg)', quantity: 1, price: 6000, total: 6000 },
  ];

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'processing': return 1;
      case 'completed': return 2;
      default: return 0;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>Order #{order.order_number}</Title>

      <Steps
        current={getStatusStep(order.status)}
        style={{ marginBottom: '24px' }}
        items={[
          { title: 'Pending' },
          { title: 'Processing' },
          { title: 'Completed' },
        ]}
      />

      <Card title="Order Details" style={{ marginBottom: '16px' }}>
        <Descriptions column={2}>
          <Descriptions.Item label="Order Number">{order.order_number}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={order.status === 'completed' ? 'green' : 'blue'}>
              {order.status.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Customer">{order.customer_name}</Descriptions.Item>
          <Descriptions.Item label="Phone">{order.customer_phone}</Descriptions.Item>
          <Descriptions.Item label="Payment Type">
            {order.payment_type.replace('_', ' ').toUpperCase()}
          </Descriptions.Item>
          <Descriptions.Item label="Date">
            <DateField value={order.created_at} format="DD/MM/YYYY HH:mm" />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Order Items" style={{ marginBottom: '16px' }}>
        <Table
          dataSource={orderItems}
          pagination={false}
          rowKey="id"
          columns={[
            { title: 'Product', dataIndex: 'name', key: 'name' },
            { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
            {
              title: 'Unit Price',
              dataIndex: 'price',
              key: 'price',
              render: (value: number) => `${value.toLocaleString()} RWF`,
            },
            {
              title: 'Total',
              dataIndex: 'total',
              key: 'total',
              render: (value: number) => `${value.toLocaleString()} RWF`,
            },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <strong>Total</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong>{order.total.toLocaleString()} RWF</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Space>
        {order.status === 'pending' && (
          <>
            <Button type="primary" size="large">Accept Order</Button>
            <Button danger size="large">Reject Order</Button>
          </>
        )}
        {order.status === 'processing' && (
          <Button type="primary" size="large">Mark as Ready</Button>
        )}
        <Button size="large">Print Receipt</Button>
      </Space>
    </div>
  );
};

export default OrderList;
