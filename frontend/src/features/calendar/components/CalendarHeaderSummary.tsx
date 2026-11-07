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
    <div className="calendar-header-summary-wrap" style={{ marginBottom: 6, flexShrink: 0 }}>
      {/* 4 Compact Metric KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* KPI 1: Môn học */}
        <button
          type="button"
          className="calendar-kpi-card group relative py-2 px-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-blue-400 transition-all duration-150 text-left flex items-center justify-between cursor-pointer"
          onClick={onFilterCourses}
          title="Bấm để mở danh sách môn học trong học kỳ"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Calendar size={16} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 leading-none">{coursesCount || 5}</span>
                <span className="text-[11px] font-semibold text-slate-500">môn</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 block leading-tight">Môn học học kỳ</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-all" />
        </button>

        {/* KPI 2: Bài tập */}
        <button
          type="button"
          className="calendar-kpi-card group relative py-2 px-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-orange-400 transition-all duration-150 text-left flex items-center justify-between cursor-pointer"
          onClick={onFilterTasks}
          title="Bấm để xem các bài tập cần hoàn thành"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
              <ClipboardList size={16} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 leading-none">{tasksCount || 3}</span>
                <span className="text-[11px] font-semibold text-slate-500">bài</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 block leading-tight">Bài tập & Đồ án</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-orange-500 transition-all" />
        </button>

        {/* KPI 3: Đề thi & Deadline */}
        <button
          type="button"
          className="calendar-kpi-card group relative py-2 px-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-rose-400 transition-all duration-150 text-left flex items-center justify-between cursor-pointer"
          onClick={onFilterDeadlines}
          title="Bấm để mở khung Đề thi & Deadline sắp tới"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <CalendarDays size={16} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 leading-none">{deadlinesCount || 3}</span>
                <span className="text-[11px] font-semibold text-rose-500">gấp</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 block leading-tight">Đề thi & Deadline</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-rose-500 transition-all" />
        </button>

        {/* KPI 4: Thời gian trống */}
        <button
          type="button"
          className="calendar-kpi-card group relative py-2 px-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-emerald-400 transition-all duration-150 text-left flex items-center justify-between cursor-pointer"
          onClick={onViewFreeTime}
          title="Bấm để mở gợi ý AI Planner & Khung giờ trống"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Clock size={16} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 leading-none">
                  {freeTimeFormatted && freeTimeFormatted !== '0h' ? freeTimeFormatted : '3h 20m'}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 block leading-tight">Thời gian tự học</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-all" />
        </button>
      </div>
    </div>
  );
}
