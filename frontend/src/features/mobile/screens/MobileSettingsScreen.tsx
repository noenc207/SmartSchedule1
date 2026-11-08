import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sun,
  Moon,
  Bell,
  Calendar,
  RotateCcw,
  LogOut,
  User,
  Shield,
  Smartphone,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  MobilePageHeader,
  MobileSection,
  MobileListItem,
} from '../../../components/mobile';
import { useAuth } from '../../../hooks/useAuth';
import { resetDemoData } from '../../../services/demoBackend';
import { AvatarModal } from '../../settings/components/AvatarModal';
import { showToast } from '../../../components/Toast';

export function MobileSettingsScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('smartschedule-theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [pushNotifs, setPushNotifs] = useState(true);
  const [googleSync, setGoogleSync] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('smartschedule-theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);

  const studentName = user?.displayName || user?.email?.split('@')[0] || 'Sinh viên';
  const studentEmail = user?.email || 'sinhvien@fpt.edu.vn';
  const defaultAvatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user?.displayName || user?.email || 'Student')}&backgroundColor=fed7aa,dbeafe`;
  const currentAvatar = user?.avatarUrl || defaultAvatar;

  const studentRollNo = useMemo(() => {
    if (user?.email) {
      const match = user.email.match(/([a-zA-Z]{2}\d{5,7})/i);
      if (match) return match[1].toUpperCase();
    }
    return user?.id ? `FPT-${user.id.slice(0, 6).toUpperCase()}` : 'FPT-STUDENT';
  }, [user]);

  const handleResetData = () => {
    resetDemoData();
    showToast('Đã khôi phục dữ liệu mẫu ban đầu!', 'info');
    setTimeout(() => window.location.reload(), 400);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="mobile-app-shell">
      <MobilePageHeader title="Hồ sơ & Cài đặt" subtitle="Quản lý tài khoản và thiết bị" />

      <main className="mobile-view-container">
        {/* FPT University Student Card */}
        <section className="mb-5">
          <div
            onClick={() => setShowQr(!showQr)}
            className="mobile-student-card cursor-pointer"
            title="Chạm để chuyển đổi mặt thẻ"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-xs">
                  FPT UNIVERSITY · QUY NHƠN
                </span>
                <h2 className="text-base font-bold text-white tracking-tight mt-1">
                  THẺ SINH VIÊN ĐIỆN TỬ
                </h2>
              </div>
              <div className="mobile-student-card-chip" />
            </div>

            {!showQr ? (
              <div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/80 shrink-0 shadow-xs cursor-pointer relative" onClick={(e) => { e.stopPropagation(); setIsAvatarModalOpen(true); }} title="Chạm để đổi Avatar">
                    <img
                      src={currentAvatar}
                      alt={studentName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultAvatar;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{studentName}</h3>
                    <p className="text-xs text-white/90 font-mono">MSSV: {studentRollNo}</p>
                    <p className="text-[11px] text-white/80 truncate">
                      {studentEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/20 text-[11px] text-white/90">
                  <span>Học kỳ: Fall 2026</span>
                  <span className="font-semibold underline flex items-center gap-1 cursor-pointer hover:text-white">
                    Mở mã QR qua cổng →
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 bg-white/10 rounded-xl">
                {/* SVG QR Code Simulation for Campus Gate */}
                <svg
                  className="w-24 h-24 bg-white p-1.5 rounded-lg text-slate-900"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h-4v2h2v4h2v-2h2v-2h-2v-2zm-4 4h-2v2h2v-2zm4 0h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z" />
                </svg>
                <p className="text-[11px] font-bold text-white mt-1.5">
                  Mã QR quét qua cổng Campus AI
                </p>
                <span className="text-[10px] text-white/80">Chạm để quay lại mặt trước</span>
              </div>
            )}
          </div>
        </section>

        {/* Display & Theme Preferences */}
        <MobileSection title="Giao diện hiển thị" eyebrow="Cấu hình hệ thống">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--m-brand-soft)] text-[var(--m-brand-primary)] flex items-center justify-center">
                {dark ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--m-text-primary)]">Chế độ tối (Dark mode)</p>
                <p className="text-xs text-[var(--m-text-muted)]">Tối ưu pin trên màn hình OLED</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDark(!dark)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                dark ? 'bg-[var(--m-brand-primary)]' : 'bg-gray-300'
              }`}
              aria-label="Đổi giao diện sáng/tối"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  dark ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </MobileSection>

        {/* Integration Preferences */}
        <MobileSection title="Đồng bộ & Thông báo" eyebrow="Tiện ích">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--m-campus-blue-soft)] text-[var(--m-campus-blue)] flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--m-text-primary)]">Đồng bộ Google Calendar</p>
                  <p className="text-xs text-[var(--m-text-muted)]">Tự động đẩy thời khóa biểu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGoogleSync(!googleSync)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  googleSync ? 'bg-[var(--m-brand-primary)]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    googleSync ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-[var(--m-border-faint)] pt-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--m-campus-green-soft)] text-[var(--m-campus-green)] flex items-center justify-center">
                  <Bell size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--m-text-primary)]">Nhắc nhở trước giờ học</p>
                  <p className="text-xs text-[var(--m-text-muted)]">Báo trước 15 phút</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPushNotifs(!pushNotifs)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  pushNotifs ? 'bg-[var(--m-brand-primary)]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    pushNotifs ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </MobileSection>

        {/* Data Reset & Actions */}
        <section className="mb-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleResetData}
            className="w-full mobile-touch-target rounded-xl border border-[var(--m-border)] bg-[var(--m-surface)] text-[var(--m-text-secondary)] font-semibold text-xs flex items-center justify-center gap-2 shadow-xs active:bg-[var(--m-surface-subtle)]"
          >
            <RotateCcw size={15} />
            <span>Khôi phục dữ liệu mẫu Demo</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full mobile-touch-target rounded-xl border border-red-200 bg-red-50 text-red-600 font-bold text-xs flex items-center justify-center gap-2 active:bg-red-100"
          >
            <LogOut size={15} />
            <span>Đăng xuất tài khoản</span>
          </button>
        </section>
      </main>
      <AvatarModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} />
    </div>
  );
}
