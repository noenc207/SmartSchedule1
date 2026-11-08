import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  RefreshCw,
  Zap,
  BookOpen,
  Target,
  Check,
  ChevronRight,
  User,
  Plus,
  Search,
  CalendarRange,
  Building2,
  QrCode,
  GraduationCap,
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
import { taskApi } from '../../../services/taskApi';
import { useDashboardData } from '../../dashboard/hooks/useDashboardData';
import { DashboardScheduleProposalCard } from '../../dashboard/components/DashboardScheduleProposalCard';
import { showToast } from '../../../components/Toast';
import type { Task } from '../../../types/domain';

const DAYS_HEADER = [
  { key: 'T2', label: 'T2', full: 'Thứ 2' },
  { key: 'T3', label: 'T3', full: 'Thứ 3' },
  { key: 'T4', label: 'T4', full: 'Thứ 4' },
  { key: 'T5', label: 'T5', full: 'Thứ 5' },
  { key: 'T6', label: 'T6', full: 'Thứ 6' },
  { key: 'T7', label: 'T7', full: 'Thứ 7' },
  { key: 'CN', label: 'CN', full: 'Chủ nhật' },
];

export function MobileHomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeScheduleId } = useWorkspaceStore();
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
    loading,
  } = useDashboardData();

  // Active view tab: Today / Timetable / Tasks
  const [activeTab, setActiveTab] = useState<'today' | 'timetable' | 'tasks'>('today');

  // Modals / Sheets
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
  const [showRoomMap, setShowRoomMap] = useState<string | null>(null);

  // Quick attendance check-in local state
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);

  // Inline Quick Add Task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'urgent' | 'completed'>('all');
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const studentName = user?.displayName || user?.email?.split('@')[0] || 'Sinh viên';
  const defaultAvatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user?.displayName || user?.email || 'Student')}&backgroundColor=fed7aa,dbeafe`;
  const avatarUrl = user?.avatarUrl || defaultAvatar;

  // Greeting time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  const nextClass = todaysClasses[0] || null;
  const pendingTasks = localTasks.filter((t) => t.status !== 'COMPLETED');
  const completedTasks = localTasks.filter((t) => t.status === 'COMPLETED');

  // Active Day index for week scrubber
  const activeDayIndex = (activeDate.getDay() + 6) % 7;
  const selectedDayKey = DAYS_HEADER[activeDayIndex]?.key || 'T4';
  const selectedDayEvents = eventsByDay?.[selectedDayKey] || [];

  const handleSelectDay = (index: number) => {
    if (weekDates && weekDates[index]) {
      setActiveDate(new Date(weekDates[index]));
    } else {
      const newDate = new Date(activeDate);
      const currentDay = (newDate.getDay() + 6) % 7;
      newDate.setDate(newDate.getDate() + (index - currentDay));
      setActiveDate(newDate);
    }
  };

  const handleCheckIn = (classItem: any) => {
    if (checkedInIds.includes(classItem.id)) {
      showToast(`Bạn đã điểm danh môn ${classItem.title} rồi!`, 'info');
      return;
    }
    setCheckedInIds((prev) => [...prev, classItem.id]);
    showToast(`✓ Điểm danh chuyên cần thành công: ${classItem.title}`, 'success');
  };

  const handleInlineAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle.trim();
    setNewTaskTitle('');

    try {
      if (activeScheduleId) {
        const created = await taskApi.create(activeScheduleId, {
          title,
          description: null,
          priority: 'HIGH',
          estimatedDurationMinutes: 60,
          remainingDurationMinutes: 60,
          status: 'PENDING',
          minimumSessionMinutes: 30,
          maximumSessionMinutes: 120,
          deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
        });
        setLocalTasks((prev) => [created, ...prev]);
      } else {
        const fallbackTask: Task = {
          id: `task-${Date.now()}`,
          scheduleId: activeScheduleId || 's-1',
          ownerId: user?.id || 'u-1',
          categoryId: 'cat-academic',
          title,
          description: null,
          status: 'PENDING',
          priority: 'HIGH',
          estimatedDurationMinutes: 60,
          remainingDurationMinutes: 60,
          deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
          preferredStartTime: null,
          preferredEndTime: null,
          minimumSessionMinutes: 30,
          maximumSessionMinutes: 90,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setLocalTasks((prev) => [fallbackTask, ...prev]);
      }
      showToast('Đã thêm bài tập mới!', 'success');
      refresh();
    } catch {
      showToast('Không thể tạo bài tập vào lúc này', 'error');
    }
  };

  const handleToggleTask = (task: Task) => {
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' }
          : t
      )
    );
    toggleTaskComplete(task);
  };

  const filteredTasks = localTasks.filter((t) => {
    if (taskFilter === 'completed') return t.status === 'COMPLETED';
    if (taskFilter === 'urgent') return t.priority === 'HIGH' && t.status !== 'COMPLETED';
    return true;
  });

  return (
    <div className="w-full">
      {/* 1. Sticky Context Header */}
      <MobilePageHeader
        title={studentName}
        subtitle="Sinh viên K15 · Quy Nhơn AI Campus"
        leftAction={
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--m-brand-primary)] shrink-0 shadow-sm mr-1">
            <img
              src={avatarUrl}
              alt={studentName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultAvatar;
              }}
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
        }
        rightAction={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => refresh()}
              className="mobile-touch-target p-2 rounded-full text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-subtle)] active:scale-95 transition-transform"
              aria-label="Làm mới dữ liệu"
              title="Làm mới"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin text-[var(--m-brand-primary)]' : ''} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="mobile-touch-target p-2 rounded-full text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-subtle)] relative active:scale-95 transition-transform"
              aria-label="Thông báo"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--m-brand-primary)]" />
            </button>
          </div>
        }
      />

      <div className="mobile-view-container pt-3">
        {/* 2. Campus & Welcome Greeting */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <span className="text-[11px] font-semibold text-[var(--m-text-muted)] flex items-center gap-1">
              <MapPin size={11} className="text-[var(--m-brand-primary)]" /> FPT Quy Nhơn AI Campus
            </span>
            <h1 className="text-base font-bold text-[var(--m-text-primary)] tracking-tight">
              {greeting}, {studentName}! ☀️
            </h1>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--m-brand-soft)] text-[var(--m-brand-primary)] font-bold border border-[var(--m-brand-subtle)]">
            Kỳ Fall 2026
          </span>
        </div>

        {/* 3. Live Academic Status Hero Card (Dynamic Island Style) */}
        <section className="mb-4">
          <div className="mobile-hero-gradient-card">
            <div className="absolute -right-6 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top Tag Row */}
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wider backdrop-blur-sm uppercase">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {(nextClass as any)?.isOngoing || nextClass?.status === 'Đang diễn ra'
                  ? 'ĐANG TRONG TIẾT HỌC'
                  : 'TIẾT HỌC TIẾP THEO'}
              </span>
              <span className="text-white/85 text-xs flex items-center gap-1 font-semibold">
                <Clock size={12} /> Hôm nay
              </span>
            </div>

            {nextClass ? (
              <div>
                <div
                  onClick={() => setSelectedClass(nextClass)}
                  className="cursor-pointer active:opacity-95 transition-opacity"
                >
                  <h2 className="text-lg font-extrabold tracking-tight text-white mb-1 leading-snug">
                    {nextClass.title}
                  </h2>
                  <div className="flex items-center flex-wrap gap-2 text-white/90 text-xs mb-3 font-medium">
                    <span className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-md">
                      <Clock size={12} /> {nextClass.time}
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRoomMap(nextClass.room || 'Alpha 204');
                      }}
                      className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-md font-bold underline"
                    >
                      <MapPin size={12} /> {nextClass.room || 'Phòng Alpha 204'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/20 text-xs text-white/95">
                    <span className="truncate">GV: {(nextClass as any)?.instructor || 'ThS. Nguyễn Văn A'}</span>
                    <span className="font-bold underline flex items-center gap-1 shrink-0">
                      Chi tiết môn <ArrowRight size={12} />
                    </span>
                  </div>
                </div>

                {/* 3 Interactive In-Card Actions */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => handleCheckIn(nextClass)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold text-center active:scale-95 transition-all flex items-center justify-center gap-1 shadow-xs ${
                      checkedInIds.includes(nextClass.id)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-[var(--m-brand-deep)] hover:bg-white/90'
                    }`}
                  >
                    <QrCode size={13} />
                    <span>{checkedInIds.includes(nextClass.id) ? '✓ Đã điểm danh' : 'Điểm danh'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRoomMap(nextClass.room || 'Alpha 204')}
                    className="py-1.5 px-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold text-center active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Building2 size={13} />
                    <span>Bản đồ phòng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/documents')}
                    className="py-1.5 px-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold text-center active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <BookOpen size={13} />
                    <span>Tài liệu</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-2.5">
                <p className="text-sm font-bold text-white">
                  Đã hoàn thành toàn bộ tiết học hôm nay!
                </p>
                <p className="text-xs text-white/80 mt-1">
                  Bạn có 4.5h tự học tại Atrium AI Campus. Sử dụng Cóc AI để xếp lịch ôn thi nhé.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/scheduling')}
                  className="mt-3 px-4 py-2 rounded-xl bg-white text-[var(--m-brand-deep)] text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                >
                  <Sparkles size={14} className="text-[var(--m-brand-primary)]" />
                  <span>Đặt lịch tự học Atrium</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 4. Academic KPI Intelligence (2x2 Grid) */}
        <section className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--m-text-secondary)]">
              Chỉ số học tập tuần 7
            </span>
            <button
              type="button"
              onClick={() => setSelectedKpi('overview')}
              className="text-[11px] text-[var(--m-brand-primary)] font-semibold hover:underline"
            >
              Chạm xem phân tích
            </button>
          </div>

          <div className="mobile-kpi-2x2">
            {/* KPI 1: Remaining Hours */}
            <div
              onClick={() => setSelectedKpi('remaining')}
              className="mobile-card p-3 flex flex-col justify-between cursor-pointer active:scale-98 transition-transform"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--m-text-muted)]">Giờ học còn</span>
                <span className="w-6 h-6 rounded-lg bg-[var(--m-campus-blue-soft)] text-[var(--m-campus-blue)] flex items-center justify-center">
                  <Clock size={13} />
                </span>
              </div>
              <div className="text-xl font-black text-[var(--m-brand-primary)] tracking-tight my-1">
                {kpiSummary?.remainingHours || '4.5h'}
              </div>
              <div className="mobile-progress-track my-1">
                <div className="mobile-progress-fill" style={{ width: '65%' }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--m-text-secondary)]">
                <span>{kpiSummary?.dailyAvgHours || '2 tiết hôm nay'}</span>
                <ChevronRight size={12} className="text-[var(--m-text-muted)]" />
              </div>
            </div>

            {/* KPI 2: Urgent Deadlines */}
            <div
              onClick={() => setSelectedKpi('deadlines')}
              className="mobile-card p-3 flex flex-col justify-between cursor-pointer active:scale-98 transition-transform"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--m-text-muted)]">Hạn nộp gấp</span>
                <span className="w-6 h-6 rounded-lg bg-[var(--m-campus-red-soft)] text-[var(--m-campus-red)] flex items-center justify-center">
                  <AlertTriangle size={13} />
                </span>
              </div>
              <div className="text-xl font-black text-[var(--m-campus-red)] tracking-tight my-1">
                {kpiSummary?.urgentDeadlineCount ?? 2} <span className="text-xs font-normal text-[var(--m-text-secondary)]">bài</span>
              </div>
              <div className="mobile-progress-track my-1">
                <div className="h-full bg-[var(--m-campus-red)] rounded-full" style={{ width: '80%' }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--m-text-secondary)]">
                <span className="text-[var(--m-campus-red)] font-semibold">Trong 48h</span>
                <ChevronRight size={12} className="text-[var(--m-text-muted)]" />
              </div>
            </div>

            {/* KPI 3: Weekly Goal */}
            <div
              onClick={() => setSelectedKpi('goal')}
              className="mobile-card p-3 flex flex-col justify-between cursor-pointer active:scale-98 transition-transform"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--m-text-muted)]">Mục tiêu tuần</span>
                <span className="w-6 h-6 rounded-lg bg-[var(--m-campus-green-soft)] text-[var(--m-campus-green)] flex items-center justify-center">
                  <Target size={13} />
                </span>
              </div>
              <div className="text-xl font-black text-[var(--m-campus-green)] tracking-tight my-1">
                {kpiSummary?.weeklyGoalPct ?? 85}%
              </div>
              <div className="mobile-progress-track my-1">
                <div className="h-full bg-[var(--m-campus-green)] rounded-full" style={{ width: `${kpiSummary?.weeklyGoalPct ?? 85}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--m-text-secondary)]">
                <span>Còn {kpiSummary?.remainingDays ?? 3} ngày</span>
                <ChevronRight size={12} className="text-[var(--m-text-muted)]" />
              </div>
            </div>

            {/* KPI 4: Attendance & Standing */}
            <div
              onClick={() => setSelectedKpi('attendance')}
              className="mobile-card p-3 flex flex-col justify-between cursor-pointer active:scale-98 transition-transform"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--m-text-muted)]">Chuyên cần</span>
                <span className="w-6 h-6 rounded-lg bg-[var(--m-campus-purple-soft)] text-[var(--m-campus-purple)] flex items-center justify-center">
                  <GraduationCap size={13} />
                </span>
              </div>
              <div className="text-xl font-black text-[var(--m-campus-purple)] tracking-tight my-1">
                100%
              </div>
              <div className="mobile-progress-track my-1">
                <div className="h-full bg-[var(--m-campus-purple)] rounded-full" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--m-text-secondary)]">
                <span className="text-emerald-600 font-semibold">0 buổi vắng</span>
                <ChevronRight size={12} className="text-[var(--m-text-muted)]" />
              </div>
            </div>
          </div>
        </section>

        {/* 5. Smart Study Gap Assistant */}
        {studyGap && (
          <section className="mb-4">
            <div className="mobile-study-gap-card">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--m-brand-deep)] mb-1">
                <Sparkles size={14} className="text-[var(--m-brand-primary)]" />
                <span className="uppercase tracking-wider">KHOẢNG TRỐNG TỰ HỌC TỐI ƯU</span>
              </div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)]">
                Trống {Math.round((studyGap.minutes / 60) * 10) / 10}h ({studyGap.timeRange})
              </h3>
              <p className="text-xs text-[var(--m-text-secondary)] mt-0.5 leading-relaxed">
                Khoảng trống giữa các tiết học rất thích hợp để làm bài Lab PRN211 hoặc ôn tập nhóm tại Atrium AI Campus.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => navigate('/scheduling')}
                  className="flex-1 py-2 px-3 rounded-xl bg-[var(--m-brand-primary)] text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <CalendarRange size={13} /> Xếp lịch tự học
                </button>
                <button
                  type="button"
                  onClick={() => setShowRoomMap('Atrium-Library')}
                  className="py-2 px-3 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] text-xs font-semibold text-[var(--m-text-secondary)] active:scale-95"
                >
                  Tìm chỗ trống
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 6. CP-SAT Intelligent Proposal Card */}
        {activeScheduleId && (
          <section className="mb-4">
            <DashboardScheduleProposalCard
              activeScheduleId={activeScheduleId}
              tasks={localTasks}
              events={todaysClasses}
              onApplied={refresh}
            />
          </section>
        )}

        {/* 7. Segmented View Switcher: Today / Timetable / Tasks */}
        <section className="mb-4">
          <div className="mobile-segmented-control mb-3">
            <button
              type="button"
              className={`mobile-segmented-btn ${activeTab === 'today' ? 'active' : ''}`}
              onClick={() => setActiveTab('today')}
            >
              <Clock size={14} />
              <span>Hôm nay</span>
              {todaysClasses.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--m-brand-primary)] text-white text-[10px] font-bold">
                  {todaysClasses.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`mobile-segmented-btn ${activeTab === 'timetable' ? 'active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              <Calendar size={14} />
              <span>Lịch tuần</span>
            </button>
            <button
              type="button"
              className={`mobile-segmented-btn ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              <CheckCircle2 size={14} />
              <span>Nhiệm vụ</span>
              {pendingTasks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {pendingTasks.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: TODAY'S TIMELINE */}
          {activeTab === 'today' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--m-text-secondary)]">
                  Lịch trình hôm nay ({todaysClasses.length} tiết)
                </h3>
                <span className="mobile-now-badge">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  BÂY GIỜ: 08:30
                </span>
              </div>

              {todaysClasses.length > 0 ? (
                <div className="mobile-timeline-container flex flex-col gap-2.5">
                  <div className="mobile-timeline-line" />
                  {todaysClasses.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedClass(item)}
                      className="mobile-card p-3.5 relative cursor-pointer active:scale-98 transition-transform border-l-4"
                      style={{ borderLeftColor: idx === 0 ? '#ea580c' : idx === 1 ? '#0047ba' : '#7c3aed' }}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[var(--m-brand-deep)] flex items-center gap-1">
                          <Clock size={12} /> {item.time}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          checkedInIds.includes(item.id)
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-[var(--m-surface-subtle)] text-[var(--m-text-secondary)]'
                        }`}>
                          {checkedInIds.includes(item.id) ? '✓ Đã điểm danh' : item.status || 'Chính thức'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[var(--m-text-primary)] leading-snug">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-[var(--m-text-muted)] mt-1.5 pt-1.5 border-t border-[var(--m-border-faint)]">
                        <span className="flex items-center gap-1 text-[var(--m-text-secondary)] font-medium">
                          <MapPin size={11} className="text-[var(--m-brand-primary)]" />
                          {item.room || 'Alpha 204'}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <User size={11} />
                          {(item as any)?.instructor || 'ThS. Nguyễn Văn A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MobileEmptyState
                  title="Không có tiết học hôm nay"
                  description="Bạn không có lịch học chính khóa nào trong ngày. Bạn có thể tự học hoặc làm bài tập."
                  actionLabel="Xem lịch cả tuần"
                  onAction={() => setActiveTab('timetable')}
                />
              )}
            </div>
          )}

          {/* TAB 2: WEEKLY SCRUBBER */}
          {activeTab === 'timetable' && (
            <div className="flex flex-col gap-3">
              {/* Day Scrubber Strip */}
              <div className="mobile-day-strip-grid">
                {DAYS_HEADER.map((day, idx) => {
                  const isSelected = idx === activeDayIndex;
                  const dayDate = new Date(activeDate);
                  const diff = idx - activeDayIndex;
                  dayDate.setDate(activeDate.getDate() + diff);
                  const dayNum = dayDate.getDate();

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => handleSelectDay(idx)}
                      className={`mobile-day-btn ${isSelected ? 'active' : ''}`}
                      aria-label={`${day.full}, ngày ${dayNum}`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider leading-none">
                        {day.label}
                      </span>
                      <span className="text-sm font-black leading-none my-0.5">
                        {dayNum}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-[var(--m-brand-primary)] opacity-40'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold text-[var(--m-text-primary)]">
                  Lịch học {DAYS_HEADER[activeDayIndex]?.full} ({activeDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })})
                </h4>
                <span className="text-xs font-bold text-[var(--m-brand-primary)]">
                  {selectedDayEvents.length} môn học
                </span>
              </div>

              {selectedDayEvents.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedDayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedClass(evt)}
                      className="mobile-card p-3 flex items-center justify-between cursor-pointer active:scale-98 transition-transform border-l-4"
                      style={{ borderLeftColor: evt.color || '#ea580c' }}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-[11px] font-bold text-[var(--m-brand-deep)] flex items-center gap-1">
                          <Clock size={11} /> {evt.time}
                        </div>
                        <h5 className="text-xs font-bold text-[var(--m-text-primary)] truncate mt-0.5">
                          {evt.title}
                        </h5>
                        <span className="text-[10px] text-[var(--m-text-secondary)] flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {evt.room}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-[var(--m-text-muted)] shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <MobileEmptyState
                  title="Không có lịch ngày này"
                  description="Bạn có thể chọn thứ khác trong tuần hoặc dùng Cóc AI để xếp lịch học bù."
                  actionLabel="Mở Cóc AI"
                  onAction={() => navigate('/ai')}
                />
              )}
            </div>
          )}

          {/* TAB 3: TASKS & ASSIGNMENTS */}
          {activeTab === 'tasks' && (
            <div className="flex flex-col gap-3">
              {/* Quick Inline Add Form */}
              <form onSubmit={handleInlineAddTask} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Thêm nhanh bài tập mới (nhấn Enter)..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--m-border)] bg-[var(--m-surface)] text-xs text-[var(--m-text-primary)] placeholder:text-[var(--m-text-muted)] focus:outline-none focus:border-[var(--m-brand-primary)] shadow-xs"
                />
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="w-10 h-10 rounded-xl bg-[var(--m-brand-primary)] text-white flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 shadow-sm"
                  aria-label="Thêm việc"
                >
                  <Plus size={18} />
                </button>
              </form>

              {/* Task Filter Chips */}
              <div className="mobile-chip-row">
                <button
                  type="button"
                  onClick={() => setTaskFilter('all')}
                  className={`mobile-chip ${taskFilter === 'all' ? 'active' : ''}`}
                >
                  Tất cả ({localTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('urgent')}
                  className={`mobile-chip ${taskFilter === 'urgent' ? 'active' : ''}`}
                >
                  Khẩn cấp ({localTasks.filter((t) => t.priority === 'HIGH' && t.status !== 'COMPLETED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  className={`mobile-chip ${taskFilter === 'completed' ? 'active' : ''}`}
                >
                  Đã xong ({completedTasks.length})
                </button>
              </div>

              {/* Tasks List */}
              <div className="flex flex-col gap-2">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] flex items-start gap-2.5 shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t)}
                        className="mobile-touch-target p-1 text-[var(--m-brand-primary)] hover:scale-110 active:scale-95 transition-transform shrink-0"
                        aria-label={`Hoàn thành ${t.title}`}
                      >
                        {t.status === 'COMPLETED' ? (
                          <CheckCircle2 size={19} className="text-emerald-500" />
                        ) : (
                          <Circle size={19} className="text-[var(--m-text-muted)]" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className={`text-xs font-bold leading-tight ${t.status === 'COMPLETED' ? 'line-through text-[var(--m-text-muted)]' : 'text-[var(--m-text-primary)]'}`}>
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--m-text-muted)]">
                          {t.deadline && (
                            <span>Hạn: {new Date(t.deadline).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}</span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded font-bold ${t.priority === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                            {t.priority || 'MEDIUM'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <MobileEmptyState
                    title="Không có bài tập nào"
                    description="Bạn đã hoàn thành danh sách bài tập cho mục này!"
                    actionLabel="Xem lịch học"
                    onAction={() => setActiveTab('today')}
                  />
                )}
              </div>
            </div>
          )}
        </section>

        {/* 8. Quick Navigation Hub (4 Buttons) */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--m-text-secondary)]">
              Phím tắt tiện ích
            </span>
          </div>
          <div className="mobile-shortcut-grid">
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] shadow-xs active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--m-campus-blue-soft)] text-[var(--m-campus-blue)] flex items-center justify-center">
                <Calendar size={18} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--m-text-primary)]">Lịch học</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/ai')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] shadow-xs active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--m-brand-soft)] text-[var(--m-brand-primary)] flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--m-text-primary)]">Cóc AI</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/deadlines')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] shadow-xs active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--m-campus-amber-soft)] text-[var(--m-campus-amber)] flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--m-text-primary)]">Hạn nộp</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--m-surface)] border border-[var(--m-border)] shadow-xs active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--m-campus-purple-soft)] text-[var(--m-campus-purple)] flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--m-text-primary)]">Tài liệu</span>
            </button>
          </div>
        </section>

        {/* 9. AI Insight Tip */}
        {smartInsights && smartInsights[0] && (
          <section className="mb-5">
            <div className="p-3.5 rounded-2xl border border-[var(--m-brand-subtle)] bg-[var(--m-brand-soft)] flex items-start gap-3 shadow-xs">
              <div className="p-2 rounded-xl bg-white shadow-xs text-[var(--m-brand-primary)] shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--m-brand-deep)] mb-1">
                  Lời khuyên từ Cóc AI
                </h4>
                <p className="text-xs text-[var(--m-text-primary)] leading-relaxed">
                  {smartInsights[0].description ||
                    'Khoảng trống chiều nay rất thích hợp để hoàn thành bài tập lớn SWP391 trước hạn chót ngày mai.'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/ai')}
                  className="mt-2 text-xs font-bold text-[var(--m-brand-primary)] flex items-center gap-1 underline"
                >
                  Hỏi chi tiết Cóc AI <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sheet 1: Class Detail Sheet */}
      <MobileSheet
        isOpen={Boolean(selectedClass)}
        onClose={() => setSelectedClass(null)}
        title={selectedClass?.title || 'Chi tiết môn học'}
        subtitle="Thông tin tiết học tại FPT University Quy Nhơn"
      >
        {selectedClass && (
          <div className="flex flex-col gap-3.5 py-1">
            <div className="p-3.5 rounded-xl bg-[var(--m-surface-subtle)] flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--m-text-muted)]">Thời gian:</span>
                <span className="font-bold text-[var(--m-text-primary)]">{selectedClass.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--m-text-muted)]">Phòng học:</span>
                <span className="font-bold text-[var(--m-brand-primary)]">
                  {selectedClass.room || 'Alpha 204'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--m-text-muted)]">Giảng viên:</span>
                <span className="font-semibold text-[var(--m-text-primary)]">
                  {selectedClass.instructor || 'ThS. Nguyễn Văn A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--m-text-muted)]">Mã lớp:</span>
                <span className="font-mono text-[var(--m-text-secondary)]">SE1804-NET</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--m-text-muted)]">Trạng thái:</span>
                <span className={`font-bold ${checkedInIds.includes(selectedClass.id) ? 'text-emerald-600' : 'text-[var(--m-brand-primary)]'}`}>
                  {checkedInIds.includes(selectedClass.id) ? '✓ Đã điểm danh chuyên cần' : 'Chưa điểm danh'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  handleCheckIn(selectedClass);
                }}
                className={`w-full mobile-touch-target rounded-xl font-bold text-xs ${
                  checkedInIds.includes(selectedClass.id)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[var(--m-brand-primary)] text-white'
                }`}
              >
                {checkedInIds.includes(selectedClass.id) ? '✓ Đã ghi nhận điểm danh' : 'Xác nhận điểm danh ngay'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedClass(null);
                  navigate('/documents');
                }}
                className="w-full mobile-touch-target rounded-xl bg-[var(--m-brand-soft)] text-[var(--m-brand-primary)] font-bold text-xs"
              >
                Mở slide & giáo trình môn học
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

      {/* Sheet 2: KPI Breakdown Detail Sheet */}
      <MobileSheet
        isOpen={Boolean(selectedKpi)}
        onClose={() => setSelectedKpi(null)}
        title={
          selectedKpi === 'remaining'
            ? 'Thời gian học tuần này'
            : selectedKpi === 'deadlines'
            ? 'Danh sách hạn nộp trong 48h'
            : selectedKpi === 'attendance'
            ? 'Tỷ lệ chuyên cần học tập'
            : 'Tiến độ mục tiêu học tập'
        }
      >
        <div className="py-2 text-sm text-[var(--m-text-secondary)] leading-relaxed">
          {selectedKpi === 'remaining' && (
            <div>
              <p className="mb-2">
                Bạn có tổng cộng <strong className="text-[var(--m-brand-primary)]">{kpiSummary?.remainingHours || '4.5h'}</strong> tiết học và tự học còn lại trong tuần.
              </p>
              <div className="p-3 rounded-xl bg-[var(--m-surface-subtle)] text-xs flex flex-col gap-1.5 my-2">
                <div className="flex justify-between"><span>Số tiết học còn:</span><strong>2 tiết</strong></div>
                <div className="flex justify-between"><span>Thời gian tự học dự kiến:</span><strong>3.0h</strong></div>
                <div className="flex justify-between"><span>Trạng thái:</span><strong className="text-emerald-600">Đã cân bằng lịch</strong></div>
              </div>
            </div>
          )}

          {selectedKpi === 'deadlines' && (
            <div>
              <p className="mb-2">
                Có <strong className="text-red-600">{kpiSummary?.urgentDeadlineCount ?? 2} bài tập</strong> cận kề hạn nộp trong vòng 48h:
              </p>
              <div className="flex flex-col gap-2 my-2">
                <div className="p-2.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-900">
                  <span className="font-bold">PRN211 · Lab 4: Entity Framework</span>
                  <p className="text-[11px] text-red-700 mt-0.5">Hạn chót: 23:59 tối nay (Còn 9 tiếng)</p>
                </div>
                <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
                  <span className="font-bold">SWP391 · Sprint 2 Architecture Report</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">Hạn chót: 17:00 ngày mai (Còn 26 tiếng)</p>
                </div>
              </div>
            </div>
          )}

          {selectedKpi === 'goal' && (
            <div>
              <p className="mb-2">
                Tiến độ tuần đạt <strong className="text-emerald-600">{kpiSummary?.weeklyGoalPct ?? 85}%</strong>. Bạn chỉ còn 3 ngày để hoàn thành mục tiêu 15 giờ học tập kỳ Fall 2026!
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-3">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kpiSummary?.weeklyGoalPct ?? 85}%` }} />
              </div>
            </div>
          )}

          {selectedKpi === 'attendance' && (
            <div>
              <p className="mb-2">
                Tỷ lệ chuyên cần hiện tại là <strong className="text-[var(--m-campus-purple)]">100%</strong> (0 buổi vắng). Điểm chuyên cần của bạn hoàn toàn hợp lệ để tham gia kỳ thi FE.
              </p>
              <div className="p-3 rounded-xl bg-purple-50 text-xs text-purple-900 my-2">
                Quy chế FPTU: Sinh viên không được vắng quá 20% tổng số buổi mỗi môn học.
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSelectedKpi(null)}
            className="w-full mt-4 mobile-touch-target rounded-xl bg-[var(--m-brand-primary)] text-white text-xs font-bold"
          >
            Đã hiểu
          </button>
        </div>
      </MobileSheet>

      {/* Sheet 3: Room Map & Campus Directions */}
      <MobileSheet
        isOpen={Boolean(showRoomMap)}
        onClose={() => setShowRoomMap(null)}
        title={`Vị trí phòng ${showRoomMap}`}
        subtitle="Sơ đồ khuôn viên Đại học FPT Quy Nhơn"
      >
        <div className="py-2 flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-[var(--m-surface-subtle)] text-xs flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-[var(--m-text-muted)]">Khu vực:</span>
              <span className="font-bold text-[var(--m-text-primary)]">Tòa nhà Alpha (Tòa hiệu bộ & Giảng đường)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--m-text-muted)]">Tầng:</span>
              <span className="font-bold text-[var(--m-brand-primary)]">Tầng 2 (Phòng 204)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--m-text-muted)]">Thiết bị:</span>
              <span className="font-semibold text-[var(--m-text-secondary)]">Máy chiếu, Điều hòa, Wi-Fi FPT-Student</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--m-border)] bg-[var(--m-surface)] text-xs text-[var(--m-text-secondary)]">
            <h5 className="font-bold text-[var(--m-text-primary)] mb-1">Hướng dẫn di chuyển:</h5>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Từ cổng chính AI Campus, đi thẳng qua Atrium trung tâm.</li>
              <li>Sử dụng thang máy hoặc thang bộ bên trái sảnh Alpha lên tầng 2.</li>
              <li>Phòng 204 nằm ngay cạnh lối đi hành lang nhìn ra bờ hồ.</li>
            </ol>
          </div>

          <button
            type="button"
            onClick={() => setShowRoomMap(null)}
            className="w-full mobile-touch-target rounded-xl bg-[var(--m-brand-primary)] text-white text-xs font-bold"
          >
            Đóng sơ đồ
          </button>
        </div>
      </MobileSheet>
    </div>
  );
}
