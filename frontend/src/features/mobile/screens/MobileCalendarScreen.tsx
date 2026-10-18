import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  MobilePageHeader,
  MobileSheet,
  MobileEmptyState,
} from '../../../components/mobile';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useDashboardData } from '../../dashboard/hooks/useDashboardData';

const FPT_SLOTS = [
  { slot: 1, time: '07:00 - 09:15', label: 'Slot 1' },
  { slot: 2, time: '09:30 - 11:45', label: 'Slot 2' },
  { slot: 3, time: '12:30 - 14:45', label: 'Slot 3' },
  { slot: 4, time: '15:00 - 17:15', label: 'Slot 4' },
  { slot: 5, time: '17:30 - 19:45', label: 'Slot 5' },
  { slot: 6, time: '20:00 - 22:15', label: 'Slot 6' },
];

const DAYS_HEADER = [
  { key: 'T2', label: 'T2', full: 'Thứ 2' },
  { key: 'T3', label: 'T3', full: 'Thứ 3' },
  { key: 'T4', label: 'T4', full: 'Thứ 4' },
  { key: 'T5', label: 'T5', full: 'Thứ 5' },
  { key: 'T6', label: 'T6', full: 'Thứ 6' },
  { key: 'T7', label: 'T7', full: 'Thứ 7' },
  { key: 'CN', label: 'CN', full: 'Chủ nhật' },
];

export function MobileCalendarScreen() {
  const navigate = useNavigate();
  const { activeScheduleId } = useWorkspaceStore();
  const { eventsByDay, activeDate, setActiveDate } = useDashboardData();

  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Day of week index
  const activeDayIndex = (activeDate.getDay() + 6) % 7; // Monday = 0
  const selectedDayKey = DAYS_HEADER[activeDayIndex]?.key || 'T4';

  const dayEvents = (eventsByDay && eventsByDay[selectedDayKey]) || [
    {
      id: 'demo-1',
      title: 'PRN211 · Lập trình ứng dụng C# .NET',
      time: '07:30 - 09:45 (Slot 1)',
      room: 'Alpha 204',
      color: '#0047ba',
      instructor: 'ThS. Nguyễn Văn A',
      status: 'Đã hoàn thành',
    },
    {
      id: 'demo-2',
      title: 'SWP391 · Đồ án phát triển phần mềm',
      time: '13:00 - 15:15 (Slot 3)',
      room: 'Beta 302',
      color: '#ea580c',
      instructor: 'TS. Trần Thị B',
      status: 'Sắp diễn ra',
    },
    {
      id: 'demo-3',
      title: 'CSN301 · Trí tuệ nhân tạo và Học máy',
      time: '15:30 - 17:45 (Slot 4)',
      room: 'Gamma 101',
      color: '#7c3aed',
      instructor: 'PGS. TS. Lê Hoàng C',
      status: 'Chưa học',
    },
  ];

  const handleSelectDay = (index: number) => {
    const newDate = new Date(activeDate);
    const currentDay = (newDate.getDay() + 6) % 7;
    newDate.setDate(newDate.getDate() + (index - currentDay));
    setActiveDate(newDate);
  };

  return (
    <div className="mobile-app-shell">
      {/* Header */}
      <MobilePageHeader
        title="Thời khóa biểu"
        subtitle="Tuần 7 · Học kỳ Fall 2026"
        rightAction={
          <button
            type="button"
            onClick={() => navigate('/schedules')}
            className="mobile-touch-target p-2 text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-subtle)] rounded-full"
            aria-label="Đổi lịch"
          >
            <Filter size={18} />
          </button>
        }
      />

      <main className="mobile-view-container">
        {/* Day Strip Navigation */}
        <section className="mb-4">
          <div className="mobile-day-strip-grid">
            {DAYS_HEADER.map((day, idx) => {
              const isSelected = idx === activeDayIndex;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => handleSelectDay(idx)}
                  className={`flex-1 py-2 flex flex-col items-center justify-center rounded-xl transition-all ${
                    isSelected
                      ? 'bg-[var(--m-brand-primary)] text-white font-bold shadow-sm'
                      : 'text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-subtle)]'
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-wider">{day.label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-[var(--m-brand-primary)]'}`} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Day Info */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-[var(--m-text-primary)]">
            Lịch học {DAYS_HEADER[activeDayIndex]?.full} (
            {activeDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })})
          </h2>
          <span className="text-xs text-[var(--m-brand-primary)] font-semibold">
            {dayEvents.length} môn học
          </span>
        </div>

        {/* Timeline Events List */}
        <div className="flex flex-col gap-3">
          {dayEvents.length > 0 ? (
            dayEvents.map((evt: any) => (
              <motion.div
                key={evt.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEvent(evt)}
                className="mobile-card p-3.5 flex flex-col gap-2 cursor-pointer border-l-4"
                style={{ borderLeftColor: evt.color || '#ea580c' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--m-text-primary)] flex items-center gap-1.5">
                    <Clock size={13} className="text-[var(--m-brand-primary)]" />
                    {evt.time}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--m-surface-subtle)] text-[var(--m-text-secondary)]">
                    {evt.status || 'Chính thức'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[var(--m-text-primary)] tracking-tight">
                  {evt.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-[var(--m-text-muted)] pt-1 border-t border-[var(--m-border-faint)]">
                  <span className="flex items-center gap-1 text-[var(--m-text-secondary)] font-medium">
                    <MapPin size={12} className="text-[var(--m-brand-primary)]" />
                    {evt.room || 'Phòng học FPT'}
                  </span>
                  {evt.instructor && (
                    <span className="flex items-center gap-1 truncate">
                      <User size={12} />
                      {evt.instructor}
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <MobileEmptyState
              title="Không có tiết học"
              description="Hôm nay không có lịch học chính khóa. Bạn có thể xếp thêm lịch ôn tập hoặc tự học."
              actionLabel="Xếp lịch tự học"
              onAction={() => navigate('/scheduling')}
            />
          )}
        </div>
      </main>

      {/* Event Details Sheet */}
      <MobileSheet
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Thông tin tiết học'}
        subtitle="Chi tiết môn học và phòng học"
      >
        {selectedEvent && (
          <div className="flex flex-col gap-3.5 py-1">
            <div className="p-3 rounded-xl bg-[var(--m-surface-subtle)] flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--m-text-muted)]">Thời gian:</span>
                <span className="font-bold text-[var(--m-text-primary)]">{selectedEvent.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--m-text-muted)]">Phòng học:</span>
                <span className="font-bold text-[var(--m-brand-primary)]">{selectedEvent.room}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--m-text-muted)]">Giảng viên:</span>
                <span className="font-semibold text-[var(--m-text-primary)]">
                  {selectedEvent.instructor || 'Giảng viên FPT'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--m-text-muted)]">Trạng thái:</span>
                <span className="font-bold text-[var(--m-campus-green)]">Đã đồng bộ FPT Flm</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedEvent(null);
                navigate('/documents');
              }}
              className="w-full mobile-touch-target rounded-xl bg-[var(--m-brand-primary)] text-white text-xs font-bold"
            >
              Xem tài liệu và bài giảng
            </button>
          </div>
        )}
      </MobileSheet>
    </div>
  );
}
