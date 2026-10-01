import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Category, RecurrenceRule, UserLocation } from '../../../types/domain';
import type { EventInput } from '../../../services/eventApi';
import { RecurrenceEditor } from './RecurrenceEditor';
import { COLOR_PALETTE } from '../utils/colorPalette';
import { DEMO_CAMPUS_LOCATIONS } from '../mobility/campusRouting';
import { locationApi } from '../../../services/locationApi';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_PRESETS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const VIETNAMESE_DAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function formatVietnameseDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  const dayName = VIETNAMESE_DAYS[dateObj.getDay()] || '';
  return `${dayName}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function parseDateTimeParts(val?: string) {
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

function toDateTimeString(date: string, hour: string | number, minute: string | number) {
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${date}T${h}:${m}`;
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
    locationApi.list().then((data) => {
      if (data && data.length > 0) {
        setUserLocations(data);
      }
    }).catch(() => {});
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

  const todayStr = useMemo(() => {
    const d = new Date();
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

  const isTimeOrderInvalid = useMemo(() => {
    try {
      const s = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
      const e = new Date(`${endDate}T${endHour}:${endMinute}:00`).getTime();
      return !isNaN(s) && !isNaN(e) && e < s;
    } catch {
      return false;
    }
  }, [startDate, startHour, startMinute, endDate, endHour, endMinute]);

  // Ref tracking last known valid positive duration (default 60 mins)
  const lastDurationRef = useRef<number>(60);

  // Duration in minutes
  const durationMinutes = useMemo(() => {
    try {
      const s = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
      const e = new Date(`${endDate}T${endHour}:${endMinute}:00`).getTime();
      if (isNaN(s) || isNaN(e) || e < s) return 0;
      return Math.round((e - s) / 60000);
    } catch {
      return 0;
    }
  }, [startDate, startHour, startMinute, endDate, endHour, endMinute]);

  // Keep lastDurationRef updated whenever duration is strictly positive
  useEffect(() => {
    if (durationMinutes > 0) {
      lastDurationRef.current = durationMinutes;
    }
  }, [durationMinutes]);

  const durationText = useMemo(() => {
    if (startDate === endDate && !multiDay && (parseInt(endHour, 10) < parseInt(startHour, 10) || (parseInt(endHour, 10) === parseInt(startHour, 10) && parseInt(endMinute, 10) < parseInt(startMinute, 10)))) {
      return 'Chưa hợp lệ (cần sau giờ bắt đầu)';
    }
    if (durationMinutes <= 0) {
      if (startHour === endHour && startMinute === endMinute) return '0 phút';
      return 'Chưa hợp lệ (cần sau giờ bắt đầu)';
    }
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
  }, [durationMinutes, startDate, endDate, multiDay, startHour, startMinute, endHour, endMinute]);

  // Date handlers
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
    const validEndDate = newDate < startDate ? startDate : newDate;
    if (validEndDate === startDate) {
      const sh = parseInt(startHour, 10);
      const sm = parseInt(startMinute, 10);
      let eh = parseInt(endHour, 10);
      let em = parseInt(endMinute, 10);
      if (eh < sh || (eh === sh && em < sm)) {
        eh = sh;
        em = sm;
      }
      onChange('endsAt', toDateTimeString(validEndDate, String(eh).padStart(2, '0'), String(em).padStart(2, '0')));
      return;
    }
    onChange('endsAt', toDateTimeString(validEndDate, endHour, endMinute));
  };

  const setToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    handleStartDateChange(`${yyyy}-${mm}-${dd}`);
  };

  const setTomorrow = () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const yyyy = tmr.getFullYear();
    const mm = String(tmr.getMonth() + 1).padStart(2, '0');
    const dd = String(tmr.getDate()).padStart(2, '0');
    handleStartDateChange(`${yyyy}-${mm}-${dd}`);
  };

  // 2. Tự động tịnh tiến thời gian (Time Shifting)
  const handleStartHourChange = (newHour: string) => {
    const currentDur = durationMinutes > 0 ? durationMinutes : (lastDurationRef.current || 60);
    const newStartInstant = new Date(`${startDate}T${newHour}:${startMinute}:00`).getTime();
    const newEndInstant = new Date(newStartInstant + currentDur * 60000);

    const ey = newEndInstant.getFullYear();
    const em = String(newEndInstant.getMonth() + 1).padStart(2, '0');
    const ed = String(newEndInstant.getDate()).padStart(2, '0');
    const eh = String(newEndInstant.getHours()).padStart(2, '0');
    const emin = String(newEndInstant.getMinutes()).padStart(2, '0');

    onChange('startsAt', `${startDate}T${newHour}:${startMinute}`);
    onChange('endsAt', `${ey}-${em}-${ed}T${eh}:${emin}`);
    if (`${ey}-${em}-${ed}` !== startDate) {
      setMultiDay(true);
    }
  };

  const handleStartMinuteChange = (val: string | number) => {
    let cleanMin = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(cleanMin)) cleanMin = 0;
    cleanMin = Math.max(0, Math.min(59, cleanMin));
    const formattedMin = String(cleanMin).padStart(2, '0');

    const currentDur = durationMinutes > 0 ? durationMinutes : (lastDurationRef.current || 60);
    const newStartInstant = new Date(`${startDate}T${startHour}:${formattedMin}:00`).getTime();
    const newEndInstant = new Date(newStartInstant + currentDur * 60000);

    const ey = newEndInstant.getFullYear();
    const em = String(newEndInstant.getMonth() + 1).padStart(2, '0');
    const ed = String(newEndInstant.getDate()).padStart(2, '0');
    const eh = String(newEndInstant.getHours()).padStart(2, '0');
    const emin = String(newEndInstant.getMinutes()).padStart(2, '0');

    onChange('startsAt', `${startDate}T${startHour}:${formattedMin}`);
    onChange('endsAt', `${ey}-${em}-${ed}T${eh}:${emin}`);
    if (`${ey}-${em}-${ed}` !== startDate) {
      setMultiDay(true);
    }
  };

  // 3. Ngăn chặn lỗi logic "Xuyên không" (Anti-Time Travel Logic)
  const handleEndHourChange = (newHour: string) => {
    if (!multiDay || startDate === endDate) {
      const sH = parseInt(startHour, 10);
      const sM = parseInt(startMinute, 10);
      let eH = parseInt(newHour, 10);
      let eM = parseInt(endMinute, 10);

      if (eH < sH) {
        eH = sH;
        if (eM < sM) {
          eM = sM;
        }
      } else if (eH === sH && eM < sM) {
        eM = sM;
      }

      const clampedHour = String(eH).padStart(2, '0');
      const clampedMin = String(eM).padStart(2, '0');
      onChange('endsAt', toDateTimeString(endDate, clampedHour, clampedMin));
      return;
    }
    onChange('endsAt', toDateTimeString(endDate, newHour, endMinute));
  };

  const handleEndMinuteChange = (val: string | number) => {
    let cleanMin = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(cleanMin)) cleanMin = 0;
    cleanMin = Math.max(0, Math.min(59, cleanMin));

    if (!multiDay || startDate === endDate) {
      const sH = parseInt(startHour, 10);
      const sM = parseInt(startMinute, 10);
      const eH = parseInt(endHour, 10);

      if (eH === sH && cleanMin < sM) {
        cleanMin = sM;
      } else if (eH < sH) {
        const clampedHour = String(sH).padStart(2, '0');
        const clampedMin = String(Math.max(sM, cleanMin)).padStart(2, '0');
        onChange('endsAt', toDateTimeString(endDate, clampedHour, clampedMin));
        return;
      }
    }
    const formattedMin = String(cleanMin).padStart(2, '0');
    onChange('endsAt', toDateTimeString(endDate, endHour, formattedMin));
  };

  // 1. Chiều ngược (Cộng nhanh tính ra giờ kết thúc)
  const applyQuickDuration = (minutesToAdd: number) => {
    const sTime = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
    const eTime = new Date(sTime + minutesToAdd * 60000);

    const ey = eTime.getFullYear();
    const em = String(eTime.getMonth() + 1).padStart(2, '0');
    const ed = String(eTime.getDate()).padStart(2, '0');
    const eh = String(eTime.getHours()).padStart(2, '0');
    const emin = String(eTime.getMinutes()).padStart(2, '0');

    lastDurationRef.current = minutesToAdd;
    onChange('endsAt', `${ey}-${em}-${ed}T${eh}:${emin}`);
    if (`${ey}-${em}-${ed}` !== startDate) {
      setMultiDay(true);
    }
  };

  const toggleAllDay = (checked: boolean) => {
    if (checked) {
      onChange('startsAt', toDateTimeString(startDate, '00', '00'));
      onChange('endsAt', toDateTimeString(endDate, '23', '59'));
    } else {
      onChange('startsAt', toDateTimeString(startDate, '08', '00'));
      onChange('endsAt', toDateTimeString(endDate, '09', '00'));
    }
  };

  const toggleMultiDay = (checked: boolean) => {
    setMultiDay(checked);
    if (!checked) {
      let eh = parseInt(endHour, 10);
      let em = parseInt(endMinute, 10);
      const sh = parseInt(startHour, 10);
      const sm = parseInt(startMinute, 10);

      if (eh < sh || (eh === sh && em < sm)) {
        const curDur = lastDurationRef.current > 0 ? lastDurationRef.current : 60;
        const sTime = new Date(`${startDate}T${startHour}:${startMinute}:00`).getTime();
        const eTime = new Date(Math.min(
          sTime + curDur * 60000,
          new Date(`${startDate}T23:59:00`).getTime()
        ));
        const newEh = String(eTime.getHours()).padStart(2, '0');
        const newEm = String(eTime.getMinutes()).padStart(2, '0');
        onChange('endsAt', toDateTimeString(startDate, newEh, newEm));
      } else {
        onChange('endsAt', toDateTimeString(startDate, endHour, endMinute));
      }
    }
  };

  return (
    <form
      className="panel event-form redesigned-event-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (isPastTime) return;
        onSave();
      }}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{form.title ? 'Chỉnh sửa sự kiện' : 'Sự kiện mới'}</p>
          <h3>{form.title || 'Chưa đặt tên'}</h3>
        </div>
        <button type="button" className="text-close-btn" onClick={onCancel} aria-label="Đóng biểu mẫu">
          Đóng
        </button>
      </div>

      <p className="muted" style={{ fontSize: 11 }}>
        Sự kiện thể hiện lịch học hoặc cam kết cố định. Hệ thống sẽ tự động xếp thời gian tự học xoay quanh các sự kiện này.
      </p>

      {/* Primary Fields */}
      <div className="form-primary-fields">
        <label className="field">
          <span>Tên sự kiện</span>
          <input
            autoFocus
            type="text"
            value={form.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Ví dụ: Giảng đường CS101, Họp nhóm Đồ án..."
            required
          />
        </label>

        {/* Compact, Deeply Customizable Time & Date Controller */}
        <div className="compact-time-controller">
          {/* Date Selector Row */}
          <div className="time-ctrl-date-row">
            <div className="time-ctrl-date-main">
              <div className="time-ctrl-label-group">
                <span className="time-ctrl-label">Ngày diễn ra</span>
                <span className="time-ctrl-date-readable">{formatVietnameseDate(startDate)}</span>
              </div>
              <div className="time-ctrl-date-input-wrap">
                <input
                  type="date"
                  className="clean-date-input"
                  min={todayStr}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {}
                  }}
                  required
                />
                <div className="date-quick-chips">
                  <button type="button" className="date-chip-btn" onClick={setToday}>
                    Hôm nay
                  </button>
                  <button type="button" className="date-chip-btn" onClick={setTomorrow}>
                    Ngày mai
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="time-ctrl-toggles">
              <label className="time-ctrl-checkbox">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => toggleAllDay(e.target.checked)}
                />
                <span>Cả ngày</span>
              </label>

              <label className="time-ctrl-checkbox">
                <input
                  type="checkbox"
                  checked={multiDay}
                  onChange={(e) => toggleMultiDay(e.target.checked)}
                />
                <span>Nhiều ngày</span>
              </label>
            </div>

            {/* Multi-day End Date */}
            {multiDay && (
              <div className="time-ctrl-end-date-wrap">
                <div className="time-ctrl-label-group">
                  <span className="time-ctrl-label">Đến ngày</span>
                  <span className="time-ctrl-date-readable">{formatVietnameseDate(endDate)}</span>
                </div>
                <input
                  type="date"
                  className="clean-date-input"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker?.();
                    } catch {}
                  }}
                  required
                />
              </div>
            )}
          </div>

          {/* Granular Hour & Minute Controls */}
          {!isAllDay && (
            <div className="time-ctrl-clock-grid">
              {/* Start Time Section */}
              <div className="time-block-column">
                <div className="time-block-header">
                  <span className="time-block-tag">Bắt đầu (Từ)</span>
                  <span className="time-block-digital">{startHour}:{startMinute}</span>
                </div>
                <div className="time-unit-controls">
                  <div className="time-unit-item">
                    <span className="time-unit-caption">Giờ</span>
                    <select
                      value={startHour}
                      onChange={(e) => handleStartHourChange(e.target.value)}
                      className="time-unit-select"
                      aria-label="Giờ bắt đầu"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {h} giờ
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="time-unit-item">
                    <span className="time-unit-caption">Phút (0-59)</span>
                    <div className="minute-control-pair">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={parseInt(startMinute, 10) || 0}
                        onChange={(e) => handleStartMinuteChange(e.target.value)}
                        className="minute-exact-input"
                        aria-label="Nhập phút bắt đầu"
                      />
                      <select
                        value={MINUTE_PRESETS.includes(startMinute) ? startMinute : 'custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'custom') {
                            handleStartMinuteChange(e.target.value);
                          }
                        }}
                        className="minute-preset-dropdown"
                        aria-label="Chọn nhanh phút bắt đầu"
                        title="Mốc phút chuẩn"
                      >
                        <option value="custom" disabled hidden>Mốc</option>
                        {MINUTE_PRESETS.map((m) => (
                          <option key={m} value={m}>
                            :{m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* End Time Section */}
              <div className="time-block-column">
                <div className="time-block-header">
                  <span className="time-block-tag">Kết thúc (Đến)</span>
                  <span className="time-block-digital">{endHour}:{endMinute}</span>
                </div>
                <div className="time-unit-controls">
                  <div className="time-unit-item">
                    <span className="time-unit-caption">Giờ</span>
                    <select
                      value={endHour}
                      onChange={(e) => handleEndHourChange(e.target.value)}
                      className="time-unit-select"
                      aria-label="Giờ kết thúc"
                    >
                      {HOURS.map((h) => {
                        const isPastStart = (!multiDay || startDate === endDate) && parseInt(h, 10) < parseInt(startHour, 10);
                        return (
                          <option key={h} value={h} disabled={isPastStart}>
                            {h} giờ {isPastStart ? '(Trước giờ bắt đầu)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="time-unit-item">
                    <span className="time-unit-caption">Phút (0-59)</span>
                    <div className="minute-control-pair">
                      <input
                        type="number"
                        min={(!multiDay || startDate === endDate) && parseInt(endHour, 10) === parseInt(startHour, 10) ? parseInt(startMinute, 10) : 0}
                        max={59}
                        value={parseInt(endMinute, 10) || 0}
                        onChange={(e) => handleEndMinuteChange(e.target.value)}
                        className="minute-exact-input"
                        aria-label="Nhập phút kết thúc"
                      />
                      <select
                        value={MINUTE_PRESETS.includes(endMinute) ? endMinute : 'custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'custom') {
                            handleEndMinuteChange(e.target.value);
                          }
                        }}
                        className="minute-preset-dropdown"
                        aria-label="Chọn nhanh phút kết thúc"
                        title="Mốc phút chuẩn"
                      >
                        <option value="custom" disabled hidden>Mốc</option>
                        {MINUTE_PRESETS.map((m) => {
                          const isPastStartMin = (!multiDay || startDate === endDate) && parseInt(endHour, 10) === parseInt(startHour, 10) && parseInt(m, 10) < parseInt(startMinute, 10);
                          return (
                            <option key={m} value={m} disabled={isPastStartMin}>
                              :{m} {isPastStartMin ? '(Trước giờ BĐ)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Duration Indicator & Quick Addition Pills */}
          {!isAllDay && (
            <div className="time-ctrl-duration-section">
              <div className="duration-info-row">
                <span className="duration-label">Thời lượng:</span>
                <span className={`duration-badge ${durationMinutes <= 0 ? 'invalid' : ''}`}>
                  {durationText}
                </span>
              </div>
              <div className="quick-duration-pill-list">
                <span className="quick-pill-hint">Cộng nhanh:</span>
                {[
                  { label: '+15p', mins: 15 },
                  { label: '+30p', mins: 30 },
                  { label: '+45p', mins: 45 },
                  { label: '+1h', mins: 60 },
                  { label: '+1h30', mins: 90 },
                  { label: '+2h', mins: 120 },
                  { label: '+3h', mins: 180 },
                ].map((pill) => (
                  <button
                    type="button"
                    key={pill.label}
                    className={`duration-pill-btn ${durationMinutes === pill.mins ? 'active' : ''}`}
                    onClick={() => applyQuickDuration(pill.mins)}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Secondary Options */}
      <button
        type="button"
        className="form-expand-toggle"
        onClick={() => setShowMore((prev) => !prev)}
      >
        <span>{showMore ? 'Thu gọn tùy chọn bổ sung' : 'Thêm tùy chọn (địa điểm, màu sắc, ưu tiên, ghi chú)'}</span>
        <span className="expand-indicator-text">{showMore ? '[Thu gọn]' : '[Mở rộng]'}</span>
      </button>

      {/* Secondary Fields */}
      {showMore && (
        <div className="form-secondary-fields">
          {/* Location section (100% Optional, Campus-Aware, Zero-Icon) */}
          <div className="location-control-section">
            <div className="location-control-header">
              <span className="location-control-label">Địa điểm (không bắt buộc)</span>
              <label className="time-ctrl-checkbox inline-checkbox">
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
                placeholder={isOnline ? 'Sự kiện trực tuyến qua mạng' : 'Ví dụ: Nhà riêng, Tòa nhà công ty, Quán cafe...'}
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

            {/* Quick Location Chips (User_Locations Custom POIs) */}
            {!isOnline && (
              <div className="campus-chips-row">
                <span className="campus-chips-hint">Địa điểm đã lưu:</span>
                <div className="campus-chip-list">
                  {(userLocations.length > 0 ? userLocations : DEMO_CAMPUS_LOCATIONS.filter((l) => l.type === 'CAMPUS')).map((loc) => {
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

          {/* Color Selection with Swatches */}
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

          <RecurrenceEditor
            value={form.recurrence ?? null}
            onChange={(v) => onChange('recurrence', v)}
          />

          <label className="field">
            <span>Ghi chú</span>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="Ghi chú bài học, tài liệu, liên kết..."
              rows={3}
            />
          </label>

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

      {isTimeOrderInvalid && (
        <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12, margin: '8px 0' }}>
          ⚠️ Thời gian kết thúc không được sớm hơn thời gian bắt đầu (trừ khi bật &quot;Nhiều ngày&quot;).
        </div>
      )}

      {isPastTime && (
        <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12, margin: '8px 0' }}>
          ⚠️ Không thể đặt lịch vào ngày hoặc giờ đã qua. Vui lòng chọn thời gian trong tương lai.
        </div>
      )}

      {/* Sticky Bottom Action Footer */}
      <div className="form-sticky-footer">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="primary-button" disabled={!form.title.trim() || isPastTime || isTimeOrderInvalid}>
          Lưu sự kiện
        </button>
      </div>
    </form>
  );
}
