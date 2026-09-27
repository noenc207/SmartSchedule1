import React, { useEffect, useRef } from 'react';
import { COLOR_PALETTE } from '../../calendar/utils/colorPalette';

interface ColorPickerPopoverProps {
  open: boolean;
  anchorRect?: DOMRect | null;
  currentColor?: string | null;
  categoryColor?: string | null;
  onSelectColor: (hex: string) => void;
  onResetToCategory: () => void;
  onClose: () => void;
}

export function ColorPickerPopover({
  open,
  anchorRect,
  currentColor,
  categoryColor,
  onSelectColor,
  onResetToCategory,
  onClose,
}: ColorPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  const top = anchorRect ? Math.min(window.innerHeight - 200, anchorRect.bottom + 6) : 100;
  const left = anchorRect ? Math.max(12, Math.min(window.innerWidth - 240, anchorRect.left - 40)) : 100;

  return (
    <div
      ref={popoverRef}
      className="color-picker-popover"
      style={{ top: `${top}px`, left: `${left}px` }}
      role="dialog"
      aria-label="Change task color"
    >
      <div className="color-picker-header">
        <span className="color-picker-title">Màu tác vụ</span>
        {currentColor && (
          <button
            type="button"
            className="color-reset-button"
            onClick={() => {
              onResetToCategory();
              onClose();
            }}
            title="Khôi phục màu theo danh mục"
          >
            <span>[Mặc định môn]</span>
          </button>
        )}
      </div>

      <div className="color-picker-grid">
        {COLOR_PALETTE.map((swatch) => {
          const isSelected = currentColor === swatch.hex || (!currentColor && categoryColor === swatch.hex);
          return (
            <button
              key={swatch.id}
              type="button"
              className={`color-picker-swatch ${isSelected ? 'active' : ''}`}
              style={{ backgroundColor: swatch.hex }}
              onClick={() => {
                onSelectColor(swatch.hex);
                onClose();
              }}
              title={swatch.name}
              aria-label={`Chọn màu ${swatch.name}`}
            >
              {isSelected && <span className="swatch-check-dot">●</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
