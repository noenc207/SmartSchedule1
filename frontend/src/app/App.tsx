import { lazy, Suspense, useEffect, useMemo, useRef, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LoginPage, RegisterPage } from '../features/auth/AuthPages';
import { ProtectedRoute, PublicOnlyRoute } from '../routes/AuthRoutes';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { SchedulesPage } from '../features/schedules/SchedulesPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ConflictPanel } from '../features/calendar/components/ConflictPanel';
import { CollaborationPage } from '../features/collaboration/CollaborationPage';
import { PublicSchedulePage } from '../features/sharing/PublicSchedulePage';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { notificationApi } from '../services/notificationApi';
import { SchedulingPage } from '../features/scheduling/SchedulingPage';
import { ReschedulingPage } from '../features/rescheduling/ReschedulingPage';
import { scheduleApi } from '../services/scheduleApi';
import { eventApi } from '../services/eventApi';
import { taskApi } from '../services/taskApi';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { isDemoMode, getDemoDate } from '../services/demoMode';
import { resetDemoData } from '../services/demoBackend';
import { ToastContainer, showToast } from '../components/Toast';
import { BrandLogo } from '../components/BrandLogo';
import { CommandPalette } from '../components/CommandPalette';
import { OnboardingTour } from '../components/OnboardingTour';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { MobileBottomNav } from '../components/MobileBottomNav';
import {
  Search,
  Sun,
  Moon,
  Bell,
  Sparkles,
  RotateCcw,
  Home,
  LayoutDashboard,
  Calendar,
  CheckSquare,
  BarChart2,
  Share2,
  CalendarRange,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Menu,
  type LucideIcon,
} from 'lucide-react';
import type { EventItem, Task } from '../types/domain';

const CalendarPage = lazy(() => import('../features/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })));

class RouteErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('SmartSchedule route error', error, info); }
  render() {
    if (this.state.error) {
      return <section className="panel empty-state"><strong>Không thể mở trang này</strong><span>{this.state.error.message}</span><button className="secondary-button" onClick={() => window.location.reload()}>Tải lại</button></section>;
    }
    return this.props.children;
  }
}

type NavItem = {
  to: string;
  label: string;
  tag?: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Trang chủ', icon: Home },
  { to: '/calendar', label: 'Lịch học', icon: Calendar },
  { to: '/tasks', label: 'Công việc', icon: CheckSquare },
  { to: '/scheduling', label: 'Lịch cá nhân', icon: CalendarRange },
  { to: '/analytics', label: 'Báo cáo', icon: BarChart2 },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

const DEFAULT_CATEGORIES = [
  { id: 'cat-academic', name: 'Học tập trên lớp', color: '#2563eb' },
  { id: 'cat-projects', name: 'Đồ án & Dự án', color: '#7c3aed' },
  { id: 'cat-review', name: 'Thi & Ôn tập', color: '#0891b2' },
  { id: 'cat-general', name: 'Sinh hoạt & Tự học', color: '#ea580c' },
];

function Shell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('smartschedule-theme') === 'dark'; } catch { return false; }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('smartschedule-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const currentPage = navItems.find((item) => location.pathname.startsWith(item.to) && item.to !== '/') ?? navItems[0];
  const { activeScheduleId, setActiveScheduleId } = useWorkspaceStore();
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('smartschedule-sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('smartschedule-theme', dark ? 'dark' : 'light'); } catch { /* browser storage can be unavailable */ }
  }, [dark]);
  useEffect(() => {
    void scheduleApi.list().then((items) => {
      if (!activeScheduleId && items[0]) setActiveScheduleId(items[0].id);
    }).catch(() => undefined);
  }, [activeScheduleId, setActiveScheduleId]);
  useEffect(() => {
    void notificationApi.list(true).then((page) => setUnreadNotifications(page.totalElements)).catch(() => setUnreadNotifications(0));
  }, []);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  return (
    <div className="mock-app-shell">
      {/* 1. Left Fixed Sidebar */}
      <aside
        className={`mock-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        aria-label="Thanh điều hướng chính"
      >
        {/* Sidebar Brand Header: FPT UNIVERSITY - QUY NHON AI CAMPUS */}
        <div className="mock-sidebar-header">
          <BrandLogo collapsed={sidebarCollapsed} onClick={() => navigate('/dashboard')} />
        </div>

        {/* Sidebar Navigation */}
        <nav aria-label="Primary navigation" className="mock-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'mock-nav-item active' : 'mock-nav-item')}
              >
                <span className="mock-nav-icon">
                  <Icon size={18} />
                </span>
                {!sidebarCollapsed && (
                  <span className="mock-nav-label">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Categories & Color Filter Panel */}
        {!sidebarCollapsed && (
          <div className="mock-sidebar-categories-panel">
            <div className="mock-sidebar-cat-header">
              <span className="mock-sidebar-cat-title">NHÃN &amp; MÀU LỊCH</span>
            </div>
            <div className="mock-sidebar-cat-list">
              {DEFAULT_CATEGORIES.map((cat) => (
                <div key={cat.id} className="mock-sidebar-cat-item" title={cat.name}>
                  <span className="mock-sidebar-cat-dot" style={{ backgroundColor: cat.color }} />
                  <span className="mock-sidebar-cat-name">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* 2. Right Main Layout (Header on top, Main Content below) */}
      <div className="mock-main-wrapper">
        <header className="mock-topbar">
          {/* Left: Spacer / Toggle Button / Mobile Brand */}
          <div className="mock-topbar-left">
            <button
              type="button"
              className="topbar-toggle-btn"
              onClick={toggleSidebar}
              title="Đóng / mở menu (Ctrl+B)"
              aria-label="Đóng / mở menu"
            >
              <Menu size={18} />
            </button>
            <div
              className="mock-topbar-mobile-brand"
              onClick={() => navigate('/dashboard')}
              role="button"
              tabIndex={0}
              title="SmartSchedule FPT"
            >
              <img
                src="/fpt-icon.png"
                alt="FPT"
                className="mock-mobile-brand-icon"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="mock-mobile-brand-title">SmartSchedule</span>
            </div>
          </div>

          {/* Center: Search pill */}
          <div
            className="mock-topbar-search-pill"
            onClick={() => setPaletteOpen(true)}
            role="search"
            title="Tìm kiếm SmartSchedule (Ctrl+K)"
          >
            <Search size={15} className="mock-search-icon" />
            <span className="mock-search-placeholder">Tìm kiếm lịch, công việc, sự kiện...</span>
            <kbd className="mock-search-kbd">Ctrl / Cmd + K</kbd>
          </div>

          {/* Right: Actions */}
          <div className="mock-topbar-actions">
            {/* Mobile Search Icon Button (visible only on mobile) */}
            <button
              type="button"
              className="topbar-icon-button mock-mobile-search-btn"
              onClick={() => setPaletteOpen(true)}
              aria-label="Tìm kiếm"
              title="Tìm kiếm (Ctrl+K)"
            >
              <Search size={18} />
            </button>

            {isDemoMode() && (
              <div className="demo-indicator-group">
                <span className="demo-pill" title="Chế độ Demo đang bật">
                  <span className="demo-dot" />
                  DEMO
                </span>
                <button
                  type="button"
                  className="topbar-reset-btn"
                  title="Khôi phục dữ liệu học tập mẫu ban đầu"
                  onClick={() => {
                    resetDemoData();
                    showToast('Đã khôi phục dữ liệu Demo ban đầu', 'info');
                    setTimeout(() => window.location.reload(), 400);
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Khôi phục</span>
                </button>
              </div>
            )}

            {/* Notification Bell with red badge 2 */}
            <button
              type="button"
              className="topbar-icon-button mock-bell-btn"
              onClick={() => navigate('/notifications')}
              aria-label={`Thông báo (${unreadNotifications || 2} chưa đọc)`}
              title={`Thông báo (${unreadNotifications || 2} chưa đọc)`}
            >
              <Bell size={18} />
              <span className="topbar-red-badge">2</span>
            </button>

            {/* Dark/Light mode toggle */}
            <button
              type="button"
              className="topbar-icon-button"
              onClick={() => setDark((value) => !value)}
              aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Student Profile Vũ Ngọc Nhi - Sinh viên K15 with chevron */}
            <div
              className="mock-student-profile"
              onClick={() => navigate('/settings')}
              title={`Hồ sơ sinh viên: ${user?.displayName || 'Vũ Ngọc Nhi'}`}
              role="button"
              tabIndex={0}
            >
              <div className="mock-student-avatar-wrap">
                <img
                  src="/avatar-nhi.png"
                  alt="Vũ Ngọc Nhi"
                  className="mock-student-avatar-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/fpt-icon.png';
                  }}
                />
              </div>
              <div className="mock-student-meta">
                <strong className="mock-student-name">{user?.displayName || 'Vũ Ngọc Nhi'}</strong>
                <span className="mock-student-sub">
                  Sinh viên K15
                </span>
              </div>
              <ChevronDown size={14} className="mock-student-chevron" />
            </div>
          </div>
        </header>

        <main className={`mock-main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} navigate={navigate} />
      <OnboardingTour />
    </div>
  );
}

function Analytics() {
  const activeScheduleId = useWorkspaceStore((state) => state.activeScheduleId);
  const [events, setEvents] = useState<EventItem[]>([]);
  useEffect(() => { if (!activeScheduleId) return; const from = new Date(); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0); const to = new Date(); to.setDate(to.getDate() + 1); void eventApi.list(activeScheduleId, from.toISOString(), to.toISOString()).then(setEvents).catch(() => undefined); }, [activeScheduleId]);
  const total = Math.round(events.reduce((sum, item) => sum + (new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 3600000, 0) * 10) / 10;
  return <section className="workspace-page"><div className="section-heading"><div><p className="eyebrow">Understand your time</p><h2>Analytics</h2></div><span className="muted">Last 7 days</span></div><div className="analytics-metrics"><div className="metric-card"><span>Total planned</span><strong>{total}h</strong><small>Across fixed events and sessions</small></div><div className="metric-card"><span>Scheduled blocks</span><strong>{events.length}</strong><small>Committed time blocks</small></div><div className="metric-card"><span>Schedule health</span><strong>{events.length ? 'Good' : 'Open'}</strong><small>{events.length ? 'Room to adjust remains' : 'Generate your first plan'}</small></div></div><section className="panel analytics-panel"><div className="panel-heading"><div><p className="eyebrow">Capacity by day</p><h3>Weekly workload</h3></div></div><div className="analytics-bars">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => { const hours = events.filter((item) => new Date(item.startsAt).getDay() === (index + 1) % 7).reduce((sum, item) => sum + (new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 3600000, 0); return <div key={day} className="analytics-bar-row"><span>{day}</span><div><i style={{ width: `${Math.min(100, hours * 10)}%` }} /></div><strong>{Math.round(hours * 10) / 10}h</strong></div>; })}</div></section></section>;
}

import { LandingPage } from '../features/landing/LandingPage';

function getGreeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; }

function Page({ title, detail }: { title: string; detail: string }) {
  return <section className="page-placeholder"><p className="eyebrow">Workspace</p><h2>{title}</h2><p className="muted">{detail}</p><button className="secondary-button">Coming in the next phase</button></section>;
}

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  useEffect(() => { void bootstrap(); }, [bootstrap]);
  useEffect(() => {
    const handleAuthExpired = () => {
      useAuthStore.getState().clearError();
      useAuthStore.setState({ user: null, status: 'UNAUTHENTICATED' });
    };
    window.addEventListener('smartschedule:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('smartschedule:auth-expired', handleAuthExpired);
  }, []);
  return (
    <>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route path="/dashboard" element={<RouteErrorBoundary><DashboardPage /></RouteErrorBoundary>} />
            <Route path="/calendar" element={<RouteErrorBoundary><Suspense fallback={<div className="panel empty-state">Loading calendar...</div>}><CalendarPage /></Suspense></RouteErrorBoundary>} />
            <Route path="/scheduling" element={<RouteErrorBoundary><SchedulingPage /></RouteErrorBoundary>} />
            <Route path="/rescheduling" element={<RouteErrorBoundary><ReschedulingPage /></RouteErrorBoundary>} />
            <Route path="/collaboration" element={<RouteErrorBoundary><CollaborationPage /></RouteErrorBoundary>} />
            <Route path="/tasks" element={<RouteErrorBoundary><TasksPage /></RouteErrorBoundary>} />
            <Route path="/analytics" element={<RouteErrorBoundary><Analytics /></RouteErrorBoundary>} />
            <Route path="/schedules" element={<RouteErrorBoundary><SchedulesPage /></RouteErrorBoundary>} />
            <Route path="/settings" element={<RouteErrorBoundary><SettingsPage /></RouteErrorBoundary>} />
            <Route path="/notifications" element={<RouteErrorBoundary><NotificationsPage /></RouteErrorBoundary>} />
          </Route>
        </Route>
        <Route path="/demo/share/:token" element={<PublicSchedulePage />} />
        <Route path="/shared/:token" element={<PublicSchedulePage />} />
        <Route path="/smart-plan" element={<Navigate to="/scheduling" replace />} />
        <Route path="/app/calendar" element={<Navigate to="/calendar" replace />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}
