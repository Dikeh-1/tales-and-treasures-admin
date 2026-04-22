import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Link,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types';
import { Fingerprint, CheckCircle, ScanFace } from 'lucide-react';
import '../styles/AuthPages.css';
import LoadingOverlay from '../components/LoadingOverlay';

const steps = ['Details', 'Verify Email', 'Fingerprint', 'Face Capture', 'Success'];

function isStrongEnough(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function getErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as { response?: { data?: { message?: string } }; message?: string };
  return maybeError?.response?.data?.message || maybeError?.message || fallback;
}

export default function RegistrationPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState<boolean>(false);

  const countdownRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Resume registration if redirected from Login
  useEffect(() => {
    const state = location.state as { email?: string; phase?: string };
    if (state?.email) {
      setEmail(state.email);
    }
    if (state?.phase) {
      if (state.phase === 'PENDING_EMAIL') setActiveStep(1);
      if (state.phase === 'PENDING_FINGERPRINT') {
        setActiveStep(2);
        setDisclaimerOpen(true);
      }
      if (state.phase === 'PENDING_FACE') setActiveStep(3);
      if (state.phase === 'COMPLETED') setActiveStep(4);
    }
  }, [location]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleInitiateRegistration = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Name, email, password and confirmation are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isStrongEnough(password)) {
      setError('Password must be at least 8 characters and include letters and numbers.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/register', { name, email, password });
      setActiveStep(1);
      toast.success('Verification code sent to your email.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to initiate registration.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      setError('Verification code is required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/verify-email', { email, code });
      toast.success('Email verified! Configure access options next.');
      setActiveStep(2);
      setDisclaimerOpen(true); // Show disclaimer before moving to fingerprint
    } catch (err) {
      setError(getErrorMessage(err, 'Verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setCountdown(30);
    setError('');
    try {
      const { data } = await apiClient.post('/auth/resend-verification', { email });
      toast.success(data?.message || 'New verification code sent!');

      countdownRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) window.clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timeoutRef.current = setTimeout(() => setResendDisabled(false), 30000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resend code.'));
      setResendDisabled(false);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    }
  };

  const handleCancelDisclaimer = () => {
    setDisclaimerOpen(false);
    toast.error('Session terminated. You must use a compatible device.');
    navigate('/login');
  };

  const handleAgreeDisclaimer = () => {
    setDisclaimerOpen(false);
  };

  const handleBiometricRegister = async (type: 'fingerprint' | 'face') => {
    setLoading(true);
    setError('');
    try {
      const optionsRes = await apiClient.post('/auth/biometric-options', { email });
      
      const attestation = await startRegistration({
        optionsJSON: optionsRes.data as PublicKeyCredentialCreationOptionsJSON,
      });

      const verifyRes = await apiClient.post('/auth/verify-registration', {
        email,
        attestationResponse: attestation,
      });

      const phase = verifyRes.data.phase;
      toast.success(`${type === 'fingerprint' ? 'Fingerprint' : 'Face'} configured successfully!`);

      if (phase === 'PENDING_FACE') {
        setActiveStep(3);
      } else if (phase === 'COMPLETED') {
        setActiveStep(4);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Biometric configuration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const overlayMessage = (() => {
    if (activeStep === 0) return 'Creating account...';
    if (activeStep === 1) return 'Verifying email...';
    if (activeStep === 2) return 'Awaiting fingerprint...';
    if (activeStep === 3) return 'Awaiting face scan...';
    return 'Finalizing...';
  })();

  return (
    <Box className="auth-container">
      <Box className="auth-panel branding-panel" sx={{
        backgroundImage: 'linear-gradient(rgba(10, 79, 102, 0.7), rgba(6, 43, 56, 0.9)), url("https://images.unsplash.com/photo-1497604401993-f2e9ce748969?auto=format&fit=crop&q=80&w=2000")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <Box sx={{ zIndex: 2, position: 'relative' }}>
          <Typography className="branding-logo">Tales & Treasures</Typography>
          <Typography variant="h2" className="branding-quote" sx={{ color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            Calm systems. Clear impact.
          </Typography>
          <Typography className="branding-author" sx={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            Securely set up your admin workspace with mandatory 3-factor access.
          </Typography>
        </Box>
      </Box>

      <Box className="auth-panel form-panel">
        <Box className="auth-form-container" role="main" sx={{ position: 'relative' }}>
          {loading && <LoadingOverlay message={overlayMessage} />}

          <Typography component="h1" variant="h4" align="center" className="auth-title">
            Admin Registration
          </Typography>
          <Typography align="center" color="text.secondary" sx={{ mb: 2 }}>
            Complete all steps to secure your account.
          </Typography>

          <Stepper
            activeStep={activeStep}
            className="auth-stepper"
            sx={{
              pt: 2,
              pb: 4,
              flexWrap: 'wrap',
              gap: { xs: 1, sm: 2 },
              '& .MuiStepLabel-label': {
                fontSize: { xs: '0.75rem', sm: '0.9rem' },
                textAlign: 'center',
              },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Box
              component="form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handleInitiateRegistration();
              }}
            >
              <TextField
                label="Full Name"
                fullWidth
                margin="normal"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                helperText="At least 8 characters with letters and numbers."
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
              <TextField
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant="contained" type="submit" disabled={loading} size="large">
                  {loading ? <CircularProgress size={20} /> : 'Continue Setup'}
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box
              component="form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handleVerifyCode();
              }}
            >
              <Typography color="text.secondary" align="center" sx={{ mb: 2 }}>
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
              </Typography>
              <TextField
                label="Verification Code"
                fullWidth
                margin="normal"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                <Button onClick={() => void handleResend()} disabled={resendDisabled} size="small">
                  {resendDisabled ? `Resend in ${countdown}s` : 'Resend Code'}
                </Button>
                <Button variant="contained" type="submit" disabled={loading} size="large">
                  {loading ? <CircularProgress size={20} /> : 'Verify Email'}
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Step 2: Fingerprint Configuration
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                For absolute security, we require you to register a physical fingerprint on this device.
              </Typography>

              <Button
                onClick={() => void handleBiometricRegister('fingerprint')}
                variant="contained"
                size="large"
                fullWidth
                startIcon={<Fingerprint />}
                disabled={loading}
                sx={{ mb: 2, py: 1.5 }}
              >
                Scan Fingerprint
              </Button>

              {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
            </Box>
          )}

          {activeStep === 3 && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Step 3: Face Capture Configuration
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Finally, register your face capture. This acts as your third authentication factor.
              </Typography>

              <Button
                onClick={() => void handleBiometricRegister('face')}
                variant="contained"
                size="large"
                fullWidth
                startIcon={<ScanFace />}
                disabled={loading}
                sx={{ mb: 2, py: 1.5 }}
              >
                Scan Face
              </Button>

              {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
            </Box>
          )}

          {activeStep === 4 && (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <CheckCircle size={64} style={{ color: '#34d399', marginBottom: '16px' }} />
              <Typography variant="h5" gutterBottom className="auth-title">
                Configuration Complete!
              </Typography>
              <Typography className="auth-subtitle">
                Welcome aboard, Admin. All 3 factors are strictly secured.
              </Typography>
              <Button component={RouterLink} to="/login" variant="contained" size="large" fullWidth sx={{ mt: 4 }}>
                Proceed to Secure Login
              </Button>
            </Box>
          )}

          {activeStep < 4 && (
            <Typography variant="body2" align="center" className="auth-link-text">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" variant="body2">
                Sign In
              </Link>
            </Typography>
          )}
        </Box>
      </Box>

      <Dialog open={disclaimerOpen} onClose={handleCancelDisclaimer} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          ⚠️ Strict Hardware Requirements
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            To proceed with registration, this device <strong>MUST</strong> be equipped with a hardware <strong>Fingerprint Sensor</strong> and a <strong>Camera</strong>.
          </DialogContentText>
          <DialogContentText>
            If your current device does not have these sensors, please click <strong>Cancel</strong>, and resume this registration on a compatible device (e.g., your smartphone or a modern laptop) by simply logging in.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCancelDisclaimer} color="inherit">
            Cancel & Terminate
          </Button>
          <Button onClick={handleAgreeDisclaimer} variant="contained" color="error" size="large">
            I Agree, I Have A Fingerprint Sensor
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
