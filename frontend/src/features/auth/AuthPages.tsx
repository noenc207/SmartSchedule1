import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import type { LoginInput, RegisterInput, SocialProvider } from '../../types/auth';
import { BrandLogo } from '../../components/BrandLogo';
import { isDemoMode, isRealMode } from '../../services/demoMode';
import { SocialAuthButtons, type SocialAuthPayload } from './SocialAuthButtons';
import { SocialRegistrationView } from './GoogleRegistrationView';
import { getApiErrorMessage, getRawApiUrl, setCustomApiUrl } from '../../services/apiClient';

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

interface PendingSocialAuthState {
  provider: SocialProvider;
  idToken?: string;
  code?: string;
  accessToken?: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleAuth, githubAuth, facebookAuth, demoLogin, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [pendingSocialAuth, setPendingSocialAuth] = useState<PendingSocialAuthState | null>(null);
  const [keyModalError, setKeyModalError] = useState<string | null>(null);

  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  useEffect(() => clearError(), [clearError]);

  // 1. Check state from OAuth redirect flow
  useEffect(() => {
    const state = location.state as {
      pendingSocialAuth?: PendingSocialAuthState;
      pendingGoogleAuth?: any;
      error?: string;
    } | null;

    if (state?.pendingSocialAuth) {
      setPendingSocialAuth(state.pendingSocialAuth);
    } else if (state?.pendingGoogleAuth) {
      setPendingSocialAuth({
        provider: 'GOOGLE',
        ...state.pendingGoogleAuth,
      });
    }
    if (state?.error) {
      setSocialNotice(state.error);
    }
  }, [location.state]);

  // 2. Check direct URL hash for #id_token=... (if redirect arrived at /login)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('id_token=')) {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const idToken = params.get('id_token');
      if (idToken) {
        window.history.replaceState(null, '', window.location.pathname);
        void handleSocialAuth({ provider: 'GOOGLE', idToken });
      }
    }
  }, []);

  const onSubmit = async (values: LoginInput) => {
    try {
      await login(values);
      navigate((location.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true });
    } catch {
      /* server error is rendered */
    }
  };

  const handleSocialAuth = async (auth: SocialAuthPayload) => {
    setSocialLoading(true);
    setKeyModalError(null);
    setSocialNotice(null);
    clearError();
    try {
      let res: any;
      if (auth.provider === 'GOOGLE' && auth.idToken) {
        res = await googleAuth({ idToken: auth.idToken });
      } else if (auth.provider === 'GITHUB') {
        res = await githubAuth({ code: auth.code, accessToken: auth.accessToken });
      } else if (auth.provider === 'FACEBOOK') {
        res = await facebookAuth({ accessToken: auth.accessToken, code: auth.code });
      } else {
        throw new Error('Unsupported authentication provider.');
      }

      if (res.status === 'AUTHENTICATED') {
        // CASE: Existing social account -> directly enter Dashboard!
        navigate((location.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true });
      } else if (res.status === 'KEY_REQUIRED') {
        // CASE: First time social sign up -> require Registration Key
        setPendingSocialAuth({
          provider: auth.provider,
          idToken: auth.idToken,
          code: auth.code,
          accessToken: auth.accessToken,
          email: res.email || '',
          displayName: res.displayName,
          avatarUrl: res.avatarUrl,
        });
      }
    } catch {
      /* error is handled in authStore */
    } finally {
      setSocialLoading(false);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    await handleSocialAuth({ provider: 'GOOGLE', idToken });
  };

  const handleKeySubmit = async (registrationKey: string) => {
    if (!pendingSocialAuth) return;
    setSocialLoading(true);
    setKeyModalError(null);
    try {
      let res: any;
      if (pendingSocialAuth.provider === 'GOOGLE') {
        res = await googleAuth({
          idToken: pendingSocialAuth.idToken!,
          registrationKey,
        });
      } else if (pendingSocialAuth.provider === 'GITHUB') {
        res = await githubAuth({
          code: pendingSocialAuth.code,
          accessToken: pendingSocialAuth.accessToken,
          registrationKey,
        });
      } else if (pendingSocialAuth.provider === 'FACEBOOK') {
        res = await facebookAuth({
          accessToken: pendingSocialAuth.accessToken,
          code: pendingSocialAuth.code,
          registrationKey,
        });
      }
      if (res?.status === 'AUTHENTICATED') {
        setPendingSocialAuth(null);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setKeyModalError(getApiErrorMessage(err));
    } finally {
      setSocialLoading(false);
    }
  };

  // If new social user detected, show the dedicated Create Account screen
  if (pendingSocialAuth) {
    return (
      <AuthLayout
        title="Create your SmartSchedule account"
        subtitle="Registration Key is required only for your first registration."
      >
        <SocialRegistrationView
          provider={pendingSocialAuth.provider}
          email={pendingSocialAuth.email}
          displayName={pendingSocialAuth.displayName}
          avatarUrl={pendingSocialAuth.avatarUrl}
          isLoading={socialLoading}
          error={keyModalError}
          onSubmit={handleKeySubmit}
          onBack={() => {
            setPendingSocialAuth(null);
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
        onSocialAuth={handleSocialAuth}
        isLoading={socialLoading}
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
        <BackendConnectionAlert error={error} onClearError={clearError} />
        <button className="primary-button auth-submit" disabled={form.formState.isSubmitting || socialLoading}>
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
  const { register, googleAuth, githubAuth, facebookAuth, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showActivationKey, setShowActivationKey] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [pendingSocialAuth, setPendingSocialAuth] = useState<PendingSocialAuthState | null>(null);
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

  const handleSocialAuth = async (auth: SocialAuthPayload) => {
    setSocialLoading(true);
    setKeyModalError(null);
    setSocialNotice(null);
    clearError();
    try {
      let res: any;
      if (auth.provider === 'GOOGLE' && auth.idToken) {
        res = await googleAuth({ idToken: auth.idToken });
      } else if (auth.provider === 'GITHUB') {
        res = await githubAuth({ code: auth.code, accessToken: auth.accessToken });
      } else if (auth.provider === 'FACEBOOK') {
        res = await facebookAuth({ accessToken: auth.accessToken, code: auth.code });
      } else {
        throw new Error('Unsupported authentication provider.');
      }

      if (res.status === 'AUTHENTICATED') {
        navigate('/dashboard', { replace: true });
      } else if (res.status === 'KEY_REQUIRED') {
        setPendingSocialAuth({
          provider: auth.provider,
          idToken: auth.idToken,
          code: auth.code,
          accessToken: auth.accessToken,
          email: res.email || '',
          displayName: res.displayName,
          avatarUrl: res.avatarUrl,
        });
      }
    } catch {
      /* error is handled in authStore */
    } finally {
      setSocialLoading(false);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    await handleSocialAuth({ provider: 'GOOGLE', idToken });
  };

  const handleKeySubmit = async (registrationKey: string) => {
    if (!pendingSocialAuth) return;
    setSocialLoading(true);
    setKeyModalError(null);
    try {
      let res: any;
      if (pendingSocialAuth.provider === 'GOOGLE') {
        res = await googleAuth({
          idToken: pendingSocialAuth.idToken!,
          registrationKey,
        });
      } else if (pendingSocialAuth.provider === 'GITHUB') {
        res = await githubAuth({
          code: pendingSocialAuth.code,
          accessToken: pendingSocialAuth.accessToken,
          registrationKey,
        });
      } else if (pendingSocialAuth.provider === 'FACEBOOK') {
        res = await facebookAuth({
          accessToken: pendingSocialAuth.accessToken,
          code: pendingSocialAuth.code,
          registrationKey,
        });
      }
      if (res?.status === 'AUTHENTICATED') {
        setPendingSocialAuth(null);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setKeyModalError(getApiErrorMessage(err));
    } finally {
      setSocialLoading(false);
    }
  };

  if (pendingSocialAuth) {
    return (
      <AuthLayout
        title="Create your SmartSchedule account"
        subtitle="Registration Key is required only for your first registration."
      >
        <SocialRegistrationView
          provider={pendingSocialAuth.provider}
          email={pendingSocialAuth.email}
          displayName={pendingSocialAuth.displayName}
          avatarUrl={pendingSocialAuth.avatarUrl}
          isLoading={socialLoading}
          error={keyModalError}
          onSubmit={handleKeySubmit}
          onBack={() => {
            setPendingSocialAuth(null);
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
        onSocialAuth={handleSocialAuth}
        isLoading={socialLoading}
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
        <BackendConnectionAlert error={error} onClearError={clearError} />
        <button className="primary-button auth-submit" disabled={form.formState.isSubmitting || socialLoading}>
          {form.formState.isSubmitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthLayout>
  );
}

function BackendConnectionAlert({ error, onClearError }: { error: string | null; onClearError: () => void }) {
  const [customUrl, setCustomUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const isProduction =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  const rawUrl = getRawApiUrl();
  const isLocalhost = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');

  if (!error && !(isProduction && isLocalhost)) return null;

  return (
    <div
      className="form-error"
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        textAlign: 'left',
        margin: '12px 0',
      }}
    >
      {error && <div>{error}</div>}

      {isProduction && (
        <div
          style={{
            marginTop: error ? '4px' : '0px',
            padding: '10px 12px',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            border: '1px solid #fed7aa',
            color: '#1e293b',
            fontSize: '13px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#c2410c' }}>⚙️ Kết nối Backend Render</span>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              {showConfig ? 'Đóng' : 'Nhập URL kết nối ngay'}
            </button>
          </div>

          {(showConfig || error) && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                Dán URL máy chủ Render (ví dụ: <code style={{ color: '#0f172a' }}>https://xxx.onrender.com</code>) để kết nối trực tiếp:
              </p>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="url"
                  placeholder="https://your-backend.onrender.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    outline: 'none',
                    color: '#0f172a',
                    background: '#fff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customUrl.trim()) {
                      setCustomApiUrl(customUrl.trim());
                      onClearError();
                      window.location.reload();
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: '#ea580c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Lưu & Thử lại
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
