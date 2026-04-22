import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth } from '../store/AuthContext';

function getErrorMessage(error: unknown, fallback: string) {
  const typedError = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return typedError?.response?.data?.message || typedError?.message || fallback;
}

export default function ProfilePage(): JSX.Element {
  const { user, updateUser } = useAuth();

  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setName(user?.name || '');
    setAvatarUrl(user?.avatarUrl || '');
  }, [user?.avatarUrl, user?.name]);

  useEffect(() => {
    const fetchSecurity = async () => {
      try {
        setLoadingSecurity(true);
        const response = await apiClient.get('/auth/profile/security');
        setHasPassword(Boolean(response.data?.hasPassword));
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load profile security info.'));
      } finally {
        setLoadingSecurity(false);
      }
    };

    void fetchSecurity();
  }, []);

  const initials = useMemo(() => {
    const fallback = user?.name || 'Admin';
    return fallback
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }, [user?.name]);

  const saveProfile = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Name is required.');
      return;
    }

    setSavingProfile(true);
    try {
      const response = await apiClient.patch('/auth/profile', {
        name: trimmedName,
        avatarUrl: avatarUrl.trim() || null,
      });
      updateUser({
        name: response.data?.name || trimmedName,
        avatarUrl: response.data?.avatarUrl ?? (avatarUrl.trim() || null),
      });
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Enter and confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    if (hasPassword && !currentPassword) {
      toast.error('Current password is required.');
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.post('/auth/profile/change-password', {
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHasPassword(true);
      toast.success('Password updated successfully.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {(loadingSecurity || savingProfile || savingPassword) && (
        <LoadingOverlay
          message={
            loadingSecurity
              ? 'Loading profile...'
              : savingProfile
                ? 'Saving profile...'
                : 'Updating password...'
          }
        />
      )}

      <Typography variant="h4" sx={{ mb: 3, fontWeight: 800 }}>
        Profile Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Profile
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Update your display name and profile image.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Avatar
                  src={avatarUrl || undefined}
                  sx={{ width: 84, height: 84, bgcolor: 'primary.main', fontSize: 30 }}
                >
                  {initials}
                </Avatar>
                <Stack spacing={1} sx={{ width: '100%' }}>
                  <TextField
                    label="Full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Avatar URL"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    fullWidth
                  />
                </Stack>
              </Stack>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => void saveProfile()}
                  disabled={savingProfile}
                >
                  Save Profile
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Password & Security
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Password status:
                </Typography>
                <Chip
                  size="small"
                  color={hasPassword ? 'success' : 'warning'}
                  label={hasPassword ? 'Password set' : 'No password set'}
                />
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Current passwords are encrypted and cannot be displayed.
              </Typography>

              {hasPassword ? (
                <TextField
                  label="Current password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                />
              ) : null}

              <TextField
                label="New password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                fullWidth
                sx={{ mb: 2 }}
                helperText="At least 8 characters and must include letters and numbers."
              />
              <TextField
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                fullWidth
              />

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => void savePassword()}
                  disabled={savingPassword}
                >
                  {hasPassword ? 'Change Password' : 'Set Password'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
