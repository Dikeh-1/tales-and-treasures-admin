import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useColorMode } from '../store/ThemeContext';
import { styled, alpha } from '@mui/material/styles';
import { type Theme, useTheme } from '@mui/material';
import { type CSSObject } from '@mui/system';
import {
  Box,
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Drawer as MuiDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  IconButton,
  Button,
  Divider,
  Badge,
  Alert,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Stack,
  LinearProgress,
  ListSubheader,
  Tooltip,
} from '@mui/material';
import { Toaster, toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import apiClient, { API_URL, NETWORK_EVENT } from '../api/apiClient';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PeopleIcon from '@mui/icons-material/People';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HistoryIcon from '@mui/icons-material/History';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MailIcon from '@mui/icons-material/Mail';
import BookIcon from '@mui/icons-material/Book';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';

import InactivityWarningModal from '../components/InactivityWarningModal';

const drawerWidth = 280;

const LOGOUT_TIME = 3 * 60 * 60 * 1000; 
const WARNING_TIME = LOGOUT_TIME - (60 * 2000); 

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  borderRight: 'none',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(16, 31, 54, 0.94), rgba(8, 19, 35, 0.96))'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 250, 255, 0.96))',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: { width: `calc(${theme.spacing(9)} + 1px)` },
  borderRight: 'none',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(16, 31, 54, 0.94), rgba(8, 19, 35, 0.96))'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 250, 255, 0.96))',
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(0, 1),
  height: 80, // Taller header for logo
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, { shouldForwardProp: (prop) => prop !== 'open' })< { open?: boolean } >(({ theme }: { theme: Theme; open?: boolean }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backdropFilter: 'blur(12px)',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(7, 18, 33, 0.82), rgba(7, 18, 33, 0.76))'
      : 'linear-gradient(180deg, rgba(250, 253, 255, 0.9), rgba(250, 253, 255, 0.8))',
  color: theme.palette.text.primary,
  boxShadow: 'none',
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.26)}`,
}));

const DesktopDrawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }: { theme: Theme; open: boolean }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && { ...openedMixin(theme), '& .MuiDrawer-paper': openedMixin(theme) }),
    ...(!open && { ...closedMixin(theme), '& .MuiDrawer-paper': closedMixin(theme) }),
  }),
);

export default function DashboardLayout() {
  type DashboardNotification = {
    id: string;
    title: string;
    detail: string;
    path: string;
    createdAt: string;
    isUnread?: boolean;
  };

  const [open, setOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingDonationCount, setPendingDonationCount] = useState(0);
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  );
  const [pendingRequests, setPendingRequests] = useState(0);
  const { mode, toggleColorMode } = useColorMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [refreshKey, setRefreshKey] = useState(0);

  // Refs & State for Logic
  const hasPlayedLoginSound = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const warningTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [anchorElNotifications, setAnchorElNotifications] =
    useState<null | HTMLElement>(null);

  // Mobile drawer handling
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

  // --- Audio Logic ---
  useEffect(() => {
    if (user && !hasPlayedLoginSound.current) {
      const audio = new Audio('/notification.mp3');
      audioRef.current = audio;
      audio.play()
        .then(() => { hasPlayedLoginSound.current = true; })
        .catch(() => { /* Autoplay blocked */ });
    }
  }, [user]);

  // --- Logout & Activity Logic ---
  const handleLogout = useCallback(async () => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    if (user) {
      try {
        await apiClient.post('/auth/logout', { userId: user.id });
      } catch (e) {
        console.error(e);
      }
    }
    logout();
    navigate('/login');
  }, [user, logout, navigate]);

  const resetInactivityTimer = useCallback(() => {
    setWarningModalOpen(false);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    warningTimer.current = window.setTimeout(() => setWarningModalOpen(true), WARNING_TIME);
    logoutTimer.current = window.setTimeout(() => handleLogout(), LOGOUT_TIME);
  }, [handleLogout]);

  const stayLoggedIn = useCallback(() => {
    setWarningModalOpen(false);
    toast.success('Session extended.');
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  useEffect(() => {
    resetInactivityTimer();
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer));
  }, [resetInactivityTimer]);

  // --- Data Fetching ---
  const fetchCounts = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        apiClient.get('/messages/count/unread'),
        apiClient.get('/admin/layout/page-data'),
      ]);
      if (results[0].status === 'fulfilled') setUnreadCount(results[0].value.data || 0);
      if (results[1].status === 'fulfilled') setPendingDonationCount(results[1].value.data.pendingDonations || 0);
    } catch (error) { console.error(error); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        apiClient.get('/messages'),
        apiClient.get('/book-donations'),
        apiClient.get('/other-donations'),
      ]);

      const nextNotifications: DashboardNotification[] = [];

      if (results[0].status === 'fulfilled') {
        const messageRows = Array.isArray(results[0].value.data)
          ? results[0].value.data
          : [];
        for (const message of messageRows) {
          const isRead = Boolean(message.isRead ?? message.read);
          if (isRead) continue;
          nextNotifications.push({
            id: `message-${message.id}`,
            title: `Unread message from ${message.name || 'Visitor'}`,
            detail: message.subject || 'Open inbox to view message',
            path: '/messages',
            createdAt: message.createdAt || new Date().toISOString(),
            isUnread: true,
          });
        }
      }

      if (results[1].status === 'fulfilled') {
        const bookRows = Array.isArray(results[1].value.data)
          ? results[1].value.data
          : [];
        for (const request of bookRows) {
          if (String(request.status || '').toLowerCase() !== 'pending') continue;
          nextNotifications.push({
            id: `book-${request.id}`,
            title: 'Pending book donation request',
            detail: `${request.name || 'Donor'} • ${request.bookQty || 0} book(s)`,
            path: '/donation-tracker',
            createdAt: request.createdAt || new Date().toISOString(),
          });
        }
      }

      if (results[2].status === 'fulfilled') {
        const otherRows = Array.isArray(results[2].value.data)
          ? results[2].value.data
          : [];
        for (const request of otherRows) {
          if (String(request.status || '').toLowerCase() !== 'pending') continue;
          nextNotifications.push({
            id: `other-${request.id}`,
            title: 'Pending other donation request',
            detail: `${request.name || 'Donor'} • ${
              request.contributionType || 'Contribution'
            }`,
            path: '/donation-tracker',
            createdAt: request.createdAt || new Date().toISOString(),
          });
        }
      }

      nextNotifications.sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      setNotifications(nextNotifications.slice(0, 12));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCounts();
      fetchNotifications();
    }
  }, [user, fetchCounts, fetchNotifications]);

  useEffect(() => {
    const handleNetworkPending = (event: Event) => {
      const customEvent = event as CustomEvent<{ pending?: number }>;
      const value = Number(customEvent.detail?.pending || 0);
      setPendingRequests(Number.isFinite(value) ? value : 0);
    };

    window.addEventListener(NETWORK_EVENT, handleNetworkPending as EventListener);
    return () => {
      window.removeEventListener(
        NETWORK_EVENT,
        handleNetworkPending as EventListener,
      );
    };
  }, []);

  // --- WebSockets ---
  useEffect(() => {
    const socket = io(API_URL);
    socket.on('connect', () => console.log('WS Connected'));
    socket.on('unreadCountUpdated', () => {
      fetchCounts();
      fetchNotifications();
    });
    socket.on('pendingDonationCountUpdated', () => {
      fetchCounts();
      fetchNotifications();
    });
    socket.on('newMessage', (msg: { name?: string }) => {
      toast.success(`New message from ${msg?.name || 'a visitor'}!`);
      fetchCounts();
      fetchNotifications();
      if (audioRef.current) audioRef.current.play().catch(() => {});
    });
    socket.on('newBookDonation', () => {
      fetchCounts();
      fetchNotifications();
    });
    socket.on('newFinancialDonation', () => {
      fetchCounts();
      fetchNotifications();
    });
    // ... other socket events same as before ...
    return () => { socket.disconnect(); };
  }, [fetchCounts, fetchNotifications]);

  // --- Navigation Items ---
  const navSections = [
    {
      title: 'Overview',
      items: [
        { text: 'Overview', icon: <DashboardIcon />, path: '/' },
        { text: 'Calendar', icon: <CalendarMonthIcon />, path: '/calendar' },
        { text: 'Analytics', icon: <BarChartIcon />, path: '/analytics' },
      ],
    },
    {
      title: 'Communications',
      items: [
        {
          text: 'Messages',
          icon: (
            <Badge badgeContent={unreadCount} color="error">
              <MailIcon />
            </Badge>
          ),
          path: '/messages',
        },
        {
          text: 'Tracker',
          icon: (
            <Badge badgeContent={pendingDonationCount} color="error">
              <BookIcon />
            </Badge>
          ),
          path: '/donation-tracker',
        },
        { text: 'Subscriptions', icon: <SubscriptionsIcon />, path: '/subscriptions' },
      ],
    },
    {
      title: 'Content',
      items: [
        { text: 'Donations', icon: <MonetizationOnIcon />, path: '/donations' },
        { text: 'Gallery', icon: <PhotoLibraryIcon />, path: '/gallery' },
        { text: 'Book Club', icon: <MenuBookIcon />, path: '/book-club' },
        { text: 'Story Bridge', icon: <BookIcon />, path: '/story-bridge' },
        { text: 'Events', icon: <EventIcon />, path: '/upcoming-events' },
        { text: 'Newsletter', icon: <MarkEmailUnreadIcon />, path: '/newsletter' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { text: 'Users', icon: <PeopleIcon />, path: '/users' },
        { text: 'Team', icon: <GroupIcon />, path: '/team' },
        { text: 'Roles', icon: <SupervisorAccountIcon />, path: '/volunteer-roles' },
        { text: 'Activity Log', icon: <HistoryIcon />, path: '/activity-log' },
        { text: 'Profile Settings', icon: <PersonIcon />, path: '/profile' },
        { text: 'Site Settings', icon: <SettingsIcon />, path: '/settings' },
      ],
    },
  ];

  const renderDrawerList = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DrawerHeader>
        <Typography variant="h5" fontWeight={900} sx={{ 
          background: 'linear-gradient(45deg, #0f8aaf 25%, #f2992e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.3s'
        }}>
          {open ? 'TALES & TREASURES' : 'TT'}
        </Typography>
      </DrawerHeader>
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 1 }}>
        {navSections.map((section) => (
          <List
            disablePadding
            key={section.title}
            subheader={
              open ? (
                <ListSubheader
                  disableSticky
                  sx={{
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    lineHeight: 1.2,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  {section.title}
                </ListSubheader>
              ) : undefined
            }
          >
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    selected={isActive}
                    onClick={() => isMobile && setOpen(false)}
                    sx={{
                      minHeight: 48,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2.5,
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      bgcolor: isActive
                        ? alpha(theme.palette.primary.main, 0.1)
                        : 'transparent',
                      color: isActive ? 'primary.main' : 'text.secondary',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        transform: 'translateX(2px)',
                      },
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 2 : 'auto',
                        justifyContent: 'center',
                        color: isActive ? 'primary.main' : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.9rem',
                      }}
                      sx={{ opacity: open ? 1 : 0 }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      <Toaster position="top-right" />
      
      {/* --- Header --- */}
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={() => setOpen(!open)}
            edge="start"
            sx={{ mr: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={() => setRefreshKey(prev => prev + 1)}
              sx={{
                textTransform: 'none',
                borderRadius: 4,
                px: 2,
                fontWeight: 600,
                borderColor: alpha(theme.palette.primary.main, 0.5),
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }
              }}
            >
              {!isMobile && "Refresh Data"}
            </Button>

            <IconButton color="inherit" onClick={toggleColorMode}>
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            
            <IconButton
              color="inherit"
              onClick={(event) => setAnchorElNotifications(event.currentTarget)}
            >
              <Badge badgeContent={unreadCount + pendingDonationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <Box
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
            >
              <Avatar
                src={user?.avatarUrl || undefined}
                sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}
              >
                {user?.name ? user.name[0].toUpperCase() : <PersonIcon />}
              </Avatar>
              {!isMobile && (
                <Box sx={{ ml: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {user?.name?.split(' ')[0] || 'Admin'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Administrator
                  </Typography>
                </Box>
              )}
            </Box>

            <Tooltip title="Logout">
              <IconButton color="inherit" onClick={() => void handleLogout()}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorElNotifications}
              open={Boolean(anchorElNotifications)}
              onClose={() => setAnchorElNotifications(null)}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  width: 360,
                  maxWidth: '95vw',
                  maxHeight: 420,
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Notifications
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Recent unread messages and pending requests
                </Typography>
              </Box>
              <Divider />
              {notifications.length === 0 ? (
                <MenuItem disabled>
                  <ListItemText
                    primary="No new notifications"
                    secondary="You're all caught up."
                  />
                </MenuItem>
              ) : (
                notifications.map((notification) => (
                  <MenuItem
                    key={notification.id}
                    onClick={() => {
                      setAnchorElNotifications(null);
                      navigate(notification.path);
                    }}
                    sx={{ alignItems: 'flex-start', py: 1.2 }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          fontWeight={notification.isUnread ? 700 : 500}
                        >
                          {notification.title}
                        </Typography>
                      }
                      secondary={notification.detail}
                    />
                  </MenuItem>
                ))
              )}
            </Menu>
          </Stack>
        </Toolbar>
        {pendingRequests > 0 ? (
          <LinearProgress
            color="warning"
            sx={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
          />
        ) : null}
      </AppBar>

      {/* --- Sidebar --- */}
      {isMobile ? (
        <MuiDrawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: drawerWidth, borderRight: 'none' } }}
        >
          {renderDrawerList()}
        </MuiDrawer>
      ) : (
        <DesktopDrawer variant="permanent" open={open}>
          {renderDrawerList()}
        </DesktopDrawer>
      )}

      {/* --- Main Content --- */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          width: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(160deg, rgba(8, 19, 35, 0.9), rgba(11, 24, 42, 0.92))'
              : 'linear-gradient(160deg, rgba(247, 251, 255, 0.95), rgba(244, 250, 255, 0.92))',
          minHeight: '100vh',
        }}
      >
        <DrawerHeader />
        
        {user && !user.isVerified && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            Your email is not verified. Please check your inbox to unlock all features.
          </Alert>
        )}
        
        <Box key={refreshKey}>
          <Outlet />
        </Box>
      </Box>

      <InactivityWarningModal open={warningModalOpen} onLogout={handleLogout} onStayLoggedIn={stayLoggedIn} />
    </Box>
  );
}
