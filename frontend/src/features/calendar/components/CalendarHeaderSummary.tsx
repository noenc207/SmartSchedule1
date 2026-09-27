import React from 'react';
import { Calendar, ClipboardList, CalendarDays, Clock, ChevronRight } from 'lucide-react';

interface CalendarHeaderSummaryProps {
  userDisplayName?: string;
  coursesCount: number;
  tasksCount: number;
  deadlinesCount: number;
  freeTimeFormatted: string;
  onFilterCourses?: () => void;
  onFilterTasks?: () => void;
  onFilterDeadlines?: () => void;
  onViewFreeTime?: () => void;
}

export function CalendarHeaderSummary({
  coursesCount,
  tasksCount,
  deadlinesCount,
  freeTimeFormatted,
  onFilterCourses,
  onFilterTasks,
  onFilterDeadlines,
  onViewFreeTime,
}: CalendarHeaderSummaryProps) {
  return (
    <div className="calendar-header-summary-wrap">
      {/* 4 Metric KPI Cards Row */}
      <div className="calendar-kpi-row">
        {/* KPI 1: Môn học */}
        <button
          type="button"
          className="calendar-kpi-card blue"
          onClick={onFilterCourses}
          title="Xem danh sách môn học trong học kỳ"
        >
          <div className="kpi-icon-bubble blue">
            <Calendar size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-number">{coursesCount}</span>
            <span className="kpi-label">Môn học</span>
          </div>
          <ChevronRight size={14} className="kpi-chevron" />
        </button>

        {/* KPI 2: Bài tập */}
        <button
          type="button"
          className="calendar-kpi-card orange"
          onClick={onFilterTasks}
          title="Xem các bài tập cần hoàn thành"
        >
          <div className="kpi-icon-bubble orange">
            <ClipboardList size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-number">{tasksCount}</span>
            <span className="kpi-label">Bài tập</span>
          </div>
          <ChevronRight size={14} className="kpi-chevron" />
        </button>

        {/* KPI 3: Đề thi & Deadline */}
        <button
          type="button"
          className="calendar-kpi-card rose"
          onClick={onFilterDeadlines}
          title="Xem hạn chót và lịch thi sắp tới"
        >
          <div className="kpi-icon-bubble rose">
            <CalendarDays size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-number">{deadlinesCount}</span>
            <span className="kpi-label">Đề thi & Deadline</span>
          </div>
          <ChevronRight size={14} className="kpi-chevron" />
        </button>

        {/* KPI 4: Thời gian trống */}
        <button
          type="button"
          className="calendar-kpi-card emerald"
          onClick={onViewFreeTime}
          title="Xem các khung giờ trống tự học"
        >
          <div className="kpi-icon-bubble emerald">
            <Clock size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-number">{freeTimeFormatted}</span>
            <span className="kpi-label">Thời gian trống</span>
          </div>
          <ChevronRight size={14} className="kpi-chevron" />
        </button>
      </div>
    </div>
  );
}
