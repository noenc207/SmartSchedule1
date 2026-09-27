import React, { useMemo } from 'react';
import type { EventItem } from '../../../types/domain';
import { isSameDay, DEFAULT_TIMEZONE } from '../../../utils/dateTime';

export interface MobileDayStripProps {
  activeDate: Date;
  events: EventItem[];
  timeZone?: string;
  onSelectDay: (date: Date) => void;
}

const VN_DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function MobileDayStrip({
  activeDate,
  events,
  timeZone = DEFAULT_TIMEZONE,
  onSelectDay,
}: MobileDayStripProps) {
  // Generate the 7 days of the week containing activeDate (Monday = start of week)
  const weekDays = useMemo(() => {
    const curr = activeDate instanceof Date && !isNaN(activeDate.getTime()) ? new Date(activeDate) : new Date();
    const day = (curr.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - day);
    monday.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [activeDate]);

  const today = new Date();

  // Check if a given day has any events
  const dayHasEvents = (d: Date) => {
    return events.some((item) => {
      if (!item.startsAt) return false;
      const evDate = new Date(item.startsAt);
      return isSameDay(evDate, d, timeZone);
    });
  };

  return (
    <div className="calendar-mobile-day-strip" role="group" aria-label="Chọn ngày trong tuần">
      {weekDays.map((d) => {
        const isSelected = isSameDay(d, activeDate, timeZone);
        const isTodayDate = isSameDay(d, today, timeZone);
        const hasEvents = dayHasEvents(d);
        const dayLabel = VN_DAY_LABELS[d.getDay()];
        const dateNum = d.getDate();

        return (
          <button
            key={d.toISOString()}
            type="button"
            className={`mobile-day-chip ${isSelected ? 'selected' : ''} ${isTodayDate ? 'is-today' : ''}`}
            onClick={() => onSelectDay(d)}
            aria-label={`${dayLabel}, ngày ${dateNum}${isSelected ? ' (đang chọn)' : ''}${isTodayDate ? ' (hôm nay)' : ''}`}
            aria-pressed={isSelected}
          >
            <span className="mobile-day-name">{dayLabel}</span>
            <span className="mobile-day-num">{dateNum}</span>
            <span className="mobile-day-dots">
              {hasEvents && <span className="mobile-event-dot" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
