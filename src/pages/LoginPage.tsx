import React, { useState } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import apiClient from '../api/apiClient';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, ShieldCheck, UserPlus, KeyRound } from 'lucide-react';
import LoadingOverlay from '../components/LoadingOverlay';
import { toast } from 'react-hot-toast';

type AuthMode = 'login' | 'verifyDevice';
type AuthMethod = 'biometric' | 'password';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as {
    response?: {
      data?: {
        message?: string;
        description?: string;
      };
    };
    message?: string;
  };
  return (
    maybeError?.response?.data?.message ||
    maybeError?.message ||
    fallback
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
  const [needsBiometricSetup, setNeedsBiometricSetup] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sendingResetCode, setSendingResetCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const navigate = useNavigate();
  const auth = useAuth();
  const location = useLocation();
  const successMessage = (location.state as { message?: string } | null)?.message;

  const handlePrimaryAction = async () => {
    if (needsBiometricSetup) {
      await handleCompleteRegistration();
      return;
    }

    if (authMode === 'verifyDevice') {
      await handleVerifyDevice();
      return;
    }

    if (authMethod === 'password') {
      await handlePasswordLogin();
      return;
    }

    await handleBiometricLogin();
  };

  const handleBiometricLogin = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError('Please enter your email to begin.');
      return;
    }

    setLoading(true);
    setError('');
    setNeedsBiometricSetup(false);
    try {
      const optionsRes = await apiClient.get(
        `/auth/login-options?email=${encodeURIComponent(normalizedEmail)}`,
      );

      if (optionsRes.data?.newDevice) {
        setAuthMode('verifyDevice');
        setEmail(normalizedEmail);
        return;
      }

      const assertion = await startAuthentication({
        optionsJSON: optionsRes.data,
      });
      const verifyRes = await apiClient.post('/auth/verify-login', {
        email: normalizedEmail,
        assertionResponse: assertion,
      });

      auth.login(
        verifyRes.data.user,
        verifyRes.data.accessToken,
        verifyRes.data.refreshToken,
      );
      navigate('/', { replace: true });
    } catch (err) {
      const typedError = err as {
        response?: { data?: { description?: string; message?: string } };
      };
      if (typedError?.response?.data?.description === 'NO_CREDENTIALS') {
        setNeedsBiometricSetup(true);
        setAuthMethod('password');
        setError(
          'No biometrics are registered for this account. Set it up now or switch to password sign in.',
        );
      } else {
        setError(getErrorMessage(err, 'Login failed.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await apiClient.post('/auth/login-password', {
        email: normalizedEmail,
        password,
      });

      auth.login(
        response.data.user,
        response.data.accessToken,
        response.data.refreshToken,
      );
      navigate('/', { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, 'Password login failed.');
      setError(message);
      if (message.toLowerCase().includes('no password has been set')) {
        setResetEmail(normalizedEmail);
        setResetOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDevice = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!code) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/verify-device', { email: normalizedEmail, code });
      setAuthMode('login');
      toast.success('Device verified! You can now sign in.');
    } catch (err) {
      setError(getErrorMessage(err, 'Device verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const optionsRes = await apiClient.post('/auth/biometric-options', {
        email: normalizedEmail,
      });
      const attestation = await startRegistration({
        optionsJSON: optionsRes.data,
      });
      await apiClient.post('/auth/verify-registration', {
        email: normalizedEmail,
        attestationResponse: attestation,
      });
      toast.success('Biometrics registered successfully! You can now sign in.');
      setNeedsBiometricSetup(false);
      setAuthMethod('biometric');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to register biometrics.'));
    } finally {
      setLoading(false);
    }
  };

  const openResetPasswordDialog = () => {
    setResetEmail(normalizeEmail(email));
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetOpen(true);
  };

  const handleSendResetCode = async () => {
    const normalizedEmail = normalizeEmail(resetEmail);
    if (!normalizedEmail) {
      toast.error('Please enter your email.');
      return;
    }

    setSendingResetCode(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email: normalizedEmail,
      });
      toast.success(
        response.data?.message ||
          'If your account exists, a reset code has been sent.',
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not send reset code.'));
    } finally {
      setSendingResetCode(false);
    }
  };

  const handleResetPassword = async () => {
    const normalizedEmail = normalizeEmail(resetEmail);
    if (!normalizedEmail || !resetCode || !newPassword || !confirmPassword) {
      toast.error('Please complete all reset fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setResettingPassword(true);
    try {
      const response = await apiClient.post('/auth/reset-password', {
        email: normalizedEmail,
        code: resetCode,
        password: newPassword,
      });
      toast.success(response.data?.message || 'Password reset successful.');
      setResetOpen(false);
      setAuthMethod('password');
      setNeedsBiometricSetup(false);
      setEmail(normalizedEmail);
      setPassword('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not reset password.'));
    } finally {
      setResettingPassword(false);
    }
  };

  const buttonLabel = needsBiometricSetup
    ? 'Register Biometrics'
    : authMode === 'verifyDevice'
      ? 'Verify Device'
      : authMethod === 'password'
        ? 'Sign In with Password'
        : 'Sign In with Biometrics';

  const buttonIcon = needsBiometricSetup
    ? <UserPlus />
    : authMode === 'verifyDevice'
      ? <ShieldCheck />
      : authMethod === 'password'
        ? <KeyRound />
        : <Fingerprint />;

  const subtitle = needsBiometricSetup
    ? 'This account has no biometrics yet. Register this device to use biometric sign in.'
    : authMode === 'verifyDevice'
      ? `For your security, we've sent a code to ${email}.`
      : authMethod === 'password'
        ? 'Sign in with your email and password.'
        : 'Use your registered device to sign in securely.';

  return (
    <Box className="auth-container">
      <div className="auth-background"></div>

      <Box className="auth-panel branding-panel">
        <Box>
          <Typography className="branding-logo">Tales & Treasures</Typography>
          <Typography variant="h2" className="branding-quote">
            Calm control for the work that changes children’s stories.
          </Typography>
          <Typography className="branding-author">
            Secure admin access for operations, outreach, and impact.
          </Typography>
        </Box>
      </Box>

      <Box className="auth-panel form-panel">
        <Box className="auth-form-container" sx={{ position: 'relative' }}>
          {loading && (
            <LoadingOverlay
              message={
                needsBiometricSetup
                  ? 'Registering biometrics...'
                  : authMode === 'verifyDevice'
                    ? 'Verifying device...'
                    : authMethod === 'password'
                      ? 'Signing in...'
                      : 'Authenticating...'
              }
            />
          )}

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          <Typography component="h1" variant="h4" className="auth-title">
            {authMode === 'verifyDevice'
              ? 'Authorize New Device'
              : needsBiometricSetup
                ? 'Complete Biometric Setup'
                : 'Admin Sign In'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }} className="auth-subtitle">
            {subtitle}
          </Typography>

          <Box
            component="form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void handlePrimaryAction();
            }}
          >
            {authMode === 'login' && !needsBiometricSetup && (
              <Box
                className="auth-method-toggle"
                sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}
              >
                <Button
                  variant={authMethod === 'biometric' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setAuthMethod('biometric');
                    setError('');
                  }}
                >
                  Biometric
                </Button>
                <Button
                  variant={authMethod === 'password' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setAuthMethod('password');
                    setError('');
                  }}
                >
                  Password
                </Button>
              </Box>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus={authMode !== 'verifyDevice'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={authMode === 'verifyDevice' || loading}
            />

            {authMode === 'login' && authMethod === 'password' && !needsBiometricSetup && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="password"
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
            )}

            {authMode === 'verifyDevice' && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="code"
                label="6-Digit Verification Code"
                name="code"
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={loading}
              />
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
              startIcon={buttonIcon}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : buttonLabel}
            </Button>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {authMode === 'login' && authMethod === 'password' && !needsBiometricSetup && (
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={openResetPasswordDialog}
                >
                  Forgot password?
                </Link>
              </Typography>
            )}

            {!needsBiometricSetup && (
              <Typography variant="body2" align="center" className="auth-link-text">
                First time here?{' '}
                <Link component={RouterLink} to="/register" variant="body2">
                  Register a new admin account.
                </Link>
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog
        className="auth-reset-dialog"
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle className="auth-reset-title">Reset Password</DialogTitle>
        <DialogContent className="auth-reset-content" sx={{ position: 'relative' }}>
          {(sendingResetCode || resettingPassword) && (
            <LoadingOverlay
              message={
                sendingResetCode
                  ? 'Sending reset code...'
                  : 'Updating your password...'
              }
            />
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Request a reset code, then enter the code and your new password.
          </Typography>
          <TextField
            margin="normal"
            fullWidth
            label="Email"
            type="email"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
          />
          <Button
            className="auth-reset-send-btn"
            variant="outlined"
            onClick={() => void handleSendResetCode()}
            disabled={sendingResetCode}
            sx={{ mt: 1, mb: 1 }}
            startIcon={
              sendingResetCode ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {sendingResetCode ? 'Sending...' : 'Send Reset Code'}
          </Button>
          <TextField
            margin="normal"
            fullWidth
            label="Reset Code"
            value={resetCode}
            onChange={(event) => setResetCode(event.target.value)}
          />
          <TextField
            margin="normal"
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </DialogContent>
        <DialogActions className="auth-reset-actions">
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleResetPassword()}
            disabled={resettingPassword}
            startIcon={
              resettingPassword ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {resettingPassword ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
