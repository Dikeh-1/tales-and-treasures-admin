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
  InputAdornment,
  IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import apiClient from '../api/apiClient';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, ShieldCheck, UserPlus, KeyRound, ScanFace } from 'lucide-react';
import LoadingOverlay from '../components/LoadingOverlay';
import FaceCapture from '../components/FaceCapture';
import { toast } from 'react-hot-toast';
import ShaderBackground from '../components/ui/ShaderBackground';
import { LampContainer } from '../components/ui/LampContainer';
import '../styles/AuthPages.css';

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
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
  const [needsBiometricSetup, setNeedsBiometricSetup] = useState(false);
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
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

  const handleBiometricLogin = async (type: 'fingerprint' | 'face') => {
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

      if (verifyRes.data.requiresConfiguration) {
        toast.error(verifyRes.data.message || 'Please complete account configuration.');
        navigate('/register', { 
           state: { 
             email: verifyRes.data.email, 
             phase: verifyRes.data.phase 
           } 
        });
        return;
      }

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
          `No Fingerprint is registered for this account. Please sign in with your password to complete setup.`,
        );
      } else {
        setError(getErrorMessage(err, 'Login failed.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLogin = async (descriptorJSON: string) => {
    setLoading(true);
    setError('');
    setIsCapturingFace(false);
    try {
      const normalizedEmail = normalizeEmail(email);
      const verifyRes = await apiClient.post('/auth/face-login', {
        email: normalizedEmail,
        descriptor: descriptorJSON,
      });

      if (verifyRes.data.requiresConfiguration) {
        toast.error(verifyRes.data.message || 'Please complete account configuration.');
        navigate('/register', { 
           state: { 
             email: verifyRes.data.email, 
             phase: verifyRes.data.phase 
           } 
        });
        return;
      }

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
          `No Face Capture is registered for this account. Please sign in with your password to complete setup.`,
        );
      } else {
        setError(getErrorMessage(err, 'Face login failed. Identity not verified.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendDeviceCode = async () => {
    try {
      const normalizedEmail = normalizeEmail(email);
      await apiClient.get(`/auth/login-options?email=${encodeURIComponent(normalizedEmail)}`);
      toast.success('A new device verification code has been sent to your email.');
      setResendDisabled(true);
      setCountdown(60);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setResendDisabled(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resend code.'));
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

      if (response.data.requiresConfiguration) {
        toast.error(response.data.message || 'Please complete account configuration.');
        navigate('/register', { 
           state: { 
             email: response.data.email, 
             phase: response.data.phase 
           } 
        });
        return;
      }

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
    <Box className="auth-container" sx={{ position: 'relative', overflow: 'hidden' }}>
      <ShaderBackground />

      <LampContainer>
        <Box className="auth-panel form-panel">
          <Box className="auth-form-container" sx={{ position: 'relative', zIndex: 10 }}>
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
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              void handlePrimaryAction();
            }}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: authMode === 'login' && !needsBiometricSetup ? 'row' : 'column' },
              gap: 4
            }}
          >
            {/* Left Column: Email / Password */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="new-password"
                inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
                autoFocus={authMode !== 'verifyDevice'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={authMode === 'verifyDevice' || loading}
              />

              {authMode === 'login' && !needsBiometricSetup && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="password"
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              {authMode === 'login' && !needsBiometricSetup && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    onClick={() => void handlePasswordLogin()}
                    fullWidth
                    variant="contained"
                    size="medium"
                    disabled={loading}
                    startIcon={<KeyRound />}
                    sx={{ py: 1 }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in with Password'}
                  </Button>
                </Box>
              )}

              {authMode === 'verifyDevice' && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="code"
                  label="6-Digit Verification Code"
                  name="code"
                  autoComplete="new-password"
                  inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
                  autoFocus
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={loading}
                />
              )}

              {authMode === 'verifyDevice' && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="medium"
                    sx={{ py: 1, mb: 2 }}
                    disabled={loading}
                    startIcon={buttonIcon}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : buttonLabel}
                  </Button>
                  
                  <Button
                    onClick={() => void handleResendDeviceCode()}
                    fullWidth
                    variant="outlined"
                    disabled={resendDisabled || loading}
                    sx={{ py: 0.5 }}
                  >
                    {resendDisabled ? `Resend Code in ${countdown}s` : 'Request New Code'}
                  </Button>
                </Box>
              )}

              {authMode === 'login' && needsBiometricSetup && (
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="medium"
                  sx={{ mt: 3, mb: 2, py: 1 }}
                  disabled={loading}
                  startIcon={<UserPlus />}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Register Biometrics'}
                </Button>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {authMode === 'login' && !needsBiometricSetup && (
                <Typography variant="body2" align="center" sx={{ mt: 3 }}>
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

            {/* Right Column: Quick Sign In */}
            {authMode === 'login' && !needsBiometricSetup && (
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                borderLeft: { xs: 'none', md: '1px solid rgba(255,255,255,0.2)' },
                borderTop: { xs: '1px solid rgba(255,255,255,0.2)', md: 'none' },
                pt: { xs: 3, md: 0 },
                pl: { xs: 0, md: 4 }
              }}>
                <Typography align="center" sx={{ mb: 3, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 600 }}>
                  QUICK SIGN IN
                </Typography>

                <Button
                  onClick={() => void handleBiometricLogin('fingerprint')}
                  fullWidth
                  variant="outlined"
                  size="medium"
                  disabled={loading}
                  startIcon={<Fingerprint />}
                  sx={{ py: 1, mb: 2, borderColor: '#cbd5e1', color: '#0f172a' }}
                >
                  Sign in with Fingerprint
                </Button>

                <Button
                  onClick={() => {
                    const normalizedEmail = normalizeEmail(email);
                    if (!normalizedEmail) {
                      setError('Please enter your email first to use Face Capture.');
                      return;
                    }
                    setError('');
                    setIsCapturingFace(true);
                  }}
                  fullWidth
                  variant="outlined"
                  size="medium"
                  disabled={loading}
                  startIcon={<ScanFace />}
                  sx={{ py: 1, borderColor: '#cbd5e1', color: '#0f172a' }}
                >
                  Sign in with Face Capture
                </Button>
              </Box>
            )}
          </Box>
        </Box>
        </Box>
      </LampContainer>

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
            autoComplete="new-password"
            inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
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
            autoComplete="new-password"
            inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
            value={resetCode}
            onChange={(event) => setResetCode(event.target.value)}
          />
          <TextField
            margin="normal"
            fullWidth
            label="New Password"
            type={showResetPassword ? 'text' : 'password'}
            autoComplete="new-password"
            inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowResetPassword(!showResetPassword)} edge="end">
                    {showResetPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Confirm New Password"
            type={showResetPassword ? 'text' : 'password'}
            autoComplete="new-password"
            inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
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

      <Dialog 
        open={isCapturingFace} 
        onClose={() => setIsCapturingFace(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          style: {
            backgroundColor: 'rgba(10, 10, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            boxShadow: '0 0 40px rgba(0, 212, 255, 0.1)',
            padding: '20px'
          }
        }}
      >
        <DialogTitle align="center" sx={{ color: 'white', mb: 2 }}>
          Face Login Verification
        </DialogTitle>
        <DialogContent>
          {isCapturingFace && (
            <FaceCapture 
              onCapture={handleFaceLogin} 
              onCancel={() => setIsCapturingFace(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
