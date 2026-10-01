import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Clock, SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Category, RecurrenceRule, UserLocation } from '../../../types/domain';
import type { EventInput } from '../../../services/eventApi';
import { RecurrenceEditor } from './RecurrenceEditor';
import { COLOR_PALETTE } from '../utils/colorPalette';
import { DEMO_CAMPUS_LOCATIONS } from '../mobility/campusRouting';
import { locationApi } from '../../../services/locationApi';

export const VIETNAMESE_DAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export const DURATION_PRESETS = [
  { label: '+15p', mins: 15 },
  { label: '+30p', mins: 30 },
  { label: '+45p', mins: 45 },
  { label: '+1h', mins: 60 },
  { label: '+1h30', mins: 90 },
  { label: '+2h', mins: 120 },
  { label: '+3h', mins: 180 },
];

/**
 * Format YYYY-MM-DD into Vietnamese standard DD/MM/YYYY
 */
export function toVnDateDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

/**
 * Format YYYY-MM-DD into "Thứ Sáu, 02/10/2026"
 */
export function formatVietnameseDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  const dayName = VIETNAMESE_DAYS[dateObj.getDay()] || '';
  return `${dayName}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function parseDateTimeParts(val?: string) {
  if (!val) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, hour: '08', minute: '00' };
  }
  const tIndex = val.indexOf('T');
  if (tIndex === -1) {
    return { date: val, hour: '08', minute: '00' };
  }
  const date = val.slice(0, tIndex);
  const timePart = val.slice(tIndex + 1);
  const [h, m] = timePart.split(':');
  return {
    date,
    hour: String(h || '08').padStart(2, '0').slice(0, 2),
    minute: String(m || '00').padStart(2, '0').slice(0, 2),
  };
}

export function toDateTimeString(date: string, hour: string | number, minute: string | number) {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${date}T${h}:${m}`;
}

export function calculateDurationMinutes(
  startDate: string,
  startHour: string,
  startMinute: string,
  endDate: string,
  endHour: string,
  endMinute: string
): number {
  try {
    const s = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
    const e = new Date(`${endDate}T${endHour}:${endMinute}:00`).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.round((e - s) / 60000);
  } catch {
    return 0;
  }
}

export function formatDurationText(
  durationMinutes: number,
  startHour: string,
  endHour: string,
  startMinute: string,
  endMinute: string
): string {
  if (durationMinutes <= 0) {
    if (startHour === endHour && startMinute === endMinute) return '0 phút';
    return 'Chưa hợp lệ (cần sau giờ bắt đầu)';
  }
  const h = Math.floor(durationMinutes / 60);
  const m = durationMinutes % 60;
  if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
  if (h > 0) return `${h} giờ`;
  return `${m} phút`;
}

export function shiftEndTime(startDate: string, startHour: string, startMinute: string, durationMinutes: number) {
  const newStartInstant = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
  const newEndInstant = new Date(newStartInstant + durationMinutes * 60000);

  const ey = newEndInstant.getFullYear();
  const em = String(newEndInstant.getMonth() + 1).padStart(2, '0');
  const ed = String(newEndInstant.getDate()).padStart(2, '0');
  const eh = String(newEndInstant.getHours()).padStart(2, '0');
  const emin = String(newEndInstant.getMinutes()).padStart(2, '0');

  return {
    endsAt: `${ey}-${em}-${ed}T${eh}:${emin}`,
    isMultiDay: `${ey}-${em}-${ed}` !== startDate,
    endHour: eh,
    endMinute: emin,
  };
}

export function clampEndTime(
  multiDay: boolean,
  startDate: string,
  endDate: string,
  startHour: string,
  startMinute: string,
  targetEndHour: string,
  targetEndMinute: string
) {
  if (!multiDay || startDate === endDate) {
    const sH = parseInt(startHour, 10);
    const sM = parseInt(startMinute, 10);
    let eH = parseInt(targetEndHour, 10);
    let eM = parseInt(targetEndMinute, 10);

    if (eH < sH) {
      eH = sH;
      if (eM < sM) {
        eM = sM;
      }
    } else if (eH === sH && eM < sM) {
      eM = sM;
    }

    return {
      hour: String(eH).padStart(2, '0'),
      minute: String(eM).padStart(2, '0'),
    };
  }

  return {
    hour: targetEndHour,
    minute: targetEndMinute,
  };
}

/**
 * Robust Vietnamese Date Picker component:
 * Displays guaranteed DD/MM/YYYY text across all OS/browser locales.
 * Invokes native date picker on desktop/mobile upon click.
 */
function VietnameseDatePicker({
  value,
  onChange,
  min,
  id,
  hasError,
  label,
}: {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  min?: string;
  id?: string;
  hasError?: boolean;
  label?: string;
}) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const displayDate = useMemo(() => toVnDateDisplay(value), [value]);

  const handleOpenPicker = () => {
    if (hiddenInputRef.current) {
      try {
        hiddenInputRef.current.showPicker?.();
      } catch {
        hiddenInputRef.current.focus();
      }
    }
  };

  return (
    <div
      className={`vn-date-input-container ${hasError ? 'has-error' : ''}`}
      onClick={handleOpenPicker}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenPicker();
        }
      }}
      aria-label={label || 'Chọn ngày'}
    >
      <span className="vn-date-formatted-val">{displayDate || 'DD/MM/YYYY'}</span>
      <span className="vn-date-calendar-icon" aria-hidden="true">
        <Calendar size={15} />
      </span>
      {/* Invisible overlay input for native browser / mobile wheel picker */}
      <input
        ref={hiddenInputRef}
        type="date"
        id={id}
        className="vn-date-native-overlay"
        value={value}
        min={min}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
          }
        }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

export function EventForm({
  form,
  categories,
  timeZone,
  onChange,
  onSave,
  onCancel,
}: {
  form: EventInput;
  categories: Category[];
  timeZone: string;
  onChange: (
    key: keyof EventInput,
    value: string | boolean | number | RecurrenceRule | null | undefined
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [showMore, setShowMore] = useState(
    Boolean(form.location || form.locationId || form.notes || form.recurrence || form.color)
  );

  const [touchedTitle, setTouchedTitle] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Track initial state to detect unsaved changes
  const initialTitleRef = useRef(form.title);
  const initialLocationRef = useRef(form.location);
  const initialNotesRef = useRef(form.notes);

  const isDirty = useMemo(() => {
    return (
      form.title !== initialTitleRef.current ||
      (form.location ?? '') !== (initialLocationRef.current ?? '') ||
      (form.notes ?? '') !== (initialNotesRef.current ?? '')
    );
  }, [form.title, form.location, form.notes]);

  const handleDismiss = useCallback(() => {
    if (isDirty && form.title.trim().length > 0) {
      if (window.confirm('Bạn có muốn bỏ thay đổi chưa lưu không?')) {
        onCancel();
      }
    } else {
      onCancel();
    }
  }, [isDirty, form.title, onCancel]);

  // Click outside backdrop to dismiss
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleDismiss();
    }
  };

  // Keyboard Escape support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  const isOnline = useMemo(() => {
    return (
      form.locationId === '10000000-0000-0000-0000-000000000007' ||
      (form.location?.toLowerCase().includes('online') ?? false) ||
      (form.location?.toLowerCase().includes('virtual') ?? false)
    );
  }, [form.locationId, form.location]);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  useEffect(() => {
    locationApi
      .list()
      .then((data) => {
        if (data && data.length > 0) {
          setUserLocations(data);
        }
      })
      .catch(() => {});
  }, []);

  // Parse start and end time parts
  const startParts = useMemo(() => parseDateTimeParts(form.startsAt), [form.startsAt]);
  const endParts = useMemo(() => parseDateTimeParts(form.endsAt), [form.endsAt]);

  const startDate = startParts.date;
  const startHour = startParts.hour;
  const startMinute = startParts.minute;

  const endDate = endParts.date;
  const endHour = endParts.hour;
  const endMinute = endParts.minute;

  const [multiDay, setMultiDay] = useState(startDate !== endDate);
  useEffect(() => {
    if (startDate !== endDate) {
      setMultiDay(true);
    }
  }, [startDate, endDate]);

  const isAllDay = startHour === '00' && startMinute === '00' && endHour === '23' && endMinute === '59';

  // Stash last used normal start/end times when switching to all-day mode
  const prevTimesRef = useRef<{ start: string; end: string }>({
    start: '08:00',
    end: '09:00',
  });

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const isPastTime = useMemo(() => {
    try {
      const e = new Date(`${endDate}T${endHour}:${endMinute}:00`).getTime();
      return !isNaN(e) && e < Date.now() - 60000;
    } catch {
      return false;
    }
  }, [endDate, endHour, endMinute]);

  // Invalid when end time <= start time on the same day
  const isTimeOrderInvalid = useMemo(() => {
    if (!multiDay || startDate === endDate) {
      const s = parseInt(startHour, 10) * 60 + parseInt(startMinute, 10);
      const e = parseInt(endHour, 10) * 60 + parseInt(endMinute, 10);
      return e <= s;
    }
    return false;
  }, [multiDay, startDate, endDate, startHour, startMinute, endHour, endMinute]);

  // Invalid when multiDay is true and endDate < startDate
  const isMultiDayOrderInvalid = useMemo(() => {
    if (multiDay) {
      return endDate < startDate;
    }
    return false;
  }, [multiDay, startDate, endDate]);

  // Ref tracking last known valid duration (default 60 mins)
  const lastDurationRef = useRef<number>(60);

  // Duration in minutes
  const durationMinutes = useMemo(() => {
    return calculateDurationMinutes(startDate, startHour, startMinute, endDate, endHour, endMinute);
  }, [startDate, startHour, startMinute, endDate, endHour, endMinute]);

  useEffect(() => {
    if (durationMinutes > 0 && !isTimeOrderInvalid) {
      lastDurationRef.current = durationMinutes;
    }
  }, [durationMinutes, isTimeOrderInvalid]);

  const durationText = useMemo(() => {
    if (isTimeOrderInvalid) {
      return 'Chưa hợp lệ (cần sau giờ bắt đầu)';
    }
    return formatDurationText(durationMinutes, startHour, endHour, startMinute, endMinute);
  }, [isTimeOrderInvalid, durationMinutes, startHour, endHour, startMinute, endMinute]);

  // 1. Sửa lỗi ngày tháng: Handlers
  const handleStartDateChange = (newDate: string) => {
    const updatedStart = toDateTimeString(newDate, startHour, startMinute);
    onChange('startsAt', updatedStart);
    if (!multiDay) {
      const updatedEnd = toDateTimeString(newDate, endHour, endMinute);
      onChange('endsAt', updatedEnd);
    } else {
      if (newDate > endDate) {
        onChange('endsAt', toDateTimeString(newDate, endHour, endMinute));
      }
    }
  };

  const handleEndDateChange = (newDate: string) => {
    onChange('endsAt', toDateTimeString(newDate, endHour, endMinute));
  };

  const setToday = () => {
    handleStartDateChange(todayStr);
  };

  const setTomorrow = () => {
    handleStartDateChange(tomorrowStr);
  };

  // 2. Sửa phần chọn giờ & Tự động tịnh tiến thời gian (Time Shifting)
  const handleStartTimeChange = (newTime: string) => {
    if (!newTime) return;
    const [nh, nm] = newTime.split(':');
    if (!nh || !nm) return;

    const curDur = durationMinutes > 0 ? durationMinutes : (lastDurationRef.current || 60);
    const sInstant = new Date(`${startDate}T${nh}:${nm}:00`).getTime();
    const eInstant = new Date(sInstant + curDur * 60000);

    const ey = eInstant.getFullYear();
    const em = String(eInstant.getMonth() + 1).padStart(2, '0');
    const ed = String(eInstant.getDate()).padStart(2, '0');
    const eh = String(eInstant.getHours()).padStart(2, '0');
    const emin = String(eInstant.getMinutes()).padStart(2, '0');

    onChange('startsAt', `${startDate}T${nh}:${nm}`);
    onChange('endsAt', `${ey}-${em}-${ed}T${eh}:${emin}`);
    if (`${ey}-${em}-${ed}` !== startDate) {
      setMultiDay(true);
    }
  };

  const handleEndTimeChange = (newTime: string) => {
    if (!newTime) return;
    const [nh, nm] = newTime.split(':');
    if (!nh || !nm) return;

    onChange('endsAt', `${endDate}T${nh}:${nm}`);

    // Update last known duration if valid
    const sInstant = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
    const eInstant = new Date(`${endDate}T${nh}:${nm}:00`).getTime();
    if (!isNaN(sInstant) && !isNaN(eInstant) && eInstant > sInstant) {
      const diffMins = Math.round((eInstant - sInstant) / 60000);
      lastDurationRef.current = diffMins;
    }
  };

  // 3. Quản lý thời lượng thông minh: Các nút cộng nhanh
  const handleDurationPreset = (minutesToAdd: number) => {
    lastDurationRef.current = minutesToAdd;
    const sInstant = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
    const eInstant = new Date(sInstant + minutesToAdd * 60000);

    const ey = eInstant.getFullYear();
    const em = String(eInstant.getMonth() + 1).padStart(2, '0');
    const ed = String(eInstant.getDate()).padStart(2, '0');
    const eh = String(eInstant.getHours()).padStart(2, '0');
    const emin = String(eInstant.getMinutes()).padStart(2, '0');

    onChange('endsAt', `${ey}-${em}-${ed}T${eh}:${emin}`);
    if (`${ey}-${em}-${ed}` !== startDate) {
      setMultiDay(true);
    }
  };

  // 5. Xử lý "Cả ngày"
  const toggleAllDay = (checked: boolean) => {
    if (checked) {
      if (startHour !== '00' || endHour !== '23') {
        prevTimesRef.current = {
          start: `${startHour}:${startMinute}`,
          end: `${endHour}:${endMinute}`,
        };
      }
      onChange('startsAt', toDateTimeString(startDate, '00', '00'));
      onChange('endsAt', toDateTimeString(endDate, '23', '59'));
    } else {
      const prev = prevTimesRef.current;
      onChange('startsAt', toDateTimeString(startDate, prev.start.slice(0, 2), prev.start.slice(3, 5)));
      onChange('endsAt', toDateTimeString(endDate, prev.end.slice(0, 2), prev.end.slice(3, 5)));
    }
  };

  // 6. Xử lý "Nhiều ngày"
  const toggleMultiDay = (checked: boolean) => {
    setMultiDay(checked);
    if (!checked) {
      onChange('endsAt', toDateTimeString(startDate, endHour, endMinute));
    }
  };

  const isTitleEmpty = !form.title.trim();
  const showTitleError = (touchedTitle || submitAttempted) && isTitleEmpty;
  const canSave = !isTitleEmpty && !isPastTime && !isTimeOrderInvalid && !isMultiDayOrderInvalid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (isTitleEmpty || isPastTime || isTimeOrderInvalid || isMultiDayOrderInvalid) {
      return;
    }
    onSave();
  };

  const hasAdvancedConfigured = Boolean(
    form.location || form.locationId || form.notes || form.recurrence || form.color
  );

  return (
    <div
      className="event-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
    >
      <div className="event-modal-box" onClick={(e) => e.stopPropagation()}>
        <form className="event-modal-form" onSubmit={handleSubmit} noValidate>
          {/* 1. Header: Tiêu đề "Tạo sự kiện mới" & Nút đóng "X" góc trên cùng bên phải */}
          <div className="compact-panel-heading">
            <div className="panel-heading-text">
              <p className="eyebrow">{form.title ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</p>
              <h3 id="event-modal-title" className="form-heading-title">
                {form.title.trim() || 'Chưa đặt tên'}
              </h3>
              <p className="form-heading-desc">
                Lịch cố định không đổi. AI sẽ tự động xếp giờ học xoay quanh sự kiện này.
              </p>
            </div>
            <button
              type="button"
              className="icon-close-btn"
              onClick={handleDismiss}
              aria-label="Đóng biểu mẫu"
              title="Đóng (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2. Bố cục dọc: Input Tên sự kiện chiếm 100% chiều rộng */}
          <div className="form-field-group">
            <div className="field-label-row">
              <label htmlFor="event-form-title" className="field-label">
                Tên sự kiện <span className="required-star">*</span>
              </label>
              <span className="field-char-counter">{form.title.length}/100</span>
            </div>
            <input
              id="event-form-title"
              autoFocus
              type="text"
              maxLength={100}
              className={`form-text-input ${showTitleError ? 'input-error' : ''}`}
              value={form.title}
              onBlur={() => setTouchedTitle(true)}
              onChange={(e) => {
                onChange('title', e.target.value);
                if (e.target.value.trim()) {
                  setTouchedTitle(false);
                }
              }}
              placeholder="Ví dụ: Giảng đường CS101, Họp nhóm Đồ án..."
              required
            />
            {showTitleError && <span className="field-error-text">Vui lòng nhập tên sự kiện.</span>}
          </div>

          {/* 3. Khu vực Ngày / Giờ căn chỉnh gọn trong khối Modal */}
          <div className="compact-time-controller">
            <div className="date-selection-section">
              {!multiDay ? (
                /* Chế độ 1 ngày */
                <div className="date-field-col">
                  <div className="date-field-header">
                    <span className="field-title">Ngày diễn ra</span>
                    <div className="date-quick-chips">
                      <button
                        type="button"
                        className={`date-chip-btn ${startDate === todayStr ? 'active' : ''}`}
                        onClick={setToday}
                      >
                        Hôm nay
                      </button>
                      <button
                        type="button"
                        className={`date-chip-btn ${startDate === tomorrowStr ? 'active' : ''}`}
                        onClick={setTomorrow}
                      >
                        Ngày mai
                      </button>
                    </div>
                  </div>
                  <div className="vn-datepicker-weekday-badge">{formatVietnameseDate(startDate)}</div>
                  <VietnameseDatePicker
                    value={startDate}
                    onChange={handleStartDateChange}
                    min={todayStr}
                    id="event-start-date"
                    label="Ngày diễn ra"
                  />
                </div>
              ) : (
                /* Chế độ nhiều ngày: Chuyển sang Ngày bắt đầu và Ngày kết thúc riêng biệt */
                <div className="multi-date-grid">
                  <div className="date-field-col">
                    <div className="date-field-header">
                      <span className="field-title">Ngày bắt đầu</span>
                      <div className="date-quick-chips">
                        <button
                          type="button"
                          className={`date-chip-btn ${startDate === todayStr ? 'active' : ''}`}
                          onClick={setToday}
                        >
                          Hôm nay
                        </button>
                        <button
                          type="button"
                          className={`date-chip-btn ${startDate === tomorrowStr ? 'active' : ''}`}
                          onClick={setTomorrow}
                        >
                          Ngày mai
                        </button>
                      </div>
                    </div>
                    <div className="vn-datepicker-weekday-badge">{formatVietnameseDate(startDate)}</div>
                    <VietnameseDatePicker
                      value={startDate}
                      onChange={handleStartDateChange}
                      min={todayStr}
                      id="event-multi-start-date"
                      label="Ngày bắt đầu"
                    />
                  </div>

                  <div className="date-field-col">
                    <div className="date-field-header">
                      <span className="field-title">Ngày kết thúc</span>
                    </div>
                    <div className="vn-datepicker-weekday-badge">{formatVietnameseDate(endDate)}</div>
                    <VietnameseDatePicker
                      value={endDate}
                      onChange={handleEndDateChange}
                      min={startDate}
                      id="event-multi-end-date"
                      label="Ngày kết thúc"
                      hasError={isMultiDayOrderInvalid}
                    />
                    {isMultiDayOrderInvalid && (
                      <span className="field-error-text">Ngày kết thúc phải từ ngày bắt đầu trở đi.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Toggles: Cả ngày & Nhiều ngày */}
              <div className="event-date-toggles">
                <label className="custom-toggle-label">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => toggleAllDay(e.target.checked)}
                  />
                  <span>Cả ngày</span>
                </label>

                <label className="custom-toggle-label">
                  <input
                    type="checkbox"
                    checked={multiDay}
                    onChange={(e) => toggleMultiDay(e.target.checked)}
                  />
                  <span>Nhiều ngày</span>
                </label>
              </div>
            </div>

            {/* Xử lý "Cả ngày": Ẩn/disable chọn giờ, hiển thị banner trạng thái */}
            {isAllDay ? (
              <div className="all-day-status-card">
                <span className="all-day-icon">☀️</span>
                <div className="all-day-text">
                  <strong>Sự kiện diễn ra cả ngày (00:00 – 23:59)</strong>
                  <span>Thời gian tự học sẽ được tự động xếp tránh ngày này.</span>
                </div>
              </div>
            ) : (
              <>
                {/* Một cách chọn giờ duy nhất Bắt đầu [ 01:22 ] Kết thúc [ 02:22 ] */}
                <div className="time-selection-grid">
                  <div className="time-field-group">
                    <label htmlFor="event-start-time" className="time-field-label">
                      Bắt đầu
                    </label>
                    <div className="time-input-wrap">
                      <input
                        id="event-start-time"
                        type="time"
                        className="time-digital-input"
                        value={`${startHour}:${startMinute}`}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker?.();
                          } catch {}
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="time-field-group">
                    <label htmlFor="event-end-time" className="time-field-label">
                      Kết thúc
                    </label>
                    <div className="time-input-wrap">
                      <input
                        id="event-end-time"
                        type="time"
                        className={`time-digital-input ${isTimeOrderInvalid ? 'has-error' : ''}`}
                        value={`${endHour}:${endMinute}`}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker?.();
                          } catch {}
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Xử lý thời gian không hợp lệ: Hiển thị lỗi trực tiếp */}
                {isTimeOrderInvalid && (
                  <div className="field-inline-error">
                    ⚠️ Thời gian kết thúc phải sau thời gian bắt đầu.
                  </div>
                )}

                {/* Quản lý thời lượng thông minh: Tự tính thời lượng & Các nút cộng nhanh */}
                <div className="duration-control-section">
                  <div className="duration-header-row">
                    <span className="duration-section-label">Thời lượng:</span>
                    <span
                      className={`duration-badge ${
                        isTimeOrderInvalid || durationMinutes <= 0 ? 'invalid' : ''
                      }`}
                    >
                      {durationText}
                    </span>
                  </div>

                  <div className="quick-duration-chips">
                    <span className="quick-chips-prefix">Cộng nhanh:</span>
                    {DURATION_PRESETS.map((pill) => (
                      <button
                        type="button"
                        key={pill.label}
                        className={`duration-chip-btn ${
                          durationMinutes === pill.mins && !isTimeOrderInvalid ? 'active' : ''
                        }`}
                        onClick={() => handleDurationPreset(pill.mins)}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 4. Tùy chọn nâng cao dạng Accordion */}
          <div className="advanced-accordion-wrapper">
            <button
              type="button"
              className={`form-advanced-accordion-btn ${showMore ? 'open' : ''}`}
              onClick={() => setShowMore((prev) => !prev)}
              aria-expanded={showMore}
            >
              <div className="accordion-label-wrap">
                <SlidersHorizontal size={14} className="accordion-icon" />
                <span className="accordion-title">Tùy chọn nâng cao</span>
                {hasAdvancedConfigured && !showMore && (
                  <span className="accordion-dot" title="Có tùy chọn đã thiết lập">
                    ●
                  </span>
                )}
              </div>
              <span className="accordion-chevron" aria-hidden="true">
                {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>

            {showMore && (
              <div className="form-secondary-fields">
                {/* Địa điểm */}
                <div className="location-control-section">
                  <div className="location-control-header">
                    <span className="location-control-label">Địa điểm (không bắt buộc)</span>
                    <label className="custom-toggle-label inline-toggle">
                      <input
                        type="checkbox"
                        checked={isOnline}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange('location', 'Online / Virtual');
                            onChange('locationId', '10000000-0000-0000-0000-000000000007');
                          } else {
                            onChange('location', '');
                            onChange('locationId', null);
                          }
                        }}
                      />
                      <span>Sự kiện trực tuyến (Online)</span>
                    </label>
                  </div>

                  <div className="location-input-row">
                    <input
                      type="text"
                      className="form-text-input"
                      value={form.location ?? ''}
                      disabled={isOnline}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange('location', val);
                        const matched =
                          userLocations.find((l) => l.name.toLowerCase() === val.trim().toLowerCase()) ||
                          DEMO_CAMPUS_LOCATIONS.find((l) => l.name.toLowerCase() === val.trim().toLowerCase());
                        onChange('locationId', matched ? matched.id : null);
                      }}
                      placeholder={
                        isOnline
                          ? 'Sự kiện trực tuyến qua mạng'
                          : 'Ví dụ: Nhà riêng, Tòa nhà Alpha, Quán cafe...'
                      }
                    />
                    {Boolean(form.location) && !isOnline && (
                      <button
                        type="button"
                        className="quick-clear-text-btn"
                        onClick={() => {
                          onChange('location', '');
                          onChange('locationId', null);
                        }}
                        title="Xóa địa điểm"
                      >
                        Xóa
                      </button>
                    )}
                  </div>

                  {!isOnline && (
                    <div className="campus-chips-row">
                      <span className="campus-chips-hint">Địa điểm đã lưu:</span>
                      <div className="campus-chip-list">
                        {(userLocations.length > 0
                          ? userLocations
                          : DEMO_CAMPUS_LOCATIONS.filter((l) => l.type === 'CAMPUS')
                        ).map((loc) => {
                          const isSelected = form.locationId === loc.id || form.location === loc.name;
                          return (
                            <button
                              type="button"
                              key={loc.id}
                              className={`campus-chip-btn ${isSelected ? 'active' : ''}`}
                              onClick={() => {
                                if (isSelected) {
                                  onChange('location', '');
                                  onChange('locationId', null);
                                } else {
                                  onChange('location', loc.name);
                                  onChange('locationId', loc.id);
                                }
                              }}
                            >
                              {loc.name.replace('Campus ', '')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Danh mục & Mức ưu tiên */}
                <div className="two-col-grid">
                  <label className="field">
                    <span>Danh mục</span>
                    <select
                      value={form.categoryId ?? ''}
                      onChange={(e) => onChange('categoryId', e.target.value || null)}
                    >
                      <option value="">Không phân loại</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Mức ưu tiên</span>
                    <select
                      value={form.priority}
                      onChange={(e) => onChange('priority', e.target.value)}
                    >
                      <option value="LOW">Thấp (LOW)</option>
                      <option value="MEDIUM">Trung bình (MEDIUM)</option>
                      <option value="HIGH">Cao (HIGH)</option>
                      <option value="URGENT">Khẩn cấp (URGENT)</option>
                    </select>
                  </label>
                </div>

                {/* Màu sắc sự kiện */}
                <div className="field">
                  <div className="compact-color-label-row">
                    <span>Màu sắc sự kiện</span>
                    {form.color && (
                      <button
                        type="button"
                        className="compact-reset-color-btn"
                        onClick={() => onChange('color', null)}
                      >
                        Về màu {selectedCategory ? selectedCategory.name : 'mặc định'}
                      </button>
                    )}
                  </div>
                  <div className="color-swatch-list">
                    {COLOR_PALETTE.map((swatch) => (
                      <button
                        type="button"
                        key={swatch.id}
                        className={`color-swatch-btn ${form.color === swatch.hex ? 'active' : ''}`}
                        style={{ backgroundColor: swatch.hex }}
                        onClick={() => onChange('color', swatch.hex)}
                        title={swatch.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Trạng thái */}
                <label className="field">
                  <span>Trạng thái</span>
                  <select
                    value={form.status}
                    onChange={(e) => onChange('status', e.target.value)}
                  >
                    <option value="SCHEDULED">Đã xếp lịch (SCHEDULED)</option>
                    <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
                    <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                  </select>
                </label>

                {/* Lặp lại */}
                <RecurrenceEditor
                  value={form.recurrence ?? null}
                  onChange={(v) => onChange('recurrence', v)}
                />

                {/* Ghi chú */}
                <label className="field">
                  <span>Ghi chú</span>
                  <textarea
                    value={form.notes ?? ''}
                    onChange={(e) => onChange('notes', e.target.value)}
                    placeholder="Ghi chú bài học, tài liệu, liên kết..."
                    rows={3}
                  />
                </label>

                {/* Khóa cố định sự kiện */}
                <label className="check-row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={form.locked}
                    onChange={(e) => onChange('locked', e.target.checked)}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    Khóa cố định sự kiện (Hệ thống AI không tự ý di chuyển)
                  </span>
                </label>
              </div>
            )}
          </div>

          {isPastTime && (
            <div className="field-inline-error">
              ⚠️ Không thể đặt lịch vào ngày hoặc giờ đã qua. Vui lòng chọn thời gian trong tương lai.
            </div>
          )}

          {/* 5. Nút Hành động: Nhóm "Hủy" và "Lưu sự kiện" dồn về góc dưới cùng bên phải Modal */}
          <div className="event-modal-actions">
            <button type="button" className="secondary-button" onClick={handleDismiss}>
              Hủy
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!canSave}
              title={!canSave ? 'Vui lòng kiểm tra lại thông tin sự kiện' : 'Lưu sự kiện'}
            >
              Lưu sự kiện
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
