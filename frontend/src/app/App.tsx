import { lazy, Suspense, useEffect, useMemo, useRef, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LoginPage, RegisterPage } from '../features/auth/AuthPages';
import { GoogleOAuthCallback } from '../features/auth/GoogleOAuthCallback';
import { SocialOAuthCallback } from '../features/auth/SocialOAuthCallback';
import { AIChatWidget } from '../features/ai/AIChatWidget';
import { ProtectedRoute, PublicOnlyRoute, RootIndexRoute } from '../routes/AuthRoutes';
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
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileHomeScreen } from '../features/mobile/screens/MobileHomeScreen';
import { MobileCalendarScreen } from '../features/mobile/screens/MobileCalendarScreen';
import { MobileTasksScreen } from '../features/mobile/screens/MobileTasksScreen';
import { MobileDeadlinesScreen } from '../features/mobile/screens/MobileDeadlinesScreen';
import { MobileAIAssistantScreen } from '../features/mobile/screens/MobileAIAssistantScreen';
import { MobileDocumentsScreen } from '../features/mobile/screens/MobileDocumentsScreen';
import { MobileSettingsScreen } from '../features/mobile/screens/MobileSettingsScreen';
import { MobileBottomNavigation } from '../components/mobile/MobileBottomNavigation';
import { UserQuickDropdown } from './UserQuickDropdown';
import { AvatarModal } from '../features/settings/components/AvatarModal';
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
  Plus,
  MapPin,
  Check,
  Eye,
  EyeOff,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { useAiChatStore } from '../stores/aiChatStore';
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
  badge?: string;
  badgeType?: 'orange' | 'rose' | 'emerald';
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Trang chủ', icon: Home },
  { to: '/calendar', label: 'Lịch học', badge: '6 Slot', badgeType: 'orange', icon: Calendar },
  { to: '/tasks', label: 'Công việc', badge: '3 gấp', badgeType: 'rose', icon: CheckSquare },
  { to: '/scheduling', label: 'Lịch cá nhân', icon: CalendarRange },
  { to: '/analytics', label: 'Báo cáo', badge: '98%', badgeType: 'emerald', icon: BarChart2 },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

const DEFAULT_CATEGORIES = [
  { id: 'cat-academic', name: 'Học tập trên lớp', color: '#2563eb', count: '5 ca', hint: 'Lớp học & Lab chính khóa' },
  { id: 'cat-projects', name: 'Đồ án & Dự án', color: '#7c3aed', count: '3 bài', hint: 'Deadline đồ án Capstone' },
  { id: 'cat-review', name: 'Thi & Ôn tập', color: '#0891b2', count: '1 đề', hint: 'Lịch thi & Ôn tập cuối kỳ' },
  { id: 'cat-general', name: 'Sinh hoạt & Tự học', color: '#ea580c', count: '2 ca', hint: 'Tự học tại Thư viện / Atrium' },
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const currentPage = navItems.find((item) => location.pathname.startsWith(item.to) && item.to !== '/') ?? navItems[0];
  const { activeScheduleId, setActiveScheduleId } = useWorkspaceStore();

  // Category filter state for interactive sidebar
  const [categoryFilterState, setCategoryFilterState] = useState<Record<string, boolean>>({
    'cat-academic': true,
    'cat-projects': true,
    'cat-review': true,
    'cat-general': true,
  });

  const toggleCategoryFilter = (catId: string) => {
    setCategoryFilterState((prev) => {
      const next = { ...prev, [catId]: !prev[catId] };
      window.dispatchEvent(new CustomEvent('smartschedule:filter-category', { detail: next }));
      return next;
    });
  };

  const resetCategoryFilters = () => {
    const allOn = {
      'cat-academic': true,
      'cat-projects': true,
      'cat-review': true,
      'cat-general': true,
    };
    setCategoryFilterState(allOn);
    window.dispatchEvent(new CustomEvent('smartschedule:filter-category', { detail: allOn }));
  };

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
    void scheduleApi.list().then(async (items) => {
      if (items.length > 0) {
        if (!activeScheduleId) setActiveScheduleId(items[0].id);
      } else {
        try {
          const created = await scheduleApi.create({
            name: 'Lịch học Chính khóa & Tự học',
            description: 'Thời khóa biểu cá nhân & kế hoạch tự học tại campus',
            timezone: 'Asia/Ho_Chi_Minh',
            visibility: 'PRIVATE',
          });
          setActiveScheduleId(created.id);
        } catch {
          // ignore
        }
      }
    }).catch(() => undefined);
  }, [activeScheduleId, setActiveScheduleId]);
  useEffect(() => {
    void notificationApi.list(true).then((page) => setUnreadNotifications(page.totalElements)).catch(() => setUnreadNotifications(0));
  }, []);
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ route: string }>;
      if (customEvent.detail?.route) {
        navigate(customEvent.detail.route);
      }
    };
    window.addEventListener('smartschedule:navigate', handleNavigate);
    return () => window.removeEventListener('smartschedule:navigate', handleNavigate);
  }, [navigate]);
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
  const isMobile = useIsMobile(768);

  if (isMobile) {
    return (
      <div className="mobile-app-shell">
        <main className="mobile-shell-main flex-1 w-full overflow-x-hidden">
          <Outlet />
        </main>
        <MobileBottomNavigation />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} navigate={navigate} />
      </div>
    );
  }

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
          {!sidebarCollapsed && (
            <div className="sidebar-term-badge">
              <span className="term-badge-dot" />
              <span>Kỳ Fall 2026 • AI Campus</span>
            </div>
          )}
        </div>

        {/* Quick Add / Search Trigger Button */}
        {!sidebarCollapsed ? (
          <button
            type="button"
            className="sidebar-quick-action-btn"
            onClick={() => setPaletteOpen(true)}
            title="Thêm lịch học, công việc hoặc tìm kiếm nhanh (Ctrl+K)"
          >
            <div className="quick-action-icon-wrap">
              <Plus size={14} />
            </div>
            <span className="quick-action-label">Thêm sự kiện / Việc</span>
            <kbd className="quick-action-kbd">Ctrl K</kbd>
          </button>
        ) : (
          <button
            type="button"
            className="sidebar-quick-action-btn collapsed"
            onClick={() => setPaletteOpen(true)}
            title="Thêm nhanh (Ctrl+K)"
          >
            <Plus size={16} />
          </button>
        )}

        {/* Sidebar Navigation */}
        <nav aria-label="Primary navigation" className="mock-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'mock-nav-item active' : 'mock-nav-item')}
                title={sidebarCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
              >
                <span className="mock-nav-icon">
                  <Icon size={18} />
                </span>
                {!sidebarCollapsed && (
                  <span className="mock-nav-label">{item.label}</span>
                )}
                {!sidebarCollapsed && item.badge && (
                  <span className={`mock-nav-badge ${item.badgeType ?? 'orange'}`}>
                    {item.badge}
                  </span>
                )}
                {sidebarCollapsed && item.badge && (
                  <span className={`mock-nav-collapsed-dot ${item.badgeType ?? 'orange'}`} />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Middle Widget: Cóc Trợ Lý AI Study Tracker (Only when expanded) */}
        {!sidebarCollapsed && (
          <div className="sidebar-coc-widget">
            <div className="sidebar-coc-header">
              <div className="sidebar-coc-avatar-box">
                <span className="sidebar-coc-icon">🐸</span>
                <span className="sidebar-coc-pulse" title="Cóc AI sẵn sàng" />
              </div>
              <div className="sidebar-coc-meta">
                <div className="sidebar-coc-title-row">
                  <strong className="sidebar-coc-name">Cóc Trợ Lý AI</strong>
                  <span className="sidebar-coc-tag">CP-SAT</span>
                </div>
                <span className="sidebar-coc-subtitle">Sẵn sàng tối ưu lịch</span>
              </div>
            </div>

            <div className="sidebar-coc-tracker">
              <div className="sidebar-coc-tracker-labels">
                <span className="tracker-text">Tự học hôm nay</span>
                <strong className="tracker-val">2.5h / 6h</strong>
              </div>
              <div className="sidebar-coc-bar">
                <div className="sidebar-coc-fill" style={{ width: '42%' }} />
              </div>
              <span className="tracker-sub">Đạt 42% chỉ tiêu tập trung</span>
            </div>

            <button
              type="button"
              className="sidebar-coc-cta-btn"
              onClick={() => useAiChatStore.getState().toggleOpen()}
              title="Mở trợ lý Cóc AI"
            >
              <Sparkles size={13} className="text-orange-500" />
              <span>Hỏi Cóc AI gợi ý</span>
            </button>
          </div>
        )}

        {/* Sidebar Categories & Color Filter Panel */}
        {!sidebarCollapsed && (
          <div className="mock-sidebar-categories-panel">
            <div className="mock-sidebar-cat-header">
              <div className="cat-header-left">
                <Layers size={13} className="text-slate-400" />
                <span className="mock-sidebar-cat-title">NHÃN &amp; BỘ LỌC LỊCH</span>
              </div>
              <button
                type="button"
                className="cat-reset-btn"
                onClick={resetCategoryFilters}
                title="Bật lại toàn bộ nhãn lịch"
              >
                Tất cả
              </button>
            </div>
            <div className="mock-sidebar-cat-list">
              {DEFAULT_CATEGORIES.map((cat) => {
                const isEnabled = categoryFilterState[cat.id] ?? true;

                return (
                  <div
                    key={cat.id}
                    className={`mock-sidebar-cat-item ${isEnabled ? 'is-active' : 'is-muted'}`}
                    onClick={() => toggleCategoryFilter(cat.id)}
                    role="button"
                    tabIndex={0}
                    title={`${cat.name} (${cat.hint}) - Bấm để bật/tắt`}
                  >
                    <span
                      className="mock-sidebar-cat-dot"
                      style={{
                        backgroundColor: isEnabled ? cat.color : '#94a3b8',
                        boxShadow: isEnabled ? `0 0 6px ${cat.color}60` : 'none',
                      }}
                    />
                    <span className="mock-sidebar-cat-name">{cat.name}</span>
                    <span className="mock-sidebar-cat-count">{cat.count}</span>
                    <span className="mock-sidebar-cat-toggle-icon">
                      {isEnabled ? (
                        <Check size={11} className="text-emerald-500" />
                      ) : (
                        <EyeOff size={11} className="text-slate-400" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sidebar Footer: Weather & Collapse Toggle Button */}
        <div className="mock-sidebar-footer">
          {!sidebarCollapsed && (
            <div className="sidebar-campus-pill" title="FPT University Quy Nhơn AI Campus">
              <MapPin size={12} className="text-orange-500 flex-shrink-0" />
              <span className="campus-pill-name">Quy Nhơn • 25°C ⛅</span>
            </div>
          )}

          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Mở rộng menu (Ctrl+B)' : 'Thu gọn menu (Ctrl+B)'}
            aria-label="Thu gọn hoặc mở rộng thanh điều hướng"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!sidebarCollapsed && <span>Thu gọn (Ctrl+B)</span>}
          </button>
        </div>
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

            {/* Student Profile Vũ Ngọc Nhi - Sinh viên K15 with quick customization dropdown */}
            <div className="mock-student-profile-container" style={{ position: 'relative' }}>
              <div
                className={`mock-student-profile ${isUserMenuOpen ? 'active' : ''}`}
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                title={`Tùy biến hồ sơ: ${user?.displayName || 'Vũ Ngọc Nhi'}`}
                role="button"
                tabIndex={0}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                id="header-user-profile-btn"
              >
                <div className="mock-student-avatar-wrap">
                  <img
                    src={user?.avatarUrl || '/avatar-nhi.png'}
                    alt={user?.displayName || 'Vũ Ngọc Nhi'}
                    className="mock-student-avatar-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/avatar-nhi.png';
                    }}
                  />
                </div>
                <div className="mock-student-meta">
                  <strong className="mock-student-name">{user?.displayName || 'Vũ Ngọc Nhi'}</strong>
                  <span className="mock-student-sub">
                    Sinh viên K15
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className="mock-student-chevron"
                  style={{
                    transform: isUserMenuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>

              <UserQuickDropdown
                isOpen={isUserMenuOpen}
                onClose={() => setIsUserMenuOpen(false)}
                onOpenAvatarModal={() => setIsAvatarModalOpen(true)}
                dark={dark}
                setDark={setDark}
              />
            </div>
          </div>
        </header>

        <main className={`mock-main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} navigate={navigate} />
      <OnboardingTour />
      <AvatarModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} />
    </div>
  );
}

import { AnalyticsPage } from '../features/analytics/AnalyticsPage';

import { LandingPage } from '../features/landing/LandingPage';

function getGreeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; }

function Page({ title, detail }: { title: string; detail: string }) {
  return <section className="page-placeholder"><p className="eyebrow">Workspace</p><h2>{title}</h2><p className="muted">{detail}</p><button className="secondary-button">Coming in the next phase</button></section>;
}

function AdaptiveDashboard() {
  const isMobile = useIsMobile(768);
  return isMobile ? <MobileHomeScreen /> : <DashboardPage />;
}

function AdaptiveCalendar() {
  const isMobile = useIsMobile(768);
  return isMobile ? (
    <MobileCalendarScreen />
  ) : (
    <Suspense fallback={<div className="panel empty-state">Loading calendar...</div>}>
      <CalendarPage />
    </Suspense>
  );
}

function AdaptiveTasks() {
  const isMobile = useIsMobile(768);
  return isMobile ? <MobileTasksScreen /> : <TasksPage />;
}

function AdaptiveSettings() {
  const isMobile = useIsMobile(768);
  return isMobile ? <MobileSettingsScreen /> : <SettingsPage />;
}

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  useEffect(() => { void bootstrap(); }, [bootstrap]);
  return (
    <>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route path="/auth/google/callback" element={<SocialOAuthCallback defaultProvider="GOOGLE" />} />
        <Route path="/auth/github/callback" element={<SocialOAuthCallback defaultProvider="GITHUB" />} />
        <Route path="/auth/facebook/callback" element={<SocialOAuthCallback defaultProvider="FACEBOOK" />} />
        <Route path="/auth/callback" element={<SocialOAuthCallback />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route path="/dashboard" element={<RouteErrorBoundary><AdaptiveDashboard /></RouteErrorBoundary>} />
            <Route path="/calendar" element={<RouteErrorBoundary><AdaptiveCalendar /></RouteErrorBoundary>} />
            <Route path="/scheduling" element={<RouteErrorBoundary><SchedulingPage /></RouteErrorBoundary>} />
            <Route path="/rescheduling" element={<RouteErrorBoundary><ReschedulingPage /></RouteErrorBoundary>} />
            <Route path="/collaboration" element={<RouteErrorBoundary><CollaborationPage /></RouteErrorBoundary>} />
            <Route path="/tasks" element={<RouteErrorBoundary><AdaptiveTasks /></RouteErrorBoundary>} />
            <Route path="/deadlines" element={<RouteErrorBoundary><MobileDeadlinesScreen /></RouteErrorBoundary>} />
            <Route path="/ai" element={<RouteErrorBoundary><MobileAIAssistantScreen /></RouteErrorBoundary>} />
            <Route path="/documents" element={<RouteErrorBoundary><MobileDocumentsScreen /></RouteErrorBoundary>} />
            <Route path="/analytics" element={<RouteErrorBoundary><AnalyticsPage /></RouteErrorBoundary>} />
            <Route path="/schedules" element={<RouteErrorBoundary><SchedulesPage /></RouteErrorBoundary>} />
            <Route path="/settings" element={<RouteErrorBoundary><AdaptiveSettings /></RouteErrorBoundary>} />
            <Route path="/notifications" element={<RouteErrorBoundary><NotificationsPage /></RouteErrorBoundary>} />
          </Route>
        </Route>
        <Route path="/demo/share/:token" element={<PublicSchedulePage />} />
        <Route path="/shared/:token" element={<PublicSchedulePage />} />
        <Route path="/smart-plan" element={<Navigate to="/scheduling" replace />} />
        <Route path="/app/calendar" element={<Navigate to="/calendar" replace />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/" element={<RootIndexRoute />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <AIChatWidget />
      <ToastContainer />
    </>
  );
}
