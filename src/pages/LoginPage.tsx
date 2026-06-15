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
import AnimatedAuthLayout from '../components/ui/AnimatedAuthLayout';
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
  const [isTyping, setIsTyping] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
  const [needsBiometricSetup, setNeedsBiometricSetup] = useState(false);
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);

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
        navigate('/forgot-password');
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

  const title = authMode === 'verifyDevice'
    ? 'Authorize New Device'
    : needsBiometricSetup
      ? 'Complete Biometric Setup'
      : 'Admin Sign In';

  const subtitleText = needsBiometricSetup
    ? 'This account has no biometrics yet. Register this device to use biometric sign in.'
    : authMode === 'verifyDevice'
      ? `For your security, we've sent a code to ${email}.`
      : authMethod === 'password'
        ? 'Sign in with your email and password.'
        : 'Use your registered device to sign in securely.';

  return (
    <AnimatedAuthLayout
      title={title}
      subtitle={subtitleText}
      passwordLength={password.length}
      showPassword={showPassword}
      isTyping={isTyping}
    >
      <Box sx={{ position: 'relative', width: '100%' }}>
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
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

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
            flexDirection: 'column',
            gap: 3
          }}
        >
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
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
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
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
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
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
              disabled={loading}
            />
          )}

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {authMode === 'login' && !needsBiometricSetup && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 1 }}>
              <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ fontWeight: 500 }}>
                Forgot password?
              </Link>
            </Box>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={buttonIcon}
            sx={{ py: 1.5, mt: 1 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : buttonLabel}
          </Button>

          {authMode === 'verifyDevice' && (
            <Button
              onClick={() => void handleResendDeviceCode()}
              fullWidth
              variant="outlined"
              disabled={resendDisabled || loading}
              sx={{ py: 1, mt: 1 }}
            >
              {resendDisabled ? `Resend Code in ${countdown}s` : 'Request New Code'}
            </Button>
          )}

          {authMode === 'login' && !needsBiometricSetup && (
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography align="center" variant="overline" sx={{ color: 'text.secondary' }}>
                Quick Sign In
              </Typography>
              
              <Button
                onClick={() => void handleBiometricLogin('fingerprint')}
                fullWidth
                variant="outlined"
                size="large"
                disabled={loading}
                startIcon={<Fingerprint />}
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
                size="large"
                disabled={loading}
                startIcon={<ScanFace />}
              >
                Sign in with Face Capture
              </Button>
            </Box>
          )}

          {!needsBiometricSetup && (
            <Typography variant="body2" align="center" sx={{ mt: 3, color: 'text.secondary' }}>
              First time here?{' '}
              <Link component={RouterLink} to="/register" variant="body2" sx={{ fontWeight: 600 }}>
                Register a new admin account.
              </Link>
            </Typography>
          )}
        </Box>
      </Box>

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
    </AnimatedAuthLayout>
  );
}
