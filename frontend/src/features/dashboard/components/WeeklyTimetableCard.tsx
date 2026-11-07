import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, ArrowRight, BookOpen, Code, Cpu, Languages, Sparkles, Clock, Check, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../../../components/Toast';

interface TimetableEventItem {
  id: string;
  time: string;
  title: string;
  room: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
  iconType: 'book' | 'code' | 'cpu' | 'lang';
}

const DAYS_ORDER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_LABELS: Record<string, string> = {
  T2: 'Thứ 2',
  T3: 'Thứ 3',
  T4: 'Thứ 4',
  T5: 'Thứ 5',
  T6: 'Thứ 6',
  T7: 'Thứ 7',
  CN: 'Chủ nhật',
};

function computeTimelineCoord(timeStr: string): { topPct: number; heightPct: number } {
  const parts = timeStr.split(' - ');
  if (parts.length !== 2) return { topPct: 0, heightPct: 15 };
  const [startH, startM] = parts[0].trim().split(':').map(Number);
  const [endH, endM] = parts[1].trim().split(':').map(Number);

  const startMin = Math.max(0, (startH - 7) * 60 + (startM || 0));
  const endMin = Math.min(720, (endH - 7) * 60 + (endM || 0));
  const duration = Math.max(endMin - startMin, 40);

  const topPct = (startMin / 720) * 100;
  const heightPct = (duration / 720) * 100;

  return { topPct, heightPct };
}

interface WeeklyTimetableCardProps {
  eventsByDay?: Record<string, TimetableEventItem[]>;
  weekDates?: Date[];
  selectedDay?: string;
  onSelectDay?: (dayKey: string) => void;
}

export function WeeklyTimetableCard({
  eventsByDay,
  weekDates,
  selectedDay: propSelectedDay,
  onSelectDay: propOnSelectDay,
}: WeeklyTimetableCardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'week' | 'day' | 'month'>('week');

  const [internalSelectedDay, setInternalSelectedDay] = useState(() => {
    const todayIndex = new Date().getDay();
    const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return map[todayIndex] || 'T6';
  });

  const activeDay = propSelectedDay ?? internalSelectedDay;

  const handleDayClick = (key: string) => {
    if (propOnSelectDay) {
      propOnSelectDay(key);
    } else {
      setInternalSelectedDay(key);
    }
  };

  const weekRangeLabel = React.useMemo(() => {
    if (weekDates && weekDates.length >= 7) {
      const mon = weekDates[0];
      const sun = weekDates[6];
      return `Mon, ${mon.getDate()}/${mon.getMonth() + 1} – Sun, ${sun.getDate()}/${sun.getMonth() + 1}`;
    }
    return 'Tuần 7 · Fall 2026';
  }, [weekDates]);

  const days = DAYS_ORDER.map((key, idx) => {
    let dateStr = '';
    let isToday = false;
    if (weekDates && weekDates[idx]) {
      const dt = weekDates[idx];
      dateStr = `${dt.getDate()}/${dt.getMonth() + 1}`;
      isToday = dt.toDateString() === new Date().toDateString();
    }
    const dayEvs = eventsByDay?.[key] || [];
    return {
      key,
      label: key,
      date: dateStr,
      isToday,
      count: dayEvs.length,
    };
  });

  const timeSlots = [
    { time: '07:00' },
    { time: '09:00' },
    { time: '11:00' },
    { time: '13:00' },
    { time: '15:00' },
    { time: '17:00' },
    { time: '19:00' },
  ];

  const currentEvents: TimetableEventItem[] =
    eventsByDay && eventsByDay[activeDay] !== undefined
      ? eventsByDay[activeDay]
      : [];

  const currentDayTitle = React.useMemo(() => {
    const dayIdx = DAYS_ORDER.indexOf(activeDay);
    const dateObj = weekDates?.[dayIdx];
    const dayName = DAY_LABELS[activeDay] || activeDay;
    if (dateObj) {
      const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
      const isToday = dateObj.toDateString() === new Date().toDateString();
      return isToday ? `Hôm nay · ${dayName}, ${dateStr}` : `${dayName}, ${dateStr}`;
    }
    return dayName;
  }, [activeDay, weekDates]);

  const eventsCount = currentEvents.length;

  const handleBookSlot = (slotName: string) => {
    showToast(`Đã ghi nhận khung giờ: "${slotName}". Đang chuyển tới Studio Xếp lịch...`, 'success');
    navigate('/scheduling');
  };

  return (
    <motion.div
      className="mock-card mock-timetable-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.18 }}
      style={{ borderRadius: 16, overflow: 'hidden' }}
    >
      {/* Top Header */}
      <div className="mock-timetable-header">
        <div className="mock-card-title-group">
          <Calendar size={16} className="mock-header-icon" />
          <h2 className="mock-card-title">Lịch học &amp; Lịch tuần</h2>
          <span className="mock-date-range-sub">{weekRangeLabel}</span>
        </div>

        {/* View Switcher: Tuần / Ngày / Tháng */}
        <div className="mock-view-switcher" role="tablist">
          <button
            type="button"
            className={`mock-switch-tab ${activeTab === 'week' ? 'active' : ''}`}
            onClick={() => setActiveTab('week')}
          >
            Tuần
          </button>
          <button
            type="button"
            className={`mock-switch-tab ${activeTab === 'day' ? 'active' : ''}`}
            onClick={() => setActiveTab('day')}
          >
            Ngày
          </button>
          <button
            type="button"
            className={`mock-switch-tab ${activeTab === 'month' ? 'active' : ''}`}
            onClick={() => navigate('/calendar')}
          >
            Tháng
          </button>
        </div>
      </div>

      {/* Subheader */}
      <div className="mock-timetable-subbar">
        <div className="mock-subbar-left">
          <div className="mock-subbar-title-row">
            <Calendar size={14} className="text-orange-500 shrink-0" />
            <strong className="mock-current-day-text">{currentDayTitle}</strong>
          </div>
          <div className="mock-subbar-meta-row">
            <span className="mock-current-day-stat">
              {eventsCount > 0 ? `${eventsCount} tiết học chính khóa` : 'Ngày tự học & Nghiên cứu tự do'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="mock-text-link"
          onClick={() => navigate('/calendar')}
        >
          <span>Xem chi tiết</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Weekday Selector Row with Event Indicators */}
      <div className="mock-day-pills-row" role="tablist" style={{ gap: 6 }}>
        {days.map((d) => (
          <button
            type="button"
            key={d.key}
            className={`mock-day-pill-btn ${activeDay === d.key ? 'active' : ''}`}
            onClick={() => handleDayClick(d.key)}
            style={{ position: 'relative' }}
          >
            <span className="mock-day-label">{d.label}</span>
            <span className="mock-day-date">{d.date}</span>
            {d.count > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#3b82f6',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {eventsCount === 0 ? (
        /* DAY FOCUS BLUEPRINT: ELIMINATES THE EMPTY WHITE VOID! */
        <div style={{ padding: '16px', background: 'var(--bg-subtle, #f8fafc)' }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(59, 130, 246, 0.06) 100%)',
              border: '1px solid var(--border-color, #e2e8f0)',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 14, color: 'var(--text-primary, #0f172a)' }}>
                  Lộ trình Khung giờ Vàng Tự học
                </strong>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                  Không có lớp chính khóa · Trống trọn vẹn 11h tại Campus AI
                </p>
              </div>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate('/scheduling')}
              style={{
                fontSize: 12,
                padding: '6px 14px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
              }}
            >
              Xếp lịch OR-Tools
            </button>
          </div>

          {/* 3 Structured Recommended Sessions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Session 1: Morning */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563eb',
                  }}
                >
                  08:30 – 11:30
                </span>
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                    Phiên học sâu: Ôn tập Thuật toán &amp; AI Lab
                  </strong>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Thư viện AI Campus · Khu vực nghiên cứu yên tĩnh
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleBookSlot('Phiên sáng: Thuật toán & AI Lab')}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6 }}
              >
                + Xếp lịch
              </button>
            </div>

            {/* Session 2: Afternoon */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'rgba(124, 58, 237, 0.1)',
                    color: '#7c3aed',
                  }}
                >
                  14:00 – 16:30
                </span>
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                    Lập trình Đồ án Capstone &amp; Bài tập Lab
                  </strong>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Phòng Lab Beta 204 · Máy trạm GPU &amp; Wifi 6E
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleBookSlot('Phiên chiều: Đồ án Capstone')}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6 }}
              >
                + Xếp lịch
              </button>
            </div>

            {/* Session 3: Evening */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                  }}
                >
                  17:00 – 18:30
                </span>
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                    Sinh hoạt Thể thao &amp; Nghỉ ngơi Campus
                  </strong>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Sân bóng đá &amp; Khu thể thao sinh viên FPT
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleBookSlot('Phiên tối: Thể thao Campus')}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6 }}
              >
                + Xếp lịch
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TIMETABLE WITH ACTIVE EVENTS */
        <div className="mock-time-grid-container" style={{ minHeight: 380 }}>
          <div className="mock-time-axis">
            {timeSlots.map((slot, index) => (
              <div
                key={slot.time}
                className="mock-time-tick"
                style={{ top: `${(index / (timeSlots.length - 1)) * 100}%` }}
              >
                <span className="mock-time-label">{slot.time}</span>
                <div className="mock-grid-line" />
              </div>
            ))}
          </div>

          <div className="mock-events-canvas" style={{ position: 'relative', height: 380 }}>
            {currentEvents.map((ev) => {
              const { topPct, heightPct } = computeTimelineCoord(ev.time);
              return (
                <div
                  key={ev.id}
                  className={`mock-event-chip event-chip-${ev.color}`}
                  style={{
                    position: 'absolute',
                    top: `${topPct}%`,
                    height: `${heightPct}%`,
                    left: 8,
                    right: 8,
                    borderRadius: 10,
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  <strong style={{ fontSize: 13, color: '#0f172a' }}>{ev.title}</strong>
                  <span style={{ fontSize: 11, color: '#475569' }}>
                    {ev.time} · {ev.room}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
