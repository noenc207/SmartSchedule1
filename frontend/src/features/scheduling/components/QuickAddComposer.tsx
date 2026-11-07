import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Clock,
  Calendar as CalendarIcon,
  Tag,
  Palette,
  Check,
  X,
  Flame,
  AlertCircle,
  Plus,
  BookOpen,
} from 'lucide-react';
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
  const [color, setColor] = useState<string | null>(null);
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
    <div className="composer-premium-container" role="region" aria-label="Thêm nhanh tác vụ">
      {/* Header */}
      <div className="composer-premium-header">
        <div className="composer-header-left">
          <div className="composer-header-icon-box">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="composer-premium-title">Thêm bài tập & Tác vụ mới</h2>
            <p className="composer-premium-sub">
              Tự động phân bổ vào khoảng trống lịch trình bằng thuật toán CP-SAT.
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          className="composer-close-round-btn"
          onClick={onCancel}
          whileHover={{ rotate: 90, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Đóng bảng thêm tác vụ"
        >
          <X size={16} />
        </motion.button>
      </div>

      {/* Form Body */}
      <form onSubmit={(e) => void handleSubmit(e)} className="composer-premium-form">
        {/* Title Input */}
        <div className="composer-field-group">
          <label className="composer-field-label" htmlFor="composer-title-input">
            TÊN BÀI TẬP / ĐỒ ÁN <span className="text-orange-500">*</span>
          </label>
          <div className="composer-input-wrapper">
            <input
              id="composer-title-input"
              ref={titleInputRef}
              type="text"
              className="composer-premium-input"
              placeholder="vd: Lab 4 PRN211, Đồ án Tốt nghiệp, Ôn thi Machine Learning..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              required
              autoComplete="off"
            />
          </div>
        </div>

        {/* Duration & Priority Grid */}
        <div className="composer-dual-grid">
          {/* Duration Selector */}
          <div className="composer-field-group">
            <label className="composer-field-label">
              <Clock size={12} className="inline-icon text-orange-500" />
              <span>THỜI LƯỢNG DỰ KIẾN</span>
            </label>

            {!customDuration ? (
              <div className="composer-chips-row">
                {DURATION_PRESETS.map((p) => {
                  const isActive = duration === p.value;
                  return (
                    <motion.button
                      key={p.value}
                      type="button"
                      className={`composer-chip-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setDuration(p.value)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      {p.label}
                    </motion.button>
                  );
                })}
                <motion.button
                  type="button"
                  className="composer-chip-btn"
                  onClick={() => setCustomDuration(true)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Tùy chỉnh
                </motion.button>
              </div>
            ) : (
              <div className="composer-custom-duration-box">
                <input
                  type="number"
                  min="15"
                  step="15"
                  className="composer-duration-number-input"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(15, Number(e.target.value)))}
                />
                <span className="unit-tag">phút</span>
                <button
                  type="button"
                  className="composer-text-link"
                  onClick={() => setCustomDuration(false)}
                >
                  Mẫu có sẵn
                </button>
              </div>
            )}
          </div>

          {/* Priority Selector */}
          <div className="composer-field-group">
            <label className="composer-field-label">
              <Flame size={12} className="inline-icon text-orange-500" />
              <span>MỨC ĐỘ ƯU TIÊN</span>
            </label>

            <div className="composer-priority-grid">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => {
                const isActive = priority === p;
                const label = p === 'HIGH' ? 'Cao' : p === 'MEDIUM' ? 'Vừa' : 'Thấp';
                return (
                  <motion.button
                    key={p}
                    type="button"
                    className={`composer-priority-pill priority-${p.toLowerCase()} ${isActive ? 'active' : ''}`}
                    onClick={() => setPriority(p)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    {isActive && <Check size={12} className="check-icon" />}
                    <span>{label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category & Deadline Grid */}
        <div className="composer-dual-grid">
          {/* Category Select */}
          <div className="composer-field-group">
            <label className="composer-field-label">
              <BookOpen size={12} className="inline-icon text-indigo-500" />
              <span>HỌC PHẦN / DANH MỤC</span>
            </label>
            <div className="composer-select-wrapper">
              <select
                className="composer-premium-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline Picker */}
          <div className="composer-field-group">
            <label className="composer-field-label">
              <CalendarIcon size={12} className="inline-icon text-orange-500" />
              <span>HẠN CHÓT NỘP BÀI (TÙY CHỌN)</span>
            </label>
            <div className="composer-date-wrapper">
              <input
                type="date"
                className="composer-premium-date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="composer-field-group">
          <div className="composer-label-row">
            <label className="composer-field-label">
              <Palette size={12} className="inline-icon text-pink-500" />
              <span>MÀU SẮC NHẬN DIỆN</span>
            </label>
            <span className="composer-color-hint">
              {color ? 'Màu tùy chỉnh' : `Kế thừa từ ${selectedCategory?.name ?? 'môn học'}`}
            </span>
          </div>

          <div className="composer-swatches-row">
            {COLOR_PALETTE.map((swatch) => {
              const isSelected = activeColor === swatch.hex;
              return (
                <motion.button
                  key={swatch.id}
                  type="button"
                  className={`composer-swatch-circle ${isSelected ? 'active' : ''}`}
                  style={{ backgroundColor: swatch.hex }}
                  onClick={() => setColor(swatch.hex)}
                  title={swatch.name}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isSelected && <Check size={12} className="swatch-check text-white" />}
                </motion.button>
              );
            })}
            {color && (
              <button
                type="button"
                className="composer-reset-color-btn"
                onClick={() => setColor(null)}
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="composer-premium-footer">
          <motion.button
            type="button"
            className="composer-cancel-btn"
            onClick={onCancel}
            disabled={submitting}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            Hủy
          </motion.button>

          <motion.button
            type="submit"
            className="composer-submit-btn"
            disabled={!title.trim() || submitting}
            whileHover={!title.trim() || submitting ? {} : { y: -1 }}
            whileTap={!title.trim() || submitting ? {} : { scale: 0.97 }}
          >
            <Sparkles size={14} />
            <span>{submitting ? 'Đang lưu...' : '+ Thêm vào danh sách'}</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
}
