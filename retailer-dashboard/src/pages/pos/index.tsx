import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  InputNumber,
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
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  WalletOutlined,
  MobileOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// Mock products
const products = [
  { id: '1', name: 'Rice (5kg)', price: 12000, category: 'Grains', stock: 45 },
  { id: '2', name: 'Cooking Oil (1L)', price: 5000, category: 'Cooking', stock: 8 },
  { id: '3', name: 'Sugar (1kg)', price: 6000, category: 'Cooking', stock: 5 },
  { id: '4', name: 'Wheat Flour (2kg)', price: 8000, category: 'Grains', stock: 30 },
  { id: '5', name: 'Beans (1kg)', price: 4000, category: 'Grains', stock: 60 },
  { id: '6', name: 'Salt (500g)', price: 1000, category: 'Cooking', stock: 100 },
  { id: '7', name: 'Tomato Paste', price: 2500, category: 'Cooking', stock: 40 },
  { id: '8', name: 'Milk (1L)', price: 3500, category: 'Dairy', stock: 25 },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export const POSPage = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [cardUid, setCardUid] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [processing, setProcessing] = useState(false);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
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
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePayment = async () => {
    if (paymentMethod === 'card' && (!cardUid || !cardPin)) {
      message.error('Please enter card UID and PIN');
      return;
    }

    setProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    message.success('Payment successful!');
    setPaymentModal(false);
    setCart([]);
    setCardUid('');
    setCardPin('');
    setProcessing(false);
  };

  return (
    <div style={{ padding: '16px', height: 'calc(100vh - 64px)' }}>
      <Row gutter={16} style={{ height: '100%' }}>
        {/* Products Grid */}
        <Col xs={24} lg={16} style={{ height: '100%', overflow: 'auto' }}>
          <Card
            title="Products"
            extra={
              <Input
                placeholder="Search products..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 250 }}
              />
            }
          >
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
                    }}
                  >
                    <Badge
                      count={product.stock <= 10 ? `${product.stock} left` : 0}
                      style={{ backgroundColor: product.stock <= 5 ? '#f5222d' : '#faad14' }}
                    >
                      <div style={{ padding: '8px 0' }}>
                        <Text strong>{product.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {product.category}
                        </Text>
                        <br />
                        <Text strong style={{ color: '#0ea5e9', fontSize: '16px' }}>
                          {product.price.toLocaleString()} RWF
                        </Text>
                      </div>
                    </Badge>
                  </Card>
                </Col>
              ))}
            </Row>
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
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <Text type="secondary">No items in cart</Text>
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
                        title={item.name}
                        description={
                          <Space>
                            <Button
                              size="small"
                              icon={<MinusOutlined />}
                              onClick={() => updateQuantity(item.id, -1)}
                            />
                            <span style={{ minWidth: 30, textAlign: 'center' }}>
                              {item.quantity}
                            </span>
                            <Button
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => updateQuantity(item.id, 1)}
                            />
                          </Space>
                        }
                      />
                      <Text strong>
                        {(item.price * item.quantity).toLocaleString()} RWF
                      </Text>
                    </List.Item>
                  )}
                />

                <Divider style={{ margin: '12px 0' }} />

                <div style={{ marginTop: 'auto' }}>
                  <Row justify="space-between" style={{ marginBottom: 16 }}>
                    <Text>Subtotal:</Text>
                    <Text>{total.toLocaleString()} RWF</Text>
                  </Row>
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
                  >
                    Checkout
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
        onCancel={() => setPaymentModal(false)}
        footer={null}
        width={400}
      >
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ textAlign: 'center', color: '#0ea5e9' }}>
            {total.toLocaleString()} RWF
          </Title>
        </div>

        <Radio.Group
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={{ width: '100%', marginBottom: 24 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio.Button value="cash" style={{ width: '100%', height: 50 }}>
              <Space>
                <WalletOutlined />
                Cash
              </Space>
            </Radio.Button>
            <Radio.Button value="card" style={{ width: '100%', height: 50 }}>
              <Space>
                <CreditCardOutlined />
                BIG Shop Card (NFC)
              </Space>
            </Radio.Button>
            <Radio.Button value="mobile_money" style={{ width: '100%', height: 50 }}>
              <Space>
                <MobileOutlined />
                Mobile Money
              </Space>
            </Radio.Button>
          </Space>
        </Radio.Group>

        {paymentMethod === 'card' && (
          <div style={{ marginBottom: 24 }}>
            <Input
              placeholder="Card UID (tap card to read)"
              value={cardUid}
              onChange={(e) => setCardUid(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <Input.Password
              placeholder="4-digit PIN"
              value={cardPin}
              onChange={(e) => setCardPin(e.target.value)}
              maxLength={4}
            />
          </div>
        )}

        <Button
          type="primary"
          size="large"
          block
          loading={processing}
          onClick={handlePayment}
        >
          {processing ? 'Processing...' : 'Complete Payment'}
        </Button>
      </Modal>
    </div>
  );
};

export default POSPage;
