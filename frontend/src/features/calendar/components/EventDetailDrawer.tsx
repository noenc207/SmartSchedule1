import React from 'react';
import type { Category, EventItem } from '../../../types/domain';

export function EventDetailDrawer({
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
  onClose,
}: {
  event: EventItem;
  category?: Category;
  timeZone: string;
  canEdit?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock?: () => void;
  onReschedule?: () => void;
  onComplete?: () => void;
  onClose: () => void;
}) {
  const duration = Math.round((Date.parse(event.endsAt) - Date.parse(event.startsAt)) / 60000);
  const isFixed = event.fixed || event.locked;

  return (
    <aside className="event-drawer compact-popover" role="dialog" aria-modal="true" aria-labelledby="event-detail-title">
      <button className="drawer-close text-close-btn" onClick={onClose} aria-label="Đóng chi tiết sự kiện">
        Đóng
      </button>

      <div className="event-drawer-heading">
        <span className={isFixed ? 'event-type-mark fixed' : 'event-type-mark task'}>
          {isFixed ? 'Cố định' : 'Linh hoạt'}
        </span>
        <div>
          <p className="eyebrow">{isFixed ? 'Lịch học cố định' : 'Buổi tự học'}</p>
          <h2 id="event-detail-title">{event.title}</h2>
        </div>
      </div>

      <p className="muted">
        {new Intl.DateTimeFormat('vi-VN', { timeZone, dateStyle: 'full', timeStyle: 'short' }).format(new Date(event.startsAt))} – {new Intl.DateTimeFormat('vi-VN', { timeZone, timeStyle: 'short' }).format(new Date(event.endsAt))}
      </p>

      <div className="detail-list">
        <span>Thời lượng: <strong>{duration} phút</strong></span>
        <span>Danh mục: <strong>{category?.name ?? 'Chưa phân loại'}</strong></span>
        <span>Mức ưu tiên: <strong>{event.priority}</strong></span>
        <span>Trạng thái: <strong>{event.status}</strong></span>
        <span>Kiểu: <strong>{event.locked ? 'Đã khóa' : event.fixed ? 'Cố định' : 'Tự do'}</strong></span>
        {event.recurrenceRule && <span>Lặp lại: <strong>Theo chu kỳ</strong></span>}
      </div>

      {event.location && <p className="muted">Địa điểm: {event.location}</p>}
      {event.notes && <p className="detail-notes">{event.notes}</p>}

      {canEdit && (
        <div className="drawer-actions event-actions">
          <button className="primary-button" onClick={onEdit}>
            Chỉnh sửa
          </button>
          {onComplete && event.status !== 'COMPLETED' && (
            <button className="secondary-button" onClick={onComplete}>
              Hoàn thành
            </button>
          )}
          {onReschedule && !isFixed && (
            <button className="secondary-button" onClick={onReschedule}>
              Đổi lịch
            </button>
          )}
          <button className="secondary-button" onClick={onDuplicate}>
            Nhân bản
          </button>
          {onToggleLock && (
            <button className="secondary-button" onClick={onToggleLock}>
              {event.locked ? 'Mở khóa' : 'Khóa'}
            </button>
          )}
          <button className="secondary-button danger" onClick={onDelete}>
            Xóa
          </button>
        </div>
      )}
    </aside>
  );
}
