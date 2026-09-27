import React from 'react';
import { Sparkles, Calendar, ChevronRight, X } from 'lucide-react';
import type { AiPlannerRecommendation } from '../../../services/scheduleApi';

interface CalendarAiPlannerBarProps {
  recommendation: AiPlannerRecommendation | null;
  loading?: boolean;
  onApply: () => void;
  onCustomize: () => void;
  onDismiss: () => void;
}

export function CalendarAiPlannerBar({
  recommendation,
  loading = false,
  onApply,
  onCustomize,
  onDismiss,
}: CalendarAiPlannerBarProps) {
  if (!recommendation) return null;

  const { freeSlot, recommendedTasks, message } = recommendation;

  return (
    <div className="calendar-ai-planner-bar" role="complementary" aria-label="Gợi ý lên lịch thông minh">
      {/* 1. Left: Brand Icon & Title */}
      <div className="ai-planner-brand-group">
        <div className="ai-planner-icon-glow">
          <Sparkles size={20} className="ai-sparkles-icon" />
        </div>
        <div className="ai-planner-titles">
          <strong className="ai-planner-main-title">AI Planner</strong>
          <span className="ai-planner-sub-title">Lên kế hoạch thông minh, học hiệu quả hơn.</span>
        </div>
      </div>

      {/* 2. Center: Proactive Recommendation Bubble */}
      <div className="ai-planner-context-bubble">
        <div className="context-bubble-header">
          <div className="bubble-cal-icon">
            <Calendar size={15} />
          </div>
          <span className="context-message-text">{message}</span>
        </div>

        {recommendedTasks && recommendedTasks.length > 0 && (
          <ul className="context-task-list">
            {recommendedTasks.map((task) => (
              <li key={task.taskId} className="context-task-item">
                <span className="task-bullet">•</span>
                <span className="context-task-name">{task.title}</span>
                <span className="context-task-duration">({task.durationFormatted})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 3. Right: Action Buttons */}
      <div className="ai-planner-actions-group">
        <button
          type="button"
          className="ai-planner-apply-btn"
          onClick={onApply}
          disabled={loading}
          title="Tự động xếp 2 bài tập này vào khung giờ trống"
        >
          {loading ? 'Đang lên lịch...' : 'Lên lịch ngay'}
        </button>

        <button
          type="button"
          className="ai-planner-customize-btn"
          onClick={onCustomize}
          title="Tùy chỉnh ràng buộc thời gian"
        >
          <span>Tùy chỉnh</span>
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          className="ai-planner-dismiss-btn"
          onClick={onDismiss}
          title="Ẩn thanh gợi ý"
          aria-label="Ẩn gợi ý"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
