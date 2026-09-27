import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'INITIALIZING' || status === 'REFRESHING') {
    return <div className="route-loading">Loading your workspace…</div>;
  }
  if (status !== 'AUTHENTICATED') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { status } = useAuth();
  if (status === 'INITIALIZING' || status === 'REFRESHING') {
    return <div className="route-loading">Loading…</div>;
  }
  if (status === 'AUTHENTICATED') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
