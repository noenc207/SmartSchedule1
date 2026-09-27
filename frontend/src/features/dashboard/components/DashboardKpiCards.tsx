import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, Check, Target, ChevronRight } from 'lucide-react';

interface KpiCardsProps {
  onSelectMetric?: (metricId: string) => void;
  kpiSummary?: {
    remainingHours: string;
    dailyAvgHours: string;
    studyProgressPct: number;
    urgentDeadlineCount: number;
    deadlineBadgeText: string;
    deadlineProgressPct: number;
    completedHours: string;
    totalTargetHours: string;
    completedPct: number;
    weeklyGoalPct: number;
    remainingDays: number;
  };
}

export function DashboardKpiCards({ onSelectMetric, kpiSummary }: KpiCardsProps) {
  // SVG Ring calculation helper
  const radius = 17;
  const circumference = 2 * Math.PI * radius;

  const summary = kpiSummary || {
    remainingHours: '0h',
    dailyAvgHours: '/ 0h/ngày có lịch',
    studyProgressPct: 0,
    urgentDeadlineCount: 0,
    deadlineBadgeText: 'Hoàn thành',
    deadlineProgressPct: 100,
    completedHours: '0h',
    totalTargetHours: 'tổng 0h',
    completedPct: 100,
    weeklyGoalPct: 100,
    remainingDays: 0,
  };

  const studyRatio = Math.min(1, Math.max(0, summary.studyProgressPct / 100));
  const completeRatio = Math.min(1, Math.max(0, summary.completedPct / 100));

  return (
    <div className="mock-kpi-row" role="region" aria-label="Thống kê học tập trọng điểm">
      {/* 1. Thời gian học còn lại */}
      <motion.div
        className="mock-kpi-card kpi-card-blue"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        onClick={() => onSelectMetric?.('remaining-time')}
      >
        <div className="mock-kpi-header">
          <div className="mock-kpi-icon-wrap icon-blue">
            <Calendar size={18} />
          </div>
          <div className="mock-kpi-title-col">
            <span className="mock-kpi-title">Thời gian học còn lại</span>
            <div className="mock-kpi-val-row">
              <span className="mock-kpi-giant-num">{summary.remainingHours}</span>
              <span className="mock-kpi-subtext">{summary.dailyAvgHours}</span>
            </div>
          </div>
          <div className="mock-kpi-ring-wrap" title={`Tiến độ học: ${summary.studyProgressPct}%`}>
            <svg width="46" height="46" className="mock-kpi-ring-svg">
              <circle
                cx="23"
                cy="23"
                r={radius}
                stroke="rgba(255, 255, 255, 0.9)"
                strokeWidth="3.5"
                fill="transparent"
              />
              <motion.circle
                cx="23"
                cy="23"
                r={radius}
                stroke="#2563eb"
                strokeWidth="3.5"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - studyRatio) }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <span className="mock-ring-pct-text text-blue">{summary.studyProgressPct}%</span>
          </div>
        </div>
        <div className="mock-kpi-footer-row">
          <button
            type="button"
            className="mock-kpi-detail-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMetric?.('remaining-time');
            }}
            title="Xem chi tiết thời gian học còn lại"
          >
            <span>Chi tiết</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </motion.div>

      {/* 2. Hạn chót cần làm */}
      <motion.div
        className="mock-kpi-card kpi-card-red"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        onClick={() => onSelectMetric?.('deadlines')}
      >
        <div className="mock-kpi-header">
          <div className="mock-kpi-icon-wrap icon-red">
            <AlertTriangle size={18} />
          </div>
          <div className="mock-kpi-title-col">
            <div className="mock-kpi-title-row">
              <span className="mock-kpi-title">Hạn chót cần làm</span>
              <span className={`mock-status-pill ${summary.deadlineBadgeText === 'Khẩn cấp' ? 'pill-red' : 'pill-green'}`}>
                {summary.deadlineBadgeText}
              </span>
            </div>
            <div className="mock-kpi-val-row">
              <span className="mock-kpi-giant-num text-red">{summary.urgentDeadlineCount}</span>
              <span className="mock-kpi-subtext">công việc tuần này</span>
            </div>
          </div>
        </div>
        <div className="mock-kpi-bar-footer">
          <div className="mock-h-bar-track">
            <motion.div
              className="mock-h-bar-fill fill-red"
              initial={{ width: 0 }}
              animate={{ width: `${summary.deadlineProgressPct}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="mock-bar-pct-text text-red">{summary.deadlineProgressPct}%</span>
        </div>
        <div className="mock-kpi-footer-row">
          <button
            type="button"
            className="mock-kpi-detail-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMetric?.('deadlines');
            }}
            title="Xem chi tiết hạn chót cần làm"
          >
            <span>Chi tiết</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </motion.div>

      {/* 3. Công việc đã hoàn thành */}
      <motion.div
        className="mock-kpi-card kpi-card-green"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        onClick={() => onSelectMetric?.('completed-tasks')}
      >
        <div className="mock-kpi-header">
          <div className="mock-kpi-icon-wrap icon-green">
            <Check size={18} />
          </div>
          <div className="mock-kpi-title-col">
            <span className="mock-kpi-title">Công việc đã hoàn thành</span>
            <div className="mock-kpi-val-row">
              <span className="mock-kpi-giant-num">{summary.completedHours}</span>
              <span className="mock-kpi-subtext">/ {summary.totalTargetHours}</span>
            </div>
          </div>
          <div className="mock-kpi-ring-wrap" title={`Hoàn thành: ${summary.completedPct}%`}>
            <svg width="46" height="46" className="mock-kpi-ring-svg">
              <circle
                cx="23"
                cy="23"
                r={radius}
                stroke="rgba(255, 255, 255, 0.9)"
                strokeWidth="3.5"
                fill="transparent"
              />
              <motion.circle
                cx="23"
                cy="23"
                r={radius}
                stroke="#10b981"
                strokeWidth="3.5"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - completeRatio) }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.25 }}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <span className="mock-ring-pct-text text-green">{summary.completedPct}%</span>
          </div>
        </div>
        <div className="mock-kpi-footer-row">
          <button
            type="button"
            className="mock-kpi-detail-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMetric?.('completed-tasks');
            }}
            title="Xem chi tiết công việc đã hoàn thành"
          >
            <span>Chi tiết</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </motion.div>

      {/* 4. Mục tiêu tuần */}
      <motion.div
        className="mock-kpi-card kpi-card-orange"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        onClick={() => onSelectMetric?.('weekly-goal')}
      >
        <div className="mock-kpi-header">
          <div className="mock-kpi-icon-wrap icon-orange">
            <Target size={18} />
          </div>
          <div className="mock-kpi-title-col">
            <div className="mock-kpi-title-row">
              <span className="mock-kpi-title">Mục tiêu tuần</span>
              <span className="mock-status-pill pill-orange">Còn {summary.remainingDays} ngày</span>
            </div>
            <div className="mock-kpi-val-row">
              <span className="mock-kpi-giant-num text-orange">{summary.weeklyGoalPct}%</span>
              <span className="mock-kpi-subtext">hoàn thành</span>
            </div>
          </div>
        </div>
        <div className="mock-kpi-bar-footer">
          <div className="mock-h-bar-track">
            <motion.div
              className="mock-h-bar-fill fill-orange"
              initial={{ width: 0 }}
              animate={{ width: `${summary.weeklyGoalPct}%` }}
              transition={{ duration: 1, delay: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className="mock-kpi-footer-row">
          <button
            type="button"
            className="mock-kpi-detail-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMetric?.('weekly-goal');
            }}
            title="Xem chi tiết mục tiêu tuần"
          >
            <span>Chi tiết</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
