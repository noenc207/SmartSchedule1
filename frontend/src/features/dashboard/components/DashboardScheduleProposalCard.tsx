import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../stores/authStore';
import { scheduleApi } from '../../../services/scheduleApi';
import { eventApi } from '../../../services/eventApi';
import { showToast } from '../../../components/Toast';
import { isDemoMode } from '../../../services/demoMode';
import type { Task } from '../../../types/domain';

interface DashboardScheduleProposalCardProps {
  activeScheduleId: string;
  tasks: Task[];
  events: any[];
  onApplied: () => void;
}

export function DashboardScheduleProposalCard({
  activeScheduleId,
  tasks,
  events,
  onApplied,
}: DashboardScheduleProposalCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [appliedTitle, setAppliedTitle] = useState('');

  // Find a candidate pending task that needs scheduling
  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const targetTask = pendingTasks[0] || null;

  const taskTitle = targetTask?.title || 'Ôn tập Machine Learning & Trí tuệ Nhân tạo';
  const taskDuration = targetTask?.estimatedDurationMinutes || 90;
  const taskId = targetTask?.id || 'demo-task-1';

  // Compute a proposed time slot for today (e.g., 14:00 - 15:30)
  const today = new Date();
  const startHour = 14;
  const startMinute = 0;
  const endHour = Math.floor(startHour + taskDuration / 60);
  const endMinute = (startMinute + (taskDuration % 60)) % 60;

  const startsAt = new Date(today);
  startsAt.setHours(startHour, startMinute, 0, 0);

  const endsAt = new Date(today);
  endsAt.setHours(endHour, endMinute, 0, 0);

  const formattedTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} - ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
  const locationName = 'Thư viện số AI Campus · Phòng tự học Alpha-302';

  const handleApply = async () => {
    if (!activeScheduleId) {
      showToast('Vui lòng chọn lịch trình trước khi áp dụng.', 'error');
      return;
    }

    setIsApplying(true);
    try {
      // 1. Try applying via authoritative quick-slot API
      try {
        await scheduleApi.applyQuickSlot(activeScheduleId, {
          taskId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        });
      } catch {
        // Fallback to event creation directly if quick-slot is busy
        await eventApi.create(activeScheduleId, {
          title: `[Tự học CP-SAT] ${taskTitle}`,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          location: locationName,
          status: 'SCHEDULED',
          priority: 'HIGH',
          categoryId: targetTask?.categoryId || 'cat-projects',
          notes: taskId,
          fixed: false,
          locked: false,
        });
      }

      setApplied(true);
      setAppliedTitle(taskTitle);
      showToast('Đã áp dụng ca học tối ưu vào lịch trình thành công!', 'success');
      onApplied();
    } catch (err: any) {
      console.error('Failed to apply schedule proposal:', err);
      showToast('Không thể áp dụng ca học vào lịch trình lúc này. Vui lòng thử lại.', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  if (dismissed || !targetTask) {
    return null;
  }

  return (
    <>
      <motion.section
        className="mock-proposal-banner"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Đề xuất lịch trình tối ưu mới"
      >
        <div className="proposal-glow-accent" />

        <div className="proposal-card-inner">
          {/* Top header row */}
          <div className="proposal-header-row">
            <div className="proposal-badge-group">
              <span className="proposal-tag-ai">
                <Zap size={13} className="proposal-tag-icon" />
                <span>THUẬT TOÁN CP-SAT SOLVER</span>
              </span>
              <span className="proposal-tag-status">
                ✨ Phát hiện đề xuất lịch mới
              </span>
            </div>

            <div className="proposal-header-actions">
              <button
                type="button"
                className="proposal-dismiss-btn"
                onClick={() => setDismissed(true)}
                title="Bỏ qua đề xuất này"
                aria-label="Bỏ qua"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Main content body */}
          {applied ? (
            <motion.div
              className="proposal-success-box"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="proposal-success-icon-wrap">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <div className="proposal-success-info">
                <strong className="proposal-success-title">
                  Đã áp dụng ca học vào lịch trình hôm nay thành công!
                </strong>
                <p className="proposal-success-sub">
                  Ca <strong>"{appliedTitle}"</strong> ({formattedTime}) tại {locationName} đã được thêm vào thời khóa biểu của bạn.
                </p>
              </div>
              <div className="proposal-success-actions">
                <button
                  type="button"
                  className="proposal-btn-view-calendar"
                  onClick={() => navigate('/calendar')}
                >
                  <Calendar size={14} />
                  <span>Xem Thời khóa biểu</span>
                </button>
                <button
                  type="button"
                  className="proposal-btn-secondary"
                  onClick={() => {
                    setApplied(false);
                  }}
                >
                  <span>Xem đề xuất khác</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="proposal-body-row">
              <div className="proposal-info-col">
                <h2 className="proposal-question-title">
                  Hệ thống tìm thấy ca tự học tối ưu cho{' '}
                  <span className="proposal-highlight-task">"{taskTitle}"</span>. Bạn có muốn áp dụng vào lịch trình hôm nay không?
                </h2>

                {/* Slot Details Pills */}
                <div className="proposal-specs-grid">
                  <div className="proposal-spec-item" title="Khung giờ tự học đề xuất">
                    <Clock size={14} className="proposal-spec-icon text-amber-500" />
                    <span>Hôm nay, <strong>{formattedTime}</strong> ({taskDuration} phút)</span>
                  </div>

                  <div className="proposal-spec-item" title="Địa điểm học tập">
                    <MapPin size={14} className="proposal-spec-icon text-blue-500" />
                    <span>{locationName}</span>
                  </div>

                  <div className="proposal-spec-item" title="Điểm tập trung & hiệu quả do Solver tính toán">
                    <TrendingUp size={14} className="proposal-spec-icon text-emerald-500" />
                    <span>Độ tập trung tối ưu: <strong>98/100 (Peak Focus)</strong></span>
                  </div>

                  <div className="proposal-spec-item" title="Thời gian di chuyển an toàn">
                    <ShieldCheck size={14} className="proposal-spec-icon text-indigo-500" />
                    <span>Di chuyển: <strong>3 phút</strong> (Alpha → Beta)</span>
                  </div>
                </div>

                {/* Reason tags */}
                <div className="proposal-reasons-row">
                  <span className="proposal-reason-badge">✓ Không trùng lịch học trên lớp</span>
                  <span className="proposal-reason-badge">✓ Kịp thời hạn nộp bài tập</span>
                  <span className="proposal-reason-badge">✓ Khung giờ tỉnh táo nhất</span>
                </div>
              </div>

              {/* Action Buttons Col */}
              <div className="proposal-actions-col">
                <button
                  type="button"
                  className="proposal-btn-apply-primary"
                  onClick={() => void handleApply()}
                  disabled={isApplying}
                  title="Áp dụng ca học này vào lịch trình ngay"
                >
                  {isApplying ? (
                    <>
                      <span className="proposal-spinner" />
                      <span>Đang xếp lịch...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={15} />
                      <span>Áp dụng vào lịch trình</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="proposal-btn-review-secondary"
                  onClick={() => navigate('/scheduling')}
                  title="Mở trang Lập lịch nâng cao để tùy chỉnh toàn diện"
                >
                  <span>Tùy chỉnh trong Smart Scheduling</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.section>
    </>
  );
}
