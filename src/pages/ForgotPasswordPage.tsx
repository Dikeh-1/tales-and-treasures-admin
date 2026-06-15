import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  CircularProgress,
} from '@mui/material';
// Removed MUI visibility
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import AnimatedAuthLayout from '../components/ui/AnimatedAuthLayout';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

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
      <div className="relative w-full">
        <RouterLink 
          to="/login" 
          className="flex items-center gap-1 mb-6 font-medium text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Back to login
        </RouterLink>

        {step === 'request' ? (
          <form
            noValidate
            autoComplete="off"
            onSubmit={handleSendResetCode}
            className="flex flex-col gap-4 w-full"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                disabled={sendingResetCode}
                className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={sendingResetCode}
              className="h-12 w-full rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingResetCode ? <CircularProgress size={20} color="inherit" /> : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form
            noValidate
            autoComplete="off"
            onSubmit={handleResetPassword}
            className="flex flex-col gap-4 w-full"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="code" className="text-sm font-medium text-zinc-300">
                Reset Code
              </label>
              <input
                id="code"
                name="code"
                required
                autoFocus
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all tracking-[0.5em] text-center text-xl font-mono"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-zinc-300">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 pl-4 pr-12 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={resettingPassword}
              className="h-12 w-full rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resettingPassword ? <CircularProgress size={20} color="inherit" /> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </AnimatedAuthLayout>
  );
}
