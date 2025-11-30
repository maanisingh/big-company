import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Space,
  Card,
  Typography,
  Button,
  Tag,
  Progress,
  Row,
  Col,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Statistic,
  Descriptions,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  WarningOutlined,
  AppstoreOutlined,
  DollarOutlined,
  InboxOutlined,
  BarcodeOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { retailerApi } from '../../services/apiService';

const { Title, Text } = Typography;

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  low_stock_threshold: number;
  cost_price: number;
  selling_price: number;
  barcode?: string;
  image?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface InventoryStats {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  categories: number;
}

const categories = [
  'Grains & Cereals',
  'Cooking Essentials',
  'Beverages',
  'Snacks',
  'Dairy & Eggs',
  'Meat & Fish',
  'Fruits & Vegetables',
  'Household Items',
  'Personal Care',
  'Baby Products',
];

export const InventoryPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<InventoryStats | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Stock adjustment modal
  const [stockModal, setStockModal] = useState<{
    visible: boolean;
    product: Product | null;
    type: 'add' | 'remove' | 'set';
  }>({ visible: false, product: null, type: 'add' });
  const [stockQuantity, setStockQuantity] = useState(0);
  const [stockReason, setStockReason] = useState('');
  const [stockLoading, setStockLoading] = useState(false);

  // Price update modal
  const [priceModal, setPriceModal] = useState<{
    visible: boolean;
    product: Product | null;
  }>({ visible: false, product: null });
  const [newSellingPrice, setNewSellingPrice] = useState(0);
  const [newCostPrice, setNewCostPrice] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);

  // Create product modal
  const [createModal, setCreateModal] = useState(false);
  const [createForm] = Form.useForm();
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, showLowStock, pagination.current]);

  const loadProducts = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await retailerApi.getProducts({
        category: categoryFilter || undefined,
        low_stock: showLowStock || undefined,
        search: searchTerm || undefined,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      });

      const data = response.data;
      setProducts(data.products || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));

      // Calculate stats
      const allProducts = data.products || [];
      const totalValue = allProducts.reduce(
        (sum: number, p: Product) => sum + p.stock * p.cost_price,
        0
      );
      const uniqueCategories = new Set(allProducts.map((p: Product) => p.category));

      setStats({
        total_products: data.total || allProducts.length,
        total_value: totalValue,
        low_stock_count: allProducts.filter(
          (p: Product) => p.stock > 0 && p.stock <= p.low_stock_threshold
        ).length,
        out_of_stock_count: allProducts.filter((p: Product) => p.stock === 0).length,
        categories: uniqueCategories.size,
      });
    } catch (error) {
      console.error('Failed to load inventory:', error);
      message.error('Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStockUpdate = async () => {
    if (!stockModal.product) return;

    setStockLoading(true);
    try {
      await retailerApi.updateStock(
        stockModal.product.id,
        stockQuantity,
        stockModal.type,
        stockReason
      );

      message.success('Stock updated successfully');
      setStockModal({ visible: false, product: null, type: 'add' });
      setStockQuantity(0);
      setStockReason('');
      loadProducts();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to update stock');
    } finally {
      setStockLoading(false);
    }
  };

  const handlePriceUpdate = async () => {
    if (!priceModal.product) return;

    setPriceLoading(true);
    try {
      await retailerApi.updatePrice(priceModal.product.id, newSellingPrice, newCostPrice);

      message.success('Prices updated successfully');
      setPriceModal({ visible: false, product: null });
      loadProducts();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to update prices');
    } finally {
      setPriceLoading(false);
    }
  };

  const handleCreateProduct = async (values: any) => {
    setCreateLoading(true);
    try {
      await retailerApi.createProduct(values);

      message.success('Product created successfully');
      setCreateModal(false);
      createForm.resetFields();
      loadProducts();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to create product');
    } finally {
      setCreateLoading(false);
    }
  };

  const getStockStatus = (stock: number, threshold: number) => {
    if (stock === 0) return { color: 'red', text: 'Out of Stock', status: 'exception' as const };
    if (stock <= threshold) return { color: 'orange', text: 'Low Stock', status: 'normal' as const };
    return { color: 'green', text: 'In Stock', status: 'success' as const };
  };

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_: any, record: Product) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {record.image ? (
            <img
              src={record.image}
              alt={record.name}
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                background: '#f0f0f0',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <InboxOutlined style={{ color: '#999' }} />
            </div>
          )}
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              SKU: {record.sku}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (value: string) => <Tag>{value}</Tag>,
      filters: categories.map((c) => ({ text: c, value: c })),
    },
    {
      title: 'Stock',
      key: 'stock',
      render: (_: any, record: Product) => {
        const status = getStockStatus(record.stock, record.low_stock_threshold);
        const percentage = Math.min((record.stock / (record.low_stock_threshold * 2)) * 100, 100);
        return (
          <div style={{ width: 150 }}>
            <Progress
              percent={percentage}
              size="small"
              status={status.status}
              format={() => `${record.stock} units`}
            />
          </div>
        );
      },
      sorter: (a: Product, b: Product) => a.stock - b.stock,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Product) => {
        const status = getStockStatus(record.stock, record.low_stock_threshold);
        return (
          <Badge
            status={status.status === 'exception' ? 'error' : status.status === 'normal' ? 'warning' : 'success'}
            text={<Tag color={status.color}>{status.text}</Tag>}
          />
        );
      },
      filters: [
        { text: 'In Stock', value: 'in_stock' },
        { text: 'Low Stock', value: 'low_stock' },
        { text: 'Out of Stock', value: 'out_of_stock' },
      ],
    },
    {
      title: 'Cost Price',
      dataIndex: 'cost_price',
      key: 'cost_price',
      render: (value: number) => `${value?.toLocaleString()} RWF`,
      sorter: (a: Product, b: Product) => a.cost_price - b.cost_price,
    },
    {
      title: 'Selling Price',
      dataIndex: 'selling_price',
      key: 'selling_price',
      render: (value: number) => (
        <Text strong style={{ color: '#0ea5e9' }}>{value?.toLocaleString()} RWF</Text>
      ),
      sorter: (a: Product, b: Product) => a.selling_price - b.selling_price,
    },
    {
      title: 'Margin',
      key: 'margin',
      render: (_: any, record: Product) => {
        const margin = record.cost_price > 0
          ? ((record.selling_price - record.cost_price) / record.cost_price) * 100
          : 0;
        return (
          <Text style={{ color: margin >= 20 ? '#52c41a' : margin >= 10 ? '#faad14' : '#ff4d4f' }}>
            {margin.toFixed(1)}%
          </Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Space>
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={() => {
              setStockModal({ visible: true, product: record, type: 'add' });
              setStockQuantity(0);
            }}
            title="Add Stock"
          />
          <Button
            type="text"
            icon={<MinusOutlined />}
            onClick={() => {
              setStockModal({ visible: true, product: record, type: 'remove' });
              setStockQuantity(0);
            }}
            title="Remove Stock"
          />
          <Button
            type="text"
            icon={<DollarOutlined />}
            onClick={() => {
              setPriceModal({ visible: true, product: record });
              setNewSellingPrice(record.selling_price);
              setNewCostPrice(record.cost_price);
            }}
            title="Update Price"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/retailer/inventory/${record.id}/edit`)}
            title="Edit"
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Inventory</Title>
        <Space>
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => loadProducts(true)}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModal(true)}
          >
            Add Product
          </Button>
        </Space>
      </Row>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={5}>
            <Card size="small">
              <Statistic
                title="Total Products"
                value={stats.total_products}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Card size="small">
              <Statistic
                title="Inventory Value"
                value={stats.total_value}
                suffix="RWF"
                valueStyle={{ fontSize: '18px' }}
                prefix={<DollarOutlined />}
                formatter={(value) => value?.toLocaleString()}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Card size="small">
              <Statistic
                title="Low Stock"
                value={stats.low_stock_count}
                valueStyle={{ color: '#faad14' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Card size="small">
              <Statistic
                title="Out of Stock"
                value={stats.out_of_stock_count}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card size="small">
              <Statistic
                title="Categories"
                value={stats.categories}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input.Search
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={() => loadProducts()}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="">All Categories</Select.Option>
              {categories.map((cat) => (
                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type={showLowStock ? 'primary' : 'default'}
              danger={showLowStock}
              icon={<WarningOutlined />}
              onClick={() => setShowLowStock(!showLowStock)}
            >
              Low Stock Only
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Products Table */}
      <Card>
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} products`,
            onChange: (page, pageSize) => setPagination({ ...pagination, current: page, pageSize }),
          }}
          scroll={{ x: 'max-content' }}
          rowClassName={(record) =>
            record.stock === 0
              ? 'ant-table-row-out-of-stock'
              : record.stock <= record.low_stock_threshold
              ? 'ant-table-row-low-stock'
              : ''
          }
        />
      </Card>

      {/* Stock Adjustment Modal */}
      <Modal
        title={`${stockModal.type === 'add' ? 'Add' : stockModal.type === 'remove' ? 'Remove' : 'Set'} Stock`}
        open={stockModal.visible}
        onCancel={() => {
          setStockModal({ visible: false, product: null, type: 'add' });
          setStockQuantity(0);
          setStockReason('');
        }}
        onOk={handleStockUpdate}
        confirmLoading={stockLoading}
      >
        {stockModal.product && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Product">{stockModal.product.name}</Descriptions.Item>
              <Descriptions.Item label="Current Stock">
                <Tag color={stockModal.product.stock > 0 ? 'blue' : 'red'}>
                  {stockModal.product.stock} units
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Form layout="vertical">
              <Form.Item label="Quantity" required>
                <InputNumber
                  value={stockQuantity}
                  onChange={(val) => setStockQuantity(val || 0)}
                  min={0}
                  max={stockModal.type === 'remove' ? stockModal.product.stock : 99999}
                  style={{ width: '100%' }}
                  placeholder="Enter quantity"
                />
              </Form.Item>
              <Form.Item label="Reason">
                <Input.TextArea
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  placeholder="e.g., New shipment, Damaged goods, Inventory count..."
                  rows={2}
                />
              </Form.Item>

              {stockQuantity > 0 && (
                <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                  <Text>
                    New Stock:{' '}
                    <Text strong>
                      {stockModal.type === 'add'
                        ? stockModal.product.stock + stockQuantity
                        : stockModal.type === 'remove'
                        ? stockModal.product.stock - stockQuantity
                        : stockQuantity}{' '}
                      units
                    </Text>
                  </Text>
                </div>
              )}
            </Form>
          </>
        )}
      </Modal>

      {/* Price Update Modal */}
      <Modal
        title="Update Prices"
        open={priceModal.visible}
        onCancel={() => setPriceModal({ visible: false, product: null })}
        onOk={handlePriceUpdate}
        confirmLoading={priceLoading}
      >
        {priceModal.product && (
          <Form layout="vertical">
            <div style={{ marginBottom: 16 }}>
              <Text strong>{priceModal.product.name}</Text>
            </div>

            <Form.Item label="Cost Price (RWF)">
              <InputNumber
                value={newCostPrice}
                onChange={(val) => setNewCostPrice(val || 0)}
                min={0}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => parseInt(value?.replace(/\$\s?|(,*)/g, '') || '0')}
              />
            </Form.Item>
            <Form.Item label="Selling Price (RWF)">
              <InputNumber
                value={newSellingPrice}
                onChange={(val) => setNewSellingPrice(val || 0)}
                min={0}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => parseInt(value?.replace(/\$\s?|(,*)/g, '') || '0')}
              />
            </Form.Item>

            {newCostPrice > 0 && newSellingPrice > 0 && (
              <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                <Row justify="space-between">
                  <Text>Profit Margin:</Text>
                  <Text
                    strong
                    style={{
                      color: ((newSellingPrice - newCostPrice) / newCostPrice) * 100 >= 15
                        ? '#52c41a'
                        : '#faad14',
                    }}
                  >
                    {(((newSellingPrice - newCostPrice) / newCostPrice) * 100).toFixed(1)}%
                  </Text>
                </Row>
                <Row justify="space-between">
                  <Text>Profit per unit:</Text>
                  <Text strong>{(newSellingPrice - newCostPrice).toLocaleString()} RWF</Text>
                </Row>
              </div>
            )}
          </Form>
        )}
      </Modal>

      {/* Create Product Modal */}
      <Modal
        title="Add New Product"
        open={createModal}
        onCancel={() => {
          setCreateModal(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={createLoading}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateProduct}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Product Name"
                rules={[{ required: true, message: 'Please enter product name' }]}
              >
                <Input placeholder="e.g., Rice (5kg)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU"
                rules={[{ required: true, message: 'Please enter SKU' }]}
              >
                <Input placeholder="e.g., RICE-5KG" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  {categories.map((cat) => (
                    <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="barcode"
                label="Barcode"
              >
                <Input placeholder="Optional barcode" prefix={<BarcodeOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="cost_price"
                label="Cost Price (RWF)"
                rules={[{ required: true, message: 'Please enter cost price' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="selling_price"
                label="Selling Price (RWF)"
                rules={[{ required: true, message: 'Please enter selling price' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="stock"
                label="Initial Stock"
                rules={[{ required: true, message: 'Please enter initial stock' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="low_stock_threshold"
            label="Low Stock Threshold"
            rules={[{ required: true, message: 'Please enter low stock threshold' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Alert when stock falls below this" />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .ant-table-row-out-of-stock {
          background-color: #fff1f0;
        }
        .ant-table-row-out-of-stock:hover > td {
          background-color: #ffccc7 !important;
        }
        .ant-table-row-low-stock {
          background-color: #fff7e6;
        }
        .ant-table-row-low-stock:hover > td {
          background-color: #fff1b8 !important;
        }
      `}</style>
    </div>
  );
};

export default InventoryPage;
