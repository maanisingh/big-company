import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Stack,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  ShoppingCart as OrdersIcon,
  Refresh as RefreshIcon,
  Assessment as ReportIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { reportsApi } from '../../lib/api';

interface ProfitSummary {
  total_orders: number;
  total_items: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  average_margin: string;
  currency: string;
}

interface DailyBreakdown {
  date: string;
  orders: number;
  items: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: string;
}

interface OrderDetail {
  date: string;
  order_id: string;
  items_sold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface ReportData {
  period: string;
  start_date: string;
  end_date: string;
  summary: ProfitSummary;
  breakdown: DailyBreakdown[];
  orders: OrderDetail[];
}

export default function ProfitMarginPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch report data
  const fetchReport = async (selectedPeriod: string, customStart?: string, customEnd?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { period: selectedPeriod };
      if (selectedPeriod === 'custom' && customStart && customEnd) {
        params.start_date = customStart;
        params.end_date = customEnd;
      }

      const response = await reportsApi.getProfitMarginReport(params);
      setReportData(response);
    } catch (err: any) {
      console.error('Failed to fetch profit report:', err);
      setError(err.response?.data?.error || 'Failed to load profit margin report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(period);
  }, []);

  // Handle period change
  const handlePeriodChange = (_event: React.MouseEvent<HTMLElement>, newPeriod: string | null) => {
    if (newPeriod !== null && newPeriod !== 'custom') {
      setPeriod(newPeriod);
      fetchReport(newPeriod);
    } else if (newPeriod === 'custom') {
      setPeriod('custom');
    }
  };

  // Handle custom date range
  const handleCustomDateRange = () => {
    if (startDate && endDate) {
      fetchReport('custom', startDate, endDate);
    } else {
      setError('Please select both start and end dates');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && !reportData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Profit Margin Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track revenue, costs, and profit margins over time
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchReport(period, startDate, endDate)}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Period Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle2" sx={{ minWidth: 100 }}>
            Select Period:
          </Typography>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={handlePeriodChange}
            size="small"
          >
            <ToggleButton value="today">Today</ToggleButton>
            <ToggleButton value="yesterday">Yesterday</ToggleButton>
            <ToggleButton value="week">Last 7 Days</ToggleButton>
            <ToggleButton value="month">Last 30 Days</ToggleButton>
            <ToggleButton value="custom">Custom Range</ToggleButton>
          </ToggleButtonGroup>

          {period === 'custom' && (
            <>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <TextField
                label="End Date"
                type="date"
                size="small"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <Button
                variant="contained"
                startIcon={<DateRangeIcon />}
                onClick={handleCustomDateRange}
                disabled={!startDate || !endDate}
              >
                Apply
              </Button>
            </>
          )}
        </Stack>

        {reportData && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Showing data from <strong>{formatDate(reportData.start_date)}</strong> to{' '}
              <strong>{formatDate(reportData.end_date)}</strong>
            </Typography>
          </Box>
        )}
      </Paper>

      {reportData && (
        <>
          {/* Summary Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <OrdersIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography color="text.secondary" variant="body2">
                      Total Orders
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 600 }}>
                    {reportData.summary.total_orders}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {reportData.summary.total_items} items sold
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MoneyIcon sx={{ mr: 1, color: 'info.main' }} />
                    <Typography color="text.secondary" variant="body2">
                      Total Revenue
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 600, color: 'info.main' }}>
                    {formatCurrency(reportData.summary.total_revenue)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cost: {formatCurrency(reportData.summary.total_cost)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography color="text.secondary" variant="body2">
                      Total Profit
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {formatCurrency(reportData.summary.total_profit)}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    ↑ From sales
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ReportIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography color="text.secondary" variant="body2">
                      Avg. Profit Margin
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {reportData.summary.average_margin}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Average across all orders
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Daily Breakdown Table */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Daily Breakdown
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Profit and margin by date
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="center">Orders</TableCell>
                    <TableCell align="center">Items</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Profit</TableCell>
                    <TableCell align="center">Margin %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.breakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          No data available for the selected period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.breakdown.map((day) => (
                      <TableRow key={day.date} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {formatDate(day.date)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{day.orders}</TableCell>
                        <TableCell align="center">{day.items}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="info.main">
                            {formatCurrency(day.revenue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(day.cost)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main" fontWeight={600}>
                            {formatCurrency(day.profit)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${day.margin}%`}
                            size="small"
                            color={parseFloat(day.margin) >= 25 ? 'success' : 'warning'}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Order Details Table */}
          <Paper>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Order Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Individual order profit breakdown
              </Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Order ID</TableCell>
                    <TableCell align="center">Items</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Profit</TableCell>
                    <TableCell align="center">Margin %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.orders.map((order) => (
                    <TableRow key={order.order_id} hover>
                      <TableCell>
                        <Typography variant="caption">{formatDate(order.date)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={order.order_id} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">{order.items_sold}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="info.main">
                          {formatCurrency(order.revenue)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(order.cost)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main" fontWeight={500}>
                          {formatCurrency(order.profit)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${order.margin.toFixed(2)}%`}
                          size="small"
                          color={order.margin >= 25 ? 'success' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
