import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import apiClient from '../api/apiClient';

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email, please wait...');

  useEffect(() => {
    const email = searchParams.get('email');
    const code = searchParams.get('code') || searchParams.get('token');
    if (!email || !code) {
      setStatus('error');
      setMessage('Verification link is invalid. Please use the code sent to your email instead.');
      return;
    }

    const verify = async () => {
      try {
        const response = await apiClient.post('/auth/verify-email', { email, code });
        setStatus('success');
        setMessage(response.data.message);

        setTimeout(() => {
          navigate('/register');
        }, 2500);
      } catch (err) {
        const maybeErr = err as { response?: { data?: { message?: string } } };
        setStatus('error');
        setMessage(
          maybeErr.response?.data?.message || 'Verification failed. The link may have expired.'
        );
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <Box className="auth-container">
      <div className="auth-background"></div>
      <Box className="auth-panel form-panel">
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }} className="auth-form-container">
          {status === 'verifying' && <CircularProgress sx={{ mb: 2 }} />}
          <Typography variant="h5" gutterBottom className="auth-title">
            {status === 'success' && 'Verification Complete!'}
            {status === 'error' && 'Verification Failed'}
            {status === 'verifying' && 'Verifying Email'}
          </Typography>
          <Alert severity={status === 'success' ? 'success' : status === 'error' ? 'error' : 'info'}>
            {message}
          </Alert>
          {status === 'success' && (
            <Typography sx={{ mt: 2 }} className="auth-subtitle">
              Redirecting you to complete your registration...
            </Typography>
          )}
          {status === 'error' && (
            <Button component={Link} to="/register" variant="contained" sx={{ mt: 3 }}>
              Return to Registration
            </Button>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
