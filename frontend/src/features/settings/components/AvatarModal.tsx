import React, { useState, useRef } from 'react';
import { X, Check, Upload, Link as LinkIcon, Sparkles, Image, RefreshCw, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { userApi } from '../../../services/userApi';
import { showToast } from '../../../components/Toast';

export interface AvatarPreset {
  id: string;
  name: string;
  role: string;
  url: string;
  badge?: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'student-default',
    name: 'Sinh viên FPT',
    role: 'Avatar Vector Chuẩn',
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=FPTStudent&backgroundColor=fed7aa,dbeafe',
    badge: 'Vector AI',
  },
  {
    id: 'coc-chat',
    name: 'Cóc AI Campus',
    role: 'Linh vật FPT Quy Nhơn',
    url: '/mascot-chat.png',
    badge: 'Mascot AI',
  },
  {
    id: 'coc-thumbsup',
    name: 'Cóc Tuyệt Vời',
    role: 'Động lực học tập',
    url: '/banner/mascot_thumbsup.png',
    badge: 'Động lực',
  },
  {
    id: 'coc-waving',
    name: 'Cóc Vẫy Chào',
    role: 'Năng động sáng tạo',
    url: '/banner/mascot_waving.png',
    badge: 'Năng động',
  },
  {
    id: 'coc-thinking',
    name: 'Cóc Trí Tuệ',
    role: 'Nghiên cứu & Thuật toán',
    url: '/mascot-thinking.png',
    badge: 'Nghiên cứu',
  },
  {
    id: 'fpt-seal',
    name: 'FPT University Seal',
    role: 'Biểu tượng Học hiệu FPT',
    url: '/fpt-icon.png',
    badge: 'FPT Official',
  },
];

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarUpdated?: (newUrl: string) => void;
}

export function AvatarModal({ isOpen, onClose, onAvatarUpdated }: AvatarModalProps) {
  const { user, updateUser } = useAuthStore();
  const defaultAvatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user?.displayName || user?.email || 'Student')}&backgroundColor=fed7aa,dbeafe`;
  const currentAvatar = user?.avatarUrl || defaultAvatar;
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh (PNG, JPG, WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh không vượt quá 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSelectedAvatar(dataUrl);
        showToast('Đã tải ảnh lên! Nhấn "Lưu ảnh đại diện" để hoàn tất.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    setSelectedAvatar(customUrl.trim());
    showToast('Đã nhận diện URL hình ảnh!', 'info');
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatar) return;
    setIsApplying(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('smartschedule-demo-avatar', selectedAvatar);
      }
      updateUser({ avatarUrl: selectedAvatar });
      await userApi.update({ avatarUrl: selectedAvatar }).catch(() => {
        // Fallback gracefully in offline/demo mode
      });
      if (onAvatarUpdated) {
        onAvatarUpdated(selectedAvatar);
      }
      showToast('Cập nhật ảnh đại diện thành công!', 'success');
      onClose();
    } catch {
      showToast('Không thể lưu ảnh đại diện. Vui lòng thử lại.', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="dialog-backdrop avatar-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="avatar-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 580,
          background: 'var(--card-bg, #ffffff)',
          borderRadius: 20,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          animation: 'avatarModalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                Tùy biến Avatar Sinh viên
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #64748b)' }}>
                Chọn linh vật FPT Campus hoặc tải ảnh cá nhân đại diện
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            style={{ borderRadius: 8, padding: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Active Preview Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: 16,
              background: 'var(--bg-subtle, #f8fafc)',
              borderRadius: 16,
              border: '1px solid var(--border-color, #e2e8f0)',
              marginBottom: 24,
            }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={selectedAvatar}
                alt="Avatar đã chọn"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #f97316',
                  boxShadow: '0 8px 24px rgba(249, 115, 22, 0.25)',
                  backgroundColor: '#ffffff',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultAvatar;
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Đang xem trước"
              >
                <Check size={12} color="#ffffff" strokeWidth={3} />
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(249, 115, 22, 0.12)',
                    color: '#ea580c',
                  }}
                >
                  ĐANG XEM TRƯỚC
                </span>
                <span style={{ fontSize: 13, color: '#64748b' }}>FPT Quy Nhơn AI Campus</span>
              </div>
              <strong style={{ fontSize: 16, color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                {user?.displayName || user?.email?.split('@')[0] || 'Sinh viên'}
              </strong>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Ảnh đại diện này sẽ đồng bộ trên toàn bộ Header, Dashboard và Thẻ sinh viên.
              </p>
            </div>
          </div>

          {/* Section 1: Presets Gallery */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
                Bộ sưu tập Linh vật &amp; Sinh viên FPT
              </h4>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{AVATAR_PRESETS.length} mẫu chuẩn</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 12,
              }}
            >
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedAvatar === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatar(preset.url)}
                    style={{
                      background: isSelected ? 'rgba(249, 115, 22, 0.06)' : 'var(--card-bg, #ffffff)',
                      border: isSelected ? '2px solid #f97316' : '1px solid var(--border-color, #e2e8f0)',
                      borderRadius: 14,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? '0 6px 16px rgba(249, 115, 22, 0.16)' : '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 18,
                          height: 18,
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
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        marginBottom: 8,
                        background: '#f1f5f9',
                        border: isSelected ? '2px solid #f97316' : '1px solid rgba(0,0,0,0.06)',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/fpt-icon.png';
                      }}
                    />
                    <strong style={{ fontSize: 13, color: 'var(--text-primary, #0f172a)', lineHeight: 1.2 }}>
                      {preset.name}
                    </strong>
                    <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{preset.role}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Upload File or Custom URL */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'var(--bg-subtle, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
              Tải ảnh từ máy tính hoặc dán URL
            </h4>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  borderColor: '#cbd5e1',
                  background: '#ffffff',
                }}
              >
                <Upload size={15} />
                <span>Chọn ảnh từ thiết bị (PNG, JPG, WEBP)</span>
              </button>
            </div>

            <form onSubmit={handleApplyCustomUrl} style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <LinkIcon
                  size={15}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
                <input
                  type="url"
                  placeholder="Hoặc dán liên kết ảnh trực tiếp (https://...)"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontSize: 13,
                    background: '#ffffff',
                  }}
                />
              </div>
              <button
                type="submit"
                className="secondary-button"
                disabled={!customUrl.trim()}
                style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13 }}
              >
                Nhận ảnh
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            background: 'var(--bg-subtle, #f8fafc)',
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={isApplying}
            style={{ borderRadius: 10, padding: '9px 18px', fontWeight: 600 }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleSaveAvatar}
            disabled={isApplying}
            style={{
              borderRadius: 10,
              padding: '9px 20px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: 'none',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
            }}
          >
            <UserCheck size={16} />
            <span>{isApplying ? 'Đang cập nhật...' : 'Lưu ảnh đại diện'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
