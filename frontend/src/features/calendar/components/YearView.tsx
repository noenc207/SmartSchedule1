import React, { useState } from 'react';
import type { EventItem, Task } from '../../../types/domain';
import { DEFAULT_TIMEZONE, formatDate, formatDuration, isSameDay } from '../../../utils/dateTime';
import { getDailyMetrics, type DailyMetrics } from '../utils/longRangeMetrics';

interface YearViewProps {
  activeDate: Date;
  events: EventItem[];
  tasks: Task[];
  timeZone?: string;
  dailyCapacityMinutes?: number;
  onSelectDate: (date: Date) => void;
  onSelectMonth: (year: number, monthIndex: number) => void;
  onNavigateYear: (yearDelta: number) => void;
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

export function YearView({
  activeDate,
  events,
  tasks,
  timeZone = DEFAULT_TIMEZONE,
  dailyCapacityMinutes = 360,
  onSelectDate,
  onSelectMonth,
  onNavigateYear,
}: YearViewProps) {
  const currentYear = activeDate instanceof Date && !isNaN(activeDate.getTime()) ? activeDate.getFullYear() : new Date().getFullYear();
  const today = new Date();

  // Tooltip state for focused/hovered date
  const [hoveredDateInfo, setHoveredDateInfo] = useState<{
    date: Date;
    metrics: DailyMetrics;
    x: number;
    y: number;
  } | null>(null);

  const renderMonth = (monthIndex: number) => {
    const firstDay = new Date(currentYear, monthIndex, 1);
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    // Monday as 0, Sunday as 6
    const startDayOffset = (firstDay.getDay() + 6) % 7;

    const days = [];
    // Blank fillers before day 1
    for (let i = 0; i < startDayOffset; i++) {
      days.push(null);
    }
    // Days in month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(currentYear, monthIndex, d));
    }

    return (
      <div key={monthIndex} className="year-month-card">
        <button
          type="button"
          className="year-month-header"
          onClick={() => onSelectMonth(currentYear, monthIndex)}
          title={`Xem ${MONTH_NAMES[monthIndex]} theo tháng`}
        >
          <h4>{MONTH_NAMES[monthIndex]}</h4>
          <span className="year-month-badge">Xem tháng</span>
        </button>

        <div className="year-weekdays-row" aria-hidden="true">
          <span>T2</span>
          <span>T3</span>
          <span>T4</span>
          <span>T5</span>
          <span>T6</span>
          <span>T7</span>
          <span>CN</span>
        </div>

        <div className="year-days-grid" role="grid">
          {days.map((dayDate, idx) => {
            if (!dayDate) {
              return <div key={`empty-${idx}`} className="year-day-empty" aria-hidden="true" />;
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
                className={`year-day-cell ${intensityClass} ${isTodayDate ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectDate(dayDate)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredDateInfo({
                    date: dayDate,
                    metrics,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                  });
                }}
                onMouseLeave={() => setHoveredDateInfo(null)}
                aria-label={`${formatDate(dayDate, timeZone)}: ${hours}h`}
              >
                <span className="day-number">{dayDate.getDate()}</span>
                {metrics.deadlines > 0 && <span className="deadline-pip" title="Có hạn chót bài tập" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="year-view-container" aria-label={`Bản đồ nhiệt khối lượng học tập năm ${currentYear}`}>
      {/* Year View Header Navigation */}
      <div className="year-view-header">
        <div className="year-nav-controls">
          <button
            type="button"
            className="year-nav-btn"
            onClick={() => onNavigateYear(-1)}
            aria-label="Năm trước"
          >
            <span>Năm {currentYear - 1}</span>
          </button>
          <h2 className="year-view-title">Bản đồ nhiệt năm {currentYear}</h2>
          <button
            type="button"
            className="year-nav-btn"
            onClick={() => onNavigateYear(1)}
            aria-label="Năm sau"
          >
            <span>Năm {currentYear + 1}</span>
          </button>
        </div>

        {/* Heatmap Legend */}
        <div className="year-view-legend">
          <span className="legend-label">Khối lượng học:</span>
          <div className="legend-swatch-group">
            <span className="legend-swatch heatmap-none" title="0h" />
            <span className="legend-text">0h</span>
            <span className="legend-swatch heatmap-light" title="1–2h" />
            <span className="legend-text">1–2h</span>
            <span className="legend-swatch heatmap-moderate" title="2–4h" />
            <span className="legend-text">2–4h</span>
            <span className="legend-swatch heatmap-high" title="4–6h" />
            <span className="legend-text">4–6h</span>
            <span className="legend-swatch heatmap-overload" title=">6h (Quá tải)" />
            <span className="legend-text overload-label">Quá tải</span>
          </div>
        </div>
      </div>

      {/* 12 Months Grid */}
      <div className="year-months-grid">
        {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
      </div>

      {/* Hover/Focus Tooltip */}
      {hoveredDateInfo && (
        <div
          className="year-heatmap-tooltip"
          style={{
            left: `${hoveredDateInfo.x}px`,
            top: `${hoveredDateInfo.y}px`,
          }}
          role="tooltip"
        >
          <div className="tooltip-date-header">
            <strong>{formatDate(hoveredDateInfo.date, timeZone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
          </div>
          <div className="tooltip-body">
            <div>
              <b>{formatDuration(hoveredDateInfo.metrics.workloadMinutes)}</b> đã xếp lịch
            </div>
            <div className="tooltip-counts">
              <span>{hoveredDateInfo.metrics.eventCount} sự kiện</span>
              <span>·</span>
              <span>{hoveredDateInfo.metrics.taskCount} bài tập</span>
              {hoveredDateInfo.metrics.deadlines > 0 && (
                <>
                  <span>·</span>
                  <span className="deadline-count-tag">[Hạn chót: {hoveredDateInfo.metrics.deadlines}]</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
