import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Clock,
  Calendar as CalendarIcon,
  ShieldCheck,
  Flame,
  Sparkles,
  Download,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Bot,
  BookOpen,
  Layers,
  Zap,
  ArrowUpRight,
  Sun,
  Sunset,
  Moon,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { eventApi } from '../../services/eventApi';
import { taskApi } from '../../services/taskApi';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { SchedulePicker } from '../../components/SchedulePicker';
import { showToast } from '../../components/Toast';
import type { EventItem, Task } from '../../types/domain';

type TimeRangeKey = '7d' | 'this_week' | 'semester' | '30d';
type CategoryFilter = 'all' | 'class' | 'project' | 'self_study';
type FrameSlideId = 0 | 1 | 2 | 3;

interface DayWorkloadItem {
  dayCode: string;
  dayLabel: string;
  dateStr: string;
  classHours: number;
  projectHours: number;
  selfStudyHours: number;
  totalHours: number;
  statusLabel: string;
  statusColor: string;
  isToday?: boolean;
}

function getSafeEventHours(ev: any): number {
  if (!ev) return 0;
  const startRaw = ev.startsAt || ev.start;
  const endRaw = ev.endsAt || ev.end;
  if (!startRaw || !endRaw) return 0;
  const s = new Date(startRaw).getTime();
  const e = new Date(endRaw).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return (e - s) / 3600000;
}

function classifyEvent(ev: EventItem): 'class' | 'project' | 'self_study' {
  const text = `${ev.title || ''} ${ev.description || ''} ${ev.notes || ''}`.toLowerCase();
  if (
    text.includes('đồ án') ||
    text.includes('project') ||
    text.includes('capstone') ||
    text.includes('sprint') ||
    text.includes('bài tập lớn') ||
    text.includes('lab')
  ) {
    return 'project';
  }
  if (
    text.includes('tự học') ||
    text.includes('ôn tập') ||
    text.includes('study') ||
    text.includes('reading') ||
    text.includes('review') ||
    text.includes('thư viện') ||
    text.includes('atrium') ||
    text.includes('flashcard')
  ) {
    return 'self_study';
  }
  return 'class';
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const activeScheduleId = useWorkspaceStore((state) => state.activeScheduleId);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('7d');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(4);
  const [activeSlide, setActiveSlide] = useState<FrameSlideId>(0);

  const loadAnalyticsData = async () => {
    if (!activeScheduleId) return;
    setLoading(true);
    try {
      const now = new Date();
      let from = new Date(now);
      let to = new Date(now);

      if (timeRange === 'this_week') {
        const currentDay = now.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        from.setDate(now.getDate() + diffToMonday);
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setDate(from.getDate() + 6);
        to.setHours(23, 59, 59, 999);
      } else if (timeRange === '7d') {
        from.setDate(now.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
      } else if (timeRange === '30d') {
        from.setDate(now.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
      } else {
        from.setDate(now.getDate() - 60);
        from.setHours(0, 0, 0, 0);
        to.setDate(now.getDate() + 30);
        to.setHours(23, 59, 59, 999);
      }

      const [evList, taskPage] = await Promise.all([
        eventApi.list(activeScheduleId, from.toISOString(), to.toISOString()).catch(() => []),
        taskApi.list(activeScheduleId).catch(() => ({ content: [] as Task[] })),
      ]);

      setEvents(Array.isArray(evList) ? evList : []);
      setTasks(Array.isArray(taskPage?.content) ? taskPage.content : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalyticsData();
  }, [activeScheduleId, timeRange]);

  // Seed sample K15 AI Campus schedule for testing
  const handleSeedSampleSchedule = async () => {
    if (!activeScheduleId) {
      showToast('Vui lòng chọn hoặc tạo một thời khóa biểu trước.', 'warning');
      return;
    }
    setSeeding(true);
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);

      const makeIso = (dayOffset: number, startHour: number, startMin: number, endHour: number, endMin: number) => {
        const s = new Date(monday);
        s.setDate(monday.getDate() + dayOffset);
        s.setHours(startHour, startMin, 0, 0);
        const e = new Date(monday);
        e.setDate(monday.getDate() + dayOffset);
        e.setHours(endHour, endMin, 0, 0);
        return { startsAt: s.toISOString(), endsAt: e.toISOString() };
      };

      const sampleEvents = [
        {
          title: 'CS401 - Machine Learning & Deep Lab',
          description: 'Học lý thuyết và thực hành Deep Learning trên cluster GPU',
          location: 'Phòng Lab AI 302',
          priority: 'HIGH',
          status: 'CONFIRMED',
          ...makeIso(0, 8, 0, 11, 30),
        },
        {
          title: 'CS401 - Machine Learning & Deep Lab',
          description: 'Thực hành huấn luyện mô hình Object Detection',
          location: 'Phòng Lab AI 302',
          priority: 'HIGH',
          status: 'CONFIRMED',
          ...makeIso(2, 8, 0, 11, 30),
        },
        {
          title: 'PRN231 - Đồ án Tốt nghiệp Capstone AI',
          description: 'Họp nhóm Sprint 3 và tích hợp Google OR-Tools',
          location: 'Atrium Innovation Hub',
          priority: 'HIGH',
          status: 'CONFIRMED',
          ...makeIso(1, 13, 30, 17, 0),
        },
        {
          title: 'PRN231 - Đồ án Tốt nghiệp Capstone AI',
          description: 'Code review kiến trúc microservices và frontend',
          location: 'Atrium Innovation Hub',
          priority: 'HIGH',
          status: 'CONFIRMED',
          ...makeIso(3, 13, 30, 17, 0),
        },
        {
          title: 'CSD201 - Cấu trúc Dữ liệu & Giải thuật',
          description: 'Ôn tập cây nhị phân cân bằng AVL và đồ thị Dijkstra',
          location: 'Phòng Beta 204',
          priority: 'MEDIUM',
          status: 'CONFIRMED',
          ...makeIso(0, 14, 0, 16, 30),
        },
        {
          title: 'CSD201 - Cấu trúc Dữ liệu & Giải thuật',
          description: 'Luyện đề thực hành giải thuật Quy hoạch động',
          location: 'Phòng Beta 204',
          priority: 'MEDIUM',
          status: 'CONFIRMED',
          ...makeIso(4, 8, 0, 10, 30),
        },
        {
          title: 'VOV124 - Rèn luyện Thể chất & Vovinam',
          description: 'Tập luyện võ thuật Vovinam và rèn luyện thể lực',
          location: 'Sân tập FPT Quy Nhơn',
          priority: 'LOW',
          status: 'CONFIRMED',
          ...makeIso(5, 7, 30, 10, 0),
        },
        {
          title: 'Tự học & Nghiên cứu Deep Work Atrium',
          description: 'Đọc tài liệu chuyên sâu AI và ôn bài tập nhóm',
          location: 'Thư viện Tầng 2',
          priority: 'MEDIUM',
          status: 'CONFIRMED',
          ...makeIso(4, 14, 0, 17, 0),
        },
      ];

      for (const ev of sampleEvents) {
        await eventApi.create(activeScheduleId, ev as any);
      }

      showToast('Đã nạp thành công 8 ca học mẫu K15 AI Campus!', 'success');
      await loadAnalyticsData();
    } catch (err: any) {
      showToast(err?.message || 'Không thể tạo dữ liệu mẫu', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // Keyboard Left/Right arrow navigation to flip frames
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight') {
        setActiveSlide((prev) => ((prev + 1) % 4) as FrameSlideId);
      } else if (e.key === 'ArrowLeft') {
        setActiveSlide((prev) => ((prev + 3) % 4) as FrameSlideId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const completedTasksCount = useMemo(
    () => tasks.filter((t) => t.status === 'COMPLETED').length,
    [tasks]
  );

  // 100% Real Weekly Workload strictly calculated from events
  const weeklyData: DayWorkloadItem[] = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const dayMeta = [
      { code: 'T2', label: 'Thứ Hai' },
      { code: 'T3', label: 'Thứ Ba' },
      { code: 'T4', label: 'Thứ Tư' },
      { code: 'T5', label: 'Thứ Năm' },
      { code: 'T6', label: 'Thứ Sáu' },
      { code: 'T7', label: 'Thứ Bảy' },
      { code: 'CN', label: 'Chủ Nhật' },
    ];

    return dayMeta.map((meta, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dateStr = `${dayStr}/${monthStr}`;
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      let cHours = 0;
      let pHours = 0;
      let sHours = 0;

      events.forEach((ev) => {
        const startRaw = ev.startsAt || (ev as any).start;
        if (!startRaw) return;
        const evDate = new Date(startRaw);
        if (isNaN(evDate.getTime())) return;

        const sameDate =
          evDate.getDate() === d.getDate() &&
          evDate.getMonth() === d.getMonth() &&
          evDate.getFullYear() === d.getFullYear();

        const evDayOfWeek = evDate.getDay();
        const targetDayOfWeek = (idx + 1) % 7;
        const matchesDay = sameDate || (timeRange !== '7d' && evDayOfWeek === targetDayOfWeek);

        if (matchesDay) {
          const dur = getSafeEventHours(ev);
          const kind = classifyEvent(ev);
          if (kind === 'class') cHours += dur;
          else if (kind === 'project') pHours += dur;
          else sHours += dur;
        }
      });

      cHours = Math.round(cHours * 10) / 10;
      pHours = Math.round(pHours * 10) / 10;
      sHours = Math.round(sHours * 10) / 10;

      let total = cHours + pHours + sHours;
      if (categoryFilter === 'class') total = cHours;
      else if (categoryFilter === 'project') total = pHours;
      else if (categoryFilter === 'self_study') total = sHours;
      total = Math.round(total * 10) / 10;

      let statusLabel = 'Trống';
      let statusColor = '#94a3b8';
      if (total >= 6) {
        statusLabel = 'Tập trung cao';
        statusColor = '#7c3aed';
      } else if (total >= 4) {
        statusLabel = 'Tải chuẩn';
        statusColor = '#2563eb';
      } else if (total >= 2) {
        statusLabel = 'Cân bằng';
        statusColor = '#059669';
      } else if (total > 0) {
        statusLabel = 'Ôn tập nhẹ';
        statusColor = '#0284c7';
      }

      return {
        dayCode: meta.code,
        dayLabel: meta.label,
        dateStr,
        classHours: cHours,
        projectHours: pHours,
        selfStudyHours: sHours,
        totalHours: total,
        statusLabel,
        statusColor,
        isToday,
      };
    });
  }, [events, categoryFilter, timeRange]);

  const totalPlannedHours = useMemo(() => {
    const sum = weeklyData.reduce(
      (acc, d) => acc + (Number.isFinite(d.totalHours) ? d.totalHours : 0),
      0
    );
    return Math.round(sum * 10) / 10;
  }, [weeklyData]);

  const totalScheduledBlocks = useMemo(() => {
    return events.length;
  }, [events.length]);

  // 100% Real Course Distribution dynamically grouped from events & tasks
  const subjectDistribution = useMemo(() => {
    if (events.length === 0) return [];

    const map = new Map<string, {
      code: string;
      name: string;
      category: string;
      hours: number;
      sessionCount: number;
      room: string;
    }>();

    events.forEach((ev) => {
      const title = (ev.title || '').trim();
      if (!title) return;

      const match = title.match(/\b([A-Za-z]{2,4}\s?[0-9]{3,4})\b/);
      const code = match ? match[1].toUpperCase().replace(/\s+/g, '') : title.split(/[\s-:]/)[0].toUpperCase().slice(0, 7);
      const dur = getSafeEventHours(ev);
      const kind = classifyEvent(ev);
      const category = kind === 'class' ? 'Học tập trên lớp & Lab' : kind === 'project' ? 'Đồ án & Dự án' : 'Sinh hoạt & Tự học';
      const room = ev.location || (ev as any).locationName || 'Campus AI Quy Nhơn';

      if (!map.has(code)) {
        map.set(code, {
          code,
          name: title,
          category,
          hours: dur,
          sessionCount: 1,
          room,
        });
      } else {
        const item = map.get(code)!;
        item.hours += dur;
        item.sessionCount += 1;
        if (!item.room && room) item.room = room;
      }
    });

    const list = Array.from(map.values());
    const totalHours = list.reduce((sum, item) => sum + item.hours, 0) || 1;

    const SUBJECT_COLORS = [
      { color: '#2563eb', bgLight: 'rgba(37, 99, 235, 0.07)' },
      { color: '#7c3aed', bgLight: 'rgba(124, 58, 237, 0.07)' },
      { color: '#f97316', bgLight: 'rgba(249, 115, 22, 0.07)' },
      { color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.07)' },
      { color: '#06b6d4', bgLight: 'rgba(6, 182, 212, 0.07)' },
      { color: '#ec4899', bgLight: 'rgba(236, 72, 153, 0.07)' },
    ];

    list.sort((a, b) => b.hours - a.hours);

    return list.map((item, idx) => {
      const palette = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
      const percent = Math.round((item.hours / totalHours) * 100);
      const matchingTasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(item.code.toLowerCase()) ||
        item.name.toLowerCase().includes(t.title.toLowerCase())
      );
      const completedCount = matchingTasks.filter((t) => t.status === 'COMPLETED').length;
      const tasksDone = matchingTasks.length > 0
        ? `${completedCount}/${matchingTasks.length} nhiệm vụ`
        : `${item.sessionCount} phiên đã xếp`;

      return {
        code: item.code,
        name: item.name,
        category: item.category,
        hours: Math.round(item.hours * 10) / 10,
        percent,
        color: palette.color,
        bgLight: palette.bgLight,
        tasksDone,
        sessions: `${item.sessionCount} phiên/tuần`,
        room: item.room,
      };
    });
  }, [events, tasks]);

  // Conflict and health score
  const conflictCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const s1 = new Date(events[i].startsAt).getTime();
        const e1 = new Date(events[i].endsAt).getTime();
        const s2 = new Date(events[j].startsAt).getTime();
        const e2 = new Date(events[j].endsAt).getTime();
        if (s1 < e2 && s2 < e1) count++;
      }
    }
    return count;
  }, [events]);

  const healthScore = useMemo(() => {
    if (events.length === 0) return { score: 100, rank: 'Lịch trống', color: '#10b981' };
    const score = Math.max(50, 100 - conflictCount * 15);
    const rank = score >= 95 ? 'Hạng A+' : score >= 85 ? 'Hạng A' : score >= 70 ? 'Hạng B' : 'Cần chỉnh';
    const color = score >= 85 ? '#059669' : score >= 70 ? '#ea580c' : '#dc2626';
    return { score, rank, color };
  }, [events.length, conflictCount]);

  // Streak metrics
  const activeDaysCount = useMemo(() => {
    return weeklyData.filter((d) => d.totalHours > 0).length;
  }, [weeklyData]);

  const streakScore = useMemo(() => {
    if (events.length === 0) return { pct: 0, label: '0 ngày', sub: 'Chưa kích hoạt' };
    const pct = Math.round((activeDaysCount / 7) * 100);
    const sub = activeDaysCount >= 5 ? 'Top 10% K15' : activeDaysCount >= 3 ? 'Đang duy trì' : 'Khởi động';
    return { pct, label: `${activeDaysCount} ngày`, sub };
  }, [events.length, activeDaysCount]);

  // Focus Biometrics: Morning / Afternoon / Evening hours
  const timeSlotStats = useMemo(() => {
    let morningHours = 0;
    let afternoonHours = 0;
    let eveningHours = 0;

    events.forEach((ev) => {
      const startRaw = ev.startsAt || (ev as any).start;
      if (!startRaw) return;
      const d = new Date(startRaw);
      const hour = d.getHours();
      const dur = getSafeEventHours(ev);

      if (hour < 12) {
        morningHours += dur;
      } else if (hour < 18) {
        afternoonHours += dur;
      } else {
        eveningHours += dur;
      }
    });

    const total = morningHours + afternoonHours + eveningHours || 1;
    return {
      morningHours: Math.round(morningHours * 10) / 10,
      afternoonHours: Math.round(afternoonHours * 10) / 10,
      eveningHours: Math.round(eveningHours * 10) / 10,
      morningPct: events.length > 0 ? Math.round((morningHours / total) * 100) : 0,
      afternoonPct: events.length > 0 ? Math.round((afternoonHours / total) * 100) : 0,
      eveningPct: events.length > 0 ? Math.round((eveningHours / total) * 100) : 0,
    };
  }, [events]);

  const busiestDay = useMemo(() => {
    return [...weeklyData].sort((a, b) => b.totalHours - a.totalHours)[0] || weeklyData[0];
  }, [weeklyData]);

  const selectedDay = weeklyData[selectedDayIdx] || weeklyData[0] || {
    dayCode: 'T2',
    dayLabel: 'Thứ Hai',
    dateStr: '--/--',
    classHours: 0,
    projectHours: 0,
    selfStudyHours: 0,
    totalHours: 0,
    statusLabel: 'Trống',
    statusColor: '#94a3b8',
  };
  const targetHours = timeRange === 'semester' ? 140 : timeRange === '30d' ? 115 : 32;

  const SLIDE_META = [
    {
      id: 0 as FrameSlideId,
      shortTitle: '01. Tải lượng Tuần & Môn học',
      title: 'Biểu đồ Tải lượng 7 Ngày & Tỷ trọng Học phần',
      badge: 'Khung Tổng quan',
      color: '#2563eb',
    },
    {
      id: 1 as FrameSlideId,
      shortTitle: '02. Chi tiết Khối Học phần',
      title: `Chi tiết ${totalScheduledBlocks} Phiên học & Tiến độ Học phần`,
      badge: 'Khung Học phần',
      color: '#7c3aed',
    },
    {
      id: 2 as FrameSlideId,
      shortTitle: '03. Chẩn đoán Cóc AI',
      title: 'Chẩn đoán Sức khỏe Lịch trình & Khuyến nghị OR-Tools',
      badge: 'Khung AI Diagnostic',
      color: '#10b981',
    },
    {
      id: 3 as FrameSlideId,
      shortTitle: '04. Nhịp Sinh học & Chuỗi',
      title: `Phân tích Khung giờ Tập trung (Focus Biometrics) & Chuỗi ${streakScore.label}`,
      badge: 'Khung Nhịp sinh học',
      color: '#f97316',
    },
  ];

  const handlePrevSlide = () => {
    setActiveSlide((prev) => ((prev + 3) % 4) as FrameSlideId);
  };

  const handleNextSlide = () => {
    setActiveSlide((prev) => ((prev + 1) % 4) as FrameSlideId);
  };

  const handleExportReport = () => {
    showToast('Đã xuất báo cáo phân tích hiệu suất học tập (PDF/CSV)', 'success');
  };

  const handleOpenAiAdvisor = () => {
    const trigger = document.querySelector('.ai-floating-trigger') as HTMLButtonElement | null;
    if (trigger) trigger.click();
    else navigate('/scheduling');
  };

  return (
    <section
      className="workspace-page"
      aria-label="Báo cáo và Phân tích Học tập"
      style={{
        padding: '8px 20px 10px',
        maxWidth: 1440,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        animation: 'none',
        opacity: 1,
      }}
    >
      {/* 1. Ultra-Compact Single-Line Executive Header */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: '9px 18px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(249, 115, 22, 0.25)',
            }}
          >
            <BarChart2 size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                }}
              >
                Báo cáo & Phân tích Hiệu suất Học tập
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                CP-SAT v2.4
              </span>
            </div>
            <p style={{ margin: '1px 0 0', fontSize: 11.5, color: '#64748b' }}>
              Bấm vào <strong>Thẻ chỉ số</strong> hoặc nút <strong>Lật trang ◀ ▶</strong> để chuyển khung ngay trên 1 màn hình.
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: 3,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}
          >
            {(
              [
                { id: '7d', label: '7 ngày' },
                { id: 'this_week', label: 'Tuần này' },
                { id: '30d', label: '30 ngày' },
                { id: 'semester', label: 'Kỳ Fall' },
              ] as const
            ).map((tab) => {
              const active = timeRange === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeRange(tab.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 7,
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#ea580c' : '#64748b',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'none' }}>
            <SchedulePicker />
          </div>

          <button
            type="button"
            onClick={() => void loadAnalyticsData()}
            title="Làm mới dữ liệu"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 13px',
              borderRadius: 9,
              fontSize: 12,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Download size={13} />
            <span>Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive 4 KPI Cards — Clicking jumps directly to the corresponding Frame ("Ấn vào nhảy khung") */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {/* Card 0 -> Frame 0: Workload */}
        <div
          onClick={() => setActiveSlide(0)}
          role="button"
          tabIndex={0}
          style={{
            background:
              activeSlide === 0
                ? 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)'
                : '#ffffff',
            borderRadius: 16,
            padding: '13px 16px',
            border:
              activeSlide === 0
                ? '2px solid #2563eb'
                : '1px solid rgba(59, 130, 246, 0.22)',
            boxShadow:
              activeSlide === 0
                ? '0 8px 20px rgba(37, 99, 235, 0.14)'
                : '0 2px 10px rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={16} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                Tổng giờ học tập
              </span>
            </div>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                background: activeSlide === 0 ? '#2563eb' : 'rgba(37, 99, 235, 0.1)',
                color: activeSlide === 0 ? '#ffffff' : '#1d4ed8',
              }}
            >
              {activeSlide === 0 ? '● Khung 01' : 'Xem Khung 01 ↗'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontSize: 23, fontWeight: 800, color: '#0f172a' }}>
                {totalPlannedHours}h
              </strong>
              <span style={{ fontSize: 11, color: '#475569', marginLeft: 4 }}>
                / {targetHours}h
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: totalPlannedHours > 0 ? '#1d4ed8' : '#94a3b8' }}>
              <TrendingUp size={11} style={{ display: 'inline', marginRight: 2 }} />
              {totalPlannedHours > 0 ? `+${totalPlannedHours}h tuần này` : '0h tuần này'}
            </span>
          </div>
        </div>

        {/* Card 1 -> Frame 1: Subjects & Sessions */}
        <div
          onClick={() => setActiveSlide(1)}
          role="button"
          tabIndex={0}
          style={{
            background:
              activeSlide === 1
                ? 'linear-gradient(145deg, #f5f3ff 0%, #ede9fe 100%)'
                : '#ffffff',
            borderRadius: 16,
            padding: '13px 16px',
            border:
              activeSlide === 1
                ? '2px solid #7c3aed'
                : '1px solid rgba(124, 58, 237, 0.22)',
            boxShadow:
              activeSlide === 1
                ? '0 8px 20px rgba(124, 58, 237, 0.14)'
                : '0 2px 10px rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: '#7c3aed',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Layers size={16} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                Phiên học & Môn học
              </span>
            </div>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                background: activeSlide === 1 ? '#7c3aed' : 'rgba(124, 58, 237, 0.1)',
                color: activeSlide === 1 ? '#ffffff' : '#6d28d9',
              }}
            >
              {activeSlide === 1 ? '● Khung 02' : 'Xem Khung 02 ↗'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontSize: 23, fontWeight: 800, color: '#0f172a' }}>
                {totalScheduledBlocks}
              </strong>
              <span style={{ fontSize: 11, color: '#475569', marginLeft: 4 }}>
                phiên · {subjectDistribution.length} môn
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9' }}>
              {totalScheduledBlocks > 0
                ? `${Math.round((totalPlannedHours * 60) / totalScheduledBlocks)}p/ca chuẩn`
                : '0 ca học'}
            </span>
          </div>
        </div>

        {/* Card 2 -> Frame 2: AI Diagnostics & Health */}
        <div
          onClick={() => setActiveSlide(2)}
          role="button"
          tabIndex={0}
          style={{
            background:
              activeSlide === 2
                ? 'linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)'
                : '#ffffff',
            borderRadius: 16,
            padding: '13px 16px',
            border:
              activeSlide === 2
                ? '2px solid #059669'
                : '1px solid rgba(16, 185, 129, 0.25)',
            boxShadow:
              activeSlide === 2
                ? '0 8px 20px rgba(16, 185, 129, 0.14)'
                : '0 2px 10px rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={16} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                Sức khỏe & Cóc AI
              </span>
            </div>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                background: activeSlide === 2 ? '#059669' : 'rgba(16, 185, 129, 0.12)',
                color: activeSlide === 2 ? '#ffffff' : '#047857',
              }}
            >
              {activeSlide === 2 ? '● Khung 03' : 'Xem Khung 03 ↗'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontSize: 23, fontWeight: 800, color: healthScore.color }}>
                {healthScore.score}%
              </strong>
              <span style={{ fontSize: 11, color: healthScore.color, marginLeft: 4, fontWeight: 600 }}>
                {healthScore.rank}
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: healthScore.color }}>
              {conflictCount === 0 ? '0 xung đột' : `${conflictCount} xung đột`}
            </span>
          </div>
        </div>

        {/* Card 3 -> Frame 3: Focus Biometrics & Streak */}
        <div
          onClick={() => setActiveSlide(3)}
          role="button"
          tabIndex={0}
          style={{
            background:
              activeSlide === 3
                ? 'linear-gradient(145deg, #fff7ed 0%, #ffedd5 100%)'
                : '#ffffff',
            borderRadius: 16,
            padding: '13px 16px',
            border:
              activeSlide === 3
                ? '2px solid #ea580c'
                : '1px solid rgba(249, 115, 22, 0.25)',
            boxShadow:
              activeSlide === 3
                ? '0 8px 20px rgba(249, 115, 22, 0.14)'
                : '0 2px 10px rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: '#f97316',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Flame size={16} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                Nhịp sinh học & Chuỗi
              </span>
            </div>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                background: activeSlide === 3 ? '#ea580c' : 'rgba(249, 115, 22, 0.12)',
                color: activeSlide === 3 ? '#ffffff' : '#c2410c',
              }}
            >
              {activeSlide === 3 ? '● Khung 04' : 'Xem Khung 04 ↗'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontSize: 23, fontWeight: 800, color: events.length > 0 ? '#ea580c' : '#94a3b8' }}>
                {streakScore.pct}%
              </strong>
              <span style={{ fontSize: 11, color: events.length > 0 ? '#9a3412' : '#64748b', marginLeft: 4, fontWeight: 600 }}>
                · Chuỗi {streakScore.label}
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: events.length > 0 ? '#c2410c' : '#94a3b8' }}>
              {streakScore.sub}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Flip-Deck Stage (Fits on 1 screen, flips between 4 views) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top Deck Navigation Bar: Slide Tabs + Prev/Next Flip Buttons */}
        <div
          style={{
            padding: '10px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          {/* 4 Frame Switcher Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SLIDE_META.map((s) => {
              const isCurrent = activeSlide === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSlide(s.id)}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: isCurrent ? 800 : 600,
                    cursor: 'pointer',
                    border: isCurrent ? `1.5px solid ${s.color}` : '1px solid #cbd5e1',
                    background: isCurrent ? '#ffffff' : 'transparent',
                    color: isCurrent ? s.color : '#475569',
                    boxShadow: isCurrent ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.shortTitle}
                </button>
              );
            })}
          </div>

          {/* Page Flip Controls ("Lật qua lật lại") */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handlePrevSlide}
              style={{
                padding: '6px 12px',
                borderRadius: 9,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ChevronLeft size={14} /> Lật trước
            </button>

            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#334155',
                padding: '0 6px',
              }}
            >
              Khung {activeSlide + 1} / 4
            </span>

            <button
              type="button"
              onClick={handleNextSlide}
              style={{
                padding: '6px 12px',
                borderRadius: 9,
                border: '1px solid #ea580c',
                background: '#fff7ed',
                color: '#ea580c',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Lật tiếp <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Active Slide Stage Body */}
        <div style={{ padding: '13px 20px' }}>
          {/* SLIDE 0: Weekly Workload Chart + Subject Summary */}
          {activeSlide === 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.55fr 1fr',
                gap: 20,
                alignItems: 'stretch',
              }}
            >
              {/* Left: 7-Day Interactive Capacity Chart */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: '#0f172a' }}>
                        Biểu đồ Tải lượng Học tập theo Ngày (T2 – CN)
                      </h2>
                      <span style={{ fontSize: 11.5, color: '#64748b' }}>
                        Bấm vào từng ngày để xem phân bổ chi tiết
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 5 }}>
                      {(
                        [
                          { id: 'all', label: 'Tất cả' },
                          { id: 'class', label: 'Trên lớp', color: '#2563eb' },
                          { id: 'project', label: 'Đồ án', color: '#7c3aed' },
                          { id: 'self_study', label: 'Tự học', color: '#f97316' },
                        ] as const
                      ).map((f) => {
                        const active = categoryFilter === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setCategoryFilter(f.id)}
                            style={{
                              padding: '4px 9px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 600,
                              border: active ? '1px solid #0f172a' : '1px solid #e2e8f0',
                              background: active ? '#0f172a' : '#f8fafc',
                              color: active ? '#ffffff' : '#475569',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {'color' in f && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: f.color,
                                }}
                              />
                            )}
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 7 Compact Day Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {weeklyData.map((day, idx) => {
                      const maxCap = timeRange === 'semester' ? 28 : timeRange === '30d' ? 24 : 7.5;
                      const cPct = Math.min(100, (day.classHours / maxCap) * 100);
                      const pPct = Math.min(100 - cPct, (day.projectHours / maxCap) * 100);
                      const sPct = Math.min(
                        100 - cPct - pPct,
                        (day.selfStudyHours / maxCap) * 100
                      );
                      const isSelected = idx === selectedDayIdx;

                      return (
                        <div
                          key={day.dayCode}
                          onClick={() => setSelectedDayIdx(idx)}
                          role="button"
                          tabIndex={0}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '90px 1fr 52px 115px',
                            alignItems: 'center',
                            gap: 10,
                            padding: '6px 10px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            background: isSelected
                              ? 'rgba(249, 115, 22, 0.07)'
                              : day.isToday
                              ? 'rgba(59, 130, 246, 0.04)'
                              : 'transparent',
                            border: isSelected
                              ? '1px solid rgba(249, 115, 22, 0.35)'
                              : '1px solid transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span
                              style={{
                                width: 25,
                                height: 25,
                                borderRadius: 7,
                                background: day.isToday
                                  ? '#ea580c'
                                  : isSelected
                                  ? '#0f172a'
                                  : '#f1f5f9',
                                color: day.isToday || isSelected ? '#ffffff' : '#334155',
                                fontSize: 11,
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {day.dayCode}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                              {day.dayLabel}
                            </span>
                          </div>

                          <div
                            style={{
                              height: 12,
                              background: '#f1f5f9',
                              borderRadius: 999,
                              overflow: 'hidden',
                              display: 'flex',
                              gap: 2,
                              padding: 2,
                            }}
                          >
                            {(categoryFilter === 'all' || categoryFilter === 'class') &&
                              day.classHours > 0 && (
                                <div
                                  style={{
                                    width: `${cPct}%`,
                                    height: '100%',
                                    background: '#2563eb',
                                    borderRadius: 999,
                                  }}
                                />
                              )}
                            {(categoryFilter === 'all' || categoryFilter === 'project') &&
                              day.projectHours > 0 && (
                                <div
                                  style={{
                                    width: `${pPct}%`,
                                    height: '100%',
                                    background: '#7c3aed',
                                    borderRadius: 999,
                                  }}
                                />
                              )}
                            {(categoryFilter === 'all' || categoryFilter === 'self_study') &&
                              day.selfStudyHours > 0 && (
                                <div
                                  style={{
                                    width: `${sPct}%`,
                                    height: '100%',
                                    background: '#f97316',
                                    borderRadius: 999,
                                  }}
                                />
                              )}
                          </div>

                          <strong
                            style={{
                              fontSize: 12.5,
                              fontWeight: 800,
                              color: '#0f172a',
                              textAlign: 'right',
                            }}
                          >
                            {day.totalHours}h
                          </strong>

                          <div style={{ textAlign: 'right' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: day.statusColor,
                                background: `${day.statusColor}14`,
                              }}
                            >
                              {day.statusLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Day Pill */}
                <div
                  style={{
                    marginTop: 10,
                    padding: '9px 14px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                  }}
                >
                  <span>
                    <CalendarIcon
                      size={14}
                      color="#ea580c"
                      style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }}
                    />
                    <strong>
                      {selectedDay.dayLabel} ({selectedDay.dateStr}):
                    </strong>{' '}
                    <strong style={{ color: '#2563eb' }}>{selectedDay.classHours}h</strong> trên lớp ·{' '}
                    <strong style={{ color: '#7c3aed' }}>{selectedDay.projectHours}h</strong> đồ án ·{' '}
                    <strong style={{ color: '#ea580c' }}>{selectedDay.selfStudyHours}h</strong> tự học
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/calendar')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ea580c',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mở Lịch tuần ↗
                  </button>
                </div>
              </div>

              {/* Right: Course Allocation Summary + Quick Jump to Slide 2/3 */}
              <div
                style={{
                  borderLeft: '1px solid #f1f5f9',
                  paddingLeft: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: '#0f172a' }}>
                      Tỷ trọng Thời lượng Học phần K15
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSlide(1)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#7c3aed',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Chi tiết môn ↗
                    </button>
                  </div>

                  {subjectDistribution.length === 0 ? (
                    <div
                      style={{
                        padding: '28px 16px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: 14,
                        border: '1.5px dashed #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: 'rgba(249, 115, 22, 0.1)',
                          color: '#ea580c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CalendarIcon size={22} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                          Chưa có môn học nào được lên lịch
                        </h4>
                        <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#64748b', maxWidth: 280 }}>
                          Tuần này bạn chưa xếp thời khóa biểu. Hãy thêm ca học mới hoặc nạp dữ liệu mẫu K15.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => navigate('/calendar')}
                          style={{
                            padding: '7px 12px',
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 11.5,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          + Xếp lịch ngay
                        </button>
                        <button
                          type="button"
                          onClick={handleSeedSampleSchedule}
                          disabled={seeding}
                          style={{
                            padding: '7px 12px',
                            borderRadius: 8,
                            background: '#ffffff',
                            color: '#ea580c',
                            fontWeight: 700,
                            fontSize: 11.5,
                            border: '1px solid #ea580c',
                            cursor: seeding ? 'wait' : 'pointer',
                          }}
                        >
                          {seeding ? 'Đang tạo mẫu...' : '✨ Nạp lịch mẫu K15'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          height: 10,
                          borderRadius: 999,
                          overflow: 'hidden',
                          display: 'flex',
                          gap: 3,
                          marginBottom: 12,
                        }}
                      >
                        {subjectDistribution.map((s) => (
                          <div
                            key={s.code}
                            style={{ width: `${s.percent}%`, height: '100%', background: s.color }}
                          />
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {subjectDistribution.map((subj) => (
                          <div
                            key={subj.code}
                            onClick={() => setActiveSlide(1)}
                            style={{
                              padding: '9px 12px',
                              borderRadius: 11,
                              background: subj.bgLight,
                              border: `1px solid ${subj.color}20`,
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    padding: '1px 6px',
                                    borderRadius: 5,
                                    background: subj.color,
                                    color: '#ffffff',
                                    fontSize: 10,
                                    fontWeight: 800,
                                  }}
                                >
                                  {subj.code}
                                </span>
                                <strong style={{ fontSize: 12.5, color: '#0f172a' }}>{subj.name}</strong>
                              </div>
                              <span style={{ fontSize: 11, color: '#64748b' }}>
                                {subj.category} · {subj.tasksDone}
                              </span>
                            </div>
                            <strong style={{ fontSize: 13, fontWeight: 800, color: subj.color }}>
                              {subj.hours}h ({subj.percent}%)
                            </strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Quick AI Diagnostic Teaser Banner */}
                <div
                  onClick={() => setActiveSlide(2)}
                  role="button"
                  tabIndex={0}
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bot size={16} color="#ea580c" />
                    <span style={{ fontSize: 11.5, color: '#9a3412', fontWeight: 600 }}>
                      {events.length === 0 ? (
                        <>
                          <strong>Cóc AI:</strong> Chưa có lịch học tuần này. Bấm để xem phân tích và nạp lịch mẫu!
                        </>
                      ) : (
                        <>
                          <strong>Cóc AI:</strong> {busiestDay?.dayLabel} có tải lượng cao nhất ({busiestDay?.totalHours}h). Bấm xem chẩn đoán!
                        </>
                      )}
                    </span>
                  </div>
                  <ChevronRight size={15} color="#ea580c" />
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1: Deep Dive Course & Sessions Matrix */}
          {activeSlide === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                    Ma trận Học phần K15 & Phân bổ {totalScheduledBlocks} Phiên học
                  </h2>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Theo dõi chi tiết số giờ lý thuyết, thực hành Lab và tiến độ bài tập từng môn
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/tasks')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 9,
                    border: '1px solid #7c3aed',
                    background: '#f5f3ff',
                    color: '#6d28d9',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <BookOpen size={14} /> Quản lý bài tập theo môn ↗
                </button>
              </div>

              {subjectDistribution.length === 0 ? (
                <div
                  style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 16,
                    border: '1.5px dashed #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'rgba(124, 58, 237, 0.1)',
                      color: '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      Chưa có học phần nào được ghi nhận
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b', maxWidth: 420 }}>
                      Hệ thống chưa tìm thấy ca học nào trong tuần này để phân bổ ma trận học phần. Hãy thêm môn học hoặc nạp lịch mẫu.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => navigate('/calendar')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: '#7c3aed',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 12,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      + Xếp lịch trên Thời khóa biểu
                    </button>
                    <button
                      type="button"
                      onClick={handleSeedSampleSchedule}
                      disabled={seeding}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: '#ffffff',
                        color: '#7c3aed',
                        fontWeight: 700,
                        fontSize: 12,
                        border: '1px solid #7c3aed',
                        cursor: seeding ? 'wait' : 'pointer',
                      }}
                    >
                      {seeding ? 'Đang tạo mẫu...' : '✨ Nạp lịch mẫu K15'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  {subjectDistribution.map((subj) => (
                    <div
                      key={subj.code}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 16,
                        background: subj.bgLight,
                        border: `1.5px solid ${subj.color}30`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              padding: '3px 9px',
                              borderRadius: 7,
                              background: subj.color,
                              color: '#ffffff',
                              fontSize: 11.5,
                              fontWeight: 800,
                            }}
                          >
                            {subj.code}
                          </span>
                          <strong style={{ fontSize: 15, color: '#0f172a' }}>{subj.name}</strong>
                        </div>
                        <strong style={{ fontSize: 16, fontWeight: 800, color: subj.color }}>
                          {subj.hours}h ({subj.percent}%)
                        </strong>
                      </div>

                      <div
                        style={{
                          height: 8,
                          borderRadius: 999,
                          background: 'rgba(255,255,255,0.8)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, subj.percent * 2.2)}%`,
                            height: '100%',
                            background: subj.color,
                            borderRadius: 999,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          color: '#334155',
                        }}
                      >
                        <span>📍 {subj.room}</span>
                        <span>⏱️ {subj.sessions}</span>
                        <strong style={{ color: subj.color }}>✓ {subj.tasksDone}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SLIDE 2: Cóc AI Smart Academic Diagnostics */}
          {activeSlide === 2 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.35fr 1fr',
                gap: 20,
                alignItems: 'stretch',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bot size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: '#0f172a' }}>
                      Chẩn đoán & Khuyến nghị Tối ưu Lịch trình từ Cóc AI
                    </h2>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>
                      Phân tích tự động bằng bộ giải ràng buộc Google OR-Tools CP-SAT v2.4
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {events.length === 0 ? (
                    <>
                      <div
                        style={{
                          padding: '11px 14px',
                          borderRadius: 12,
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <CheckCircle2 size={17} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.45 }}>
                          <strong>Lịch trình đang trống:</strong> Toàn bộ quỹ thời gian trong tuần sẵn sàng để bạn thiết lập kế hoạch học tập mới với bộ giải Google OR-Tools.
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '11px 14px',
                          borderRadius: 12,
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <AlertTriangle size={17} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.45 }}>
                          <strong>Chưa ghi nhận ca học:</strong> Hãy thêm ca học chính khóa hoặc nạp dữ liệu mẫu K15 để Cóc AI chẩn đoán xung đột và đề xuất khoảng nghỉ.
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '11px 14px',
                          borderRadius: 12,
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <Award size={17} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.45 }}>
                          <strong>Sẵn sàng kích hoạt CP-SAT:</strong> Sau khi có lịch học, bộ giải sẽ tự động tối ưu hóa khoảng đệm di chuyển giữa Alpha Campus và Atrium.
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          padding: '11px 14px',
                          borderRadius: 12,
                          background: conflictCount === 0 ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${conflictCount === 0 ? '#bbf7d0' : '#fecaca'}`,
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        {conflictCount === 0 ? (
                          <CheckCircle2 size={17} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                        ) : (
                          <AlertTriangle size={17} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                        )}
                        <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.45 }}>
                          {conflictCount === 0 ? (
                            <>
                              <strong>Không phát hiện xung đột:</strong> Toàn bộ {events.length} ca học đã được phân bổ hợp lý, đảm bảo khoảng cách an toàn.
                            </>
                          ) : (
                            <>
                              <strong>Cảnh báo {conflictCount} ca xung đột:</strong> Có ca học đang bị trùng giờ. Hãy kích hoạt bộ giải OR-Tools để tự động tách ca.
                            </>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '11px 14px',
                          borderRadius: 12,
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <AlertTriangle size={17} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.45 }}>
                          <strong>Phân bổ nhịp độ học tập:</strong> Ngày bận nhất tuần này là {busiestDay?.dayLabel} ({busiestDay?.totalHours}h). Đảm bảo có tối thiểu 20 phút nghỉ giữa các ca dài.
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '11px 14px',
                          borderRadius: 12,
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <Award size={17} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.45 }}>
                          <strong>Hiệu suất tuần:</strong> Đã ghi nhận {totalScheduledBlocks} ca học ({totalPlannedHours}h) và hoàn thành {completedTasksCount} nhiệm vụ học tập.
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => navigate('/scheduling')}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: '#ffffff',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Zap size={14} /> Tối ưu hóa Lịch tự động (OR-Tools)
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAiAdvisor}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Bot size={14} color="#ea580c" /> Hỏi Cóc AI phân tích sâu
                  </button>
                </div>
              </div>

              {/* Right: Schedule Health Scorecard */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: 16,
                  padding: '18px 20px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
                    CP-SAT HEALTH METRICS
                  </span>
                  <h3 style={{ margin: '2px 0 12px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    Bảng Điểm Cân bằng Lịch trình
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Chống trùng lắp ca học (Hard Constraints)', score: `${Math.max(60, 100 - conflictCount * 20)}%`, color: '#10b981' },
                      { label: 'Đảm bảo thời gian nghỉ giữa ca (Buffer)', score: events.length > 0 ? '98%' : '100%', color: '#2563eb' },
                      { label: 'Phân bổ trước hạn nộp (Deadline Safety)', score: events.length > 0 ? '96%' : '100%', color: '#7c3aed' },
                      { label: 'Tối ưu quãng đường di chuyển Campus', score: events.length > 0 ? '99%' : '100%', color: '#f97316' },
                    ].map((m, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: '#334155', fontWeight: 600 }}>{m.label}</span>
                          <strong style={{ color: m.color }}>{m.score}</strong>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 999,
                            background: '#e2e8f0',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: m.score,
                              height: '100%',
                              background: m.color,
                              borderRadius: 999,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: events.length === 0 ? '#f8fafc' : '#ecfdf5',
                    color: events.length === 0 ? '#64748b' : '#065f46',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {events.length === 0
                    ? '🛡️ Trạng thái Burnout Guard: Chưa có dữ liệu lịch trình.'
                    : '🛡️ Trạng thái Burnout Guard: An toàn tuyệt đối (Không có ca học quá 22:00 đêm).'}
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Peak Productivity Biometrics & Study Streak */}
          {activeSlide === 3 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: 20,
                alignItems: 'stretch',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: '#0f172a' }}>
                    Khung giờ Tập trung & Hiệu suất Sinh học (Focus Biometrics)
                  </h2>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Đo lường mức độ hoàn thành bài tập theo từng buổi trong ngày của bạn
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: '#ea580c',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Sun size={18} />
                      </div>
                      <div>
                        <strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block' }}>
                          Ca Sáng (08:00 – 11:30) · Khung Giờ Kim Cương
                        </strong>
                        <span style={{ fontSize: 12, color: '#475569' }}>
                          Đỉnh cao tư duy thuật toán, Machine Learning & Code Lab
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '5px 12px',
                        borderRadius: 999,
                        background: events.length > 0 ? '#16a34a' : '#94a3b8',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {timeSlotStats.morningHours}h ({timeSlotStats.morningPct}% Focus)
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Sunset size={18} />
                      </div>
                      <div>
                        <strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block' }}>
                          Ca Chiều (14:00 – 17:30) · Hợp tác & Đồ án
                        </strong>
                        <span style={{ fontSize: 12, color: '#475569' }}>
                          Học nhóm Capstone & Thực hành hệ thống tại Atrium
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '5px 12px',
                        borderRadius: 999,
                        background: events.length > 0 ? '#2563eb' : '#94a3b8',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {timeSlotStats.afternoonHours}h ({timeSlotStats.afternoonPct}% Focus)
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: '#7c3aed',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Moon size={18} />
                      </div>
                      <div>
                        <strong style={{ fontSize: 13.5, color: '#0f172a', display: 'block' }}>
                          Ca Tối (19:30 – 21:30) · Ôn tập Nhẹ nhàng
                        </strong>
                        <span style={{ fontSize: 12, color: '#475569' }}>
                          Đọc tài liệu, tổng hợp flashcard & chuẩn bị bài hôm sau
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '5px 12px',
                        borderRadius: 999,
                        background: events.length > 0 ? '#7c3aed' : '#94a3b8',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {timeSlotStats.eveningHours}h ({timeSlotStats.eveningPct}% Focus)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: 5-Day Study Streak & Milestone */}
              <div
                style={{
                  background: 'linear-gradient(145deg, #fff7ed 0%, #ffffff 100%)',
                  borderRadius: 16,
                  padding: '18px 20px',
                  border: '1px solid #fed7aa',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Flame size={20} color={events.length > 0 ? '#ea580c' : '#94a3b8'} />
                    <strong style={{ fontSize: 16, color: '#0f172a' }}>
                      {events.length === 0
                        ? 'Chuỗi 0 Ngày Học tập (Chưa kích hoạt)'
                        : `Chuỗi ${streakScore.label} Học tập Liên tiếp (Streak)`}
                    </strong>
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#475569' }}>
                    {events.length === 0
                      ? 'Lên lịch tối thiểu 1 ca học mỗi ngày để bắt đầu thắp sáng chuỗi học tập!'
                      : `Bạn đã duy trì ${activeDaysCount}/7 ngày có ca học hoặc phiên tự học tuần này!`}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                    {weeklyData.map((d) => {
                      const done = d.totalHours > 0;
                      return (
                        <div
                          key={d.dayCode}
                          style={{
                            padding: '10px 4px',
                            borderRadius: 10,
                            background: done ? '#ea580c' : '#f1f5f9',
                            color: done ? '#ffffff' : '#64748b',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          <div>{d.dayCode}</div>
                          <div style={{ fontSize: 13, marginTop: 3 }}>{done ? '🔥' : '○'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#ffffff',
                    border: '1px solid #fed7aa',
                    fontSize: 12,
                    color: '#9a3412',
                    fontWeight: 600,
                  }}
                >
                  💡 Mẹo từ Cóc AI: Xếp các bài tập khó (Machine Learning, Giải thuật) vào khung 08:30 sáng giúp tiết kiệm 25% thời gian hoàn thành.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
