import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, Coffee, Sparkles } from 'lucide-react';
import { formatWorkloadHours } from '../../utils/chartCalculations';
import type { DayWorkloadMetric } from '../../types/dashboard';

interface ChartTooltipProps {
  metric: DayWorkloadMetric;
  position: { x: number; y: number };
}

export function ChartTooltip({ metric, position }: ChartTooltipProps) {
  const overMinutes = Math.max(0, metric.totalWorkloadMinutes - metric.capacityMinutes);
  const percent = Math.round(
    (metric.totalWorkloadMinutes / Math.max(1, metric.capacityMinutes)) * 100
  );

  return (
    <div
      className="chart-floating-tooltip"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      role="tooltip"
    >
      <div className="tooltip-header">
        <div className="tooltip-header-title">
          <strong>{metric.fullDayLabel}</strong>
          <span className="tooltip-date">
            {metric.date.toLocaleDateString('vi-VN', {
              day: 'numeric',
              month: 'numeric',
            })}
          </span>
        </div>
        {metric.isOverloaded ? (
          <span className="tooltip-status-badge warning">
            <AlertTriangle size={11} />
            <span>Quá tải</span>
          </span>
        ) : percent >= 50 ? (
          <span className="tooltip-status-badge optimal">
            <Sparkles size={11} />
            <span>Tối ưu</span>
          </span>
        ) : (
          <span className="tooltip-status-badge relaxed">
            <Coffee size={11} />
            <span>Thư thả</span>
          </span>
        )}
      </div>

      <div className="tooltip-divider" />

      <div className="tooltip-metric-rows">
        <div className="tooltip-row">
          <div className="row-left">
            <span className="tooltip-bullet fixed" />
            <span>Tiết cố định lớp:</span>
          </div>
          <strong>{formatWorkloadHours(metric.fixedMinutes)}</strong>
        </div>

        <div className="tooltip-row">
          <div className="row-left">
            <span className="tooltip-bullet planned" />
            <span>Buổi tự học:</span>
          </div>
          <strong>{formatWorkloadHours(metric.plannedMinutes)}</strong>
        </div>

        <div className="tooltip-row total-row">
          <div className="row-left">
            <Clock size={12} className="total-clock-icon" />
            <span>Tổng thời gian:</span>
          </div>
          <strong className="total-value">
            {formatWorkloadHours(metric.totalWorkloadMinutes)}
          </strong>
        </div>

        <div className="tooltip-row capacity-row">
          <span className="muted">Hạn mức an toàn:</span>
          <span className="muted-value">
            {formatWorkloadHours(metric.capacityMinutes)} ({percent}%)
          </span>
        </div>
      </div>

      {metric.isOverloaded ? (
        <div className="tooltip-alert warning">
          <AlertTriangle size={12} />
          <span>Vượt quá hạn mức {formatWorkloadHours(overMinutes)}</span>
        </div>
      ) : (
        <div className="tooltip-footer-hint">
          <span>Nhấp để xem lịch học ngày này</span>
          <span className="arrow-hint">→</span>
        </div>
      )}
    </div>
  );
}
