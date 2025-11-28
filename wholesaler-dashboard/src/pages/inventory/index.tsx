import { useEffect, useState } from 'react';
import {
  List,
  Create,
  Edit,
  EditButton,
  DeleteButton,
} from '@refinedev/antd';
import {
  Table,
  Space,
  Form,
  Input,
  InputNumber,
  Select,
  Card,
  Tag,
  Progress,
  Typography,
  Button,
  Modal,
  message,
  Spin,
  Alert,
  Row,
  Col,
  Statistic,
  Tabs,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReloadOutlined,
  PlusOutlined,
  WarningOutlined,
  AppstoreOutlined,
  DollarOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { inventoryApi } from '../../lib/api';

const { Title, Text } = Typography;

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  low_stock_threshold: number;
  cost_price: number;
  wholesale_price: number;
  unit: string;
  barcode?: string;
  image?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface InventoryStats {
  total_products: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  categories_count: number;
}

export const InventoryList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProducts = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [productsData, statsData, categoriesData] = await Promise.all([
        inventoryApi.getProducts({
          category: categoryFilter || undefined,
          low_stock: lowStockFilter || undefined,
          search: searchQuery || undefined,
          limit: pagination.pageSize,
          offset: (pagination.current - 1) * pagination.pageSize,
        }),
        inventoryApi.getInventoryStats(),
        inventoryApi.getCategories(),
      ]);

      setProducts(productsData.products || []);
      setPagination(prev => ({ ...prev, total: productsData.total || 0 }));
      setStats(statsData);
      setCategories(categoriesData.categories || []);
    } catch (err: any) {
      console.error('Inventory error:', err);
      setError(err.response?.data?.error || 'Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, lowStockFilter, searchQuery, pagination.current, pagination.pageSize]);

  const getStockStatus = (stock: number, threshold: number) => {
    if (stock === 0) return { color: 'red', text: 'Out of Stock', status: 'exception' as const };
    const percentage = (stock / threshold) * 100;
    if (percentage <= 50) return { color: 'red', text: 'Critical', status: 'exception' as const };
    if (percentage <= 100) return { color: 'orange', text: 'Low Stock', status: 'normal' as const };
    return { color: 'green', text: 'In Stock', status: 'success' as const };
  };

  const handleCreateProduct = async () => {
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await inventoryApi.createProduct(values);
      message.success('Product created successfully');
      setCreateModalOpen(false);
      form.resetFields();
      fetchProducts(true);
    } catch (err: any) {
      if (err.errorFields) return; // Form validation error
      message.error(err.response?.data?.error || 'Failed to create product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await inventoryApi.updateProduct(selectedProduct.id, values);
      message.success('Product updated successfully');
      setEditModalOpen(false);
      setSelectedProduct(null);
      form.resetFields();
      fetchProducts(true);
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || 'Failed to update product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await inventoryApi.updateStock(
        selectedProduct.id,
        values.quantity,
        values.type,
        values.reason
      );
      message.success('Stock updated successfully');
      setStockModalOpen(false);
      setSelectedProduct(null);
      form.resetFields();
      fetchProducts(true);
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || 'Failed to update stock');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!selectedProduct) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await inventoryApi.updatePrice(
        selectedProduct.id,
        values.wholesale_price,
        values.cost_price
      );
      message.success('Price updated successfully');
      setPriceModalOpen(false);
      setSelectedProduct(null);
      form.resetFields();
      fetchProducts(true);
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.response?.data?.error || 'Failed to update price');
    } finally {
      setActionLoading(false);
    }
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
      render: (_: any, record: Product) => {
        const status = getStockStatus(record.stock, record.low_stock_threshold);
        return (
          <div style={{ width: 150 }}>
            <Progress
              percent={Math.min((record.stock / record.low_stock_threshold) * 100, 100)}
              size="small"
              status={status.status}
              format={() => `${record.stock} ${record.unit}`}
            />
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Product) => {
        const status = getStockStatus(record.stock, record.low_stock_threshold);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: 'Cost',
      dataIndex: 'cost_price',
      key: 'cost_price',
      render: (value: number) => `${value.toLocaleString()} RWF`,
    },
    {
      title: 'Wholesale',
      dataIndex: 'wholesale_price',
      key: 'wholesale_price',
      render: (value: number) => (
        <Text strong style={{ color: '#7c3aed' }}>
          {value.toLocaleString()} RWF
        </Text>
      ),
    },
    {
      title: 'Margin',
      key: 'margin',
      render: (_: any, record: Product) => {
        const margin = ((record.wholesale_price - record.cost_price) / record.cost_price) * 100;
        return <span style={{ color: margin > 0 ? '#22c55e' : '#ef4444' }}>{margin.toFixed(1)}%</span>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedProduct(record);
              form.setFieldsValue(record);
              setEditModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="small"
            type="primary"
            ghost
            onClick={() => {
              setSelectedProduct(record);
              form.resetFields();
              setStockModalOpen(true);
            }}
          >
            Stock
          </Button>
          <Button
            size="small"
            onClick={() => {
              setSelectedProduct(record);
              form.setFieldsValue({
                wholesale_price: record.wholesale_price,
                cost_price: record.cost_price,
              });
              setPriceModalOpen(true);
            }}
          >
            Price
          </Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0 }}>Inventory Management</Title>
        <Space>
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => fetchProducts(true)}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setCreateModalOpen(true);
            }}
          >
            Add Product
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Products"
              value={stats?.total_products || 0}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Stock Value"
              value={stats?.total_stock_value || 0}
              suffix="RWF"
              prefix={<DollarOutlined />}
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Low Stock"
              value={stats?.low_stock_count || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: (stats?.low_stock_count || 0) > 0 ? '#f97316' : '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Out of Stock"
              value={stats?.out_of_stock_count || 0}
              prefix={<InboxOutlined />}
              valueStyle={{ color: (stats?.out_of_stock_count || 0) > 0 ? '#ef4444' : '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Input.Search
            placeholder="Search products..."
            allowClear
            style={{ width: 200 }}
            onSearch={(value) => {
              setSearchQuery(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            placeholder="Filter by Category"
            allowClear
            style={{ width: 180 }}
            value={categoryFilter || undefined}
            onChange={(value) => {
              setCategoryFilter(value || '');
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
          >
            {categories.map(cat => (
              <Select.Option key={cat} value={cat}>{cat}</Select.Option>
            ))}
          </Select>
          <Button
            type={lowStockFilter ? 'primary' : 'default'}
            icon={<WarningOutlined />}
            onClick={() => {
              setLowStockFilter(!lowStockFilter);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
          >
            Low Stock Only
          </Button>
        </Space>
      </Card>

      {/* Products Table */}
      <Card>
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} products`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }));
            },
          }}
        />
      </Card>

      {/* Create Product Modal */}
      <Modal
        title="Add New Product"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={handleCreateProduct}
        confirmLoading={actionLoading}
        okText="Create Product"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU"
                rules={[{ required: true, message: 'SKU is required' }]}
              >
                <Input placeholder="e.g., RICE-5KG" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Product Name"
                rules={[{ required: true, message: 'Name is required' }]}
              >
                <Input placeholder="e.g., Rice (5kg)" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Category is required' }]}
              >
                <Select placeholder="Select category">
                  {categories.map(cat => (
                    <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true, message: 'Unit is required' }]}
              >
                <Select placeholder="Select unit">
                  <Select.Option value="units">Units</Select.Option>
                  <Select.Option value="kg">Kilograms</Select.Option>
                  <Select.Option value="liters">Liters</Select.Option>
                  <Select.Option value="packs">Packs</Select.Option>
                  <Select.Option value="boxes">Boxes</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cost_price"
                label="Cost Price (RWF)"
                rules={[{ required: true, message: 'Cost price is required' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="wholesale_price"
                label="Wholesale Price (RWF)"
                rules={[{ required: true, message: 'Wholesale price is required' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="stock"
                label="Initial Stock"
                rules={[{ required: true, message: 'Stock is required' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="low_stock_threshold"
                label="Low Stock Threshold"
                rules={[{ required: true, message: 'Threshold is required' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="barcode" label="Barcode (Optional)">
            <Input placeholder="Product barcode" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        title={`Edit Product: ${selectedProduct?.name}`}
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setSelectedProduct(null);
          form.resetFields();
        }}
        onOk={handleUpdateProduct}
        confirmLoading={actionLoading}
        okText="Save Changes"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select>
                  {categories.map(cat => (
                    <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="low_stock_threshold" label="Low Stock Threshold" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="units">Units</Select.Option>
                  <Select.Option value="kg">Kilograms</Select.Option>
                  <Select.Option value="liters">Liters</Select.Option>
                  <Select.Option value="packs">Packs</Select.Option>
                  <Select.Option value="boxes">Boxes</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Update Stock Modal */}
      <Modal
        title={`Update Stock: ${selectedProduct?.name}`}
        open={stockModalOpen}
        onCancel={() => {
          setStockModalOpen(false);
          setSelectedProduct(null);
          form.resetFields();
        }}
        onOk={handleUpdateStock}
        confirmLoading={actionLoading}
        okText="Update Stock"
      >
        {selectedProduct && (
          <div style={{ marginBottom: '16px' }}>
            <Text>Current Stock: <strong>{selectedProduct.stock} {selectedProduct.unit}</strong></Text>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="type"
            label="Action Type"
            rules={[{ required: true, message: 'Select action type' }]}
          >
            <Select placeholder="Select action">
              <Select.Option value="add">Add Stock</Select.Option>
              <Select.Option value="remove">Remove Stock</Select.Option>
              <Select.Option value="set">Set Exact Quantity</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true, message: 'Enter quantity' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={2} placeholder="Optional reason for stock adjustment" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Update Price Modal */}
      <Modal
        title={`Update Price: ${selectedProduct?.name}`}
        open={priceModalOpen}
        onCancel={() => {
          setPriceModalOpen(false);
          setSelectedProduct(null);
          form.resetFields();
        }}
        onOk={handleUpdatePrice}
        confirmLoading={actionLoading}
        okText="Update Price"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="cost_price"
            label="Cost Price (RWF)"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="wholesale_price"
            label="Wholesale Price (RWF)"
            rules={[{ required: true, message: 'Wholesale price is required' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export const InventoryCreate = () => {
  return <InventoryList />;
};

export const InventoryEdit = () => {
  return <InventoryList />;
};

export default InventoryList;
