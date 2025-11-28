import {
  List,
  Create,
  Edit,
  useForm,
  useTable,
  EditButton,
  DeleteButton,
  NumberField,
} from '@refinedev/antd';
import { Table, Space, Form, Input, InputNumber, Select, Card, Tag, Progress, Typography } from 'antd';

const { Title } = Typography;

// Mock inventory data
const mockInventory = [
  {
    id: '1',
    sku: 'RICE-5KG',
    name: 'Rice (5kg)',
    category: 'Grains',
    quantity: 45,
    reorder_level: 20,
    unit_cost: 8000,
    selling_price: 12000,
    status: 'in_stock',
  },
  {
    id: '2',
    sku: 'OIL-1L',
    name: 'Cooking Oil (1L)',
    category: 'Cooking Essentials',
    quantity: 8,
    reorder_level: 15,
    unit_cost: 3500,
    selling_price: 5000,
    status: 'low_stock',
  },
  {
    id: '3',
    sku: 'SUGAR-1KG',
    name: 'Sugar (1kg)',
    category: 'Cooking Essentials',
    quantity: 5,
    reorder_level: 25,
    unit_cost: 4000,
    selling_price: 6000,
    status: 'critical',
  },
  {
    id: '4',
    sku: 'FLOUR-2KG',
    name: 'Wheat Flour (2kg)',
    category: 'Grains',
    quantity: 30,
    reorder_level: 15,
    unit_cost: 5500,
    selling_price: 8000,
    status: 'in_stock',
  },
  {
    id: '5',
    sku: 'BEANS-1KG',
    name: 'Beans (1kg)',
    category: 'Grains',
    quantity: 60,
    reorder_level: 20,
    unit_cost: 2500,
    selling_price: 4000,
    status: 'in_stock',
  },
];

const categories = [
  'Grains',
  'Cooking Essentials',
  'Beverages',
  'Snacks',
  'Dairy',
  'Meat & Fish',
  'Fruits & Vegetables',
];

export const InventoryList = () => {
  const getStockStatus = (quantity: number, reorderLevel: number) => {
    const percentage = (quantity / reorderLevel) * 100;
    if (percentage <= 25) return { color: 'red', text: 'Critical', status: 'exception' };
    if (percentage <= 75) return { color: 'orange', text: 'Low Stock', status: 'normal' };
    return { color: 'green', text: 'In Stock', status: 'success' };
  };

  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (value: string) => <code>{value}</code>,
    },
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: 'Stock Level',
      key: 'stock_level',
      render: (_: any, record: any) => {
        const status = getStockStatus(record.quantity, record.reorder_level);
        return (
          <div style={{ width: 150 }}>
            <Progress
              percent={Math.min((record.quantity / record.reorder_level) * 100, 100)}
              size="small"
              status={status.status as any}
              format={() => `${record.quantity} units`}
            />
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => {
        const status = getStockStatus(record.quantity, record.reorder_level);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unit_cost',
      key: 'unit_cost',
      render: (value: number) => `${value.toLocaleString()} RWF`,
    },
    {
      title: 'Selling Price',
      dataIndex: 'selling_price',
      key: 'selling_price',
      render: (value: number) => `${value.toLocaleString()} RWF`,
    },
    {
      title: 'Margin',
      key: 'margin',
      render: (_: any, record: any) => {
        const margin = ((record.selling_price - record.unit_cost) / record.unit_cost) * 100;
        return <span style={{ color: 'green' }}>{margin.toFixed(1)}%</span>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <EditButton hideText size="small" recordItemId={record.id} />
          <DeleteButton hideText size="small" recordItemId={record.id} />
        </Space>
      ),
    },
  ];

  return (
    <List>
      <Table dataSource={mockInventory} columns={columns} rowKey="id" />
    </List>
  );
};

export const InventoryCreate = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="SKU"
          name="sku"
          rules={[{ required: true, message: 'Please enter SKU' }]}
        >
          <Input placeholder="e.g., RICE-5KG" />
        </Form.Item>

        <Form.Item
          label="Product Name"
          name="name"
          rules={[{ required: true, message: 'Please enter product name' }]}
        >
          <Input placeholder="e.g., Rice (5kg)" />
        </Form.Item>

        <Form.Item
          label="Category"
          name="category"
          rules={[{ required: true, message: 'Please select category' }]}
        >
          <Select placeholder="Select category">
            {categories.map((cat) => (
              <Select.Option key={cat} value={cat}>{cat}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Initial Quantity"
          name="quantity"
          rules={[{ required: true, message: 'Please enter quantity' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Reorder Level"
          name="reorder_level"
          rules={[{ required: true, message: 'Please enter reorder level' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Unit Cost (RWF)"
          name="unit_cost"
          rules={[{ required: true, message: 'Please enter unit cost' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Selling Price (RWF)"
          name="selling_price"
          rules={[{ required: true, message: 'Please enter selling price' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Create>
  );
};

export const InventoryEdit = () => {
  const { formProps, saveButtonProps, queryResult } = useForm();
  const record = mockInventory[0]; // Mock data

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={record}
      >
        <Form.Item label="SKU" name="sku">
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="Product Name"
          name="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Category" name="category" rules={[{ required: true }]}>
          <Select>
            {categories.map((cat) => (
              <Select.Option key={cat} value={cat}>{cat}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Quantity" name="quantity" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Reorder Level" name="reorder_level" rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Unit Cost (RWF)" name="unit_cost" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Selling Price (RWF)" name="selling_price" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Edit>
  );
};

export default InventoryList;
