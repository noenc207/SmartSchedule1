import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('smartschedule-theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);

  const studentName = user?.displayName || 'Vũ Ngọc Nhi';
  const studentEmail = user?.email || 'nhivnqe160123@fpt.edu.vn';

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
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#c2410c] text-white shadow-md relative overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-xs">
                  FPT UNIVERSITY · QUY NHƠN
                </span>
                <h2 className="text-base font-bold text-white tracking-tight mt-1">
                  THẺ SINH VIÊN ĐIỆN TỬ
                </h2>
              </div>
              <img
                src="/fpt-icon.png"
                alt="FPT"
                className="w-7 h-7 object-contain bg-white/90 rounded-full p-0.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/80 shrink-0 shadow-xs">
                <img
                  src="/avatar-nhi.png"
                  alt={studentName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/fpt-icon.png';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{studentName}</h3>
                <p className="text-xs text-white/90 font-mono">MSSV: QE160123</p>
                <p className="text-[11px] text-white/80 truncate">
                  Kỹ thuật phần mềm AI · K15
                </p>
              </div>
            </div>
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
    </div>
  );
}
