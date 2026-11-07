import React, { useMemo } from 'react';
import {
  Clock,
  MapPin,
  Lock,
  Plus,
  BookOpen,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { EventItem } from '../../../types/domain';
import { DEFAULT_TIMEZONE, formatForInput, formatTime } from '../../../utils/dateTime';

export interface FptSlotDef {
  id: number;
  name: string;
  timeRange: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  session: 'morning' | 'afternoon' | 'evening';
  label: string;
}

export const FPT_SLOTS: FptSlotDef[] = [
  { id: 1, name: 'Slot 1', timeRange: '07:30 – 09:00', startHour: 7, startMinute: 30, endHour: 9, endMinute: 0, session: 'morning', label: 'Ca 1 (Sáng)' },
  { id: 2, name: 'Slot 2', timeRange: '09:15 – 10:45', startHour: 9, startMinute: 15, endHour: 10, endMinute: 45, session: 'morning', label: 'Ca 2 (Sáng)' },
  { id: 3, name: 'Slot 3', timeRange: '11:00 – 12:30', startHour: 11, startMinute: 0, endHour: 12, endMinute: 30, session: 'morning', label: 'Ca 3 (Trưa)' },
  { id: 4, name: 'Slot 4', timeRange: '12:45 – 14:15', startHour: 12, startMinute: 45, endHour: 14, endMinute: 15, session: 'afternoon', label: 'Ca 4 (Chiều)' },
  { id: 5, name: 'Slot 5', timeRange: '14:30 – 16:00', startHour: 14, startMinute: 30, endHour: 16, endMinute: 0, session: 'afternoon', label: 'Ca 5 (Chiều)' },
  { id: 6, name: 'Slot 6', timeRange: '16:15 – 17:45', startHour: 16, startMinute: 15, endHour: 17, endMinute: 45, session: 'afternoon', label: 'Ca 6 (Chiều)' },
  { id: 7, name: 'Ca Tối', timeRange: '18:00 – 20:30', startHour: 18, startMinute: 0, endHour: 20, endMinute: 30, session: 'evening', label: 'Tự học / Đồ án' },
];

export interface FptSlotGridProps {
  activeDate: Date;
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onEditEvent?: (event: EventItem) => void;
  onOpenCreate?: (start: Date, end: Date) => void;
  canEdit?: boolean;
  timeZone?: string;
}

export const FptSlotGrid: React.FC<FptSlotGridProps> = ({
  activeDate,
  events,
  onSelectEvent,
  onEditEvent,
  onOpenCreate,
  canEdit = true,
  timeZone = DEFAULT_TIMEZONE,
}) => {
  // Compute the 7 days of the active week (Monday to Sunday) in target timezone
  const { days, todayIndex } = useMemo(() => {
    const d = new Date(activeDate);
    const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const nowStr = formatForInput(new Date(), timeZone).split('T')[0];
    let currentTodayIndex = -1;

    const list: Array<{
      date: Date;
      dayName: string;
      dateStr: string;
      isToday: boolean;
      formattedDate: string;
    }> = [];

    const vnDayNames = [
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
      'Chủ Nhật',
    ];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);

      const curInputStr = formatForInput(cur, timeZone);
      const curDateStr = curInputStr.split('T')[0] || '';
      const isToday = curDateStr === nowStr;

      if (isToday) currentTodayIndex = i;

      const [, curMonth, curDay] = curDateStr.split('-');
      const formattedDate = curDay && curMonth ? `${curDay}/${curMonth}` : `${cur.getDate()}/${cur.getMonth() + 1}`;

      list.push({
        date: cur,
        dayName: vnDayNames[i],
        dateStr: curDateStr,
        formattedDate,
        isToday,
      });
    }

    return { days: list, todayIndex: currentTodayIndex };
  }, [activeDate, timeZone]);

  // Match events to days and slots using deterministic timezone conversion
  const slotGridData = useMemo(() => {
    const map = new Map<string, EventItem[]>();

    events.forEach((ev) => {
      const startStr = formatForInput(ev.startsAt, timeZone);
      const endStr = formatForInput(ev.endsAt, timeZone);
      if (!startStr || !endStr) return;

      const [startDatePart, startTimePart] = startStr.split('T');
      const [sH, sM] = (startTimePart || '00:00').split(':').map(Number);
      const evStartMin = (isNaN(sH) ? 0 : sH) * 60 + (isNaN(sM) ? 0 : sM);

      const [, endTimePart] = endStr.split('T');
      const [eH, eM] = (endTimePart || '00:00').split(':').map(Number);
      const evEndMin = (isNaN(eH) ? 0 : eH) * 60 + (isNaN(eM) ? 0 : eM);

      // Find which day column this event belongs to
      days.forEach((dayInfo, dayIdx) => {
        if (startDatePart !== dayInfo.dateStr) return;

        // Check which slot this event overlaps with (minimum 30 min overlap)
        let matched = false;
        FPT_SLOTS.forEach((slot) => {
          const slotStartMin = slot.startHour * 60 + slot.startMinute;
          const slotEndMin = slot.endHour * 60 + slot.endMinute;

          const overlapMinutes =
            Math.min(evEndMin, slotEndMin) - Math.max(evStartMin, slotStartMin);

          if (overlapMinutes >= 30) {
            matched = true;
            const key = `${dayIdx}_${slot.id}`;
            const existing = map.get(key) || [];
            if (!existing.some((e) => e.id === ev.id)) {
              map.set(key, [...existing, ev]);
            }
          }
        });

        // Fallback for short events or events starting near a slot
        if (!matched) {
          let bestSlot = FPT_SLOTS[0];
          let minDiff = Infinity;
          FPT_SLOTS.forEach((slot) => {
            const slotStartMin = slot.startHour * 60 + slot.startMinute;
            const diff = Math.abs(evStartMin - slotStartMin);
            if (diff < minDiff) {
              minDiff = diff;
              bestSlot = slot;
            }
          });
          const key = `${dayIdx}_${bestSlot.id}`;
          const existing = map.get(key) || [];
          if (!existing.some((e) => e.id === ev.id)) {
            map.set(key, [...existing, ev]);
          }
        }
      });
    });

    return map;
  }, [days, events, timeZone]);

  // Format short location for room pills
  const formatLocation = (loc: string | null | undefined): string => {
    if (!loc) return 'Chưa xếp phòng';
    const clean = loc.replace(/^Phòng\s+/i, '').replace(/^Room\s+/i, '');
    if (clean.length > 20) return clean.slice(0, 18) + '…';
    return clean;
  };

  return (
    <div className="fpt-slot-matrix-container">
      {/* Header Bar with Legend and Quick FPT Info */}
      <div className="fpt-slot-matrix-header">
        <div className="fpt-slot-header-title">
          <div className="fpt-slot-badge">
            <Calendar size={13} className="text-orange-600 dark:text-orange-400" />
            <span>LƯỚI SLOT CHUẨN FPT</span>
          </div>
          <span className="fpt-slot-subtitle">
            Học kỳ Fall 2026 • 6 Slot chính khóa + Ca tự học buổi tối
          </span>
        </div>

        <div className="fpt-slot-legend">
          <span className="fpt-legend-item">
            <span className="fpt-legend-dot bg-blue-600" />
            <span>Chính khóa (Cố định)</span>
          </span>
          <span className="fpt-legend-item">
            <span className="fpt-legend-dot bg-emerald-600" />
            <span>Đã hoàn thành</span>
          </span>
          <span className="fpt-legend-item">
            <span className="fpt-legend-dot bg-orange-500" />
            <span>Tự học / Đồ án</span>
          </span>
          <span className="fpt-legend-item">
            <span className="fpt-legend-dot border border-dashed border-slate-400" />
            <span>Slot trống</span>
          </span>
        </div>
      </div>

      {/* Main Responsive Grid Table */}
      <div className="fpt-slot-grid-table">
        {/* Table Column Headers (Corner + 7 Days) */}
        <div className="fpt-slot-row fpt-slot-table-header">
          <div className="fpt-slot-cell-slot-header">
            <span className="fpt-corner-label">KHUNG GIỜ</span>
            <span className="fpt-corner-sub">SLOT FPT</span>
          </div>

          {days.map((day, idx) => {
            // Count events on this day
            const dayEventCount = Array.from(slotGridData.entries())
              .filter(([key]) => key.startsWith(`${idx}_`))
              .reduce((acc, [, evs]) => acc + evs.length, 0);

            return (
              <div
                key={day.dateStr}
                className={`fpt-slot-day-header ${day.isToday ? 'is-today' : ''}`}
              >
                <div className="fpt-day-header-top">
                  <span className="fpt-day-name">{day.dayName}</span>
                  {day.isToday && <span className="fpt-today-pill">Hôm nay</span>}
                </div>
                <div className="fpt-day-date-row">
                  <span className="fpt-day-date">{day.formattedDate}</span>
                  <span className="fpt-day-load-badge">
                    {dayEventCount > 0 ? `${dayEventCount} ca` : 'Trống'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Slot Rows (1 to 6 + Evening) */}
        <div className="fpt-slot-table-body">
          {FPT_SLOTS.map((slot) => {
            const isEvening = slot.session === 'evening';

            return (
              <div
                key={slot.id}
                className={`fpt-slot-row ${isEvening ? 'is-evening-row' : ''}`}
              >
                {/* Left Slot Label */}
                <div className="fpt-slot-cell-slot-label">
                  <span className="fpt-slot-name">{slot.name}</span>
                  <span className="fpt-slot-time">
                    <Clock size={11} className="inline mr-1 text-slate-400" />
                    {slot.timeRange}
                  </span>
                  <span className="fpt-slot-tag">{slot.label}</span>
                </div>

                {/* 7 Days Cells for this slot */}
                {days.map((day, dayIdx) => {
                  const key = `${dayIdx}_${slot.id}`;
                  const cellEvents = slotGridData.get(key) || [];

                  // Calculate slot start and end dates for quick booking
                  const slotStartDate = new Date(day.date);
                  slotStartDate.setHours(slot.startHour, slot.startMinute, 0, 0);
                  const slotEndDate = new Date(day.date);
                  slotEndDate.setHours(slot.endHour, slot.endMinute, 0, 0);

                  return (
                    <div
                      key={key}
                      className={`fpt-slot-grid-cell ${day.isToday ? 'is-today-cell' : ''} ${
                        cellEvents.length > 0 ? 'has-event' : 'is-empty'
                      }`}
                    >
                      {cellEvents.length > 0 ? (
                        <div className="fpt-cell-events-stack">
                          {cellEvents.map((ev) => {
                            const isLocked = ev.locked || ev.fixed;
                            const isCompleted = ev.status === 'COMPLETED';
                            const evStartTime = formatTime(ev.startsAt, timeZone);
                            const evEndTime = formatTime(ev.endsAt, timeZone);

                            return (
                              <div
                                key={ev.id}
                                className={`fpt-event-card ${isCompleted ? 'is-completed' : ''} ${
                                  isLocked ? 'is-fixed-course' : 'is-study-session'
                                }`}
                                onClick={() => onSelectEvent(ev)}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  if (canEdit && onEditEvent) onEditEvent(ev);
                                }}
                                title={`${ev.title}\nThời gian: ${evStartTime} - ${evEndTime}\nPhòng: ${
                                  ev.location || 'Chưa xếp'
                                }\nBấm để xem chi tiết`}
                              >
                                <div className="fpt-event-card-header">
                                  <span className="fpt-event-title" title={ev.title}>
                                    {ev.title}
                                  </span>
                                  {isLocked ? (
                                    <span title="Lớp chính khóa cố định">
                                      <Lock size={12} className="fpt-lock-icon" />
                                    </span>
                                  ) : isCompleted ? (
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                  ) : null}
                                </div>

                                <div className="fpt-event-card-meta">
                                  <span className="fpt-meta-time">
                                    {evStartTime}–{evEndTime}
                                  </span>

                                  {ev.location && (
                                    <span className="fpt-room-badge" title={ev.location}>
                                      <MapPin size={10} className="inline mr-0.5 opacity-80" />
                                      {formatLocation(ev.location)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="fpt-empty-slot-btn"
                          disabled={!canEdit}
                          onClick={() => {
                            if (canEdit && onOpenCreate) {
                              onOpenCreate(slotStartDate, slotEndDate);
                            }
                          }}
                          title={`Bấm để đặt lịch tự học ca ${slot.name} (${slot.timeRange}) ngày ${day.formattedDate}`}
                        >
                          <Plus size={13} className="fpt-empty-plus-icon" />
                          <span className="fpt-empty-text">+ Trống</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
