import React from 'react';
import type { EventItem, Task } from '../../../types/domain';
import { DEFAULT_TIMEZONE, formatDate, formatDuration, isSameDay } from '../../../utils/dateTime';
import {
  getDailyMetrics,
  getQuarterMonths,
  getWeekSummary,
} from '../utils/longRangeMetrics';

interface QuarterViewProps {
  activeDate: Date;
  events: EventItem[];
  tasks: Task[];
  timeZone?: string;
  dailyCapacityMinutes?: number;
  onSelectDate: (date: Date) => void;
  onSelectMonth: (year: number, monthIndex: number) => void;
  onNavigateQuarter: (quarterDelta: number) => void;
}

const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export function QuarterView({
  activeDate,
  events,
  tasks,
  timeZone = DEFAULT_TIMEZONE,
  dailyCapacityMinutes = 360,
  onSelectDate,
  onSelectMonth,
  onNavigateQuarter,
}: QuarterViewProps) {
  const safeDate = activeDate instanceof Date && !isNaN(activeDate.getTime()) ? activeDate : new Date();
  const currentYear = safeDate.getFullYear();
  const currentMonth = safeDate.getMonth();
  const currentQuarter = (Math.floor(currentMonth / 3) + 1) as 1 | 2 | 3 | 4;
  const quarterMonths = getQuarterMonths(currentYear, currentQuarter);
  const today = new Date();

  // Generate weekly scanning summaries for the quarter
  const quarterStartDate = new Date(currentYear, quarterMonths[0], 1);
  const startDay = (quarterStartDate.getDay() + 6) % 7;
  const firstMonday = new Date(quarterStartDate);
  firstMonday.setDate(quarterStartDate.getDate() - startDay);

  const quarterEndDate = new Date(currentYear, quarterMonths[2] + 1, 0);

  const weeklySummaries = [];
  const iterDate = new Date(firstMonday);
  while (iterDate <= quarterEndDate) {
    weeklySummaries.push(getWeekSummary(iterDate, events, tasks, timeZone, dailyCapacityMinutes));
    iterDate.setDate(iterDate.getDate() + 7);
  }

  const renderMonth = (monthIndex: number) => {
    const firstDay = new Date(currentYear, monthIndex, 1);
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    const startDayOffset = (firstDay.getDay() + 6) % 7;

    const days = [];
    for (let i = 0; i < startDayOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(currentYear, monthIndex, d));
    }

    return (
      <div key={monthIndex} className="quarter-month-card">
        <button
          type="button"
          className="quarter-month-header"
          onClick={() => onSelectMonth(currentYear, monthIndex)}
          title={`Xem ${MONTH_NAMES[monthIndex]} theo tháng`}
        >
          <h4>{MONTH_NAMES[monthIndex]}</h4>
          <span className="month-open-tag">Mở tháng</span>
        </button>

        <div className="quarter-weekdays-row" aria-hidden="true">
          <span>T2</span>
          <span>T3</span>
          <span>T4</span>
          <span>T5</span>
          <span>T6</span>
          <span>T7</span>
          <span>CN</span>
        </div>

        <div className="quarter-days-grid" role="grid">
          {days.map((dayDate, idx) => {
            if (!dayDate) {
              return <div key={`empty-${idx}`} className="quarter-day-empty" aria-hidden="true" />;
            }

            const isTodayDate = isSameDay(dayDate, today, timeZone);
            const isSelected = isSameDay(dayDate, activeDate, timeZone);
            const metrics = getDailyMetrics(dayDate, events, tasks, timeZone, dailyCapacityMinutes);

            const hours = Math.round(metrics.workloadMinutes / 60);
            let intensityClass = 'heatmap-none';
            if (metrics.isOverloaded || hours > 6) {
              intensityClass = 'heatmap-overload';
            } else if (hours > 4) {
              intensityClass = 'heatmap-high';
            } else if (hours > 2) {
              intensityClass = 'heatmap-moderate';
            } else if (hours > 0) {
              intensityClass = 'heatmap-light';
            }

            return (
              <button
                key={dayDate.toISOString()}
                type="button"
                className={`quarter-day-cell ${intensityClass} ${isTodayDate ? 'is-today' : ''} ${
                  isSelected ? 'is-selected' : ''
                }`}
                onClick={() => onSelectDate(dayDate)}
                title={`${formatDate(dayDate, timeZone)}: ${formatDuration(metrics.workloadMinutes)}`}
                aria-label={`${formatDate(dayDate, timeZone)}: ${hours}h`}
              >
                <div className="quarter-cell-top">
                  <span className="day-number">{dayDate.getDate()}</span>
                  {metrics.deadlines > 0 && (
                    <span className="quarter-deadline-badge" title={`${metrics.deadlines} hạn chót`}>
                      Hạn
                    </span>
                  )}
                </div>

                {metrics.workloadMinutes > 0 && (
                  <div className="quarter-cell-workload">
                    <span>{formatDuration(metrics.workloadMinutes)}</span>
                    {metrics.isOverloaded && <span className="quarter-overload-dot" title="Quá tải" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="quarter-view-container" aria-label={`Tổng quan Quý ${currentQuarter} năm ${currentYear}`}>
      {/* Quarter View Header Navigation */}
      <div className="quarter-view-header">
        <div className="quarter-nav-controls">
          <button
            type="button"
            className="quarter-nav-btn"
            onClick={() => onNavigateQuarter(-1)}
            aria-label="Quý trước"
          >
            Quý trước
          </button>
          <h2 className="quarter-view-title">
            Quý {currentQuarter} - {currentYear}
          </h2>
          <button
            type="button"
            className="quarter-nav-btn"
            onClick={() => onNavigateQuarter(1)}
            aria-label="Quý sau"
          >
            Quý sau
          </button>
        </div>

        {/* Legend */}
        <div className="quarter-view-legend">
          <span className="legend-label">Khối lượng:</span>
          <div className="legend-swatch-group">
            <span className="legend-swatch heatmap-none" title="0h" />
            <span className="legend-text">0h</span>
            <span className="legend-swatch heatmap-light" title="1–2h" />
            <span className="legend-text">1–2h</span>
            <span className="legend-swatch heatmap-moderate" title="2–4h" />
            <span className="legend-text">2–4h</span>
            <span className="legend-swatch heatmap-high" title="4–6h" />
            <span className="legend-text">4–6h</span>
            <span className="legend-swatch heatmap-overload" title="Quá tải" />
            <span className="legend-text overload-label">Quá tải (&gt;{Math.round(dailyCapacityMinutes / 60)}h)</span>
          </div>
        </div>
      </div>

      {/* Main 3 Months Grid */}
      <div className="quarter-months-row">
        {quarterMonths.map((mIdx) => renderMonth(mIdx))}
      </div>

      {/* Weekly Scanning Section */}
      <div className="quarter-weekly-scanning-section">
        <div className="quarter-weekly-header">
          <span className="section-badge-pill">THEO DÕI HÀNG TUẦN</span>
          <h4>Tiến độ và Khối lượng học tập theo tuần</h4>
        </div>
        <div className="quarter-weekly-cards-scroll">
          {weeklySummaries.map((wk, idx) => {
            const label = `Tuần từ ${formatDate(wk.startDate, timeZone, {
              month: 'numeric',
              day: 'numeric',
            })}`;
            return (
              <div
                key={idx}
                className={`quarter-week-summary-card ${wk.isOverloaded ? 'overloaded' : ''}`}
                onClick={() => onSelectDate(wk.startDate)}
                role="button"
                tabIndex={0}
                aria-label={`${label}: ${formatDuration(wk.plannedMinutes)} đã xếp`}
              >
                <div className="week-card-header">
                  <strong>{label}</strong>
                  {wk.isOverloaded && <span className="week-overload-tag">Nặng</span>}
                </div>
                <div className="week-card-stats">
                  <span>
                    <b>{formatDuration(wk.plannedMinutes)}</b> đã xếp
                  </span>
                  <span>·</span>
                  <span>{wk.eventCount} buổi học</span>
                  {wk.deadlineCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="week-deadline-count">{wk.deadlineCount} hạn chót</span>
                    </>
                  )}
                  {wk.highPriorityTaskCount > 0 && (
                    <span className="week-priority-count">
                      [Ưu tiên cao: {wk.highPriorityTaskCount}]
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
