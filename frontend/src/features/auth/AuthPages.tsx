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
import { AuthSpotlight } from './AuthSpotlight';
import { AuthVisual3D } from './AuthVisual3D';
import BlurText from '../../components/BlurText';
import { MicroScaleFadeText, ShimmerSweepBadge } from '../../components/effects/AnimateText';
import { SmartConnectionExperience } from '../../components/feedback/SmartConnectionExperience';
import { SmartSubmitLoading } from '../../components/feedback/SmartSubmitLoading';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { getApiErrorMessage, getRawApiUrl, setCustomApiUrl, CUSTOM_API_URL_KEY } from '../../services/apiClient';
import './login.css';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter at least 2 characters.').max(120),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.')
    .max(72)
    .regex(/[A-Z]/, 'Add at least one uppercase letter.')
    .regex(/[0-9]/, 'Add at least one number.'),
  confirmPassword: z.string(),
  activationKey: z.string().optional(),
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

  const [formRef] = useAutoAnimate<HTMLFormElement>({ duration: 180 });

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

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
        navigate((location.state as { from?: string } | null)?.from ?? '/dashboard', { replace: true });
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

  // If first-time social sign up requires Registration Key, render in split layout
  if (pendingSocialAuth) {
    return (
      <div className="auth-split-wrapper">
        <AuthVisual3D mode="login" />

        <div className="auth-form-panel">
          <AuthSpotlight />
          <main className="login-card">
            <header className="login-header">
              <div className="login-brand-wrapper">
                <BrandLogo />
              </div>
              <ShimmerSweepBadge as="span" className="login-campus-badge" delay={0.05}>
                FPT University Quy Nhơn · AI Campus
              </ShimmerSweepBadge>
              <h1 className="login-title">
                <MicroScaleFadeText text="Complete your registration" delay={0.12} />
              </h1>
              <p className="login-subtitle">
                Registration Key is required only for your first registration.
              </p>
            </header>

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
          </main>
          <footer className="login-watermark">
            SmartSchedule · Academic Scheduling Platform · FPT University Quy Nhơn
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split-wrapper">
      <AuthVisual3D mode="login" />

      <div className="auth-form-panel">
        <AuthSpotlight />

        <main className="login-card">
          <header className="login-header">
            <div className="login-brand-wrapper">
              <BrandLogo />
            </div>
            <ShimmerSweepBadge as="span" className="login-campus-badge" delay={0.05}>
              FPT University Quy Nhơn · AI Campus
            </ShimmerSweepBadge>
            <h1 className="login-title">
              <MicroScaleFadeText text="Welcome back" delay={0.15} />
            </h1>
            <p className="login-subtitle">
              Sign in to turn your academic commitments into a realistic study plan.
            </p>
          </header>

          {socialNotice && (
            <div className="login-notice" role="alert">
              {socialNotice}
            </div>
          )}

          <SocialAuthButtons
            onGoogleToken={handleGoogleToken}
            onSocialAuth={handleSocialAuth}
            isLoading={socialLoading}
            onNotice={(msg) => setSocialNotice(msg)}
            noIcons={true}
          />

          <div className="login-divider">
            <span>or continue with email</span>
          </div>

          <form ref={formRef} className="login-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="login-field">
              <label htmlFor="login-email-input" className="login-label">Email</label>
              <input
                id="login-email-input"
                type="email"
                autoComplete="email"
                placeholder="student@fpt.edu.vn"
                className={`login-input ${form.formState.errors.email ? 'login-input-error' : ''}`}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <span className="login-field-error" role="alert">
                  {form.formState.errors.email.message}
                </span>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="login-password-input" className="login-label">Password</label>
              <div className="login-password-container">
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`login-password-input ${form.formState.errors.password ? 'login-input-error' : ''}`}
                  {...form.register('password')}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {form.formState.errors.password && (
                <span className="login-field-error" role="alert">
                  {form.formState.errors.password.message}
                </span>
              )}
            </div>

            <div className="login-aux-row">
              <label className="login-remember-label">
                <input
                  type="checkbox"
                  className="login-remember-checkbox"
                  defaultChecked={true}
                />
                <span>Remember this device</span>
              </label>
            </div>

            <BackendConnectionAlert error={error} onClearError={clearError} />

            <button
              type="submit"
              className={`login-submit-btn ${form.formState.isSubmitting ? 'login-submit-submitting' : ''}`}
              disabled={form.formState.isSubmitting || socialLoading}
            >
              {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>

            <SmartSubmitLoading isSubmitting={form.formState.isSubmitting} mode="login" />
            {socialLoading && <SmartSubmitLoading isSubmitting={true} mode="oauth" />}
          </form>

          {!isRealMode() && (import.meta.env.DEV || isDemoMode()) && (
            <div style={{ marginTop: '12px' }}>
              <button
                className="login-demo-btn"
                type="button"
                onClick={() => {
                  demoLogin();
                  navigate('/dashboard', { replace: true });
                }}
              >
                Continue in demo mode (Alex Nguyen · FPT University Quy Nhơn)
              </button>
            </div>
          )}

          <p className="login-switch-text">
            New to SmartSchedule?
            <Link to="/register" className="login-switch-link">
              Create an account
            </Link>
          </p>
        </main>

        <footer className="login-watermark">
          SmartSchedule · Academic Scheduling Platform · FPT University Quy Nhơn
        </footer>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, googleAuth, githubAuth, facebookAuth, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [pendingSocialAuth, setPendingSocialAuth] = useState<PendingSocialAuthState | null>(null);
  const [keyModalError, setKeyModalError] = useState<string | null>(null);

  const [formRef] = useAutoAnimate<HTMLFormElement>({ duration: 180 });

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
      <div className="auth-split-wrapper">
        <AuthVisual3D mode="register" />

        <div className="auth-form-panel">
          <AuthSpotlight />
          <main className="login-card">
            <header className="login-header">
              <div className="login-brand-wrapper">
                <BrandLogo />
              </div>
              <ShimmerSweepBadge as="span" className="login-campus-badge" delay={0.05}>
                FPT University Quy Nhơn · AI Campus
              </ShimmerSweepBadge>
              <h1 className="login-title">
                <MicroScaleFadeText text="Complete your registration" delay={0.12} />
              </h1>
              <p className="login-subtitle">
                Registration Key is required only for your first registration.
              </p>
            </header>

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
          </main>
          <footer className="login-watermark">
            SmartSchedule · Academic Scheduling Platform · FPT University Quy Nhơn
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split-wrapper">
      <AuthVisual3D mode="register" />

      <div className="auth-form-panel">
        <AuthSpotlight />

        <main className="login-card">
          <header className="login-header">
            <div className="login-brand-wrapper">
              <BrandLogo />
            </div>
            <ShimmerSweepBadge as="span" className="login-campus-badge" delay={0.05}>
              FPT University Quy Nhơn · AI Campus
            </ShimmerSweepBadge>
            <h1 className="login-title">
              <MicroScaleFadeText text="Create your workspace" delay={0.15} />
            </h1>
            <p className="login-subtitle">
              Start with your university timetable, then let the engine find the time.
            </p>
          </header>

          {socialNotice && (
            <div className="login-notice" role="alert">
              {socialNotice}
            </div>
          )}

          <SocialAuthButtons
            onGoogleToken={handleGoogleToken}
            onSocialAuth={handleSocialAuth}
            isLoading={socialLoading}
            onNotice={(msg) => setSocialNotice(msg)}
            noIcons={true}
          />

          <div className="login-divider">
            <span>or register with email</span>
          </div>

          <form ref={formRef} className="login-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="login-field">
              <label htmlFor="reg-name-input" className="login-label">Full Name</label>
              <input
                id="reg-name-input"
                type="text"
                autoComplete="name"
                placeholder="Nguyen Van A"
                className={`login-input ${form.formState.errors.displayName ? 'login-input-error' : ''}`}
                {...form.register('displayName')}
              />
              {form.formState.errors.displayName && (
                <span className="login-field-error" role="alert">
                  {form.formState.errors.displayName.message}
                </span>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="reg-email-input" className="login-label">Email</label>
              <input
                id="reg-email-input"
                type="email"
                autoComplete="email"
                placeholder="student@fpt.edu.vn"
                className={`login-input ${form.formState.errors.email ? 'login-input-error' : ''}`}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <span className="login-field-error" role="alert">
                  {form.formState.errors.email.message}
                </span>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="reg-password-input" className="login-label">Password</label>
              <div className="login-password-container">
                <input
                  id="reg-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`login-password-input ${form.formState.errors.password ? 'login-input-error' : ''}`}
                  {...form.register('password')}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {form.formState.errors.password ? (
                <span className="login-field-error" role="alert">
                  {form.formState.errors.password.message}
                </span>
              ) : (
                <span className="login-field-hint">
                  At least 8 characters, one uppercase letter, and one number.
                </span>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="reg-confirm-password-input" className="login-label">Confirm Password</label>
              <div className="login-password-container">
                <input
                  id="reg-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`login-password-input ${form.formState.errors.confirmPassword ? 'login-input-error' : ''}`}
                  {...form.register('confirmPassword')}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <span className="login-field-error" role="alert">
                  {form.formState.errors.confirmPassword.message}
                </span>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="reg-activation-key-input" className="login-label">
                Registration Key <span style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional)</span>
              </label>
              <input
                id="reg-activation-key-input"
                type="text"
                autoComplete="off"
                placeholder="Enter key if required by your campus program"
                className="login-input"
                {...form.register('activationKey')}
              />
              <span className="login-field-hint">
                Required only if your university program requires an activation key.
              </span>
            </div>

            <BackendConnectionAlert error={error} onClearError={clearError} />

            <button
              type="submit"
              className={`login-submit-btn ${form.formState.isSubmitting ? 'login-submit-submitting' : ''}`}
              disabled={form.formState.isSubmitting || socialLoading}
            >
              {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
            </button>

            <SmartSubmitLoading isSubmitting={form.formState.isSubmitting} mode="register" />
            {socialLoading && <SmartSubmitLoading isSubmitting={true} mode="oauth" />}
          </form>

          <p className="login-switch-text">
            Already have an account?
            <Link to="/login" className="login-switch-link">
              Sign in
            </Link>
          </p>
        </main>

        <footer className="login-watermark">
          SmartSchedule · Academic Scheduling Platform · FPT University Quy Nhơn
        </footer>
      </div>
    </div>
  );
}

function BackendConnectionAlert({ error, onClearError }: { error: string | null; onClearError: () => void }) {
  const isProduction =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  const rawUrl = getRawApiUrl();
  const isLocalhost = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');

  if (!error && !(isProduction && isLocalhost)) return null;

  const isNetworkOrColdStart =
    !error ||
    error.includes('Không thể kết nối') ||
    error.includes('Network Error') ||
    error.includes('Lỗi kết nối') ||
    error.includes('timed out') ||
    error.includes('timeout') ||
    error.includes('502') ||
    error.includes('503') ||
    (isProduction && isLocalhost);

  if (isNetworkOrColdStart) {
    return (
      <div style={{ margin: '8px 0' }}>
        <SmartConnectionExperience
          variant="inline"
          status="FAILED"
          error={error || 'Frontend đang trỏ về localhost thay vì máy chủ Render.'}
          onRetry={() => {
            onClearError();
            window.location.reload();
          }}
          showConfigAction={true}
        />
      </div>
    );
  }

  return (
    <div
      className="login-error-alert"
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        textAlign: 'left',
        margin: '8px 0',
      }}
    >
      <div style={{ lineHeight: 1.5 }}>{error}</div>
    </div>
  );
}
