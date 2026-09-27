import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight,
} from 'lucide-react';
import type { SmartInsight } from '../types/dashboard';

interface SmartInsightBannerProps {
  insights: SmartInsight[];
}

export function SmartInsightBanner({ insights }: SmartInsightBannerProps) {
  const navigate = useNavigate();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeInsights = insights.filter((ins) => !dismissedIds.has(ins.id));
  if (activeInsights.length === 0) return null;

  const validIndex = currentIndex % activeInsights.length;
  const currentInsight = activeInsights[validIndex];

  const handleDismiss = () => {
    setDismissedIds((prev) => new Set(prev).add(currentInsight.id));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeInsights.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeInsights.length) % activeInsights.length);
  };

  const getThemeDetails = () => {
    switch (currentInsight.type) {
      case 'urgency':
        return {
          icon: <Clock size={16} className="insight-type-icon" />,
          badgeText: 'DEADLINE GẦN KỀ',
          themeClass: 'theme-urgent',
        };
      case 'overload':
        return {
          icon: <AlertTriangle size={16} className="insight-type-icon" />,
          badgeText: 'CẢNH BÁO QUÁ TẢI',
          themeClass: 'theme-overload',
        };
      case 'opportunity':
        return {
          icon: <Sparkles size={16} className="insight-type-icon" />,
          badgeText: 'GỢI Ý TẬP TRUNG',
          themeClass: 'theme-opportunity',
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={16} className="insight-type-icon" />,
          badgeText: 'LỊCH HỌC CÂN BẰNG',
          themeClass: 'theme-success',
        };
      default:
        return {
          icon: <Sparkles size={16} className="insight-type-icon" />,
          badgeText: 'GỢI Ý TỪ AI',
          themeClass: 'theme-opportunity',
        };
    }
  };

  const details = getThemeDetails();

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={currentInsight.id}
        className={`smart-focus-vertical-card ${details.themeClass}`}
        role="region"
        aria-label="Gợi ý tập trung"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="focus-card-top">
          <div className="focus-badge-pill">
            <Sparkles size={12} className="sparkle-purple-icon" />
            <span className="focus-badge-text">GỢI Ý TẬP TRUNG</span>
          </div>

          <div className="focus-top-right">
            {activeInsights.length > 1 && (
              <div className="focus-steppers">
                <button
                  type="button"
                  className="focus-step-btn"
                  onClick={handlePrev}
                  title="Gợi ý trước"
                  aria-label="Gợi ý trước"
                >
                  <ChevronLeft size={12} />
                </button>
                <span className="focus-counter-pill">
                  {validIndex + 1}/{activeInsights.length}
                </span>
                <button
                  type="button"
                  className="focus-step-btn"
                  onClick={handleNext}
                  title="Gợi ý tiếp theo"
                  aria-label="Gợi ý tiếp theo"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
            <button
              type="button"
              className="focus-dismiss-btn"
              onClick={handleDismiss}
              title="Bỏ qua gợi ý này"
              aria-label="Đóng gợi ý"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="focus-card-body">
          <strong className="focus-headline">{currentInsight.title}</strong>
          <p className="focus-explanation">{currentInsight.description}</p>
        </div>

        <div className="focus-card-footer">
          <button
            type="button"
            className="focus-action-btn-purple interactive-purple-btn"
            onClick={() => navigate(currentInsight.actionRoute || '/scheduling')}
          >
            <span>{currentInsight.actionLabel || 'Schedule Session'}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
