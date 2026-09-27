import React, { useState, useEffect, useRef } from 'react';
import type { Category } from '../../../types/domain';
import { COLOR_PALETTE } from '../../calendar/utils/colorPalette';

interface QuickAddComposerProps {
  categories: Category[];
  onAddTask: (taskData: {
    title: string;
    estimatedDurationMinutes: number;
    priority: string;
    categoryId?: string | null;
    deadline?: string | null;
    color?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

const DURATION_PRESETS = [
  { label: '30p', value: 30 },
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: '4h', value: 240 },
];

export function QuickAddComposer({ categories, onAddTask, onCancel }: QuickAddComposerProps) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(120); // default 2h
  const [customDuration, setCustomDuration] = useState(false);
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? '');
  const [color, setColor] = useState<string | null>(null); // null means inherit category
  const [deadline, setDeadline] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Update default category if categories load late
  useEffect(() => {
    if (!categoryId && categories[0]) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const activeColor = color ?? selectedCategory?.color ?? '#ea580c';

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || submitting) return;

    setSubmitting(true);
    try {
      await onAddTask({
        title: cleanTitle,
        estimatedDurationMinutes: duration,
        priority,
        categoryId: categoryId || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        color: color ?? null,
      });
      setTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="quick-add-composer-card" role="region" aria-label="Thêm nhanh tác vụ">
      <div className="composer-header">
        <div className="composer-title">
          <span>+ Thêm nhanh tác vụ</span>
        </div>
        <button
          type="button"
          className="text-button compact-btn"
          onClick={onCancel}
          aria-label="Đóng thêm tác vụ"
        >
          Đóng
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="composer-form">
        <div className="composer-field">
          <label className="composer-label" htmlFor="composer-title-input">
            Tên tác vụ / Bài tập <span className="required-star">*</span>
          </label>
          <input
            id="composer-title-input"
            ref={titleInputRef}
            type="text"
            className="composer-text-input"
            placeholder="vd: Bài tập Machine Learning Lab 3, Chuẩn bị thuyết trình FPT..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            required
            autoComplete="off"
          />
        </div>

        <div className="composer-grid-row">
          {/* Duration selector */}
          <div className="composer-control-group">
            <label className="composer-label">
              Thời lượng dự kiến
            </label>
            {!customDuration ? (
              <div className="composer-chip-group">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`composer-chip ${duration === p.value ? 'active' : ''}`}
                    onClick={() => setDuration(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="composer-chip"
                  onClick={() => setCustomDuration(true)}
                >
                  Tùy chỉnh
                </button>
              </div>
            ) : (
              <div className="composer-custom-duration">
                <input
                  type="number"
                  min="15"
                  step="15"
                  className="composer-number-input"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(15, Number(e.target.value)))}
                />
                <span className="unit-label">phút</span>
                <button
                  type="button"
                  className="text-button compact-btn"
                  onClick={() => setCustomDuration(false)}
                >
                  Mẫu có sẵn
                </button>
              </div>
            )}
          </div>

          {/* Priority selector */}
          <div className="composer-control-group">
            <label className="composer-label">
              Mức ưu tiên
            </label>
            <div className="composer-chip-group">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`composer-chip priority-${p.toLowerCase()} ${priority === p ? 'active' : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {p === 'HIGH' ? 'Cao' : p === 'MEDIUM' ? 'Vừa' : 'Thấp'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="composer-grid-row">
          {/* Category */}
          <div className="composer-control-group">
            <label className="composer-label">
              Học phần / Danh mục
            </label>
            <select
              className="composer-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div className="composer-control-group">
            <label className="composer-label">
              Hạn chót (Tùy chọn)
            </label>
            <input
              type="date"
              className="composer-date-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        {/* Color swatches */}
        <div className="composer-color-section">
          <label className="composer-label">
            Màu sắc nhận diện
            <span className="composer-sub-label">
              {color ? 'Màu tùy chọn' : `Kế thừa từ ${selectedCategory?.name ?? 'danh mục'}`}
            </span>
          </label>
          <div className="composer-swatch-list">
            {COLOR_PALETTE.map((swatch) => {
              const isSelected = activeColor === swatch.hex;
              return (
                <button
                  key={swatch.id}
                  type="button"
                  className={`composer-swatch-btn ${isSelected ? 'active' : ''}`}
                  style={{ backgroundColor: swatch.hex }}
                  onClick={() => setColor(swatch.hex)}
                  title={swatch.name}
                  aria-label={`Chọn màu ${swatch.name}`}
                />
              );
            })}
            {color && (
              <button
                type="button"
                className="text-button compact-btn reset-cat-btn"
                onClick={() => setColor(null)}
              >
                Đặt lại theo môn học
              </button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="composer-footer-actions">
          <button
            type="button"
            className="secondary-button compact-btn"
            onClick={onCancel}
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="primary-button compact-btn fpt-submit-task-btn"
            disabled={!title.trim() || submitting}
          >
            {submitting ? 'Đang lưu…' : '+ Thêm tác vụ'}
          </button>
        </div>
      </form>
    </div>
  );
}
