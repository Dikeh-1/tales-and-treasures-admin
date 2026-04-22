import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
} from '@mui/material';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types';
import { Fingerprint, CheckCircle } from 'lucide-react';
import '../styles/AuthPages.css';
import LoadingOverlay from '../components/LoadingOverlay';

const steps = ['Enter Details', 'Verify Email', 'Configure Access', 'Success'];

function isStrongEnough(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function getErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as { response?: { data?: { message?: string } }; message?: string };
  return maybeError?.response?.data?.message || maybeError?.message || fallback;
}

export default function RegistrationPage(): JSX.Element {
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
  const [registrationOptions, setRegistrationOptions] = useState<unknown>(null);
  const [biometricRegistered, setBiometricRegistered] = useState<boolean>(false);

  const countdownRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
      }
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
      const response = await apiClient.post('/auth/verify-email', { email, code });
      setRegistrationOptions(response.data?.registrationOptions || null);
      toast.success('Email verified! Configure access options next.');
      setActiveStep(2);
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
            if (countdownRef.current) {
              window.clearInterval(countdownRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimeout(() => setResendDisabled(false), 30000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resend code.'));
      setResendDisabled(false);
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
      }
    }
  };

  const handleBiometricRegister = async () => {
    setLoading(true);
    setError('');
    try {
      if (!registrationOptions) {
        throw new Error('Registration options not found. Please restart registration.');
      }

      const attestation = await startRegistration({
        optionsJSON:
          registrationOptions as PublicKeyCredentialCreationOptionsJSON,
      });
      await apiClient.post('/auth/verify-registration', {
        email,
        attestationResponse: attestation,
      });

      setBiometricRegistered(true);
      toast.success('Biometric login has been enabled.');
    } catch (err) {
      setError(getErrorMessage(err, 'Biometric registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setActiveStep(3);
  };

  const overlayMessage = (() => {
    if (activeStep === 0) return 'Creating account...';
    if (activeStep === 1) return 'Verifying email...';
    if (activeStep === 2) return 'Configuring security...';
    return 'Finalizing registration...';
  })();

  return (
    <Box className="auth-container">
      <div className="auth-background"></div>

      <Box className="auth-panel branding-panel">
        <Box>
          <Typography className="branding-logo">Tales & Treasures</Typography>
          <Typography variant="h2" className="branding-quote">
            Calm systems. Clear impact. Better literacy outcomes.
          </Typography>
          <Typography className="branding-author">Securely set up your admin workspace.</Typography>
        </Box>
      </Box>

      <Box className="auth-panel form-panel">
        <Box className="auth-form-container" role="main" sx={{ position: 'relative' }}>
          {loading && <LoadingOverlay message={overlayMessage} />}

          <Typography component="h1" variant="h4" align="center" className="auth-title">
            Admin Registration
          </Typography>

          <Stepper
            activeStep={activeStep}
            className="auth-stepper"
            sx={{
              pt: 3,
              pb: 5,
              flexWrap: 'wrap',
              gap: { xs: 1, sm: 2 },
              '& .MuiStepLabel-label': {
                fontSize: { xs: '0.8rem', sm: '0.95rem', md: '1.2rem' },
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
                type="password"
                fullWidth
                margin="normal"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                helperText="At least 8 characters with letters and numbers."
              />
              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                margin="normal"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant="contained" type="submit" disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : 'Next'}
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
                <Button variant="contained" type="submit" disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : 'Verify'}
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Account Access Setup
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Your password has been set. You can optionally enable biometric login now.
              </Typography>

              <Button
                onClick={() => void handleBiometricRegister()}
                variant="contained"
                size="large"
                startIcon={<Fingerprint />}
                disabled={loading || biometricRegistered}
                sx={{ mr: 1, mb: 1 }}
              >
                {loading
                  ? <CircularProgress size={20} color="inherit" />
                  : biometricRegistered
                    ? 'Biometric Enabled'
                    : 'Enable Face/Fingerprint'}
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={handleFinish}
                sx={{ mb: 1 }}
              >
                {biometricRegistered ? 'Continue' : 'Skip For Now'}
              </Button>

              {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
            </Box>
          )}

          {activeStep === 3 && (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <CheckCircle size={64} style={{ color: '#34d399', marginBottom: '16px' }} />
              <Typography variant="h5" gutterBottom className="auth-title">
                Registration Successful!
              </Typography>
              <Typography className="auth-subtitle">
                Welcome aboard, Admin <strong>{name.split(' ')[0]}</strong>!
              </Typography>
              <Button component={RouterLink} to="/login" variant="contained" sx={{ mt: 3 }}>
                Proceed to Login
              </Button>
            </Box>
          )}

          {activeStep < 3 && (
            <Typography variant="body2" align="center" className="auth-link-text">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" variant="body2">
                Sign In
              </Link>
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
