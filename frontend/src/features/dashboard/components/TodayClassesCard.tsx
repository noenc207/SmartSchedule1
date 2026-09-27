import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, BookOpen, Code, Cpu, Languages, ArrowRight } from 'lucide-react';
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
        return <Code size={16} className="text-purple" />;
      case 'cpu':
        return <Cpu size={16} className="text-green" />;
      case 'lang':
        return <Languages size={16} className="text-orange" />;
      case 'book':
      default:
        return <BookOpen size={16} className="text-blue" />;
    }
  }

  return (
    <motion.div
      className="mock-card mock-today-classes-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
    >
      <div className="mock-card-header">
        <div className="mock-card-title-group" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Calendar size={16} className="mock-header-icon" />
          <h2 className="mock-card-title">{headerTitle}</h2>
          {!isSelectedToday && onJumpToday && (
            <button
              type="button"
              className="mock-jump-today-btn"
              onClick={onJumpToday}
              title="Quay về lịch học hôm nay"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 6,
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Về hôm nay
            </button>
          )}
        </div>
        <span className="mock-count-pill pill-blue">{classes.length} lớp</span>
      </div>

      {classes.length === 0 ? (
        <div
          style={{
            padding: '28px 16px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: 13,
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px dashed #cbd5e1',
            margin: '8px 0',
          }}
        >
          🌴 Không có lớp học nào trong ngày này — Tận dụng thời gian để tự học hoặc nghỉ ngơi nhé!
        </div>
      ) : (
        <div className="mock-classes-list">
          {classes.map((c) => {
            const isFinished = c.status === 'Đã kết thúc';
            return (
              <div
                key={c.id}
                className={`mock-class-item ${isFinished ? 'is-finished' : ''}`}
                onClick={() => navigate('/calendar')}
                style={{
                  cursor: 'pointer',
                  opacity: isFinished ? 0.65 : 1,
                  background: isFinished ? '#f8fafc' : undefined,
                }}
              >
                <div className="mock-class-icon-box">{renderIcon(c)}</div>
                <div className="mock-class-info">
                  <span className="mock-class-time">{c.time}</span>
                  <strong
                    className="mock-class-name"
                    style={{ textDecoration: isFinished ? 'line-through' : 'none' }}
                  >
                    {isFinished ? `✓ ${c.title}` : c.title}
                  </strong>
                  <span className="mock-class-room">{c.room}</span>
                </div>
                <span
                  className={`mock-class-status-badge ${c.statusVariant}`}
                  style={isFinished ? { background: '#f1f5f9', color: '#64748b' } : undefined}
                >
                  {c.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mock-card-footer">
        <button
          type="button"
          className="mock-text-link"
          onClick={() => navigate('/calendar')}
        >
          <span>Xem toàn bộ lịch học</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}
