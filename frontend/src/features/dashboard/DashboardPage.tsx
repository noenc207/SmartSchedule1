import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardHeroBanner } from './components/DashboardHeroBanner';
import { QuyNhonQuoteCard } from './components/QuyNhonQuoteCard';
import { DashboardKpiCards } from './components/DashboardKpiCards';
import { TodayClassesCard } from './components/TodayClassesCard';
import { SelfStudyBookingCard } from './components/SelfStudyBookingCard';
import { WeeklyTimetableCard } from './components/WeeklyTimetableCard';
import { PendingTasksCard } from './components/PendingTasksCard';
import { QuickActionsCard } from './components/QuickActionsCard';
import { TodayAiSuggestionCard } from './components/TodayAiSuggestionCard';
import { DashboardDetailModal, type DetailModalData } from './components/DashboardDetailModal';
import { DashboardScheduleProposalCard } from './components/DashboardScheduleProposalCard';
import { MobileDashboard } from './components/MobileDashboard';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useDashboardData } from './hooks/useDashboardData';
import { useIsMobile } from '../../hooks/useIsMobile';

export function DashboardPage() {
  const navigate = useNavigate();
  const { activeScheduleId } = useWorkspaceStore();
  const [selectedDetail, setSelectedDetail] = useState<DetailModalData | null>(null);
  const isMobile = useIsMobile(768);
  const [mobileTab, setMobileTab] = useState<'today' | 'timetable' | 'tasks'>('today');

  const {
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
    refresh,
  } = useDashboardData();

  const VIETNAMESE_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const DAYS_ORDER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const selectedDayKey = React.useMemo(() => {
    return VIETNAMESE_DAYS[activeDate.getDay()] || 'T4';
  }, [activeDate]);

  const handleSelectDay = (dayKey: string) => {
    const idx = DAYS_ORDER.indexOf(dayKey);
    if (idx !== -1 && weekDates[idx]) {
      setActiveDate(new Date(weekDates[idx]));
    }
  };

  if (!activeScheduleId) {
    return (
      <section className="dashboard-page empty-workspace-view">
        <div className="panel empty-state">
          <div className="empty-tag-pill">CHƯA CHỌN LỊCH TRÌNH</div>
          <strong>Chưa chọn không gian lập lịch</strong>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 16px' }}>
            Vui lòng chọn hoặc tạo một lịch trình học tập để tải toàn bộ thời khóa biểu và bài tập.
          </p>
          <button
            type="button"
            className="hero-btn-gradient-primary"
            onClick={() => navigate('/schedules')}
          >
            Mở danh sách Lịch trình
          </button>
        </div>
      </section>
    );
  }

  const handleOpenKpiDetail = (metricId: string) => {
    const now = new Date();

    if (metricId === 'remaining-time') {
      const remainingEvents = todaysClasses;
      const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');

      const items = [
        ...remainingEvents.map((c) => ({
          id: c.id,
          title: c.title,
          subtitle: `${c.room ? `${c.room} · ` : ''}${c.time}`,
          meta: c.status,
          badge: 'Tiết học',
          badgeVariant: 'info' as const,
        })),
        ...pendingTasks.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: `${t.estimatedDurationMinutes ? `${Math.round((t.estimatedDurationMinutes / 60) * 10) / 10}h tự học` : 'Tự học'}${
            t.deadline
              ? ` · Hạn: ${new Date(t.deadline).toLocaleDateString('vi-VN', {
                  day: 'numeric',
                  month: 'numeric',
                })}`
              : ''
          }`,
          meta: `Ưu tiên: ${t.priority}`,
          badge: 'Bài tập',
          badgeVariant: 'warning' as const,
          isCompleted: false,
          onToggle: () => toggleTaskComplete(t),
        })),
      ];

      setSelectedDetail({
        type: 'kpi-breakdown',
        metricId: 'remaining-time',
        title: 'Thời gian học còn lại',
        value: kpiSummary?.remainingHours || '0h',
        subtext: kpiSummary?.dailyAvgHours || '/ 0h/ngày có lịch',
        description:
          'Tổng hợp các tiết học và bài tập tự học cần làm. Bạn có thể bấm tích hoàn thành bài tập trực tiếp ngay tại đây.',
        items,
        aiInsight:
          'Lịch học của bạn đang được dàn đều hợp lý. Hãy tận dụng khoảng trống buổi chiều để hoàn thành bài tập sớm.',
      });
    } else if (metricId === 'deadlines') {
      const deadlineTasks = tasks.filter((t) => t.deadline);
      const items = deadlineTasks.map((t) => {
        const isPast = new Date(t.deadline!).getTime() < now.getTime();
        const diffDays = Math.ceil(
          (new Date(t.deadline!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const countdownText =
          t.status === 'COMPLETED'
            ? 'Đã hoàn thành'
            : isPast
            ? 'Quá hạn'
            : diffDays <= 0
            ? 'Hạn hôm nay'
            : `Còn ${diffDays} ngày`;

        return {
          id: t.id,
          title: t.title,
          subtitle: `Hạn nộp: ${new Date(t.deadline!).toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: 'numeric',
            month: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          meta: countdownText,
          badge: t.priority,
          badgeVariant: (t.priority === 'HIGH'
            ? 'danger'
            : t.priority === 'MEDIUM'
            ? 'warning'
            : 'info') as any,
          isCompleted: t.status === 'COMPLETED',
          onToggle: () => toggleTaskComplete(t),
        };
      });

      setSelectedDetail({
        type: 'kpi-breakdown',
        metricId: 'deadlines',
        title: 'Hạn chót cần làm',
        value: `${kpiSummary?.urgentDeadlineCount || 0} công việc`,
        subtext: kpiSummary?.deadlineBadgeText || 'Hoàn thành',
        description:
          'Danh sách các bài tập và đề thi trong tuần. Bạn có thể bấm ô tích để đánh dấu hoàn thành nhanh mà không cần chuyển sang tab khác.',
        items,
        aiInsight:
          kpiSummary?.deadlineBadgeText === 'Khẩn cấp'
            ? 'Có hạn nộp sắp tới trong vòng 24 giờ! Hãy ưu tiên tập trung hoàn thiện bài nộp.'
            : 'Mọi hạn chót đang trong tầm kiểm soát tốt.',
      });
    } else if (metricId === 'completed-tasks') {
      const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
      const items = completedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: `${
          t.estimatedDurationMinutes
            ? `${Math.round((t.estimatedDurationMinutes / 60) * 10) / 10}h học sâu`
            : 'Đã hoàn thành'
        }`,
        meta: t.priority ? `Ưu tiên: ${t.priority}` : '',
        badge: 'Đã xong',
        badgeVariant: 'success' as const,
        isCompleted: true,
        onToggle: () => toggleTaskComplete(t),
      }));

      setSelectedDetail({
        type: 'kpi-breakdown',
        metricId: 'completed-tasks',
        title: 'Công việc đã hoàn thành',
        value: kpiSummary?.completedHours || '0h',
        subtext: `/ ${kpiSummary?.totalTargetHours || 'tổng 0h'}`,
        description:
          'Danh sách các bài tập và nhiệm vụ bạn đã hoàn thành xuất sắc trong tuần học này.',
        items,
        aiInsight: `Bạn đã đạt tỷ lệ hoàn thành ${kpiSummary?.completedPct || 0}%! Hãy tiếp tục duy trì đà học tập tích cực này.`,
      });
    } else if (metricId === 'weekly-goal') {
      const items = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.status === 'COMPLETED' ? 'Đã hoàn thành mục tiêu' : 'Cần thực hiện',
        meta: t.deadline
          ? `Hạn: ${new Date(t.deadline).toLocaleDateString('vi-VN', {
              day: 'numeric',
              month: 'numeric',
            })}`
          : '',
        badge: t.status === 'COMPLETED' ? '100%' : 'Chờ làm',
        badgeVariant: (t.status === 'COMPLETED' ? 'success' : 'warning') as any,
        isCompleted: t.status === 'COMPLETED',
        onToggle: () => toggleTaskComplete(t),
      }));

      setSelectedDetail({
        type: 'kpi-breakdown',
        metricId: 'weekly-goal',
        title: 'Mục tiêu tuần',
        value: `${kpiSummary?.weeklyGoalPct || 100}%`,
        subtext: `Còn ${kpiSummary?.remainingDays || 0} ngày`,
        description:
          'Tiến độ toàn diện của các mục tiêu học tập trong tuần. Bấm vào ô tích để hoàn thành trực tiếp ngay trên trang chủ.',
        items,
        aiInsight: `Còn ${kpiSummary?.remainingDays || 0} ngày nữa là kết thúc tuần. Bạn đang tiến gần tới đích!`,
      });
    }
  };

  return (
    <section className="dashboard-page mock-dashboard-container" aria-label="FPT University Quy Nhơn Academic Dashboard">
      {isMobile ? (
        <MobileDashboard
          kpiSummary={kpiSummary}
          todaysClasses={todaysClasses}
          studyGap={studyGap}
          eventsByDay={eventsByDay}
          weekDates={weekDates}
          tasks={tasks}
          smartInsights={smartInsights}
          toggleTaskComplete={toggleTaskComplete}
          activeDate={activeDate}
          setActiveDate={setActiveDate}
          onSelectMetric={handleOpenKpiDetail}
          activeScheduleId={activeScheduleId}
          onApplied={() => void refresh()}
        />
      ) : (
        <>
          {/* 1. Hero Row: Hero Welcome Banner (~72%) + Quy Nhơn Campus Quote Card (~28%) */}
          <div className="mock-hero-row">
            <div className="mock-hero-banner-col">
              <DashboardHeroBanner />
            </div>
            <div className="mock-quynhon-quote-col">
              <QuyNhonQuoteCard />
            </div>
          </div>

          {/* 2. Four KPI Metric Cards */}
          <DashboardKpiCards
            kpiSummary={kpiSummary}
            onSelectMetric={handleOpenKpiDetail}
          />

          {/* 2.5 Smart Schedule Proposal (OR-Tools CP-SAT Solver & 1-Click Apply) */}
          <DashboardScheduleProposalCard
            activeScheduleId={activeScheduleId}
            tasks={tasks}
            events={todaysClasses}
            onApplied={() => {
              void refresh();
            }}
          />

          {/* 3. Three-Column Bento Grid Body */}
          <div className="mock-three-col-grid">
            {/* Column 1 (Trái): Lớp học hôm nay + Khoảng trống tự học */}
            <div className="mock-col mock-col-left">
              <TodayClassesCard
                classes={todaysClasses}
                selectedDate={activeDate}
                onJumpToday={() => setActiveDate(new Date())}
              />
              <SelfStudyBookingCard studyGap={studyGap} />
            </div>

            {/* Column 2 (Giữa): Lịch học & lịch tuần */}
            <div className="mock-col mock-col-center">
              <WeeklyTimetableCard
                eventsByDay={eventsByDay}
                weekDates={weekDates}
                selectedDay={selectedDayKey}
                onSelectDay={handleSelectDay}
              />
            </div>

            {/* Column 3 (Phải): Nhiệm vụ cần làm + Hành động nhanh + Gợi ý hôm nay Beta */}
            <div className="mock-col mock-col-right">
              <PendingTasksCard tasks={tasks} onToggleComplete={toggleTaskComplete} />
              <QuickActionsCard />
              <TodayAiSuggestionCard insight={smartInsights[0]} />
            </div>
          </div>
        </>
      )}

      {/* Detail Inspection Modal */}
      <DashboardDetailModal
        data={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </section>
  );
}
