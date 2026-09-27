import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import type { KpiMetric } from '../types/dashboard';

interface KpiMetricsRowProps {
  metrics: KpiMetric[];
  onSelectMetric?: (metric: KpiMetric) => void;
}

export function KpiMetricsRow({ metrics, onSelectMetric }: KpiMetricsRowProps) {
  const getCardTheme = (index: number, label: string) => {
    if (label.toLowerCase().includes('planned') || index === 0) {
      return {
        categoryBadge: 'MỤC TIÊU TUẦN',
        gradientClass: 'gradient-orange',
        icon: <Clock size={18} className="kpi-icon-accent" />,
        progressPct: 68,
        strokeColor: '#f27024',
      };
    }
    if (label.toLowerCase().includes('capacity') || index === 1) {
      return {
        categoryBadge: 'CÔNG SUẤT KHẢ DỤNG',
        gradientClass: 'gradient-blue',
        icon: <Activity size={18} className="kpi-icon-accent" />,
        progressPct: 85,
        strokeColor: '#00d4ff',
      };
    }
    if (label.toLowerCase().includes('deadline') || index === 2) {
      return {
        categoryBadge: 'HẠN CHÓT CẦN LÀM',
        gradientClass: 'gradient-pink',
        icon: <AlertTriangle size={18} className="kpi-icon-accent" />,
        progressPct: 40,
        strokeColor: '#f43f5e',
      };
    }
    return {
      categoryBadge: 'ĐỘ CÂN BẰNG LỊCH',
      gradientClass: 'gradient-green',
      icon: <ShieldCheck size={18} className="kpi-icon-accent" />,
      progressPct: 92,
      strokeColor: '#10b981',
    };
  };

  return (
    <div className="bento-kpi-matrix" role="region" aria-label="Thống kê học tập trọng điểm (Ma trận 2x2)">
      {metrics.map((m, idx) => {
        const theme = getCardTheme(idx, m.label);

        // Circular progress ring calculations
        const radius = 15;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (theme.progressPct / 100) * circumference;

        return (
          <motion.div
            className={`bento-kpi-card ${theme.gradientClass} interactive-kpi`}
            key={m.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onSelectMetric?.(m)}
            role="button"
            tabIndex={0}
            title={`Xem chi tiết ${m.label}`}
            whileHover={{ y: -2, scale: 1.02 }}
          >
            <div className="bento-kpi-content">
              <div className="bento-kpi-left">
                <div className="bento-kpi-header-row">
                  <div className="bento-kpi-category">
                    {theme.icon}
                    <span className="bento-category-badge">{theme.categoryBadge}</span>
                  </div>
                  {m.badge && (
                    <span className={`bento-status-tag ${m.badge.variant}`}>
                      {m.badge.text}
                    </span>
                  )}
                </div>

                <div className="bento-kpi-value-row">
                  <span className="bento-giant-number">{m.value}</span>
                  <span className="bento-hint-text">{m.subtext}</span>
                </div>
              </div>

              {/* Progress Gauge Mini Ring with Data Reveal Animation */}
              <div className="bento-gauge-wrap" title={`Tiến độ ước tính: ${theme.progressPct}%`}>
                <svg width="38" height="38" className="kpi-progress-ring">
                  <circle
                    cx="19"
                    cy="19"
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="3.2"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="19"
                    cy="19"
                    r={radius}
                    stroke={theme.strokeColor}
                    strokeWidth="3.2"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.2, delay: 0.25 + idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
                <span className="bento-gauge-pct">{theme.progressPct}%</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
