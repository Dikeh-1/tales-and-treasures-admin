import React, { useState } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  Box,
  CircularProgress,
} from '@mui/material';
import apiClient from '../api/apiClient';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, ShieldCheck, UserPlus, KeyRound, ScanFace, Eye, EyeOff } from 'lucide-react';
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
      <div className="relative w-full">
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
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4 text-sm text-emerald-400 mb-6">
            {successMessage}
          </div>
        )}

        <form
          noValidate
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            void handlePrimaryAction();
          }}
          className="flex flex-col gap-4 w-full"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              autoFocus={authMode !== 'verifyDevice'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
              disabled={authMode === 'verifyDevice' || loading}
              className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all"
            />
          </div>

          {authMode === 'login' && !needsBiometricSetup && (
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  disabled={loading}
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
          )}

          {authMode === 'verifyDevice' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="code" className="text-sm font-medium text-zinc-300">
                6-Digit Verification Code
              </label>
              <input
                id="code"
                name="code"
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                disabled={loading}
                className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all tracking-[0.5em] text-center text-xl font-mono"
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {authMode === 'login' && !needsBiometricSetup && (
            <div className="flex justify-between items-center text-sm mt-2">
              <div className="flex items-center gap-2">
                {/* Checkbox placeholder from image */}
                <input type="checkbox" id="remember" className="rounded bg-zinc-950 border-zinc-800 checked:bg-white checked:text-zinc-900 size-4" />
                <label htmlFor="remember" className="text-zinc-400 cursor-pointer hover:text-zinc-300">Remember for 30 days</label>
              </div>
              <RouterLink to="/forgot-password" className="font-medium text-zinc-300 hover:text-white transition-colors">
                Forgot password?
              </RouterLink>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : (
              <>
                {buttonLabel}
              </>
            )}
          </button>

          {authMode === 'verifyDevice' && (
            <button
              type="button"
              onClick={() => void handleResendDeviceCode()}
              disabled={resendDisabled || loading}
              className="h-12 w-full rounded-xl border border-zinc-800 bg-transparent text-zinc-300 font-medium hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendDisabled ? `Resend Code in ${countdown}s` : 'Request New Code'}
            </button>
          )}

          {authMode === 'login' && !needsBiometricSetup && (
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-4 before:h-px before:flex-1 before:bg-zinc-800 after:h-px after:flex-1 after:bg-zinc-800 text-zinc-500 text-xs font-medium uppercase tracking-wider">
                Quick Sign In
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void handleBiometricLogin('fingerprint')}
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 text-zinc-300 font-medium hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Fingerprint size={18} /> Fingerprint
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const normalizedEmail = normalizeEmail(email);
                    if (!normalizedEmail) {
                      setError('Please enter your email first to use Face Capture.');
                      return;
                    }
                    setError('');
                    setIsCapturingFace(true);
                  }}
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 text-zinc-300 font-medium hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ScanFace size={18} /> Face Capture
                </button>
              </div>
            </div>
          )}

          {!needsBiometricSetup && (
            <div className="text-center text-sm text-zinc-400 mt-4">
              Don't have an account?{' '}
              <RouterLink to="/register" className="font-semibold text-white hover:underline">
                Sign Up
              </RouterLink>
            </div>
          )}
        </form>
      </div>

      {isCapturingFace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6">
            <h2 className="text-xl font-bold text-white text-center mb-4">
              Face Login Verification
            </h2>
            <FaceCapture 
              onCapture={handleFaceLogin} 
              onCancel={() => setIsCapturingFace(false)} 
            />
          </div>
        </div>
      )}
    </AnimatedAuthLayout>
  );
}
