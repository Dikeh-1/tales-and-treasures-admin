import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  CircularProgress,
} from '@mui/material';
// Removed MUI visibility
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types';
import { Fingerprint, CheckCircle, ScanFace, Eye, EyeOff } from 'lucide-react';
import '../styles/AuthPages.css';
import LoadingOverlay from '../components/LoadingOverlay';
import FaceCapture from '../components/FaceCapture';
import AnimatedAuthLayout from '../components/ui/AnimatedAuthLayout';

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
  const [isCapturingFace, setIsCapturingFace] = useState<boolean>(false);
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

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
      toast.success('Fingerprint configured successfully!');

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

  const handleFaceCapture = async (descriptorJSON: string) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/face-register', { email, descriptor: descriptorJSON });
      toast.success('Face Capture configured successfully!');
      setIsCapturingFace(false);
      setActiveStep(4);
    } catch (err) {
      setError(getErrorMessage(err, 'Face configuration failed.'));
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

  const title = activeStep === 4 ? "Configuration Complete!" : "Admin Registration";
  const subtitle = activeStep === 4 
    ? "Welcome aboard, Admin. All 3 factors are strictly secured." 
    : "Complete all steps to secure your account.";

  return (
    <AnimatedAuthLayout
      title={title}
      subtitle={subtitle}
      passwordLength={password.length}
      showPassword={showPassword}
      isTyping={isTyping}
    >
      <div className="relative w-full">
        {loading && <LoadingOverlay message={overlayMessage} />}

        {activeStep < 4 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-4 relative z-10 px-2">
            {steps.map((label, index) => (
              <div 
                key={label}
                className={`flex items-center gap-2 text-sm font-medium ${
                  index === activeStep 
                    ? 'text-white' 
                    : index < activeStep 
                      ? 'text-zinc-500' 
                      : 'text-zinc-700'
                }`}
              >
                <div className={`flex items-center justify-center size-6 rounded-full text-xs ${
                  index === activeStep 
                    ? 'bg-zinc-100 text-zinc-900' 
                    : index < activeStep 
                      ? 'bg-zinc-800 text-zinc-400' 
                      : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                }`}>
                  {index + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
                {index < steps.length - 1 && (
                  <div className={`h-[1px] w-4 sm:w-8 ${index < activeStep ? 'bg-zinc-700' : 'bg-zinc-800'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {activeStep === 0 && (
          <form
            noValidate
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              void handleInitiateRegistration();
            }}
            className="flex flex-col gap-3 w-full"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-medium text-zinc-300">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                required
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 pl-4 pr-12 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-zinc-500">At least 8 characters with letters and numbers.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 pl-4 pr-12 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400 mt-2">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Continue Setup'}
            </button>
          </form>
        )}

        {activeStep === 1 && (
          <form
            noValidate
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              void handleVerifyCode();
            }}
            className="flex flex-col gap-4 w-full"
          >
            <div className="text-center text-sm text-zinc-400 mb-2">
              We sent a 6-digit code to <strong className="text-zinc-200">{email}</strong>. Enter it below.
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="code" className="text-sm font-medium text-zinc-300">
                Verification Code
              </label>
              <input
                id="code"
                name="code"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-700 outline-none transition-all tracking-[0.5em] text-center text-xl font-mono"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400 mt-2">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 mt-2">
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={resendDisabled || loading}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendDisabled ? `Resend in ${countdown}s` : 'Resend Code'}
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="h-12 px-8 rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Verify Email'}
              </button>
            </div>
          </form>
        )}

        {activeStep === 2 && (
          <div className="flex flex-col gap-4 w-full text-center">
            <h3 className="text-xl font-semibold text-zinc-100">Step 2: Fingerprint Configuration</h3>
            <p className="text-sm text-zinc-400 mb-4">
              For absolute security, we require you to register a physical fingerprint on this device.
            </p>

            <button
              onClick={() => void handleBiometricRegister('fingerprint')}
              disabled={loading}
              className="h-12 w-full rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Fingerprint size={20} />
              Scan Fingerprint
            </button>

            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400 mt-2">
                {error}
              </div>
            )}
          </div>
        )}

        {activeStep === 3 && (
          <div className="flex flex-col gap-4 w-full text-center">
            <h3 className="text-xl font-semibold text-zinc-100">Step 3: Face Capture Configuration</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Finally, register your face capture. This acts as your independent third authentication factor.
            </p>

            {isCapturingFace ? (
              <FaceCapture 
                onCapture={handleFaceCapture} 
                onCancel={() => setIsCapturingFace(false)} 
              />
            ) : (
              <button
                onClick={() => setIsCapturingFace(true)}
                disabled={loading}
                className="h-12 w-full rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ScanFace size={20} />
                Scan Face
              </button>
            )}

            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400 mt-2">
                {error}
              </div>
            )}
          </div>
        )}

        {activeStep === 4 && (
          <div className="flex flex-col items-center gap-4 w-full text-center py-4">
            <CheckCircle size={64} className="text-emerald-400 mb-2" />
            
            <RouterLink 
              to="/login"
              className="h-12 w-full rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors mt-6 flex items-center justify-center"
            >
              Proceed to Secure Login
            </RouterLink>
          </div>
        )}

        {activeStep < 4 && (
          <div className="text-center text-sm text-zinc-400 mt-4 mb-2">
            Already have an account?{' '}
            <RouterLink to="/login" className="font-semibold text-white hover:underline">
              Sign In
            </RouterLink>
          </div>
        )}

        {/* Custom Disclaimer Modal */}
        {disclaimerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800">
                <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
                  ⚠️ Strict Hardware Requirements
                </h2>
              </div>
              <div className="p-6 text-zinc-300 text-sm flex flex-col gap-4">
                <p>
                  To proceed with registration, this device <strong>MUST</strong> be equipped with a hardware <strong>Fingerprint Sensor</strong> and a <strong>Camera</strong>.
                </p>
                <p>
                  If your current device does not have these sensors, please click <strong>Cancel</strong>, and resume this registration on a compatible device (e.g., your smartphone or a modern laptop) by simply logging in.
                </p>
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                <button
                  onClick={handleCancelDisclaimer}
                  className="px-4 py-2 rounded-xl text-zinc-400 font-medium hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel & Terminate
                </button>
                <button
                  onClick={handleAgreeDisclaimer}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  I Agree, I Have Sensors
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedAuthLayout>
  );
}
