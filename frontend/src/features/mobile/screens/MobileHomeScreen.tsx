import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  MobilePageHeader,
  MobileSection,
  MobileListItem,
  MobileSheet,
  MobileEmptyState,
} from '../../../components/mobile';
import { useAuth } from '../../../hooks/useAuth';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useDashboardData } from '../../dashboard/hooks/useDashboardData';
import type { Task } from '../../../types/domain';

export function MobileHomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeScheduleId } = useWorkspaceStore();
  const {
    kpiSummary,
    todaysClasses,
    tasks,
    smartInsights,
    toggleTaskComplete,
    refresh,
  } = useDashboardData();

  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  const studentName = user?.displayName || 'Vũ Ngọc Nhi';
  const nextClass = todaysClasses[0] || null;
  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED').slice(0, 4);

  return (
    <div className="mobile-app-shell">
      {/* Mobile Top Header */}
      <MobilePageHeader
        title={studentName}
        subtitle="Sinh viên K15 · Quy Nhơn AI Campus"
        leftAction={
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[var(--m-brand-primary)] shrink-0 shadow-sm mr-1">
            <img
              src="/avatar-nhi.png"
              alt={studentName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/fpt-icon.png';
              }}
            />
          </div>
        }
        rightAction={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="mobile-touch-target p-2 rounded-full text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-subtle)] relative"
              aria-label="Thông báo"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--m-brand-primary)]" />
            </button>
          </div>
        }
      />

      <main className="mobile-view-container">
        {/* Next Class Hero Card */}
        <section className="mb-5">
          <div className="mobile-hero-gradient-card relative overflow-hidden">
            <div className="absolute -right-4 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide backdrop-blur-sm">
                TIẾT HỌC TIẾP THEO
              </span>
              <span className="text-white/80 text-xs flex items-center gap-1 font-medium">
                <Clock size={13} /> Hôm nay
              </span>
            </div>

            {nextClass ? (
              <div
                onClick={() => setSelectedClass(nextClass)}
                className="cursor-pointer active:opacity-95 transition-opacity"
              >
                <h2 className="text-lg font-bold tracking-tight text-white mb-1 leading-snug">
                  {nextClass.title}
                </h2>
                <div className="flex items-center gap-3 text-white/90 text-xs mb-3 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {nextClass.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={13} /> {nextClass.room || 'Phòng Alpha 204'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t border-white/20 text-xs text-white/95">
                  <span className="truncate">GV: {(nextClass as any)?.instructor || 'ThS. Nguyễn Văn A'}</span>
                  <span className="font-semibold underline flex items-center gap-1 shrink-0">
                    Chi tiết <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-sm font-semibold text-white/95">
                  Không còn tiết học nào trong ngày!
                </p>
                <p className="text-xs text-white/80 mt-0.5">
                  Bạn có thể ôn tập hoặc tự học tại Atrium AI Campus.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Quick KPI Overview */}
        <div className="mobile-kpi-grid mb-5">
          <div
            onClick={() => setSelectedKpi('remaining')}
            className="mobile-card p-3 flex flex-col justify-between cursor-pointer active:scale-98 transition-transform"
          >
            <span className="text-[11px] font-semibold text-[var(--m-text-muted)] truncate">
              Giờ học còn
            </span>
            <div className="text-lg font-black text-[var(--m-brand-primary)] tracking-tight my-0.5">
              {kpiSummary?.remainingHours || '4.5h'}
            </div>
            <span className="text-[10px] text-[var(--m-text-secondary)] truncate">
              {kpiSummary?.dailyAvgHours || '2 tiết hôm nay'}
            </span>
          </div>

          <div
            onClick={() => setSelectedKpi('deadlines')}
            className="mobile-card p-3 flex flex-col justify-between cursor-pointer active:scale-98 transition-transform"
          >
            <span className="text-[11px] font-semibold text-[var(--m-text-muted)] truncate">
              Hạn nộp gấp
            </span>
            <div className="text-lg font-black text-[var(--m-campus-red)] tracking-tight my-0.5">
              {kpiSummary?.urgentDeadlineCount ?? 2}
            </div>
            <span className="text-[10px] text-[var(--m-text-secondary)] truncate">
              {kpiSummary?.deadlineBadgeText || 'Trong 48h'}
            </span>
          </div>

          <div
            onClick={() => setSelectedKpi('goal')}
            className="mobile-card p-3 flex flex-col justify-between cursor-pointer active:scale-98 transition-transform"
          >
            <span className="text-[11px] font-semibold text-[var(--m-text-muted)] truncate">
              Mục tiêu tuần
            </span>
            <div className="text-lg font-black text-[var(--m-campus-green)] tracking-tight my-0.5">
              {kpiSummary?.weeklyGoalPct ?? 85}%
            </div>
            <span className="text-[10px] text-[var(--m-text-secondary)] truncate">
              Còn {kpiSummary?.remainingDays ?? 3} ngày
            </span>
          </div>
        </div>

        {/* Quick Action Matrix */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--m-text-secondary)]">
              Phím tắt nhanh
            </span>
          </div>
          <div className="mobile-shortcut-grid">
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] shadow-sm active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--m-campus-blue-soft)] text-[var(--m-campus-blue)] flex items-center justify-center">
                <Calendar size={18} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--m-text-primary)]">Lịch học</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/ai')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] shadow-sm active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--m-brand-soft)] text-[var(--m-brand-primary)] flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--m-text-primary)]">Cóc AI</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/deadlines')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] shadow-sm active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--m-campus-amber-soft)] text-[var(--m-campus-amber)] flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--m-text-primary)]">Hạn nộp</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] shadow-sm active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--m-campus-purple-soft)] text-[var(--m-campus-purple)] flex items-center justify-center">
                <Zap size={18} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--m-text-primary)]">Tài liệu</span>
            </button>
          </div>
        </section>

        {/* Priority Tasks List */}
        <MobileSection
          title="Bài tập & Nhiệm vụ hôm nay"
          eyebrow="Cần hoàn thành"
          action={
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="text-xs font-semibold text-[var(--m-brand-primary)] flex items-center gap-1"
            >
              Xem tất cả <ArrowRight size={12} />
            </button>
          }
        >
          {pendingTasks.length > 0 ? (
            <div className="flex flex-col gap-2">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--m-surface-subtle)] border border-[var(--m-border-faint)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleTaskComplete(task)}
                    className="mobile-touch-target p-1 text-[var(--m-brand-primary)] hover:scale-110 active:scale-95 transition-transform"
                    aria-label={`Hoàn thành ${task.title}`}
                  >
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle2 size={20} className="text-[var(--m-campus-green)]" />
                    ) : (
                      <Circle size={20} className="text-[var(--m-text-muted)]" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--m-text-primary)] truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[var(--m-text-muted)] mt-0.5">
                      {task.deadline && (
                        <span>
                          Hạn: {new Date(task.deadline).toLocaleDateString('vi-VN', {
                            day: 'numeric',
                            month: 'numeric',
                          })}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[var(--m-brand-soft)] text-[var(--m-brand-primary)] rounded">
                        {task.priority || 'MEDIUM'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <MobileEmptyState
              title="Tuyệt vời! Không còn bài tập tồn đọng"
              description="Bạn đã hoàn thành toàn bộ bài tập trong tuần này. Nghỉ ngơi hoặc ôn thi nhé!"
              actionLabel="Thêm bài tập mới"
              onAction={() => navigate('/tasks')}
            />
          )}
        </MobileSection>

        {/* AI Insight Card */}
        {smartInsights && smartInsights[0] && (
          <section className="mb-5">
            <div className="p-4 rounded-2xl border border-[var(--m-brand-subtle)] bg-[var(--m-brand-soft)] flex items-start gap-3 shadow-sm">
              <div className="p-2 rounded-xl bg-white shadow-xs text-[var(--m-brand-primary)] shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--m-brand-deep)] mb-1">
                  Gợi ý từ Cóc Trợ Lý 3D
                </h4>
                <p className="text-xs text-[var(--m-text-primary)] leading-relaxed">
                  {smartInsights[0].description ||
                    'Khoảng trống 2 tiếng chiều nay rất thích hợp để hoàn thành bài tập lớn SWP391 trước hạn chót.'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/ai')}
                  className="mt-2 text-xs font-bold text-[var(--m-brand-primary)] flex items-center gap-1 underline"
                >
                  Trò chuyện với Cóc AI <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Class Detail Mobile Sheet */}
      <MobileSheet
        isOpen={Boolean(selectedClass)}
        onClose={() => setSelectedClass(null)}
        title={selectedClass?.title || 'Chi tiết môn học'}
        subtitle="Thông tin tiết học tại FPT University Quy Nhơn"
      >
        {selectedClass && (
          <div className="flex flex-col gap-4 py-2">
            <div className="p-3.5 rounded-xl bg-[var(--m-surface-subtle)] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--m-text-muted)]">Thời gian</span>
                <span className="font-bold text-[var(--m-text-primary)]">{selectedClass.time}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--m-text-muted)]">Phòng học</span>
                <span className="font-bold text-[var(--m-brand-primary)]">
                  {selectedClass.room || 'Alpha 204'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--m-text-muted)]">Giảng viên</span>
                <span className="font-semibold text-[var(--m-text-primary)]">
                  {selectedClass.instructor || 'ThS. Nguyễn Văn A'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--m-text-muted)]">Mã lớp</span>
                <span className="font-mono text-[var(--m-text-secondary)]">SE1804-NET</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedClass(null);
                  navigate('/documents');
                }}
                className="w-full mobile-touch-target rounded-xl bg-[var(--m-brand-soft)] text-[var(--m-brand-primary)] font-bold text-xs"
              >
                Mở tài liệu môn học này
              </button>
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="w-full mobile-touch-target rounded-xl border border-[var(--m-border)] text-[var(--m-text-secondary)] text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </MobileSheet>

      {/* KPI Detail Sheet */}
      <MobileSheet
        isOpen={Boolean(selectedKpi)}
        onClose={() => setSelectedKpi(null)}
        title={
          selectedKpi === 'remaining'
            ? 'Thời gian học tuần này'
            : selectedKpi === 'deadlines'
            ? 'Danh sách hạn chót cần nộp'
            : 'Tiến độ mục tiêu học tập'
        }
      >
        <div className="py-2 text-sm text-[var(--m-text-secondary)]">
          {selectedKpi === 'remaining' && (
            <p>
              Bạn có tổng cộng {kpiSummary?.remainingHours || '4.5h'} tiết học và tự học còn lại trong
              tuần. Hệ thống xếp lịch tự động đã cân bằng không có tiết nào bị trùng.
            </p>
          )}
          {selectedKpi === 'deadlines' && (
            <p>
              Có {kpiSummary?.urgentDeadlineCount ?? 2} bài tập cần nộp trong vòng 48h tới. Hãy ưu tiên
              hoàn thành bài tập SWP391 và PRN211.
            </p>
          )}
          {selectedKpi === 'goal' && (
            <p>
              Tiến độ tuần đạt {kpiSummary?.weeklyGoalPct ?? 85}%. Duy trì nhịp độ này để đạt danh hiệu
              sinh viên xuất sắc kỳ Fall 2026!
            </p>
          )}
          <button
            type="button"
            onClick={() => setSelectedKpi(null)}
            className="w-full mt-5 mobile-touch-target rounded-xl bg-[var(--m-brand-primary)] text-white text-xs font-bold"
          >
            Đã hiểu
          </button>
        </div>
      </MobileSheet>
    </div>
  );
}
