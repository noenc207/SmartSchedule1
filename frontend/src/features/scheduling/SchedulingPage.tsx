import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Check,
  X,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Layers,
  BookOpen,
  BrainCircuit,
  CheckSquare,
  Square,
} from 'lucide-react';
import { SchedulePicker } from '../../components/SchedulePicker';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { taskApi } from '../../services/taskApi';
import { eventApi } from '../../services/eventApi';
import { categoryApi } from '../../services/categoryApi';
import { schedulingApi } from '../../services/schedulingApi';
import apiClient, { getApiErrorMessage } from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { isDemoMode, getDemoDate, getDemoInputDate } from '../../services/demoMode';
import { showToast } from '../../components/Toast';
import type { Category, EventItem, SchedulingPreferences, SchedulingRequest, SchedulingResult, Task } from '../../types/domain';
import { DEFAULT_TIMEZONE, formatDate, formatTimeRange, getDurationMinutes } from '../../utils/dateTime';
import {
  getTaskScheduledMinutes,
  getTaskRemainingMinutes,
  getTaskSchedulingState,
  formatMinutes,
  formatDeadline,
} from './utils/taskCalculations';
import { TaskWorkspaceHeader } from './components/TaskWorkspaceHeader';
import { QuickAddComposer } from './components/QuickAddComposer';
import { CompactTaskAccordionList } from './components/CompactTaskAccordionList';
import { usePreferenceStore } from '../../stores/preferenceStore';
import { useHistoryStore } from '../../stores/historyStore';
import { filterAndSortTasks } from '../tasks/utils/taskFiltering';
import { AdvancedConstraintsModal } from './components/AdvancedConstraintsModal';
import {
  DEFAULT_SCHEDULING_RULES,
  type SchedulingRule,
  generateOptimizationReasons,
} from './utils/constraintRules';
import {
  SCHEDULING_PERSONAS,
  type PersonaId,
  SESSION_DURATION_OPTIONS,
  BREAK_DURATION_OPTIONS,
  DAILY_CAPACITY_OPTIONS,
  parseHourMinute,
  formatHourMinute,
} from './utils/schedulingPersonas';

const defaults: SchedulingPreferences = {
  maxDailyMinutes: 360,
  minBreakMinutes: 30,
  preferredStart: '17:00',
  preferredEnd: '22:00',
  maximumSessionMinutes: 120,
  minimumSessionMinutes: 30,
  workloadBalanceWeight: 0.2,
  deadlineWeight: 0.35,
  priorityWeight: 0.3,
  preferenceWeight: 0.15,
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(8, 0, 0, 0);
  return date.toISOString().slice(0, 16);
};

const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(22, 0, 0, 0);
  return date.toISOString().slice(0, 16);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function SchedulingPage() {
  const navigate = useNavigate();
  const activeScheduleId = useWorkspaceStore((state) => state.activeScheduleId);

  // Core domain states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [splitTasks, setSplitTasks] = useState<Record<string, boolean>>({});

  // Planning controls & Presets
  const [timePreset, setTimePreset] = useState<'next7' | 'thisWeek' | 'custom'>('next7');
  const [from, setFrom] = useState(() => (isDemoMode() ? getDemoInputDate(0, 8, 0) : startOfToday()));
  const [to, setTo] = useState(() => (isDemoMode() ? getDemoInputDate(6, 22, 0) : plusDays(7)));
  const [preferences, setPreferences] = useState(defaults);

  // User persistent preferences and task workspace UX states
  const {
    taskFilterStatus,
    setTaskFilterStatus,
    taskFilterPriority,
    setTaskFilterPriority,
    taskFilterDeadline,
    setTaskFilterDeadline,
    taskSortBy,
    setTaskSortBy,
  } = usePreferenceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Proposal & submission states
  const [result, setResult] = useState<SchedulingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [confirmApply, setConfirmApply] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  // Pro optimization states
  const user = useAuthStore((state) => state.user);
  const [isProOptimization, setIsProOptimization] = useState(true);

  // Progressive Constraints State
  const [schedulingRules, setSchedulingRules] = useState<SchedulingRule[]>(() => DEFAULT_SCHEDULING_RULES);
  const [isConstraintsModalOpen, setIsConstraintsModalOpen] = useState(false);

  // Scheduling Persona & Deep Customization states
  const [activePersonaId, setActivePersonaId] = useState<PersonaId>('FPT_STUDENT');
  const [isDeepCustomizationOpen, setIsDeepCustomizationOpen] = useState(false);
  const [campusMobilityEnabled, setCampusMobilityEnabled] = useState(true);
  const [protectLunchEnabled, setProtectLunchEnabled] = useState(true);

  const activePersona = SCHEDULING_PERSONAS[activePersonaId];

  const handleSelectPersona = (id: PersonaId) => {
    setActivePersonaId(id);
    const p = SCHEDULING_PERSONAS[id];
    setPreferences((prev) => ({
      ...prev,
      ...p.preferences,
    }));
    setCampusMobilityEnabled(p.campusMobilityAware);
    setProtectLunchEnabled(p.protectLunch);
    showToast(`Đã chọn hồ sơ: ${p.name}`, 'info');
  };

  const startHM = parseHourMinute(preferences.preferredStart);
  const endHM = parseHourMinute(preferences.preferredEnd);

  const handleStartHourChange = (newHour: number) => {
    updatePreference('preferredStart', formatHourMinute(newHour, startHM.minute));
  };
  const handleStartMinuteChange = (newMinute: number) => {
    updatePreference('preferredStart', formatHourMinute(startHM.hour, newMinute));
  };
  const handleEndHourChange = (newHour: number) => {
    updatePreference('preferredEnd', formatHourMinute(newHour, endHM.minute));
  };
  const handleEndMinuteChange = (newMinute: number) => {
    updatePreference('preferredEnd', formatHourMinute(endHM.hour, newMinute));
  };

  const handleTimePresetChange = (preset: 'next7' | 'thisWeek' | 'custom') => {
    setTimePreset(preset);
    const now = new Date();
    if (preset === 'next7') {
      const start = new Date(now);
      start.setHours(8, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      end.setHours(22, 0, 0, 0);
      setFrom(start.toISOString().slice(0, 16));
      setTo(end.toISOString().slice(0, 16));
    } else if (preset === 'thisWeek') {
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setDate(mon.getDate() + diffToMon);
      mon.setHours(8, 0, 0, 0);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      sun.setHours(22, 0, 0, 0);
      setFrom(mon.toISOString().slice(0, 16));
      setTo(sun.toISOString().slice(0, 16));
    }
  };

  // Load tasks, events, categories, and preferences for current schedule
  useEffect(() => {
    if (!activeScheduleId) {
      setTasks([]);
      setEvents([]);
      setCategories([]);
      setSelected([]);
      setResult(null);
      return;
    }
    setError('');

    const fromDate = isDemoMode() ? getDemoDate(0, 0, 0) : new Date(Date.now() - 7 * 86400000).toISOString();
    const toDate = isDemoMode() ? getDemoDate(7, 23, 59) : new Date(Date.now() + 14 * 86400000).toISOString();

    void Promise.all([
      taskApi.list(activeScheduleId),
      schedulingApi.getPreferences(activeScheduleId),
      eventApi.list(activeScheduleId, fromDate, toDate),
      categoryApi.list(),
    ])
      .then(([page, saved, calendarEvents, cats]) => {
        setCategories(cats);
        setEvents(calendarEvents);
        const activeTasks = page.content.filter((task) => task.status !== 'CANCELLED');
        setTasks(activeTasks);
        setSelected(activeTasks.map((task) => task.id));
        setPreferences({ ...defaults, ...saved });
        setSplitTasks(
          Object.fromEntries(
            activeTasks.map((task) => [task.id, task.estimatedDurationMinutes > task.maximumSessionMinutes])
          )
        );
      })
      .catch(() => setError('Không thể tải dữ liệu không gian lập lịch.'));
  }, [activeScheduleId]);

  // Filter and sort tasks based on search, status tab, priority, deadline, and sort order
  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(tasks, {
      searchQuery,
      statusFilter: taskFilterStatus,
      priorityFilter: taskFilterPriority,
      deadlineFilter: taskFilterDeadline,
      sortBy: taskSortBy,
      selectedIds: selected,
      events,
      categories,
    });
  }, [tasks, searchQuery, taskFilterStatus, taskFilterPriority, taskFilterDeadline, taskSortBy, selected, events, categories]);

  const eligibleIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const selectedTasks = tasks.filter((task) => selected.includes(task.id));

  // Canonical calculations for planning metrics
  const estimatedRemainingMinutes = selectedTasks.reduce(
    (sum, task) => sum + getTaskRemainingMinutes(task, events),
    0
  );
  const planningDays = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
  const estimatedCapacity = preferences.maxDailyMinutes * planningDays;
  const deadlineCount = selectedTasks.filter((task) => task.deadline).length;

  const derivedUnscheduled = result ? selectedTasks.filter((task) => !result.slots.some((slot) => slot.taskId === task.id)) : [];
  const plannedMinutes = result?.slots.reduce((sum, slot) => sum + Math.round((new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()) / 60000), 0) ?? 0;
  const riskCount = derivedUnscheduled.filter((task) => task.deadline && new Date(task.deadline).getTime() < Date.now() + 86400000 * 2).length;

  const slotsByDay = useMemo(() => {
    if (!result || !result.slots) return [];
    const map = new Map<string, typeof result.slots>();
    for (const slot of result.slots) {
      const d = new Date(slot.startsAt);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(slot);
    }
    const groups: { dateKey: string; label: string; slots: typeof result.slots }[] = [];
    for (const [dateKey, daySlots] of map.entries()) {
      const firstSlot = daySlots[0];
      const dateLabel = formatDate(firstSlot.startsAt, DEFAULT_TIMEZONE, {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      groups.push({
        dateKey,
        label: dateLabel,
        slots: daySlots.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
      });
    }
    return groups.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [result]);

  const updatePreference = (key: keyof SchedulingPreferences, value: string | number | null) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  // Build scheduling request for selected tasks
  const request = (): SchedulingRequest => {
    const fromDate = new Date(from);
    const now = new Date();
    const effectiveFrom = fromDate < now ? now : fromDate;
    return {
      from: effectiveFrom.toISOString(),
      to: new Date(to).toISOString(),
      granularityMinutes: 15,
      taskIds: selected,
      splitTaskIds: Object.entries(splitTasks)
        .filter(([id, enabled]) => enabled && selected.includes(id))
        .map(([id]) => id),
    };
  };

  // Task workspace handlers
  const handleToggleSelect = (taskId: string) => {
    setSelected((curr) => (curr.includes(taskId) ? curr.filter((id) => id !== taskId) : [...curr, taskId]));
  };

  const handleToggleSelectAll = () => {
    if (selected.length === tasks.length) {
      setSelected([]);
    } else {
      setSelected(eligibleIds);
    }
  };

  const handleToggleSplit = (taskId: string) => {
    setSplitTasks((curr) => ({ ...curr, [taskId]: !curr[taskId] }));
  };

  const handleAddTask = async (data: {
    title: string;
    estimatedDurationMinutes: number;
    priority: string;
    categoryId?: string | null;
    deadline?: string | null;
    color?: string | null;
  }) => {
    if (!activeScheduleId) return;
    try {
      const created = await taskApi.create(activeScheduleId, {
        title: data.title,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
        remainingDurationMinutes: data.estimatedDurationMinutes,
        priority: data.priority,
        deadline: data.deadline ?? undefined,
        categoryId: data.categoryId ?? undefined,
        color: data.color ?? null,
        status: 'TODO',
        minimumSessionMinutes: 30,
        maximumSessionMinutes: 120,
      });
      setTasks((curr) => [...curr, created]);
      setSelected((curr) => [...curr, created.id]);
      setSplitTasks((curr) => ({
        ...curr,
        [created.id]: created.estimatedDurationMinutes > 120,
      }));
      setIsComposerOpen(false);
      showToast(`Đã thêm bài tập "${created.title}"`, 'success');
    } catch {
      setError('Không thể thêm bài tập.');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) return;
    const merged: Task = { ...existing, ...updates };
    setTasks((curr) => curr.map((t) => (t.id === taskId ? merged : t)));

    try {
      const updated = await taskApi.update(taskId, {
        title: merged.title,
        description: merged.description ?? undefined,
        estimatedDurationMinutes: merged.estimatedDurationMinutes,
        remainingDurationMinutes: merged.remainingDurationMinutes,
        priority: merged.priority,
        deadline: merged.deadline ?? undefined,
        categoryId: merged.categoryId ?? undefined,
        color: merged.color ?? null,
        status: merged.status,
        minimumSessionMinutes: merged.minimumSessionMinutes,
        maximumSessionMinutes: merged.maximumSessionMinutes,
      });
      setTasks((curr) => curr.map((t) => (t.id === taskId ? updated : t)));
    } catch {
      setError('Không thể cập nhật bài tập.');
    }
  };

  const handleDuplicateTask = async (task: Task) => {
    if (!activeScheduleId) return;
    try {
      const duplicated = await taskApi.create(activeScheduleId, {
        title: `${task.title} (Bản sao)`,
        description: task.description ?? undefined,
        estimatedDurationMinutes: task.estimatedDurationMinutes,
        remainingDurationMinutes: task.estimatedDurationMinutes,
        priority: task.priority,
        deadline: task.deadline ?? undefined,
        categoryId: task.categoryId ?? undefined,
        color: task.color ?? null,
        status: 'TODO',
        minimumSessionMinutes: task.minimumSessionMinutes,
        maximumSessionMinutes: task.maximumSessionMinutes,
      });
      setTasks((curr) => [...curr, duplicated]);
      setSelected((curr) => [...curr, duplicated.id]);
      setSplitTasks((curr) => ({
        ...curr,
        [duplicated.id]: splitTasks[task.id] ?? false,
      }));
      showToast(`Đã nhân bản "${task.title}"`, 'success');
    } catch {
      setError('Không thể nhân bản bài tập.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskApi.remove(taskId);
      setTasks((curr) => curr.filter((t) => t.id !== taskId));
      setSelected((curr) => curr.filter((id) => id !== taskId));
      showToast('Đã xóa bài tập khỏi không gian lập lịch', 'info');
    } catch {
      setError('Không thể xóa bài tập.');
    }
  };

  // Quick Schedule action with Undo Toast
  const handleScheduleSlot = async (task: Task, startsAt: string, endsAt: string) => {
    if (!activeScheduleId) return;
    if (new Date(endsAt).getTime() < Date.now() - 60000) {
      showToast('Không thể xếp lịch vào thời gian đã qua.', 'warning');
      return;
    }
    const sessionMinutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);

    try {
      const createdEvent = await eventApi.create(activeScheduleId, {
        title: task.title,
        startsAt,
        endsAt,
        taskId: task.id,
        categoryId: task.categoryId ?? undefined,
        color: task.color ?? null,
        priority: task.priority,
        status: 'SCHEDULED',
        fixed: false,
        locked: false,
        notes: `Ca học xếp nhanh từ tác vụ · ${task.id}`,
      });

      setEvents((curr) => [...curr, createdEvent]);

      const prevScheduled = getTaskScheduledMinutes(task.id, events);
      const newScheduled = prevScheduled + sessionMinutes;
      const newRemaining = Math.max(0, task.estimatedDurationMinutes - newScheduled);
      const newStatus = newRemaining === 0 ? 'SCHEDULED' : 'IN_PROGRESS';

      await taskApi.update(task.id, {
        title: task.title,
        estimatedDurationMinutes: task.estimatedDurationMinutes,
        remainingDurationMinutes: newRemaining,
        priority: task.priority,
        status: newStatus,
        categoryId: task.categoryId ?? undefined,
        color: task.color ?? null,
        minimumSessionMinutes: task.minimumSessionMinutes,
        maximumSessionMinutes: task.maximumSessionMinutes,
      });

      setTasks((curr) =>
        curr.map((t) => (t.id === task.id ? { ...t, remainingDurationMinutes: newRemaining, status: newStatus } : t))
      );

      showToast(`Đã xếp ${formatMinutes(sessionMinutes)} cho "${task.title}"`, 'success', {
        action: {
          label: 'Hoàn tác',
          onClick: async () => {
            await eventApi.remove(createdEvent.id);
            setEvents((curr) => curr.filter((e) => e.id !== createdEvent.id));
            const restoredRemaining = Math.max(0, task.estimatedDurationMinutes - prevScheduled);
            await taskApi.update(task.id, {
              title: task.title,
              estimatedDurationMinutes: task.estimatedDurationMinutes,
              remainingDurationMinutes: restoredRemaining,
              priority: task.priority,
              status: prevScheduled === 0 ? 'TODO' : 'IN_PROGRESS',
              categoryId: task.categoryId ?? undefined,
              color: task.color ?? null,
              minimumSessionMinutes: task.minimumSessionMinutes,
              maximumSessionMinutes: task.maximumSessionMinutes,
            });
            setTasks((curr) =>
              curr.map((t) => (t.id === task.id ? { ...t, remainingDurationMinutes: restoredRemaining } : t))
            );
            showToast(`Đã hoàn tác ca học cho "${task.title}"`, 'info');
          },
        },
      });
    } catch {
      setError("Không thể xếp ca học này. Chưa có thay đổi nào được áp dụng.");
    }
  };

  // Generate & Apply proposal handlers
  const generate = async (isProMode: boolean = true) => {
    if (!activeScheduleId) return;
    if (new Date(from) >= new Date(to)) {
      setError('Khoảng thời gian lập lịch phải có thời điểm kết thúc sau thời điểm bắt đầu.');
      return;
    }
    setLoading(true);
    setGenerationStep(1);
    setError('');
    setApplyMessage('');
    setResult(null);

    try {
      await sleep(220);
      setGenerationStep(2);
      await schedulingApi.updatePreferences(activeScheduleId, preferences);
      await sleep(220);
      setGenerationStep(3);
      await sleep(220);
      setGenerationStep(4);
      await sleep(220);
      setGenerationStep(5);

      let generatedPlan: SchedulingResult;
      if (isProMode) {
        setIsProOptimization(true);
        generatedPlan = await schedulingApi.optimizePro(activeScheduleId, request());
      } else {
        setIsProOptimization(false);
        generatedPlan = await schedulingApi.generate(activeScheduleId, request());
      }

      await sleep(200);
      setGenerationStep(6);
      await sleep(200);
      setGenerationStep(7);
      await sleep(150);
      setResult(generatedPlan);
      showToast('Đã tính toán xong kế hoạch lịch tối ưu!', 'success');
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      setError(errMsg || 'Không thể tạo lịch lúc này. Vui lòng kiểm tra lại dữ liệu và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!activeScheduleId || !result) return;
    setApplying(true);
    setError('');
    setApplyMessage('');

    const appliedResult = result;
    const previousEvents = [...events];
    const previousTasks = [...tasks];

    try {
      // 1. Authoritative Validation Step
      const validation = await schedulingApi.validate(activeScheduleId, {
        planId: result.planId,
        fingerprint: result.fingerprint,
        slots: result.slots,
        scheduleVersion: result.scheduleVersion,
      });

      if (!validation.valid) {
        const errorMsg = validation.errors && validation.errors.length > 0
          ? validation.errors.join(' ')
          : 'Đề xuất lịch không vượt qua bước kiểm định tính hợp lệ. Vui lòng tạo lại kế hoạch.';
        setError(errorMsg);
        showToast(errorMsg, 'error');
        setApplying(false);
        return;
      }

      // 2. Authoritative Apply Step
      await schedulingApi.apply(activeScheduleId, result);
      setConfirmApply(false);
      setApplyMessage('Kế hoạch đã được áp dụng thành công! Tất cả ca học đã được đưa vào thời khóa biểu.');
      showToast('Đã áp dụng lịch! Các ca học đã hiển thị trên thời khóa biểu.', 'success');

      // Record batch undo in history store
      useHistoryStore.getState().recordAction({
        description: `Áp dụng lịch trình (${appliedResult.slots.length} ca học)`,
        undo: async () => {
          try {
            const currentEvents = await eventApi.list(activeScheduleId, from, to);
            for (const slot of appliedResult.slots) {
              const ev = currentEvents.find((e) => (e.sourceTaskId === slot.taskId || e.taskId === slot.taskId) && e.startsAt === slot.startsAt);
              if (ev) {
                await eventApi.remove(ev.id);
              }
            }
            const refreshed = await taskApi.list(activeScheduleId);
            setTasks(refreshed.content);
            setEvents(previousEvents);
            showToast('Đã hoàn tác lịch trình vừa áp dụng', 'info');
          } catch {
            showToast('Không thể hoàn tác lịch trình', 'error');
          }
        },
        redo: async () => {
          await schedulingApi.apply(activeScheduleId, appliedResult);
          showToast('Đã khôi phục áp dụng lịch trình', 'info');
        },
      });

      setTimeout(() => navigate('/calendar'), 1000);
    } catch (reason: unknown) {
      const err = reason as any;
      const status = err?.response?.status || err?.status;
      if (status === 409) {
        const staleMsg = 'Lịch đã thay đổi. Đề xuất này không còn dựa trên phiên bản lịch mới nhất. Vui lòng tạo lại kế hoạch.';
        setError(staleMsg);
        showToast(staleMsg, 'error');
      } else {
        const errorMsg = getApiErrorMessage(reason) || 'Không thể áp dụng kế hoạch này.';
        setError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } finally {
      setApplying(false);
    }
  };

  const formattedRangeText = useMemo(() => {
    try {
      const d1 = new Date(from);
      const d2 = new Date(to);
      const str1 = `${d1.getDate()}/${d1.getMonth() + 1}/${d1.getFullYear()}`;
      const str2 = `${d2.getDate()}/${d2.getMonth() + 1}/${d2.getFullYear()}`;
      return `${str1} ➔ ${str2} (${planningDays} ngày)`;
    } catch {
      return '7 ngày tới';
    }
  }, [from, to, planningDays]);

  return (
    <section className="scheduling-studio-page" aria-label="SmartSchedule Studio 2.0 AI Orchestrator">
      {/* 1. Studio Header Banner */}
      <div className="studio-hero-banner">
        <div className="studio-hero-left">
          <div className="studio-badge-row">
            <span className="studio-campus-tag">
              <MapPin size={11} />
              <span>FPT University · Quy Nhơn AI Campus</span>
            </span>
            <span className="studio-engine-tag">
              <Zap size={11} />
              <span>Google OR-Tools CP-SAT Solver v2.4</span>
            </span>
          </div>

          <h1 className="studio-hero-title">
            <BrainCircuit size={26} className="text-indigo-600" />
            <span>Lập Lịch Thông Minh AI</span>
          </h1>

          <p className="studio-hero-subtitle">
            Hệ thống phân tích tự động khoảng trống giảng đường, môn học chính khóa và hạn chót bài tập để xây dựng kế hoạch học tập tối ưu toàn cục.
          </p>
        </div>

        <div className="studio-hero-right">
          <div className="studio-status-pill">
            <span className="studio-dot-pulse" />
            <span>AI Engine Sẵn sàng</span>
          </div>
          <SchedulePicker />
        </div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}
      {applyMessage && <div className="form-success" role="status">{applyMessage}</div>}

      {/* 2. Interactive Workflow Stepper Bar */}
      <div className="studio-stepper-bar">
        <div className="studio-step-pill active">
          <span className="studio-step-num">1</span>
          <span>Khoảng thời gian</span>
        </div>
        <span className="studio-step-sep">➔</span>
        <div className={`studio-step-pill ${selected.length > 0 ? 'active' : ''}`}>
          <span className="studio-step-num">2</span>
          <span>Tác vụ cần xếp ({selected.length})</span>
        </div>
        <span className="studio-step-sep">➔</span>
        <div className="studio-step-pill active">
          <span className="studio-step-num">3</span>
          <span>Hồ sơ FPT ({activePersona.name})</span>
        </div>
        <span className="studio-step-sep">➔</span>
        <div className={`studio-step-pill ${result ? 'active' : ''}`}>
          <span className="studio-step-num">4</span>
          <span>Kế hoạch đề xuất {result ? '(Đã xong)' : ''}</span>
        </div>
      </div>

      {!activeScheduleId ? (
        <div className="panel empty-state">
          <strong>Vui lòng chọn hoặc tạo lịch trình trước</strong>
          <span>Hệ thống cần một không gian lịch trình học kỳ để lưu trữ các ca học.</span>
        </div>
      ) : (
        /* 3. Main 2-Column Studio Grid */
        <div className="studio-main-grid">
          {/* =========================================================
              LEFT COLUMN: Studio Controller Hub
             ========================================================= */}
          <div className="studio-controls-col">
            {/* Step 1: Time Horizon Card */}
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="studio-card-title-wrap">
                  <div className="studio-card-icon-box icon-box-orange">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h3 className="studio-card-title">1. Khoảng thời gian lập lịch</h3>
                    <span className="studio-card-sub">Thời đoạn áp dụng thuật toán CP-SAT</span>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="studio-preset-group">
                <button
                  type="button"
                  className={`studio-preset-btn ${timePreset === 'next7' ? 'active' : ''}`}
                  onClick={() => handleTimePresetChange('next7')}
                >
                  7 Ngày tới
                </button>
                <button
                  type="button"
                  className={`studio-preset-btn ${timePreset === 'thisWeek' ? 'active' : ''}`}
                  onClick={() => handleTimePresetChange('thisWeek')}
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  className={`studio-preset-btn ${timePreset === 'custom' ? 'active' : ''}`}
                  onClick={() => setTimePreset('custom')}
                >
                  Tùy chỉnh
                </button>
              </div>

              {/* Formatted Date Pill */}
              <div className="studio-date-display-badge">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} className="text-orange-500" />
                  <span>{formattedRangeText}</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }}>FPT Timezone</span>
              </div>

              {timePreset === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                  <label className="field">
                    <span>Bắt đầu</span>
                    <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Kết thúc</span>
                    <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
                  </label>
                </div>
              )}
            </div>

            {/* Step 2: Task Workspace Card */}
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="studio-card-title-wrap">
                  <div className="studio-card-icon-box icon-box-indigo">
                    <CheckSquare size={16} />
                  </div>
                  <div>
                    <h3 className="studio-card-title">2. Tác vụ cần xếp lịch</h3>
                    <span className="studio-card-sub">{tasks.length} bài tập & đồ án trong học kỳ</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="hero-dock-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsComposerOpen((v) => !v)}
                >
                  <Plus size={12} />
                  <span>Thêm tác vụ</span>
                </button>
              </div>

              {/* Workload Indicator */}
              <div className="studio-workload-bar">
                <span>
                  Đã chọn: <strong>{selected.length}/{tasks.length}</strong> bài
                </span>
                <span>
                  Khối lượng: <strong className="text-indigo-600">{formatMinutes(estimatedRemainingMinutes)}</strong>
                </span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#ea580c', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  onClick={handleToggleSelectAll}
                >
                  {selected.length === tasks.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                </button>
              </div>

              {/* Tasks List */}
              {tasks.length === 0 ? (
                <div className="empty-state compact workspace-empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <strong>Chưa có bài tập nào</strong>
                  <span style={{ fontSize: 12, color: '#64748b', display: 'block', margin: '4px 0 10px' }}>
                    Thêm bài tập hoặc đồ án để thuật toán phân bổ vào khoảng trống.
                  </span>
                  <button
                    type="button"
                    className="hero-dock-primary"
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                    onClick={() => setIsComposerOpen(true)}
                  >
                    + Thêm bài tập đầu tiên
                  </button>
                </div>
              ) : (
                <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                  {filteredTasks.map((t) => {
                    const isChecked = selected.includes(t.id);
                    const isUrgent = t.priority === 'HIGH';
                    return (
                      <div
                        key={t.id}
                        className={`studio-task-item ${isChecked ? 'selected' : ''}`}
                        onClick={() => handleToggleSelect(t.id)}
                      >
                        <div className="studio-task-left">
                          {isChecked ? (
                            <CheckSquare size={16} className="text-orange-500" />
                          ) : (
                            <Square size={16} className="text-slate-400" />
                          )}
                          <span className="studio-task-title" title={t.title}>
                            {t.title}
                          </span>
                        </div>

                        <div className="studio-task-meta">
                          <span
                            className={`mock-status-pill ${isUrgent ? 'pill-red' : 'pill-blue'}`}
                            style={{ fontSize: 10, padding: '2px 8px' }}
                          >
                            {isUrgent ? 'CAO' : 'VỪA'}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#475569',
                              background: '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: 6,
                            }}
                          >
                            {formatMinutes(t.estimatedDurationMinutes)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: FPT Learning Persona Card */}
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="studio-card-title-wrap">
                  <div className="studio-card-icon-box icon-box-emerald">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h3 className="studio-card-title">3. Hồ sơ & Thiết lập học tập</h3>
                    <span className="studio-card-sub">Phong cách học tập & Ràng buộc toán học</span>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#334155',
                  }}
                  onClick={() => setIsConstraintsModalOpen(true)}
                >
                  Quy tắc nâng cao ({schedulingRules.filter((r) => r.enabled).length})
                </button>
              </div>

              {/* 4-Pill Persona Grid */}
              <div className="studio-persona-grid">
                {(Object.keys(SCHEDULING_PERSONAS) as PersonaId[]).map((pid) => {
                  const p = SCHEDULING_PERSONAS[pid];
                  const isActive = activePersonaId === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      className={`studio-persona-card ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectPersona(pid)}
                    >
                      <span className="studio-persona-name">
                        {p.name}
                      </span>
                      <span className="studio-persona-hours">
                        {p.preferences.preferredStart} – {p.preferences.preferredEnd} ({Math.round(p.preferences.maxDailyMinutes / 60)}h)
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: campusMobilityEnabled ? '1px solid #10b981' : '1px solid #e2e8f0',
                    background: campusMobilityEnabled ? '#ecfdf5' : '#ffffff',
                    color: campusMobilityEnabled ? '#065f46' : '#64748b',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onClick={() => setCampusMobilityEnabled((v) => !v)}
                >
                  Đệm di chuyển Campus: {campusMobilityEnabled ? '✓ BẬT' : '✕ TẮT'}
                </button>

                <button
                  type="button"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: protectLunchEnabled ? '1px solid #10b981' : '1px solid #e2e8f0',
                    background: protectLunchEnabled ? '#ecfdf5' : '#ffffff',
                    color: protectLunchEnabled ? '#065f46' : '#64748b',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onClick={() => setProtectLunchEnabled((v) => !v)}
                >
                  Nghỉ trưa (12h-13h): {protectLunchEnabled ? '✓ BẬT' : '✕ TẮT'}
                </button>
              </div>
            </div>

            {/* Step 4: Solver Trigger Actions */}
            <div>
              <button
                type="button"
                className="studio-btn-cpsat"
                onClick={() => void generate(true)}
                disabled={loading || selected.length === 0}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Đang chạy OR-Tools CP-SAT Solver...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    <span>✨ Kích hoạt OR-Tools CP-SAT Tối ưu lịch</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="studio-btn-standard"
                onClick={() => void generate(false)}
                disabled={loading || selected.length === 0}
              >
                <span>⚡ Lập lịch thông minh tiêu chuẩn</span>
              </button>
            </div>
          </div>

          {/* =========================================================
              RIGHT COLUMN: Studio Live Plan Canvas
             ========================================================= */}
          <div className="studio-canvas-col">
            {/* If Generating: Progress Timeline */}
            {loading && <GenerationProgress step={generationStep} />}

            {/* If NOT Generating and NO Result: Standby Readiness Radar (REPLACES EMPTY WHITE BOX!) */}
            {!loading && !result && (
              <div className="studio-radar-card">
                <div className="studio-radar-header">
                  <div>
                    <h2 className="studio-radar-title">
                      <Sparkles size={20} className="text-orange-500" />
                      <span>Hệ Thống Đã Sẵn Sàng Tính Toán</span>
                    </h2>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Phân tích khoảng trống thời khóa biểu và tối ưu hóa toán học bằng Google OR-Tools.
                    </span>
                  </div>

                  <span className="studio-status-pill">
                    <span className="studio-dot-pulse" />
                    <span>Thuật toán Standby</span>
                  </span>
                </div>

                {/* 3 Readiness Badges */}
                <div className="studio-readiness-grid">
                  <div className="studio-readiness-box">
                    <div className="readiness-icon-circle" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                      <CheckSquare size={16} />
                    </div>
                    <strong>{selected.length} Tác vụ đã chọn</strong>
                    <span>Khối lượng {formatMinutes(estimatedRemainingMinutes)} tự học cần bố trí.</span>
                  </div>

                  <div className="studio-readiness-box">
                    <div className="readiness-icon-circle" style={{ background: '#fff7ed', color: '#ea580c' }}>
                      <MapPin size={16} />
                    </div>
                    <strong>Khoảng trống Campus</strong>
                    <span>Tự động phát hiện giờ trống tại Thư viện Atrium & Phòng Lab Quy Nhơn.</span>
                  </div>

                  <div className="studio-readiness-box">
                    <div className="readiness-icon-circle" style={{ background: '#ecfdf5', color: '#059669' }}>
                      <ShieldCheck size={16} />
                    </div>
                    <strong>8 Quy tắc ràng buộc</strong>
                    <span>Đảm bảo 100% không trùng lịch học chính khóa và kịp hạn chót.</span>
                  </div>
                </div>

                {/* Explanatory callout */}
                <div className="studio-radar-info-box">
                  <div className="radar-info-text">
                    <strong>💡 Cách thức hoạt động:</strong> Bạn đã chọn{' '}
                    <strong className="text-indigo-600">{selected.length} bài tập</strong> ({formatMinutes(estimatedRemainingMinutes)}).
                    Bấm nút <strong>"Kích hoạt OR-Tools CP-SAT"</strong> ở cột bên trái hoặc nút dưới đây để hệ thống tự động tìm nghiệm tối ưu toàn cục trong vài giây.
                  </div>

                  <button
                    type="button"
                    className="radar-trigger-btn"
                    onClick={() => void generate(true)}
                    disabled={selected.length === 0}
                  >
                    🚀 Tối ưu ngay
                  </button>
                </div>
              </div>
            )}

            {/* If Result Available: Plan Results & 1-Click Apply */}
            {!loading && result && (
              <>
                <div className="studio-plan-header-card">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="studio-status-pill">
                        <CheckCircle2 size={13} />
                        <span>Đã tìm thấy phương án tối ưu</span>
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        CP-SAT Solver v2.4
                      </span>
                    </div>

                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Kế hoạch đề xuất ({result.slots.length} ca học)
                    </h2>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Tổng {formatMinutes(plannedMinutes)} đã được phân bổ khoa học vào các khoảng trống trong tuần.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="studio-apply-btn"
                    onClick={() => setConfirmApply(true)}
                    disabled={applying}
                  >
                    {applying ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Đang ghi nhận...</span>
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        <span>Áp dụng vào Thời khóa biểu</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Plan Result Component */}
                <PlanResult
                  result={result}
                  tasks={selectedTasks}
                  unscheduled={derivedUnscheduled}
                  plannedMinutes={plannedMinutes}
                  riskCount={riskCount}
                  slotsByDay={slotsByDay}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog on Apply Plan */}
      {confirmApply && result && (
        <div className="dialog-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-labelledby="apply-plan-title">
            <p className="eyebrow">Xác nhận áp dụng lịch</p>
            <h3 id="apply-plan-title">Áp dụng kế hoạch này vào Thời khóa biểu?</h3>
            <p className="muted">
              Hệ thống sẽ thêm {result.slots.length} ca học đã tối ưu vào lịch trình của bạn. Các tiết học chính khóa cố định được giữ nguyên 100%. Bạn có thể hoàn tác bất kỳ lúc nào.
            </p>
            <div className="drawer-actions">
              <button className="secondary-button" onClick={() => setConfirmApply(false)}>
                Tiếp tục xem lại
              </button>
              <button className="primary-button" onClick={() => void apply()} disabled={applying}>
                {applying ? 'Đang lưu...' : 'Xác nhận áp dụng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Task Modal Overlay with Backdrop Blur & Motion Animation */}
      <AnimatePresence>
        {isComposerOpen && (
          <motion.div
            className="dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsComposerOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Thêm nhanh tác vụ"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              className="composer-modal-card"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
            >
              <QuickAddComposer
                categories={categories}
                onAddTask={async (data) => {
                  await handleAddTask(data);
                  setIsComposerOpen(false);
                }}
                onCancel={() => setIsComposerOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Constraints Modal */}
      <AdvancedConstraintsModal
        isOpen={isConstraintsModalOpen}
        rules={schedulingRules}
        onClose={() => setIsConstraintsModalOpen(false)}
        onSaveRules={(newRules) => {
          setSchedulingRules(newRules);
          showToast('Đã cập nhật quy tắc xếp lịch', 'success');
        }}
      />
    </section>
  );
}

function GenerationProgress({ step }: { step: number }) {
  const items = [
    'Kiểm tra lịch cố định & cam kết lớp học',
    'Phân tích khung giờ trống khả dụng',
    'Sắp xếp thứ tự ưu tiên & Hạn chót bài tập',
    'Tính toán vị trí & khoảng đệm di chuyển Campus',
    'Cân bằng khối lượng học mỗi ngày',
    'Rà soát xung đột và khoảng nghỉ an toàn',
    'Hoàn thiện kế hoạch lịch trình thông minh',
  ];
  return (
    <div className="studio-radar-card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <strong style={{ fontSize: 16, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={16} className="animate-spin text-indigo-600" />
          <span>Đang xây dựng kế hoạch lịch thông minh...</span>
        </strong>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Tự động tối ưu từ danh sách bài tập, hạn chót và độ trống giảng đường FPT.
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, index) => {
          const isDone = index + 1 < step;
          const isCurrent = index + 1 === step;
          return (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12.5,
                color: isDone ? '#059669' : isCurrent ? '#4f46e5' : '#94a3b8',
                fontWeight: isCurrent ? 700 : 500,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDone ? '#ecfdf5' : isCurrent ? '#eef2ff' : '#f1f5f9',
                  color: isDone ? '#059669' : isCurrent ? '#4f46e5' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {isDone ? '✓' : isCurrent ? '•' : ''}
              </span>
              <span>{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanResult({
  result,
  tasks,
  unscheduled,
  plannedMinutes,
  riskCount,
  slotsByDay,
}: {
  result: SchedulingResult;
  tasks: Task[];
  unscheduled: Task[];
  plannedMinutes: number;
  riskCount: number;
  slotsByDay: { dateKey: string; label: string; slots: SchedulingResult['slots'] }[];
}) {
  const slots = Array.isArray(result.slots) ? result.slots : [];
  const scheduledTaskIds = new Set(slots.map((slot) => slot.taskId));
  const fullyCovered = tasks.filter((task) => scheduledTaskIds.has(task.id)).length;
  const hardConflicts = result.summary?.hardConflicts ?? 0;
  const remainingMinutes =
    result.summary?.remainingMinutes ??
    Math.max(0, tasks.reduce((sum, task) => sum + task.remainingDurationMinutes, 0) - plannedMinutes);
  const displayPlannedMinutes = result.summary?.plannedMinutes ?? plannedMinutes;
  const displayRiskCount = result.summary?.deadlineRisks ?? riskCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {slots.length === 0 ? (
        <div className="impossible-state">
          <span className="status-pill danger">[CẢNH BÁO: KHÔNG TÌM ĐƯỢC KHUNG PHÙ HỢP]</span>
          <div>
            <h3>Không thể xếp lịch thỏa mãn toàn bộ ràng buộc hiện tại</h3>
            <p className="muted">
              Không có khoảng thời gian trống phù hợp. Hãy thử nới rộng khoảng ngày, giảm thời gian nghỉ đệm hoặc tăng giới hạn giờ học mỗi ngày.
            </p>
          </div>
        </div>
      ) : (
        <div className="plan-summary">
          <span><strong>{formatMinutes(displayPlannedMinutes)}</strong> đã xếp</span>
          <span><strong>{formatMinutes(remainingMinutes)}</strong> còn lại</span>
          <span><strong>{hardConflicts}</strong> xung đột cứng</span>
          <span><strong>{displayRiskCount}</strong> rủi ro hạn chót</span>
          <span><strong>{fullyCovered}/{tasks.length}</strong> bài tập xếp đủ</span>
        </div>
      )}

      {slots.length > 0 && (
        <div className="proposed-days-container">
          <div className="proposed-days-header">
            <h4>Lịch học đề xuất ({slots.length} ca học)</h4>
            <span className="muted" style={{ fontSize: 12 }}>Được chia theo từng ngày thuận tiện theo dõi</span>
          </div>

          {slotsByDay.map((dayGroup) => (
            <div key={dayGroup.dateKey} className="studio-day-card">
              <div className="studio-day-header">
                <span className="studio-day-title">{dayGroup.label}</span>
                <span className="proposal-day-count">{dayGroup.slots.length} ca</span>
              </div>
              <div>
                {dayGroup.slots.map((item, index) => {
                  const durationMin = getDurationMinutes(item.startsAt, item.endsAt);
                  return (
                    <div className="studio-slot-item" key={`${item.taskId}-${item.startsAt}-${index}`}>
                      <div>
                        <div className="studio-slot-title">{item.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>
                            {formatTimeRange(item.startsAt, item.endsAt, DEFAULT_TIMEZONE)} · {formatMinutes(durationMin)}
                          </span>
                          <span className="studio-slot-location">
                            <MapPin size={11} />
                            <span>Thư viện Atrium AI Campus</span>
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.reasons && item.reasons.length > 0 ? (
                          item.reasons.slice(0, 2).map((r) => (
                            <span
                              key={r}
                              className="mock-status-pill pill-blue"
                              style={{ fontSize: 10, padding: '2px 6px' }}
                            >
                              {r === 'BEFORE_DEADLINE'
                                ? '✓ Kịp hạn chót'
                                : r === 'NO_HARD_CONFLICT'
                                ? '✓ Không xung đột'
                                : r === 'PRIORITY_PRESERVED'
                                ? '★ Ưu tiên cao'
                                : r === 'BALANCED_DAILY_LOAD'
                                ? '⚖ Cân bằng tải'
                                : `[${r}]`}
                            </span>
                          ))
                        ) : (
                          <span className="mock-status-pill pill-green" style={{ fontSize: 10, padding: '2px 6px' }}>
                            ✓ Đã xếp tối ưu
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
