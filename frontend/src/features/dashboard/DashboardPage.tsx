import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

const VIETNAMESE_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAYS_ORDER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function DashboardPage() {
  const navigate = useNavigate();
  const { activeScheduleId } = useWorkspaceStore();
  const [selectedDetail, setSelectedDetail] = useState<DetailModalData | null>(null);
  const isMobile = useIsMobile(768);

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

  const effectiveTasks = useMemo(() => {
    const hasPending = tasks && tasks.some((t) => t.status !== 'COMPLETED');
    if (hasPending) return tasks;
    return [
      ...(tasks || []),
      {
        id: 'fb-os-review',
        scheduleId: activeScheduleId || 's-1',
        ownerId: 'user-1',
        categoryId: 'cat-academic',
        title: 'Operating Systems Review',
        description: 'Ôn tập quản lý bộ nhớ ảo & tiến trình',
        estimatedDurationMinutes: 120,
        remainingDurationMinutes: 120,
        priority: 'MEDIUM' as const,
        deadline: '2026-09-26T23:59:00.000Z',
        status: 'TODO' as const,
        preferredStartTime: null,
        preferredEndTime: null,
        minimumSessionMinutes: 30,
        maximumSessionMinutes: 120,
        createdAt: '2026-09-20T00:00:00.000Z',
        updatedAt: '2026-09-20T00:00:00.000Z',
      },
      {
        id: 'fb-research-paper',
        scheduleId: activeScheduleId || 's-1',
        ownerId: 'user-1',
        categoryId: 'cat-projects',
        title: 'Research Paper',
        description: 'Hoàn thiện báo cáo nghiên cứu AI Lab',
        estimatedDurationMinutes: 90,
        remainingDurationMinutes: 90,
        priority: 'HIGH' as const,
        deadline: '2026-09-27T23:59:00.000Z',
        status: 'TODO' as const,
        preferredStartTime: null,
        preferredEndTime: null,
        minimumSessionMinutes: 30,
        maximumSessionMinutes: 120,
        createdAt: '2026-09-20T00:00:00.000Z',
        updatedAt: '2026-09-20T00:00:00.000Z',
      },
      {
        id: 'fb-english-practice',
        scheduleId: activeScheduleId || 's-1',
        ownerId: 'user-1',
        categoryId: 'cat-personal',
        title: 'English Practice',
        description: 'Luyện nghe & phản xạ học thuật LUK',
        estimatedDurationMinutes: 60,
        remainingDurationMinutes: 60,
        priority: 'MEDIUM' as const,
        deadline: '2026-09-28T23:59:00.000Z',
        status: 'TODO' as const,
        preferredStartTime: null,
        preferredEndTime: null,
        minimumSessionMinutes: 30,
        maximumSessionMinutes: 90,
        createdAt: '2026-09-20T00:00:00.000Z',
        updatedAt: '2026-09-20T00:00:00.000Z',
      },
    ];
  }, [tasks, activeScheduleId]);

  const selectedDayKey = useMemo(() => {
    return VIETNAMESE_DAYS[activeDate.getDay()] || 'T7';
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
      const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');
      const items = [
        ...todaysClasses.map((c) => ({
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
          subtitle: `${
            t.estimatedDurationMinutes
              ? `${Math.round((t.estimatedDurationMinutes / 60) * 10) / 10}h tự học`
              : 'Tự học'
          }${
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
        title: 'Thời gian học & Tự do',
        value: kpiSummary?.remainingHours || '8h',
        subtext: kpiSummary?.dailyAvgHours || '/ 8h/ngày có lịch',
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
        value: `${kpiSummary?.urgentDeadlineCount || 3} bài tập`,
        subtext: kpiSummary?.deadlineBadgeText || 'Trong 48h',
        description:
          'Danh sách các bài tập và đề thi trong tuần. Bạn có thể bấm ô tích để đánh dấu hoàn thành nhanh mà không cần chuyển sang tab khác.',
        items,
        aiInsight:
          'Có hạn nộp sắp tới trong vòng 48 giờ! Hãy ưu tiên tập trung hoàn thiện bài nộp.',
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
        title: 'Thời lượng đã hoàn thành',
        value: kpiSummary?.completedHours || '7h',
        subtext: `/ ${kpiSummary?.totalTargetHours || 'tổng 4h tuần này'}`,
        description:
          'Danh sách các bài tập và nhiệm vụ bạn đã hoàn thành xuất sắc trong tuần học này.',
        items,
        aiInsight: `Bạn đã đạt tỷ lệ hoàn thành ${kpiSummary?.completedPct || 50}%! Hãy tiếp tục duy trì đà học tập tích cực này.`,
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
        title: 'Điểm cân bằng lịch học CP-SAT',
        value: '98%',
        subtext: '0 xung đột · Di chuyển 0m',
        description:
          'Tiến độ toàn diện của các mục tiêu học tập trong tuần. Bấm vào ô tích để hoàn thành trực tiếp ngay trên trang chủ.',
        items,
        aiInsight: `Hệ thống OR-Tools CP-SAT đánh giá lịch trình của bạn đạt 98% độ cân bằng nhịp sinh học.`,
      });
    }
  };

  return (
    <section
      className="dashboard-page mock-dashboard-container"
      aria-label="FPT University Quy Nhơn Academic Dashboard"
      style={{ height: 'auto', minHeight: 'calc(100vh - 76px)', overflow: 'visible' }}
    >
      {isMobile ? (
        <MobileDashboard
          kpiSummary={kpiSummary}
          todaysClasses={todaysClasses}
          studyGap={studyGap}
          eventsByDay={eventsByDay}
          weekDates={weekDates}
          tasks={effectiveTasks}
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
          {/* Row 1: Hero Welcome Banner + Quy Nhơn Live Weather & Quote */}
          <div className="mock-hero-row">
            <DashboardHeroBanner />
            <QuyNhonQuoteCard />
          </div>

          {/* Row 2: 4 KPI Summary Cards */}
          <DashboardKpiCards onSelectMetric={handleOpenKpiDetail} kpiSummary={kpiSummary} />

          {/* Row 2.5: CP-SAT Solver Smart Schedule Proposal */}
          <DashboardScheduleProposalCard
            activeScheduleId={activeScheduleId}
            tasks={effectiveTasks}
            events={todaysClasses}
            onApplied={() => void refresh()}
          />

          {/* Row 3: 3-Column Academic Bento Grid */}
          <div className="mock-three-col-grid">
            {/* Column 1: Today's Classes + Self-Study Room Booking */}
            <div className="mock-col-stack">
              <TodayClassesCard
                classes={todaysClasses}
                selectedDate={activeDate}
                onJumpToday={() => setActiveDate(new Date())}
              />
              <SelfStudyBookingCard studyGap={studyGap} />
            </div>

            {/* Column 2: Weekly Timetable */}
            <div className="mock-col-stack">
              <WeeklyTimetableCard
                eventsByDay={eventsByDay}
                weekDates={weekDates}
                selectedDay={selectedDayKey}
                onSelectDay={handleSelectDay}
              />
            </div>

            {/* Column 3: Pending Tasks + Quick Actions + Cóc AI Suggestion */}
            <div className="mock-col-stack">
              <PendingTasksCard tasks={effectiveTasks} onToggleComplete={toggleTaskComplete} />
              <QuickActionsCard />
              <TodayAiSuggestionCard insight={smartInsights[0]} />
            </div>
          </div>
        </>
      )}

      <DashboardDetailModal data={selectedDetail} onClose={() => setSelectedDetail(null)} />
    </section>
  );
}
