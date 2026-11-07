import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, CheckCircle2, Target, ChevronRight, Clock, Sparkles, Cpu, Flame } from 'lucide-react';

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
  const summary = kpiSummary || {
    remainingHours: '11h',
    dailyAvgHours: '/ 08:00 – 19:00',
    studyProgressPct: 100,
    urgentDeadlineCount: 1,
    deadlineBadgeText: 'Trong 48h',
    deadlineProgressPct: 80,
    completedHours: '2h',
    totalTargetHours: 'tổng 4h',
    completedPct: 50,
    weeklyGoalPct: 98,
    remainingDays: 2,
  };

  const displayHours = summary.remainingHours === '0h' ? '11h' : summary.remainingHours;
  const displayHoursSub = summary.remainingHours === '0h' ? 'Trống 08:00 – 19:00 Atrium' : summary.dailyAvgHours;

  return (
    <div className="mock-kpi-row" role="region" aria-label="Thống kê học tập trọng điểm">
      {/* 1. Thời gian học & Tự do */}
      <motion.div
        className="mock-kpi-card kpi-card-blue"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        onClick={() => onSelectMetric?.('remaining-time')}
        style={{ cursor: 'pointer', borderRadius: 16 }}
      >
        <div className="mock-kpi-top-row">
          <div className="mock-kpi-icon-wrap icon-blue">
            <Clock size={18} />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(37, 99, 235, 0.1)',
              color: '#2563eb',
            }}
          >
            Tự do 100%
          </span>
        </div>

        <div className="mock-kpi-body">
          <span className="mock-kpi-title">Thời gian học &amp; Tự do</span>
          <div className="mock-kpi-val-row">
            <span className="mock-kpi-giant-num">{displayHours}</span>
            <span className="mock-kpi-subtext">{displayHoursSub}</span>
          </div>
        </div>

        <div className="mock-kpi-footer-row">
          <span className="mock-kpi-detail-link">
            <span>Chi tiết khoảng trống</span>
            <ChevronRight size={13} className="detail-chevron" />
          </span>
        </div>
      </motion.div>

      {/* 2. Hạn chót & Bài tập */}
      <motion.div
        className="mock-kpi-card kpi-card-red"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.14 }}
        onClick={() => onSelectMetric?.('deadlines')}
        style={{ cursor: 'pointer', borderRadius: 16 }}
      >
        <div className="mock-kpi-top-row">
          <div className="mock-kpi-icon-wrap icon-amber" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
            <AlertTriangle size={18} />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
            }}
          >
            Trong 48h
          </span>
        </div>

        <div className="mock-kpi-body">
          <span className="mock-kpi-title">Hạn chót cần làm</span>
          <div className="mock-kpi-val-row">
            <span className="mock-kpi-giant-num" style={{ color: '#d97706' }}>
              {summary.urgentDeadlineCount || 1} <span style={{ fontSize: 16, fontWeight: 600 }}>bài</span>
            </span>
            <span className="mock-kpi-subtext">Machine Learning Lab 3</span>
          </div>
        </div>

        <div className="mock-kpi-footer-row">
          <span className="mock-kpi-detail-link">
            <span>Xem hạn nộp</span>
            <ChevronRight size={13} className="detail-chevron" />
          </span>
        </div>
      </motion.div>

      {/* 3. Công việc đã hoàn thành */}
      <motion.div
        className="mock-kpi-card kpi-card-green"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}
        onClick={() => onSelectMetric?.('completed-tasks')}
        style={{ cursor: 'pointer', borderRadius: 16 }}
      >
        <div className="mock-kpi-top-row">
          <div className="mock-kpi-icon-wrap icon-green">
            <CheckCircle2 size={18} />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Flame size={12} color="#f97316" />
            5 ngày
          </span>
        </div>

        <div className="mock-kpi-body">
          <span className="mock-kpi-title">Thời lượng hoàn thành</span>
          <div className="mock-kpi-val-row">
            <span className="mock-kpi-giant-num" style={{ color: '#059669' }}>
              {summary.completedHours === '0h' ? '2h' : summary.completedHours}
            </span>
            <span className="mock-kpi-subtext">/ tổng 4h tuần này</span>
          </div>
        </div>

        <div className="mock-kpi-footer-row">
          <span className="mock-kpi-detail-link">
            <span>Đạt 50% chỉ tiêu</span>
            <ChevronRight size={13} className="detail-chevron" />
          </span>
        </div>
      </motion.div>

      {/* 4. Chỉ số Tối ưu OR-Tools CP-SAT */}
      <motion.div
        className="mock-kpi-card kpi-card-orange"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.22 }}
        onClick={() => onSelectMetric?.('weekly-goal')}
        style={{ cursor: 'pointer', borderRadius: 16 }}
      >
        <div className="mock-kpi-top-row">
          <div className="mock-kpi-icon-wrap icon-orange" style={{ background: 'rgba(249, 115, 22, 0.12)', color: '#ea580c' }}>
            <Cpu size={18} />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(249, 115, 22, 0.12)',
              color: '#ea580c',
            }}
          >
            Tối ưu cao
          </span>
        </div>

        <div className="mock-kpi-body">
          <span className="mock-kpi-title">Điểm cân bằng lịch học</span>
          <div className="mock-kpi-val-row">
            <span className="mock-kpi-giant-num" style={{ color: '#ea580c' }}>
              98%
            </span>
            <span className="mock-kpi-subtext">0 xung đột · Di chuyển 0m</span>
          </div>
        </div>

        <div className="mock-kpi-footer-row">
          <span className="mock-kpi-detail-link">
            <span>Đánh giá CP-SAT</span>
            <ChevronRight size={13} className="detail-chevron" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}
