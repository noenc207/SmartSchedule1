import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  Calendar,
  Sparkles,
  LogOut,
  Moon,
  Sun,
  Camera,
  Check,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { usePreferenceStore } from '../stores/preferenceStore';
import { showToast } from '../components/Toast';
import { AVATAR_PRESETS } from '../features/settings/components/AvatarModal';
import { userApi } from '../services/userApi';

interface UserQuickDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAvatarModal: () => void;
  dark: boolean;
  setDark: React.Dispatch<React.SetStateAction<boolean>>;
}

export function UserQuickDropdown({
  isOpen,
  onClose,
  onOpenAvatarModal,
  dark,
  setDark,
}: UserQuickDropdownProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, updateUser, logout } = useAuthStore();
  const { timeFormat, setTimeFormat } = usePreferenceStore();

  const currentAvatar =
    user?.avatarUrl ||
    `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user?.displayName || user?.email || 'Student')}&backgroundColor=fed7aa,dbeafe`;

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleQuickAvatarSelect = async (avatarUrl: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartschedule-demo-avatar', avatarUrl);
    }
    updateUser({ avatarUrl });
    await userApi.update({ avatarUrl }).catch(() => {});
    showToast('Đã đổi avatar thành công!', 'success');
  };

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
      showToast('Đã đăng xuất tài khoản an toàn.', 'info');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="user-quick-dropdown-panel"
      role="menu"
      aria-label="Khung tùy biến người dùng nhanh"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 320,
        background: 'var(--card-bg, #ffffff)',
        borderRadius: 16,
        boxShadow: '0 20px 48px -12px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'quickDropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* 1. Header Profile Summary */}
      <div
        style={{
          padding: '16px 18px',
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={currentAvatar}
              alt={user?.displayName || 'Avatar'}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #f97316',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
                backgroundColor: '#ffffff',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = currentAvatar;
              }}
            />
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAvatarModal();
              }}
              title="Đổi ảnh đại diện"
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#f97316',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              <Camera size={11} strokeWidth={2.5} />
            </button>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <strong
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary, #0f172a)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                }}
              >
                {user?.displayName || user?.email?.split('@')[0] || 'Sinh viên'}
              </strong>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--text-muted, #64748b)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.email || 'sinhvien@fpt.edu.vn'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                }}
              >
                <ShieldCheck size={10} />
                PRO K15
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>· Quy Nhơn AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Avatar Switcher (1-Click Carousel) */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          background: 'var(--bg-subtle, #f8fafc)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
            Đổi Avatar Nhanh (1-Click)
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAvatarModal();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ea580c',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Tất cả &rarr;
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {AVATAR_PRESETS.slice(0, 5).map((preset) => {
            const isSelected = currentAvatar === preset.url;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleQuickAvatarSelect(preset.url)}
                title={preset.name}
                style={{
                  position: 'relative',
                  padding: 2,
                  borderRadius: '50%',
                  background: 'transparent',
                  border: isSelected ? '2px solid #f97316' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    backgroundColor: '#ffffff',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = currentAvatar;
                  }}
                />
                {isSelected && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -1,
                      right: -1,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#f97316',
                      border: '1.5px solid #ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={8} color="#ffffff" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAvatarModal();
            }}
            title="Mở thư viện ảnh đại diện"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1px dashed #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* 3. Quick Preferences Toggles */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
        {/* Dark / Light Mode Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-primary, #1e293b)' }}>
            {dark ? <Moon size={16} color="#818cf8" /> : <Sun size={16} color="#f59e0b" />}
            <span>Giao diện {dark ? 'Tối' : 'Sáng'}</span>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setDark((prev) => !prev)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              borderRadius: 6,
              height: 'auto',
              fontWeight: 600,
            }}
          >
            {dark ? 'Bật sáng' : 'Bật tối'}
          </button>
        </div>

        {/* 24h / 12h Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-primary, #1e293b)' }}>
            <Clock size={16} color="#0284c7" />
            <span>Định dạng giờ: <strong>{timeFormat === '24h' ? '24h' : '12h'}</strong></span>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              const next = timeFormat === '24h' ? '12h' : '24h';
              setTimeFormat(next);
              showToast(`Đã chuyển sang định dạng ${next}`, 'info');
            }}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              borderRadius: 6,
              height: 'auto',
              fontWeight: 600,
            }}
          >
            Đổi {timeFormat === '24h' ? '12h' : '24h'}
          </button>
        </div>
      </div>

      {/* 4. Navigation Shortcuts */}
      <div style={{ padding: '6px' }}>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/settings');
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--text-primary, #1e293b)',
            fontSize: 13,
            fontWeight: 500,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle, #f1f5f9)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={16} color="#64748b" />
            <span>Cài đặt &amp; Hồ sơ cá nhân</span>
          </div>
          <ChevronRight size={14} color="#94a3b8" />
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/scheduling');
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--text-primary, #1e293b)',
            fontSize: 13,
            fontWeight: 500,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle, #f1f5f9)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} color="#ea580c" />
            <span>Studio Xếp lịch &amp; OR-Tools</span>
          </div>
          <ChevronRight size={14} color="#94a3b8" />
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/calendar');
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--text-primary, #1e293b)',
            fontSize: 13,
            fontWeight: 500,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle, #f1f5f9)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={16} color="#0284c7" />
            <span>Thời khóa biểu sinh viên</span>
          </div>
          <ChevronRight size={14} color="#94a3b8" />
        </button>
      </div>

      {/* 5. Logout Action */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          background: 'var(--bg-subtle, #fafaf9)',
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          id="quick-dropdown-logout-btn"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#dc2626',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.15)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.08)')}
        >
          <LogOut size={16} />
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    </div>
  );
}
