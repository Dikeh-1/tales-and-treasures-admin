import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Typography,
  Grid,
  Box,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  type SelectChangeEvent,
} from '@mui/material';
import StatCard from '../components/StatCard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import BookIcon from '@mui/icons-material/Book';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../store/AuthContext';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { useTheme } from '@mui/material/styles';



type DashboardStats = {
  totalDonations: number;
  booksDonated: number;
  upcomingEvents: number;
};

type VisitorPoint = {
  name: string;
  visitors: number;
  monthIndex?: number;
  year?: number;
};

const actionIcons: Record<string, { icon: JSX.Element; color: string }> = {
  Updated: { icon: <EditIcon />, color: '#2563EB' },
  Created: { icon: <AddIcon />, color: '#16A34A' },
  Deleted: { icon: <DeleteIcon />, color: '#DC2626' },
};

const BASE_VISITOR_YEAR = 2025;

export default function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentYear = new Date().getFullYear();

  const [stats, setStats] = useState<DashboardStats>({
    totalDonations: 0,
    booksDonated: 0,
    upcomingEvents: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedVisitorYear, setSelectedVisitorYear] = useState(currentYear);
  const [visitorChartData, setVisitorChartData] = useState<VisitorPoint[]>([]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = currentYear; year >= BASE_VISITOR_YEAR; year -= 1) {
      years.push(year);
    }
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }
    return years;
  }, [currentYear]);

  const totalVisitors = useMemo(() => {
    return visitorChartData.reduce(
      (sum, item) => sum + (Number(item.visitors) || 0),
      0,
    );
  }, [visitorChartData]);

  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, analyticsRes] = await Promise.all([
        apiClient.get('/admin/dashboard/page-data'),
        apiClient.get(`/analytics/visitors?year=${selectedVisitorYear}`),
      ]);
      const dashboardData = dashboardRes.data || {};
      const dashboardStats = dashboardData.stats || {};
      const dashboardActivities = dashboardData.recentActivities || [];

      setStats(
        dashboardStats || { totalDonations: 0, booksDonated: 0, upcomingEvents: 0 },
      );
      setRecentActivities(Array.isArray(dashboardActivities) ? dashboardActivities : []);
      setVisitorChartData(
        Array.isArray(analyticsRes.data) ? analyticsRes.data : [],
      );
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard data.');
    }
  }, [selectedVisitorYear]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedVisitorYear(Number(event.target.value));
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto', mt: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Welcome back, {user?.name?.split(' ')[0] || 'Admin'}!
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={`Visitors (${selectedVisitorYear})`}
            value={totalVisitors.toLocaleString()}
            icon={<PeopleIcon />}
            color="#2563EB"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Donations (₦)"
            value={new Intl.NumberFormat('en-NG', {
              style: 'currency',
              currency: 'NGN',
            }).format(stats.totalDonations || 0)}
            icon={<MonetizationOnIcon />}
            color="#16A34A"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Books Donated"
            value={(stats.booksDonated || 0).toString()}
            icon={<BookIcon />}
            color="#D97706"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Upcoming Events"
            value={(stats.upcomingEvents || 0).toString()}
            icon={<EventIcon />}
            color="#7C3AED"
          />
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 420,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.5,
                mb: 1,
              }}
            >
              <Typography variant="h6" color="primary">
                Website Visitors
              </Typography>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="visitor-year-label">Year</InputLabel>
                <Select<number>
                  labelId="visitor-year-label"
                  value={selectedVisitorYear}
                  label="Year"
                  onChange={handleYearChange}
                >
                  {yearOptions.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
              <LineChart
                data={visitorChartData}
                margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(128, 128, 128, 0.2)"
                />
                <XAxis dataKey="name" stroke="currentColor" />
                <YAxis stroke="currentColor" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 420,
            }}
          >
            <Typography variant="h6" color="primary" gutterBottom>
              Recent Activities
            </Typography>

            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {recentActivities && recentActivities.length > 0 ? (
                <List>
                  {recentActivities.map((activity, index) => (
                    <ListItem
                      key={activity.id || `${activity.action}-${index}`}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor:
                              actionIcons[activity.action]?.color || '#64748B',
                          }}
                        >
                          {actionIcons[activity.action]?.icon || <EditIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${activity.action}: ${activity.details}`}
                        secondary={`by ${activity.user}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    sx={{ color: 'text.secondary', textAlign: 'center' }}
                  >
                    Sorry, nothing to display here.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
