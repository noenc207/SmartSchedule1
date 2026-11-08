import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Clock,
  Contrast,
  Edit3,
  HelpCircle,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  X,
  Camera,
  User,
  ShieldCheck,
  GraduationCap,
  Calendar,
  Layers,
  Settings as SettingsIcon,
  LogOut,
  Sliders,
  Cpu,
  QrCode,
  Copy,
  Save,
  Laptop,
} from 'lucide-react';
import { availabilityApi } from '../../services/availabilityApi';
import { categoryApi } from '../../services/categoryApi';
import { userApi } from '../../services/userApi';
import { getApiErrorMessage } from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { SchedulePicker } from '../../components/SchedulePicker';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { usePreferenceStore } from '../../stores/preferenceStore';
import type { Availability, Category } from '../../types/domain';
import { exportDemoLog, resetDemoData } from '../../services/demoBackend';
import { isDemoMode } from '../../services/demoMode';
import { COLOR_PALETTE } from '../calendar/utils/colorPalette';
import { showToast } from '../../components/Toast';
import { IntegrationsSection } from './components/IntegrationsSection';
import { DashboardAppearanceSection } from './components/DashboardAppearanceSection';
import { UserLocationsSection } from './components/UserLocationsSection';
import { OpenApiSection } from './components/OpenApiSection';
import { AvatarModal, AVATAR_PRESETS } from './components/AvatarModal';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type SettingsTab = 'profile' | 'schedule-categories' | 'appearance-ai' | 'security';

export function SettingsPage() {
  const navigate = useNavigate();
  const { activeScheduleId } = useWorkspaceStore();
  const { user, updateUser, logout } = useAuthStore();
  const {
    timeFormat,
    setTimeFormat,
    highContrast,
    setHighContrast,
    setHasCompletedOnboarding,
  } = usePreferenceStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [profileName, setProfileName] = useState(user?.displayName || user?.email?.split('@')[0] || 'Sinh viên');
  const [profileTimezone, setProfileTimezone] = useState(user?.timezone || 'Asia/Ho_Chi_Minh');
  const [profileLocale, setProfileLocale] = useState(user?.locale || 'vi-VN');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.displayName || user.email?.split('@')[0] || 'Sinh viên');
      setProfileTimezone(user.timezone || 'Asia/Ho_Chi_Minh');
      setProfileLocale(user.locale || 'vi-VN');
    }
  }, [user]);

  const [availability, setAvailability] = useState<Availability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#0047ba'); // FPT Blue
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [error, setError] = useState('');

  const defaultAvatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user?.displayName || user?.email || 'Student')}&backgroundColor=fed7aa,dbeafe`;
  const currentAvatar = user?.avatarUrl || defaultAvatar;

  const studentRollNo = useMemo(() => {
    if (user?.email) {
      const match = user.email.match(/([a-zA-Z]{2}\d{5,7})/i);
      if (match) return match[1].toUpperCase();
    }
    return user?.id ? `FPT-${user.id.slice(0, 6).toUpperCase()}` : 'FPT-STUDENT';
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Tên hiển thị không được để trống.', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('smartschedule-demo-name', profileName.trim());
      }
      const updated = await userApi.update({
        name: profileName.trim(),
        timezone: profileTimezone,
        locale: profileLocale,
      });
      updateUser(updated);
      showToast('Cập nhật thông tin hồ sơ sinh viên thành công!', 'success');
    } catch (err) {
      // Offline / demo fallback
      updateUser({
        displayName: profileName.trim(),
        timezone: profileTimezone,
        locale: profileLocale,
      });
      showToast('Đã lưu thông tin hồ sơ vào bộ nhớ thiết bị!', 'success');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleQuickAvatar = async (avatarUrl: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartschedule-demo-avatar', avatarUrl);
    }
    updateUser({ avatarUrl });
    await userApi.update({ avatarUrl }).catch(() => {});
    showToast('Đã cập nhật ảnh đại diện thành công!', 'success');
  };

  const handleCopyMSSV = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(studentRollNo);
      showToast(`Đã sao chép MSSV: ${studentRollNo} vào clipboard!`, 'info');
    }
  };

  const load = () => {
    if (!activeScheduleId) return;
    Promise.all([availabilityApi.list(activeScheduleId), categoryApi.list()])
      .then(([a, c]) => {
        setAvailability(a);
        setCategories(c);
      })
      .catch(() => setError('Could not load settings.'));
  };

  useEffect(() => {
    load();
  }, [activeScheduleId]);

  const addAvailability = async (day: number) => {
    if (!activeScheduleId) return;
    try {
      const item = await availabilityApi.create(activeScheduleId, {
        dayOfWeek: day,
        startTime: '09:00:00',
        endTime: '17:00:00',
        enabled: true,
      });
      setAvailability((old) => [...old, item]);
      showToast('Availability window added', 'success');
    } catch {
      setError('Could not add availability slot.');
    }
  };

  const removeAvailability = async (id: string) => {
    if (!activeScheduleId) return;
    try {
      await availabilityApi.remove(activeScheduleId, id);
      setAvailability((old) => old.filter((item) => item.id !== id));
      showToast('Availability window removed', 'info');
    } catch {
      setError('Could not delete availability slot.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      const category = await categoryApi.create({
        name: categoryName.trim(),
        color: categoryColor,
      });
      setCategories((old) => [...old, category]);
      setCategoryName('');
      showToast(`Category "${category.name}" created`, 'success');
    } catch {
      setError('Could not create category.');
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;
    try {
      const updated = await categoryApi.update(editingCategory.id, {
        name: editName.trim(),
        color: editColor,
      });
      setCategories((old) => old.map((c) => (c.id === editingCategory.id ? updated : c)));
      setEditingCategory(null);
      showToast(`Category "${updated.name}" updated`, 'success');
    } catch {
      setError('Could not update category.');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    try {
      await categoryApi.remove(id);
      setCategories((old) => old.filter((c) => c.id !== id));
      showToast(`Category "${name}" removed`, 'info');
    } catch {
      setError('Could not remove category.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Đã đăng xuất tài khoản an toàn.', 'info');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <section className="workspace-page" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* 1. Header with Breadcrumb & Schedule Picker */}
      <div className="section-heading" style={{ marginBottom: 20 }}>
        <div>
          <div className="calendar-breadcrumb-row" style={{ marginBottom: 6 }}>
            <span className="campus-pill">FPT UNIVERSITY · QUY NHƠN AI CAMPUS</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted, #64748b)' }}>· Học kỳ Fall 2026</span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Hồ sơ Sinh viên &amp; Cài đặt Hệ thống
          </h2>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 14 }}>
            Tùy biến avatar, thông tin học vụ, thuật toán xếp lịch và quyền truy cập không gian học tập.
          </p>
        </div>
        <SchedulePicker />
      </div>

      {error && <div className="form-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {/* 2. Hero Student Passport & ID Banner */}
      <section className="settings-hero-card">
        <div className="settings-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Avatar with Camera badge */}
            <div
              className="settings-avatar-badge-wrap"
              onClick={() => setIsAvatarModalOpen(true)}
              title="Nhấn để đổi ảnh đại diện"
              id="settings-avatar-trigger"
            >
              <img
                src={currentAvatar}
                alt={user?.displayName || 'Sinh viên'}
                className="settings-hero-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultAvatar;
                }}
              />
              <span className="settings-avatar-change-pill">
                <Camera size={12} strokeWidth={2.5} />
                <span>Đổi Avatar</span>
              </span>
            </div>

            {/* Student Info Details */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(8px)',
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                  }}
                >
                  FPT Student ID
                </span>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ShieldCheck size={12} />
                  PRO ACADEMIC
                </span>
              </div>

              <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                {user?.displayName || user?.email?.split('@')[0] || 'Sinh viên'}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13, opacity: 0.9 }}>
                <span>MSSV: <strong style={{ color: '#fed7aa', letterSpacing: '0.02em' }}>{studentRollNo}</strong></span>
                <span>·</span>
                <span>Kỹ thuật phần mềm AI</span>
                <span>·</span>
                <span>{user?.email || 'sinhvien@fpt.edu.vn'}</span>
                <span>·</span>
                <span>Tài khoản: <strong style={{ color: '#86efac' }}>Đã xác thực</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons on Hero */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={handleCopyMSSV}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Copy size={14} />
              <span>Copy MSSV</span>
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowQrModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <QrCode size={14} />
              <span>Mã QR Campus</span>
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => setIsAvatarModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
                cursor: 'pointer',
              }}
            >
              <Camera size={14} />
              <span>Đổi Avatar Studio</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Navigation Tabs */}
      <div className="settings-tabs-nav" role="tablist">
        <button
          type="button"
          className={`settings-tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          role="tab"
          aria-selected={activeTab === 'profile'}
          id="tab-profile-btn"
        >
          <User size={16} />
          <span>Hồ sơ &amp; Avatar</span>
        </button>
        <button
          type="button"
          className={`settings-tab-button ${activeTab === 'schedule-categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule-categories')}
          role="tab"
          aria-selected={activeTab === 'schedule-categories'}
          id="tab-schedule-btn"
        >
          <Calendar size={16} />
          <span>Lịch rảnh &amp; Môn học ({categories.length})</span>
        </button>
        <button
          type="button"
          className={`settings-tab-button ${activeTab === 'appearance-ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance-ai')}
          role="tab"
          aria-selected={activeTab === 'appearance-ai'}
          id="tab-appearance-btn"
        >
          <Sliders size={16} />
          <span>Giao diện &amp; Trải nghiệm AI</span>
        </button>
        <button
          type="button"
          className={`settings-tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
          role="tab"
          aria-selected={activeTab === 'security'}
          id="tab-security-btn"
        >
          <ShieldCheck size={16} />
          <span>Quyền truy cập &amp; Bảo mật</span>
        </button>
      </div>

      {/* 4. Tab Content */}

      {/* TAB 1: HỒ SƠ & AVATAR STUDIO */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Quick Avatar Presets Grid */}
          <div className="panel" style={{ padding: 24, borderRadius: 16 }}>
            <div className="panel-heading" style={{ marginBottom: 16 }}>
              <div>
                <p className="eyebrow">Identity &amp; Avatar Studio</p>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Chọn nhanh Avatar Sinh viên (1-Click)</h3>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsAvatarModalOpen(true)}
                style={{ fontSize: 13, borderRadius: 8, padding: '6px 14px' }}
              >
                + Tải ảnh từ máy / Dán URL...
              </button>
            </div>

            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Chọn avatar đại diện của bạn từ bộ sưu tập sinh viên hoặc linh vật Cóc AI Campus:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = currentAvatar === preset.url;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleQuickAvatar(preset.url)}
                    style={{
                      background: isSelected ? 'rgba(249, 115, 22, 0.08)' : 'var(--bg-subtle, #f8fafc)',
                      border: isSelected ? '2px solid #f97316' : '1px solid var(--border-color, #e2e8f0)',
                      borderRadius: 14,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? '0 6px 16px rgba(249, 115, 22, 0.2)' : 'none',
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#f97316',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    <img
                      src={preset.url}
                      alt={preset.name}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        marginBottom: 10,
                        background: '#ffffff',
                        border: isSelected ? '2.5px solid #f97316' : '1px solid rgba(0,0,0,0.06)',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/fpt-icon.png';
                      }}
                    />
                    <strong style={{ fontSize: 13, color: 'var(--text-primary, #0f172a)' }}>{preset.name}</strong>
                    <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{preset.role}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Profile Form */}
          <section className="panel user-profile-panel" style={{ padding: 24, borderRadius: 16 }}>
            <div className="panel-heading" style={{ marginBottom: 20 }}>
              <div>
                <p className="eyebrow">Personal Account</p>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Thông tin Tài khoản &amp; Học vụ</h3>
              </div>
              <span className="status-pill success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} />
                ĐÃ XÁC THỰC SSO FPT
              </span>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="settings-preferences-grid">
                {/* Display Name */}
                <div className="settings-pref-item">
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={15} color="#ea580c" />
                      <strong>Tên hiển thị</strong>
                    </div>
                    <span className="muted" style={{ fontSize: 13 }}>Tên đại diện xuất hiện trên toàn bộ lịch và kế hoạch.</span>
                    <input
                      type="text"
                      className="text-input"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Họ và tên..."
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-color, #cbd5e1)',
                        marginTop: 4,
                        fontSize: 14,
                        background: 'var(--card-bg, #ffffff)',
                      }}
                    />
                  </label>
                </div>

                {/* Email (Readonly) */}
                <div className="settings-pref-item">
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GraduationCap size={15} color="#0284c7" />
                      <strong>Email sinh viên trường</strong>
                    </div>
                    <span className="muted" style={{ fontSize: 13 }}>Địa chỉ email đăng nhập được bảo mật bởi hệ thống SSO.</span>
                    <input
                      type="email"
                      className="text-input"
                      value={user?.email || 'nhi.vn@fpt.edu.vn'}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-color, #cbd5e1)',
                        opacity: 0.75,
                        cursor: 'not-allowed',
                        marginTop: 4,
                        fontSize: 14,
                        background: 'var(--bg-subtle, #f1f5f9)',
                      }}
                    />
                  </label>
                </div>

                {/* Timezone */}
                <div className="settings-pref-item">
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={15} color="#10b981" />
                      <strong>Múi giờ làm việc (IANA)</strong>
                    </div>
                    <span className="muted" style={{ fontSize: 13 }}>Múi giờ chuẩn dùng để tính toán xếp lịch và nhắc nhở.</span>
                    <select
                      className="select-input"
                      value={profileTimezone}
                      onChange={(e) => setProfileTimezone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-color, #cbd5e1)',
                        marginTop: 4,
                        fontSize: 14,
                        background: 'var(--card-bg, #ffffff)',
                      }}
                    >
                      <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7 · Việt Nam)</option>
                      <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                      <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    </select>
                  </label>
                </div>

                {/* Locale */}
                <div className="settings-pref-item">
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Laptop size={15} color="#8b5cf6" />
                      <strong>Ngôn ngữ &amp; Định dạng (Locale)</strong>
                    </div>
                    <span className="muted" style={{ fontSize: 13 }}>Quy cách hiển thị số liệu và định dạng ngày tháng.</span>
                    <select
                      className="select-input"
                      value={profileLocale}
                      onChange={(e) => setProfileLocale(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-color, #cbd5e1)',
                        marginTop: 4,
                        fontSize: 14,
                        background: 'var(--card-bg, #ffffff)',
                      }}
                    >
                      <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                      <option value="en-US">English (en-US)</option>
                    </select>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSavingProfile}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 24px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
                  }}
                  id="save-profile-btn"
                >
                  <Save size={16} />
                  <span>{isSavingProfile ? 'Đang lưu...' : 'Lưu thông tin hồ sơ'}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* TAB 2: LỊCH RẢNH & DANH MỤC HỌC TẬP */}
      {activeTab === 'schedule-categories' && (
        <div>
          {!activeScheduleId ? (
            <div className="panel empty-state">
              <strong>Vui lòng chọn hoặc tạo lịch trước</strong>
              <span>Khung giờ khả dụng và danh mục môn học được cấu hình theo từng không gian lập lịch.</span>
            </div>
          ) : (
            <div className="two-column">
              {/* Weekly Availability Panel */}
              <div className="panel" style={{ padding: 24, borderRadius: 16 }}>
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Capacity</p>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Weekly availability</h3>
                  </div>
                  <span className="muted">Giờ địa phương</span>
                </div>
                <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
                  Động cơ xếp lịch OR-Tools CP-SAT chỉ bố trí phiên học tập trong các khung giờ khả dụng được bật.
                </p>
                {weekdays.map((day, index) => (
                  <div className="availability-row" key={day}>
                    <strong>{day}</strong>
                    <div className="availability-slots">
                      {availability
                        .filter((item) => item.dayOfWeek === index + 1)
                        .map((item) => (
                          <span className="availability-chip" key={item.id}>
                            {item.startTime.slice(0, 5)}–{item.endTime.slice(0, 5)}
                            <button
                              onClick={() => void removeAvailability(item.id)}
                              aria-label={`Remove ${day} availability`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      <button className="text-button" onClick={() => void addAvailability(index + 1)}>
                        + 09:00–17:00
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Categories Management Panel */}
              <div className="panel" style={{ padding: 24, borderRadius: 16 }}>
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Organization</p>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Academic Categories</h3>
                  </div>
                  <span className="status-pill info">{categories.length} total</span>
                </div>
                <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
                  Sự kiện và tiết học kế thừa mã màu danh mục theo mặc định. Bạn có thể chỉnh sửa linh hoạt.
                </p>

                {/* Add Category Form */}
                <form className="category-create-box" onSubmit={handleAddCategory}>
                  <div className="inline-form">
                    <input
                      placeholder="Tên danh mục mới (vd: Trí tuệ nhân tạo)..."
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      required
                      style={{ borderRadius: 8, padding: '8px 12px' }}
                    />
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={!categoryName.trim()}
                      style={{ borderRadius: 8, padding: '8px 14px' }}
                    >
                      <Plus size={14} /> Thêm
                    </button>
                  </div>

                  {/* Color Swatch Row for New Category */}
                  <div className="category-color-picker-row" style={{ marginTop: 10 }}>
                    <span className="category-color-label">Màu sắc:</span>
                    <div className="color-swatch-list mini">
                      {COLOR_PALETTE.map((swatch) => (
                        <button
                          type="button"
                          key={swatch.id}
                          className={`color-swatch-btn mini ${categoryColor === swatch.hex ? 'active' : ''}`}
                          style={{ backgroundColor: swatch.hex }}
                          onClick={() => setCategoryColor(swatch.hex)}
                          title={swatch.name}
                        >
                          {categoryColor === swatch.hex && <Check size={10} color="#ffffff" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>

                {/* Category List */}
                <div className="category-manager-list" style={{ marginTop: 16 }}>
                  {categories.map((cat) => (
                    <div className="category-row-card" key={cat.id}>
                      <div className="category-info-col">
                        <span className="category-indicator-dot" style={{ backgroundColor: cat.color }} />
                        <strong>{cat.name}</strong>
                      </div>
                      <div className="category-actions-col">
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => handleStartEditCategory(cat)}
                          title="Edit category"
                          aria-label="Edit category"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => void handleDeleteCategory(cat.id, cat.name)}
                          title="Delete category"
                          aria-label="Delete category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GIAO DIỆN & TRẢI NGHIỆM AI */}
      {activeTab === 'appearance-ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Appearance & Accessibility Panel */}
          <section className="panel appearance-accessibility-panel" style={{ padding: 24, borderRadius: 16 }}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Preferences &amp; UX</p>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Appearance &amp; Accessibility</h3>
              </div>
              <span className="status-pill info">User Experience</span>
            </div>

            <div className="settings-preferences-grid">
              {/* Time Format */}
              <div className="settings-pref-item">
                <div className="pref-header">
                  <Clock size={16} className="pref-icon text-blue" />
                  <div>
                    <strong>Định dạng hiển thị giờ</strong>
                    <p className="muted">Chọn định dạng 24-giờ (chuẩn học vụ) hoặc 12-giờ AM/PM.</p>
                  </div>
                </div>
                <div className="segmented-control" role="radiogroup" aria-label="Time format">
                  <button
                    type="button"
                    className={`segmented-btn ${timeFormat === '24h' ? 'active' : ''}`}
                    onClick={() => {
                      setTimeFormat('24h');
                      showToast('Đã đổi sang định dạng 24-giờ (14:00)', 'info');
                    }}
                    role="radio"
                    aria-checked={timeFormat === '24h'}
                  >
                    24-Hour (14:00)
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${timeFormat === '12h' ? 'active' : ''}`}
                    onClick={() => {
                      setTimeFormat('12h');
                      showToast('Đã đổi sang định dạng 12-giờ (2:00 PM)', 'info');
                    }}
                    role="radio"
                    aria-checked={timeFormat === '12h'}
                  >
                    12-Hour (2:00 PM)
                  </button>
                </div>
              </div>

              {/* High Contrast Mode */}
              <div className="settings-pref-item">
                <div className="pref-header">
                  <Contrast size={16} className="pref-icon text-amber" />
                  <div>
                    <strong>Chế độ tương phản cao (High Contrast)</strong>
                    <p className="muted">Tăng cường đường viền sự kiện và độ rõ nét của chữ.</p>
                  </div>
                </div>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => {
                      setHighContrast(e.target.checked);
                      showToast(
                        e.target.checked ? 'Đã bật chế độ tương phản cao' : 'Đã tắt chế độ tương phản cao',
                        'info'
                      );
                    }}
                  />
                  <span className="switch-slider" />
                  <span className="switch-text">{highContrast ? 'Đang bật' : 'Đang tắt'}</span>
                </label>
              </div>

              {/* Onboarding Tour Replay */}
              <div className="settings-pref-item">
                <div className="pref-header">
                  <HelpCircle size={16} className="pref-icon text-emerald" />
                  <div>
                    <strong>Hướng dẫn Onboarding Tour</strong>
                    <p className="muted">Xem lại các bước làm quen với Thời khóa biểu, Xếp lịch và phím tắt ⌘K.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setHasCompletedOnboarding(false);
                    showToast('Đã đặt lại tour hướng dẫn. Bắt đầu khám phá!', 'info');
                  }}
                  style={{ borderRadius: 8, padding: '8px 16px' }}
                >
                  <Sparkles size={14} />
                  <span>Xem lại hướng dẫn</span>
                </button>
              </div>
            </div>
          </section>

          {/* Dashboard Customization (Wallpapers, Themes, GPS Weather) */}
          <DashboardAppearanceSection />

          {/* Dynamic Location Engine (Custom POI & Universal Routing) */}
          <UserLocationsSection />
        </div>
      )}

      {/* TAB 4: QUYỀN TRUY CẬP, TÍCH HỢP & BẢO MẬT */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Algorithm Access & Optimization Features Panel */}
          <section className="panel" style={{ borderLeft: '4px solid #10b981', padding: 24, borderRadius: 16 }}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Algorithm Engine &amp; Feature Access</p>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Quyền truy cập Thuật toán &amp; Tính năng</h3>
              </div>
              <span className="status-pill success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} />
                ĐÃ MỞ KHÓA TOÀN BỘ
              </span>
            </div>
            <p className="muted" style={{ marginBottom: 16 }}>
              Hệ thống đang mở toàn bộ tính năng và động cơ tối ưu nâng cao cho sinh viên FPT Quy Nhơn:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                <span><strong>Google OR-Tools CP-SAT Solver v2.4</strong>: Tối ưu phân bổ lịch học và hạn chế khoảng trống mệt mỏi</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                <span><strong>Campus Mobility Routing</strong>: Cảnh báo và tính toán thời gian đi bộ giữa các giảng đường Alpha &amp; Beta</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                <span><strong>What-If Simulation Engine</strong>: Thử nghiệm kịch bản dời lịch và đánh giá rủi ro trễ hạn chót</span>
              </div>
            </div>

            <div className="inline-form" style={{ alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⚡</span>
                <span>Tất cả tài khoản đăng nhập đều được mặc định kích hoạt đầy đủ mọi tính năng AI cao cấp.</span>
              </span>
            </div>
          </section>

          {/* Open API & LMS/HR Integrations */}
          <OpenApiSection />

          {/* Integrations Hub (Google Calendar, Outlook, CalDAV & RFC 5545 iCalendar) */}
          <IntegrationsSection />

          {/* Workspace Profile & Demo Data */}
          <section className="panel" style={{ padding: 24, borderRadius: 16 }}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Workspace Profile</p>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>FPT University Quy Nhơn AI Campus</h3>
              </div>
              <span className="status-pill info">Academic Year 2026</span>
            </div>
            <p className="muted" style={{ marginBottom: 16 }}>
              SmartSchedule được cấu hình riêng cho sinh viên Đại học FPT Quy Nhơn với múi giờ <code>Asia/Ho_Chi_Minh</code>.
            </p>
            <div className="inline-form" style={{ gap: 10 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => exportDemoLog()}
                style={{ borderRadius: 8, padding: '8px 16px' }}
              >
                Xuất bản ghi mẫu (Export log)
              </button>
              <button
                type="button"
                className="secondary-button danger"
                onClick={() => {
                  resetDemoData();
                  showToast('Dữ liệu mẫu đã được khôi phục về trạng thái ban đầu.', 'info');
                  setTimeout(() => window.location.reload(), 400);
                }}
                style={{ borderRadius: 8, padding: '8px 16px' }}
              >
                Khôi phục dữ liệu mẫu ban đầu
              </button>
            </div>
          </section>

          {/* Account & Session Security Panel */}
          <div
            className="settings-card"
            style={{
              padding: '24px',
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '16px',
              border: '1px solid var(--border-color, #e2e8f0)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div className="settings-card-header" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary, #0f172a)' }}>
                Tài khoản &amp; Phiên làm việc
              </h3>
              <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
                Quản lý phiên đăng nhập và bảo mật thiết bị của bạn
              </p>
            </div>
            <div
              className="settings-card-body"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                padding: '16px',
                background: 'var(--bg-subtle, #f8fafc)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: 14 }}>
                  Đang đăng nhập: <strong>{user?.email || 'nhi.vn@fpt.edu.vn'}</strong>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    Gói tài khoản: {user?.tier || 'PRO ACADEMIC'}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Thiết bị hiện tại · Web Browser</span>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                style={{
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  cursor: 'pointer',
                  padding: '9px 20px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(239, 68, 68, 0.06)',
                }}
                onClick={handleLogout}
                id="logout-btn"
              >
                <LogOut size={16} />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Dialog */}
      {editingCategory && (
        <div className="dialog-backdrop" onClick={() => setEditingCategory(null)}>
          <div
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit category"
          >
            <div className="panel-heading">
              <h3>Edit category</h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditingCategory(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEditCategory} className="edit-category-form">
              <label className="field">
                <span>Category Name</span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </label>

              <div className="field">
                <span>Category Color</span>
                <div className="color-swatch-list">
                  {COLOR_PALETTE.map((swatch) => (
                    <button
                      type="button"
                      key={swatch.id}
                      className={`color-swatch-btn ${editColor === swatch.hex ? 'active' : ''}`}
                      style={{ backgroundColor: swatch.hex }}
                      onClick={() => setEditColor(swatch.hex)}
                      title={swatch.name}
                    >
                      {editColor === swatch.hex && <Check size={11} color="#ffffff" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="drawer-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={!editName.trim()}>
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campus QR Modal */}
      {showQrModal && (
        <div className="dialog-backdrop" onClick={() => setShowQrModal(false)} role="dialog" aria-modal="true">
          <div
            className="avatar-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 380,
              padding: 24,
              textAlign: 'center',
              borderRadius: 20,
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>
                FPT AI CAMPUS GATE PASS
              </span>
              <button type="button" className="icon-button" onClick={() => setShowQrModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 16, display: 'inline-block', marginBottom: 16 }}>
              <svg className="w-36 h-36 mx-auto text-slate-900" viewBox="0 0 24 24" fill="currentColor" style={{ width: 140, height: 140 }}>
                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h-4v2h2v4h2v-2h2v-2h-2v-2zm-4 4h-2v2h2v-2zm4 0h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z" />
              </svg>
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px 0' }}>{user?.displayName || user?.email?.split('@')[0] || 'Sinh viên'}</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b' }}>MSSV: {studentRollNo} · Quy Nhơn AI Campus</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => setShowQrModal(false)}
              style={{ width: '100%', borderRadius: 10, padding: 10 }}
            >
              Đóng mã QR
            </button>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      <AvatarModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} />
    </section>
  );
}
