import React from 'react';
import type { Category, EventItem } from '../../../types/domain';
import { COLOR_PALETTE, resolveEventColor } from '../utils/colorPalette';
import { formatDate, formatDuration, formatTimeRange, getDurationMinutes } from '../../../utils/dateTime';

export function EventCompactPopover({
  event,
  category,
  timeZone,
  canEdit = true,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleLock,
  onReschedule,
  onComplete,
  onRecolor,
  transition,
  onClose,
}: {
  event: EventItem;
  category?: Category;
  timeZone: string;
  canEdit?: boolean;
  transition?: {
    nextTitle: string;
    nextLocation: string;
    durationMinutes: number;
    availableMinutes: number;
    isTight: boolean;
    isConflict: boolean;
  };
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock?: () => void;
  onReschedule?: () => void;
  onComplete?: () => void;
  onRecolor: (color: string | null) => void;
  onClose: () => void;
}) {
  const isFixed = Boolean(event.fixed || event.locked);
  const isCompleted = event.status === 'COMPLETED';
  const { color: resolvedColor, isCustom } = resolveEventColor(event, category);

  const durationMinutes = Math.max(15, getDurationMinutes(event.startsAt, event.endsAt));
  const durStr = formatDuration(durationMinutes);

  const formatEventTime = () => {
    try {
      const dateStr = formatDate(event.startsAt, timeZone);
      const timeStr = formatTimeRange(event.startsAt, event.endsAt, timeZone);
      return `${dateStr} · ${timeStr}`;
    } catch {
      return `${event.startsAt} – ${event.endsAt}`;
    }
  };

  return (
    <div className="event-compact-popover-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="event-compact-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Color Accent Bar */}
        <div
          className="compact-header-stripe"
          style={{ backgroundColor: resolvedColor }}
        />

        <div className="compact-header-row">
          <div className="compact-title-group">
            <span
              className="compact-category-tag"
              style={{
                backgroundColor: `color-mix(in srgb, ${resolvedColor} 15%, transparent)`,
                color: resolvedColor,
              }}
            >
              {category?.name || (isFixed ? 'Cố định' : 'Kế hoạch')}
            </span>
            <h3 className="compact-event-title">{event.title}</h3>
          </div>

          <button
            type="button"
            className="text-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            Đóng
          </button>
        </div>

        <div className="compact-body">
          {/* Time & Duration */}
          <div className="compact-meta-row">
            <span className="compact-time-text">{formatEventTime()}</span>
            <span className="compact-duration-pill">{durStr}</span>
          </div>

          {/* Status Badges */}
          <div className="compact-badges-row">
            {event.locked && (
              <span className="status-badge-pill locked">
                Đã khóa vị trí
              </span>
            )}
            {isFixed && (
              <span className="status-badge-pill fixed">
                Lịch học cố định
              </span>
            )}
            {isCompleted && (
              <span className="status-badge-pill completed">
                Đã hoàn thành
              </span>
            )}
          </div>

          {/* Location if present */}
          {event.location && (
            <div className="compact-meta-row">
              <span className="compact-location-text">Địa điểm: {event.location}</span>
            </div>
          )}

          {/* Travel Transition buffer if present */}
          {transition && (
            <div className={`compact-travel-row ${transition.isConflict ? 'conflict' : transition.isTight ? 'tight' : 'normal'}`}>
              <span className="compact-travel-badge">
                {transition.isConflict ? '[Không kịp chuyển tiếp]' : transition.isTight ? '[Chuyển tiếp sát giờ]' : '[Di chuyển]'}
              </span>
              <span className="compact-travel-detail">
                {transition.durationMinutes} phút đến &ldquo;{transition.nextTitle}&rdquo; ({transition.nextLocation}) · {transition.availableMinutes} phút nghỉ
              </span>
            </div>
          )}

          {/* Notes Preview if present */}
          {event.notes && (
            <p className="compact-notes-preview">{event.notes}</p>
          )}

          {/* 1-Click Color Swatches */}
          {canEdit && (
            <div className="compact-color-section">
              <div className="compact-color-label-row">
                <span>Màu sắc</span>
                {isCustom && (
                  <button
                    type="button"
                    className="compact-reset-color-btn"
                    onClick={() => onRecolor(null)}
                    title="Khôi phục màu theo danh mục"
                  >
                    Về mặc định
                  </button>
                )}
              </div>
              <div className="color-swatch-list">
                {COLOR_PALETTE.map((swatch) => (
                  <button
                    type="button"
                    key={swatch.id}
                    className={`color-swatch-btn ${resolvedColor === swatch.hex ? 'active' : ''}`}
                    style={{ backgroundColor: swatch.hex }}
                    onClick={() => onRecolor(swatch.hex)}
                    title={swatch.name}
                    aria-label={`Đặt màu ${swatch.name}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 1-Click Quick Actions Toolbar */}
        {canEdit && (
          <div className="compact-popover-actions">
            {onComplete && (
              <button
                type="button"
                className="secondary-button compact-btn"
                onClick={onComplete}
                title={isCompleted ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
              >
                <span>{isCompleted ? 'Đã xong' : 'Hoàn thành'}</span>
              </button>
            )}

            {onReschedule && !isFixed && (
              <button
                type="button"
                className="secondary-button compact-btn"
                onClick={onReschedule}
                title="Đổi lịch sang khung giờ trống khác"
              >
                <span>Đổi lịch</span>
              </button>
            )}

            <button
              type="button"
              className="primary-button compact-btn"
              onClick={onEdit}
              title="Chỉnh sửa chi tiết"
            >
              <span>Chỉnh sửa</span>
            </button>

            <button
              type="button"
              className="secondary-button compact-btn"
              onClick={onDuplicate}
              title="Nhân bản sự kiện"
            >
              Nhân bản
            </button>

            {onToggleLock && (
              <button
                type="button"
                className="secondary-button compact-btn"
                onClick={onToggleLock}
                title={event.locked ? 'Mở khóa sự kiện' : 'Khóa sự kiện'}
              >
                {event.locked ? 'Mở khóa' : 'Khóa'}
              </button>
            )}

            <button
              type="button"
              className="secondary-button compact-btn danger"
              onClick={onDelete}
              title="Xóa sự kiện"
            >
              Xóa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
