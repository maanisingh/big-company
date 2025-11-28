import { List, ShowButton, DateField, NumberField } from '@refinedev/antd';
import { Table, Space, Card, Typography, Descriptions, Button, Tag, Timeline } from 'antd';
import { useParams } from 'react-router-dom';

const { Title } = Typography;

// Mock credit orders data
const mockCreditOrders = [
  {
    id: '1',
    order_number: 'CR-2024-001',
    customer_name: 'John Doe',
    customer_phone: '+250788123456',
    credit_amount: 25000,
    status: 'pending_approval',
    due_date: '2024-02-15',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    order_number: 'CR-2024-002',
    customer_name: 'Jane Smith',
    customer_phone: '+250788654321',
    credit_amount: 15000,
    status: 'approved',
    due_date: '2024-02-10',
    created_at: '2024-01-10T14:20:00Z',
    approved_at: '2024-01-11T09:00:00Z',
  },
  {
    id: '3',
    order_number: 'CR-2024-003',
    customer_name: 'Mike Johnson',
    customer_phone: '+250788999888',
    credit_amount: 50000,
    status: 'paid',
    due_date: '2024-01-30',
    created_at: '2024-01-05T11:15:00Z',
    approved_at: '2024-01-05T15:00:00Z',
    paid_at: '2024-01-28T10:00:00Z',
  },
];

export const CreditOrderList = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return 'orange';
      case 'approved':
        return 'blue';
      case 'paid':
        return 'green';
      case 'overdue':
        return 'red';
      case 'rejected':
        return 'default';
      default:
        return 'default';
    }
  };

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
      title: 'Phone',
      dataIndex: 'customer_phone',
      key: 'customer_phone',
    },
    {
      title: 'Credit Amount',
      dataIndex: 'credit_amount',
      key: 'credit_amount',
      render: (value: number) => (
        <NumberField
          value={value}
          options={{ style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }}
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <Tag color={getStatusColor(value)}>
          {value.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (value: string) => <DateField value={value} format="DD/MM/YYYY" />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <ShowButton hideText size="small" recordItemId={record.id} />
          {record.status === 'pending_approval' && (
            <>
              <Button type="primary" size="small">
                Approve
              </Button>
              <Button danger size="small">
                Reject
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <List>
      <Table dataSource={mockCreditOrders} columns={columns} rowKey="id" />
    </List>
  );
};

export const CreditOrderShow = () => {
  const { id } = useParams();
  const order = mockCreditOrders.find((o) => o.id === id) || mockCreditOrders[0];

  const orderItems = [
    { id: '1', name: 'Rice (5kg)', quantity: 2, price: 12000, total: 24000 },
    { id: '2', name: 'Sugar (1kg)', quantity: 1, price: 6000, total: 6000 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return 'orange';
      case 'approved':
        return 'blue';
      case 'paid':
        return 'green';
      case 'overdue':
        return 'red';
      default:
        return 'default';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>Credit Order #{order.order_number}</Title>

      <Card title="Order Details" style={{ marginBottom: '16px' }}>
        <Descriptions column={2}>
          <Descriptions.Item label="Order Number">{order.order_number}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={getStatusColor(order.status)}>
              {order.status.replace('_', ' ').toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Customer">{order.customer_name}</Descriptions.Item>
          <Descriptions.Item label="Phone">{order.customer_phone}</Descriptions.Item>
          <Descriptions.Item label="Credit Amount">
            <strong style={{ color: '#0ea5e9' }}>
              {order.credit_amount.toLocaleString()} RWF
            </strong>
          </Descriptions.Item>
          <Descriptions.Item label="Due Date">
            <DateField value={order.due_date} format="DD MMMM YYYY" />
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
                <strong>Total Credit</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong>{order.credit_amount.toLocaleString()} RWF</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Card title="Timeline" style={{ marginBottom: '16px' }}>
        <Timeline
          items={[
            {
              color: 'blue',
              children: (
                <>
                  <strong>Order Created</strong>
                  <br />
                  <DateField value={order.created_at} format="DD/MM/YYYY HH:mm" />
                </>
              ),
            },
            ...(order.approved_at
              ? [
                  {
                    color: 'green',
                    children: (
                      <>
                        <strong>Approved</strong>
                        <br />
                        <DateField value={order.approved_at} format="DD/MM/YYYY HH:mm" />
                      </>
                    ),
                  },
                ]
              : []),
            ...(order.paid_at
              ? [
                  {
                    color: 'green',
                    children: (
                      <>
                        <strong>Paid</strong>
                        <br />
                        <DateField value={order.paid_at} format="DD/MM/YYYY HH:mm" />
                      </>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Space>
        {order.status === 'pending_approval' && (
          <>
            <Button type="primary" size="large">
              Approve Credit Order
            </Button>
            <Button danger size="large">
              Reject
            </Button>
          </>
        )}
        {order.status === 'approved' && (
          <Button type="primary" size="large">
            Mark as Paid
          </Button>
        )}
        <Button size="large">Send Reminder</Button>
      </Space>
    </div>
  );
};

export default CreditOrderList;
