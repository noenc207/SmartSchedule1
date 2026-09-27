import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { FreeTimeGap } from '../../types/dashboard';

interface ScheduleGapSuggestionProps {
  gap: FreeTimeGap;
}

export function ScheduleGapSuggestion({ gap }: ScheduleGapSuggestionProps) {
  const navigate = useNavigate();

  return (
    <div className="schedule-gap-card" role="region" aria-label={`Khoảng trống tự học: ${gap.timeRangeLabel}`}>
      <div className="gap-marker-rail">
        <span className="gap-rail-dot" />
        <span className="gap-rail-line" />
      </div>

      <div className="gap-content">
        <div className="gap-header">
          <div className="gap-badge">
            <span>Khoảng trống tự học · {gap.durationMinutes} phút khả dụng</span>
          </div>
          <span className="gap-time">{gap.timeRangeLabel}</span>
        </div>

        <p className="gap-suggestion-copy">
          {gap.suggestedTask ? (
            <>
              Gợi ý ôn tập: <strong>{gap.suggestedTask.title}</strong> (Mức ưu tiên: {gap.suggestedTask.priority})
            </>
          ) : (
            'Khoảng thời gian trống giữa các tiết học. Rất thích hợp để làm bài tập hoặc ôn luyện.'
          )}
        </p>

        <button
          type="button"
          className="gap-action-button"
          onClick={() => navigate('/scheduling')}
          title="Mở bộ lập lịch để xếp thời gian học"
        >
          Xếp lịch học vào khung giờ này
        </button>
      </div>
    </div>
  );
}
