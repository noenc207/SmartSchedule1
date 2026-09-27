import React, { useEffect, useMemo, useState } from 'react';
import type { Category } from '../../../types/domain';
import { COLOR_PALETTE } from '../utils/colorPalette';
import {
  DEFAULT_TIMEZONE,
  formatDate,
  formatDuration,
  formatTime,
  formatTimeRange,
  getDurationMinutes,
  parseShortNaturalInput,
} from '../../../utils/dateTime';

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
  const [color, setColor] = useState<string>('#ea580c'); // Default FPT Orange
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  useEffect(() => {
    if (open) {
      setTitle('');
      setCategoryId(categories[0]?.id ?? '');
      setColor('#ea580c');
      const diff = Math.max(15, getDurationMinutes(startsAt, endsAt));
      setDurationMinutes(diff || 60);
    }
  }, [open, categories, startsAt, endsAt]);

  const naturalParsed = useMemo(() => {
    return parseShortNaturalInput(title, startsAt, durationMinutes, timeZone);
  }, [title, startsAt, durationMinutes, timeZone]);

  const effectiveStartsAt = naturalParsed.parsedTimeMatched ? naturalParsed.startsAt : startsAt;
  const effectiveEndsAt = naturalParsed.parsedTimeMatched
    ? naturalParsed.endsAt
    : new Date(new Date(startsAt).getTime() + durationMinutes * 60000).toISOString();

  const isPastTime = useMemo(() => {
    return new Date(effectiveEndsAt).getTime() < Date.now() - 60000;
  }, [effectiveEndsAt]);

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

  const formatRange = () => {
    return `${formatDate(effectiveStartsAt, timeZone, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })} · ${formatTimeRange(effectiveStartsAt, effectiveEndsAt, timeZone)}`;
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
            <span>{formatRange()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="quick-create-form">
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

          {/* Quick duration presets */}
          <div className="quick-create-durations">
            <span className="quick-create-label">Thời lượng:</span>
            {[30, 45, 60, 90, 120].map((mins) => (
              <button
                type="button"
                key={mins}
                className={`quick-duration-pill ${durationMinutes === mins ? 'active' : ''}`}
                onClick={() => setDurationMinutes(mins)}
              >
                {formatDuration(mins)}
              </button>
            ))}
          </div>

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
            <div style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12, marginTop: 8 }}>
              ⚠️ Không thể đặt lịch vào thời gian đã qua. Vui lòng chọn thời gian trong tương lai.
            </div>
          )}

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
