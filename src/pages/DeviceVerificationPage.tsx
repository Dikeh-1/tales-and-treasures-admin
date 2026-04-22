import React, { useState } from 'react';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Alert, Link, CircularProgress } from '@mui/material';
import apiClient from '../api/apiClient';
import LoadingOverlay from '../components/LoadingOverlay';

export default function DeviceVerificationPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  // If a user lands on this page without an email, send them back to login
  if (!email) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async () => {
    if (!code || code.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient.post(`/auth/verify-device`, { email, code });
      // On success, redirect back to the login page with a success message
      navigate('/login', { state: { message: 'Device verified! You may now sign in with your biometrics.' } });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. The code may be incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="auth-container">
      <div className="auth-background"></div>
      <Box className="auth-panel form-panel">
        <Box className="auth-form-container" sx={{ position: 'relative' }}>
          {loading && <LoadingOverlay message="Verifying Device..." />}
          <Typography component="h1" variant="h4" className="auth-title">
            Authorize New Device
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }} className="auth-subtitle">
            For your security, we've sent a verification code to <strong>{email}</strong>. Please enter it below.
          </Typography>
          <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="code"
              label="6-Digit Verification Code"
              name="code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              Authorize Device
            </Button>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Typography variant="body2" align="center" className="auth-link-text">
              Having trouble?{' '}
              <Link component={RouterLink} to="/login" variant="body2">
                Return to Login
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}