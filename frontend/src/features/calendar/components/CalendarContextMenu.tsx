import { useEffect, useRef } from 'react';
import type { EventItem } from '../../../types/domain';
import { COLOR_PALETTE } from '../utils/colorPalette';

export interface ContextMenuState {
  x: number;
  y: number;
  event?: EventItem;
  slotDate?: Date;
}

export function CalendarContextMenu({
  menu,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleComplete,
  onReschedule,
  onRecolor,
  onNewEvent,
  onNavigatePlan,
  onNavigateReschedule,
}: {
  menu: ContextMenuState | null;
  onClose: () => void;
  onEdit: (event: EventItem) => void;
  onDuplicate: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
  onToggleLock: (event: EventItem) => void;
  onToggleComplete: (event: EventItem) => void;
  onReschedule: (event: EventItem) => void;
  onRecolor: (event: EventItem, color: string | null) => void;
  onNewEvent: (date?: Date) => void;
  onNavigatePlan: () => void;
  onNavigateReschedule: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  // Prevent overflow from viewport
  const style = {
    top: Math.min(menu.y, window.innerHeight - 280),
    left: Math.min(menu.x, window.innerWidth - 220),
  };

  if (menu.event) {
    const item = menu.event;
    const isCompleted = item.status === 'COMPLETED';
    const isFixed = item.fixed || item.locked;

    return (
      <div ref={ref} className="calendar-context-menu" style={style}>
        <div className="context-menu-header">
          <strong>{item.title}</strong>
        </div>

        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onEdit(item);
            onClose();
          }}
        >
          <span>Chỉnh sửa chi tiết</span>
        </button>

        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onDuplicate(item);
            onClose();
          }}
        >
          <span>Nhân bản sự kiện</span>
        </button>

        {!isFixed && (
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onReschedule(item);
              onClose();
            }}
          >
            <span>Đổi lịch sang giờ khác...</span>
          </button>
        )}

        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onToggleComplete(item);
            onClose();
          }}
        >
          <span>{isCompleted ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}</span>
        </button>

        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onToggleLock(item);
            onClose();
          }}
        >
          <span>{item.locked ? 'Mở khóa sự kiện' : 'Khóa cố định sự kiện'}</span>
        </button>

        {/* Quick color sub-palette */}
        <div className="context-menu-color-row">
          <span>Màu sắc</span>
          <div className="color-swatch-list mini">
            {COLOR_PALETTE.slice(0, 6).map((swatch) => (
              <button
                type="button"
                key={swatch.id}
                className="color-swatch-btn mini"
                style={{ backgroundColor: swatch.hex }}
                onClick={() => {
                  onRecolor(item, swatch.hex);
                  onClose();
                }}
                title={swatch.name}
              />
            ))}
          </div>
        </div>

        <div className="context-menu-divider" />

        <button
          type="button"
          className="context-menu-item danger"
          onClick={() => {
            onDelete(item);
            onClose();
          }}
        >
          <span>Xóa sự kiện</span>
        </button>
      </div>
    );
  }

  // Right click on empty calendar slot
  return (
    <div ref={ref} className="calendar-context-menu" style={style}>
      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onNewEvent(menu.slotDate);
          onClose();
        }}
      >
        <span>Tạo sự kiện mới tại đây</span>
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onNavigatePlan();
          onClose();
        }}
      >
        <span>Lên lịch thông minh bằng AI</span>
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onNavigateReschedule();
          onClose();
        }}
      >
        <span>Trung tâm xếp lại lịch</span>
      </button>
    </div>
  );
}
