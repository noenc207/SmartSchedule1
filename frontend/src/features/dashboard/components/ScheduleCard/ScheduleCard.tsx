import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, ArrowRight, Clock } from 'lucide-react';
import { ScheduleTimeline } from './ScheduleTimeline';
import { formatWorkloadHours } from '../../utils/chartCalculations';
import type { EventItem, Category } from '../../../../types/domain';
import type { FreeTimeGap } from '../../types/dashboard';

interface ScheduleCardProps {
  events: EventItem[];
  categories: Category[];
  gaps: FreeTimeGap[];
  activeDate: Date;
  onChangeDate: (newDate: Date) => void;
  onSelectEvent?: (event: EventItem) => void;
}

export function ScheduleCard({
  events,
  categories,
  gaps,
  activeDate,
  onChangeDate,
  onSelectEvent,
}: ScheduleCardProps) {
  const navigate = useNavigate();

  const isToday = activeDate.toDateString() === new Date().toDateString();

  const handlePrevDay = () => {
    const prev = new Date(activeDate);
    prev.setDate(prev.getDate() - 1);
    onChangeDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(activeDate);
    next.setDate(next.getDate() + 1);
    onChangeDate(next);
  };

  const handleJumpToday = () => {
    onChangeDate(new Date());
  };

  const formattedDayTitle = activeDate.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });

  const totalMinutes = events.reduce((sum, ev) => {
    const start = new Date(ev.startsAt).getTime();
    const end = new Date(ev.endsAt).getTime();
    return sum + Math.max(0, (end - start) / (1000 * 60));
  }, 0);

  return (
    <motion.section
      className="gradient-panel schedule-flow-card"
      aria-labelledby="schedule-card-title"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="panel-card-header">
        <div className="card-header-left">
          <div className="card-pill-tag">
            <Calendar size={13} className="pill-icon" />
            <span>{isToday ? 'Lịch hôm nay' : 'Lịch theo ngày'}</span>
            <span className="dot-divider">·</span>
            <span className="events-count-pill">{events.length} sự kiện ({formatWorkloadHours(totalMinutes)})</span>
          </div>
          <h2 id="schedule-card-title" className="card-header-heading">
            Dòng thời gian <span className="date-badge-highlight">{formattedDayTitle}</span>
          </h2>
        </div>

        <div className="card-header-right">
          <div className="stepper-text-group">
            <button
              type="button"
              className="stepper-text-btn"
              onClick={handlePrevDay}
              title="Ngày trước"
              aria-label="Ngày trước"
            >
              <ChevronLeft size={14} />
              <span>Trước</span>
            </button>
            {!isToday ? (
              <button
                type="button"
                className="jump-today-btn"
                onClick={handleJumpToday}
              >
                Về hôm nay
              </button>
            ) : (
              <span className="current-today-badge">Hôm nay</span>
            )}
            <button
              type="button"
              className="stepper-text-btn"
              onClick={handleNextDay}
              title="Ngày tiếp theo"
              aria-label="Ngày tiếp theo"
            >
              <span>Sau</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            type="button"
            className="link-btn-gradient"
            onClick={() => navigate('/calendar')}
          >
            <span>Xem lịch chi tiết</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <div className="schedule-card-body">
        <ScheduleTimeline
          events={events}
          categories={categories}
          gaps={gaps}
          isToday={isToday}
          onSelectEvent={onSelectEvent}
        />
      </div>
    </motion.section>
  );
}
