import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  AlertTriangle,
  Check,
  Target,
  ChevronRight,
  BookOpen,
  MapPin,
  Clock,
  Sparkles,
  Plus,
  CalendarRange,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
} from 'lucide-react';
import type { Task } from '../../../types/domain';
import type { SmartInsight } from '../types/dashboard';
import { DashboardScheduleProposalCard } from './DashboardScheduleProposalCard';

interface MobileDashboardProps {
  kpiSummary?: {
    remainingHours: string;
    dailyAvgHours: string;
    studyProgressPct: number;
    urgentDeadlineCount: number;
    deadlineBadgeText: string;
    deadlineProgressPct: number;
    completedHours: string;
    totalTargetHours: string;
    completedPct: number;
    weeklyGoalPct: number;
    remainingDays: number;
  };
  todaysClasses: Array<{
    id: string;
    title: string;
    time: string;
    room?: string;
    instructor?: string;
    type?: string;
    status: string;
    isOngoing?: boolean;
  }>;
  studyGap?: {
    minutes: number;
    timeRange: string;
  } | null;
  eventsByDay?: Record<string, Array<{
    id: string;
    time: string;
    title: string;
    room: string;
    color: string;
    iconType: string;
  }>>;
  weekDates?: Date[];
  tasks: Task[];
  smartInsights: SmartInsight[];
  toggleTaskComplete: (task: Task) => void;
  activeDate: Date;
  setActiveDate: (date: Date) => void;
  onSelectMetric: (metricId: string) => void;
  activeScheduleId?: string;
  onApplied?: () => void;
}

const DAYS_ORDER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_LABELS: Record<string, string> = {
  T2: 'Thứ 2',
  T3: 'Thứ 3',
  T4: 'Thứ 4',
  T5: 'Thứ 5',
  T6: 'Thứ 6',
  T7: 'Thứ 7',
  CN: 'Chủ nhật',
};

export function MobileDashboard({
  kpiSummary,
  todaysClasses,
  studyGap,
  eventsByDay,
  weekDates,
  tasks,
  smartInsights,
  toggleTaskComplete,
  activeDate,
  setActiveDate,
  onSelectMetric,
  activeScheduleId,
  onApplied,
}: MobileDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'today' | 'timetable' | 'tasks'>('today');

  const VIETNAMESE_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const selectedDayKey = VIETNAMESE_DAYS[activeDate.getDay()] || 'T4';

  const handleSelectDay = (dayKey: string) => {
    const idx = DAYS_ORDER.indexOf(dayKey);
    if (idx !== -1 && weekDates && weekDates[idx]) {
      setActiveDate(new Date(weekDates[idx]));
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  const summary = kpiSummary || {
    remainingHours: '8h',
    dailyAvgHours: '/ 3h/ngày có lịch',
    studyProgressPct: 68,
    urgentDeadlineCount: 1,
    deadlineBadgeText: 'Khẩn cấp',
    deadlineProgressPct: 48,
    completedHours: '9h',
    totalTargetHours: 'tổng 15h',
    completedPct: 60,
    weeklyGoalPct: 60,
    remainingDays: 4,
  };

  // Day events for Timetable tab
  const activeDayEvents = eventsByDay?.[selectedDayKey] || [];

  return (
    <div className="mobile-dashboard-root">
      {/* 1. Mobile Greeting Banner */}
      <section className="mobile-hero-card">
        <div className="mobile-hero-campus-row">
          <span className="mobile-campus-tag">
            <MapPin size={11} />
            <span>FPT Quy Nhơn AI Campus</span>
          </span>
          <span className="mobile-weather-badge">25°C ⛅</span>
        </div>
        <h1 className="mobile-hero-greeting">
          Chào buổi tối, <span className="highlight">Vũ Ngọc Nhi!</span> ☀️
        </h1>
        <p className="mobile-hero-quote">
          “Không có con đường nào là dễ dàng, nhưng luôn có một cách đi thông minh.”
        </p>
      </section>

      {/* 2. Four Dedicated Mobile KPI Cards (2x2 Grid with Zero Truncation) */}
      <section className="mobile-kpi-grid" aria-label="Thống kê học tập nhanh">
        {/* KPI 1: Remaining Study Time */}
        <div
          className="mobile-kpi-card card-blue"
          onClick={() => onSelectMetric('remaining-time')}
          role="button"
          tabIndex={0}
        >
          <div className="mobile-kpi-top">
            <span className="mobile-kpi-icon-pill icon-blue">
              <Calendar size={15} />
            </span>
            <span className="mobile-kpi-badge badge-blue">{summary.studyProgressPct}%</span>
          </div>
          <div className="mobile-kpi-metric">
            <strong className="mobile-kpi-num">{summary.remainingHours}</strong>
            <span className="mobile-kpi-sub">còn lại</span>
          </div>
          <span className="mobile-kpi-label">Thời gian học</span>
          <div className="mobile-kpi-footer-link">
            <span>Chi tiết</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* KPI 2: Urgent Deadlines */}
        <div
          className="mobile-kpi-card card-red"
          onClick={() => onSelectMetric('deadlines')}
          role="button"
          tabIndex={0}
        >
          <div className="mobile-kpi-top">
            <span className="mobile-kpi-icon-pill icon-red">
              <AlertTriangle size={15} />
            </span>
            <span className="mobile-kpi-badge badge-red">{summary.deadlineBadgeText}</span>
          </div>
          <div className="mobile-kpi-metric">
            <strong className="mobile-kpi-num text-red">{summary.urgentDeadlineCount}</strong>
            <span className="mobile-kpi-sub">bài tập</span>
          </div>
          <span className="mobile-kpi-label">Hạn chót cần làm</span>
          <div className="mobile-kpi-footer-link">
            <span>Chi tiết</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* KPI 3: Completed Tasks */}
        <div
          className="mobile-kpi-card card-green"
          onClick={() => onSelectMetric('completed-tasks')}
          role="button"
          tabIndex={0}
        >
          <div className="mobile-kpi-top">
            <span className="mobile-kpi-icon-pill icon-green">
              <Check size={15} />
            </span>
            <span className="mobile-kpi-badge badge-green">{summary.completedPct}%</span>
          </div>
          <div className="mobile-kpi-metric">
            <strong className="mobile-kpi-num">{summary.completedHours}</strong>
            <span className="mobile-kpi-sub">/{summary.totalTargetHours}</span>
          </div>
          <span className="mobile-kpi-label">Đã hoàn thành</span>
          <div className="mobile-kpi-footer-link">
            <span>Chi tiết</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* KPI 4: Weekly Goal */}
        <div
          className="mobile-kpi-card card-purple"
          onClick={() => onSelectMetric('weekly-goal')}
          role="button"
          tabIndex={0}
        >
          <div className="mobile-kpi-top">
            <span className="mobile-kpi-icon-pill icon-purple">
              <Target size={15} />
            </span>
            <span className="mobile-kpi-badge badge-purple">{summary.remainingDays} ngày</span>
          </div>
          <div className="mobile-kpi-metric">
            <strong className="mobile-kpi-num">{summary.weeklyGoalPct}%</strong>
            <span className="mobile-kpi-sub">tiến độ</span>
          </div>
          <span className="mobile-kpi-label">Mục tiêu tuần</span>
          <div className="mobile-kpi-footer-link">
            <span>Chi tiết</span>
            <ChevronRight size={12} />
          </div>
        </div>
      </section>

      {/* 2.5 CP-SAT Schedule Proposal (Mobile) */}
      {activeScheduleId && (
        <div style={{ margin: '0 12px 14px' }}>
          <DashboardScheduleProposalCard
            activeScheduleId={activeScheduleId}
            tasks={tasks}
            events={todaysClasses}
            onApplied={onApplied || (() => {})}
          />
        </div>
      )}

      {/* 3. Mobile Segmented Tab Bar */}
      <div className="mobile-tabs-pill-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'today'}
          className={`mobile-tab-pill ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <span>☀️ Hôm nay</span>
          {todaysClasses.length > 0 && (
            <span className="mobile-tab-count">{todaysClasses.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'timetable'}
          className={`mobile-tab-pill ${activeTab === 'timetable' ? 'active' : ''}`}
          onClick={() => setActiveTab('timetable')}
        >
          <span>📅 Lịch tuần</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tasks'}
          className={`mobile-tab-pill ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <span>📋 Bài tập</span>
          {pendingTasks.length > 0 && (
            <span className="mobile-tab-count">{pendingTasks.length}</span>
          )}
        </button>
      </div>

      {/* 4. Tab Content Panels */}
      <div className="mobile-tab-content-area">
        {/* TAB 1: HÔM NAY */}
        {activeTab === 'today' && (
          <div className="mobile-tab-pane">
            {/* Today's Classes */}
            <div className="mobile-section-card">
              <div className="mobile-section-card-header">
                <div className="mobile-section-title-wrap">
                  <BookOpen size={16} className="text-blue" />
                  <h3>Lớp học hôm nay</h3>
                </div>
                <span className="mobile-section-stat">
                  {todaysClasses.length} tiết học
                </span>
              </div>

              {todaysClasses.length > 0 ? (
                <div className="mobile-classes-list">
                  {todaysClasses.map((c) => (
                    <div key={c.id} className="mobile-class-item">
                      <div className="mobile-class-time-col">
                        <Clock size={12} className="text-muted" />
                        <span className="mobile-class-time-text">{c.time}</span>
                      </div>
                      <div className="mobile-class-main">
                        <h4 className="mobile-class-title">{c.title}</h4>
                        <div className="mobile-class-meta">
                          {c.room && (
                            <span className="mobile-room-tag">
                              <MapPin size={10} />
                              {c.room}
                            </span>
                          )}
                          <span className={`mobile-status-tag ${c.isOngoing ? 'ongoing' : ''}`}>
                            {c.isOngoing ? 'Đang học' : c.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mobile-empty-classes">
                  <p>Hôm nay bạn không có lịch học trên lớp.</p>
                  <span>Hãy tận dụng thời gian rảnh để làm bài tập hoặc ôn tập nhé!</span>
                </div>
              )}
            </div>

            {/* Smart Study Gap Booking */}
            {studyGap && (
              <div className="mobile-study-gap-card">
                <div className="mobile-gap-badge">
                  <Sparkles size={13} />
                  <span>KHOẢNG TRỐNG TỰ HỌC TỐI ƯU</span>
                </div>
                <h4>Trống {Math.round((studyGap.minutes / 60) * 10) / 10}h học tập</h4>
                <p className="mobile-gap-time">
                  Khung giờ: <strong>{studyGap.timeRange}</strong>
                </p>
                <button
                  type="button"
                  className="mobile-gap-action-btn"
                  onClick={() => navigate('/scheduling')}
                >
                  <CalendarRange size={14} />
                  <span>Đặt lịch tự học ngay</span>
                </button>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="mobile-quick-actions-card">
              <h3 className="mobile-card-subheading">Hành động nhanh</h3>
              <div className="mobile-actions-grid">
                <button
                  type="button"
                  className="mobile-action-btn"
                  onClick={() => navigate('/calendar')}
                >
                  <Calendar size={18} className="text-blue" />
                  <span>Xem lịch học</span>
                </button>
                <button
                  type="button"
                  className="mobile-action-btn"
                  onClick={() => navigate('/tasks')}
                >
                  <Plus size={18} className="text-purple" />
                  <span>Thêm việc mới</span>
                </button>
                <button
                  type="button"
                  className="mobile-action-btn"
                  onClick={() => navigate('/scheduling')}
                >
                  <Sparkles size={18} className="text-orange" />
                  <span>Tự động xếp lịch</span>
                </button>
                <button
                  type="button"
                  className="mobile-action-btn"
                  onClick={() => navigate('/settings')}
                >
                  <CheckCircle2 size={18} className="text-green" />
                  <span>Cài đặt môn học</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LỊCH TUẦN */}
        {activeTab === 'timetable' && (
          <div className="mobile-tab-pane">
            <div className="mobile-section-card">
              {/* Day selector horizontal strip */}
              <div className="mobile-day-strip" role="tablist">
                {DAYS_ORDER.map((dayKey, idx) => {
                  let dateStr = '';
                  let isToday = false;
                  if (weekDates && weekDates[idx]) {
                    const dt = weekDates[idx];
                    dateStr = `${dt.getDate()}/${dt.getMonth() + 1}`;
                    isToday = dt.toDateString() === new Date().toDateString();
                  }
                  const isSelected = selectedDayKey === dayKey;

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      className={`mobile-day-strip-btn ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}`}
                      onClick={() => handleSelectDay(dayKey)}
                    >
                      <span className="mobile-strip-day">{dayKey}</span>
                      <span className="mobile-strip-date">{dateStr}</span>
                      {isToday && <span className="mobile-today-dot" />}
                    </button>
                  );
                })}
              </div>

              {/* Day Header */}
              <div className="mobile-timetable-day-header">
                <strong>{DAY_LABELS[selectedDayKey] || selectedDayKey}</strong>
                <span className="mobile-timetable-count">
                  {activeDayEvents.length} môn học
                </span>
              </div>

              {/* Day Events List */}
              {activeDayEvents.length > 0 ? (
                <div className="mobile-timetable-events-list">
                  {activeDayEvents.map((ev) => (
                    <div key={ev.id} className={`mobile-timetable-event-card border-${ev.color}`}>
                      <div className="mobile-event-time-tag">
                        <Clock size={11} />
                        <span>{ev.time}</span>
                      </div>
                      <h4 className="mobile-event-title">{ev.title}</h4>
                      <div className="mobile-event-sub">
                        <MapPin size={11} />
                        <span>{ev.room || 'FPT AI Campus'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mobile-empty-day-events">
                  <p>Không có tiết học trong ngày {DAY_LABELS[selectedDayKey] || selectedDayKey}.</p>
                  <span>Tận hưởng thời gian nghỉ ngơi hoặc tự học nhé!</span>
                </div>
              )}

              {/* Link to Full Calendar */}
              <button
                type="button"
                className="mobile-full-cal-link"
                onClick={() => navigate('/calendar')}
              >
                <span>Mở toàn bộ Lịch học</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: BÀI TẬP & TRỢ LÝ AI */}
        {activeTab === 'tasks' && (
          <div className="mobile-tab-pane">
            <div className="mobile-section-card">
              <div className="mobile-section-card-header">
                <div className="mobile-section-title-wrap">
                  <AlertTriangle size={16} className="text-orange" />
                  <h3>Nhiệm vụ & Bài tập ({pendingTasks.length})</h3>
                </div>
                <button
                  type="button"
                  className="mobile-add-task-mini-btn"
                  onClick={() => navigate('/tasks')}
                >
                  <Plus size={13} />
                  <span>Thêm</span>
                </button>
              </div>

              {tasks.length > 0 ? (
                <div className="mobile-tasks-list">
                  {tasks.map((task) => {
                    const isDone = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        className={`mobile-task-item ${isDone ? 'completed' : ''}`}
                        onClick={() => toggleTaskComplete(task)}
                        role="button"
                        tabIndex={0}
                      >
                        <button
                          type="button"
                          className={`mobile-task-checkbox ${isDone ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskComplete(task);
                          }}
                          aria-label={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                        >
                          {isDone ? <Check size={12} strokeWidth={3} /> : null}
                        </button>
                        <div className="mobile-task-content">
                          <span className={`mobile-task-title ${isDone ? 'done-text' : ''}`}>
                            {task.title}
                          </span>
                          <div className="mobile-task-meta-row">
                            {task.deadline && (
                              <span className="mobile-task-deadline">
                                Hạn: {new Date(task.deadline).toLocaleDateString('vi-VN', {
                                  day: 'numeric',
                                  month: 'numeric',
                                })}
                              </span>
                            )}
                            <span className={`mobile-task-priority-tag tag-${task.priority.toLowerCase()}`}>
                              {task.priority === 'HIGH'
                                ? 'Khẩn cấp'
                                : task.priority === 'MEDIUM'
                                ? 'Vừa'
                                : 'Thấp'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mobile-empty-classes">
                  <p>Tuyệt vời! Bạn không còn bài tập nào tồn đọng.</p>
                </div>
              )}
            </div>

            {/* AI Assistant Insight */}
            {smartInsights[0] && (
              <div className="mobile-ai-insight-card">
                <div className="mobile-ai-badge">
                  <Sparkles size={13} />
                  <span>TRỢ LÝ AI FPT QUY NHƠN</span>
                </div>
                <h4>{smartInsights[0].title}</h4>
                <p>{smartInsights[0].description}</p>
                <button
                  type="button"
                  className="mobile-ai-action-btn"
                  onClick={() => navigate('/scheduling')}
                >
                  <Sparkles size={14} />
                  <span>Áp dụng gợi ý lịch thông minh</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
