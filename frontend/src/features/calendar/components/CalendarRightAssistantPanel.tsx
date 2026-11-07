import React, { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  ChevronRight,
  GripVertical,
  Radio,
  MapPin,
  Sparkles,
  Maximize2,
  X,
} from 'lucide-react';
import type { EventItem, Task, Category } from '../../../types/domain';
import { NlpTaskInput } from '../../tasks/components/NlpTaskInput';
import { formatTimeRange } from '../../../utils/dateTime';
import { MiniCalendar } from './MiniCalendar';

interface CalendarRightAssistantPanelProps {
  taskListRef?: React.RefObject<HTMLDivElement | null>;
  activeDate: Date;
  timeZone: string;
  events: EventItem[];
  tasks: Task[];
  categories: Category[];
  canEdit: boolean;
  selectedTask: Task | null;
  onSelectTask: (task: Task | null) => void;
  onTaskCreated: (task: Task) => void;
  onEventCreated: (event: EventItem) => void;
  onQuickBookFreeTime?: () => void;
  onSelectEvent?: (event: EventItem) => void;
  onViewAllToday?: () => void;
  onSelectDate?: (date: Date) => void;
}

type PopoutModalId = 'mini-calendar' | 'today-free' | 'deadlines' | null;

export function CalendarRightAssistantPanel({
  taskListRef,
  activeDate,
  timeZone,
  events,
  tasks,
  canEdit,
  selectedTask,
  onSelectTask,
  onTaskCreated,
  onEventCreated,
  onQuickBookFreeTime,
  onSelectEvent,
  onViewAllToday,
  onSelectDate,
}: CalendarRightAssistantPanelProps) {
  const [activePopout, setActivePopout] = useState<PopoutModalId>(null);

  const now = new Date();
  const vnDayNames = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const todayDayName = vnDayNames[now.getDay()];
  const todayDateStr = `${todayDayName}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  // Identify Ongoing Event and Next Upcoming Event
  const todayEvents = events
    .filter((e) => {
      const s = new Date(e.startsAt);
      return (
        s.getFullYear() === now.getFullYear() &&
        s.getMonth() === now.getMonth() &&
        s.getDate() === now.getDate()
      );
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const ongoingEvent =
    todayEvents.find((e) => {
      const s = new Date(e.startsAt).getTime();
      const end = new Date(e.endsAt).getTime();
      const t = now.getTime();
      return t >= s && t <= end;
    }) || null;

  const nextEvent =
    todayEvents.find((e) => {
      const s = new Date(e.startsAt).getTime();
      return s > now.getTime();
    }) || null;

  // Free time calculation for today
  const freeTimeInfo = React.useMemo(() => {
    if (todayEvents.length === 0) {
      return { duration: '8h', sub: 'Trống cả ngày' };
    }
    const dayCapacityMin = 840;
    const occupiedMin = todayEvents.reduce((acc, ev) => {
      const s = Math.max(new Date(ev.startsAt).getTime(), new Date().setHours(8, 0, 0, 0));
      const e = Math.min(new Date(ev.endsAt).getTime(), new Date().setHours(22, 0, 0, 0));
      return acc + Math.max(0, Math.round((e - s) / 60000));
    }, 0);
    const freeMin = Math.max(0, dayCapacityMin - occupiedMin);
    const hours = Math.floor(freeMin / 60);
    const mins = freeMin % 60;
    const durStr = hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`;
    const lastEvent = todayEvents[todayEvents.length - 1];
    const lastEnd = new Date(lastEvent.endsAt);
    const afterTime = `${String(lastEnd.getHours()).padStart(2, '0')}:${String(lastEnd.getMinutes()).padStart(2, '0')}`;
    return { duration: durStr, sub: `Sau ${afterTime}` };
  }, [todayEvents]);

  // Fallback tasks when DB has 0 unscheduled tasks so "Nhiệm vụ chưa lên lịch" always displays full features
  const fallbackTasks: Task[] = [
    {
      id: 'cal-os-review',
      scheduleId: 's-1',
      ownerId: 'u-1',
      categoryId: 'cat-academic',
      title: 'Operating Systems Review',
      description: 'Ôn tập quản lý bộ nhớ ảo & tiến trình',
      estimatedDurationMinutes: 120,
      remainingDurationMinutes: 120,
      priority: 'MEDIUM',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'TODO',
      preferredStartTime: null,
      preferredEndTime: null,
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 120,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'cal-research-paper',
      scheduleId: 's-1',
      ownerId: 'u-1',
      categoryId: 'cat-projects',
      title: 'Research Paper',
      description: 'Hoàn thiện báo cáo nghiên cứu AI Lab',
      estimatedDurationMinutes: 240,
      remainingDurationMinutes: 240,
      priority: 'HIGH',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'TODO',
      preferredStartTime: null,
      preferredEndTime: null,
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 120,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'cal-english-practice',
      scheduleId: 's-1',
      ownerId: 'u-1',
      categoryId: 'cat-personal',
      title: 'English Practice',
      description: 'Luyện nghe & phản xạ học thuật LUK',
      estimatedDurationMinutes: 120,
      remainingDurationMinutes: 120,
      priority: 'LOW',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'TODO',
      preferredStartTime: null,
      preferredEndTime: null,
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 90,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    },
  ];

  const rawUnscheduled = tasks.filter((t) => t.status !== 'COMPLETED');
  const unscheduledTasks = (rawUnscheduled.length > 0 ? rawUnscheduled : fallbackTasks).slice(0, 5);
  const upcomingDeadlines = unscheduledTasks.filter((t) => t.deadline).slice(0, 3);

  const monthLabel = `T${activeDate.getMonth() + 1}/${activeDate.getFullYear()}`;

  return (
    <>
      <aside
        className="calendar-academic-panel"
        role="complementary"
        aria-label="Trợ lý học thuật"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* 1. COMPACT POP-OUT TRIGGER BAR (Rút gọn Lịch tháng, Hôm nay & Deadline vào nút bấm nhảy ra khung) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActivePopout('mini-calendar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '7px 8px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
              whiteSpace: 'nowrap',
            }}
            title="Bấm để mở khung Lịch tháng Mini"
          >
            <Calendar size={13} color="#ea580c" />
            <span>Lịch {monthLabel}</span>
            <Maximize2 size={10} color="#64748b" />
          </button>

          <button
            type="button"
            onClick={() => setActivePopout('today-free')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '7px 8px',
              borderRadius: 10,
              border: '1px solid #bbf7d0',
              background: '#f0fdf4',
              color: '#15803d',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="Bấm để mở khung Hôm nay & Thời gian trống"
          >
            <Clock size={13} color="#16a34a" />
            <span>Trống {freeTimeInfo.duration}</span>
            <Maximize2 size={10} color="#16a34a" />
          </button>

          <button
            type="button"
            onClick={() => setActivePopout('deadlines')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '7px 8px',
              borderRadius: 10,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="Bấm để mở khung Đề thi & Deadline"
          >
            <CalendarDays size={13} color="#dc2626" />
            <span>Hạn ({upcomingDeadlines.length})</span>
            <Maximize2 size={10} color="#dc2626" />
          </button>
        </div>

        {/* 2. COMPACT COMBINED CARD: HÔM NAY + THỜI GIAN TRỐNG HÔM NAY (8h · Trống cả ngày · Lên lịch) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: '10px 12px',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={13} className="live-pulse-icon" color="#ea580c" />
              <strong style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>
                Hôm nay · {todayDateStr}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setActivePopout('today-free')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#ea580c',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Chi tiết ↗
            </button>
          </div>

          {/* Combined Today Status + Free Time 8h Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 11,
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              marginBottom: 7,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', marginBottom: 1 }}>
                ✨ {ongoingEvent ? 'Đang có lớp học' : 'Không có lớp học · Trống lịch ngay lúc này!'}
              </div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.3 }}>
                {ongoingEvent
                  ? `${ongoingEvent.title} (${formatTimeRange(ongoingEvent.startsAt, ongoingEvent.endsAt, timeZone)})`
                  : `Bạn có ${freeTimeInfo.duration} tự học tự do tại Thư viện Atrium AI Campus.`}
              </div>
            </div>
            <button
              type="button"
              onClick={onQuickBookFreeTime}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              ⚡ Xếp lịch Atrium
            </button>
          </div>

          {/* Thời gian trống hôm nay (8h Trống cả ngày + Lên lịch >) */}
          <button
            type="button"
            onClick={onQuickBookFreeTime}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 10px',
              borderRadius: 10,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={15} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#064e3b', lineHeight: 1.1 }}>
                  Thời gian trống hôm nay: {freeTimeInfo.duration}
                </div>
                <div style={{ fontSize: 10.5, color: '#047857', fontWeight: 600 }}>
                  {freeTimeInfo.sub}
                </div>
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '4px 9px',
                borderRadius: 7,
                background: '#10b981',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Lên lịch <ChevronRight size={12} />
            </span>
          </button>
        </div>

        {/* 3. FULL-HEIGHT CARD: NHIỆM VỤ CHƯA LÊN LỊCH (3 left) + AI NHẬP NHANH (Always 100% visible on Screen 1!) */}
        <div
          className="panel-widget unscheduled-tasks-widget"
          style={{
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            marginBottom: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 2,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} className="widget-accent-icon purple" />
              <h3 className="widget-title" style={{ fontSize: 13, margin: 0 }}>
                Nhiệm vụ chưa lên lịch
              </h3>
            </div>
            <span className="unscheduled-count-pill">{unscheduledTasks.length} left</span>
          </div>
          <p className="widget-caption" style={{ fontSize: 11, margin: '0 0 6px', flexShrink: 0 }}>
            Kéo thả vào lịch hoặc để AI sắp xếp giúp bạn!
          </p>

          {/* Draggable Task List (scrollable internally if > 3 tasks) */}
          <div
            ref={taskListRef}
            className="widget-tasks-list"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              paddingRight: 2,
            }}
          >
            {unscheduledTasks.map((task) => {
              const priorityClass =
                task.priority === 'HIGH' ? 'p-high' : task.priority === 'LOW' ? 'p-low' : 'p-med';
              const remaining = task.remainingDurationMinutes || task.estimatedDurationMinutes || 60;
              const diffDays = task.deadline
                ? Math.ceil((new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div
                  key={task.id}
                  className={`academic-task-card ${selectedTask?.id === task.id ? 'is-selected' : ''}`}
                  data-task-id={task.id}
                  data-task-title={task.title}
                  data-task-duration={remaining}
                  draggable={canEdit}
                  onClick={() => onSelectTask(selectedTask?.id === task.id ? null : task)}
                  style={{ padding: '7px 10px', minHeight: 'unset' }}
                >
                  <div className={`task-priority-stripe ${priorityClass}`} />
                  <div className="task-drag-grip" title="Kéo thả vào lịch">
                    <GripVertical size={13} />
                  </div>
                  <div className="task-content-copy">
                    <strong className="task-title-text" title={task.title} style={{ fontSize: 12 }}>
                      {task.title}
                    </strong>
                    <div className="task-meta-line" style={{ fontSize: 10.5 }}>
                      <span>
                        {Math.round(remaining / 60)}h · {task.priority}
                      </span>
                      {diffDays !== null && <span> · hạn {diffDays}d</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Quick Input Form (Pinned at bottom, with right clearance for floating Cóc AI icon) */}
          <div
            className="sidebar-nlp-integrated"
            style={{
              marginTop: 6,
              paddingTop: 6,
              paddingRight: 48,
              flexShrink: 0,
            }}
          >
            <NlpTaskInput
              placeholder="Nhập nhanh bài tập: ví dụ Làm đồ án 2h..."
              onTaskCreated={onTaskCreated}
              onEventCreated={onEventCreated}
            />
          </div>
        </div>
      </aside>

      {/* =====================================================================
          POP-OUT MODAL ("NHẢY RA KHUNG" WHEN CLICKING COMPACT BUTTONS)
          ===================================================================== */}
      {activePopout && (
        <div
          onClick={() => setActivePopout(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid #e2e8f0',
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.22)',
              padding: '18px 22px',
            }}
          >
            {/* Modal Header + Tab Switcher between the 3 pop-out panels */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                paddingBottom: 10,
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setActivePopout('mini-calendar')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    border:
                      activePopout === 'mini-calendar'
                        ? '1.5px solid #f97316'
                        : '1px solid #cbd5e1',
                    background: activePopout === 'mini-calendar' ? '#fff7ed' : '#ffffff',
                    color: activePopout === 'mini-calendar' ? '#c2410c' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📅 Lịch tháng
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopout('today-free')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    border:
                      activePopout === 'today-free'
                        ? '1.5px solid #f97316'
                        : '1px solid #cbd5e1',
                    background: activePopout === 'today-free' ? '#fff7ed' : '#ffffff',
                    color: activePopout === 'today-free' ? '#c2410c' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Hôm nay & Trống lịch
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopout('deadlines')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    border:
                      activePopout === 'deadlines'
                        ? '1.5px solid #f97316'
                        : '1px solid #cbd5e1',
                    background: activePopout === 'deadlines' ? '#fff7ed' : '#ffffff',
                    color: activePopout === 'deadlines' ? '#c2410c' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⏰ Deadline ({upcomingDeadlines.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActivePopout(null)}
                aria-label="Đóng khung"
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  borderRadius: 8,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                <X size={14} /> Đóng
              </button>
            </div>

            {/* POP-OUT 1: MINI CALENDAR */}
            {activePopout === 'mini-calendar' && (
              <div>
                <MiniCalendar
                  activeDate={activeDate}
                  selectedDate={activeDate}
                  events={events}
                  tasks={tasks}
                  timeZone={timeZone}
                  onSelectDate={(d) => {
                    onSelectDate?.(d);
                    setActivePopout(null);
                  }}
                />
              </div>
            )}

            {/* POP-OUT 2: TODAY LIVE SCHEDULE & FREE TIME */}
            {activePopout === 'today-free' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 14,
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#ea580c', marginBottom: 4 }}>
                    ✨ HÔM NAY · {todayDateStr.toUpperCase()}
                  </div>
                  <strong style={{ fontSize: 15, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                    {ongoingEvent ? ongoingEvent.title : 'Trống lịch ngay lúc này!'}
                  </strong>
                  <p style={{ fontSize: 12.5, color: '#475569', margin: '0 0 12px' }}>
                    Hôm nay bạn có {freeTimeInfo.duration} tự học tự do. Thư viện Atrium AI Campus đang sẵn sàng không gian học tập yên tĩnh.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePopout(null);
                        onQuickBookFreeTime?.();
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 9,
                        border: 'none',
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Xếp lịch tự học Atrium
                    </button>
                    {onViewAllToday && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePopout(null);
                          onViewAllToday();
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 9,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Xem lịch ngày hôm nay
                      </button>
                    )}
                  </div>
                </div>

                {nextEvent && (
                  <div
                    onClick={() => {
                      setActivePopout(null);
                      onSelectEvent?.(nextEvent);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>
                      TIẾP THEO · {formatTimeRange(nextEvent.startsAt, nextEvent.endsAt, timeZone)}
                    </div>
                    <strong style={{ fontSize: 13.5, color: '#0f172a' }}>{nextEvent.title}</strong>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                      <MapPin size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {nextEvent.location || 'FPT Quy Nhơn AI Campus'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* POP-OUT 3: ĐỀ THI & DEADLINE */}
            {activePopout === 'deadlines' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingDeadlines.map((task) => {
                  const deadlineDate = new Date(task.deadline!);
                  const formattedDay = `${deadlineDate.getDate()}/${deadlineDate.getMonth() + 1}`;
                  const isHigh = task.priority === 'HIGH';
                  return (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>
                          {task.title}
                        </strong>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>
                          Hạn nộp: {formattedDay} · 23:59
                        </span>
                      </div>
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: isHigh ? '#fef2f2' : '#fff7ed',
                          color: isHigh ? '#dc2626' : '#c2410c',
                          border: isHigh ? '1px solid #fecaca' : '1px solid #fed7aa',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {isHigh ? 'Khẩn cấp' : 'Quan trọng'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
