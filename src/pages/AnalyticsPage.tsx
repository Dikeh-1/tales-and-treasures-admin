import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  ButtonGroup,
  FormControl,
  Select,
  MenuItem,
  Stack,
  Grid,
  useMediaQuery,
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import RefreshIcon from '@mui/icons-material/Refresh';
import StatCard from '../components/StatCard';
import { HandCoins, BookHeart, Gift } from 'lucide-react';
import { useTheme } from '@mui/material/styles';

const COLORS = ['#16A34A', '#38BDF8', '#F59E0B'];

type Donation = {
  id?: string;
  donationDate: string;
  amount?: number | string;
  type?: string;
  [k: string]: any;
};

type RangeKey = '3m' | '6m' | '1y' | 'year';

function monthKey(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function addMonths(d: Date, months: number) {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + months);
  return nd;
}
function monthsBetween(start: Date, end: Date) {
  const result: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    result.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

export default function AnalyticsPage(): JSX.Element {
  const [donationsFromServer, setDonationsFromServer] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('1y');
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(donationsFromServer.map(d => new Date(d.donationDate).getFullYear())));
    return years.sort((a, b) => b - a);
  }, [donationsFromServer]);

  const [stats, setStats] = useState({
    totalDonations: 0,
    booksDonated: 0,
    otherDonations: 0,
  });

  const getRangeBounds = useCallback((r: RangeKey, year?: number) => {
    const now = new Date();
    if (r === '3m') return { start: addMonths(now, -3), end: now };
    if (r === '6m') return { start: addMonths(now, -6), end: now };
    if (r === '1y') return { start: addMonths(now, -12), end: now };
    const s = new Date((year ?? now.getFullYear()), 0, 1);
    const e = new Date((year ?? now.getFullYear()), 11, 31);
    return { start: s, end: e };
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const { start, end } = getRangeBounds(range, selectedYear);
      const params = range === 'year' ? { year: selectedYear } : { startDate: start.toISOString(), endDate: end.toISOString() };
      const [donationsRes, statsRes] = await Promise.all([
        apiClient.get('/donations', { params }),
        apiClient.get('/admin/analytics/page-data'),
      ]);
      setDonationsFromServer(donationsRes.data || []);
      setStats(statsRes.data || { totalDonations: 0, booksDonated: 0, otherDonations: 0 });
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch analytics data.');
    } finally {
      setLoading(false);
    }
  }, [getRangeBounds, range, selectedYear]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const filteredDonations = useMemo(() => {
    const { start, end } = getRangeBounds(range, selectedYear);
    return donationsFromServer.filter(d => {
      const dt = new Date(d.donationDate);
      return dt >= start && dt <= end;
    });
  }, [donationsFromServer, getRangeBounds, range, selectedYear]);

  const monthlyFinancialData = useMemo(() => {
    const { start, end } = getRangeBounds(range, selectedYear);
    const monthDates = monthsBetween(start, end);
    const monthKeys = monthDates.map(monthKey);
    const agg: Record<string, number> = {};
    filteredDonations.forEach(don => {
      if ((don.type || '').toLowerCase() !== 'financial') return;
      const dt = new Date(don.donationDate);
      const k = monthKey(dt);
      agg[k] = (agg[k] || 0) + (parseFloat(String(don.amount || 0)) || 0);
    });
    return monthKeys.map(k => {
      const [yStr, mStr] = k.split('-');
      const y = Number(yStr);
      const m = Number(mStr);
      const monthName = new Date(y, m - 1).toLocaleString('default', { month: 'short' });
      return { month: `${monthName} ${y}`, amount: agg[k] || 0 };
    });
  }, [filteredDonations, getRangeBounds, range, selectedYear]);

  const donationTypeCount = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredDonations.forEach(d => {
      const t = d.type || 'Other';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [filteredDonations]);

  const renderEmptyState = (message: string) => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}>
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 3 }}>
      <Typography variant="h4" gutterBottom>
        Analytics & Statistics
      </Typography>

      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={2}
        justifyContent="space-between"
        alignItems={isMobile ? 'stretch' : 'center'}
      >
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems={isMobile ? 'stretch' : 'center'}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAnalyticsData}
            disabled={loading}
            fullWidth={isMobile}
          >
            Refresh Data
          </Button>

          <ButtonGroup orientation={isMobile ? 'vertical' : 'horizontal'} variant="outlined" size="small">
            {['3m', '6m', '1y', 'year'].map(r => (
              <Button key={r} variant={range === r ? 'contained' : 'outlined'} onClick={() => setRange(r as RangeKey)}>
                {r.toUpperCase()}
              </Button>
            ))}
          </ButtonGroup>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={String(selectedYear)} onChange={e => setSelectedYear(Number(e.target.value))}>
              {yearOptions.map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {!isMobile && (
          <Typography variant="subtitle2">
            Showing {monthlyFinancialData.length} month(s) • {donationTypeCount.length} donation type(s)
          </Typography>
        )}
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total Amount (All Time)"
            value={new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(stats.totalDonations || 0)}
            icon={<HandCoins />}
            color="#16A34A"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total Books (All Time)"
            value={(stats.booksDonated || 0).toLocaleString()}
            icon={<BookHeart />}
            color="#38BDF8"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total 'Other' (All Time)"
            value={(stats.otherDonations || 0).toLocaleString()}
            icon={<Gift />}
            color="#F59E0B"
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper sx={{ p: 2, minHeight: 320 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Financial Donations per Month (₦)
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress />
            </Box>
          ) : monthlyFinancialData.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
              <BarChart data={monthlyFinancialData} margin={{ top: 10, right: 24, left: 8, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.18)" />
                <XAxis dataKey="month" stroke="currentColor" hide={isMobile} />
                <YAxis stroke="currentColor" hide={isMobile} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) =>
                  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value)} />
                {!isMobile && <Legend />}
                <Bar dataKey="amount" fill="#16A34A" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            renderEmptyState('No financial donation data to display for selected period.')
          )}
        </Paper>

        <Paper sx={{ p: 2, minHeight: 320 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Donation Types (by Count)
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress />
            </Box>
          ) : donationTypeCount.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
              <PieChart>
                <Pie
                  data={donationTypeCount}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? '60%' : '70%'}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {donationTypeCount.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={value => `${value} donations`} />
                {!isMobile && <Legend verticalAlign="bottom" height={36} />}
              </PieChart>
            </ResponsiveContainer>
          ) : (
            renderEmptyState('No donation data to display for selected period.')
          )}
        </Paper>
      </Box>
    </Box>
  );
}
