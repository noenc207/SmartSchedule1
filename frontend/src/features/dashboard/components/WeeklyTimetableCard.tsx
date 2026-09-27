import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, ArrowRight, BookOpen, Code, Cpu, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

/**
 * Calculates accurate top% and height% relative to 07:00 – 19:00 (12 hours = 720 minutes).
 */
function computeTimelineCoord(timeStr: string): { topPct: number; heightPct: number } {
  const parts = timeStr.split(' - ');
  if (parts.length !== 2) return { topPct: 0, heightPct: 15 };
  const [startH, startM] = parts[0].trim().split(':').map(Number);
  const [endH, endM] = parts[1].trim().split(':').map(Number);

  // Baseline 07:00 (0m), Max 19:00 (720m)
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

  // Determine current day key (defaults to today's day of week, e.g. T4 for Wednesday)
  const [internalSelectedDay, setInternalSelectedDay] = useState(() => {
    const todayIndex = new Date().getDay();
    const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return map[todayIndex] || 'T4';
  });

  const activeDay = propSelectedDay ?? internalSelectedDay;

  const handleDayClick = (key: string) => {
    if (propOnSelectDay) {
      propOnSelectDay(key);
    } else {
      setInternalSelectedDay(key);
    }
  };

  // Dynamic Week Date Range Label (e.g. "Mon, 21/9 – Sun, 27/9")
  const weekRangeLabel = React.useMemo(() => {
    if (weekDates && weekDates.length >= 7) {
      const mon = weekDates[0];
      const sun = weekDates[6];
      return `Mon, ${mon.getDate()}/${mon.getMonth() + 1} – Sun, ${sun.getDate()}/${sun.getMonth() + 1}`;
    }
    return 'Lịch tuần';
  }, [weekDates]);

  // Dynamic 7-day configuration with actual dates
  const days = DAYS_ORDER.map((key, idx) => {
    let dateStr = '';
    let isToday = false;
    if (weekDates && weekDates[idx]) {
      const dt = weekDates[idx];
      dateStr = `${dt.getDate()}/${dt.getMonth() + 1}`;
      isToday = dt.toDateString() === new Date().toDateString();
    }
    return {
      key,
      label: key,
      date: dateStr,
      isToday,
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

  // Current day events (synced with activeDay)
  const currentEvents: TimetableEventItem[] =
    eventsByDay && eventsByDay[activeDay] !== undefined
      ? eventsByDay[activeDay]
      : [];

  // Dynamic Subbar Title: "Hôm nay · Thứ 4, 23/9" or "Thứ 2, 21/9"
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

  const totalMinutes = currentEvents.reduce((sum, ev) => {
    const parts = ev.time.split(' - ');
    if (parts.length !== 2) return sum;
    const [sh, sm] = parts[0].trim().split(':').map(Number);
    const [eh, em] = parts[1].trim().split(':').map(Number);
    return sum + ((eh - sh) * 60 + ((em || 0) - (sm || 0)));
  }, 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  const durationText = totalMinutes > 0
    ? `${totalHours}h${remainingMins > 0 ? ` ${remainingMins}p` : ''}`
    : '0h';

  const metaString = eventsCount > 0
    ? `${eventsCount} sự kiện · ${durationText}`
    : 'Nghỉ ngơi · Không có lịch học';

  function renderEventIcon(iconType: string, color: string) {
    switch (iconType) {
      case 'book':
        return <BookOpen size={14} className={`text-${color} flex-shrink-0`} />;
      case 'code':
        return <Code size={14} className={`text-${color} flex-shrink-0`} />;
      case 'cpu':
        return <Cpu size={14} className={`text-${color} flex-shrink-0`} />;
      case 'lang':
        return <Languages size={14} className={`text-${color} flex-shrink-0`} />;
      default:
        return <BookOpen size={14} className={`text-${color} flex-shrink-0`} />;
    }
  }

  return (
    <motion.div
      className="mock-card mock-timetable-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.18 }}
    >
      {/* Top Header */}
      <div className="mock-timetable-header">
        <div className="mock-card-title-group">
          <Calendar size={16} className="mock-header-icon" />
          <h2 className="mock-card-title">Lịch học & lịch tuần</h2>
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
            onClick={() => {
              setActiveTab('month');
              navigate('/calendar');
            }}
          >
            Tháng
          </button>
        </div>
      </div>

      {/* Subheader: Hôm nay · Thứ 4, 23/9 | 1 sự kiện · 2h */}
      <div className="mock-timetable-subbar">
        <div className="mock-subbar-left">
          <div className="mock-subbar-title-row">
            <span className="mock-subbar-square">▢</span>
            <strong className="mock-current-day-text">{currentDayTitle}</strong>
          </div>
          <div className="mock-subbar-meta-row">
            <span className="mock-subbar-arrow">‹</span>
            <span className="mock-current-day-stat">{metaString}</span>
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

      {/* Weekday Selector Row */}
      <div className="mock-day-pills-row" role="tablist">
        {days.map((d) => (
          <button
            type="button"
            key={d.key}
            className={`mock-day-pill-btn ${activeDay === d.key ? 'active' : ''}`}
            onClick={() => handleDayClick(d.key)}
          >
            <span className="mock-day-label">{d.label}</span>
            <span className="mock-day-date">{d.date}</span>
          </button>
        ))}
      </div>

      {/* Interactive Timetable Schedule Grid */}
      <div className="mock-time-grid-container">
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

        {/* Timetable Events Container */}
        <div className="mock-events-canvas">
          <AnimatePresence mode="wait">
            {eventsCount === 0 ? (
              <motion.div
                key="empty-day"
                className="mock-empty-day-schedule"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mock-empty-day-icon">🌴</div>
                <strong className="mock-empty-day-title">Không có lịch học hôm nay</strong>
                <p className="mock-empty-day-desc">
                  Dành thời gian nghỉ ngơi, nạp lại năng lượng hoặc ôn tập cho tuần học mới nhé!
                </p>
                <button
                  type="button"
                  className="mock-text-link"
                  onClick={() => navigate('/calendar')}
                >
                  <span>Mở Lịch học & Lịch trình</span>
                  <ArrowRight size={13} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={activeDay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                {currentEvents.map((ev) => {
                  const { topPct, heightPct } = computeTimelineCoord(ev.time);
                  // Calculate if event end time has elapsed
                  let isPast = false;
                  const dayIdx = DAYS_ORDER.indexOf(activeDay);
                  const dateObj = weekDates?.[dayIdx];
                  if (dateObj) {
                    const parts = ev.time.split(' - ');
                    if (parts.length === 2) {
                      const [endH, endM] = parts[1].trim().split(':').map(Number);
                      const eventEnd = new Date(dateObj);
                      eventEnd.setHours(endH, endM, 0, 0);
                      isPast = eventEnd.getTime() < Date.now();
                    }
                  }
                  return (
                    <motion.div
                      key={ev.id}
                      className={`mock-event-block block-${ev.color} ${isPast ? 'is-past-block' : ''}`}
                      style={{
                        top: `${topPct}%`,
                        height: `${heightPct}%`,
                        opacity: isPast ? 0.65 : 1,
                      }}
                      whileHover={{ scale: 1.008, zIndex: 10 }}
                      onClick={() => navigate('/calendar')}
                      title={`${ev.time}: ${ev.title} (${ev.room})${isPast ? ' · [Đã kết thúc]' : ''}`}
                    >
                      <div className="mock-event-inner">
                        <span className="mock-ev-time">{ev.time}{isPast && ' · ✓ Đã qua'}</span>
                        <div className="mock-ev-title-row">
                          {renderEventIcon(ev.iconType, ev.color)}
                          <strong
                            className="mock-ev-title"
                            style={{ textDecoration: isPast ? 'line-through' : 'none' }}
                          >
                            {isPast ? `✓ ${ev.title}` : ev.title}
                          </strong>
                        </div>
                        <span className="mock-ev-room">{ev.room}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Event Floating Button */}
        <div className="mock-add-event-wrap">
          <button
            type="button"
            className="mock-add-event-btn"
            onClick={() => navigate('/calendar')}
            title="Thêm sự kiện hoặc tiết học mới"
          >
            <Plus size={14} />
            <span>Thêm sự kiện</span>
          </button>
        </div>
      </div>

      {/* Cheer Ribbon at Bottom */}
      <div className="mock-cheer-ribbon">
        <span className="mock-cheer-star">🌟</span>
        <span className="mock-cheer-text">
          Hôm nay bạn đã làm rất tốt! Tiếp tục phát huy nhé!
        </span>
      </div>
    </motion.div>
  );
}
