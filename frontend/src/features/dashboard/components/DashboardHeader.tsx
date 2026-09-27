import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, Plus, Flame, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import type { EventItem, Task } from '../../../types/domain';

interface DashboardHeaderProps {
  currentDate: Date;
  todaysEvents?: EventItem[];
  upcomingTasks?: Task[];
}

export function DashboardHeader({
  currentDate,
  todaysEvents = [],
  upcomingTasks = [],
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const formattedDate = currentDate.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Chào buổi sáng', vibe: 'Khởi đầu ngày mới tràn đầy năng lượng!' };
    if (hour < 18) return { text: 'Chào buổi chiều', vibe: 'Giữ vững nhịp độ và bứt phá mục tiêu hôm nay nhé!' };
    return { text: 'Chào buổi tối', vibe: 'Tổng kết ngày học tập và chuẩn bị lịch trình thảnh thơi!' };
  };

  const greeting = getGreeting();
  const displayName = user?.displayName || 'Sinh viên FPT';

  // Compute today's event completion progress
  const now = new Date();
  const completedEvents = todaysEvents.filter((ev) => new Date(ev.endsAt) <= now).length;
  const totalEvents = todaysEvents.length;
  const progressPct = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 100;

  return (
    <motion.header
      className="gradient-hero-banner dashboard-header-compact"
      role="banner"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="hero-banner-inner-compact">
        {/* Left Side: Greeting, FPT Pill, Streak & Progress on single line */}
        <div className="hero-left-col">
          <div className="hero-greeting-single-row">
            <h1 className="hero-greeting-compact-title">
              {greeting.text}, <span className="hero-name-gradient">{displayName}</span>
            </h1>

            <div className="school-brand-pill-mini">
              <img
                src="/fpt-logo.png"
                alt="FPT"
                className="school-logo-mini"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="school-brand-text-mini">FPT AI CAMPUS</span>
            </div>

            <div className="hero-streak-pill-mini" title="Chuỗi học tập chăm chỉ 5 ngày">
              <Flame size={12} className="streak-flame-icon-animated" />
              <span>Chuỗi <strong>5 ngày</strong></span>
            </div>

            <div
              className="hero-progress-pill-compact"
              title={`Đã hoàn thành ${completedEvents}/${totalEvents} tiết học (${progressPct}%)`}
            >
              <div className="progress-ring-micro-wrap">
                <svg width="24" height="24" className="mini-progress-svg">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="rgba(242, 112, 36, 0.15)"
                    strokeWidth="2.5"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="#f27024"
                    strokeWidth="2.5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 9}
                    initial={{ strokeDashoffset: 2 * Math.PI * 9 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 9 * (1 - progressPct / 100) }}
                    transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
                <span className="mini-ring-percent-text">{progressPct}%</span>
              </div>
              <span className="progress-pill-inline-text">
                Tiến trình: <strong>{totalEvents > 0 ? `${completedEvents}/${totalEvents} tiết` : 'Xong'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: 3 Action Buttons on the exact same horizontal row */}
        <div className="hero-actions-compact" role="toolbar" aria-label="Thao tác nhanh">
          <button
            type="button"
            className="hero-btn-gradient-ai-glow interactive-orange-btn"
            onClick={() => navigate('/scheduling')}
            title="Tối ưu hóa sắp xếp thời khóa biểu và giờ tự học bằng AI"
          >
            <Sparkles size={13} className="sparkle-spin-icon" />
            <span>Tối ưu lịch bằng AI</span>
          </button>

          <button
            type="button"
            className="hero-btn-glass-compact interactive-glass-btn"
            onClick={() => navigate('/calendar')}
            title="Xem thời khóa biểu & lịch chi tiết"
          >
            <Calendar size={13} />
            <span>Lịch biểu chi tiết</span>
          </button>

          <button
            type="button"
            className="hero-btn-glass-compact interactive-glass-btn"
            onClick={() => navigate('/tasks')}
            title="Thêm bài tập hoặc nhiệm vụ cần làm"
          >
            <Plus size={13} />
            <span>Thêm bài tập</span>
          </button>
        </div>
      </div>
    </motion.header>
  );
}
