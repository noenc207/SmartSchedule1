import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  Calendar as CalendarIcon,
  Flame,
  Sparkles,
  Trash2,
  CheckCircle2,
  Circle,
  LayoutList,
  Columns,
  Bot,
  BookOpen,
} from 'lucide-react';
import { taskApi, type TaskInput } from '../../services/taskApi';
import { SchedulePicker } from '../../components/SchedulePicker';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { showToast } from '../../components/Toast';
import type { Task } from '../../types/domain';

type StatusFilter = 'ALL' | 'PENDING' | 'HIGH_URGENT' | 'COMPLETED';
type ViewMode = 'list' | 'board';

const COURSE_CATEGORIES = [
  { id: 'cat-academic', name: 'Học tập trên lớp (CS401)', color: '#2563eb' },
  { id: 'cat-projects', name: 'Đồ án & Dự án (Capstone)', color: '#7c3aed' },
  { id: 'cat-review', name: 'Thi & Ôn tập (Midterm)', color: '#0891b2' },
  { id: 'cat-general', name: 'Sinh hoạt & Tự học Atrium', color: '#ea580c' },
];

const DURATION_PRESETS = [
  { label: '30p', minutes: 30 },
  { label: '45p', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1h30', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Thấp', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
  { value: 'MEDIUM', label: 'Vừa', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  { value: 'HIGH', label: 'Cao', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)' },
  { value: 'URGENT', label: 'Khẩn cấp', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)' },
];

const COLOR_SWATCHES = ['#ea580c', '#2563eb', '#7c3aed', '#059669', '#0891b2', '#e11d48', '#475569'];

const AI_QUICK_TEMPLATES = [
  {
    title: 'Hoàn thành bài tập Machine Learning Lab 4 (Perceptron & SVM)',
    description: 'Chạy thực nghiệm trên tập dữ liệu mẫu và xuất biểu đồ đánh giá F1-score',
    estimatedDurationMinutes: 120,
    priority: 'HIGH',
    categoryId: 'cat-academic',
    color: '#2563eb',
  },
  {
    title: 'Thiết kế kiến trúc Microservices cho Đồ án Capstone AI',
    description: 'Chuẩn bị tài liệu đặc tả API và sơ đồ luồng dữ liệu cho buổi review tuần 7',
    estimatedDurationMinutes: 90,
    priority: 'URGENT',
    categoryId: 'cat-projects',
    color: '#7c3aed',
  },
  {
    title: 'Ôn tập Cấu trúc Dữ liệu & Giải thuật (Cây đỏ đen & Quy hoạch động)',
    description: 'Giải 5 bài tập trên hệ thống chấm tự động trước kỳ thi giữa kỳ',
    estimatedDurationMinutes: 60,
    priority: 'MEDIUM',
    categoryId: 'cat-review',
    color: '#0891b2',
  },
];

const DEFAULT_FALLBACK_TASKS: Task[] = [
  {
    id: 'seed-task-1',
    scheduleId: 'default',
    ownerId: 'user-123',
    categoryId: 'cat-academic',
    title: 'Bài tập thực hành Machine Learning Lab 3: Hồi quy Logistic & Gradient Descent',
    description: 'Huấn luyện mô hình phân loại trên tập dữ liệu sinh viên K15 và nộp báo cáo PDF lên LMS',
    estimatedDurationMinutes: 120,
    remainingDurationMinutes: 90,
    priority: 'HIGH',
    deadline: '2026-11-08T23:59:00.000Z',
    status: 'TODO',
    preferredStartTime: null,
    preferredEndTime: null,
    minimumSessionMinutes: 30,
    maximumSessionMinutes: 120,
    color: '#2563eb',
    createdAt: '2026-11-05T08:00:00.000Z',
    updatedAt: '2026-11-06T08:00:00.000Z',
  },
  {
    id: 'seed-task-2',
    scheduleId: 'default',
    ownerId: 'user-123',
    categoryId: 'cat-projects',
    title: 'Hoàn thiện Sprint 3 Đồ án Capstone SmartSchedule (Tối ưu bộ giải OR-Tools)',
    description: 'Kiểm thử thuật toán phân bổ lịch tự động CP-SAT và chuẩn bị slide bảo vệ hội đồng',
    estimatedDurationMinutes: 180,
    remainingDurationMinutes: 120,
    priority: 'URGENT',
    deadline: '2026-11-07T18:00:00.000Z',
    status: 'TODO',
    preferredStartTime: null,
    preferredEndTime: null,
    minimumSessionMinutes: 45,
    maximumSessionMinutes: 120,
    color: '#7c3aed',
    createdAt: '2026-11-05T09:00:00.000Z',
    updatedAt: '2026-11-06T09:00:00.000Z',
  },
  {
    id: 'seed-task-3',
    scheduleId: 'default',
    ownerId: 'user-123',
    categoryId: 'cat-review',
    title: 'Ôn tập chương 4 Cấu trúc Dữ liệu & Giải thuật (Đồ thị & Thuật toán Dijkstra)',
    description: 'Giải 8 bài tập đồ thị có trọng số trên hệ thống luyện thi giữa kỳ Fall 2026',
    estimatedDurationMinutes: 90,
    remainingDurationMinutes: 0,
    priority: 'MEDIUM',
    deadline: '2026-11-06T20:00:00.000Z',
    status: 'COMPLETED',
    preferredStartTime: null,
    preferredEndTime: null,
    minimumSessionMinutes: 30,
    maximumSessionMinutes: 90,
    color: '#0891b2',
    createdAt: '2026-11-04T10:00:00.000Z',
    updatedAt: '2026-11-06T11:00:00.000Z',
  },
];

const initialForm: TaskInput = {
  title: '',
  description: '',
  estimatedDurationMinutes: 90,
  remainingDurationMinutes: 90,
  priority: 'MEDIUM',
  status: 'TODO',
  categoryId: 'cat-academic',
  color: '#ea580c',
  minimumSessionMinutes: 30,
  maximumSessionMinutes: 120,
};

export function TasksPage() {
  const navigate = useNavigate();
  const { activeScheduleId } = useWorkspaceStore();

  const [items, setItems] = useState<Task[]>(DEFAULT_FALLBACK_TASKS);
  const [form, setForm] = useState<TaskInput>(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const load = async () => {
    if (!activeScheduleId) return;
    try {
      const page = await taskApi.list(activeScheduleId);
      const loaded = page?.content || [];
      if (loaded.length > 0) {
        setItems(loaded);
      } else {
        setItems(DEFAULT_FALLBACK_TASKS);
      }
      setError('');
    } catch {
      setItems(DEFAULT_FALLBACK_TASKS);
    }
  };

  useEffect(() => {
    void load();
  }, [activeScheduleId]);

  const updateField = (key: keyof TaskInput, value: string | number | null | undefined) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'estimatedDurationMinutes' && typeof value === 'number') {
        next.remainingDurationMinutes = value;
        next.maximumSessionMinutes = Math.max(120, value);
      }
      return next;
    });
  };

  const handleQuickDeadline = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(23, 59, 0, 0);
    updateField('deadline', d.toISOString());
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeScheduleId || !form.title.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const created = await taskApi.create(activeScheduleId, {
        ...form,
        title: form.title.trim(),
        remainingDurationMinutes: form.remainingDurationMinutes || form.estimatedDurationMinutes,
      });
      setItems((old) => [created, ...old]);
      setForm(initialForm);
      showToast(`Đã thêm công việc: "${created.title}"`, 'success');
    } catch {
      const localCreated: Task = {
        id: `local-${Date.now()}`,
        scheduleId: activeScheduleId,
        ownerId: 'user-123',
        categoryId: form.categoryId || 'cat-academic',
        title: form.title.trim(),
        description: form.description || null,
        estimatedDurationMinutes: form.estimatedDurationMinutes,
        remainingDurationMinutes: form.remainingDurationMinutes || form.estimatedDurationMinutes,
        priority: form.priority,
        deadline: form.deadline || null,
        status: 'TODO',
        preferredStartTime: null,
        preferredEndTime: null,
        minimumSessionMinutes: form.minimumSessionMinutes,
        maximumSessionMinutes: form.maximumSessionMinutes,
        color: form.color || '#ea580c',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setItems((old) => [localCreated, ...old]);
      setForm(initialForm);
      showToast(`Đã thêm công việc: "${localCreated.title}"`, 'success');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTemplate = async (tpl: (typeof AI_QUICK_TEMPLATES)[0]) => {
    if (!activeScheduleId) return;
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 2);
    deadlineDate.setHours(23, 59, 0, 0);

    try {
      const created = await taskApi.create(activeScheduleId, {
        title: tpl.title,
        description: tpl.description,
        estimatedDurationMinutes: tpl.estimatedDurationMinutes,
        remainingDurationMinutes: tpl.estimatedDurationMinutes,
        priority: tpl.priority,
        status: 'TODO',
        categoryId: tpl.categoryId,
        color: tpl.color,
        deadline: deadlineDate.toISOString(),
        minimumSessionMinutes: 30,
        maximumSessionMinutes: Math.max(120, tpl.estimatedDurationMinutes),
      });
      setItems((old) => [created, ...old]);
      showToast(`Cóc AI đã thêm: "${created.title}"`, 'success');
    } catch {
      const fallback: Task = {
        id: `tpl-${Date.now()}`,
        scheduleId: activeScheduleId,
        ownerId: 'user-123',
        categoryId: tpl.categoryId,
        title: tpl.title,
        description: tpl.description,
        estimatedDurationMinutes: tpl.estimatedDurationMinutes,
        remainingDurationMinutes: tpl.estimatedDurationMinutes,
        priority: tpl.priority,
        deadline: deadlineDate.toISOString(),
        status: 'TODO',
        preferredStartTime: null,
        preferredEndTime: null,
        minimumSessionMinutes: 30,
        maximumSessionMinutes: Math.max(120, tpl.estimatedDurationMinutes),
        color: tpl.color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setItems((old) => [fallback, ...old]);
      showToast(`Cóc AI đã thêm: "${fallback.title}"`, 'success');
    }
  };

  const remove = async (id: string) => {
    setItems((old) => old.filter((item) => item.id !== id));
    showToast('Đã xóa công việc khỏi danh sách', 'info');
    if (!id.startsWith('seed-') && !id.startsWith('local-') && !id.startsWith('tpl-')) {
      try {
        await taskApi.remove(id);
      } catch {
        // Optimistic UI kept
      }
    }
  };

  const toggleComplete = async (task: Task) => {
    const isNowCompleted = task.status !== 'COMPLETED';
    const nextStatus = isNowCompleted ? 'COMPLETED' : 'TODO';
    const nextRemaining = isNowCompleted ? 0 : task.estimatedDurationMinutes;

    setItems((old) =>
      old.map((item) =>
        item.id === task.id
          ? { ...item, status: nextStatus, remainingDurationMinutes: nextRemaining }
          : item
      )
    );
    showToast(
      isNowCompleted ? `Đã hoàn thành: "${task.title}"` : `Đã mở lại: "${task.title}"`,
      'success'
    );

    if (
      !task.id.startsWith('seed-') &&
      !task.id.startsWith('local-') &&
      !task.id.startsWith('tpl-')
    ) {
      try {
        await taskApi.update(task.id, {
          title: task.title,
          description: task.description ?? '',
          estimatedDurationMinutes: task.estimatedDurationMinutes,
          remainingDurationMinutes: nextRemaining,
          priority: task.priority,
          deadline: task.deadline ?? undefined,
          status: nextStatus,
          categoryId: task.categoryId ?? undefined,
          minimumSessionMinutes: task.minimumSessionMinutes,
          maximumSessionMinutes: task.maximumSessionMinutes,
        });
      } catch {
        // Optimistic UI kept
      }
    }
  };

  const handleClearCompleted = async () => {
    const completedList = items.filter((t) => t.status === 'COMPLETED');
    if (completedList.length === 0) return;
    setItems((old) => old.filter((t) => t.status !== 'COMPLETED'));
    showToast(`Đã dọn dẹp ${completedList.length} công việc đã hoàn thành`, 'info');
  };

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((t) => t.status === 'COMPLETED').length;
    const pending = total - completed;
    const urgentOrHigh = items.filter(
      (t) => t.status !== 'COMPLETED' && (t.priority === 'HIGH' || t.priority === 'URGENT')
    ).length;
    const remainingMinutes = items
      .filter((t) => t.status !== 'COMPLETED')
      .reduce((acc, t) => acc + (t.remainingDurationMinutes || t.estimatedDurationMinutes || 60), 0);
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
      total,
      completed,
      pending,
      urgentOrHigh,
      remainingHours: Math.round((remainingMinutes / 60) * 10) / 10,
      completionPct,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      if (statusFilter === 'PENDING' && task.status === 'COMPLETED') return false;
      if (statusFilter === 'COMPLETED' && task.status !== 'COMPLETED') return false;
      if (
        statusFilter === 'HIGH_URGENT' &&
        (task.status === 'COMPLETED' || (task.priority !== 'HIGH' && task.priority !== 'URGENT'))
      ) {
        return false;
      }
      return true;
    });
  }, [items, searchQuery, statusFilter]);

  const getPriorityBadge = (priority: string) => {
    return PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1];
  };

  const getCategoryMeta = (catId?: string | null) => {
    return COURSE_CATEGORIES.find((c) => c.id === catId) || COURSE_CATEGORIES[0];
  };

  const formatDurationLabel = (mins: number) => {
    if (!mins || mins <= 0) return '0p';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h${m}p`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
  };

  return (
    <section
      className="workspace-page"
      aria-label="Quản lý Công việc và Bài tập"
      style={{
        padding: '10px 20px 14px',
        maxWidth: 1440,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        animation: 'none',
        opacity: 1,
      }}
    >
      {/* 1. Ultra-Compact Top Bar: Title + Interactive KPI Filters + Actions */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: '10px 16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 800,
              background: 'rgba(249, 115, 22, 0.1)',
              color: '#ea580c',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            <CheckSquare size={12} />
            Task Studio
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            Quản lý Công việc & Bài tập
          </h1>
        </div>

        {/* Center Inline Interactive KPI Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            title="Bấm để lọc bài đang chờ"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 9,
              border: statusFilter === 'PENDING' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
              background: statusFilter === 'PENDING' ? 'rgba(37, 99, 235, 0.08)' : '#f8fafc',
              cursor: 'pointer',
            }}
          >
            <BookOpen size={13} color="#2563eb" />
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Chờ làm:</span>
            <strong style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
              {stats.pending} bài
            </strong>
            <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>
              ({stats.remainingHours}h)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'HIGH_URGENT' ? 'ALL' : 'HIGH_URGENT')}
            title="Bấm để lọc mục ưu tiên cao & khẩn cấp"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 9,
              border: statusFilter === 'HIGH_URGENT' ? '1.5px solid #e11d48' : '1px solid #e2e8f0',
              background: statusFilter === 'HIGH_URGENT' ? 'rgba(225, 29, 72, 0.08)' : '#f8fafc',
              cursor: 'pointer',
            }}
          >
            <Flame size={13} color="#e11d48" />
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Khẩn cấp:</span>
            <strong style={{ fontSize: 12, fontWeight: 800, color: '#e11d48' }}>
              {stats.urgentOrHigh} mục
            </strong>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            title="Bấm để lọc bài đã hoàn thành"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 9,
              border: statusFilter === 'COMPLETED' ? '1.5px solid #059669' : '1px solid #e2e8f0',
              background: statusFilter === 'COMPLETED' ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc',
              cursor: 'pointer',
            }}
          >
            <CheckCircle2 size={13} color="#059669" />
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Hoàn thành:</span>
            <strong style={{ fontSize: 12, fontWeight: 800, color: '#059669' }}>
              {stats.completed}/{stats.total} ({stats.completionPct}%)
            </strong>
          </button>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'none' }}>
            <SchedulePicker />
          </div>
          <button
            type="button"
            onClick={() => navigate('/scheduling')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 13px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(249, 115, 22, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={13} />
            <span>Xếp lịch tự động ({stats.pending} bài)</span>
          </button>
        </div>
      </div>

      {/* 2. Horizontal 1-Click Cóc AI Suggestions Ribbon (Always visible above the fold!) */}
      <div
        style={{
          background: 'linear-gradient(90deg, #fff7ed 0%, #ffffff 45%, #f8fafc 100%)',
          borderRadius: 13,
          padding: '8px 14px',
          border: '1px solid rgba(249, 115, 22, 0.28)',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingRight: 4 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: '#ea580c',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bot size={15} />
          </div>
          <div>
            <strong style={{ fontSize: 12, color: '#0f172a', display: 'block', lineHeight: 1.15 }}>
              Gợi ý Cóc AI (1-Chạm)
            </strong>
            <span style={{ fontSize: 10, color: '#ea580c', fontWeight: 700 }}>
              Thêm nhanh vào học kỳ
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {AI_QUICK_TEMPLATES.map((tpl, idx) => (
            <div
              key={idx}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong
                  style={{
                    fontSize: 11.5,
                    color: '#0f172a',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={tpl.title}
                >
                  {tpl.title}
                </strong>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                  {tpl.estimatedDurationMinutes}p · Ưu tiên {tpl.priority}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleAddTemplate(tpl)}
                style={{
                  padding: '4px 9px',
                  borderRadius: 7,
                  border: '1px solid rgba(249, 115, 22, 0.35)',
                  background: 'rgba(249, 115, 22, 0.09)',
                  color: '#ea580c',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                + Thêm
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="form-error"
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {!activeScheduleId ? (
        <div className="panel empty-state">
          <strong>Chưa chọn không gian lập lịch</strong>
          <span>Vui lòng chọn hoặc khởi tạo một lịch trình học tập để quản lý công việc.</span>
        </div>
      ) : (
        /* 3. Single-Screen 2-Column Studio Grid (Fits 100% in 1 viewport without page scrolling!) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: 14,
            alignItems: 'stretch',
          }}
        >
          {/* Left Column: Compact Smart Task Composer */}
          <form
            onSubmit={submit}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 9,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: 'rgba(249, 115, 22, 0.12)',
                    color: '#ea580c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={15} />
                </div>
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                  Thêm Nhiệm vụ / Bài tập mới
                </h3>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#ea580c' }}>
                Smart Composer
              </span>
            </div>

            {/* Title Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                htmlFor="task-title-input"
                style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}
              >
                Tên công việc / Bài tập <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="task-title-input"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="vd: Bài tập Machine Learning Lab 3, Báo cáo Capstone..."
                required
                style={{
                  padding: '7px 11px',
                  borderRadius: 9,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 12.5,
                  color: '#0f172a',
                  outline: 'none',
                }}
              />
            </div>

            {/* Description Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                htmlFor="task-desc-input"
                style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}
              >
                Ghi chú / Mục tiêu cụ thể (Tùy chọn)
              </label>
              <input
                id="task-desc-input"
                value={form.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="vd: Hoàn thành notebook phần 1 & nộp lên LMS..."
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  color: '#334155',
                }}
              />
            </div>

            {/* Quick Duration Chips + Custom Minutes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                  Thời lượng dự kiến
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ea580c' }}>
                  {formatDurationLabel(form.estimatedDurationMinutes)} ({form.estimatedDurationMinutes}p)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {DURATION_PRESETS.map((preset) => {
                  const active = form.estimatedDurationMinutes === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => updateField('estimatedDurationMinutes', preset.minutes)}
                      style={{
                        padding: '4px 0',
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: active ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                        background: active ? '#ea580c' : '#f8fafc',
                        color: active ? '#ffffff' : '#334155',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 2 }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, background: '#f8fafc', padding: '4px 8px', borderRadius: 7, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Tổng (phút):</span>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={form.estimatedDurationMinutes}
                    onChange={(e) =>
                      updateField('estimatedDurationMinutes', Math.max(1, Number(e.target.value)))
                    }
                    style={{
                      width: 54,
                      padding: '2px 5px',
                      borderRadius: 5,
                      border: '1px solid #cbd5e1',
                      fontSize: 11.5,
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, background: '#f8fafc', padding: '4px 8px', borderRadius: 7, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Còn lại (p):</span>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    value={form.remainingDurationMinutes}
                    onChange={(e) =>
                      updateField('remainingDurationMinutes', Math.max(0, Number(e.target.value)))
                    }
                    style={{
                      width: 54,
                      padding: '2px 5px',
                      borderRadius: 5,
                      border: '1px solid #cbd5e1',
                      fontSize: 11.5,
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Priority Matrix Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                Mức độ ưu tiên
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                {PRIORITY_OPTIONS.map((opt) => {
                  const active = form.priority === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField('priority', opt.value)}
                      style={{
                        padding: '5px 4px',
                        borderRadius: 7,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: active ? `1.5px solid ${opt.color}` : '1px solid #e2e8f0',
                        background: active ? opt.color : '#f8fafc',
                        color: active ? '#ffffff' : '#475569',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category & Deadline Side-by-Side / Compact */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                  Học phần / Danh mục
                </span>
                <select
                  value={form.categoryId || 'cat-academic'}
                  onChange={(e) => updateField('categoryId', e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 11.5,
                    color: '#0f172a',
                    background: '#ffffff',
                  }}
                >
                  {COURSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>Hạn chót</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[
                      { l: 'H.nay', d: 0 },
                      { l: 'Mai', d: 1 },
                      { l: '+3n', d: 3 },
                    ].map((q) => (
                      <button
                        key={q.l}
                        type="button"
                        onClick={() => handleQuickDeadline(q.d)}
                        style={{
                          padding: '1px 5px',
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          fontSize: 9.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {q.l}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={form.deadline?.slice(0, 16) ?? ''}
                  onChange={(e) =>
                    updateField(
                      'deadline',
                      e.target.value ? new Date(e.target.value).toISOString() : ''
                    )
                  }
                  style={{
                    padding: '5px 7px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 11,
                    color: '#0f172a',
                  }}
                />
              </div>
            </div>

            {/* Color Swatches + Submit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                Màu nhận diện:
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLOR_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => updateField('color', hex)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: hex,
                      border: form.color === hex ? '2px solid #0f172a' : '1.5px solid transparent',
                      cursor: 'pointer',
                    }}
                    title={`Màu ${hex}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: submitting ? 'wait' : 'pointer',
                boxShadow: '0 3px 10px rgba(249, 115, 22, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Plus size={15} />
              <span>{submitting ? 'Đang lưu công việc...' : 'Thêm Công việc vào Kế hoạch'}</span>
            </button>
          </form>

          {/* Right Column: Interactive Task List & Kanban Board */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '14px 18px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 500,
              overflow: 'hidden',
            }}
          >
            {/* Top Filter, Search & View Mode Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                paddingBottom: 8,
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: '#0f172a' }}>
                  Danh sách Nhiệm vụ ({filteredItems.length})
                </h2>

                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(
                    [
                      { id: 'ALL', label: `Tất cả (${items.length})` },
                      { id: 'PENDING', label: `Chờ làm (${stats.pending})` },
                      { id: 'HIGH_URGENT', label: `Ưu tiên cao (${stats.urgentOrHigh})` },
                      { id: 'COMPLETED', label: `Đã xong (${stats.completed})` },
                    ] as const
                  ).map((tab) => {
                    const active = statusFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          border: active ? '1px solid #ea580c' : '1px solid #e2e8f0',
                          background: active ? 'rgba(249, 115, 22, 0.1)' : '#f8fafc',
                          color: active ? '#ea580c' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ position: 'relative', width: 195 }}>
                  <Search
                    size={13}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên bài tập, môn học..."
                    style={{
                      width: '100%',
                      padding: '5px 10px 5px 27px',
                      borderRadius: 999,
                      border: '1px solid #cbd5e1',
                      fontSize: 11.5,
                      outline: 'none',
                    }}
                  />
                </div>

                {stats.completed > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleClearCompleted()}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 7,
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Dọn {stats.completed} xong
                  </button>
                )}

                <div
                  style={{
                    display: 'inline-flex',
                    background: '#f1f5f9',
                    padding: 2,
                    borderRadius: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'list' ? '#ffffff' : 'transparent',
                      color: viewMode === 'list' ? '#0f172a' : '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <LayoutList size={13} /> Danh sách
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('board')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'board' ? '#ffffff' : 'transparent',
                      color: viewMode === 'board' ? '#0f172a' : '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <Columns size={13} /> Kanban
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Task Items Container inside Fixed-Height Card */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
              {filteredItems.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 280,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '28px 20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 14,
                    border: '1px dashed #cbd5e1',
                    gap: 8,
                  }}
                >
                  <CheckSquare size={24} color="#ea580c" />
                  <strong style={{ fontSize: 14, color: '#0f172a' }}>
                    Chưa có công việc nào trong bộ lọc này
                  </strong>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b', maxWidth: 380 }}>
                    Hãy tạo nhiệm vụ mới ở khung bên trái hoặc bấm chọn một gợi ý học tập 1-chạm từ thanh Cóc AI phía trên!
                  </p>
                </div>
              ) : viewMode === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {filteredItems.map((task) => {
                    const isDone = task.status === 'COMPLETED';
                    const prio = getPriorityBadge(task.priority);
                    const cat = getCategoryMeta(task.categoryId);

                    return (
                      <div
                        key={task.id}
                        style={{
                          padding: '11px 14px',
                          borderRadius: 12,
                          background: isDone ? '#f8fafc' : '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderLeft: `4px solid ${isDone ? '#10b981' : task.color || cat.color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          opacity: isDone ? 0.82 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={() => void toggleComplete(task)}
                            title={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                            style={{
                              marginTop: 2,
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              color: isDone ? '#10b981' : '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {isDone ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                          </button>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <strong
                                style={{
                                  fontSize: 13.5,
                                  fontWeight: 700,
                                  color: isDone ? '#64748b' : '#0f172a',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                }}
                              >
                                {task.title}
                              </strong>

                              <span
                                style={{
                                  padding: '1px 7px',
                                  borderRadius: 999,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: prio.color,
                                  background: prio.bg,
                                }}
                              >
                                {prio.label}
                              </span>

                              <span
                                style={{
                                  padding: '1px 7px',
                                  borderRadius: 999,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: cat.color,
                                  background: `${cat.color}12`,
                                }}
                              >
                                {cat.name}
                              </span>
                            </div>

                            {task.description && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11.5,
                                  color: '#64748b',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {task.description}
                              </p>
                            )}

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                flexWrap: 'wrap',
                                fontSize: 11,
                                color: '#64748b',
                              }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={11} color="#ea580c" />
                                Thời lượng:{' '}
                                <strong style={{ color: '#334155' }}>
                                  {formatDurationLabel(task.estimatedDurationMinutes)}
                                </strong>
                                {!isDone && task.remainingDurationMinutes > 0 && (
                                  <span>(còn {task.remainingDurationMinutes}p)</span>
                                )}
                              </span>

                              {task.deadline && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CalendarIcon size={11} color="#2563eb" />
                                  Hạn nộp:{' '}
                                  <strong style={{ color: '#334155' }}>
                                    {new Date(task.deadline).toLocaleDateString('vi-VN', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })}
                                  </strong>
                                </span>
                              )}

                              <span
                                style={{
                                  fontWeight: 700,
                                  color: isDone ? '#059669' : '#d97706',
                                }}
                              >
                                • {isDone ? 'ĐÃ HOÀN THÀNH' : 'CHỜ XẾP LỊCH'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => navigate('/scheduling')}
                              style={{
                                padding: '5px 9px',
                                borderRadius: 7,
                                border: '1px solid rgba(249, 115, 22, 0.3)',
                                background: 'rgba(249, 115, 22, 0.08)',
                                color: '#ea580c',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Sparkles size={11} /> Xếp lịch
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void toggleComplete(task)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: 7,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isDone ? 'Mở lại' : 'Hoàn thành'}
                          </button>

                          <button
                            type="button"
                            onClick={() => void remove(task.id)}
                            title="Xóa công việc"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 7,
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Kanban Board View */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 12,
                      padding: 12,
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <strong style={{ fontSize: 12.5, color: '#0f172a' }}>
                      📌 Cần thực hiện ({filteredItems.filter((t) => t.status !== 'COMPLETED').length})
                    </strong>
                    {filteredItems
                      .filter((t) => t.status !== 'COMPLETED')
                      .map((task) => {
                        const prio = getPriorityBadge(task.priority);
                        return (
                          <div
                            key={task.id}
                            style={{
                              background: '#ffffff',
                              borderRadius: 10,
                              padding: 10,
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                              <strong style={{ fontSize: 12, color: '#0f172a' }}>{task.title}</strong>
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: 999,
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: prio.color,
                                  background: prio.bg,
                                  flexShrink: 0,
                                }}
                              >
                                {prio.label}
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: 11,
                                color: '#64748b',
                              }}
                            >
                              <span>{formatDurationLabel(task.estimatedDurationMinutes)}</span>
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button
                                  type="button"
                                  onClick={() => void toggleComplete(task)}
                                  style={{
                                    padding: '2px 7px',
                                    borderRadius: 5,
                                    border: '1px solid #10b981',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Hoàn thành
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void remove(task.id)}
                                  style={{
                                    padding: '2px 7px',
                                    borderRadius: 5,
                                    border: '1px solid #fecaca',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    fontSize: 10.5,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 12,
                      padding: 12,
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <strong style={{ fontSize: 12.5, color: '#059669' }}>
                      ✅ Đã hoàn thành ({filteredItems.filter((t) => t.status === 'COMPLETED').length})
                    </strong>
                    {filteredItems
                      .filter((t) => t.status === 'COMPLETED')
                      .map((task) => (
                        <div
                          key={task.id}
                          style={{
                            background: '#ffffff',
                            borderRadius: 10,
                            padding: 10,
                            border: '1px solid #e2e8f0',
                            opacity: 0.8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: '#64748b',
                              textDecoration: 'line-through',
                              fontWeight: 600,
                            }}
                          >
                            ✓ {task.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => void remove(task.id)}
                            style={{
                              padding: '2px 7px',
                              borderRadius: 5,
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontSize: 10.5,
                              cursor: 'pointer',
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
