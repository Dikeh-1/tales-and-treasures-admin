import { useMemo } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useColorMode } from './store/ThemeContext';
import { getDesignTokens } from './styles/theme';

import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TeamPage from './pages/TeamPage';
import EventsPage from './pages/EventsPage';
import SettingsPage from './pages/SettingsPage';
import DonationsPage from './pages/DonationsPage';
import UsersPage from './pages/UsersPage';
import GalleryPage from './pages/GalleryPage';
import BookClubPage from './pages/BookClubPage';
import ActivityLogPage from './pages/ActivityLogPage';
import CalendarPage from './pages/CalendarPage';
import MessagesPage from './pages/MessagesPage';
import DonationTrackerPage from './pages/DonationTrackerPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import StoryBridgePage from './pages/StoryBridgePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';
import NewsletterPage from './pages/NewsletterPage';
import DeviceVerificationPage from './pages/DeviceVerificationPage';
import VolunteerRolesPage from './pages/VolunteerRolesPage';
import ProfilePage from './pages/ProfilePage';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'donations', element: <DonationsPage /> },
      { path: 'donation-tracker', element: <DonationTrackerPage /> },
      { path: 'subscriptions', element: <SubscriptionsPage /> },
      { path: 'gallery', element: <GalleryPage /> },
      { path: 'book-club', element: <BookClubPage /> },
      { path: 'story-bridge', element: <StoryBridgePage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'team', element: <TeamPage /> },
      { path: 'upcoming-events', element: <EventsPage /> },
      { path: 'activity-log', element: <ActivityLogPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'newsletter', element: <NewsletterPage /> },
      { path: 'volunteer-roles', element: <VolunteerRolesPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'storybridge', element: <StoryBridgePage /> }
    ],
  },
  // Public routes that do not require login
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  // THIS IS THE FIX: Moving the verification route here makes it public
  {
    path: '/verify-email',
    element: <EmailVerificationPage />,
  },

  { 
    path: '/verify-device', 
    element: <DeviceVerificationPage />, 
  },

  {
    path: '*',
    element: <NotFoundPage />,
  }
]);

function App() {
  const { mode } = useColorMode();
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
