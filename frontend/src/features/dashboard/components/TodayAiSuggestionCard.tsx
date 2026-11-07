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

  const rawTitle = insight?.title || 'Gợi ý học tập hôm nay';
  const title = rawTitle.includes('You have')
    ? rawTitle
        .replace('You have ', 'Bạn có ')
        .replace('m available this morning', ' phút trống vào buổi sáng')
        .replace('m available this afternoon', ' phút trống vào buổi chiều')
        .replace('m available this evening', ' phút trống vào buổi tối')
    : rawTitle.includes('is due')
    ? rawTitle.replace(' is due today', ' đến hạn hôm nay').replace(' is due tomorrow', ' đến hạn ngày mai')
    : rawTitle;

  const rawDesc =
    insight?.description ||
    'Bạn có khoảng trống lý tưởng trong ngày để tập trung hoàn thành bài tập lớn và đồ án.';
  const desc = rawDesc.includes('Open window between')
    ? 'Khoảng trống từ 08:00 – 19:00 hôm nay rất lý tưởng cho phiên tự học sâu hoàn thành đồ án.'
    : rawDesc;

  const rawAction = insight?.actionLabel || 'Xem gợi ý';
  const actionLabel =
    rawAction === 'Schedule Session'
      ? 'Xếp lịch tự học'
      : rawAction === 'Balance Schedule'
      ? 'Cân bằng lịch học'
      : rawAction === 'View Full Calendar'
      ? 'Xem toàn bộ lịch'
      : rawAction === 'Generate Smart Plan'
      ? 'Tạo kế hoạch thông minh'
      : rawAction;
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
