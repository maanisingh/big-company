import {
  List,
  ShowButton,
  DateField,
  NumberField,
} from '@refinedev/antd';
import { Table, Space, Card, Typography, Descriptions, Button, Tag, Steps } from 'antd';
import { useParams } from 'react-router-dom';

const { Title } = Typography;

// Mock data for retailer orders (B2B orders from retailers)
const mockRetailerOrders = [
  {
    id: '1',
    order_number: 'WO-2024-001',
    retailer_name: 'Kigali Mini Mart',
    retailer_phone: '+250788123456',
    total: 450000,
    status: 'pending',
    payment_type: 'credit',
    items: 25,
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    order_number: 'WO-2024-002',
    retailer_name: 'Musanze Corner Shop',
    retailer_phone: '+250788654321',
    total: 235000,
    status: 'processing',
    payment_type: 'credit',
    items: 18,
    created_at: '2024-01-15T11:15:00Z',
  },
  {
    id: '3',
    order_number: 'WO-2024-003',
    retailer_name: 'Huye Supermarket',
    retailer_phone: '+250788999888',
    total: 678000,
    status: 'shipped',
    payment_type: 'bank_transfer',
    items: 45,
    created_at: '2024-01-15T09:45:00Z',
  },
  {
    id: '4',
    order_number: 'WO-2024-004',
    retailer_name: 'Rubavu Store',
    retailer_phone: '+250788777666',
    total: 890000,
    status: 'delivered',
    payment_type: 'credit',
    items: 60,
    created_at: '2024-01-14T14:20:00Z',
  },
];

export const RetailerOrderList = () => {
  const columns = [
    {
      title: 'Order #',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: 'Retailer',
      dataIndex: 'retailer_name',
      key: 'retailer_name',
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
          credit: 'orange',
          bank_transfer: 'blue',
          cash: 'green',
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
          shipped: 'cyan',
          delivered: 'green',
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
              <Button type="primary" size="small">Confirm</Button>
              <Button danger size="small">Reject</Button>
            </>
          )}
          {record.status === 'processing' && (
            <Button type="primary" size="small">Ship</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <List title="Retailer Orders">
      <Table dataSource={mockRetailerOrders} columns={columns} rowKey="id" />
    </List>
  );
};

export const RetailerOrderShow = () => {
  const { id } = useParams();
  const order = mockRetailerOrders.find((o) => o.id === id) || mockRetailerOrders[0];

  const orderItems = [
    { id: '1', sku: 'RICE-5KG', name: 'Rice (5kg)', quantity: 50, unit_price: 8000, total: 400000 },
    { id: '2', sku: 'OIL-1L', name: 'Cooking Oil (1L)', quantity: 100, unit_price: 3500, total: 350000 },
    { id: '3', sku: 'SUGAR-1KG', name: 'Sugar (1kg)', quantity: 80, unit_price: 4000, total: 320000 },
  ];

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'processing': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>Retailer Order #{order.order_number}</Title>

      <Steps
        current={getStatusStep(order.status)}
        style={{ marginBottom: '24px' }}
        items={[
          { title: 'Pending' },
          { title: 'Processing' },
          { title: 'Shipped' },
          { title: 'Delivered' },
        ]}
      />

      <Card title="Order Details" style={{ marginBottom: '16px' }}>
        <Descriptions column={2}>
          <Descriptions.Item label="Order Number">{order.order_number}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={order.status === 'delivered' ? 'green' : 'blue'}>
              {order.status.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Retailer">{order.retailer_name}</Descriptions.Item>
          <Descriptions.Item label="Phone">{order.retailer_phone}</Descriptions.Item>
          <Descriptions.Item label="Payment Type">
            <Tag color={order.payment_type === 'credit' ? 'orange' : 'blue'}>
              {order.payment_type.replace('_', ' ').toUpperCase()}
            </Tag>
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
            { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v: string) => <code>{v}</code> },
            { title: 'Product', dataIndex: 'name', key: 'name' },
            { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
            {
              title: 'Unit Price',
              dataIndex: 'unit_price',
              key: 'unit_price',
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
              <Table.Summary.Cell index={0} colSpan={4}>
                <strong>Order Total</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong style={{ color: '#7c3aed' }}>{order.total.toLocaleString()} RWF</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Space>
        {order.status === 'pending' && (
          <>
            <Button type="primary" size="large">Confirm Order</Button>
            <Button danger size="large">Reject Order</Button>
          </>
        )}
        {order.status === 'processing' && (
          <Button type="primary" size="large">Mark as Shipped</Button>
        )}
        {order.status === 'shipped' && (
          <Button type="primary" size="large">Confirm Delivery</Button>
        )}
        <Button size="large">Print Invoice</Button>
        <Button size="large">Contact Retailer</Button>
      </Space>
    </div>
  );
};

export default RetailerOrderList;
