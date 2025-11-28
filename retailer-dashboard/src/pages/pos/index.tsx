import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  List,
  Typography,
  Tag,
  Divider,
  Modal,
  Input,
  Radio,
  message,
  Space,
  Badge,
  Spin,
  Alert,
  Statistic,
  Empty,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  WalletOutlined,
  MobileOutlined,
  SearchOutlined,
  BarcodeOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
  DollarOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import { posApi, inventoryApi } from '../../lib/api';

const { Title, Text } = Typography;

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost_price: number;
  category: string;
  stock: number;
  barcode?: string;
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface DailySalesStats {
  total_sales: number;
  transaction_count: number;
  nfc_transactions: number;
  cash_transactions: number;
  wallet_transactions: number;
  credit_transactions: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  wallet_balance: number;
  credit_limit: number;
  credit_used: number;
}

export const POSPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet' | 'nfc' | 'credit'>('cash');
  const [processing, setProcessing] = useState(false);

  // NFC payment state
  const [nfcCardUid, setNfcCardUid] = useState('');
  const [nfcPin, setNfcPin] = useState('');
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);

  // Customer state (for wallet/credit payments)
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  // Daily stats
  const [dailyStats, setDailyStats] = useState<DailySalesStats | null>(null);

  // Receipt modal
  const [receiptModal, setReceiptModal] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  // Discount
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');

  const barcodeInputRef = useRef<any>(null);

  // Load products and daily stats
  useEffect(() => {
    loadProducts();
    loadDailyStats();

    // Refresh stats every minute
    const interval = setInterval(loadDailyStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getProducts({ limit: 100 });
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyStats = async () => {
    try {
      const stats = await posApi.getDailySales();
      setDailyStats(stats);
    } catch (error) {
      console.error('Failed to load daily stats:', error);
    }
  };

  // Search products
  const handleSearch = async (query: string) => {
    setSearchTerm(query);
    if (!query.trim()) {
      loadProducts();
      return;
    }

    setSearchLoading(true);
    try {
      const data = await posApi.searchProducts(query);
      setProducts(data.products || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Barcode scanning
  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;

    try {
      const result = await posApi.scanBarcode(barcode);
      if (result.product) {
        addToCart(result.product);
        message.success(`Added: ${result.product.name}`);
      } else {
        message.warning('Product not found for this barcode');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Barcode scan failed');
    }

    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      message.warning('Product out of stock');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          message.warning(`Only ${product.stock} units available`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = item.quantity + delta;
          if (newQty > item.stock) {
            message.warning(`Only ${item.stock} units available`);
            return item;
          }
          return { ...item, quantity: Math.max(0, newQty) };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const setItemQuantity = (id: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          if (quantity > item.stock) {
            message.warning(`Only ${item.stock} units available`);
            return { ...item, quantity: item.stock };
          }
          return { ...item, quantity: Math.max(0, quantity) };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = discountType === 'percent'
    ? (subtotal * discount / 100)
    : discount;
  const total = Math.max(0, subtotal - discountAmount);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Validate customer for wallet/credit payments
  const validateCustomer = async () => {
    if (!customerPhone.trim()) {
      message.error('Please enter customer phone number');
      return;
    }

    // Format phone number
    let phone = customerPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '250' + phone.slice(1);
    if (!phone.startsWith('250')) phone = '250' + phone;

    setCustomerLoading(true);
    try {
      const result = await posApi.validateCustomer(phone);
      if (result.customer) {
        setCustomer(result.customer);
        message.success(`Customer: ${result.customer.name}`);
      } else {
        message.warning('Customer not found');
        setCustomer(null);
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Customer validation failed');
      setCustomer(null);
    } finally {
      setCustomerLoading(false);
    }
  };

  // NFC card scanning simulation (in real app, this would interface with NFC hardware)
  const startNfcScan = () => {
    setNfcScanning(true);
    setNfcError(null);

    // Simulate NFC card detection (in production, this would use Web NFC API or hardware SDK)
    // For demo, we'll wait for manual input or simulate a detected card
    message.info('Waiting for NFC card... Tap your BIG Shop Card');
  };

  // Process NFC payment
  const processNfcPayment = async () => {
    if (!nfcCardUid.trim()) {
      setNfcError('Please scan or enter card UID');
      return;
    }
    if (!nfcPin || nfcPin.length !== 4) {
      setNfcError('Please enter 4-digit PIN');
      return;
    }

    setProcessing(true);
    setNfcError(null);

    try {
      const result = await posApi.processNFCPayment(nfcCardUid, total, nfcPin);

      if (result.success) {
        // Create sale record
        await completeSale('nfc', result.transaction_id);
      } else {
        setNfcError(result.error || 'Payment failed');
      }
    } catch (error: any) {
      setNfcError(error.response?.data?.error || 'NFC payment failed');
    } finally {
      setProcessing(false);
    }
  };

  // Complete the sale
  const completeSale = async (method: string, transactionId?: string) => {
    setProcessing(true);

    try {
      const saleData = {
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        payment_method: method as 'cash' | 'wallet' | 'nfc' | 'credit',
        customer_phone: customer?.phone || customerPhone || undefined,
        discount: discountAmount > 0 ? discountAmount : undefined,
        notes: transactionId ? `Transaction: ${transactionId}` : undefined,
      };

      const result = await posApi.createSale(saleData);

      if (result.success) {
        message.success('Sale completed successfully!');
        setLastSale({
          ...result,
          items: cart,
          subtotal,
          discount: discountAmount,
          total,
          method,
        });

        // Reset state
        setPaymentModal(false);
        setCart([]);
        setDiscount(0);
        setCustomer(null);
        setCustomerPhone('');
        setNfcCardUid('');
        setNfcPin('');

        // Show receipt
        setReceiptModal(true);

        // Refresh stats and products
        loadDailyStats();
        loadProducts();
      } else {
        throw new Error(result.error || 'Sale failed');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || error.message || 'Sale failed');
    } finally {
      setProcessing(false);
    }
  };

  // Handle payment based on method
  const handlePayment = async () => {
    if (cart.length === 0) {
      message.error('Cart is empty');
      return;
    }

    switch (paymentMethod) {
      case 'cash':
        await completeSale('cash');
        break;

      case 'wallet':
        if (!customer) {
          message.error('Please validate customer first');
          return;
        }
        if (customer.wallet_balance < total) {
          message.error('Insufficient wallet balance');
          return;
        }
        await completeSale('wallet');
        break;

      case 'nfc':
        await processNfcPayment();
        break;

      case 'credit':
        if (!customer) {
          message.error('Please validate customer first');
          return;
        }
        const availableCredit = customer.credit_limit - customer.credit_used;
        if (availableCredit < total) {
          message.error(`Insufficient credit. Available: ${availableCredit.toLocaleString()} RWF`);
          return;
        }
        await completeSale('credit');
        break;
    }
  };

  // Print receipt
  const printReceipt = () => {
    window.print();
  };

  // Filtered products
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: 'calc(100vh - 64px)' }}>
      {/* Daily Stats Banner */}
      {dailyStats && (
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Today's Sales"
                value={dailyStats.total_sales}
                suffix="RWF"
                valueStyle={{ color: '#3f8600', fontSize: '18px' }}
                formatter={(value) => value?.toLocaleString()}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="Transactions"
                value={dailyStats.transaction_count}
                valueStyle={{ fontSize: '18px' }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="NFC"
                value={dailyStats.nfc_transactions}
                prefix={<CreditCardOutlined />}
                valueStyle={{ fontSize: '18px' }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="Cash"
                value={dailyStats.cash_transactions}
                prefix={<DollarOutlined />}
                valueStyle={{ fontSize: '18px' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Wallet/Credit"
                value={dailyStats.wallet_transactions + dailyStats.credit_transactions}
                prefix={<WalletOutlined />}
                valueStyle={{ fontSize: '18px' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={16} style={{ height: 'calc(100% - 100px)' }}>
        {/* Products Grid */}
        <Col xs={24} lg={16} style={{ height: '100%', overflow: 'auto' }}>
          <Card
            title="Products"
            extra={
              <Space>
                <Input
                  placeholder="Scan barcode"
                  prefix={<BarcodeOutlined />}
                  value={barcodeInput}
                  ref={barcodeInputRef}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onPressEnter={() => handleBarcodeScan(barcodeInput)}
                  style={{ width: 180 }}
                />
                <Input.Search
                  placeholder="Search products..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  loading={searchLoading}
                  style={{ width: 200 }}
                  allowClear
                />
              </Space>
            }
          >
            {filteredProducts.length === 0 ? (
              <Empty description="No products found" />
            ) : (
              <Row gutter={[12, 12]}>
                {filteredProducts.map((product) => (
                  <Col xs={12} sm={8} md={6} key={product.id}>
                    <Card
                      hoverable
                      onClick={() => addToCart(product)}
                      size="small"
                      style={{
                        textAlign: 'center',
                        opacity: product.stock === 0 ? 0.5 : 1,
                        cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Badge
                        count={product.stock <= 10 ? `${product.stock} left` : 0}
                        style={{ backgroundColor: product.stock <= 5 ? '#f5222d' : '#faad14' }}
                      >
                        <div style={{ padding: '8px 0' }}>
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              style={{ width: 60, height: 60, objectFit: 'cover', marginBottom: 8 }}
                            />
                          ) : (
                            <div style={{ width: 60, height: 60, background: '#f0f0f0', margin: '0 auto 8px', borderRadius: 8 }} />
                          )}
                          <Text strong style={{ display: 'block', fontSize: '13px' }}>{product.name}</Text>
                          <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                            {product.sku}
                          </Text>
                          <Text strong style={{ color: '#0ea5e9', fontSize: '16px' }}>
                            {product.price.toLocaleString()} RWF
                          </Text>
                          {product.stock === 0 && (
                            <Tag color="red" style={{ marginTop: 4 }}>OUT OF STOCK</Tag>
                          )}
                        </div>
                      </Badge>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>

        {/* Cart */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <span>Cart</span>
                {itemCount > 0 && <Tag color="blue">{itemCount} items</Tag>}
              </Space>
            }
            extra={
              cart.length > 0 && (
                <Button type="text" danger size="small" onClick={clearCart}>
                  Clear
                </Button>
              )
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                <BarcodeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <Text type="secondary" style={{ display: 'block' }}>
                  Scan barcode or click products to add
                </Text>
              </div>
            ) : (
              <>
                <List
                  dataSource={cart}
                  style={{ flex: 1, overflow: 'auto' }}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeItem(item.id)}
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Text style={{ fontSize: '13px' }}>{item.name}</Text>
                        }
                        description={
                          <Space>
                            <Button
                              size="small"
                              icon={<MinusOutlined />}
                              onClick={() => updateQuantity(item.id, -1)}
                            />
                            <InputNumber
                              size="small"
                              min={1}
                              max={item.stock}
                              value={item.quantity}
                              onChange={(val) => setItemQuantity(item.id, val || 1)}
                              style={{ width: 50 }}
                            />
                            <Button
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => updateQuantity(item.id, 1)}
                              disabled={item.quantity >= item.stock}
                            />
                          </Space>
                        }
                      />
                      <Text strong style={{ fontSize: '13px' }}>
                        {(item.price * item.quantity).toLocaleString()} RWF
                      </Text>
                    </List.Item>
                  )}
                />

                <Divider style={{ margin: '12px 0' }} />

                <div style={{ marginTop: 'auto' }}>
                  {/* Discount */}
                  <Row gutter={8} style={{ marginBottom: 12 }}>
                    <Col span={16}>
                      <InputNumber
                        placeholder="Discount"
                        value={discount}
                        onChange={(val) => setDiscount(val || 0)}
                        style={{ width: '100%' }}
                        min={0}
                        max={discountType === 'percent' ? 100 : subtotal}
                      />
                    </Col>
                    <Col span={8}>
                      <Radio.Group
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        size="small"
                      >
                        <Radio.Button value="fixed">RWF</Radio.Button>
                        <Radio.Button value="percent">%</Radio.Button>
                      </Radio.Group>
                    </Col>
                  </Row>

                  <Row justify="space-between" style={{ marginBottom: 8 }}>
                    <Text>Subtotal:</Text>
                    <Text>{subtotal.toLocaleString()} RWF</Text>
                  </Row>
                  {discountAmount > 0 && (
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Text type="success">Discount:</Text>
                      <Text type="success">-{discountAmount.toLocaleString()} RWF</Text>
                    </Row>
                  )}
                  <Row justify="space-between" style={{ marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0 }}>Total:</Title>
                    <Title level={4} style={{ margin: 0, color: '#0ea5e9' }}>
                      {total.toLocaleString()} RWF
                    </Title>
                  </Row>

                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={() => setPaymentModal(true)}
                    disabled={cart.length === 0}
                  >
                    Checkout ({itemCount} items)
                  </Button>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Payment Modal */}
      <Modal
        title="Payment"
        open={paymentModal}
        onCancel={() => {
          setPaymentModal(false);
          setNfcError(null);
        }}
        footer={null}
        width={450}
      >
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ textAlign: 'center', color: '#0ea5e9', margin: 0 }}>
            {total.toLocaleString()} RWF
          </Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
            {itemCount} items
          </Text>
        </div>

        <Radio.Group
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setNfcError(null);
            setCustomer(null);
          }}
          style={{ width: '100%', marginBottom: 24 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio.Button value="cash" style={{ width: '100%', height: 50, display: 'flex', alignItems: 'center' }}>
              <Space>
                <DollarOutlined />
                Cash Payment
              </Space>
            </Radio.Button>
            <Radio.Button value="nfc" style={{ width: '100%', height: 50, display: 'flex', alignItems: 'center' }}>
              <Space>
                <CreditCardOutlined />
                BIG Shop Card (NFC)
              </Space>
            </Radio.Button>
            <Radio.Button value="wallet" style={{ width: '100%', height: 50, display: 'flex', alignItems: 'center' }}>
              <Space>
                <WalletOutlined />
                Customer Wallet
              </Space>
            </Radio.Button>
            <Radio.Button value="credit" style={{ width: '100%', height: 50, display: 'flex', alignItems: 'center' }}>
              <Space>
                <MobileOutlined />
                Credit (Buy Now Pay Later)
              </Space>
            </Radio.Button>
          </Space>
        </Radio.Group>

        {/* NFC Card Payment */}
        {paymentMethod === 'nfc' && (
          <div style={{ marginBottom: 24 }}>
            <Alert
              message="Tap BIG Shop Card on reader"
              description="Or manually enter card details below"
              type="info"
              showIcon
              icon={<ScanOutlined />}
              style={{ marginBottom: 16 }}
            />

            <Input
              placeholder="Card UID (from NFC reader)"
              value={nfcCardUid}
              onChange={(e) => setNfcCardUid(e.target.value.toUpperCase())}
              style={{ marginBottom: 12 }}
              prefix={<CreditCardOutlined />}
              disabled={nfcScanning}
              suffix={
                nfcScanning ? <LoadingOutlined /> : null
              }
            />
            <Input.Password
              placeholder="4-digit PIN"
              value={nfcPin}
              onChange={(e) => setNfcPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              style={{ marginBottom: 12 }}
            />

            {nfcError && (
              <Alert
                message={nfcError}
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
          </div>
        )}

        {/* Wallet/Credit Payment - Need Customer */}
        {(paymentMethod === 'wallet' || paymentMethod === 'credit') && (
          <div style={{ marginBottom: 24 }}>
            <Input.Search
              placeholder="Customer phone (07XXXXXXXX)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              onSearch={validateCustomer}
              loading={customerLoading}
              enterButton="Verify"
              style={{ marginBottom: 12 }}
            />

            {customer && (
              <Card size="small" style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong>{customer.name}</Text>
                    <br />
                    <Text type="secondary">{customer.phone}</Text>
                  </Col>
                  <Col>
                    {paymentMethod === 'wallet' ? (
                      <Statistic
                        title="Wallet"
                        value={customer.wallet_balance}
                        suffix="RWF"
                        valueStyle={{
                          fontSize: '16px',
                          color: customer.wallet_balance >= total ? '#3f8600' : '#cf1322'
                        }}
                      />
                    ) : (
                      <Statistic
                        title="Available Credit"
                        value={customer.credit_limit - customer.credit_used}
                        suffix="RWF"
                        valueStyle={{
                          fontSize: '16px',
                          color: (customer.credit_limit - customer.credit_used) >= total ? '#3f8600' : '#cf1322'
                        }}
                      />
                    )}
                  </Col>
                </Row>
              </Card>
            )}
          </div>
        )}

        <Button
          type="primary"
          size="large"
          block
          loading={processing}
          onClick={handlePayment}
          disabled={
            (paymentMethod === 'nfc' && (!nfcCardUid || nfcPin.length !== 4)) ||
            ((paymentMethod === 'wallet' || paymentMethod === 'credit') && !customer)
          }
        >
          {processing ? 'Processing...' : `Pay ${total.toLocaleString()} RWF`}
        </Button>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            Sale Completed
          </Space>
        }
        open={receiptModal}
        onCancel={() => setReceiptModal(false)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={printReceipt}>
            Print Receipt
          </Button>,
          <Button key="new" type="primary" onClick={() => setReceiptModal(false)}>
            New Sale
          </Button>,
        ]}
        width={400}
      >
        {lastSale && (
          <div className="receipt" style={{ fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>BIG Company</Title>
              <Text type="secondary">Sales Receipt</Text>
            </div>

            <Divider dashed style={{ margin: '12px 0' }} />

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">Receipt #:</Text>{' '}
              <Text strong>{lastSale.receipt_number || lastSale.order_id?.slice(0, 8)}</Text>
              <br />
              <Text type="secondary">Date:</Text>{' '}
              <Text>{new Date().toLocaleString('en-RW')}</Text>
              <br />
              <Text type="secondary">Payment:</Text>{' '}
              <Tag>{lastSale.method?.toUpperCase()}</Tag>
            </div>

            <Divider dashed style={{ margin: '12px 0' }} />

            {lastSale.items?.map((item: CartItem, index: number) => (
              <Row key={index} justify="space-between" style={{ marginBottom: 4 }}>
                <Col span={14}>
                  <Text>{item.name}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {item.quantity} x {item.price.toLocaleString()}
                  </Text>
                </Col>
                <Col span={10} style={{ textAlign: 'right' }}>
                  <Text>{(item.price * item.quantity).toLocaleString()}</Text>
                </Col>
              </Row>
            ))}

            <Divider dashed style={{ margin: '12px 0' }} />

            <Row justify="space-between">
              <Text>Subtotal:</Text>
              <Text>{lastSale.subtotal?.toLocaleString()} RWF</Text>
            </Row>
            {lastSale.discount > 0 && (
              <Row justify="space-between">
                <Text>Discount:</Text>
                <Text>-{lastSale.discount?.toLocaleString()} RWF</Text>
              </Row>
            )}
            <Row justify="space-between" style={{ marginTop: 8 }}>
              <Title level={4} style={{ margin: 0 }}>Total:</Title>
              <Title level={4} style={{ margin: 0 }}>{lastSale.total?.toLocaleString()} RWF</Title>
            </Row>

            <Divider dashed style={{ margin: '12px 0' }} />

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Thank you for shopping!</Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default POSPage;
