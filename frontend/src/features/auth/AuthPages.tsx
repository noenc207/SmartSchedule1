import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import type { LoginInput, RegisterInput } from '../../types/auth';
import { BrandLogo } from '../../components/BrandLogo';
import { isDemoMode, isRealMode } from '../../services/demoMode';
import { SocialAuthButtons } from './SocialAuthButtons';
import { GoogleRegistrationView } from './GoogleRegistrationView';
import { getApiErrorMessage } from '../../services/apiClient';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter at least 2 characters.').max(120),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(72)
    .regex(/[A-Z]/, 'Add at least one uppercase letter.')
    .regex(/[0-9]/, 'Add at least one number.'),
  confirmPassword: z.string(),
  activationKey: z.string().trim().min(1, 'Mã kích hoạt là bắt buộc (Activation key required).'),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Passwords do not match.',
});

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleAuth, demoLogin, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<{
    idToken: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  } | null>(null);
  const [keyModalError, setKeyModalError] = useState<string | null>(null);

  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  useEffect(() => clearError(), [clearError]);

  const onSubmit = async (values: LoginInput) => {
    try {
      await login(values);
      navigate((location.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true });
    } catch {
      /* server error is rendered */
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    setGoogleLoading(true);
    setKeyModalError(null);
    setSocialNotice(null);
    clearError();
    try {
      const res = await googleAuth({ idToken });
      if (res.status === 'AUTHENTICATED') {
        // CASE B: Existing account -> directly enter Dashboard!
        navigate((location.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true });
      } else if (res.status === 'KEY_REQUIRED') {
        // CASE A: New account -> transition to Registration Key card
        setPendingGoogleAuth({
          idToken,
          email: res.email || '',
          displayName: res.displayName,
          avatarUrl: res.avatarUrl,
        });
      }
    } catch {
      /* error is handled in authStore */
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleKeySubmit = async (registrationKey: string) => {
    if (!pendingGoogleAuth) return;
    setGoogleLoading(true);
    setKeyModalError(null);
    try {
      const res = await googleAuth({
        idToken: pendingGoogleAuth.idToken,
        registrationKey,
      });
      if (res.status === 'AUTHENTICATED') {
        setPendingGoogleAuth(null);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setKeyModalError(getApiErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  // If new Google user detected, show the dedicated Create Account screen
  if (pendingGoogleAuth) {
    return (
      <AuthLayout
        title="Create your SmartSchedule account"
        subtitle="Registration Key is required only for your first registration."
      >
        <GoogleRegistrationView
          email={pendingGoogleAuth.email}
          displayName={pendingGoogleAuth.displayName}
          avatarUrl={pendingGoogleAuth.avatarUrl}
          isLoading={googleLoading}
          error={keyModalError}
          onSubmit={handleKeySubmit}
          onBack={() => {
            setPendingGoogleAuth(null);
            setKeyModalError(null);
            clearError();
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to turn your academic commitments into a realistic study plan.">
      {socialNotice && (
        <div className="social-notice" role="alert">
          {socialNotice}
        </div>
      )}

      <SocialAuthButtons
        onGoogleToken={handleGoogleToken}
        isLoading={googleLoading}
        onNotice={(msg) => setSocialNotice(msg)}
      />

      <div className="auth-divider">
        <span>or continue with email</span>
      </div>

      <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <div className="password-field">
            <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...form.register('password')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </Field>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-button auth-submit" disabled={form.formState.isSubmitting || googleLoading}>
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {!isRealMode() && (import.meta.env.DEV || isDemoMode()) && (
        <button
          className="secondary-button auth-demo"
          type="button"
          onClick={() => { demoLogin(); navigate('/dashboard', { replace: true }); }}
        >
          Continue in demo mode (Alex Nguyen · FPT University Quy Nhơn)
        </button>
      )}

      <p className="auth-switch">New to SmartSchedule? <Link to="/register">Create an account</Link></p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, googleAuth, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showActivationKey, setShowActivationKey] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<{
    idToken: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  } | null>(null);
  const [keyModalError, setKeyModalError] = useState<string | null>(null);

  const form = useForm<RegisterInput & { confirmPassword: string }>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '', activationKey: '' },
  });
  useEffect(() => clearError(), [clearError]);

  const onSubmit = async ({ confirmPassword: _confirmPassword, ...values }: RegisterInput & { confirmPassword: string }) => {
    try {
      await register(values);
      navigate('/dashboard', { replace: true });
    } catch {
      /* server error is rendered */
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    setGoogleLoading(true);
    setKeyModalError(null);
    setSocialNotice(null);
    clearError();
    try {
      const res = await googleAuth({ idToken });
      if (res.status === 'AUTHENTICATED') {
        navigate('/dashboard', { replace: true });
      } else if (res.status === 'KEY_REQUIRED') {
        setPendingGoogleAuth({
          idToken,
          email: res.email || '',
          displayName: res.displayName,
          avatarUrl: res.avatarUrl,
        });
      }
    } catch {
      /* error is handled in authStore */
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleKeySubmit = async (registrationKey: string) => {
    if (!pendingGoogleAuth) return;
    setGoogleLoading(true);
    setKeyModalError(null);
    try {
      const res = await googleAuth({
        idToken: pendingGoogleAuth.idToken,
        registrationKey,
      });
      if (res.status === 'AUTHENTICATED') {
        setPendingGoogleAuth(null);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setKeyModalError(getApiErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  if (pendingGoogleAuth) {
    return (
      <AuthLayout
        title="Create your SmartSchedule account"
        subtitle="Registration Key is required only for your first registration."
      >
        <GoogleRegistrationView
          email={pendingGoogleAuth.email}
          displayName={pendingGoogleAuth.displayName}
          avatarUrl={pendingGoogleAuth.avatarUrl}
          isLoading={googleLoading}
          error={keyModalError}
          onSubmit={handleKeySubmit}
          onBack={() => {
            setPendingGoogleAuth(null);
            setKeyModalError(null);
            clearError();
          }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your workspace" subtitle="Start with your university timetable, then let the engine find the time.">
      {socialNotice && (
        <div className="social-notice" role="alert">
          {socialNotice}
        </div>
      )}

      <SocialAuthButtons
        onGoogleToken={handleGoogleToken}
        isLoading={googleLoading}
        onNotice={(msg) => setSocialNotice(msg)}
      />

      <div className="auth-divider">
        <span>or register with email</span>
      </div>

      <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Field label="Display name" error={form.formState.errors.displayName?.message}>
          <input autoComplete="name" {...form.register('displayName')} />
        </Field>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Password" hint="At least 8 characters, one uppercase letter, and one number." error={form.formState.errors.password?.message}>
          <div className="password-field">
            <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...form.register('password')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </Field>
        <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
          <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...form.register('confirmPassword')} />
        </Field>
        <Field label="Mã kích hoạt (Activation Key)" hint="Yêu cầu mã kích hoạt do ban quản trị cấp trong đợt thử nghiệm này." error={form.formState.errors.activationKey?.message}>
          <div className="password-field">
            <input
              type={showActivationKey ? 'text' : 'password'}
              autoComplete="off"
              placeholder="Nhập mã kích hoạt của bạn"
              {...form.register('activationKey')}
            />
            <button type="button" onClick={() => setShowActivationKey(!showActivationKey)}>
              {showActivationKey ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
        </Field>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-button auth-submit" disabled={form.formState.isSubmitting || googleLoading}>
          {form.formState.isSubmitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthLayout>
  );
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <BrandLogo />
        </div>
        <div className="auth-copy">
          <p className="eyebrow">FPT University Quy Nhơn AI Campus</p>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && !error && <small>{hint}</small>}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
