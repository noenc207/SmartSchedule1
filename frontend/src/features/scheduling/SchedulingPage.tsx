import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { TaskCard } from './components/TaskCard';
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
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 16);
};

const plusDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
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

  // Planning controls
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
  const [isProOptimization, setIsProOptimization] = useState(false);

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
      .catch(() => setError('Could not load scheduling workspace inputs.'));
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
      showToast(`Task "${created.title}" added to planning workspace`, 'success');
    } catch {
      setError('Could not add task.');
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
      setError('Could not update task.');
    }
  };

  const handleDuplicateTask = async (task: Task) => {
    if (!activeScheduleId) return;
    try {
      const duplicated = await taskApi.create(activeScheduleId, {
        title: `${task.title} (Copy)`,
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
      showToast(`Duplicated "${task.title}"`, 'success');
    } catch {
      setError('Could not duplicate task.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskApi.remove(taskId);
      setTasks((curr) => curr.filter((t) => t.id !== taskId));
      setSelected((curr) => curr.filter((id) => id !== taskId));
      showToast('Task removed from workspace', 'info');
    } catch {
      setError('Could not delete task.');
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
        notes: `Scheduled session from task · ${task.id}`,
      });

      // Update events immediately
      setEvents((curr) => [...curr, createdEvent]);

      const prevScheduled = getTaskScheduledMinutes(task.id, events);
      const newScheduled = prevScheduled + sessionMinutes;
      const newRemaining = Math.max(0, task.estimatedDurationMinutes - newScheduled);
      const newStatus = newRemaining === 0 ? 'SCHEDULED' : 'IN_PROGRESS';

      // Update task backend
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

      // Update task state
      setTasks((curr) =>
        curr.map((t) => (t.id === task.id ? { ...t, remainingDurationMinutes: newRemaining, status: newStatus } : t))
      );

      // Toast with Undo action
      showToast(`Scheduled ${formatMinutes(sessionMinutes)} for "${task.title}"`, 'success', {
        action: {
          label: 'Undo',
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
            showToast(`Undone session for "${task.title}"`, 'info');
          },
        },
      });
    } catch {
      setError("Couldn't schedule this task. No changes were made.");
    }
  };

  // Generate & Apply proposal handlers
  const generate = async (isProMode: boolean = false) => {
    if (!activeScheduleId) return;
    if (new Date(from) >= new Date(to)) {
      setError('Planning range must have a valid end after its start.');
      return;
    }
    setLoading(true);
    setGenerationStep(1);
    setError('');
    setApplyMessage('');
    setResult(null);

    try {
      await sleep(250);
      setGenerationStep(2);
      await schedulingApi.updatePreferences(activeScheduleId, preferences);
      await sleep(250);
      setGenerationStep(3);
      await sleep(250);
      setGenerationStep(4);
      await sleep(250);
      setGenerationStep(5);

      let generatedPlan: SchedulingResult;
      if (isProMode) {
        setIsProOptimization(true);
        generatedPlan = await schedulingApi.optimizePro(activeScheduleId, request());
      } else {
        setIsProOptimization(false);
        generatedPlan = await schedulingApi.generate(activeScheduleId, request());
      }

      await sleep(250);
      setGenerationStep(6);
      await sleep(250);
      setGenerationStep(7);
      await sleep(200);
      setResult(generatedPlan);
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      setError(errMsg || 'We could not generate the schedule right now. Review inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeProClick = () => {
    void generate(true);
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
      setApplyMessage('Schedule applied! All planned sessions are now populated on your calendar.');
      showToast('Schedule applied! All planned sessions are on your calendar.', 'success');

      // Record batch undo in history store
      useHistoryStore.getState().recordAction({
        description: `Applied schedule (${appliedResult.slots.length} sessions)`,
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
            showToast('Applied schedule reverted', 'info');
          } catch {
            showToast('Could not revert applied schedule', 'error');
          }
        },
        redo: async () => {
          await schedulingApi.apply(activeScheduleId, appliedResult);
          showToast('Schedule re-applied', 'info');
        },
      });

      setTimeout(() => navigate('/calendar'), 1200);
    } catch (reason: unknown) {
      const err = reason as any;
      const status = err?.response?.status || err?.status;
      if (status === 409) {
        const staleMsg = 'Lịch đã thay đổi. Đề xuất này không còn dựa trên phiên bản lịch mới nhất. Vui lòng tạo lại kế hoạch.';
        setError(staleMsg);
        showToast(staleMsg, 'error');
      } else {
        const errorMsg = getApiErrorMessage(reason) || 'Could not apply this plan.';
        setError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } finally {
      setApplying(false);
    }
  };


  return (
    <section className="workspace-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Planning engine</p>
          <h2>Generate schedule</h2>
          <p className="muted">
            Turn commitments, available capacity, and deadlines into a plan you can review before it touches your calendar.
          </p>
        </div>
        <SchedulePicker />
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}
      {applyMessage && <div className="form-success" role="status">{applyMessage}</div>}

      {!activeScheduleId ? (
        <div className="panel empty-state">
          <strong>Create a schedule first</strong>
          <span>Tasks, availability, and events are used to build a plan.</span>
        </div>
      ) : (
        <div className="scheduling-layout">
          <div className="scheduling-setup">
            <div className="workflow-steps" aria-label="Schedule generation steps">
              <span className="active">01 Inputs</span>
              <span>02 Constraints</span>
              <span>03 Generate</span>
              <span>04 Review</span>
            </div>

            {/* Step 1: Planning Range */}
            <section className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Bước 01</p>
                  <h3>Khoảng thời gian lập lịch</h3>
                </div>
              </div>
              <label className="field">
                <span>Bắt đầu</span>
                <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="field">
                <span>End</span>
                <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </section>

            {/* Step 1: Tasks to schedule (Interactive Workspace) */}
            <section className="panel task-workspace-panel">
              <TaskWorkspaceHeader
                tasks={tasks}
                filteredCount={filteredTasks.length}
                events={events}
                selectedIds={selected}
                currentFilter={taskFilterStatus}
                currentPriority={taskFilterPriority}
                currentDeadline={taskFilterDeadline}
                currentSort={taskSortBy}
                searchQuery={searchQuery}
                isComposerOpen={isComposerOpen}
                onToggleComposer={() => setIsComposerOpen((v) => !v)}
                onFilterChange={setTaskFilterStatus}
                onPriorityChange={setTaskFilterPriority}
                onDeadlineChange={setTaskFilterDeadline}
                onSortChange={setTaskSortBy}
                onSearchChange={setSearchQuery}
                onClearFilters={() => {
                  setSearchQuery('');
                  setTaskFilterStatus('ALL');
                  setTaskFilterPriority('ALL');
                  setTaskFilterDeadline('ALL');
                }}
                onToggleSelectAll={handleToggleSelectAll}
              />

              {/* Inline Quick Add Composer */}
              {isComposerOpen && (
                <QuickAddComposer
                  categories={categories}
                  onAddTask={handleAddTask}
                  onCancel={() => setIsComposerOpen(false)}
                />
              )}

              {/* Tasks List */}
              {tasks.length === 0 ? (
                <div className="empty-state compact workspace-empty-state">
                  <strong>No tasks yet</strong>
                  <span>Add tasks to build a schedule around your deadlines and availability.</span>
                  <button
                    type="button"
                    className="primary-button compact-btn fpt-add-task-btn"
                    onClick={() => setIsComposerOpen(true)}
                  >
                    + Add task
                  </button>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="empty-state compact workspace-empty-state">
                  <span>No tasks matching current filters.</span>
                  <button
                    type="button"
                    className="text-button compact-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setTaskFilterStatus('ALL');
                      setTaskFilterPriority('ALL');
                      setTaskFilterDeadline('ALL');
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <CompactTaskAccordionList
                  tasks={filteredTasks}
                  categories={categories}
                  events={events}
                  selected={selected}
                  splitTasks={splitTasks}
                  onToggleSelect={handleToggleSelect}
                  onToggleSplit={handleToggleSplit}
                  onUpdateTask={handleUpdateTask}
                  onDuplicateTask={handleDuplicateTask}
                  onDeleteTask={handleDeleteTask}
                  onScheduleSlot={handleScheduleSlot}
                />
              )}
            </section>

            {/* Step 2: Persona & Study Preferences */}
            <section className="panel constraint-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Bước 02</p>
                  <h3>Hồ sơ & Thiết lập học tập</h3>
                  <span className="muted" style={{ fontSize: 11 }}>FPT University Quy Nhơn · AI Campus</span>
                </div>
                <div className="step2-heading-actions">
                  <button
                    type="button"
                    className="secondary-button compact-btn"
                    onClick={() => setIsConstraintsModalOpen(true)}
                    aria-label="Cấu hình quy tắc nâng cao"
                  >
                    <span>Quy tắc nâng cao ({schedulingRules.filter((r) => r.enabled).length})</span>
                  </button>
                </div>
              </div>

              {/* 4-Pill Persona Quick Selector Bar */}
              <div className="persona-selector-container">
                <span className="persona-selector-label">Hồ sơ mục tiêu 1 chạm:</span>
                <div className="persona-pill-group">
                  {(Object.keys(SCHEDULING_PERSONAS) as PersonaId[]).map((pid) => {
                    const p = SCHEDULING_PERSONAS[pid];
                    const isActive = activePersonaId === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        className={`persona-pill-btn ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelectPersona(pid)}
                        style={{
                          borderColor: isActive ? p.color : undefined,
                        }}
                      >
                        <span className="persona-pill-badge" style={{ color: p.color }}>[{p.badge}]</span>
                        <strong className="persona-pill-name">{p.name}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Persona Insight Card */}
              <div className="persona-insight-card" style={{ borderLeftColor: activePersona.color }}>
                <div className="persona-insight-top">
                  <span className="persona-insight-tagline">{activePersona.tagline}</span>
                  <span className="persona-insight-hours">
                    {preferences.preferredStart} – {preferences.preferredEnd} ({Math.round(preferences.maxDailyMinutes / 60)}h/ngày)
                  </span>
                </div>
                <p className="persona-insight-desc">{activePersona.description}</p>
              </div>

              {/* Deep Customization Section (Accordion) */}
              <div className="deep-customization-card">
                <div
                  className="deep-customization-header"
                  onClick={() => setIsDeepCustomizationOpen((v) => !v)}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <strong>Tùy chỉnh sâu từng giờ, phút & ca học</strong>
                    <span className="muted" style={{ fontSize: 12, display: 'block' }}>
                      Điều chỉnh chính xác khung giờ vàng, thời lượng ca, nghỉ đệm và di chuyển campus
                    </span>
                  </div>
                  <span className="accordion-indicator">
                    {isDeepCustomizationOpen ? '[Thu gọn ▲]' : '[Tùy chỉnh sâu ▼]'}
                  </span>
                </div>

                {isDeepCustomizationOpen && (
                  <div className="deep-customization-body">
                    {/* Time Window (Start & End with Hour & Minute dual selects) */}
                    <div className="deep-control-row">
                      <div className="deep-control-col">
                        <label className="deep-field-label">Khung giờ bắt đầu học:</label>
                        <div className="deep-time-dual-select">
                          <select
                            className="deep-select"
                            value={startHM.hour}
                            onChange={(e) => handleStartHourChange(Number(e.target.value))}
                            aria-label="Giờ bắt đầu"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>
                                {String(i).padStart(2, '0')} giờ
                              </option>
                            ))}
                          </select>
                          <span className="deep-time-sep">:</span>
                          <select
                            className="deep-select"
                            value={startHM.minute}
                            onChange={(e) => handleStartMinuteChange(Number(e.target.value))}
                            aria-label="Phút bắt đầu"
                          >
                            {[0, 15, 30, 45].map((m) => (
                              <option key={m} value={m}>
                                {String(m).padStart(2, '0')} phút
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="deep-control-col">
                        <label className="deep-field-label">Khung giờ kết thúc tối đa:</label>
                        <div className="deep-time-dual-select">
                          <select
                            className="deep-select"
                            value={endHM.hour}
                            onChange={(e) => handleEndHourChange(Number(e.target.value))}
                            aria-label="Giờ kết thúc"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>
                                {String(i).padStart(2, '0')} giờ
                              </option>
                            ))}
                          </select>
                          <span className="deep-time-sep">:</span>
                          <select
                            className="deep-select"
                            value={endHM.minute}
                            onChange={(e) => handleEndMinuteChange(Number(e.target.value))}
                            aria-label="Phút kết thúc"
                          >
                            {[0, 15, 30, 45].map((m) => (
                              <option key={m} value={m}>
                                {String(m).padStart(2, '0')} phút
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Session Min & Max Duration */}
                    <div className="deep-control-row">
                      <div className="deep-control-col">
                        <label className="deep-field-label">Ca học ngắn nhất:</label>
                        <select
                          className="deep-select"
                          value={preferences.minimumSessionMinutes}
                          onChange={(e) => updatePreference('minimumSessionMinutes', Number(e.target.value))}
                        >
                          {SESSION_DURATION_OPTIONS.slice(0, 5).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="deep-control-col">
                        <label className="deep-field-label">Ca học dài nhất:</label>
                        <select
                          className="deep-select"
                          value={preferences.maximumSessionMinutes}
                          onChange={(e) => updatePreference('maximumSessionMinutes', Number(e.target.value))}
                        >
                          {SESSION_DURATION_OPTIONS.slice(1).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Break Duration & Daily Cap */}
                    <div className="deep-control-row">
                      <div className="deep-control-col">
                        <label className="deep-field-label">Khoảng nghỉ giữa các ca:</label>
                        <select
                          className="deep-select"
                          value={preferences.minBreakMinutes}
                          onChange={(e) => updatePreference('minBreakMinutes', Number(e.target.value))}
                        >
                          {BREAK_DURATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="deep-control-col">
                        <label className="deep-field-label">Giới hạn tự học mỗi ngày:</label>
                        <select
                          className="deep-select"
                          value={preferences.maxDailyMinutes}
                          onChange={(e) => updatePreference('maxDailyMinutes', Number(e.target.value))}
                        >
                          {DAILY_CAPACITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Toggles: Campus Mobility & Lunch Protection */}
                    <div className="deep-toggles-row">
                      <button
                        type="button"
                        className={`deep-toggle-btn ${campusMobilityEnabled ? 'active' : ''}`}
                        onClick={() => {
                          setCampusMobilityEnabled((v) => !v);
                          showToast(
                            campusMobilityEnabled
                              ? 'Đã tắt đệm di chuyển Campus FPT'
                              : 'Đã bật đệm di chuyển Campus FPT Quy Nhơn',
                            'info'
                          );
                        }}
                      >
                        <span>Đệm di chuyển Campus FPT:</span>
                        <strong>{campusMobilityEnabled ? '[BẬT]' : '[TẮT]'}</strong>
                      </button>

                      <button
                        type="button"
                        className={`deep-toggle-btn ${protectLunchEnabled ? 'active' : ''}`}
                        onClick={() => {
                          setProtectLunchEnabled((v) => !v);
                          showToast(
                            protectLunchEnabled
                              ? 'Đã mở khung giờ trưa'
                              : 'Đã bảo vệ khung nghỉ trưa (12:00–13:00)',
                            'info'
                          );
                        }}
                      >
                        <span>Bảo vệ giờ nghỉ trưa (12h-13h):</span>
                        <strong>{protectLunchEnabled ? '[BẬT]' : '[TẮT]'}</strong>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Constraint Summary Banner */}
              <div className="constraint-summary-banner">
                <span>
                  Đang kích hoạt <b>{schedulingRules.filter((r) => r.enabled).length}</b> quy tắc xếp lịch (
                  <b>{schedulingRules.filter((r) => r.enabled && r.type === 'HARD').length}</b> ràng buộc cứng,{' '}
                  <b>{schedulingRules.filter((r) => r.enabled && r.type === 'SOFT').length}</b> ưu tiên mềm)
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setIsConstraintsModalOpen(true)}
                >
                  Xem chi tiết
                </button>
              </div>

              <ConstraintRow label="Bảo vệ lịch cố định" detail="Các tiết học trên lớp & lịch cố định không bị xê dịch" enabled />
              <ConstraintRow
                label="Khung giờ tự học ưu tiên"
                detail={`${preferences.preferredStart ?? '18:00'} – ${preferences.preferredEnd ?? '22:00'}`}
                enabled
                onClick={() => setIsDeepCustomizationOpen(true)}
              />
              <ConstraintRow
                label="Trần dung lượng mỗi ngày"
                detail={`${Math.round(preferences.maxDailyMinutes / 60)} tiếng/ngày`}
                enabled
                onClick={() => setIsDeepCustomizationOpen(true)}
              />
              <ConstraintRow
                label="Thời gian nghỉ giữa 2 ca"
                detail={`${preferences.minBreakMinutes} phút`}
                enabled
                onClick={() => setIsDeepCustomizationOpen(true)}
              />
            </section>

            {/* Planning Summary */}
            <section className="planning-summary">
              <div>
                <b>{selectedTasks.length}</b>
                <span>tác vụ đã chọn</span>
              </div>
              <div>
                <b>{formatMinutes(estimatedRemainingMinutes)}</b>
                <span>khối lượng cần xếp</span>
              </div>
              <div>
                <b>{Math.round(estimatedCapacity / 60)}h</b>
                <span>dung lượng tối đa</span>
              </div>
              <div>
                <b>{deadlineCount}</b>
                <span>có hạn chót</span>
              </div>
            </section>

            {estimatedRemainingMinutes > estimatedCapacity && (
              <div className="constraint-warning">
                <span className="status-pill warning">[CẢNH BÁO DUNG LƯỢNG]</span>
                <span>
                  <strong>Dung lượng học có thể không đủ:</strong>{' '}
                  {formatMinutes(estimatedRemainingMinutes - estimatedCapacity)} khối lượng học chưa thể xếp trong giới hạn này.
                </span>
              </div>
            )}

            {/* Step 3: Generate Button */}
            <button
              className="primary-button generate-button"
              onClick={() => void generate(false)}
              disabled={loading || tasks.length === 0}
            >
              {loading && !isProOptimization ? 'Đang phân tích & Lập lịch thông minh…' : '+ Tạo lịch thông minh (Smart Plan)'}
            </button>

            {/* Step 3B: Optimize Schedule [PRO] Button */}
            <button
              type="button"
              className="primary-button generate-button"
              style={{
                marginTop: '0.6rem',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
              onClick={() => void handleOptimizeProClick()}
              disabled={loading || tasks.length === 0}
            >
              <span>⚡ Tối ưu hóa nâng cao (CP-SAT Solver)</span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: '4px' }}>OR-Tools CP-SAT</span>
            </button>
          </div>

          {/* Right Column: Step 4 Proposed Schedule */}
          <section className="panel scheduling-result">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Bước 04</p>
                <h3>Kế hoạch đề xuất (Proposed Plan)</h3>
                <span className="muted">Lịch chỉ được ghi nhận khi bạn nhấn áp dụng.</span>
              </div>
              {result && (
                <button className="primary-button" onClick={() => setConfirmApply(true)} disabled={applying}>
                  {applying ? 'Đang lưu vào lịch...' : '+ Áp dụng vào lịch biểu'}
                </button>
              )}
            </div>

            {loading && <GenerationProgress step={generationStep} />}
            {!loading && !result ? (
              <div className="empty-state">
                <strong>Kế hoạch lịch sẽ hiển thị tại đây</strong>
                <span>Hệ thống phân tích các bài tập, hạn chót, phòng học và thời gian trống để tối ưu hóa.</span>
              </div>
            ) : !loading && result ? (
              <>
                {(isProOptimization || result.algorithmVersion) && (
                  <div
                    style={{
                      background: 'linear-gradient(90deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>⚡</span>
                      <div>
                        <strong style={{ color: '#4f46e5' }}>SmartSchedule Engine · OR-Tools CP-SAT Solver</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Thuật toán Constraint Programming tối ưu toán học, phân bổ ca học & đệm Campus chính xác.
                        </div>
                      </div>
                    </div>
                    <span className="status-pill success">[TỐI ƯU TOÁN HỌC]</span>
                  </div>
                )}
                {result.slots.length > 0 && (
                  <div className="optimization-explanation-card">
                    <div className="explanation-header">
                      <strong>[LÝ DO TỐI ƯU HÓA HỆ THỐNG]</strong>
                    </div>
                    <div className="explanation-reasons-list">
                      {generateOptimizationReasons(result.slots.length, schedulingRules).map((reason) => (
                        <div key={reason} className="explanation-reason-item">
                          <span className="dot green" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <PlanResult
                  result={result}
                  tasks={selectedTasks}
                  unscheduled={derivedUnscheduled}
                  plannedMinutes={plannedMinutes}
                  riskCount={riskCount}
                  slotsByDay={slotsByDay}
                />
              </>
            ) : null}
          </section>
        </div>
      )}

      {/* Confirmation Dialog on Apply Plan */}
      {confirmApply && result && (
        <div className="dialog-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-labelledby="apply-plan-title">
            <p className="eyebrow">Review before changing your calendar</p>
            <h3 id="apply-plan-title">Apply this schedule?</h3>
            <p className="muted">
              This will add {result.slots.length} planned session{result.slots.length === 1 ? '' : 's'} to your workspace.
              Your fixed events stay unchanged.
            </p>
            <div className="drawer-actions">
              <button className="secondary-button" onClick={() => setConfirmApply(false)}>
                Keep reviewing
              </button>
              <button className="primary-button" onClick={() => void apply()} disabled={applying}>
                {applying ? 'Applying...' : 'Apply changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Constraints Modal */}
      <AdvancedConstraintsModal
        isOpen={isConstraintsModalOpen}
        rules={schedulingRules}
        onClose={() => setIsConstraintsModalOpen(false)}
        onSaveRules={(newRules) => {
          setSchedulingRules(newRules);
          showToast('Scheduling rules updated', 'success');
        }}
      />
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
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
    <div className="generation-progress">
      <div>
        <strong>Đang xây dựng kế hoạch lịch thông minh</strong>
        <span>Tự động tối ưu từ danh sách bài tập, hạn chót và độ trống giảng đường FPT.</span>
      </div>
      {items.map((item, index) => (
        <div className="generation-step" key={item}>
          <span className={index + 1 < step ? 'step-mark done' : index + 1 === step ? 'step-mark current' : 'step-mark'}>
            {index + 1 < step ? '[✓]' : index + 1 === step ? '[•]' : '[ ]'}
          </span>
          <span>{item}</span>
        </div>
      ))}
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
    <div className="plan-result">
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
            <div key={dayGroup.dateKey} className="proposal-day-card">
              <div className="proposal-day-header">
                <span className="proposal-day-title">{dayGroup.label}</span>
                <span className="proposal-day-count">{dayGroup.slots.length} ca</span>
              </div>
              <div className="proposal-day-slots">
                {dayGroup.slots.map((item, index) => {
                  const durationMin = getDurationMinutes(item.startsAt, item.endsAt);
                  const isEvening = new Date(item.startsAt).getHours() >= 17;
                  return (
                    <div className="schedule-change added proposal-item" key={`${item.taskId}-${item.startsAt}-${index}`}>
                      <span className="change-icon">+</span>
                      <div className="proposal-item-details">
                        <div className="proposal-item-title-row">
                          <strong>{item.title}</strong>
                          <span className="proposal-item-time">
                            {formatTimeRange(item.startsAt, item.endsAt, DEFAULT_TIMEZONE)} · {formatMinutes(durationMin)}
                          </span>
                        </div>
                        <div className="proposal-item-tags-row">
                          <span className="reason-tag slot-tag">[Ca {formatMinutes(durationMin)}]</span>
                          {item.reasons && item.reasons.length > 0 ? (
                            item.reasons.map((r) => (
                              <span
                                key={r}
                                className="reason-tag"
                                style={{
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  color: '#4f46e5',
                                  borderColor: 'rgba(99, 102, 241, 0.3)',
                                }}
                              >
                                {r === 'BEFORE_DEADLINE'
                                  ? '✓ Kịp hạn chót'
                                  : r === 'NO_HARD_CONFLICT'
                                  ? '✓ Không xung đột'
                                  : r === 'PRIORITY_PRESERVED'
                                  ? '★ Ưu tiên cao'
                                  : r === 'BALANCED_DAILY_LOAD'
                                  ? '⚖ Cân bằng tải'
                                  : r === 'SAME_LOCATION_AS_PREVIOUS_EVENT'
                                  ? '📍 Cùng địa điểm'
                                  : `[${r}]`}
                              </span>
                            ))
                          ) : (
                            <>
                              {isEvening && <span className="reason-tag evening">[Khung tối tập trung]</span>}
                              <span className="reason-tag campus">[FPT AI Campus]</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="change-label">[ĐÃ XẾP]</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobility Health Findings */}
      {result.mobilityFindings && result.mobilityFindings.length > 0 && (
        <div className="attention-list" style={{ marginTop: '1rem', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '1rem' }}>
          <div className="panel-heading" style={{ marginBottom: '0.5rem' }}>
            <h4 style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🚶 Phân tích sức khỏe di chuyển Campus (Mobility Health)</span>
            </h4>
            <span className="status-pill warning">{result.mobilityFindings.length} lưu ý</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {result.mobilityFindings.map((finding, fIdx) => (
              <div
                key={fIdx}
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderLeft: '4px solid #f59e0b',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 4,
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ fontWeight: 600, color: '#b45309', marginBottom: '0.2rem' }}>
                  {finding.type === 'ZIG_ZAG_ROUTE'
                    ? '🔄 Lộ trình di chuyển vòng (Zig-Zag)'
                    : finding.type === 'DOMINO_TRANSITION_RISK'
                    ? '⚡ Rủi ro trễ dây chuyền (Domino Transition)'
                    : '⏱ Thời gian di chuyển chiếm tỉ lệ lớn'}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{finding.explanation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(result.unscheduled && result.unscheduled.length > 0 ? result.unscheduled : unscheduled).length > 0 && (
        <div className="attention-list">
          <div className="panel-heading">
            <h4>Tác vụ cần lưu ý thêm</h4>
            <span className="status-pill warning">{(result.unscheduled ?? unscheduled).length}</span>
          </div>
          {(result.unscheduled ?? []).length > 0
            ? result.unscheduled!.map((item) => (
                <div className="schedule-change warning" key={item.taskId}>
                  <span className="change-icon">[!]</span>
                  <div>
                    <strong>{item.taskTitle}</strong>
                    <span>Còn thiếu {formatMinutes(item.requiredMinutes)} · {item.message}</span>
                  </div>
                  <span className="change-label">[Một phần]</span>
                </div>
              ))
            : unscheduled.map((task) => (
                <div className="schedule-change warning" key={task.id}>
                  <span className="change-icon">[!]</span>
                  <div>
                    <strong>{task.title}</strong>
                    <span>
                      Cần thêm {formatMinutes(task.remainingDurationMinutes)}
                      {task.deadline ? ` · Hạn ${formatDeadline(task.deadline)}` : ''}
                    </span>
                  </div>
                  <span className="change-label">[Chưa xếp]</span>
                </div>
              ))}
        </div>
      )}

      <details>
        <summary>Chi tiết kỹ thuật Plan fingerprint</summary>
        <pre>{JSON.stringify({ planId: result.planId, from: result.from, to: result.to, fingerprint: result.fingerprint }, null, 2)}</pre>
      </details>
    </div>
  );
}

function ConstraintRow({
  label,
  detail,
  enabled,
  onClick,
}: {
  label: string;
  detail: string;
  enabled: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="constraint-row" onClick={onClick}>
      <span className={enabled ? 'constraint-check enabled' : 'constraint-check'}>
        {enabled ? '[✓]' : '[ ]'}
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="constraint-strength">[Quan trọng]</span>
    </button>
  );
}
