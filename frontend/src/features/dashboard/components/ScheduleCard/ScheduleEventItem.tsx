import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, ChevronRight, Lock, CheckCircle2, BookOpen, Clock } from 'lucide-react';
import { formatTimeRange, getDurationMinutes } from '../../../../utils/dateTime';
import type { EventItem, Category } from '../../../../types/domain';

interface ScheduleEventItemProps {
  event: EventItem;
  category?: Category;
  onClick?: () => void;
}

export function ScheduleEventItem({ event, category, onClick }: ScheduleEventItemProps) {
  const duration = Math.max(0, getDurationMinutes(event.startsAt, event.endsAt));
  const isFixed = event.fixed || event.locked;
  const isCompleted = event.status === 'COMPLETED';

  const isLab = (event.location ?? '').toLowerCase().includes('lab') || event.title.toLowerCase().includes('lab');
  const badgeColor = event.color || category?.color || (isFixed ? '#0047ba' : '#ea580c');

  return (
    <motion.div
      className={`schedule-event-card ${isFixed ? 'is-fixed' : 'is-planned'} ${isCompleted ? 'is-completed' : ''} interactive-event`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: 0.18 }}
      aria-label={`${event.title}, ${formatTimeRange(event.startsAt, event.endsAt)}, ${duration} phút`}
      title="Click để xem phân tích chi tiết & đệm di chuyển"
    >
      <div className="event-time-column">
        <time className="event-start-time">
          {new Date(event.startsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </time>
        <span className="event-duration-tag">
          <Clock size={11} />
          <span>{duration}p</span>
        </span>
      </div>

      <div className="event-marker-rail">
        <span
          className="event-rail-dot"
          style={{ backgroundColor: badgeColor }}
        />
        <span className="event-rail-line" />
      </div>

      <div className="event-details-card">
        <div className="event-title-row">
          <strong className="event-title">{event.title}</strong>
          <div className="event-pill-group">
            {event.locked && (
              <span className="text-pill-badge locked" title="Lịch học chính khoá">
                <Lock size={10} />
                <span>Cố định</span>
              </span>
            )}
            {isLab && (
              <span className="text-pill-badge lab" title="Phòng thực hành máy tính">
                LAB AI
              </span>
            )}
            {isCompleted && (
              <span className="text-pill-badge completed" title="Đã qua giờ học">
                <CheckCircle2 size={10} />
                <span>Đã xong</span>
              </span>
            )}
          </div>
        </div>

        <div className="event-meta-row">
          {event.location ? (
            <span className="event-location-text">
              <MapPin size={12} className="meta-icon" />
              <span>{event.location}</span>
            </span>
          ) : (
            <span className="event-type-label">
              <BookOpen size={12} className="meta-icon" />
              <span>{isFixed ? 'Tiết học trên lớp' : 'Phiên tự học tập trung'}</span>
            </span>
          )}

          {category && (
            <span
              className="event-category-chip"
              style={{
                backgroundColor: `color-mix(in srgb, ${badgeColor} 12%, transparent)`,
                color: badgeColor,
                borderColor: `color-mix(in srgb, ${badgeColor} 30%, transparent)`,
              }}
            >
              {category.name}
            </span>
          )}

          <span className="event-deep-inspect-hint">
            <span>Chi tiết</span>
            <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
