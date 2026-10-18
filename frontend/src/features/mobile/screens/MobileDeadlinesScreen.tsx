import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle,
  FileText,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import {
  MobilePageHeader,
  MobileSection,
  MobileEmptyState,
} from '../../../components/mobile';

interface DeadlineItem {
  id: string;
  course: string;
  title: string;
  dueDate: string;
  hoursLeft: number;
  type: 'assignment' | 'exam' | 'lab';
  urgent: boolean;
}

const DEMO_DEADLINES: DeadlineItem[] = [
  {
    id: 'dl-1',
    course: 'PRN211',
    title: 'Nộp Lab 4: Entity Framework Core & Repository Pattern',
    dueDate: '23:59 Hôm nay',
    hoursLeft: 9,
    type: 'lab',
    urgent: true,
  },
  {
    id: 'dl-2',
    course: 'SWP391',
    title: 'Báo cáo Sprint 2: Kiến trúc Microservices & Wireframe UI',
    dueDate: '17:00 Ngày mai',
    hoursLeft: 26,
    type: 'assignment',
    urgent: true,
  },
  {
    id: 'dl-3',
    course: 'CSN301',
    title: 'Thi thực hành EOS: Mô hình phân loại ảnh Convolutional Neural Network',
    dueDate: '14:00 24/10/2026',
    hoursLeft: 140,
    type: 'exam',
    urgent: false,
  },
  {
    id: 'dl-4',
    course: 'PRN211',
    title: 'Thi kết thúc môn (FE): Phát triển API ASP.NET Core RESTful',
    dueDate: '08:00 28/10/2026',
    hoursLeft: 230,
    type: 'exam',
    urgent: false,
  },
];

export function MobileDeadlinesScreen() {
  const navigate = useNavigate();
  const [filterCourse, setFilterCourse] = useState<string>('all');

  const filtered = DEMO_DEADLINES.filter((d) => {
    if (filterCourse !== 'all' && d.course !== filterCourse) return false;
    return true;
  });

  const urgentCount = DEMO_DEADLINES.filter((d) => d.urgent).length;

  return (
    <div className="mobile-app-shell">
      <MobilePageHeader
        title="Hạn nộp & Lịch thi"
        subtitle={`${urgentCount} hạn chót cần xử lý gấp`}
      />

      <main className="mobile-view-container">
        {/* Urgent Alert Banner */}
        {urgentCount > 0 && (
          <section className="mb-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 shrink-0">
                <AlertTriangle size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  CẢNH BÁO HẠN CHÓT TRONG 24H
                </h3>
                <p className="text-xs text-white/90 mt-0.5">
                  Bạn có bài Lab PRN211 cần nộp trước 23:59 tối nay!
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Filter Chips by Course */}
        <div className="mobile-chip-row mb-4">
          <button
            type="button"
            onClick={() => setFilterCourse('all')}
            className={`mobile-chip ${filterCourse === 'all' ? 'active' : ''}`}
          >
            Tất cả môn ({DEMO_DEADLINES.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCourse('PRN211')}
            className={`mobile-chip ${filterCourse === 'PRN211' ? 'active' : ''}`}
          >
            PRN211 (.NET)
          </button>
          <button
            type="button"
            onClick={() => setFilterCourse('SWP391')}
            className={`mobile-chip ${filterCourse === 'SWP391' ? 'active' : ''}`}
          >
            SWP391 (Đồ án)
          </button>
          <button
            type="button"
            onClick={() => setFilterCourse('CSN301')}
            className={`mobile-chip ${filterCourse === 'CSN301' ? 'active' : ''}`}
          >
            CSN301 (AI)
          </button>
        </div>

        {/* Deadline Items */}
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.98 }}
              className={`mobile-card p-4 flex flex-col gap-2.5 border-l-4 ${
                item.urgent ? 'border-l-[var(--m-campus-red)]' : 'border-l-[var(--m-brand-primary)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--m-brand-soft)] text-[var(--m-brand-primary)]">
                  {item.course}
                </span>
                <span
                  className={`text-xs font-bold flex items-center gap-1 ${
                    item.urgent ? 'text-[var(--m-campus-red)]' : 'text-[var(--m-text-secondary)]'
                  }`}
                >
                  <Clock size={13} /> Còn {item.hoursLeft} giờ
                </span>
              </div>

              <h3 className="text-sm font-bold text-[var(--m-text-primary)] leading-snug">
                {item.title}
              </h3>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--m-border-faint)] text-xs text-[var(--m-text-muted)]">
                <span>Hạn: {item.dueDate}</span>
                <span className="font-semibold text-[var(--m-brand-primary)]">
                  {item.type === 'exam' ? 'Lịch thi phòng máy' : 'Nộp trên FPT LMS'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
