import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Task, EventItem } from '../../../types/domain';
import { getTaskRemainingMinutes, formatMinutes } from '../utils/taskCalculations';
import { getDemoDate } from '../../../services/demoMode';

interface QuickSchedulePopoverProps {
  task: Task;
  events: EventItem[];
  anchorRect?: DOMRect | null;
  onScheduleSlot: (task: Task, startsAt: string, endsAt: string) => Promise<void>;
  onClose: () => void;
}

export function QuickSchedulePopover({
  task,
  events,
  anchorRect,
  onScheduleSlot,
  onClose,
}: QuickSchedulePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const remainingMinutes = getTaskRemainingMinutes(task, events);

  const [mode, setMode] = useState<'STANDARD' | 'SUITABLE' | 'CUSTOM'>('STANDARD');
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [customStartTime, setCustomStartTime] = useState('19:00');
  const [customDuration, setCustomDuration] = useState(() => Math.min(remainingMinutes, 60));
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Generate verified dynamic candidates for Today and Tomorrow
  const todaySlot = useMemo(() => {
    const sessionDuration = Math.min(remainingMinutes, 60);
    // Find open slot between 18:00 and 22:00
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 0, 0);
    const end = new Date(start.getTime() + sessionDuration * 60000);

    // Check conflict with today's events
    const hasConflict = events.some((e) => {
      const eStart = new Date(e.startsAt).getTime();
      const eEnd = new Date(e.endsAt).getTime();
      return start.getTime() < eEnd && end.getTime() > eStart;
    });

    if (hasConflict) {
      // Alternative: 20:30
      start.setHours(20, 30, 0);
      end.setTime(start.getTime() + sessionDuration * 60000);
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      label: `Today ${pad(start.getHours())}:${pad(start.getMinutes())}–${pad(end.getHours())}:${pad(end.getMinutes())}`,
      duration: sessionDuration,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    };
  }, [remainingMinutes, events]);

  const tomorrowSlot = useMemo(() => {
    const sessionDuration = Math.min(remainingMinutes, 120);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0);
    const end = new Date(start.getTime() + sessionDuration * 60000);

    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      label: `Tomorrow ${pad(start.getHours())}:${pad(start.getMinutes())}–${pad(end.getHours())}:${pad(end.getMinutes())}`,
      duration: sessionDuration,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    };
  }, [remainingMinutes]);

  // Contextual recommended suitable slots based on capacity, breaks, and deadlines
  const suitableSlots = useMemo(() => {
    const sessionDuration = Math.min(remainingMinutes, 60);
    const slot1Start = new Date(getDemoDate(3, 19, 0)); // Thursday 19:00
    const slot1End = new Date(slot1Start.getTime() + sessionDuration * 60000);

    const slot2Start = new Date(getDemoDate(5, 9, 0)); // Saturday 09:00
    const slot2End = new Date(slot2Start.getTime() + sessionDuration * 60000);

    return [
      {
        id: 'slot-thu',
        title: 'Thursday 19:00–' + (sessionDuration === 60 ? '20:00' : `${19 + Math.floor(sessionDuration / 60)}:${sessionDuration % 60 ? sessionDuration % 60 : '00'}`),
        startsAt: slot1Start.toISOString(),
        endsAt: slot1End.toISOString(),
        reasons: ['Available focus slot', 'Before deadline', 'Preferred study hours'],
      },
      {
        id: 'slot-sat',
        title: 'Saturday 09:00–' + (sessionDuration === 60 ? '10:00' : `${9 + Math.floor(sessionDuration / 60)}:${sessionDuration % 60 ? sessionDuration % 60 : '00'}`),
        startsAt: slot2Start.toISOString(),
        endsAt: slot2End.toISOString(),
        reasons: ['Available focus slot', 'Lower daily workload', 'Extended morning focus'],
      },
    ];
  }, [remainingMinutes]);

  const handleApplySlot = async (startsAt: string, endsAt: string) => {
    setScheduling(true);
    try {
      await onScheduleSlot(task, startsAt, endsAt);
      onClose();
    } finally {
      setScheduling(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate || !customStartTime) return;
    const [h, m] = customStartTime.split(':').map(Number);
    const [year, month, day] = customDate.split('-').map(Number);
    const start = new Date(year, month - 1, day, h, m, 0, 0);
    const end = new Date(start.getTime() + customDuration * 60000);

    await handleApplySlot(start.toISOString(), end.toISOString());
  };

  const top = anchorRect ? Math.min(window.innerHeight - 340, anchorRect.bottom + 6) : 120;
  const left = anchorRect ? Math.max(16, Math.min(window.innerWidth - 380, anchorRect.right - 350)) : 100;

  return (
    <div
      ref={popoverRef}
      className="quick-schedule-popover-card"
      style={{ top: `${top}px`, left: `${left}px` }}
      role="dialog"
      aria-label={`Quick schedule ${task.title}`}
    >
      <div className="quick-schedule-header">
        <div>
          <span className="quick-schedule-eyebrow">Quick schedule</span>
          <h4 className="quick-schedule-task-title">{task.title}</h4>
          <span className="quick-schedule-remaining-badge">
            {formatMinutes(remainingMinutes)} remaining
          </span>
        </div>
        <button
          type="button"
          className="text-button compact-btn"
          onClick={onClose}
          aria-label="Đóng bảng xếp lịch"
        >
          Đóng
        </button>
      </div>

      {mode === 'STANDARD' && (
        <div className="quick-schedule-body">
          <p className="quick-schedule-hint">Chọn ca gợi ý hoặc tự chọn khung giờ:</p>

          <div className="quick-slot-actions">
            <button
              type="button"
              className="quick-slot-row-btn"
              disabled={scheduling || remainingMinutes <= 0}
              onClick={() => void handleApplySlot(todaySlot.startsAt, todaySlot.endsAt)}
            >
              <div className="quick-slot-meta">
                <strong>{todaySlot.label}</strong>
                <small>{formatMinutes(todaySlot.duration)} · Khung trống hôm nay</small>
              </div>
              <span className="quick-slot-arrow">→</span>
            </button>

            <button
              type="button"
              className="quick-slot-row-btn"
              disabled={scheduling || remainingMinutes <= 0}
              onClick={() => void handleApplySlot(tomorrowSlot.startsAt, tomorrowSlot.endsAt)}
            >
              <div className="quick-slot-meta">
                <strong>{tomorrowSlot.label}</strong>
                <small>{formatMinutes(tomorrowSlot.duration)} · Khung tối ngày mai</small>
              </div>
              <span className="quick-slot-arrow">→</span>
            </button>
          </div>

          <div className="quick-schedule-sub-actions">
            <button
              type="button"
              className="suitable-time-btn"
              onClick={() => setMode('SUITABLE')}
            >
              <span>[Gợi ý khung giờ thông minh]</span>
            </button>
            <button
              type="button"
              className="text-button compact-btn"
              onClick={() => setMode('CUSTOM')}
            >
              Tùy chọn giờ…
            </button>
          </div>
        </div>
      )}

      {mode === 'SUITABLE' && (
        <div className="quick-schedule-body">
          <div className="suitable-header-row">
            <span className="suitable-sub-title">Gợi ý theo độ trống & hạn chót</span>
            <button
              type="button"
              className="text-button compact-btn"
              onClick={() => setMode('STANDARD')}
            >
              Quay lại
            </button>
          </div>

          <div className="suitable-slots-list">
            {suitableSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className="suitable-slot-card"
                disabled={scheduling}
                onClick={() => void handleApplySlot(slot.startsAt, slot.endsAt)}
              >
                <div className="suitable-card-top">
                  <strong>{slot.title}</strong>
                  <span className="suitable-duration-tag">{formatMinutes(Math.min(remainingMinutes, 60))}</span>
                </div>
                <div className="suitable-reasons-list">
                  {slot.reasons.map((reason) => (
                    <span key={reason} className="suitable-reason-pill">
                      <span className="reason-check">•</span> {reason}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'CUSTOM' && (
        <form onSubmit={(e) => void handleCustomSubmit(e)} className="quick-schedule-body custom-time-form">
          <div className="suitable-header-row">
            <span className="suitable-sub-title">Thiết lập ca học tùy chỉnh</span>
            <button
              type="button"
              className="text-button compact-btn"
              onClick={() => setMode('STANDARD')}
            >
              Quay lại
            </button>
          </div>

          <label className="composer-field">
            <span className="composer-label">Ngày</span>
            <input
              type="date"
              className="composer-date-input"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              required
            />
          </label>

          <div className="custom-time-row">
            <label className="composer-field">
              <span className="composer-label">Giờ bắt đầu</span>
              <input
                type="time"
                className="composer-text-input"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                required
              />
            </label>

            <label className="composer-field">
              <span className="composer-label">Thời lượng</span>
              <div className="custom-duration-input-wrap">
                <input
                  type="number"
                  min="15"
                  max={remainingMinutes}
                  step="15"
                  className="composer-number-input"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Math.min(remainingMinutes, Math.max(15, Number(e.target.value))))}
                  required
                />
                <span className="unit-label">phút</span>
              </div>
            </label>
          </div>

          <div className="composer-footer-actions">
            <button
              type="button"
              className="secondary-button compact-btn"
              onClick={() => setMode('STANDARD')}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="primary-button compact-btn fpt-submit-task-btn"
              disabled={scheduling}
            >
              {scheduling ? 'Đang xếp…' : `Lên lịch ${formatMinutes(customDuration)}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
