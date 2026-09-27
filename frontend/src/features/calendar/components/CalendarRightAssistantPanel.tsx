import React from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  ChevronRight,
  GripVertical,
  Radio,
  BookOpen,
  AlertCircle,
  MapPin,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import type { EventItem, Task, Category } from '../../../types/domain';
import { NlpTaskInput } from '../../tasks/components/NlpTaskInput';
import { formatMinutes, formatDeadline } from '../../scheduling/utils/taskCalculations';
import { formatTimeRange } from '../../../utils/dateTime';

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
}

export function CalendarRightAssistantPanel({
  taskListRef,
  activeDate,
  timeZone,
  events,
  tasks,
  categories,
  canEdit,
  selectedTask,
  onSelectTask,
  onTaskCreated,
  onEventCreated,
  onQuickBookFreeTime,
  onSelectEvent,
  onViewAllToday,
}: CalendarRightAssistantPanelProps) {
  const now = new Date();

  // 1. Compute today's active day string
  const vnDayNames = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const todayDayName = vnDayNames[now.getDay()];
  const todayDateStr = `${todayDayName}, ${now.getDate()} tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;

  // 2. Identify Ongoing Event and Next Upcoming Event
  const todayEvents = events.filter((e) => {
    const s = new Date(e.startsAt);
    return (
      s.getFullYear() === now.getFullYear() &&
      s.getMonth() === now.getMonth() &&
      s.getDate() === now.getDate()
    );
  }).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // Ongoing event
  const ongoingEvent = todayEvents.find((e) => {
    const s = new Date(e.startsAt).getTime();
    const end = new Date(e.endsAt).getTime();
    const t = now.getTime();
    return t >= s && t <= end;
  }) || null;

  // Next event
  const nextEvent = todayEvents.find((e) => {
    const s = new Date(e.startsAt).getTime();
    return s > now.getTime();
  }) || null;

  // Real free time calculation for today
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

  // Countdown to next event
  const getNextCountdown = (event: EventItem | null): string => {
    if (!event) return '';
    const diffMin = Math.round((new Date(event.startsAt).getTime() - now.getTime()) / 60000);
    if (diffMin <= 0) return 'Bắt đầu ngay';
    if (diffMin < 60) return `Còn ${diffMin}p`;
    const hours = Math.floor(diffMin / 60);
    return `Còn ${hours}h`;
  };

  // 3. Upcoming Deadlines (up to 3 items)
  const upcomingDeadlines = tasks
    .filter((t) => t.deadline && t.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 3);

  // 4. Pending Unscheduled Tasks
  const unscheduledTasks = tasks
    .filter((t) => t.status !== 'COMPLETED')
    .slice(0, 5);

  return (
    <aside className="calendar-academic-panel" role="complementary" aria-label="Trợ lý học thuật">
      {/* SECTION 1: HÔM NAY (Live Schedule) */}
      <div className="panel-widget today-live-widget">
        <div className="widget-header">
          <div>
            <h3 className="widget-title">Hôm nay</h3>
            <span className="widget-subtitle">{todayDateStr}</span>
          </div>
          <button
            type="button"
            className="widget-link-btn"
            onClick={onViewAllToday}
            title="Xem tất cả lịch học hôm nay"
          >
            Tất cả
          </button>
        </div>

        {/* 1A. Đang diễn ra */}
        <div className="live-subgroup">
          <div className="subgroup-heading">
            <Radio size={13} className="live-pulse-icon" />
            <span>Đang diễn ra</span>
          </div>

          {ongoingEvent ? (
            <div
              className="live-event-card active-live"
              onClick={() => onSelectEvent?.(ongoingEvent)}
              tabIndex={0}
              role="button"
            >
              <div className="live-card-accent blue" />
              <div className="live-card-content">
                <div className="live-card-top">
                  <span className="live-time-range">
                    {formatTimeRange(ongoingEvent.startsAt, ongoingEvent.endsAt, timeZone)}
                  </span>
                  <span className="live-status-pill current">Hiện tại</span>
                </div>
                <strong className="live-event-title">{ongoingEvent.title}</strong>
                <span className="live-event-loc">
                  <MapPin size={11} className="loc-icon" />
                  {ongoingEvent.location || 'Chưa cập nhật phòng'}
                </span>
              </div>
            </div>
          ) : (
            <div className="live-empty-card">
              <span>Không có lớp học nào đang diễn ra</span>
            </div>
          )}
        </div>

        {/* 1B. Tiếp theo */}
        {nextEvent && (
          <div className="live-subgroup">
            <div className="subgroup-heading">
              <Clock size={13} />
              <span>Tiếp theo</span>
            </div>

            <div
              className="live-event-card next-live"
              onClick={() => onSelectEvent?.(nextEvent)}
              tabIndex={0}
              role="button"
            >
              <div className="live-card-accent purple" />
              <div className="live-card-content">
                <div className="live-card-top">
                  <span className="live-time-range">
                    {formatTimeRange(nextEvent.startsAt, nextEvent.endsAt, timeZone)}
                  </span>
                  <span className="live-status-pill upcoming">{getNextCountdown(nextEvent) || 'Sắp tới'}</span>
                </div>
                <strong className="live-event-title">{nextEvent.title}</strong>
                <span className="live-event-loc">
                  <MapPin size={11} className="loc-icon" />
                  {nextEvent.location || 'Chưa cập nhật phòng'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: ĐỀ THI & DEADLINE */}
      <div className="panel-widget deadlines-widget">
        <div className="widget-header">
          <div className="widget-header-icon-group">
            <CalendarDays size={15} className="widget-accent-icon orange" />
            <h3 className="widget-title">Đề thi & Deadline</h3>
          </div>
        </div>

        <div className="deadlines-list">
          {upcomingDeadlines.length === 0 ? (
            <div className="empty-sub-item">Không có hạn nộp nào trong tuần này 🎉</div>
          ) : (
            upcomingDeadlines.map((task) => {
              const deadlineDate = new Date(task.deadline!);
              const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const countdownText = diffDays <= 0 ? 'Hôm nay' : `Due in ${diffDays} days`;
              const formattedDay = `${deadlineDate.getDate()}/${deadlineDate.getMonth() + 1}`;

              return (
                <div key={task.id} className="deadline-row-item">
                  <div className="deadline-icon-box orange">
                    <Calendar size={14} />
                  </div>
                  <div className="deadline-details">
                    <strong className="deadline-task-name" title={task.title}>{task.title}</strong>
                    <span className="deadline-meta">{countdownText} · {formattedDay}</span>
                  </div>
                  <ChevronRight size={14} className="deadline-chevron" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 3: THỜI GIAN TRỐNG HÔM NAY */}
      <div className="panel-widget free-time-widget">
        <div className="widget-header">
          <div className="widget-header-icon-group">
            <Clock size={15} className="widget-accent-icon emerald" />
            <h3 className="widget-title">Thời gian trống hôm nay</h3>
          </div>
        </div>

        <button
          type="button"
          className="free-time-action-card"
          onClick={onQuickBookFreeTime}
          title="Bấm để lên lịch học tập vào khung giờ này"
        >
          <div className="free-time-icon-circle">
            <Clock size={22} />
          </div>
          <div className="free-time-copy">
            <span className="free-time-duration">{freeTimeInfo.duration}</span>
            <span className="free-time-sub">{freeTimeInfo.sub}</span>
          </div>
          <ChevronRight size={16} className="free-time-chevron" />
        </button>
      </div>

      {/* SECTION 4: NHIỆM VỤ CHƯA LÊN LỊCH */}
      <div className="panel-widget unscheduled-tasks-widget">
        <div className="widget-header">
          <div className="widget-header-icon-group">
            <Sparkles size={15} className="widget-accent-icon purple" />
            <h3 className="widget-title">Nhiệm vụ chưa lên lịch</h3>
          </div>
          <span className="unscheduled-count-pill">{unscheduledTasks.length} left</span>
        </div>
        <p className="widget-caption">Kéo thả hoặc để AI sắp xếp giúp bạn!</p>

        {/* Task Draggable List */}
        <div ref={taskListRef} className="widget-tasks-list">
          {unscheduledTasks.length === 0 ? (
            <div className="empty-sub-item">Tất cả bài tập đã được lên lịch gọn gàng ✨</div>
          ) : (
            unscheduledTasks.map((task) => {
              const priorityClass = task.priority === 'HIGH' ? 'p-high' : task.priority === 'LOW' ? 'p-low' : 'p-med';
              const remaining = task.remainingDurationMinutes || task.estimatedDurationMinutes || 60;
              const diffDays = task.deadline ? Math.ceil((new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

              return (
                <div
                  key={task.id}
                  className={`academic-task-card ${selectedTask?.id === task.id ? 'is-selected' : ''}`}
                  data-task-id={task.id}
                  data-task-title={task.title}
                  data-task-duration={remaining}
                  draggable={canEdit}
                  onClick={() => onSelectTask(selectedTask?.id === task.id ? null : task)}
                >
                  <div className={`task-priority-stripe ${priorityClass}`} />
                  <div className="task-drag-grip" title="Kéo thả vào lịch">
                    <GripVertical size={14} />
                  </div>
                  <div className="task-content-copy">
                    <strong className="task-title-text" title={task.title}>{task.title}</strong>
                    <div className="task-meta-line">
                      <span>{Math.round(remaining / 60)}h · {task.priority}</span>
                      {diffDays !== null && <span> · due in {diffDays}d</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* AI Quick Input Form */}
        <div className="sidebar-nlp-integrated">
          <NlpTaskInput
            placeholder="Nhập nhanh bài tập: ví dụ Làm đồ án 2h..."
            onTaskCreated={onTaskCreated}
            onEventCreated={onEventCreated}
          />
        </div>
      </div>
    </aside>
  );
}
