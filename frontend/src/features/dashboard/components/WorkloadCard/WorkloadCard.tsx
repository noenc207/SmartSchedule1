import React from 'react';
import { motion } from 'framer-motion';
import { BarChart2, CheckCircle2, Coffee, AlertTriangle, TrendingUp } from 'lucide-react';
import { WorkloadChart } from './WorkloadChart';
import { ChartLegend } from './ChartLegend';
import { formatWorkloadHours } from '../../utils/chartCalculations';
import type { DayWorkloadMetric, ChartYAxisConfig } from '../../types/dashboard';

interface WorkloadCardProps {
  metrics: DayWorkloadMetric[];
  yAxisConfig: ChartYAxisConfig;
  selectedDate?: Date;
  onSelectDay?: (date: Date) => void;
}

export function WorkloadCard({
  metrics,
  yAxisConfig,
  selectedDate,
  onSelectDay,
}: WorkloadCardProps) {
  const totalPlannedMinutes = metrics.reduce((sum, m) => sum + m.totalWorkloadMinutes, 0);
  const totalCapacityMinutes = metrics.reduce((sum, m) => sum + m.capacityMinutes, 0);
  const fixedTotalMinutes = metrics.reduce((sum, m) => sum + m.fixedMinutes, 0);
  const plannedTotalMinutes = metrics.reduce((sum, m) => sum + m.plannedMinutes, 0);

  const capacityPct = Math.round(
    (totalPlannedMinutes / Math.max(1, totalCapacityMinutes)) * 100
  );

  const activeDays = metrics.filter((m) => m.totalWorkloadMinutes > 0);
  const avgMinutesPerActiveDay = activeDays.length > 0
    ? Math.round(totalPlannedMinutes / activeDays.length)
    : 0;

  // Health assessment tag
  const getStatusConfig = () => {
    if (capacityPct > 85) {
      return {
        icon: <AlertTriangle size={13} />,
        label: 'Cảnh báo khối lượng cao',
        className: 'workload-status-badge warning',
      };
    }
    if (capacityPct >= 45) {
      return {
        icon: <CheckCircle2 size={13} />,
        label: 'Cân bằng học tập tối ưu',
        className: 'workload-status-badge optimal',
      };
    }
    return {
      icon: <Coffee size={13} />,
      label: 'Thư thả · Đủ thời gian tự học',
      className: 'workload-status-badge relaxed',
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <motion.section
      className="gradient-panel workload-analytics-card"
      aria-labelledby="workload-card-title"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="panel-card-header">
        <div className="card-header-left">
          <div className="card-pill-tag">
            <BarChart2 size={13} className="pill-icon" />
            <span>Biểu đồ tuần</span>
            <span className="dot-divider">·</span>
            <span className="capacity-stat-pill">{capacityPct}% công suất tuần</span>
            <span className="dot-divider">·</span>
            <span className={statusConfig.className}>
              {statusConfig.icon}
              <span>{statusConfig.label}</span>
            </span>
          </div>
          <h2 id="workload-card-title" className="card-header-heading">
            Phân bổ thời gian học tập
          </h2>
        </div>

        <div className="card-header-right">
          <div className="workload-summary-bubble">
            <div className="bubble-stat-primary">
              <span className="bubble-number">{formatWorkloadHours(totalPlannedMinutes)}</span>
              <span className="bubble-label">/ {formatWorkloadHours(totalCapacityMinutes)} tối đa</span>
            </div>
            {avgMinutesPerActiveDay > 0 && (
              <span className="bubble-subtext">
                TB ~{formatWorkloadHours(avgMinutesPerActiveDay)}/ngày có lịch
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="workload-card-body">
        <WorkloadChart
          metrics={metrics}
          yAxisConfig={yAxisConfig}
          selectedDate={selectedDate}
          onSelectDay={onSelectDay}
        />

        <ChartLegend
          fixedHours={formatWorkloadHours(fixedTotalMinutes)}
          plannedHours={formatWorkloadHours(plannedTotalMinutes)}
          avgCapacityHours={formatWorkloadHours(
            Math.round(totalCapacityMinutes / Math.max(1, metrics.length))
          )}
        />
      </div>
    </motion.section>
  );
}
