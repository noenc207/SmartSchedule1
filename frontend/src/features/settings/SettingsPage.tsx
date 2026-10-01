import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, Contrast, Edit3, HelpCircle, Palette, Plus, Sparkles, Trash2, X } from 'lucide-react';
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

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function SettingsPage() {
  const navigate = useNavigate();
  const { activeScheduleId } = useWorkspaceStore();
  const { user, updateUser, setTier } = useAuthStore();
  const {
    timeFormat,
    setTimeFormat,
    highContrast,
    setHighContrast,
    setHasCompletedOnboarding,
  } = usePreferenceStore();

  const [profileName, setProfileName] = useState(user?.displayName || '');
  const [profileTimezone, setProfileTimezone] = useState(user?.timezone || 'Asia/Ho_Chi_Minh');
  const [profileLocale, setProfileLocale] = useState(user?.locale || 'vi-VN');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.displayName);
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Tên hiển thị không được để trống.', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      const updated = await userApi.update({
        name: profileName.trim(),
        timezone: profileTimezone,
        locale: profileLocale,
      });
      updateUser(updated);
      showToast('Cập nhật thông tin hồ sơ thành công!', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err) || 'Không thể cập nhật hồ sơ.', 'error');
    } finally {
      setIsSavingProfile(false);
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

  return (
    <section className="workspace-page">
      <div className="section-heading">
        <div>
          <div className="calendar-breadcrumb-row">
            <span className="campus-pill">FPT UNIVERSITY · QUY NHƠN AI CAMPUS</span>
          </div>
          <h2>Settings</h2>
          <p className="muted">Configure student availability hours, academic categories, and workspace preferences.</p>
        </div>
        <SchedulePicker />
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {/* User Profile Panel */}
      <section className="panel user-profile-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Personal Account</p>
            <h3>Tài khoản &amp; Hồ sơ người dùng</h3>
          </div>
          <span className="status-pill success">{user?.email || 'Đã xác thực'}</span>
        </div>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="settings-preferences-grid">
            <div className="settings-pref-item">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <strong>Tên hiển thị</strong>
                <span className="muted" style={{ fontSize: 13 }}>Tên đại diện xuất hiện trên toàn bộ lịch và kế hoạch.</span>
                <input
                  type="text"
                  className="text-input"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Họ và tên..."
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color, #cbd5e1)', marginTop: 4 }}
                />
              </label>
            </div>
            <div className="settings-pref-item">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <strong>Email</strong>
                <span className="muted" style={{ fontSize: 13 }}>Địa chỉ email đăng nhập được bảo mật bởi hệ thống.</span>
                <input
                  type="email"
                  className="text-input"
                  value={user?.email || ''}
                  disabled
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color, #cbd5e1)', opacity: 0.7, cursor: 'not-allowed', marginTop: 4 }}
                />
              </label>
            </div>
            <div className="settings-pref-item">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <strong>Múi giờ làm việc (IANA)</strong>
                <span className="muted" style={{ fontSize: 13 }}>Múi giờ chuẩn dùng để tính toán xếp lịch và nhắc nhở.</span>
                <select
                  className="select-input"
                  value={profileTimezone}
                  onChange={(e) => setProfileTimezone(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color, #cbd5e1)', marginTop: 4 }}
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
            <div className="settings-pref-item">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <strong>Ngôn ngữ &amp; Định dạng (Locale)</strong>
                <span className="muted" style={{ fontSize: 13 }}>Quy cách hiển thị số liệu và định dạng ngày tháng.</span>
                <select
                  className="select-input"
                  value={profileLocale}
                  onChange={(e) => setProfileLocale(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color, #cbd5e1)', marginTop: 4 }}
                >
                  <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                  <option value="en-US">English (en-US)</option>
                </select>
              </label>
            </div>
          </div>
          <div>
            <button type="submit" className="primary-button" disabled={isSavingProfile}>
              {isSavingProfile ? 'Đang lưu...' : 'Lưu thông tin hồ sơ'}
            </button>
          </div>
        </form>
      </section>

      {/* Algorithm Access & Optimization Features Panel */}
      <section className="panel" style={{ borderLeft: '4px solid #10b981' }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Algorithm Engine &amp; Feature Access</p>
            <h3>Quyền truy cập Thuật toán &amp; Tính năng</h3>
          </div>
          <span className="status-pill success">
            ✓ ĐÃ MỞ KHÓA TOÀN BỘ
          </span>
        </div>
        <p className="muted" style={{ marginBottom: 16 }}>
          Hệ thống đang mở toàn bộ tính năng và động cơ tối ưu nâng cao trong thời gian thử nghiệm cho tất cả người dùng:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: '#16a34a' }}>✓</span>
            <span><strong>Google OR-Tools CP-SAT Solver</strong>: Tối ưu phân bổ lịch học và hạn chế khoảng trống mệt mỏi</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: '#16a34a' }}>✓</span>
            <span><strong>Campus Mobility Routing</strong>: Cảnh báo và tính toán thời gian đi bộ giữa các giảng đường Alpha &amp; Beta</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: '#16a34a' }}>✓</span>
            <span><strong>What-If Simulation Engine</strong>: Thử nghiệm kịch bản dời lịch và đánh giá rủi ro trễ hạn chót</span>
          </div>
        </div>

        <div className="inline-form" style={{ alignItems: 'center', gap: 12 }}>
          <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>⚡</span>
            <span>Tất cả tài khoản mới tạo hoặc đăng nhập đều được mặc định kích hoạt đầy đủ mọi tính năng.</span>
          </span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workspace Profile</p>
            <h3>FPT University Quy Nhơn AI Campus</h3>
          </div>
          <span className="status-pill info">Academic Year 2026</span>
        </div>
        <p className="muted">
          SmartSchedule is configured for FPT University Quy Nhơn students with timezone <code>Asia/Ho_Chi_Minh</code>.
        </p>
        <div className="inline-form">
          <button className="secondary-button" onClick={() => exportDemoLog()}>
            Export demo log
          </button>
          <button
            className="secondary-button danger"
            onClick={() => {
              resetDemoData();
              showToast('Demo dataset reset to initial state', 'info');
              setTimeout(() => window.location.reload(), 400);
            }}
          >
            Reset demo data
          </button>
        </div>
      </section>

      {/* Appearance & Accessibility Panel */}
      <section className="panel appearance-accessibility-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Preferences & UX</p>
            <h3>Appearance &amp; Accessibility</h3>
          </div>
          <span className="status-pill info">User Experience</span>
        </div>

        <div className="settings-preferences-grid">
          {/* Time Format */}
          <div className="settings-pref-item">
            <div className="pref-header">
              <Clock size={16} className="pref-icon text-blue" />
              <div>
                <strong>Time Display Format</strong>
                <p className="muted">Choose 24-hour (academic standard) or 12-hour AM/PM formatting.</p>
              </div>
            </div>
            <div className="segmented-control" role="radiogroup" aria-label="Time format">
              <button
                type="button"
                className={`segmented-btn ${timeFormat === '24h' ? 'active' : ''}`}
                onClick={() => {
                  setTimeFormat('24h');
                  showToast('Time format set to 24-hour (14:00)', 'info');
                }}
                role="radio"
                aria-checked={timeFormat === '24h'}
              >
                24-Hour (Default · 14:00)
              </button>
              <button
                type="button"
                className={`segmented-btn ${timeFormat === '12h' ? 'active' : ''}`}
                onClick={() => {
                  setTimeFormat('12h');
                  showToast('Time format set to 12-hour (2:00 PM)', 'info');
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
                <strong>High Contrast Mode</strong>
                <p className="muted">Enhance visual borders, event dividers, and text legibility for accessibility.</p>
              </div>
            </div>
            <label className="switch-label">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => {
                  setHighContrast(e.target.checked);
                  showToast(
                    e.target.checked ? 'High contrast mode enabled' : 'High contrast mode disabled',
                    'info'
                  );
                }}
              />
              <span className="switch-slider" />
              <span className="switch-text">{highContrast ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {/* Onboarding Tour Replay */}
          <div className="settings-pref-item">
            <div className="pref-header">
              <HelpCircle size={16} className="pref-icon text-emerald" />
              <div>
                <strong>Product Onboarding Tour</strong>
                <p className="muted">Walk through calendar, tasks, smart scheduling, and ⌘K shortcuts again.</p>
              </div>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setHasCompletedOnboarding(false);
                showToast('Onboarding tour reset. Welcome back!', 'info');
              }}
            >
              <Sparkles size={14} />
              <span>Replay Onboarding Tour</span>
            </button>
          </div>
        </div>
      </section>

      {/* Dashboard Customization (Wallpapers, Themes, GPS Weather) */}
      <DashboardAppearanceSection />

      {/* Dynamic Location Engine (Custom POI & Universal Routing) */}
      <UserLocationsSection />

      {/* Open API & LMS/HR Integrations */}
      <OpenApiSection />

      {/* Integrations Hub (Google Calendar, Outlook, CalDAV & RFC 5545 iCalendar) */}
      <IntegrationsSection />

      {!activeScheduleId ? (
        <div className="panel empty-state">
          <strong>Create a schedule first</strong>
          <span>Availability and categories are configured per planning workspace.</span>
        </div>
      ) : (
        <div className="two-column">
          {/* Weekly Availability Panel */}
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Capacity</p>
                <h3>Weekly availability</h3>
              </div>
              <span className="muted">Local time</span>
            </div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
              The scheduling engine only plans focus sessions within enabled availability windows.
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
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Organization</p>
                <h3>Academic Categories</h3>
              </div>
              <span className="status-pill info">{categories.length} total</span>
            </div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
              Events inherit category colors by default. You can override individual event colors anytime.
            </p>

            {/* Add Category Form */}
            <form className="category-create-box" onSubmit={handleAddCategory}>
              <div className="inline-form">
                <input
                  placeholder="New category name (e.g. AI Research)"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                />
                <button type="submit" className="primary-button" disabled={!categoryName.trim()}>
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* Color Swatch Row for New Category */}
              <div className="category-color-picker-row">
                <span className="category-color-label">Color:</span>
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
            <div className="category-manager-list">
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

      {/* Account & Session Section */}
      <div className="settings-card" style={{ marginTop: '24px', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="settings-card-header">
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>Tài khoản & Phiên làm việc</h3>
          <p className="muted" style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Quản lý phiên đăng nhập trên thiết bị này</p>
        </div>
        <div className="settings-card-body" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0 }}>Đang đăng nhập: <strong>{user?.email}</strong> (Gói: <strong>{user?.tier || 'PRO'}</strong>)</p>
          <button
            type="button"
            className="secondary-button"
            style={{ color: '#ef4444', borderColor: '#fca5a5', cursor: 'pointer', padding: '6px 16px', borderRadius: '8px' }}
            onClick={async () => {
              await useAuthStore.getState().logout();
              navigate('/login', { replace: true });
            }}
            id="logout-btn"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </section>
  );
}
