import React, { useMemo, useState, useRef } from 'react';
import type { Category, EventItem, Task } from '../../../types/domain';
import {
  DEFAULT_TIMEZONE,
  formatDate,
  formatDuration,
  formatTimeRange,
  getDurationMinutes,
  isSameDay,
} from '../../../utils/dateTime';
import { getTimelineTaskData, type TimelineTaskRow } from '../utils/longRangeMetrics';

export type TimelineTimescale = 'week' | 'month' | 'quarter';

interface TimelineViewProps {
  activeDate: Date;
  tasks: Task[];
  events: EventItem[];
  categories: Category[];
  timeZone?: string;
  onSelectEvent: (event: EventItem) => void;
  onMoveSession?: (eventId: string, newStartIso: string, newEndIso: string) => void;
  onNavigateDate: (daysDelta: number) => void;
}

const VIETNAMESE_DAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function TimelineView({
  activeDate,
  tasks,
  events,
  categories,
  timeZone = DEFAULT_TIMEZONE,
  onSelectEvent,
  onNavigateDate,
}: TimelineViewProps) {
  const [timescale, setTimescale] = useState<TimelineTimescale>('month');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Determine date range based on timescale
  const { startDate, dayCount, days } = useMemo(() => {
    let count = 30;
    if (timescale === 'week') count = 7;
    else if (timescale === 'quarter') count = 90;

    const start = new Date(activeDate);
    if (timescale === 'week') {
      const dayOfWeek = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - dayOfWeek);
    } else {
      start.setDate(start.getDate() - 5);
    }
    start.setHours(0, 0, 0, 0);

    const dayList: Date[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dayList.push(d);
    }

    return { startDate: start, dayCount: count, days: dayList };
  }, [activeDate, timescale]);

  // Aggregate project tasks with their scheduled sessions and deadlines
  const taskRows = useMemo(() => {
    return getTimelineTaskData(tasks, events, timeZone);
  }, [tasks, events, timeZone]);

  // Column pixel width per day
  const columnWidth = timescale === 'week' ? 140 : timescale === 'month' ? 44 : 20;
  const totalTimelineWidth = dayCount * columnWidth;

  // Calculate pixel X for a given ISO time string
  const getXForTime = (timeIso: string): number => {
    const d = new Date(timeIso);
    const msDiff = d.getTime() - startDate.getTime();
    const dayFraction = msDiff / (24 * 60 * 60 * 1000);
    return Math.max(0, dayFraction * columnWidth);
  };

  const handlePrev = () => {
    const delta = timescale === 'week' ? -7 : timescale === 'month' ? -30 : -90;
    onNavigateDate(delta);
  };

  const handleNext = () => {
    const delta = timescale === 'week' ? 7 : timescale === 'month' ? 30 : 90;
    onNavigateDate(delta);
  };

  return (
    <div className="timeline-view-container" aria-label="Lược đồ tiến độ dự án Gantt">
      {/* Top Controls Toolbar */}
      <div className="timeline-toolbar">
        <div className="timeline-nav-group">
          <button
            type="button"
            className="secondary-button compact-btn"
            onClick={handlePrev}
            aria-label="Khoảng thời gian trước"
          >
            Trước
          </button>
          <span className="timeline-range-label">
            {formatDate(days[0], timeZone, { month: 'short', day: 'numeric', year: 'numeric' })} –{' '}
            {formatDate(days[days.length - 1], timeZone, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <button
            type="button"
            className="secondary-button compact-btn"
            onClick={handleNext}
            aria-label="Khoảng thời gian sau"
          >
            Sau
          </button>
        </div>

        {/* Timescale Selector */}
        <div className="timeline-timescale-selector">
          <button
            type="button"
            className={`timeline-timescale-btn ${timescale === 'week' ? 'active' : ''}`}
            onClick={() => setTimescale('week')}
          >
            Tuần
          </button>
          <button
            type="button"
            className={`timeline-timescale-btn ${timescale === 'month' ? 'active' : ''}`}
            onClick={() => setTimescale('month')}
          >
            Tháng
          </button>
          <button
            type="button"
            className={`timeline-timescale-btn ${timescale === 'quarter' ? 'active' : ''}`}
            onClick={() => setTimescale('quarter')}
          >
            Quý
          </button>
        </div>
      </div>

      {/* Main Gantt Grid: Fixed Left Sidebar + Scrollable Timeline */}
      <div className="timeline-gantt-layout">
        {/* Left Column: Fixed Task List */}
        <div className="timeline-tasks-sidebar">
          <div className="timeline-sidebar-header">
            <span>Dự án &amp; Bài tập</span>
            <span className="task-count-badge">{taskRows.length}</span>
          </div>

          <div className="timeline-sidebar-rows">
            {taskRows.length === 0 ? (
              <div className="timeline-empty-tasks">Chưa có bài tập nào</div>
            ) : (
              taskRows.map((row) => (
                <div key={row.task.id} className="timeline-task-row-info">
                  <div className="task-row-title-wrap">
                    <span
                      className="category-dot"
                      style={{ backgroundColor: row.color }}
                    />
                    <strong className="task-title-text" title={row.task.title}>
                      {row.task.title}
                    </strong>
                  </div>
                  <div className="task-row-meta">
                    <span className="task-progress-stat">
                      {row.totalScheduledMinutes > 0
                        ? `${formatDuration(row.totalScheduledMinutes)} đã xếp`
                        : 'Chưa lên lịch'}
                    </span>
                    {row.deadlineDate && (
                      <span className="task-due-stat">
                        Hạn {formatDate(row.deadlineDate, timeZone, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Horizontally Scrollable Timeline Area */}
        <div className="timeline-scroll-area" ref={scrollContainerRef}>
          <div className="timeline-scroll-content" style={{ width: `${totalTimelineWidth}px` }}>
            {/* Header Dates Row */}
            <div className="timeline-days-header" style={{ width: `${totalTimelineWidth}px` }}>
              {days.map((d, i) => {
                const isTodayDate = isSameDay(d, today, timeZone);
                const dayNum = d.getDay();
                const isWeekend = dayNum === 0 || dayNum === 6;

                return (
                  <div
                    key={i}
                    className={`timeline-day-col-header ${isTodayDate ? 'today' : ''} ${
                      isWeekend ? 'weekend' : ''
                    }`}
                    style={{ width: `${columnWidth}px` }}
                  >
                    <span className="timeline-day-name">
                      {VIETNAMESE_DAYS_SHORT[d.getDay()]}
                    </span>
                    <span className="timeline-day-num">{d.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Background Grid Columns */}
            <div className="timeline-grid-background" style={{ width: `${totalTimelineWidth}px` }}>
              {days.map((d, i) => {
                const isTodayDate = isSameDay(d, today, timeZone);
                const dayNum = d.getDay();
                const isWeekend = dayNum === 0 || dayNum === 6;

                return (
                  <div
                    key={i}
                    className={`timeline-grid-column ${isWeekend ? 'weekend' : ''} ${
                      isTodayDate ? 'today-column' : ''
                    }`}
                    style={{ width: `${columnWidth}px` }}
                  />
                );
              })}

              {/* Vertical Today Line */}
              {days.some((d) => isSameDay(d, today, timeZone)) && (
                <div
                  className="timeline-today-vertical-line"
                  style={{
                    left: `${getXForTime(today.toISOString())}px`,
                  }}
                  title="Hiện tại"
                >
                  <span className="timeline-today-badge">Hôm nay</span>
                </div>
              )}
            </div>

            {/* Task Rows with Bars & Deadlines */}
            <div className="timeline-rows-container">
              {taskRows.map((row) => {
                const taskDeadlineX = row.deadlineDate ? getXForTime(row.deadlineDate) : null;

                return (
                  <div key={row.task.id} className="timeline-row-slot">
                    {/* Scheduled Sessions as Gantt Bars */}
                    {row.sessions.map((session) => {
                      const startX = getXForTime(session.startsAt);
                      const endX = getXForTime(session.endsAt);
                      const barWidth = Math.max(16, endX - startX);
                      const originalEvent = events.find((e) => e.id === session.eventId);

                      return (
                        <div
                          key={session.eventId}
                          className={`timeline-session-bar ${
                            session.hasConflict ? 'has-conflict' : ''
                          }`}
                          style={{
                            left: `${startX}px`,
                            width: `${barWidth}px`,
                            backgroundColor: session.color || row.color || '#ea580c',
                          }}
                          onClick={() => originalEvent && onSelectEvent(originalEvent)}
                          role="button"
                          tabIndex={0}
                          title={`${session.title} · ${formatTimeRange(
                            session.startsAt,
                            session.endsAt,
                            timeZone
                          )} (${formatDuration(session.durationMinutes)})${
                            session.hasConflict ? ' · [Trùng lịch]' : ''
                          }`}
                          aria-label={`${session.title}: ${formatTimeRange(
                            session.startsAt,
                            session.endsAt,
                            timeZone
                          )}`}
                        >
                          <span className="timeline-bar-title">{session.title}</span>
                          <span className="timeline-bar-time">
                            {formatDuration(session.durationMinutes)}
                          </span>
                        </div>
                      );
                    })}

                    {/* Vertical Deadline Marker */}
                    {taskDeadlineX !== null && taskDeadlineX >= 0 && taskDeadlineX <= totalTimelineWidth && (
                      <div
                        className={`timeline-deadline-marker ${row.isOverdue ? 'overdue' : ''}`}
                        style={{ left: `${taskDeadlineX}px` }}
                        title={`Hạn chót: ${formatDate(row.deadlineDate!, timeZone)}`}
                      >
                        <span className="timeline-deadline-tag">Hạn</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
