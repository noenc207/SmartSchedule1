import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SmartInsight } from '../types/dashboard';

interface TodayAiSuggestionCardProps {
  insight?: SmartInsight;
}

export function TodayAiSuggestionCard({ insight }: TodayAiSuggestionCardProps) {
  const navigate = useNavigate();

  const title = insight?.title || 'Gợi ý hôm nay';
  const desc =
    insight?.description ||
    'Bạn có 2 giờ trống vào buổi tối. Bạn có muốn dùng để học thêm hoặc làm dự án không?';
  const actionLabel = insight?.actionLabel || 'Xem gợi ý';
  const actionRoute = insight?.actionRoute || '/scheduling';

  return (
    <motion.div
      className="mock-card mock-ai-suggestion-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.26 }}
    >
      <div className="mock-ai-content-side">
        <div className="mock-ai-header-row">
          <strong className="mock-ai-title">{title}</strong>
          <span className="mock-beta-pill">Beta</span>
        </div>

        <p className="mock-ai-desc" style={{ whiteSpace: 'pre-line' }}>
          {desc}
        </p>

        <button
          type="button"
          className="mock-ai-suggest-btn"
          onClick={() => navigate(actionRoute)}
        >
          <span>{actionLabel}</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="mock-ai-mascot-side">
        <motion.img
          src="/banner/mascot_wave_small.png"
          alt="AI Mascot"
          className="mock-ai-mascot-img"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}
