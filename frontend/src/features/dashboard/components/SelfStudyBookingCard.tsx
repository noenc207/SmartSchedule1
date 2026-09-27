import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface SelfStudyBookingCardProps {
  studyGap?: {
    minutes: number;
    timeRange: string;
  };
}

export function SelfStudyBookingCard({ studyGap }: SelfStudyBookingCardProps) {
  const navigate = useNavigate();

  const gap = studyGap || {
    minutes: 60,
    timeRange: '08:00 - 09:00',
  };

  return (
    <motion.div
      className="mock-card mock-self-study-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
    >
      <div className="mock-study-row">
        <div className="mock-study-icon-wrap">
          <Clock size={16} />
        </div>
        <div className="mock-study-text">
          <div className="mock-study-title">Khoảng trống tự học</div>
          <div className="mock-study-meta">
            <span className="mock-avail-min">{gap.minutes} phút khả dụng</span>
            <span className="mock-avail-hours">{gap.timeRange}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="mock-primary-btn"
        onClick={() => navigate('/scheduling')}
      >
        <span>Đăng ký phòng tự học</span>
        <ArrowRight size={14} />
      </button>
    </motion.div>
  );
}
