import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import AnimatedAuthLayout from '../components/ui/AnimatedAuthLayout';
import { ArrowLeft } from 'lucide-react';

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const [sendingResetCode, setSendingResetCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [step, setStep] = useState<'request' | 'reset'>('request');

  const navigate = useNavigate();

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = normalizeEmail(email);
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
      setStep('reset');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not send reset code.'));
    } finally {
      setSendingResetCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = normalizeEmail(email);
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
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not reset password.'));
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <AnimatedAuthLayout
      title={step === 'request' ? 'Forgot Password?' : 'Reset Password'}
      subtitle={
        step === 'request'
          ? "No worries, we'll send you reset instructions."
          : `We've sent a code to ${email}`
      }
      passwordLength={newPassword.length}
      showPassword={showPassword}
      isTyping={isTyping}
    >
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Link 
          component={RouterLink} 
          to="/login" 
          variant="body2" 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4, fontWeight: 500, color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
        >
          <ArrowLeft size={16} /> Back to login
        </Link>

        {step === 'request' ? (
          <Box
            component="form"
            noValidate
            autoComplete="off"
            onSubmit={handleSendResetCode}
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
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
              disabled={sendingResetCode}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={sendingResetCode}
              sx={{ py: 1.5, mt: 1 }}
            >
              {sendingResetCode ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Code'}
            </Button>
          </Box>
        ) : (
          <Box
            component="form"
            noValidate
            autoComplete="off"
            onSubmit={handleResetPassword}
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
              label="Reset Code"
              autoComplete="new-password"
              inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
              value={resetCode}
              onChange={(event) => setResetCode(event.target.value)}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
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
              margin="normal"
              required
              fullWidth
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              inputProps={{ autoComplete: 'new-password', form: { autoComplete: 'off' } }}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={resettingPassword}
              sx={{ py: 1.5, mt: 1 }}
            >
              {resettingPassword ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
            </Button>
          </Box>
        )}
      </Box>
    </AnimatedAuthLayout>
  );
}
