import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChartAxis } from './ChartAxis';
import { ChartTooltip } from './ChartTooltip';
import { formatWorkloadHours } from '../../utils/chartCalculations';
import type { DayWorkloadMetric, ChartYAxisConfig } from '../../types/dashboard';

interface WorkloadChartProps {
  metrics: DayWorkloadMetric[];
  yAxisConfig: ChartYAxisConfig;
  selectedDate?: Date;
  onSelectDay?: (date: Date) => void;
}

export function WorkloadChart({
  metrics,
  yAxisConfig,
  selectedDate,
  onSelectDay,
}: WorkloadChartProps) {
  const [hoveredDay, setHoveredDay] = useState<DayWorkloadMetric | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateTooltipPosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;

    // Constrain tooltip horizontally so it stays nicely visible inside chart
    const clampedX = Math.max(110, Math.min(rect.width - 110, rawX));
    const clampedY = Math.max(30, rawY - 14);

    return { x: clampedX, y: clampedY };
  };

  const handleMouseEnter = (metric: DayWorkloadMetric, e: React.MouseEvent) => {
    setHoveredDay(metric);
    setTooltipPos(calculateTooltipPosition(e.clientX, e.clientY));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hoveredDay) return;
    setTooltipPos(calculateTooltipPosition(e.clientX, e.clientY));
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  const maxMinutes = Math.max(1, yAxisConfig.maxMinutes);

  return (
    <div
      ref={containerRef}
      className="workload-chart-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="region"
      aria-label="Biểu đồ phân bổ tải học tập theo tuần"
    >
      {/* Background Y-Axis & Dashed Gridlines */}
      <ChartAxis config={yAxisConfig} />

      {/* 7 Interactive Day Columns */}
      <div className="chart-columns-track">
        {metrics.map((m, idx) => {
          const isSelected = Boolean(
            selectedDate && m.date.toDateString() === selectedDate.toDateString()
          );

          const fixedHeightPct = Math.min(100, (m.fixedMinutes / maxMinutes) * 100);
          const plannedHeightPct = Math.min(
            Math.max(0, 100 - fixedHeightPct),
            (m.plannedMinutes / maxMinutes) * 100
          );
          const capacityHeightPct = Math.min(100, (m.capacityMinutes / maxMinutes) * 100);

          const totalHoursStr = formatWorkloadHours(m.totalWorkloadMinutes);
          const ariaLabel = `${m.fullDayLabel}: ${totalHoursStr} tổng cộng (${formatWorkloadHours(
            m.fixedMinutes
          )} tiết lớp, ${formatWorkloadHours(m.plannedMinutes)} tự học) trên ${formatWorkloadHours(
            m.capacityMinutes
          )} hạn mức`;

          return (
            <motion.div
              key={m.dateKey}
              className={`chart-day-column ${m.isToday ? 'is-today' : ''} ${
                isSelected ? 'is-selected' : ''
              } ${m.isOverloaded ? 'is-overloaded' : ''}`}
              onClick={() => onSelectDay?.(m.date)}
              onMouseEnter={(e) => handleMouseEnter(m, e)}
              onFocus={(e) => {
                const target = e.currentTarget;
                const rect = target.getBoundingClientRect();
                const parentRect = containerRef.current?.getBoundingClientRect() || rect;
                setHoveredDay(m);
                setTooltipPos({
                  x: rect.left - parentRect.left + rect.width / 2,
                  y: rect.top - parentRect.top,
                });
              }}
              onBlur={() => setHoveredDay(null)}
              tabIndex={0}
              role="button"
              aria-label={ariaLabel}
              whileHover={{ y: -4, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Pillar Slot Track */}
              <div className="column-bar-slot">
                {/* Available Capacity Zone / Rail */}
                <div
                  className="capacity-rail-fill"
                  style={{ height: `${capacityHeightPct}%` }}
                  title={`Hạn mức an toàn: ${formatWorkloadHours(m.capacityMinutes)}`}
                />

                {/* Capacity Target Line Marker */}
                <div
                  className="capacity-target-line"
                  style={{ bottom: `${capacityHeightPct}%` }}
                />

                {/* Stacked Workload Bar Container */}
                <div className="workload-bar-stack">
                  {/* Lower: Fixed Commitments (FPT Blue) */}
                  {m.fixedMinutes > 0 && (
                    <motion.div
                      className="bar-chunk fixed-chunk"
                      initial={{ height: 0 }}
                      animate={{ height: `${fixedHeightPct}%` }}
                      transition={{
                        duration: 0.65,
                        ease: [0.16, 1, 0.3, 1],
                        delay: idx * 0.04,
                      }}
                    />
                  )}

                  {/* Upper: Planned Study Sessions (FPT Orange) */}
                  {m.plannedMinutes > 0 && (
                    <motion.div
                      className="bar-chunk planned-chunk"
                      initial={{ height: 0 }}
                      animate={{ height: `${plannedHeightPct}%` }}
                      transition={{
                        duration: 0.65,
                        ease: [0.16, 1, 0.3, 1],
                        delay: idx * 0.04 + 0.08,
                      }}
                    />
                  )}
                </div>

                {/* Overload Alert Pip if over capacity */}
                {m.isOverloaded && (
                  <span className="overload-warning-pip" title="Vượt quá công suất ngày!">
                    !
                  </span>
                )}
              </div>

              {/* Day Label & Total Hours */}
              <div className="column-footer-label">
                <div className="day-name-row">
                  <span className={`day-name ${m.isToday ? 'active-today' : ''}`}>
                    {m.dayLabel}
                  </span>
                  {m.isToday && <span className="today-dot" title="Hôm nay" />}
                </div>
                <span className={`day-total-hours ${m.totalWorkloadMinutes > 0 ? 'has-hours' : 'empty-hours'}`}>
                  {totalHoursStr}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Tooltip HUD */}
      {hoveredDay && (
        <ChartTooltip metric={hoveredDay} position={tooltipPos} />
      )}
    </div>
  );
}
