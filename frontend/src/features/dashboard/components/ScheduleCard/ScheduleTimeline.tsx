import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScheduleEventItem } from './ScheduleEventItem';
import { ScheduleGapSuggestion } from './ScheduleGapSuggestion';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import type { EventItem, Category } from '../../../../types/domain';
import type { FreeTimeGap } from '../../types/dashboard';

interface ScheduleTimelineProps {
  events: EventItem[];
  categories: Category[];
  gaps: FreeTimeGap[];
  isToday: boolean;
  onSelectEvent?: (event: EventItem) => void;
}

export function ScheduleTimeline({
  events,
  categories,
  gaps,
  isToday,
  onSelectEvent,
}: ScheduleTimelineProps) {
  const navigate = useNavigate();

  if (events.length === 0) {
    return (
      <div className="empty-state timeline-empty-state">
        <div className="empty-tag-pill">THỜI GIAN THẢNH THƠI</div>
        <strong className="empty-title">Lịch trình hôm nay hoàn toàn trống</strong>
        <p className="empty-subtitle">
          Chưa có tiết học cố định hay buổi tự học nào được xếp cho ngày này.
        </p>
        <div className="empty-actions">
          <button
            type="button"
            className="empty-btn-glass"
            onClick={() => navigate('/calendar')}
          >
            Thêm sự kiện
          </button>
          <button
            type="button"
            className="empty-btn-gradient"
            onClick={() => navigate('/scheduling')}
          >
            Tạo kế hoạch tự động
          </button>
        </div>
      </div>
    );
  }

  const getCategory = (catId?: string | null) => {
    if (!catId) return undefined;
    return categories.find((c) => c.id === catId);
  };

  return (
    <div className="schedule-timeline-container" role="feed" aria-label="Dòng thời gian sự kiện">
      {isToday && <CurrentTimeIndicator />}

      <div className="timeline-items-flow">
        {events.map((event, index) => {
          const cat = getCategory(event.categoryId);
          return (
            <React.Fragment key={event.id}>
              <ScheduleEventItem
                event={event}
                category={cat}
                onClick={() => onSelectEvent ? onSelectEvent(event) : navigate('/calendar')}
              />

              {gaps.length > 0 && index === 0 && (
                <ScheduleGapSuggestion gap={gaps[0]} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
