import React, { useState } from 'react';
import type { EventItem, Task } from '../../../types/domain';
import { DEFAULT_TIMEZONE, formatDate, isSameDay } from '../../../utils/dateTime';
import { getDailyMetrics } from '../utils/longRangeMetrics';

interface MiniCalendarProps {
  activeDate: Date;
  selectedDate: Date;
  events: EventItem[];
  tasks: Task[];
  timeZone?: string;
  onSelectDate: (date: Date) => void;
}

export function MiniCalendar({
  activeDate,
  selectedDate,
  events,
  tasks,
  timeZone = DEFAULT_TIMEZONE,
  onSelectDate,
}: MiniCalendarProps) {
  const [navDate, setNavDate] = useState<Date>(() => {
    const d = new Date(activeDate);
    return isNaN(d.getTime()) ? new Date() : d;
  });

  const safeNavDate = isNaN(navDate.getTime()) ? new Date() : navDate;
  const year = safeNavDate.getFullYear();
  const month = safeNavDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(year, month - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNavDate(new Date(year, month + 1, 1));
  };

  const jumpToActive = () => {
    const d = new Date(activeDate);
    setNavDate(isNaN(d.getTime()) ? new Date() : d);
  };

  // Header month title
  const monthTitle = new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(navDate);

  // Compute month days grid starting from Monday
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week: 0 is Sun, 1 is Mon. We want 0 for Mon, 6 for Sun
  const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  // Days from previous month to fill first row
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevDays = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevDays.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    });
  }

  // Days in current month
  const currentDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    currentDays.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Days for next month to complete standard 35 or 42 grid cells
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;
  const remainingSlots = totalCells - (prevDays.length + currentDays.length);
  const nextDays = [];
  for (let d = 1; d <= remainingSlots; d++) {
    nextDays.push({
      date: new Date(year, month + 1, d),
      isCurrentMonth: false,
    });
  }

  const allCalendarDays = [...prevDays, ...currentDays, ...nextDays];
  const today = new Date();

  return (
    <div className="mini-calendar-container" aria-label="Bộ điều hướng lịch thu nhỏ">
      <div className="mini-calendar-header">
        <button
          type="button"
          className="mini-nav-btn"
          onClick={prevMonth}
          aria-label="Tháng trước"
        >
          Trước
        </button>
        <button
          type="button"
          className="mini-month-label"
          onClick={jumpToActive}
          title="Về tháng hiện tại"
        >
          {monthTitle}
        </button>
        <button
          type="button"
          className="mini-nav-btn"
          onClick={nextMonth}
          aria-label="Tháng sau"
        >
          Sau
        </button>
      </div>

      <div className="mini-weekdays-row" aria-hidden="true">
        <span>T2</span>
        <span>T3</span>
        <span>T4</span>
        <span>T5</span>
        <span>T6</span>
        <span>T7</span>
        <span>CN</span>
      </div>

      <div className="mini-days-grid" role="grid">
        {allCalendarDays.map(({ date, isCurrentMonth }) => {
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isSameDay(date, today);
          const metrics = getDailyMetrics(date, events, tasks, timeZone);
          const workloadHours = Math.round(metrics.workloadMinutes / 60);
          const hasWorkload = metrics.workloadMinutes > 0;
          const hasDeadlines = metrics.deadlines > 0;

          return (
            <button
              key={date.toISOString()}
              type="button"
              className={`mini-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${
                isSelected ? 'selected' : ''
              } ${isTodayDate ? 'today' : ''} ${hasDeadlines ? 'has-deadline' : ''}`}
              onClick={() => onSelectDate(date)}
              title={`${formatDate(date, timeZone)}: ${workloadHours}h`}
              aria-label={formatDate(date, timeZone)}
            >
              <span className="mini-day-number">{date.getDate()}</span>
              {hasWorkload && isCurrentMonth && (
                <span
                  className={`mini-workload-dot ${
                    metrics.isOverloaded ? 'overloaded' : ''
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
