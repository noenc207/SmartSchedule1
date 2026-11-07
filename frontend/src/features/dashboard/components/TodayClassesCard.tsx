import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, BookOpen, Code, Cpu, Languages, ArrowRight, Sparkles, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface ClassItem {
  id: string;
  time: string;
  title: string;
  room: string;
  status: 'Đang diễn ra' | 'Sắp tới' | 'Đã kết thúc';
  statusVariant: 'active-blue' | 'upcoming-grey';
  iconType?: 'book' | 'code' | 'cpu' | 'lang';
  icon?: React.ReactNode;
}

interface TodayClassesCardProps {
  classes?: ClassItem[];
  selectedDate?: Date;
  onJumpToday?: () => void;
}

export function TodayClassesCard({
  classes: propClasses,
  selectedDate,
  onJumpToday,
}: TodayClassesCardProps) {
  const navigate = useNavigate();

  const isSelectedToday = React.useMemo(() => {
    if (!selectedDate) return true;
    return selectedDate.toDateString() === new Date().toDateString();
  }, [selectedDate]);

  const headerTitle = React.useMemo(() => {
    if (isSelectedToday) {
      return 'Lớp học hôm nay';
    }
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = dayNames[selectedDate ? selectedDate.getDay() : 1];
    const dateStr = selectedDate ? `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}` : '';
    return `Lịch học · ${dayName}, ${dateStr}`;
  }, [isSelectedToday, selectedDate]);

  const classes = propClasses ?? [];

  function renderIcon(item: ClassItem) {
    if (item.icon) return item.icon;
    switch (item.iconType) {
      case 'code':
        return <Code size={16} className="text-purple-500" />;
      case 'cpu':
        return <Cpu size={16} className="text-emerald-500" />;
      case 'lang':
        return <Languages size={16} className="text-orange-500" />;
      case 'book':
      default:
        return <BookOpen size={16} className="text-blue-500" />;
    }
  }

  return (
    <motion.div
      className="mock-card mock-today-classes-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      style={{ borderRadius: 16 }}
    >
      <div className="mock-card-header">
        <div className="mock-card-title-group" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Calendar size={16} className="mock-header-icon text-blue-600" />
          <h2 className="mock-card-title">{headerTitle}</h2>
          {!isSelectedToday && onJumpToday && (
            <button
              type="button"
              className="mock-jump-today-btn"
              onClick={onJumpToday}
              title="Quay về lịch học hôm nay"
            >
              Về hôm nay
            </button>
          )}
        </div>
        <span className="mock-count-pill pill-blue">
          {classes.length > 0 ? `${classes.length} lớp` : 'Tự do 100%'}
        </span>
      </div>

      {classes.length === 0 ? (
        <div
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.06) 0%, rgba(59, 130, 246, 0.04) 100%)',
            borderRadius: 14,
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(249, 115, 22, 0.14)',
                color: '#ea580c',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Sparkles size={11} />
              Ngày tự học vàng
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Trống 11h tại Campus</span>
          </div>

          <strong style={{ fontSize: 16, color: 'var(--text-primary, #0f172a)', display: 'block', marginBottom: 6 }}>
            Trọn vẹn thời gian tự do hôm nay!
          </strong>

          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
            Bạn không có tiết học chính khóa nào hôm nay. Hãy tận dụng khoảng trống này để làm đồ án cá nhân hoặc ôn thi cùng Cóc AI.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate('/scheduling')}
              style={{
                fontSize: 12,
                padding: '7px 14px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
              }}
            >
              Đặt lịch tự học Atrium
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate('/calendar')}
              style={{ fontSize: 12, padding: '7px 12px', borderRadius: 8 }}
            >
              Xem lịch tuần &rarr;
            </button>
          </div>
        </div>
      ) : (
        <div className="mock-classes-list">
          {classes.map((c) => (
            <div key={c.id} className="mock-class-item">
              <div className="mock-class-icon-wrap">{renderIcon(c)}</div>
              <div className="mock-class-info">
                <strong className="mock-class-name">{c.title}</strong>
                <span className="mock-class-meta">
                  <MapPin size={11} className="inline mr-1 text-slate-400" />
                  {c.room} · {c.time}
                </span>
              </div>
              <span className={`mock-class-status ${c.statusVariant}`}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
