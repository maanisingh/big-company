import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Statistic,
  Badge,
  Avatar,
  Tooltip,
  Tabs,
  Divider,
  message,
  Popconfirm,
  Progress,
  Empty,
  Skeleton,
  Switch,
  InputNumber,
  DatePicker,
  Alert,
} from 'antd';
import {
  ShopOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DesktopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  SettingOutlined,
  ReloadOutlined,
  SearchOutlined,
  BarChartOutlined,
  EyeOutlined,
  SyncOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import dayjs from 'dayjs';
import { retailerApi } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// Interfaces
interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  manager_name: string;
  manager_phone: string;
  status: 'active' | 'inactive' | 'suspended';
  is_main_branch: boolean;
  pos_terminals: number;
  created_at: string;
  today_sales?: number;
  today_transactions?: number;
  total_sales?: number;
}

interface POSTerminal {
  id: string;
  terminal_code: string;
  terminal_name: string;
  branch_id: string;
  status: 'online' | 'offline' | 'maintenance';
  last_sync: string;
  today_transactions: number;
  today_sales: number;
  nfc_enabled: boolean;
  mobile_money_enabled: boolean;
}

interface BranchStats {
  total_branches: number;
  active_branches: number;
  total_terminals: number;
  online_terminals: number;
  today_total_sales: number;
  today_total_transactions: number;
  growth_percentage: number;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 100 },
  },
};

// Mock data
const mockBranches: Branch[] = [
  {
    id: 'br_001',
    branch_code: 'KGL-MAIN',
    branch_name: 'Kigali Main Branch',
    address: 'KN 4 Ave, Kigali',
    city: 'Kigali',
    district: 'Nyarugenge',
    phone: '+250788100001',
    manager_name: 'Jean Baptiste',
    manager_phone: '+250788200001',
    status: 'active',
    is_main_branch: true,
    pos_terminals: 3,
    created_at: '2024-01-15T10:00:00Z',
    today_sales: 450000,
    today_transactions: 45,
    total_sales: 12500000,
  },
  {
    id: 'br_002',
    branch_code: 'KGL-KIM',
    branch_name: 'Kimironko Branch',
    address: 'KG 15 Ave, Kimironko',
    city: 'Kigali',
    district: 'Gasabo',
    phone: '+250788100002',
    manager_name: 'Marie Claire',
    manager_phone: '+250788200002',
    status: 'active',
    is_main_branch: false,
    pos_terminals: 2,
    created_at: '2024-03-20T10:00:00Z',
    today_sales: 280000,
    today_transactions: 32,
    total_sales: 8200000,
  },
  {
    id: 'br_003',
    branch_code: 'HUY-001',
    branch_name: 'Huye Branch',
    address: 'Main Road, Huye',
    city: 'Huye',
    district: 'Huye',
    phone: '+250788100003',
    manager_name: 'Patrick Nshimiye',
    manager_phone: '+250788200003',
    status: 'active',
    is_main_branch: false,
    pos_terminals: 1,
    created_at: '2024-06-01T10:00:00Z',
    today_sales: 125000,
    today_transactions: 18,
    total_sales: 3500000,
  },
  {
    id: 'br_004',
    branch_code: 'MUS-001',
    branch_name: 'Musanze Branch',
    address: 'City Center, Musanze',
    city: 'Musanze',
    district: 'Musanze',
    phone: '+250788100004',
    manager_name: 'Alice Uwimana',
    manager_phone: '+250788200004',
    status: 'inactive',
    is_main_branch: false,
    pos_terminals: 2,
    created_at: '2024-08-15T10:00:00Z',
    today_sales: 0,
    today_transactions: 0,
    total_sales: 1800000,
  },
];

const mockTerminals: POSTerminal[] = [
  {
    id: 'term_001',
    terminal_code: 'POS-KGL-001',
    terminal_name: 'Main Counter 1',
    branch_id: 'br_001',
    status: 'online',
    last_sync: '2024-11-30T14:30:00Z',
    today_transactions: 22,
    today_sales: 220000,
    nfc_enabled: true,
    mobile_money_enabled: true,
  },
  {
    id: 'term_002',
    terminal_code: 'POS-KGL-002',
    terminal_name: 'Main Counter 2',
    branch_id: 'br_001',
    status: 'online',
    last_sync: '2024-11-30T14:28:00Z',
    today_transactions: 18,
    today_sales: 180000,
    nfc_enabled: true,
    mobile_money_enabled: true,
  },
  {
    id: 'term_003',
    terminal_code: 'POS-KGL-003',
    terminal_name: 'Express Lane',
    branch_id: 'br_001',
    status: 'offline',
    last_sync: '2024-11-30T12:00:00Z',
    today_transactions: 5,
    today_sales: 50000,
    nfc_enabled: true,
    mobile_money_enabled: false,
  },
  {
    id: 'term_004',
    terminal_code: 'POS-KIM-001',
    terminal_name: 'Counter 1',
    branch_id: 'br_002',
    status: 'online',
    last_sync: '2024-11-30T14:25:00Z',
    today_transactions: 20,
    today_sales: 180000,
    nfc_enabled: true,
    mobile_money_enabled: true,
  },
  {
    id: 'term_005',
    terminal_code: 'POS-KIM-002',
    terminal_name: 'Counter 2',
    branch_id: 'br_002',
    status: 'online',
    last_sync: '2024-11-30T14:20:00Z',
    today_transactions: 12,
    today_sales: 100000,
    nfc_enabled: false,
    mobile_money_enabled: true,
  },
];

const mockStats: BranchStats = {
  total_branches: 4,
  active_branches: 3,
  total_terminals: 8,
  online_terminals: 6,
  today_total_sales: 855000,
  today_total_transactions: 95,
  growth_percentage: 12.5,
};

// Chart data
const branchSalesData = [
  { name: 'Kigali Main', sales: 450000, target: 500000 },
  { name: 'Kimironko', sales: 280000, target: 300000 },
  { name: 'Huye', sales: 125000, target: 150000 },
  { name: 'Musanze', sales: 0, target: 200000 },
];

const weeklyTrendData = [
  { day: 'Mon', main: 380000, kimironko: 250000, huye: 100000 },
  { day: 'Tue', main: 420000, kimironko: 280000, huye: 120000 },
  { day: 'Wed', main: 390000, kimironko: 260000, huye: 110000 },
  { day: 'Thu', main: 450000, kimironko: 290000, huye: 130000 },
  { day: 'Fri', main: 520000, kimironko: 350000, huye: 150000 },
  { day: 'Sat', main: 580000, kimironko: 400000, huye: 180000 },
  { day: 'Sun', main: 450000, kimironko: 280000, huye: 125000 },
];

const paymentMethodsByBranch = [
  { name: 'NFC Card', value: 35 },
  { name: 'Mobile Money', value: 45 },
  { name: 'Cash', value: 20 },
];

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1'];

const BranchesPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [terminals, setTerminals] = useState<POSTerminal[]>([]);
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [terminalModalVisible, setTerminalModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('branches');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingTerminal, setEditingTerminal] = useState<POSTerminal | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [terminalForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Try to fetch from API
      const [branchesRes, statsRes] = await Promise.all([
        retailerApi.getBranches(),
        retailerApi.getBranchStats(),
      ]);
      setBranches(branchesRes.data.branches || mockBranches);
      setStats(statsRes.data || mockStats);
      setTerminals(mockTerminals); // We'll fetch terminals per branch when needed
    } catch (error) {
      console.error('Error fetching branch data:', error);
      // Use mock data on error
      setBranches(mockBranches);
      setStats(mockStats);
      setTerminals(mockTerminals);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M RWF`;
    }
    return `${amount.toLocaleString()} RWF`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'success',
      inactive: 'default',
      suspended: 'error',
      online: 'success',
      offline: 'error',
      maintenance: 'warning',
    };
    return colors[status] || 'default';
  };

  const filteredBranches = branches.filter(
    (branch) =>
      (branch.branch_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (branch.branch_code || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (branch.city || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const handleAddBranch = () => {
    setEditingBranch(null);
    form.resetFields();
    setBranchModalVisible(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    form.setFieldsValue({
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      address: branch.address,
      city: branch.city,
      district: branch.district,
      phone: branch.phone,
      manager_name: branch.manager_name,
      manager_phone: branch.manager_phone,
      status: branch.status,
      is_main_branch: branch.is_main_branch,
    });
    setBranchModalVisible(true);
  };

  const handleSaveBranch = async () => {
    try {
      const values = await form.validateFields();
      if (editingBranch) {
        // Update existing branch
        await retailerApi.updateBranch(editingBranch.id, values);
        message.success('Branch updated successfully');
      } else {
        // Create new branch
        await retailerApi.createBranch(values);
        message.success('Branch created successfully');
      }
      setBranchModalVisible(false);
      fetchData();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      message.error('Failed to save branch');
      // For demo, still update locally
      if (editingBranch) {
        setBranches(
          branches.map((b) =>
            b.id === editingBranch.id
              ? { ...b, ...form.getFieldsValue() }
              : b
          )
        );
      } else {
        const newBranch: Branch = {
          id: `br_${Date.now()}`,
          ...form.getFieldsValue(),
          pos_terminals: 0,
          created_at: new Date().toISOString(),
          today_sales: 0,
          today_transactions: 0,
          total_sales: 0,
        };
        setBranches([...branches, newBranch]);
      }
      setBranchModalVisible(false);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    try {
      await retailerApi.deleteBranch(branchId);
      message.success('Branch deleted successfully');
      fetchData();
    } catch (error) {
      message.error('Failed to delete branch');
      // For demo, still remove locally
      setBranches(branches.filter((b) => b.id !== branchId));
    }
  };

  const handleViewDetails = (branch: Branch) => {
    setSelectedBranch(branch);
    setDetailsModalVisible(true);
  };

  const handleAddTerminal = (branch: Branch) => {
    setSelectedBranch(branch);
    setEditingTerminal(null);
    terminalForm.resetFields();
    setTerminalModalVisible(true);
  };

  const handleSaveTerminal = async () => {
    try {
      const values = await terminalForm.validateFields();
      if (selectedBranch) {
        await retailerApi.createTerminal(selectedBranch.id, values);
        message.success('Terminal created successfully');
        setTerminalModalVisible(false);
        fetchData();
      }
    } catch (error) {
      message.error('Failed to save terminal');
      setTerminalModalVisible(false);
    }
  };

  const branchColumns = [
    {
      title: 'Branch',
      key: 'branch',
      render: (_: any, record: Branch) => (
        <Space>
          <Avatar
            size={40}
            style={{
              backgroundColor: record.is_main_branch ? '#1890ff' : '#f0f0f0',
              color: record.is_main_branch ? '#fff' : '#666',
            }}
            icon={<ShopOutlined />}
          />
          <div>
            <div>
              <Text strong>{record.branch_name}</Text>
              {record.is_main_branch && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  Main
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.branch_code}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_: any, record: Branch) => (
        <Space direction="vertical" size={0}>
          <Space>
            <EnvironmentOutlined style={{ color: '#1890ff' }} />
            <Text>{record.city}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.district}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Manager',
      key: 'manager',
      render: (_: any, record: Branch) => (
        <Space direction="vertical" size={0}>
          <Space>
            <UserOutlined />
            <Text>{record.manager_name}</Text>
          </Space>
          <Space>
            <PhoneOutlined style={{ fontSize: 10 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.manager_phone}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Terminals',
      dataIndex: 'pos_terminals',
      key: 'terminals',
      render: (count: number) => (
        <Badge
          count={count}
          style={{ backgroundColor: '#1890ff' }}
          showZero
          overflowCount={99}
        />
      ),
      sorter: (a: Branch, b: Branch) => a.pos_terminals - b.pos_terminals,
    },
    {
      title: "Today's Sales",
      dataIndex: 'today_sales',
      key: 'today_sales',
      render: (sales: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(sales || 0)}
        </Text>
      ),
      sorter: (a: Branch, b: Branch) => (a.today_sales || 0) - (b.today_sales || 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag
          color={getStatusColor(status)}
          icon={
            status === 'active' ? (
              <CheckCircleOutlined />
            ) : (
              <CloseCircleOutlined />
            )
          }
        >
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
        { text: 'Suspended', value: 'suspended' },
      ],
      onFilter: (value: any, record: Branch) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Branch) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Add Terminal">
            <Button
              type="text"
              icon={<DesktopOutlined />}
              onClick={() => handleAddTerminal(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditBranch(record)}
            />
          </Tooltip>
          {!record.is_main_branch && (
            <Popconfirm
              title="Delete this branch?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteBranch(record.id)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const terminalColumns = [
    {
      title: 'Terminal',
      key: 'terminal',
      render: (_: any, record: POSTerminal) => (
        <Space>
          <Avatar
            size={36}
            style={{
              backgroundColor:
                record.status === 'online' ? '#52c41a15' : '#ff4d4f15',
              color: record.status === 'online' ? '#52c41a' : '#ff4d4f',
            }}
            icon={<DesktopOutlined />}
          />
          <div>
            <Text strong>{record.terminal_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.terminal_code}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Branch',
      key: 'branch',
      render: (_: any, record: POSTerminal) => {
        const branch = branches.find((b) => b.id === record.branch_id);
        return <Text>{branch?.branch_name || 'Unknown'}</Text>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag
          color={getStatusColor(status)}
          icon={
            status === 'online' ? <WifiOutlined /> : <CloseCircleOutlined />
          }
        >
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Last Sync',
      dataIndex: 'last_sync',
      key: 'last_sync',
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          <Space>
            <SyncOutlined />
            <Text type="secondary">{dayjs(date).fromNow()}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Today's Transactions",
      dataIndex: 'today_transactions',
      key: 'today_transactions',
      render: (count: number) => <Badge count={count} style={{ backgroundColor: '#1890ff' }} />,
    },
    {
      title: "Today's Sales",
      dataIndex: 'today_sales',
      key: 'today_sales',
      render: (sales: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(sales)}
        </Text>
      ),
    },
    {
      title: 'Features',
      key: 'features',
      render: (_: any, record: POSTerminal) => (
        <Space>
          <Tooltip title="NFC Card Payments">
            <Tag color={record.nfc_enabled ? 'blue' : 'default'}>NFC</Tag>
          </Tooltip>
          <Tooltip title="Mobile Money">
            <Tag color={record.mobile_money_enabled ? 'green' : 'default'}>
              MoMo
            </Tag>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 2 }} />
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card>
                <Skeleton active />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            padding: '24px 32px',
            marginBottom: 24,
            borderRadius: 16,
            color: 'white',
          }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3} style={{ color: 'white', margin: 0 }}>
                <ShopOutlined /> Branch Management
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                Manage your retail branches and POS terminals
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchData}
                  style={{ borderColor: 'white', color: 'white', background: 'transparent' }}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddBranch}
                  style={{ background: 'white', color: '#1890ff', border: 'none' }}
                >
                  Add Branch
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          {
            title: 'Total Branches',
            value: stats?.total_branches || 0,
            icon: <ShopOutlined />,
            color: '#1890ff',
            suffix: `${stats?.active_branches || 0} active`,
          },
          {
            title: 'POS Terminals',
            value: stats?.total_terminals || 0,
            icon: <DesktopOutlined />,
            color: '#52c41a',
            suffix: `${stats?.online_terminals || 0} online`,
          },
          {
            title: "Today's Sales",
            value: stats?.today_total_sales || 0,
            icon: <DollarOutlined />,
            color: '#fa8c16',
            formatter: formatCurrency,
            growth: stats?.growth_percentage,
          },
          {
            title: 'Transactions',
            value: stats?.today_total_transactions || 0,
            icon: <ShoppingCartOutlined />,
            color: '#722ed1',
            suffix: 'today',
          },
        ].map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <motion.div variants={itemVariants}>
              <Card
                hoverable
                style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Row justify="space-between" align="middle">
                    <Text type="secondary">{stat.title}</Text>
                    <Avatar
                      size={40}
                      style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                      icon={stat.icon}
                    />
                  </Row>
                  <Statistic
                    value={stat.value}
                    valueStyle={{ color: stat.color, fontSize: 28, fontWeight: 700 }}
                    formatter={stat.formatter ? (v) => stat.formatter!(Number(v)) : undefined}
                  />
                  <Row justify="space-between" align="middle">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {stat.suffix}
                    </Text>
                    {stat.growth !== undefined && (
                      <Tag color="success" icon={<RiseOutlined />}>
                        +{stat.growth}%
                      </Tag>
                    )}
                  </Row>
                </Space>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Card style={{ borderRadius: 12 }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            tabBarExtraContent={
              <Input
                placeholder="Search branches..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
            }
          >
            <TabPane
              tab={
                <Space>
                  <ShopOutlined />
                  Branches
                  <Badge count={branches.length} style={{ backgroundColor: '#1890ff' }} />
                </Space>
              }
              key="branches"
            >
              <Table
                columns={branchColumns}
                dataSource={filteredBranches}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1200 }}
              />
            </TabPane>

            <TabPane
              tab={
                <Space>
                  <DesktopOutlined />
                  POS Terminals
                  <Badge count={terminals.length} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              }
              key="terminals"
            >
              <Table
                columns={terminalColumns}
                dataSource={terminals}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
              />
            </TabPane>

            <TabPane
              tab={
                <Space>
                  <BarChartOutlined />
                  Analytics
                </Space>
              }
              key="analytics"
            >
              <Row gutter={[24, 24]}>
                {/* Sales by Branch */}
                <Col xs={24} lg={14}>
                  <Card
                    title={
                      <Space>
                        <DollarOutlined style={{ color: '#1890ff' }} />
                        Sales by Branch (Today)
                      </Space>
                    }
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={branchSalesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Bar dataKey="sales" name="Actual Sales" fill="#1890ff" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="target" name="Target" fill="#d9d9d9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                {/* Payment Methods */}
                <Col xs={24} lg={10}>
                  <Card
                    title={
                      <Space>
                        <ShoppingCartOutlined style={{ color: '#52c41a' }} />
                        Payment Methods
                      </Space>
                    }
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={paymentMethodsByBranch}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {paymentMethodsByBranch.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => `${value}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                {/* Weekly Trend */}
                <Col xs={24}>
                  <Card
                    title={
                      <Space>
                        <RiseOutlined style={{ color: '#722ed1' }} />
                        Weekly Sales Trend by Branch
                      </Space>
                    }
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="main"
                          name="Kigali Main"
                          stroke="#1890ff"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="kimironko"
                          name="Kimironko"
                          stroke="#52c41a"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="huye"
                          name="Huye"
                          stroke="#fa8c16"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Card>
      </motion.div>

      {/* Add/Edit Branch Modal */}
      <Modal
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        open={branchModalVisible}
        onOk={handleSaveBranch}
        onCancel={() => setBranchModalVisible(false)}
        width={600}
        okText={editingBranch ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="branch_name"
                label="Branch Name"
                rules={[{ required: true, message: 'Please enter branch name' }]}
              >
                <Input placeholder="e.g., Kigali Main Branch" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="branch_code"
                label="Branch Code"
                rules={[{ required: true, message: 'Please enter branch code' }]}
              >
                <Input placeholder="e.g., KGL-001" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="Address"
            rules={[{ required: true, message: 'Please enter address' }]}
          >
            <Input placeholder="Street address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="city"
                label="City"
                rules={[{ required: true, message: 'Please select city' }]}
              >
                <Select placeholder="Select city">
                  <Select.Option value="Kigali">Kigali</Select.Option>
                  <Select.Option value="Huye">Huye</Select.Option>
                  <Select.Option value="Musanze">Musanze</Select.Option>
                  <Select.Option value="Rubavu">Rubavu</Select.Option>
                  <Select.Option value="Muhanga">Muhanga</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="district"
                label="District"
                rules={[{ required: true, message: 'Please enter district' }]}
              >
                <Input placeholder="e.g., Nyarugenge" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Branch Phone"
                rules={[{ required: true, message: 'Please enter phone' }]}
              >
                <Input placeholder="+250788..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                initialValue="active"
              >
                <Select>
                  <Select.Option value="active">Active</Select.Option>
                  <Select.Option value="inactive">Inactive</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Manager Details</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="manager_name"
                label="Manager Name"
                rules={[{ required: true, message: 'Please enter manager name' }]}
              >
                <Input placeholder="Manager full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="manager_phone"
                label="Manager Phone"
                rules={[{ required: true, message: 'Please enter manager phone' }]}
              >
                <Input placeholder="+250788..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="is_main_branch" valuePropName="checked">
            <Switch checkedChildren="Main Branch" unCheckedChildren="Regular Branch" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Terminal Modal */}
      <Modal
        title={`Add Terminal to ${selectedBranch?.branch_name || ''}`}
        open={terminalModalVisible}
        onOk={handleSaveTerminal}
        onCancel={() => setTerminalModalVisible(false)}
        width={500}
      >
        <Form form={terminalForm} layout="vertical">
          <Form.Item
            name="terminal_name"
            label="Terminal Name"
            rules={[{ required: true, message: 'Please enter terminal name' }]}
          >
            <Input placeholder="e.g., Counter 1, Express Lane" />
          </Form.Item>

          <Form.Item
            name="terminal_code"
            label="Terminal Code"
            rules={[{ required: true, message: 'Please enter terminal code' }]}
          >
            <Input placeholder="e.g., POS-KGL-001" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nfc_enabled" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="NFC Enabled" unCheckedChildren="NFC Disabled" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mobile_money_enabled" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="MoMo Enabled" unCheckedChildren="MoMo Disabled" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Branch Details Modal */}
      <Modal
        title={
          <Space>
            <ShopOutlined />
            {selectedBranch?.branch_name}
          </Space>
        }
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setDetailsModalVisible(false);
              if (selectedBranch) handleEditBranch(selectedBranch);
            }}
          >
            Edit Branch
          </Button>,
        ]}
        width={700}
      >
        {selectedBranch && (
          <div>
            <Row gutter={[24, 24]}>
              <Col span={12}>
                <Statistic
                  title="Today's Sales"
                  value={selectedBranch.today_sales || 0}
                  valueStyle={{ color: '#52c41a' }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Total Sales"
                  value={selectedBranch.total_sales || 0}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Transactions Today"
                  value={selectedBranch.today_transactions || 0}
                  prefix={<ShoppingCartOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="POS Terminals"
                  value={selectedBranch.pos_terminals}
                  prefix={<DesktopOutlined />}
                />
              </Col>
            </Row>

            <Divider />

            <Paragraph>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <EnvironmentOutlined />
                  <Text strong>Address:</Text>
                  <Text>{selectedBranch.address}, {selectedBranch.city}</Text>
                </Space>
                <Space>
                  <PhoneOutlined />
                  <Text strong>Phone:</Text>
                  <Text>{selectedBranch.phone}</Text>
                </Space>
                <Space>
                  <UserOutlined />
                  <Text strong>Manager:</Text>
                  <Text>
                    {selectedBranch.manager_name} ({selectedBranch.manager_phone})
                  </Text>
                </Space>
                <Space>
                  <Text strong>Status:</Text>
                  <Tag color={getStatusColor(selectedBranch.status)}>
                    {selectedBranch.status.toUpperCase()}
                  </Tag>
                </Space>
              </Space>
            </Paragraph>

            <Divider>POS Terminals at this Branch</Divider>

            <Table
              dataSource={terminals.filter((t) => t.branch_id === selectedBranch.id)}
              columns={[
                {
                  title: 'Terminal',
                  dataIndex: 'terminal_name',
                  key: 'terminal_name',
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
                  ),
                },
                {
                  title: 'Transactions',
                  dataIndex: 'today_transactions',
                  key: 'today_transactions',
                },
                {
                  title: 'Sales',
                  dataIndex: 'today_sales',
                  key: 'today_sales',
                  render: (sales: number) => formatCurrency(sales),
                },
              ]}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default BranchesPage;
