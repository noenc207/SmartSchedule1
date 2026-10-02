import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LandingPage } from '../features/landing/LandingPage';

export function ProtectedRoute() {
  const { status, authInitialized } = useAuth();
  const location = useLocation();

  // 1. While auth state is initializing or refreshing, never redirect anywhere!
  if (!authInitialized || status === 'INITIALIZING' || status === 'REFRESHING') {
    return (
      <div
        className="route-loading"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <div className="proposal-spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
        <span>Loading your workspace…</span>
      </div>
    );
  }

  // 2. Only redirect to /login when auth is fully initialized and confirmed UNAUTHENTICATED
  if (status !== 'AUTHENTICATED') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { status, authInitialized } = useAuth();
  const location = useLocation();

  // 1. While auth state is initializing or refreshing, wait and show loading
  if (!authInitialized || status === 'INITIALIZING' || status === 'REFRESHING') {
    return (
      <div
        className="route-loading"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <div className="proposal-spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
        <span>Loading…</span>
      </div>
    );
  }

  // 2. When authenticated, redirect to previous target or /dashboard
  if (status === 'AUTHENTICATED') {
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}

/**
 * Smart Root Route for `/`:
 * - While initializing: show clean loading skeleton (never flash Landing or Login).
 * - If user has an active/restored session: redirect directly to `/dashboard`.
 * - If user is unauthenticated: render `<LandingPage />`.
 */
export function RootIndexRoute() {
  const { status, authInitialized } = useAuth();

  if (!authInitialized || status === 'INITIALIZING' || status === 'REFRESHING') {
    return (
      <div
        className="route-loading"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <div className="proposal-spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
        <span>Loading SmartSchedule…</span>
      </div>
    );
  }

  if (status === 'AUTHENTICATED') {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}
