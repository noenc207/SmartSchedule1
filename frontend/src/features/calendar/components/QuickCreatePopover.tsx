import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Category } from '../../../types/domain';
import { COLOR_PALETTE } from '../utils/colorPalette';
import {
  DEFAULT_TIMEZONE,
  formatDate,
  formatTime,
  parseShortNaturalInput,
} from '../../../utils/dateTime';

export const DURATION_PRESETS = [
  { mins: 15, label: '15m' },
  { mins: 30, label: '30m' },
  { mins: 45, label: '45m' },
  { mins: 60, label: '1h' },
  { mins: 90, label: '1h30' },
  { mins: 120, label: '2h' },
  { mins: 180, label: '3h' },
];

export function extractDateAndTime(val: string, timeZone: string) {
  if (!val) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, time: '09:00' };
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
    const [d, t] = val.split('T');
    return { date: d, time: t };
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
      const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
      return { date: dateStr, time: timeStr };
    }
  } catch {}
  const parts = val.split('T');
  return { date: parts[0] || '', time: (parts[1] || '09:00').slice(0, 5) };
}

export function calculateTimeDiffMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  return Math.max(0, endTotal - startTotal);
}

export function addMinutesToTime(startTime: string, minutes: number): string {
  const [sh, sm] = startTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm)) return startTime;
  const total = sh * 60 + sm + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function formatDurationDisplay(mins: number): string {
  if (mins <= 0) return '0 phút';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
  if (h > 0) return `${h} giờ`;
  return `${m} phút`;
}

export function QuickCreatePopover({
  open,
  startsAt,
  endsAt,
  categories,
  timeZone = DEFAULT_TIMEZONE,
  onSave,
  onMoreOptions,
  onClose,
}: {
  open: boolean;
  startsAt: string;
  endsAt: string;
  categories: Category[];
  timeZone?: string;
  onSave: (data: { title: string; startsAt: string; endsAt: string; categoryId?: string; color?: string }) => void;
  onMoreOptions: (data: { title: string; startsAt: string; endsAt: string; categoryId?: string; color?: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [color, setColor] = useState<string>('#ea580c');

  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const lastDurationRef = useRef<number>(60);

  useEffect(() => {
    if (open) {
      setTitle('');
      setCategoryId(categories[0]?.id ?? '');
      setColor('#ea580c');

      const startParts = extractDateAndTime(startsAt, timeZone);
      const endParts = extractDateAndTime(endsAt, timeZone);

      setDate(startParts.date);
      setStartTime(startParts.time);
      setEndTime(endParts.time);

      const diff = calculateTimeDiffMinutes(startParts.time, endParts.time);
      const initialDur = diff > 0 ? diff : 60;
      setDurationMinutes(initialDur);
      lastDurationRef.current = initialDur;
    }
  }, [open, startsAt, endsAt, categories, timeZone]);

  const naturalParsed = useMemo(() => {
    return parseShortNaturalInput(title, `${date}T${startTime}`, durationMinutes, timeZone);
  }, [title, date, startTime, durationMinutes, timeZone]);

  const effectiveStartsAt = `${date}T${startTime}`;
  const effectiveEndsAt = `${date}T${endTime}`;

  const isPastTime = useMemo(() => {
    try {
      const e = new Date(`${date}T${endTime}:00`).getTime();
      return !isNaN(e) && e < Date.now() - 60000;
    } catch {
      return false;
    }
  }, [date, endTime]);

  // 1. Chiều xuôi & 2. Tịnh tiến thời gian (Time-shifting)
  const handleStartTimeChange = (newStartTime: string) => {
    const curDur = durationMinutes > 0 ? durationMinutes : (lastDurationRef.current || 60);
    const newEndTime = addMinutesToTime(newStartTime, curDur);
    setStartTime(newStartTime);
    setEndTime(newEndTime);
    setDurationMinutes(curDur);
  };

  // 3. Chống lỗi logic (Anti-time-travel)
  const handleEndTimeChange = (newEndTime: string) => {
    let finalEnd = newEndTime;
    if (finalEnd < startTime) {
      finalEnd = startTime;
    }
    setEndTime(finalEnd);
    const diff = calculateTimeDiffMinutes(startTime, finalEnd);
    setDurationMinutes(diff);
    if (diff > 0) {
      lastDurationRef.current = diff;
    }
  };

  // 1. Chiều ngược (Cộng nhanh tính ra giờ kết thúc)
  const handleDurationSelect = (mins: number) => {
    lastDurationRef.current = mins;
    setDurationMinutes(mins);
    const newEndTime = addMinutesToTime(startTime, mins);
    setEndTime(newEndTime);
  };

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isPastTime) return;

    onSave({
      title: naturalParsed.parsedTimeMatched ? naturalParsed.title : title.trim(),
      startsAt: effectiveStartsAt,
      endsAt: effectiveEndsAt,
      categoryId: categoryId || undefined,
      color,
    });
    onClose();
  };

  const handleMore = () => {
    onMoreOptions({
      title: naturalParsed.parsedTimeMatched ? naturalParsed.title : title.trim(),
      startsAt: effectiveStartsAt,
      endsAt: effectiveEndsAt,
      categoryId: categoryId || undefined,
      color,
    });
    onClose();
  };

  return (
    <div className="quick-create-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="quick-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-create-header">
          <div className="quick-create-header-left">
            <span className="quick-create-title">
              <span>Tạo nhanh sự kiện</span>
            </span>
            <button type="button" className="text-close-btn" onClick={onClose} aria-label="Đóng">
              Đóng
            </button>
          </div>
          <div className="quick-create-time-preview">
            <span>
              {formatDate(effectiveStartsAt, timeZone, {
                weekday: 'short',
                month: 'numeric',
                day: 'numeric',
              })}{' '}
              · {startTime} – {endTime} ({formatDurationDisplay(durationMinutes)})
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="quick-create-form">
          {/* Input Tên sự kiện (chiều rộng 100%) */}
          <div className="quick-create-input-wrap">
            <input
              autoFocus
              type="text"
              className="quick-create-input"
              placeholder="Tên sự kiện (ví dụ: Ôn tập bài 8pm hoặc Lab AI)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  onClose();
                }
              }}
              required
            />
            {naturalParsed.parsedTimeMatched && (
              <div className="quick-create-natural-hint" role="status" aria-live="polite">
                <span>
                  Nhận diện giờ: <b>{formatTime(naturalParsed.startsAt, timeZone)}</b> (Tên: &quot;{naturalParsed.title}&quot;)
                </span>
              </div>
            )}
          </div>

          {/* Khu vực Thời gian (Bố cục dọc): Ngày, Bắt đầu, Kết thúc */}
          <div className="quick-create-time-section">
            <div className="quick-create-field">
              <label>Ngày diễn ra</label>
              <input
                type="date"
                className="quick-create-date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="quick-create-time-grid">
              <div className="quick-create-field">
                <label>Bắt đầu (Từ)</label>
                <input
                  type="time"
                  className="quick-create-time-input"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                />
              </div>
              <div className="quick-create-field">
                <label>Kết thúc (Đến)</label>
                <input
                  type="time"
                  className="quick-create-time-input"
                  value={endTime}
                  min={startTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Khu vực chọn Thời lượng (Two-way binding: highlight & tính toán) */}
          <div className="quick-create-durations">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
              <span className="quick-create-label">Thời lượng:</span>
              <span className="duration-badge" style={{ fontSize: 11, fontWeight: 700, color: '#ea580c' }}>
                {formatDurationDisplay(durationMinutes)}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DURATION_PRESETS.map((pill) => (
                <button
                  type="button"
                  key={pill.label}
                  className={`quick-duration-pill ${durationMinutes === pill.mins ? 'active' : ''}`}
                  onClick={() => handleDurationSelect(pill.mins)}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dropdown Danh mục */}
          <div className="quick-create-fields-row">
            <div className="quick-create-field">
              <label>Danh mục</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Không phân loại</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Khu vực chọn Màu sắc */}
          <div className="quick-create-color-row">
            <label>Màu sắc</label>
            <div className="color-swatch-list">
              {COLOR_PALETTE.map((swatch) => (
                <button
                  type="button"
                  key={swatch.id}
                  className={`color-swatch-btn ${color === swatch.hex ? 'active' : ''}`}
                  style={{ backgroundColor: swatch.hex }}
                  onClick={() => setColor(swatch.hex)}
                  title={swatch.name}
                  aria-label={swatch.name}
                />
              ))}
            </div>
          </div>

          {isPastTime && (
            <div style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12, marginTop: 4 }}>
              ⚠️ Không thể đặt lịch vào thời gian đã qua. Vui lòng chọn thời gian trong tương lai.
            </div>
          )}

          {/* Nút Hành động: Tùy chọn khác (trái), Hủy & Lưu sự kiện (phải) */}
          <div className="quick-create-actions">
            <button type="button" className="secondary-button" onClick={handleMore}>
              Tùy chọn khác
            </button>
            <div className="quick-create-primary-group">
              <button type="button" className="secondary-button" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="primary-button" disabled={!title.trim() || isPastTime}>
                Lưu sự kiện
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
