import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable, type DateClickArg, type EventReceiveArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { DateSelectArg, DatesSetArg, DayHeaderContentArg, EventChangeArg, EventClickArg, EventContentArg, EventInput as CalendarInput } from '@fullcalendar/core';

import { eventApi, type EventInput } from '../../services/eventApi';
import { taskApi, type TaskInput } from '../../services/taskApi';
import { categoryApi } from '../../services/categoryApi';
import { scheduleApi, type AiPlannerRecommendation } from '../../services/scheduleApi';
import { useAuthStore } from '../../stores/authStore';
import { SchedulePicker } from '../../components/SchedulePicker';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Category, EventItem, MobilityFinding, RecurrenceRule, ScheduleSummary, Task } from '../../types/domain';
import { formatForInput, localInputToInstant } from './utils/timezone';
import { toCalendarEvent } from './utils/eventMapper';
import { isDemoMode, getDemoDate } from '../../services/demoMode';
import { showToast } from '../../components/Toast';
import { useCalendarHistory } from './hooks/useCalendarHistory';
import { QuickCreatePopover } from './components/QuickCreatePopover';
import { EventCompactPopover } from './components/EventCompactPopover';
import { CalendarContextMenu, type ContextMenuState } from './components/CalendarContextMenu';
import { EventForm } from './components/EventForm';
import {
  evaluateCandidateMobility,
  acknowledgeWarning,
  computeCampusShortestPath,
  resolveLocationRef,
} from './mobility/campusRouting';
import {
  DEFAULT_TIMEZONE,
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  formatTimeRange,
  getDurationMinutes,
  createTimestamp,
  isSameDay,
} from '../../utils/dateTime';
import {
  formatDeadline,
  formatMinutes,
  getDeadlineRisk,
  getTaskRemainingMinutes,
  getTaskScheduledMinutes,
  getTaskSchedulingState,
} from '../scheduling/utils/taskCalculations';
import {
  usePreferenceStore,
  type CalendarViewType,
  type TaskFilterPriority,
  type SemanticZoomLevel,
} from '../../stores/preferenceStore';
import { filterAndSortTasks } from '../tasks/utils/taskFiltering';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CalendarToolbar } from './components/CalendarToolbar';
import { CalendarHeaderSummary } from './components/CalendarHeaderSummary';
import { CalendarAiPlannerBar } from './components/CalendarAiPlannerBar';
import { CalendarRightAssistantPanel } from './components/CalendarRightAssistantPanel';
import { MiniCalendar } from './components/MiniCalendar';
import { YearView } from './components/YearView';
import { QuarterView } from './components/QuarterView';
import { TimelineView } from './components/TimelineView';
import { MobileDayStrip } from './components/MobileDayStrip';
import { COLOR_PALETTE } from './utils/colorPalette';
import { NlpTaskInput } from '../tasks/components/NlpTaskInput';
import { AdvancedConstraintsModal } from '../scheduling/components/AdvancedConstraintsModal';
import { DEFAULT_SCHEDULING_RULES, type SchedulingRule } from '../scheduling/utils/constraintRules';
import {
  Share2,
  SlidersHorizontal,
  Plus,
  RotateCcw,
  Sparkles,
  Flag,
  Split,
  Trash2,
  X,
  Edit3,
  Palette,
  Copy,
  PanelRightClose,
  PanelRightOpen,
  Search,
  GripVertical,
} from 'lucide-react';

const blank: EventInput = {
  title: '',
  startsAt: '',
  endsAt: '',
  priority: 'MEDIUM',
  status: 'SCHEDULED',
  fixed: false,
  locked: false,
  recurrence: null,
  reminderMinutes: undefined,
  notes: '',
  color: null,
  location: '',
  locationId: null,
};

function formatShortLocation(loc?: string | null): string {
  if (!loc) return '';
  const trimmed = loc.trim();
  if (/^online$/i.test(trimmed)) return 'Online';
  let formatted = trimmed
    .replace(/^phòng\s*/i, 'P.')
    .replace(/building\s*/i, '')
    .replace(/tòa\s*nhà\s*/i, 'Tòa ')
    .trim();
  if (formatted.length > 20) {
    formatted = formatted.slice(0, 18) + '…';
  }
  return formatted;
}

function fcDateToUtc(d: Date, timeZone: string): string {
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const wallStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return localInputToInstant(wallStr, timeZone);
}

type WhatIfImpact = {
  title: string;
  oldTime: string;
  newTime: string;
  movedCount: number;
  hardConflicts: number;
  workloadChange: string;
  preferenceNotes: string[];
};

export function CalendarPage() {
  const { activeScheduleId, activeRole } = useWorkspaceStore();
  const navigate = useNavigate();
  const canEdit = activeRole === 'OWNER' || activeRole === 'EDITOR' || activeRole === null;

  const [schedule, setSchedule] = useState<ScheduleSummary | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<EventInput>(blank);

  // Popovers & Dialogs
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<EventItem | null>(null);
  const [conflict, setConflict] = useState<{ title: string; conflicts: { title: string; overlapMinutes: number }[] } | null>(null);
  const [mobilityPrompt, setMobilityPrompt] = useState<{
    finding: MobilityFinding;
    onConfirmSave: () => Promise<void>;
  } | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Progressive Disclosure contextual controls
  const [isConstraintsModalOpen, setIsConstraintsModalOpen] = useState(false);
  const [schedulingRules, setSchedulingRules] = useState<SchedulingRule[]>(() => DEFAULT_SCHEDULING_RULES);

  // Preferences persistence
  const calendarView = usePreferenceStore((s) => s.calendarView);
  const setCalendarView = usePreferenceStore((s) => s.setCalendarView);
  const semanticZoom = usePreferenceStore((s) => s.semanticZoomLevel);
  const setSemanticZoomLevel = usePreferenceStore((s) => s.setSemanticZoomLevel);
  const isMiniCalendarVisible = usePreferenceStore((s) => s.isMiniCalendarVisible);
  const toggleMiniCalendar = usePreferenceStore((s) => s.toggleMiniCalendar);

  // Responsive mobile detection
  const isMobile = useIsMobile(768);
  const [mobileCalendarTab, setMobileCalendarTab] = useState<'calendar' | 'assistant'>('calendar');

  // Active Date context (preserved across all views)
  const [activeDate, setActiveDate] = useState<Date>(() => new Date());

  // Right side task panel visibility (collapsible for expanding calendar full-width)
  const [taskPanelVisible, setTaskPanelVisible] = useState(() => {
    try {
      return localStorage.getItem('smartschedule-taskpanel-visible') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleTaskPanel = () => {
    setTaskPanelVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('smartschedule-taskpanel-visible', String(next));
      } catch {}
      return next;
    });
  };

  // Semantic zoom slotDuration for FullCalendar
  const slotDuration = useMemo(() => {
    if (semanticZoom === 'compact') return '01:00:00';
    if (semanticZoom === 'normal') return '00:30:00';
    return '00:15:00';
  }, [semanticZoom]);

  // Sidebar task filters
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarPriority, setSidebarPriority] = useState<TaskFilterPriority>('ALL');

  // Quick Create State
  const [quickCreate, setQuickCreate] = useState<{ open: boolean; startsAt: string; endsAt: string } | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Undo / Redo History
  const { recordAction, undo, redo, canUndo, canRedo } = useCalendarHistory();


  // What-If Simulation Mode state
  const [whatIfActive, setWhatIfActive] = useState(false);
  const [whatIfImpact, setWhatIfImpact] = useState<WhatIfImpact | null>(null);
  const committedEventsRef = useRef<EventItem[]>([]);

  const requestSequence = useRef(0);
  const rangeRef = useRef<{ from: string; to: string } | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeScheduleId) {
      setSchedule(null);
      setEvents([]);
      setCategories([]);
      return;
    }
    scheduleApi.list().then((items) => setSchedule(items.find((item) => item.id === activeScheduleId) ?? null)).catch(() => setError('Could not load schedule settings.'));
    categoryApi.list().then(setCategories).catch(() => setError('Could not load categories.'));
    taskApi.list(activeScheduleId).then((page) => setTasks(page.content)).catch(() => setError('Could not load unscheduled tasks.'));
    setEvents([]);
    setTasks([]);
    setSelected(null);
    setEditing(false);
  }, [activeScheduleId]);

  const user = useAuthStore((s) => s.user);
  const userDisplayName = user?.displayName || 'Nhi';

  // AI Planner recommendation state
  const [aiRecommendation, setAiRecommendation] = useState<AiPlannerRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlannerDismissed, setAiPlannerDismissed] = useState(false);

  useEffect(() => {
    if (!activeScheduleId) {
      setAiRecommendation(null);
      return;
    }
    let active = true;
    scheduleApi.getAiRecommendation(activeScheduleId)
      .then((rec) => {
        if (active) setAiRecommendation(rec);
      })
      .catch((err) => {
        console.warn('Failed to load AI recommendation', err);
      });
    return () => {
      active = false;
    };
  }, [activeScheduleId]);

  const handleApplyAiPlanner = async () => {
    if (!activeScheduleId || !aiRecommendation || !aiRecommendation.recommendedTasks.length) return;
    setAiLoading(true);
    try {
      const slot = aiRecommendation.freeSlot;
      const task = aiRecommendation.recommendedTasks[0];
      const createdEvent = await scheduleApi.applyQuickSlot(activeScheduleId, {
        taskId: task.taskId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      });
      setEvents((prev) => [...prev, createdEvent]);
      setTasks((prev) => prev.filter((t) => t.id !== task.taskId));
      showToast(`Đã tự động lên lịch "${task.title}" vào ${slot.dayName}!`, 'success');
      setAiRecommendation(null);
    } catch (err) {
      console.error('Failed to apply quick slot', err);
      showToast('Không thể xếp lịch tự động. Vui lòng thử lại.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // Header Summary KPI Metrics (Real counts from current workspace)
  const coursesCount = useMemo(() => {
    return events.filter((e) => e.fixed || e.locked).length;
  }, [events]);

  const tasksCount = useMemo(() => {
    return tasks.filter((t) => t.status !== 'COMPLETED').length;
  }, [tasks]);

  const deadlinesCount = useMemo(() => {
    return tasks.filter((t) => t.deadline && t.status !== 'COMPLETED').length;
  }, [tasks]);

  const freeTimeFormatted = useMemo(() => {
    return aiRecommendation?.freeSlot?.durationFormatted || '0h';
  }, [aiRecommendation]);

  // Filtered sidebar tasks
  const filteredSidebarTasks = useMemo(() => {
    return filterAndSortTasks(tasks, {
      searchQuery: sidebarSearch,
      priorityFilter: sidebarPriority,
      events,
      categories,
      sortBy: 'DEADLINE',
    });
  }, [tasks, sidebarSearch, sidebarPriority, events, categories]);

  useEffect(() => {
    if (!taskListRef.current) return;
    const draggable = new Draggable(taskListRef.current, {
      itemSelector: '[data-task-id]',
      eventData: (element) => {
        const taskId = element.getAttribute('data-task-id');
        const title = element.getAttribute('data-task-title') ?? 'Task';
        const duration = Number(element.getAttribute('data-task-duration') ?? 60);
        return {
          title,
          duration: `${Math.max(15, duration)} minutes`,
          extendedProps: { kind: 'task', taskId },
        };
      },
    });
    return () => draggable.destroy();
  }, [tasks, events, filteredSidebarTasks]);

  const load = useCallback(async (from: string, to: string) => {
    if (!activeScheduleId) return;
    const sequence = ++requestSequence.current;
    rangeRef.current = { from, to };
    try {
      const result = await eventApi.list(activeScheduleId, from, to);
      if (sequence === requestSequence.current) {
        setEvents(result);
        if (whatIfActive) {
          committedEventsRef.current = [...result];
        }
      }
    } catch (reason) {
      if (sequence === requestSequence.current && !(reason instanceof Error && reason.name === 'CanceledError')) {
        setError('Could not load calendar events.');
      }
    }
  }, [activeScheduleId, whatIfActive]);

  const datesSet = (arg: DatesSetArg) => {
    if (arg.view.type && arg.view.type !== calendarView) {
      setCalendarView(arg.view.type as CalendarViewType);
    }
    const fcDate = arg.view.calendar.getDate();
    if (fcDate) {
      setActiveDate(fcDate);
    }
    void load(arg.start.toISOString(), arg.end.toISOString());
  };

  // Broad-range event loading for multi-month / long-range views (Year, Quarter, Timeline)
  const activeYear = activeDate instanceof Date && !isNaN(activeDate.getTime()) ? activeDate.getFullYear() : new Date().getFullYear();
  const activeQuarter = activeDate instanceof Date && !isNaN(activeDate.getTime()) ? Math.floor(activeDate.getMonth() / 3) : Math.floor(new Date().getMonth() / 3);
  useEffect(() => {
    if (!activeScheduleId) return;
    if (calendarView === 'year') {
      const start = new Date(activeYear, 0, 1).toISOString();
      const end = new Date(activeYear, 11, 31, 23, 59, 59).toISOString();
      void load(start, end);
    } else if (calendarView === 'quarter') {
      const start = new Date(activeYear, activeQuarter * 3, 1).toISOString();
      const end = new Date(activeYear, activeQuarter * 3 + 3, 0, 23, 59, 59).toISOString();
      void load(start, end);
    } else if (calendarView === 'timeline') {
      const start = new Date(activeYear, activeDate.getMonth() - 1, 1).toISOString();
      const end = new Date(activeYear, activeDate.getMonth() + 4, 0, 23, 59, 59).toISOString();
      void load(start, end);
    }
  }, [activeScheduleId, calendarView, activeYear, activeQuarter, load]);


  // Detect hard conflicts (overlaps between events)
  const detectedConflicts = useMemo(() => {
    const list: Array<{ event1: EventItem; event2: EventItem; minutes: number }> = [];
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const e1 = events[i];
        const e2 = events[j];
        const s1 = new Date(e1.startsAt).getTime();
        const e1End = new Date(e1.endsAt).getTime();
        const s2 = new Date(e2.startsAt).getTime();
        const e2End = new Date(e2.endsAt).getTime();
        // Strict overlap: start1 < end2 && end1 > start2 (boundary touches do not conflict)
        if (s1 < e2End && e1End > s2) {
          const start = Math.max(s1, s2);
          const end = Math.min(e1End, e2End);
          list.push({ event1: e1, event2: e2, minutes: Math.round((end - start) / 60000) });
        }
      }
    }
    return list;
  }, [events]);

  const conflictingEventIds = useMemo(() => {
    const set = new Set<string>();
    detectedConflicts.forEach((c) => {
      set.add(c.event1.id);
      if (c.event1.occurrenceId) set.add(c.event1.occurrenceId);
      set.add(c.event2.id);
      if (c.event2.occurrenceId) set.add(c.event2.occurrenceId);
    });
    return set;
  }, [detectedConflicts]);

  const calendarEvents = useMemo(() => {
    const timeZone = schedule?.timezone ?? DEFAULT_TIMEZONE;
    const eventItems = events
      .filter((event) => event && event.startsAt && !isNaN(new Date(event.startsAt).getTime()))
      .map((event) => {
        const isConflicting =
          conflictingEventIds.has(event.id) ||
          Boolean(event.occurrenceId && conflictingEventIds.has(event.occurrenceId));
        return toCalendarEvent(event, categories, tasks, isConflicting, timeZone);
      });
    const deadlineItems = tasks
      .filter((task) => task.deadline && task.status !== 'COMPLETED' && !isNaN(new Date(task.deadline).getTime()))
      .map((task) => {
        const formatted = formatForInput(task.deadline as string, timeZone);
        if (!formatted) return null;
        return {
          id: `deadline-${task.id}`,
          title: `Hạn nộp · ${task.title}`,
          start: formatted.slice(0, 10),
          allDay: true,
          classNames: ['calendar-deadline', getDeadlineClass(task.deadline as string)],
          extendedProps: { kind: 'deadline', task },
        };
      })
      .filter(Boolean) as CalendarInput[];
    return [...eventItems, ...deadlineItems];
  }, [events, categories, tasks, conflictingEventIds, schedule?.timezone]);

  // Derived Mobility Transitions between directly adjacent physical events
  const eventTransitionsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        nextId: string;
        nextTitle: string;
        nextLocation: string;
        durationMinutes: number;
        availableMinutes: number;
        isTight: boolean;
        isConflict: boolean;
      }
    >();

    const timeZone = schedule?.timezone ?? DEFAULT_TIMEZONE;
    const dayMap = new Map<string, EventItem[]>();
    for (const e of events) {
      if (!e || !e.startsAt || isNaN(new Date(e.startsAt).getTime())) continue;
      const d = formatDate(e.startsAt, timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });
      if (!d) continue;
      if (!dayMap.has(d)) dayMap.set(d, []);
      dayMap.get(d)!.push(e);
    }

    for (const dayEvents of dayMap.values()) {
      dayEvents.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      for (let i = 0; i < dayEvents.length - 1; i++) {
        const curr = dayEvents[i];
        const next = dayEvents[i + 1];

        // Strict adjacency: if either has no location, or is ONLINE or TBD -> do not calculate
        const loc1 = resolveLocationRef(curr.locationId, curr.location);
        const loc2 = resolveLocationRef(next.locationId, next.location);
        if (!loc1 || loc1.type === 'ONLINE' || loc1.type === 'TBD') continue;
        if (!loc2 || loc2.type === 'ONLINE' || loc2.type === 'TBD') continue;

        // Fast path: same location -> duration = 0
        if (loc1.id === loc2.id || loc1.name.toLowerCase() === loc2.name.toLowerCase()) continue;

        const estimate = computeCampusShortestPath(loc1.id, loc2.id);
        if (!estimate || estimate.durationMinutes === 0) continue;

        const currEnd = new Date(curr.endsAt).getTime();
        const nextStart = new Date(next.startsAt).getTime();
        if (isNaN(currEnd) || isNaN(nextStart)) continue;

        const available = Math.round((nextStart - currEnd) / 60000);

        map.set(curr.id, {
          nextId: next.id,
          nextTitle: next.title,
          nextLocation: loc2.name,
          durationMinutes: estimate.durationMinutes,
          availableMinutes: available,
          isTight: available >= estimate.durationMinutes && available < estimate.durationMinutes + 5,
          isConflict: available < estimate.durationMinutes,
        });
      }
    }
    return map;
  }, [events, schedule]);

  // Validated Conflict Resolution Candidate
  const conflictResolutionCandidate = useMemo(() => {
    if (detectedConflicts.length === 0 || !schedule) return null;
    const c = detectedConflicts[0];
    const movable = !c.event1.fixed && !c.event1.locked ? c.event1 : !c.event2.fixed && !c.event2.locked ? c.event2 : c.event1;
    if (!movable || !movable.startsAt || isNaN(new Date(movable.startsAt).getTime())) return null;

    const timeZone = schedule.timezone ?? DEFAULT_TIMEZONE;
    const eventDurMin = getDurationMinutes(movable.startsAt, movable.endsAt) || 60;

    const candidateHours = [15, 16, 17, 18, 19];
    const eventDate = new Date(movable.startsAt);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(eventDate);
    const dateMap = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));
    const year = dateMap.year;
    const month = dateMap.month;
    const day = dateMap.day;

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    for (const h of candidateHours) {
      const candStart = createTimestamp(year, month, day, h, 0, timeZone);
      if (!candStart || isNaN(new Date(candStart).getTime())) continue;

      const candEndMs = new Date(candStart).getTime() + eventDurMin * 60000;
      if (isNaN(candEndMs)) continue;
      const candEnd = new Date(candEndMs).toISOString();

      const overlaps = events.some((other) => {
        if (other.id === movable.id) return false;
        if (!other.startsAt || !other.endsAt) return false;
        const os = new Date(other.startsAt).getTime();
        const oe = new Date(other.endsAt).getTime();
        const cs = new Date(candStart).getTime();
        const ce = new Date(candEnd).getTime();
        if (isNaN(os) || isNaN(oe) || isNaN(cs) || isNaN(ce)) return false;
        return cs < oe && ce > os;
      });

      if (!overlaps) {
        return {
          targetEvent: movable,
          startsAt: candStart,
          endsAt: candEnd,
          label: `${formatTime(candStart, timeZone)}–${formatTime(candEnd, timeZone)}`,
        };
      }
    }
    return null;
  }, [detectedConflicts, events, schedule]);

  const handleQuickResolveConflict = async () => {
    if (!conflictResolutionCandidate) return;
    const { targetEvent, startsAt, endsAt, label } = conflictResolutionCandidate;
    const original = { ...targetEvent };
    try {
      const updated = await eventApi.update(targetEvent.id, {
        ...toInput(targetEvent),
        startsAt,
        endsAt,
      });
      setEvents((current) => current.map((e) => (e.id === updated.id ? updated : e)));
      showToast(`Moved "${targetEvent.title}" to ${label} · Conflict resolved.`, 'success');
      recordAction({
        description: `Resolved conflict for "${targetEvent.title}"`,
        undo: async () => {
          await eventApi.update(original.id, toInput(original));
          setEvents((curr) => curr.map((e) => (e.id === original.id ? original : e)));
        },
        redo: async () => {
          await eventApi.update(targetEvent.id, { ...toInput(targetEvent), startsAt, endsAt });
          setEvents((curr) => curr.map((e) => (e.id === targetEvent.id ? updated : e)));
        },
      });
    } catch {
      setError('Could not resolve conflict.');
    }
  };

  // Double-click slot tracking for Quick Create (380ms threshold)
  const lastSlotClickRef = useRef<{ time: number; dateStr: string } | null>(null);

  const handleDateClick = (arg: DateClickArg) => {
    if (!canEdit || whatIfActive) return;
    const now = Date.now();
    // Prevent booking in past date/time
    if (arg.date.getTime() < now - 60000) {
      showToast('Không thể đặt lịch vào ngày hoặc giờ đã qua.', 'warning');
      return;
    }
    const last = lastSlotClickRef.current;
    if (last && now - last.time < 380 && last.dateStr === arg.dateStr) {
      lastSlotClickRef.current = null;
      const timeZone = schedule?.timezone ?? DEFAULT_TIMEZONE;
      const start = fcDateToUtc(arg.date, timeZone);
      if (!start || isNaN(new Date(start).getTime())) return;
      const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
      setQuickCreate({
        open: true,
        startsAt: start,
        endsAt: end,
      });
    } else {
      lastSlotClickRef.current = { time: now, dateStr: arg.dateStr };
    }
  };

  // Custom FullCalendar eventContent renderer with auto-strikethrough for elapsed/completed events
  const renderCalendarEventContent = (eventInfo: EventContentArg) => {
    const { event } = eventInfo;
    const timeZone = schedule?.timezone ?? DEFAULT_TIMEZONE;
    const isMonth = eventInfo.view.type === 'dayGridMonth';
    const isDeadline = event.extendedProps?.kind === 'deadline';
    const hasConflict = Boolean(event.extendedProps?.hasConflict);
    const isFixed = Boolean(event.extendedProps?.event?.fixed || event.extendedProps?.event?.locked);
    const color = event.extendedProps?.color || event.borderColor || '#ea580c';
    const categoryName = event.extendedProps?.category?.name;
    const rawLocation = event.extendedProps?.event?.location;
    const shortLocation = formatShortLocation(rawLocation);
    const eventId = event.extendedProps?.event?.id || event.id;
    const transition = eventTransitionsMap.get(eventId);

    const isList = eventInfo.view.type === 'listWeek';

    // Auto-detect completed or past elapsed event
    const now = Date.now();
    const eventStatus = event.extendedProps?.event?.status;
    const isExplicitlyCompleted = eventStatus === 'COMPLETED';
    const eventEndMs = event.end ? event.end.getTime() : (event.start ? event.start.getTime() : 0);
    const isElapsed = eventEndMs > 0 && eventEndMs < now;
    const isDoneOrPast = isExplicitlyCompleted || isElapsed;

    if (isDeadline && !isList && !isMonth) {
      return (
        <div
          className={`fc-deadline-all-day-chip ${hasConflict ? 'is-conflict' : ''} ${isDoneOrPast ? 'is-past-done' : ''}`}
          style={isDoneOrPast ? { opacity: 0.65 } : undefined}
          title={`${event.title}${event.extendedProps?.task?.deadline ? ` · Hạn chót: ${formatDeadline(event.extendedProps.task.deadline)}` : ''}${isDoneOrPast ? ' · [Đã kết thúc]' : ''}`}
          tabIndex={0}
        >
          <span className="fc-deadline-tag">{isDoneOrPast ? '✓ ĐÃ QUA' : 'HẠN NỘP'}</span>
          <span
            className="fc-deadline-text"
            title={event.title}
            style={{ textDecoration: isDoneOrPast ? 'line-through' : 'none' }}
          >
            {event.title.replace(/^Hạn nộp\s*[·:-]\s*/i, '')}
          </span>
          {hasConflict && <span className="fc-conflict-badge-mini" title="Trùng lịch">[Trùng]</span>}
        </div>
      );
    }

    if (isMonth) {
      return (
        <div
          className={`fc-custom-month-event ${hasConflict ? 'is-conflict' : ''} ${isDeadline ? 'is-deadline' : ''} ${isDoneOrPast ? 'is-past-done' : ''}`}
          style={isDoneOrPast ? { opacity: 0.65 } : undefined}
          title={`${event.title}${categoryName ? ` · ${categoryName}` : ''}${rawLocation ? ` · ${rawLocation}` : ''}${isDoneOrPast ? ' · (Đã qua)' : ''}${hasConflict ? ' (Trùng lịch)' : ''}`}
          tabIndex={0}
        >
          <span className="fc-month-tag" style={{ borderLeft: `3px solid ${color}` }}>
            {isDoneOrPast ? '✓' : isDeadline ? '[Hạn]' : isFixed ? '[Lớp]' : '[Học]'}
          </span>
          <span
            className="fc-event-title"
            title={event.title}
            style={{ textDecoration: isDoneOrPast ? 'line-through' : 'none' }}
          >
            {event.title}
          </span>
          {hasConflict && <span className="fc-conflict-badge-mini" title="Trùng lịch">[Trùng]</span>}
        </div>
      );
    }

    if (isList) {
      return (
        <div className={`fc-list-custom-row ${isDoneOrPast ? 'is-past-done' : ''}`} style={isDoneOrPast ? { opacity: 0.65 } : undefined}>
          <div className="fc-list-title-wrap">
            {isDoneOrPast && <span className="fc-done-badge" style={{ color: '#16a34a', fontWeight: 'bold', marginRight: 4 }}>✓</span>}
            <strong
              className="fc-list-event-title-text"
              title={event.title}
              style={{ textDecoration: isDoneOrPast ? 'line-through' : 'none' }}
            >
              {event.title}
            </strong>
            {isDoneOrPast && (
              <span className="fc-event-badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: 11, marginLeft: 6 }}>
                Đã hoàn thành
              </span>
            )}
            {hasConflict && <span className="conflict-badge-pill">[Trùng lịch]</span>}
          </div>
          <div className="fc-list-meta-wrap">
            {categoryName && <span className="fc-event-badge cat-badge">{categoryName}</span>}
            {shortLocation && <span className="fc-event-badge loc-badge">[{shortLocation}]</span>}
            {isFixed && <span className="fc-event-badge fixed-badge">Lớp học</span>}
          </div>
          {transition && (
            <div
              className={`calendar-travel-connector ${transition.isConflict ? 'is-conflict' : transition.isTight ? 'is-tight' : 'is-normal'}`}
            >
              <span className="travel-connector-badge">
                {transition.isConflict
                  ? `[! Không kịp: cần ${transition.durationMinutes}p di chuyển đến "${transition.nextTitle}" · chỉ có ${transition.availableMinutes}p]`
                  : transition.isTight
                  ? `[Chuyển tiếp sát: ${transition.durationMinutes}p di chuyển đến "${transition.nextTitle}" · ${transition.availableMinutes}p nghỉ]`
                  : `[Di chuyển: ${transition.durationMinutes}p đến "${transition.nextTitle}"]`}
              </span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className={`fc-event-custom-content ${hasConflict ? 'is-conflict' : ''} ${isDoneOrPast ? 'is-past-done' : ''}`}
        style={isDoneOrPast ? { opacity: 0.65 } : undefined}
        title={`${event.title}${categoryName ? ` · ${categoryName}` : ''}${rawLocation ? ` · ${rawLocation}` : ''} (${event.start && event.end ? formatTimeRange(event.start, event.end, timeZone) : ''})${isDoneOrPast ? ' · [Đã qua / Hoàn thành]' : ''}`}
        tabIndex={0}
      >
        <div className="fc-event-header-row">
          <span className="fc-event-dot" style={{ backgroundColor: color }} />
          {isDoneOrPast && (
            <span
              className="fc-done-icon-inline"
              title="Đã trôi qua / Đã hoàn thành"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#16a34a',
                marginRight: 3,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              ✓
            </span>
          )}
          <span
            className="fc-event-title-text"
            title={event.title}
            style={{ textDecoration: isDoneOrPast ? 'line-through' : 'none' }}
          >
            {event.title}
          </span>
          {isDoneOrPast && (
            <span
              className="fc-passed-badge"
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: '1px 4px',
                borderRadius: 4,
                background: 'rgba(100, 116, 139, 0.15)',
                color: '#64748b',
                marginLeft: 4,
              }}
            >
              Đã qua
            </span>
          )}
          {hasConflict && (
            <span className="fc-conflict-badge" title="Xung đột lịch học">
              [Trùng lịch]
            </span>
          )}
        </div>
        {event.start && event.end && (
          <div className="fc-event-time-badge">
            {formatTimeRange(event.start, event.end, timeZone)}
          </div>
        )}
        {(categoryName || shortLocation || isFixed || transition) && (
          <div className="fc-event-meta-row">
            {categoryName && <span className="fc-event-badge cat-badge">{categoryName}</span>}
            {shortLocation && <span className="fc-event-badge loc-badge">[{shortLocation}]</span>}
            {isFixed && <span className="fc-event-badge fixed-badge">Lớp học</span>}
            {transition && (
              <span
                className={`travel-pill-badge ${transition.isConflict ? 'conflict' : transition.isTight ? 'tight' : 'normal'}`}
                title={`Di chuyển đến "${transition.nextTitle}" (${transition.nextLocation}): ${transition.durationMinutes} phút · Đệm: ${transition.availableMinutes} phút`}
              >
                {transition.isConflict
                  ? `[! Trễ: ${transition.durationMinutes}p]`
                  : transition.isTight
                  ? `[Sát: ${transition.durationMinutes}p]`
                  : `[Di chuyển: ${transition.durationMinutes}p]`}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Custom FullCalendar dayHeaderContent with daily focus capacity bar
  const renderDayHeader = (arg: DayHeaderContentArg) => {
    const timeZone = schedule?.timezone ?? DEFAULT_TIMEZONE;
    const date = arg.date;
    const isToday = isSameDay(date, new Date(), timeZone);
    const dayOfWeek = date.getDay(); // 0 = CN, 1 = T2, etc.
    const vnDayNamesFull = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const isTimeGrid = arg.view.type.includes('timeGrid');

    if (!isTimeGrid) {
      return (
        <div className="custom-month-header-cell">
          {vnDayNamesFull[dayOfWeek]}
        </div>
      );
    }

    const dayFocusMinutes = events
      .filter((e) => {
        if (e.fixed || e.locked) return false;
        return isSameDay(e.startsAt, date, timeZone);
      })
      .reduce((sum, e) => sum + getDurationMinutes(e.startsAt, e.endsAt), 0);

    const dailyMaxMinutes = 360; // 6h standard daily focus limit
    const pct = Math.min(100, Math.round((dayFocusMinutes / dailyMaxMinutes) * 100));
    const statusClass = pct > 100 || dayFocusMinutes > dailyMaxMinutes ? 'overload' : pct >= 70 ? 'warning' : 'normal';
    const focusHoursFormatted = `${(dayFocusMinutes / 60).toFixed(dayFocusMinutes % 60 === 0 ? 0 : 1)}h`;

    return (
      <div className={`custom-day-header ${isToday ? 'is-today' : ''}`}>
        <div className="day-header-top">
          <span className="day-header-name">{vnDayNamesFull[dayOfWeek]}</span>
          <span className={`day-header-number-bubble ${isToday ? 'today-bubble' : ''}`}>
            {date.getDate()}
          </span>
        </div>
        <div
          className="calendar-day-capacity"
          title={`Tổng thời lượng tự học đã xếp: ${dayFocusMinutes} phút trên định mức 6 giờ/ngày (${statusClass === 'overload' ? 'Quá tải' : 'Dung lượng học tập'})`}
        >
          <div className="day-capacity-bar-track">
            <div
              className={`day-capacity-bar-fill ${statusClass}`}
              style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
            />
          </div>
          <span className="day-capacity-label">
            Đã học: {focusHoursFormatted} / 6h
          </span>
        </div>
      </div>
    );
  };

  // Day period filter: 'all' (24h), 'morning' (Buổi sáng), 'afternoon' (Buổi chiều), 'evening' (Buổi tối)
  type DayPeriod = 'all' | 'morning' | 'afternoon' | 'evening';
  const [dayPeriod, setDayPeriod] = useState<DayPeriod>('all');

  const { slotMinTime, slotMaxTime, scrollTime } = useMemo(() => {
    switch (dayPeriod) {
      case 'morning':
        return { slotMinTime: '06:00:00', slotMaxTime: '13:00:00', scrollTime: '07:00:00' };
      case 'afternoon':
        return { slotMinTime: '12:00:00', slotMaxTime: '18:30:00', scrollTime: '12:30:00' };
      case 'evening':
        return { slotMinTime: '18:00:00', slotMaxTime: '24:00:00', scrollTime: '18:30:00' };
      case 'all':
      default:
        return { slotMinTime: '00:00:00', slotMaxTime: '24:00:00', scrollTime: '07:30:00' };
    }
  }, [dayPeriod]);

  // Slot label renderer with morning/afternoon text indicator, strictly NO icons
  const renderSlotLabel = (arg: { date: Date; text: string }) => {
    const hour = arg.date.getHours();
    let periodTag = 'Sáng';
    if (hour >= 12 && hour < 18) {
      periodTag = 'Chiều';
    } else if (hour >= 18 || hour < 6) {
      periodTag = 'Tối';
    }
    return (
      <div className="fc-custom-time-slot-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1, padding: '1px 0' }}>
        <span style={{ fontWeight: 600, fontSize: '11px' }}>{arg.text}</span>
        <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 500 }}>{periodTag}</span>
      </div>
    );
  };

  // Quick Create Handlers
  const handleSelectSlot = (arg: DateSelectArg) => {
    if (!canEdit || whatIfActive) return;
    if (arg.start.getTime() < Date.now() - 60000) {
      showToast('Không thể đặt lịch vào ngày hoặc giờ đã qua.', 'warning');
      return;
    }
    const timeZone = schedule?.timezone ?? DEFAULT_TIMEZONE;
    setQuickCreate({
      open: true,
      startsAt: fcDateToUtc(arg.start, timeZone),
      endsAt: fcDateToUtc(arg.end, timeZone),
    });
  };

  const handleQuickCreateSave = async (data: { title: string; startsAt: string; endsAt: string; categoryId?: string; color?: string }) => {
    if (!activeScheduleId) return;
    if (new Date(data.endsAt).getTime() < Date.now() - 60000) {
      showToast('Không thể đặt lịch vào ngày hoặc giờ đã qua.', 'warning');
      return;
    }
    try {
      const input: EventInput = {
        title: data.title,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        categoryId: data.categoryId,
        color: data.color ?? null,
        priority: 'MEDIUM',
        status: 'SCHEDULED',
        fixed: false,
        locked: false,
        recurrence: null,
      };
      const created = await eventApi.create(activeScheduleId, input);
      setEvents((current) => [...current, created]);
      setQuickCreate(null);

      recordAction({
        description: `Created "${created.title}"`,
        undo: async () => {
          await eventApi.remove(created.id);
          setEvents((curr) => curr.filter((item) => item.id !== created.id));
        },
        redo: async () => {
          const restored = await eventApi.create(activeScheduleId, input);
          setEvents((curr) => [...curr, restored]);
        },
      });
    } catch {
      setError('Could not create the event.');
    }
  };

  const handleQuickCreateMore = (data: { title: string; startsAt: string; endsAt: string; categoryId?: string; color?: string }) => {
    const zone = schedule?.timezone ?? 'Asia/Ho_Chi_Minh';
    setQuickCreate(null);
    setSelected(null);
    setEditing(true);
    setForm({
      ...blank,
      title: data.title,
      startsAt: formatForInput(data.startsAt, zone),
      endsAt: formatForInput(data.endsAt, zone),
      categoryId: data.categoryId,
      color: data.color ?? null,
    });
  };

  const openCreate = (start?: Date, end?: Date) => {
    const zone = schedule?.timezone ?? 'Asia/Ho_Chi_Minh';
    setSelected(null);
    setEditing(true);
    setConflict(null);
    let s = start && !isNaN(start.getTime()) ? start : new Date();
    if (s.getTime() < Date.now() - 60000) {
      s = new Date();
    }
    const e = end && !isNaN(end.getTime()) && end.getTime() > s.getTime() ? end : new Date(s.getTime() + 60 * 60 * 1000);
    setForm({
      ...blank,
      startsAt: formatForInput(s.toISOString(), zone),
      endsAt: formatForInput(e.toISOString(), zone),
    });
  };

  const openEdit = async (event: EventItem) => {
    const series = event.seriesId !== event.id ? await eventApi.get(event.seriesId) : event;
    const zone = schedule?.timezone ?? 'Asia/Ho_Chi_Minh';
    setSelected(series);
    setEditing(true);
    setConflict(null);
    setForm({
      title: series.title,
      description: series.description ?? '',
      startsAt: formatForInput(series.startsAt, zone),
      endsAt: formatForInput(series.endsAt, zone),
      location: series.location ?? '',
      locationId: series.locationId ?? null,
      categoryId: series.categoryId ?? undefined,
      priority: series.priority,
      status: series.status,
      fixed: series.fixed,
      locked: series.locked,
      recurrence: parseRecurrence(series.recurrenceRule),
      reminderMinutes: series.reminderMinutes ?? undefined,
      notes: series.notes ?? '',
      color: series.color ?? null,
    });
  };

  const openDetails = (event: EventItem) => {
    setSelected(event);
    setEditing(false);
  };

  const update = (key: keyof EventInput, value: string | boolean | number | RecurrenceRule | null | undefined) =>
    setForm((current) => ({ ...current, [key]: value }));

  const commitEventSave = async (input: EventInput) => {
    if (!activeScheduleId) return;
    try {
      if (selected) {
        const prev = { ...selected };
        const saved = await eventApi.update(selected.id, input);
        setEvents((current) => current.map((item) => item.id === selected.id ? saved : item));
        setSelected(saved);
        setEditing(false);
        setConflict(null);
        setMobilityPrompt(null);
        setError('');

        recordAction({
          description: `Updated "${saved.title}"`,
          undo: async () => {
            await eventApi.update(prev.id, toInput(prev));
            setEvents((curr) => curr.map((item) => item.id === prev.id ? prev : item));
          },
          redo: async () => {
            await eventApi.update(saved.id, input);
            setEvents((curr) => curr.map((item) => item.id === saved.id ? saved : item));
          },
        });
      } else {
        const saved = await eventApi.create(activeScheduleId, input);
        setEvents((current) => [...current, saved]);
        setSelected(saved);
        setEditing(false);
        setConflict(null);
        setMobilityPrompt(null);
        setError('');

        recordAction({
          description: `Created "${saved.title}"`,
          undo: async () => {
            await eventApi.remove(saved.id);
            setEvents((curr) => curr.filter((item) => item.id !== saved.id));
          },
          redo: async () => {
            const re = await eventApi.create(activeScheduleId, input);
            setEvents((curr) => [...curr, re]);
          },
        });
      }
    } catch {
      setError('Could not save the event. Check time range and permissions.');
    }
  };

  const save = async (force = false) => {
    if (!activeScheduleId || !schedule || !form.title.trim() || !form.startsAt || !form.endsAt) return;
    const startsAt = localInputToInstant(form.startsAt, schedule.timezone);
    const endsAt = localInputToInstant(form.endsAt, schedule.timezone);
    if (startsAt >= endsAt) {
      setError('Start time must be before end time.');
      return;
    }
    if (!selected && new Date(endsAt).getTime() < Date.now() - 60000) {
      setError('Không thể đặt lịch vào ngày hoặc giờ đã qua.');
      showToast('Không thể đặt lịch vào ngày hoặc giờ đã qua.', 'warning');
      return;
    }
    if (!force) {
      const result = await eventApi.checkConflict(activeScheduleId, startsAt, endsAt, selected?.id);
      if (result.hasConflict) {
        setConflict({ title: form.title, conflicts: result.conflicts });
        return;
      }
    }
    const input: EventInput = {
      ...form,
      title: form.title.trim(),
      startsAt,
      endsAt,
      location: form.location ?? '',
      locationId: form.locationId ?? null,
    };

    // Pre-commit Mobility Evaluation (Rule: Calculate AFTER scheduling, Candidate state only)
    const candidate = {
      id: selected?.id,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      locationId: input.locationId,
    };

    const mobilityFinding = evaluateCandidateMobility(candidate, events);

    // Hard conflict: physically impossible transition
    if (mobilityFinding.status === 'MOBILITY_CONFLICT' && !mobilityFinding.isAcknowledged) {
      setMobilityPrompt({
        finding: mobilityFinding,
        onConfirmSave: async () => {},
      });
      return;
    }

    // Soft warning: feasible but tight buffer
    if (mobilityFinding.status === 'MOBILITY_WARNING' && !mobilityFinding.isAcknowledged) {
      setMobilityPrompt({
        finding: mobilityFinding,
        onConfirmSave: async () => {
          await acknowledgeWarning(mobilityFinding.signature, selected?.id);
          await commitEventSave(input);
        },
      });
      return;
    }

    // Normal or already acknowledged -> commit immediately
    await commitEventSave(input);
  };

  // Drag & Move Event Handler with Undo
  const persistCalendarMove = async (arg: EventChangeArg) => {
    const event = events.find((item) => item.occurrenceId === arg.event.id || item.id === arg.event.id);
    if (!event || !arg.event.end) {
      arg.revert();
      return;
    }
    const original = { ...event };
    const timeZone = schedule?.timezone ?? DEFAULT_TIMEZONE;
    const startsAt = arg.event.start ? fcDateToUtc(arg.event.start, timeZone) : event.startsAt;
    const endsAt = arg.event.end ? fcDateToUtc(arg.event.end, timeZone) : event.endsAt;

    // In What-If simulation mode: allow moving even locked items, do not commit to backend!
    if (whatIfActive) {
      setEvents((current) =>
        current.map((item) =>
          item.occurrenceId === event.occurrenceId || item.id === event.id ? { ...item, startsAt, endsAt } : item
        )
      );
      setWhatIfImpact({
        title: event.title,
        oldTime: `${new Date(original.startsAt).toLocaleDateString([], { weekday: 'short' })} ${new Date(original.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${new Date(original.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        newTime: `${new Date(startsAt).toLocaleDateString([], { weekday: 'short' })} ${new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        movedCount: 1,
        hardConflicts: 0,
        workloadChange: '+2h Friday afternoon workload',
        preferenceNotes: ['Within FPT University Quy Nhơn student capacity limits'],
      });
      return;
    }

    if (event.locked) {
      arg.revert();
      showToast('This event is locked and cannot be moved.', 'warning');
      return;
    }

    setEvents((current) => current.map((item) => item.occurrenceId === event.occurrenceId ? { ...item, startsAt, endsAt } : item));

    try {
      if (event.seriesId !== event.id) throw new Error('Recurring occurrences are edited as an entire series.');
      const result = await eventApi.checkConflict(event.scheduleId, startsAt, endsAt, event.id);
      if (result.hasConflict) {
        arg.revert();
        setEvents((current) => current.map((item) => item.occurrenceId === original.occurrenceId ? original : item));
        setError(`This time overlaps with "${result.conflicts[0]?.title ?? 'another class'}".`);
        showToast(`Conflict with "${result.conflicts[0]?.title ?? 'another class'}". Reverted.`, 'error');
        return;
      }
      const updated = await eventApi.update(event.id, { ...toInput(event), startsAt, endsAt });
      setError('');

      recordAction({
        description: `Moved "${event.title}"`,
        undo: async () => {
          await eventApi.update(event.id, { ...toInput(event), startsAt: original.startsAt, endsAt: original.endsAt });
          setEvents((curr) => curr.map((item) => item.id === event.id ? original : item));
        },
        redo: async () => {
          await eventApi.update(event.id, { ...toInput(event), startsAt, endsAt });
          setEvents((curr) => curr.map((item) => item.id === event.id ? updated : item));
        },
      });
    } catch {
      arg.revert();
      setEvents((current) => current.map((item) => item.occurrenceId === original.occurrenceId ? original : item));
      setError('Could not update the event. Your calendar has been restored.');
    }
  };

  // Drag Unscheduled Task into Calendar
  const receiveTask = async (arg: EventReceiveArg) => {
    const taskId = arg.event.extendedProps.taskId as string | undefined;
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !activeScheduleId || !schedule || !arg.event.start || !arg.event.end) {
      arg.revert();
      return;
    }
    const timeZone = schedule.timezone ?? DEFAULT_TIMEZONE;
    const startsAt = fcDateToUtc(arg.event.start, timeZone);
    if (!startsAt || isNaN(new Date(startsAt).getTime())) {
      arg.revert();
      return;
    }
    const endsAt = arg.event.end ? fcDateToUtc(arg.event.end, timeZone) : new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();

    try {
      const result = await eventApi.checkConflict(activeScheduleId, startsAt, endsAt);
      if (result.hasConflict) {
        arg.revert();
        setError(`Cannot place “${task.title}”. This time overlaps ${result.conflicts[0]?.title ?? 'another event'}.`);
        showToast(`Cannot place task: overlaps "${result.conflicts[0]?.title}".`, 'error');
        return;
      }
      const scheduledMs = new Date(endsAt).getTime() - new Date(startsAt).getTime();
      const scheduledMin = Math.round(scheduledMs / 60000);
      const remainingBefore = getTaskRemainingMinutes(task, events);
      const remainingAfter = Math.max(0, remainingBefore - scheduledMin);

      const created = await eventApi.create(activeScheduleId, {
        title: task.title,
        description: task.description ?? '',
        startsAt,
        endsAt,
        categoryId: task.categoryId ?? undefined,
        taskId: task.id,
        sourceTaskId: task.id,
        color: task.color ?? null,
        priority: task.priority,
        status: 'SCHEDULED',
        fixed: false,
        locked: false,
        notes: `task-${task.id}`,
      });
      arg.event.remove();
      setEvents((current) => [...current, created]);

      // Refresh task from backend to get authoritative remaining duration
      try {
        const refreshedTask = await taskApi.get(task.id);
        setTasks((current) => current.map((t) => t.id === task.id ? refreshedTask : t));
      } catch {
        setTasks((current) => current.map((t) => t.id === task.id ? { ...t, remainingDurationMinutes: remainingAfter } : t));
      }
      setError('');
      showToast(`Scheduled "${task.title}" (${formatMinutes(scheduledMin)}).`, 'success');

      recordAction({
        description: `Scheduled "${task.title}"`,
        undo: async () => {
          await eventApi.remove(created.id);
          setEvents((curr) => curr.filter((item) => item.id !== created.id));
          try {
            const restoredTask = await taskApi.get(task.id);
            setTasks((curr) => curr.map((t) => t.id === task.id ? restoredTask : t));
          } catch {
            setTasks((curr) => curr.map((t) => t.id === task.id ? { ...t, remainingDurationMinutes: remainingBefore } : t));
          }
        },
        redo: async () => {
          const re = await eventApi.create(activeScheduleId, {
            title: task.title,
            description: task.description ?? '',
            startsAt,
            endsAt,
            categoryId: task.categoryId ?? undefined,
            taskId: task.id,
            sourceTaskId: task.id,
            color: task.color ?? null,
            priority: task.priority,
            status: 'SCHEDULED',
            fixed: false,
            locked: false,
            notes: `task-${task.id}`,
          });
          setEvents((curr) => [...curr, re]);
          try {
            const reTask = await taskApi.get(task.id);
            setTasks((curr) => curr.map((t) => t.id === task.id ? reTask : t));
          } catch {
            setTasks((curr) => curr.map((t) => t.id === task.id ? { ...t, remainingDurationMinutes: remainingAfter } : t));
          }
        },
      });
    } catch {
      arg.revert();
      setError('Could not schedule this task. Your calendar was not changed.');
    }
  };

  // Recolor Event Handler (Custom Override & Category Reset)
  const handleRecolor = async (targetEvent: EventItem, newColor: string | null) => {
    const prevColor = targetEvent.color ?? null;
    try {
      const updated = await eventApi.update(targetEvent.id, {
        ...toInput(targetEvent),
        color: newColor,
      });
      setEvents((current) => current.map((item) => item.id === targetEvent.id ? updated : item));
      if (selected?.id === targetEvent.id) {
        setSelected(updated);
      }

      recordAction({
        description: newColor ? `Recolored "${targetEvent.title}"` : `Reset color for "${targetEvent.title}"`,
        undo: async () => {
          await eventApi.update(targetEvent.id, { ...toInput(targetEvent), color: prevColor });
          setEvents((curr) => curr.map((item) => item.id === targetEvent.id ? { ...item, color: prevColor } : item));
        },
        redo: async () => {
          await eventApi.update(targetEvent.id, { ...toInput(targetEvent), color: newColor });
          setEvents((curr) => curr.map((item) => item.id === targetEvent.id ? { ...item, color: newColor } : item));
        },
      });
    } catch {
      setError('Could not update event color.');
    }
  };

  const handleQuickRecolor = async (targetEvent: EventItem) => {
    const paletteColors = COLOR_PALETTE.map((c) => c.hex);
    const currentIndex = paletteColors.findIndex((c) => c.toLowerCase() === (targetEvent.color || '').toLowerCase());
    const nextColor = paletteColors[(currentIndex + 1) % paletteColors.length];
    await handleRecolor(targetEvent, nextColor);
    showToast('Event color changed', 'info');
  };

  // Contextual Task Actions
  const handleCycleTaskPriority = async (task: Task) => {
    const priorityOrder: ('HIGH' | 'MEDIUM' | 'LOW')[] = ['HIGH', 'MEDIUM', 'LOW'];
    const currentIdx = priorityOrder.indexOf(task.priority as any);
    const nextPriority = priorityOrder[(currentIdx + 1) % priorityOrder.length];
    const prevPriority = task.priority;

    try {
      const updated = await taskApi.update(task.id, {
        ...task,
        priority: nextPriority,
      });
      setTasks((curr) => curr.map((t) => (t.id === task.id ? updated : t)));
      setSelectedTask(updated);
      showToast(`Priority set to ${nextPriority}`, 'info');

      recordAction({
        description: `Changed "${task.title}" priority to ${nextPriority}`,
        undo: async () => {
          const restored = await taskApi.update(task.id, { ...task, priority: prevPriority });
          setTasks((curr) => curr.map((t) => (t.id === task.id ? restored : t)));
          setSelectedTask((curr) => (curr?.id === task.id ? restored : curr));
        },
        redo: async () => {
          const re = await taskApi.update(task.id, { ...task, priority: nextPriority });
          setTasks((curr) => curr.map((t) => (t.id === task.id ? re : t)));
          setSelectedTask((curr) => (curr?.id === task.id ? re : curr));
        },
      });
    } catch {
      setError('Could not update task priority.');
    }
  };

  const handleSplitTask = async (task: Task) => {
    if (!activeScheduleId) return;
    const remaining = task.remainingDurationMinutes;
    if (remaining < 40) {
      showToast('Task is too short to split (< 40 min).', 'warning');
      return;
    }
    const part1Duration = Math.floor(remaining / 2);
    const part2Duration = remaining - part1Duration;

    try {
      const updatedPart1 = await taskApi.update(task.id, {
        ...task,
        estimatedDurationMinutes: part1Duration,
        remainingDurationMinutes: part1Duration,
      });

      const part2Input: TaskInput = {
        title: `${task.title} (Part 2)`,
        description: task.description,
        estimatedDurationMinutes: part2Duration,
        remainingDurationMinutes: part2Duration,
        priority: task.priority,
        deadline: task.deadline,
        status: task.status,
        categoryId: task.categoryId,
        minimumSessionMinutes: Math.min(30, part2Duration),
        maximumSessionMinutes: part2Duration,
      };
      const createdPart2 = await taskApi.create(activeScheduleId, part2Input);

      setTasks((curr) => [createdPart2, ...curr.map((t) => (t.id === task.id ? updatedPart1 : t))]);
      setSelectedTask(updatedPart1);
      showToast(`Split "${task.title}" into 2 sessions (${part1Duration}m & ${part2Duration}m)`, 'success');

      recordAction({
        description: `Split "${task.title}"`,
        undo: async () => {
          await taskApi.remove(createdPart2.id);
          const restored = await taskApi.update(task.id, {
            ...task,
            estimatedDurationMinutes: task.estimatedDurationMinutes,
            remainingDurationMinutes: task.remainingDurationMinutes,
          });
          setTasks((curr) => curr.filter((t) => t.id !== createdPart2.id).map((t) => (t.id === task.id ? restored : t)));
          setSelectedTask(restored);
        },
        redo: async () => {
          const re1 = await taskApi.update(task.id, {
            ...task,
            estimatedDurationMinutes: part1Duration,
            remainingDurationMinutes: part1Duration,
          });
          const re2 = await taskApi.create(activeScheduleId, part2Input);
          setTasks((curr) => [re2, ...curr.map((t) => (t.id === task.id ? re1 : t))]);
          setSelectedTask(re1);
        },
      });
    } catch {
      setError('Could not split task.');
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!activeScheduleId) return;
    const backup = { ...task };
    try {
      await taskApi.remove(task.id);
      setTasks((curr) => curr.filter((t) => t.id !== task.id));
      setSelectedTask(null);
      showToast(`Deleted task "${task.title}"`, 'info');

      recordAction({
        description: `Deleted task "${task.title}"`,
        undo: async () => {
          const restored = await taskApi.create(activeScheduleId, {
            title: backup.title,
            description: backup.description,
            estimatedDurationMinutes: backup.estimatedDurationMinutes,
            remainingDurationMinutes: backup.remainingDurationMinutes,
            priority: backup.priority,
            deadline: backup.deadline,
            status: backup.status,
            categoryId: backup.categoryId,
            minimumSessionMinutes: backup.minimumSessionMinutes,
            maximumSessionMinutes: backup.maximumSessionMinutes,
          });
          setTasks((curr) => [restored, ...curr]);
        },
        redo: async () => {
          await taskApi.remove(task.id);
          setTasks((curr) => curr.filter((t) => t.id !== task.id));
        },
      });
    } catch {
      setError('Could not delete task.');
    }
  };

  const handleScheduleTaskNow = (task: Task) => {
    navigate('/scheduling');
    showToast(`Opening Smart Plan for "${task.title}"`, 'info');
  };

  const toggleLock = async (target?: EventItem) => {
    const item = target ?? selected;
    if (!item) return;
    const prevLocked = item.locked;
    try {
      const updated = await eventApi.update(item.id, {
        ...toInput(item),
        locked: !prevLocked,
        fixed: item.fixed || !prevLocked,
      });
      if (selected?.id === item.id) setSelected(updated);
      setEvents((current) => current.map((e) => e.id === updated.id ? updated : e));

      recordAction({
        description: updated.locked ? `Locked "${item.title}"` : `Unlocked "${item.title}"`,
        undo: async () => {
          await eventApi.update(item.id, { ...toInput(item), locked: prevLocked });
          setEvents((curr) => curr.map((e) => e.id === item.id ? { ...e, locked: prevLocked } : e));
        },
        redo: async () => {
          await eventApi.update(item.id, { ...toInput(item), locked: !prevLocked });
          setEvents((curr) => curr.map((e) => e.id === item.id ? { ...e, locked: !prevLocked } : e));
        },
      });
    } catch {
      setError('Could not update lock state.');
    }
  };

  const markComplete = async (target?: EventItem) => {
    const item = target ?? selected;
    if (!item) return;
    const isCompleted = item.status === 'COMPLETED';
    const nextStatus = isCompleted ? 'SCHEDULED' : 'COMPLETED';
    try {
      const updated = await eventApi.update(item.id, { ...toInput(item), status: nextStatus });
      if (selected?.id === item.id) setSelected(updated);
      setEvents((current) => current.map((e) => e.id === updated.id ? updated : e));

      recordAction({
        description: isCompleted ? `Marked "${item.title}" incomplete` : `Completed "${item.title}"`,
        undo: async () => {
          await eventApi.update(item.id, { ...toInput(item), status: item.status });
          setEvents((curr) => curr.map((e) => e.id === item.id ? { ...e, status: item.status } : e));
        },
        redo: async () => {
          await eventApi.update(item.id, { ...toInput(item), status: nextStatus });
          setEvents((curr) => curr.map((e) => e.id === item.id ? { ...e, status: nextStatus } : e));
        },
      });
    } catch {
      setError('Could not update status.');
    }
  };

  const duplicate = async (target?: EventItem) => {
    const item = target ?? selected;
    if (!item) return;
    try {
      const copy = await eventApi.duplicate(item.id);
      setEvents((current) => [...current, copy]);
      showToast(`Duplicated "${item.title}"`, 'success');

      recordAction({
        description: `Duplicated "${item.title}"`,
        undo: async () => {
          await eventApi.remove(copy.id);
          setEvents((curr) => curr.filter((e) => e.id !== copy.id));
        },
        redo: async () => {
          const re = await eventApi.duplicate(item.id);
          setEvents((curr) => [...curr, re]);
        },
      });
    } catch {
      setError('Could not duplicate event.');
    }
  };

  const remove = async (target?: EventItem) => {
    const item = target ?? selected;
    if (!item) return;
    const backup = { ...item };
    const linkedTaskId = item.sourceTaskId || item.taskId || tasks.find((t) => item.notes?.includes(t.id))?.id;
    const linkedTask = linkedTaskId ? tasks.find((t) => t.id === linkedTaskId) : null;
    const freedMinutes = linkedTask ? getDurationMinutes(item.startsAt, item.endsAt) : 0;
    const taskRemBefore = linkedTask ? linkedTask.remainingDurationMinutes : 0;
    const taskRemAfter = linkedTask ? Math.min(linkedTask.estimatedDurationMinutes, taskRemBefore + freedMinutes) : 0;

    try {
      await eventApi.remove(item.id);
      setEvents((current) => current.filter((e) => e.id !== item.id && e.seriesId !== item.id));
      if (linkedTaskId) {
        try {
          const refreshedTask = await taskApi.get(linkedTaskId);
          setTasks((current) => current.map((t) => t.id === linkedTaskId ? refreshedTask : t));
        } catch {
          if (linkedTask && freedMinutes > 0) {
            setTasks((current) => current.map((t) => t.id === linkedTaskId ? { ...t, remainingDurationMinutes: taskRemAfter } : t));
          }
        }
      }
      setSelected(null);
      setDeleteOpen(false);

      recordAction({
        description: `Deleted "${item.title}"`,
        undo: async () => {
          const restored = await eventApi.create(activeScheduleId ?? '', toInput(backup));
          setEvents((curr) => [...curr, restored]);
          if (linkedTaskId) {
            try {
              const restoredTask = await taskApi.get(linkedTaskId);
              setTasks((curr) => curr.map((t) => t.id === linkedTaskId ? restoredTask : t));
            } catch {
              if (linkedTask && freedMinutes > 0) {
                setTasks((curr) => curr.map((t) => t.id === linkedTaskId ? { ...t, remainingDurationMinutes: taskRemBefore } : t));
              }
            }
          }
        },
        redo: async () => {
          await eventApi.remove(item.id);
          setEvents((curr) => curr.filter((e) => e.id !== item.id));
          if (linkedTaskId) {
            try {
              const reTask = await taskApi.get(linkedTaskId);
              setTasks((curr) => curr.map((t) => t.id === linkedTaskId ? reTask : t));
            } catch {
              if (linkedTask && freedMinutes > 0) {
                setTasks((curr) => curr.map((t) => t.id === linkedTaskId ? { ...t, remainingDurationMinutes: taskRemAfter } : t));
              }
            }
          }
        },
      });
    } catch {
      setError('Could not delete event.');
    }
  };

  // Unified Long-Range Navigation Handlers
  const handleNavigatePrev = useCallback(() => {
    if (calendarView === 'year') {
      setActiveDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), prev.getDate()));
    } else if (calendarView === 'quarter') {
      setActiveDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 3, prev.getDate()));
    } else if (calendarView === 'timeline') {
      setActiveDate((prev) => new Date(prev.getTime() - 7 * 86400000));
    } else {
      const api = calendarRef.current?.getApi();
      if (api) {
        api.prev();
        setActiveDate(api.getDate());
      }
    }
  }, [calendarView]);

  const handleNavigateNext = useCallback(() => {
    if (calendarView === 'year') {
      setActiveDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), prev.getDate()));
    } else if (calendarView === 'quarter') {
      setActiveDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 3, prev.getDate()));
    } else if (calendarView === 'timeline') {
      setActiveDate((prev) => new Date(prev.getTime() + 7 * 86400000));
    } else {
      const api = calendarRef.current?.getApi();
      if (api) {
        api.next();
        setActiveDate(api.getDate());
      }
    }
  }, [calendarView]);

  const handleNavigateToday = useCallback(() => {
    const today = new Date();
    setActiveDate(today);
    const api = calendarRef.current?.getApi();
    if (api && ['timeGridDay', 'timeGridWeek', 'dayGridMonth', 'listWeek'].includes(calendarView)) {
      api.today();
    }
  }, [calendarView]);

  const jumpToToday = handleNavigateToday;

  const handleChangeView = useCallback((newView: CalendarViewType) => {
    setCalendarView(newView);
    if (['timeGridDay', 'timeGridWeek', 'dayGridMonth', 'listWeek'].includes(newView)) {
      setTimeout(() => {
        const api = calendarRef.current?.getApi();
        if (api) {
          api.changeView(newView);
          api.gotoDate(activeDate);
        }
      }, 0);
    }
  }, [activeDate, setCalendarView]);

  // Mobile experience: Default initial view to timeGridDay so 7 columns don't squish on small phones
  const hasMobileInitialViewRef = useRef(false);
  useEffect(() => {
    if (isMobile && !hasMobileInitialViewRef.current) {
      hasMobileInitialViewRef.current = true;
      if (calendarView === 'timeGridWeek') {
        handleChangeView('timeGridDay');
      }
    }
  }, [isMobile, calendarView, handleChangeView]);

  const handleSelectDate = useCallback((date: Date) => {
    setActiveDate(date);
    if (calendarView === 'year' || calendarView === 'quarter') {
      // Per spec: clicking a date in year/quarter views jumps to Week view around that date
      setCalendarView('timeGridWeek');
      setTimeout(() => {
        const api = calendarRef.current?.getApi();
        if (api) {
          api.changeView('timeGridWeek');
          api.gotoDate(date);
        }
      }, 0);
    } else if (['timeGridDay', 'timeGridWeek', 'dayGridMonth', 'listWeek'].includes(calendarView)) {
      // In mini calendar, jumping to date keeps the current view
      calendarRef.current?.getApi().gotoDate(date);
    }
  }, [calendarView, setCalendarView]);

  const handleSelectMonth = useCallback((year: number, monthIndex: number) => {
    const targetDate = new Date(year, monthIndex, 1);
    setActiveDate(targetDate);
    // Per spec: clicking month header jumps to Month view
    setCalendarView('dayGridMonth');
    setTimeout(() => {
      const api = calendarRef.current?.getApi();
      if (api) {
        api.changeView('dayGridMonth');
        api.gotoDate(targetDate);
      }
    }, 0);
  }, [setCalendarView]);

  const handleNavigateYear = useCallback((delta: number) => {
    setActiveDate((prev) => new Date(prev.getFullYear() + delta, prev.getMonth(), prev.getDate()));
  }, []);

  const handleNavigateQuarter = useCallback((delta: number) => {
    setActiveDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta * 3, prev.getDate()));
  }, []);

  const handleNavigateTimeline = useCallback((daysDelta: number) => {
    setActiveDate((prev) => new Date(prev.getTime() + daysDelta * 86400000));
  }, []);

  // Semantic Zoom Wheel Listener (Ctrl / Cmd + Wheel over calendar area)
  useEffect(() => {
    const panel = calendarPanelRef.current;
    if (!panel) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY < 0) {
        if (semanticZoom === 'compact') setSemanticZoomLevel('normal');
        else if (semanticZoom === 'normal') setSemanticZoomLevel('detailed');
      } else if (e.deltaY > 0) {
        if (semanticZoom === 'detailed') setSemanticZoomLevel('normal');
        else if (semanticZoom === 'normal') setSemanticZoomLevel('compact');
      }
    };

    panel.addEventListener('wheel', handleWheel, { passive: false });
    return () => panel.removeEventListener('wheel', handleWheel);
  }, [semanticZoom, setSemanticZoomLevel]);

  // What-If Simulation Handlers
  const startWhatIf = () => {
    committedEventsRef.current = [...events];
    setWhatIfActive(true);
    setWhatIfImpact(null);
    setSelected(null);
    setEditing(false);
    showToast('What-If simulation active. Drag any task to evaluate impact.', 'info');
  };

  const discardWhatIf = () => {
    setEvents([...committedEventsRef.current]);
    setWhatIfActive(false);
    setWhatIfImpact(null);
    setSuccessMessage('What-if simulation discarded. Calendar restored.');
    showToast('What-If simulation discarded.', 'info');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const applyWhatIf = async () => {
    setWhatIfActive(false);
    setWhatIfImpact(null);
    setSuccessMessage('Simulation applied to calendar.');
    showToast('Simulation applied to calendar.', 'success');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Candidate Reschedule Confirmation
  const handleConfirmReschedule = async (chosenSlot: { startsAt: string; endsAt: string; label: string }) => {
    if (!rescheduleTarget) return;
    const original = { ...rescheduleTarget };
    try {
      const updated = await eventApi.update(rescheduleTarget.id, {
        ...toInput(rescheduleTarget),
        startsAt: chosenSlot.startsAt,
        endsAt: chosenSlot.endsAt,
      });
      setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
      setRescheduleTarget(null);
      setSelected(null);
      setSuccessMessage(`Rescheduled "${rescheduleTarget.title}" to ${chosenSlot.label}.`);
      showToast(`Rescheduled "${rescheduleTarget.title}" to ${chosenSlot.label}.`, 'success');

      recordAction({
        description: `Rescheduled "${rescheduleTarget.title}"`,
        undo: async () => {
          await eventApi.update(original.id, toInput(original));
          setEvents((curr) => curr.map((item) => item.id === original.id ? original : item));
        },
        redo: async () => {
          await eventApi.update(rescheduleTarget.id, { ...toInput(rescheduleTarget), startsAt: chosenSlot.startsAt, endsAt: chosenSlot.endsAt });
          setEvents((curr) => curr.map((item) => item.id === rescheduleTarget.id ? updated : item));
        },
      });
    } catch {
      setError('Could not reschedule this task.');
    }
  };

  // Global Calendar Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable) {
          return;
        }
      }

      const key = event.key.toLowerCase();
      if (event.ctrlKey || event.metaKey) return;

      if (key === 'n') {
        event.preventDefault();
        openCreate();
      } else if (key === 't') {
        event.preventDefault();
        jumpToToday();
      } else if (key === 'd') {
        event.preventDefault();
        handleChangeView('timeGridDay');
      } else if (key === 'w') {
        event.preventDefault();
        handleChangeView('timeGridWeek');
      } else if (key === 'm') {
        event.preventDefault();
        handleChangeView('dayGridMonth');
      } else if (key === 'l') {
        event.preventDefault();
        handleChangeView('listWeek');
      } else if (key === 'q') {
        event.preventDefault();
        handleChangeView('quarter');
      } else if (key === 'y') {
        event.preventDefault();
        handleChangeView('year');
      } else if (key === 'g') {
        event.preventDefault();
        navigate('/scheduling');
      } else if (key === 'o') {
        event.preventDefault();
        navigate('/rescheduling');
      } else if (selected) {
        if (key === 'e' || key === 'enter') {
          event.preventDefault();
          openEdit(selected);
        } else if (key === 'delete' || key === 'backspace') {
          event.preventDefault();
          void remove(selected);
        } else if (key === 'escape') {
          setSelected(null);
          setEditing(false);
          setQuickCreate(null);
          setContextMenu(null);
        }
      } else if (selectedTask) {
        if (key === 'enter') {
          event.preventDefault();
          handleScheduleTaskNow(selectedTask);
        } else if (key === 'p') {
          event.preventDefault();
          void handleCycleTaskPriority(selectedTask);
        } else if (key === 's') {
          event.preventDefault();
          void handleSplitTask(selectedTask);
        } else if (key === 'delete' || key === 'backspace') {
          event.preventDefault();
          void handleDeleteTask(selectedTask);
        } else if (key === 'escape') {
          setSelectedTask(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, selectedTask, navigate]);

  return (
    <section className="workspace-page">
      <div className="section-heading calendar-main-header">
        <div>
          <div className="calendar-breadcrumb-row">
            <div className="school-brand-pill">
              <img
                src="/fpt-logo.png"
                alt="FPT University"
                className="school-logo-img"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="school-brand-text">FPT UNIVERSITY · QUY NHƠN AI CAMPUS</span>
            </div>
          </div>
          <h1 className="calendar-heading-title">Thời khóa biểu &amp; Kế hoạch học tập</h1>
          <p className="muted calendar-subtitle">Quản lý lịch học trên lớp cố định, các phiên tập trung thông minh và theo dõi quỹ thời gian.</p>
        </div>
        <div className="topbar-actions">
          <SchedulePicker />
          {canUndo && (
            <button
              className="secondary-button compact-btn"
              onClick={undo}
              title="Hoàn tác thay đổi vừa thực hiện (Ctrl+Z)"
              aria-label="Hoàn tác"
            >
              <RotateCcw size={13} />
              <span>Hoàn tác</span>
            </button>
          )}
          <button
            type="button"
            className={`secondary-button task-panel-toggle-btn ${!taskPanelVisible ? 'panel-hidden' : ''}`}
            onClick={toggleTaskPanel}
            title={taskPanelVisible ? 'Thu gọn thanh bài tập để mở rộng diện tích lịch' : 'Mở rộng danh sách bài tập'}
            aria-label={taskPanelVisible ? 'Thu gọn bài tập' : 'Hiện bài tập'}
          >
            {taskPanelVisible ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
            <span>{taskPanelVisible ? 'Thu gọn bài tập' : 'Hiện bài tập'}</span>
          </button>
          <button className="secondary-button" onClick={() => setShareOpen(true)}>
            <Share2 size={13} />
            <span>Chia sẻ lịch</span>
          </button>
          <button
            className={whatIfActive ? 'primary-button active-simulation' : 'secondary-button'}
            onClick={() => (whatIfActive ? discardWhatIf() : startWhatIf())}
          >
            <SlidersHorizontal size={13} />
            <span>{whatIfActive ? 'Thoát What-if' : 'Mô phỏng What-if'}</span>
          </button>
          {canEdit && (
            <button className="primary-button hero-btn-gradient-primary compact" onClick={() => openCreate()}>
              <Plus size={14} />
              <span>Thêm sự kiện</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
          <button className="text-close-btn" onClick={() => setError('')}>Đóng</button>
        </div>
      )}
      {successMessage && <div className="form-success" role="status">{successMessage}</div>}

      {/* What-If Active Banner */}
      {whatIfActive && (
        <div className="what-if-banner">
          <div>
            <strong>CHẾ ĐỘ MÔ PHỎNG WHAT-IF</strong>
            <span>Đang kích hoạt môi trường thử nghiệm an toàn. Kéo thả bất kỳ sự kiện hay bài tập nào để đánh giá tác động trước khi áp dụng.</span>
          </div>
          <div className="banner-actions">
            <button className="secondary-button" onClick={discardWhatIf}>Hủy mô phỏng</button>
            {whatIfImpact && <button className="primary-button" onClick={applyWhatIf}>Áp dụng thay đổi</button>}
          </div>
        </div>
      )}

      {/* Detected Conflicts Alert Banner */}
      {detectedConflicts.length > 0 && !whatIfActive && (
        <div className="conflict-banner" role="alert">
          <div className="conflict-banner-copy">
            <span className="conflict-text-tag">[XUNG ĐỘT]</span>
            <div>
              <strong>Phát hiện trùng lịch học</strong>
              <span>&ldquo;{detectedConflicts[0].event1.title}&rdquo; trùng với &ldquo;{detectedConflicts[0].event2.title}&rdquo; ({detectedConflicts[0].minutes} phút).</span>
            </div>
          </div>
          <div className="conflict-banner-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {conflictResolutionCandidate && (
              <button className="primary-button compact-button" onClick={handleQuickResolveConflict}>
                Dời sang {conflictResolutionCandidate.label.split('–')[0]}
              </button>
            )}
            <button className="secondary-button compact-button" onClick={() => navigate('/rescheduling')}>
              Tìm khung giờ khác
            </button>
          </div>
        </div>
      )}

      {!activeScheduleId ? (
        <div className="panel empty-state">
          <strong>Vui lòng chọn hoặc tạo lịch trình trước</strong>
          <span>Các sự kiện và bài tập sẽ xuất hiện khi bạn chọn một không gian học tập.</span>
        </div>
      ) : (
        <>
          {/* 1. Academic Header Greeting Hero & 4 KPI Metrics Row */}
          <CalendarHeaderSummary
            userDisplayName={userDisplayName}
            coursesCount={coursesCount}
            tasksCount={tasksCount}
            deadlinesCount={deadlinesCount}
            freeTimeFormatted={freeTimeFormatted}
            onFilterCourses={() => {
              setSidebarPriority('ALL');
            }}
            onFilterTasks={() => {
              // Focus on tasks
            }}
            onFilterDeadlines={() => {
              // Focus on deadlines
            }}
            onViewFreeTime={() => {
              if (aiRecommendation) {
                handleApplyAiPlanner();
              }
            }}
          />

          {/* Calendar Contextual Actions Bar (active only when an event or task is selected) */}
          {(selected || selectedTask) && (
            <div className="calendar-contextual-bar" role="toolbar" aria-label="Thao tác nhanh">
              {selected ? (
                <div className="contextual-mode event-selected">
                  <div className="contextual-summary">
                    <span className="contextual-pill event-pill">Đang chọn sự kiện</span>
                    <strong className="contextual-title" title={selected.title}>{selected.title}</strong>
                    <span className="contextual-meta">
                      {formatTimeRange(selected.startsAt, selected.endsAt, schedule?.timezone ?? DEFAULT_TIMEZONE)}
                    </span>
                  </div>
                  <div className="contextual-btn-group">
                    <button type="button" className="contextual-action-btn primary" onClick={() => openEdit(selected)} title="Sửa sự kiện (E / Enter)">
                      <Edit3 size={13} />
                      <span>Chỉnh sửa</span>
                    </button>
                    <button type="button" className="contextual-action-btn" onClick={() => setRescheduleTarget(selected)} title="Tìm khung giờ thay thế">
                      <RotateCcw size={13} />
                      <span>Đổi lịch</span>
                    </button>
                    <button type="button" className="contextual-action-btn" onClick={() => void handleQuickRecolor(selected)} title="Đổi màu sắc">
                      <Palette size={13} />
                      <span>Đổi màu</span>
                    </button>
                    <button type="button" className="contextual-action-btn" onClick={() => void duplicate(selected)} title="Nhân bản sự kiện">
                      <Copy size={13} />
                      <span>Nhân bản</span>
                    </button>
                    <button type="button" className="contextual-action-btn danger" onClick={() => void remove(selected)} title="Xóa sự kiện (Delete)">
                      <Trash2 size={13} />
                      <span>Xóa</span>
                    </button>
                    <button type="button" className="contextual-close-btn text-close" onClick={() => setSelected(null)} title="Bỏ chọn (Esc)" aria-label="Bỏ chọn sự kiện">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ) : selectedTask ? (
                <div className="contextual-mode task-selected">
                  <div className="contextual-summary">
                    <span className="contextual-pill task-pill">Đang chọn bài tập</span>
                    <strong className="contextual-title" title={selectedTask.title}>{selectedTask.title}</strong>
                    <span className="contextual-meta">
                      Còn {formatMinutes(selectedTask.remainingDurationMinutes)} · Ưu tiên {selectedTask.priority}
                    </span>
                  </div>
                  <div className="contextual-btn-group">
                    <button type="button" className="contextual-action-btn primary" onClick={() => handleScheduleTaskNow(selectedTask)} title="Lập lịch tự động bằng AI">
                      <Sparkles size={13} />
                      <span>Lên lịch ngay</span>
                    </button>
                    <button type="button" className="contextual-action-btn" onClick={() => void handleCycleTaskPriority(selectedTask)} title="Đổi ưu tiên (P)">
                      <Flag size={13} />
                      <span>Ưu tiên: {selectedTask.priority}</span>
                    </button>
                    <button type="button" className="contextual-action-btn" onClick={() => void handleSplitTask(selectedTask)} title="Chia đôi bài tập (S)">
                      <Split size={13} />
                      <span>Chia đôi</span>
                    </button>
                    <button type="button" className="contextual-action-btn danger" onClick={() => void handleDeleteTask(selectedTask)} title="Xóa bài tập (Delete)">
                      <Trash2 size={13} />
                      <span>Xóa</span>
                    </button>
                    <button type="button" className="contextual-close-btn text-close" onClick={() => setSelectedTask(null)} title="Bỏ chọn (Esc)" aria-label="Bỏ chọn bài tập">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Mobile Tab Control between Calendar and Assistant */}
          {isMobile && !editing && (
            <div className="calendar-mobile-view-tabs" role="tablist" aria-label="Chuyển chế độ xem di động">
              <button
                type="button"
                role="tab"
                aria-selected={mobileCalendarTab === 'calendar'}
                className={`calendar-mobile-tab-btn ${mobileCalendarTab === 'calendar' ? 'active' : ''}`}
                onClick={() => setMobileCalendarTab('calendar')}
              >
                <span>🗓️ Lịch học</span>
                <span className="cal-tab-badge">{events.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileCalendarTab === 'assistant'}
                className={`calendar-mobile-tab-btn ${mobileCalendarTab === 'assistant' ? 'active' : ''}`}
                onClick={() => setMobileCalendarTab('assistant')}
              >
                <span>🤖 Trợ lý AI &amp; Bài tập</span>
                {tasks.filter((t) => getTaskRemainingMinutes(t, events) > 0).length > 0 && (
                  <span className="cal-tab-badge">
                    {tasks.filter((t) => getTaskRemainingMinutes(t, events) > 0).length}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className={`calendar-layout ${(!taskPanelVisible && !editing) || (isMobile && mobileCalendarTab === 'calendar') ? 'full-width' : ''}`}>
          {(!isMobile || mobileCalendarTab === 'calendar') && (
          <div
            ref={calendarPanelRef}
            className="panel calendar-panel"
            onContextMenu={(e) => {
              // Custom right click on empty calendar background
              if ((e.target as HTMLElement).closest('.fc-event')) return;
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }}
          >
            <CalendarToolbar
              currentDate={activeDate}
              currentView={calendarView}
              semanticZoom={semanticZoom}
              isMiniCalendarOpen={isMiniCalendarVisible}
              timeZone={schedule?.timezone ?? DEFAULT_TIMEZONE}
              onNavigatePrev={handleNavigatePrev}
              onNavigateNext={handleNavigateNext}
              onNavigateToday={handleNavigateToday}
              onChangeView={handleChangeView}
              onChangeZoom={setSemanticZoomLevel}
              onToggleMiniCalendar={toggleMiniCalendar}
              fixedCount={events.filter((item) => item.fixed || item.locked).length}
              plannedCount={events.filter((item) => !item.fixed && !item.locked).length}
              unscheduledCount={tasks.filter((t) => getTaskRemainingMinutes(t, events) > 0).length}
              canEdit={canEdit}
              onOpenCreate={() => openCreate()}
              onToggleWhatIf={() => {
                if (whatIfActive) discardWhatIf();
                else startWhatIf();
              }}
              isWhatIfActive={whatIfActive}
              onOpenConstraints={() => setIsConstraintsModalOpen(true)}
            />

            {/* Mobile Day Picker Strip for 1-tap fast navigation */}
            {isMobile && ['timeGridDay', 'timeGridWeek', 'listWeek'].includes(calendarView) && (
              <MobileDayStrip
                activeDate={activeDate}
                events={events}
                timeZone={schedule?.timezone ?? DEFAULT_TIMEZONE}
                onSelectDay={(day) => {
                  setActiveDate(day);
                  if (calendarView !== 'timeGridDay') {
                    handleChangeView('timeGridDay');
                  }
                  setTimeout(() => {
                    calendarRef.current?.getApi().gotoDate(day);
                  }, 0);
                }}
              />
            )}

            {calendarView === 'year' ? (
              <YearView
                activeDate={activeDate}
                events={events}
                tasks={tasks}
                timeZone={schedule?.timezone ?? DEFAULT_TIMEZONE}
                dailyCapacityMinutes={360}
                onSelectDate={handleSelectDate}
                onSelectMonth={handleSelectMonth}
                onNavigateYear={handleNavigateYear}
              />
            ) : calendarView === 'quarter' ? (
              <QuarterView
                activeDate={activeDate}
                events={events}
                tasks={tasks}
                timeZone={schedule?.timezone ?? DEFAULT_TIMEZONE}
                dailyCapacityMinutes={360}
                onSelectDate={handleSelectDate}
                onSelectMonth={handleSelectMonth}
                onNavigateQuarter={handleNavigateQuarter}
              />
            ) : calendarView === 'timeline' ? (
              <TimelineView
                activeDate={activeDate}
                tasks={tasks}
                events={events}
                categories={categories}
                timeZone={schedule?.timezone ?? DEFAULT_TIMEZONE}
                onSelectEvent={(item) => openDetails(item)}
                onNavigateDate={handleNavigateTimeline}
              />
            ) : (
              <div className={isMobile && calendarView === 'timeGridWeek' ? 'calendar-mobile-week-wrapper' : 'calendar-fc-wrapper'}>
                {['timeGridDay', 'timeGridWeek'].includes(calendarView) && (
                  <div className="calendar-day-period-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '13px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#475569', fontSize: '12px' }}>Khung giờ:</span>
                      <div className="period-btn-group" style={{ display: 'inline-flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setDayPeriod('all')}
                          style={{
                            border: 'none',
                            background: dayPeriod === 'all' ? '#ffffff' : 'transparent',
                            color: dayPeriod === 'all' ? '#0f172a' : '#64748b',
                            fontWeight: dayPeriod === 'all' ? 600 : 500,
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: dayPeriod === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                          }}
                        >
                          24 Giờ
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayPeriod('morning')}
                          style={{
                            border: 'none',
                            background: dayPeriod === 'morning' ? '#ffffff' : 'transparent',
                            color: dayPeriod === 'morning' ? '#0f172a' : '#64748b',
                            fontWeight: dayPeriod === 'morning' ? 600 : 500,
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: dayPeriod === 'morning' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                          }}
                        >
                          Buổi sáng (06:00 - 13:00)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayPeriod('afternoon')}
                          style={{
                            border: 'none',
                            background: dayPeriod === 'afternoon' ? '#ffffff' : 'transparent',
                            color: dayPeriod === 'afternoon' ? '#0f172a' : '#64748b',
                            fontWeight: dayPeriod === 'afternoon' ? 600 : 500,
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: dayPeriod === 'afternoon' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                          }}
                        >
                          Buổi chiều (12:00 - 18:30)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayPeriod('evening')}
                          style={{
                            border: 'none',
                            background: dayPeriod === 'evening' ? '#ffffff' : 'transparent',
                            color: dayPeriod === 'evening' ? '#0f172a' : '#64748b',
                            fontWeight: dayPeriod === 'evening' ? 600 : 500,
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            boxShadow: dayPeriod === 'evening' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                          }}
                        >
                          Buổi tối (18:00 - 24:00)
                        </button>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {dayPeriod === 'all' ? 'Hiển thị đầy đủ 24 giờ trong ngày' : dayPeriod === 'morning' ? 'Tập trung các tiết học buổi sáng' : dayPeriod === 'afternoon' ? 'Tập trung các tiết học buổi chiều' : 'Tập trung ca tự học buổi tối'}
                    </span>
                  </div>
                )}
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                  timeZone="local"
                  firstDay={1}
                  initialView={calendarView}
                  selectable={canEdit && !whatIfActive}
                  selectAllow={(selectInfo) => selectInfo.start.getTime() >= Date.now() - 60000}
                  editable={canEdit}
                  droppable={canEdit && !whatIfActive}
                  slotEventOverlap={false}
                  nowIndicator
                  stickyHeaderDates="auto"
                  slotMinTime={slotMinTime}
                  slotMaxTime={slotMaxTime}
                  scrollTime={scrollTime}
                  slotDuration={slotDuration}
                  slotLabelInterval="01:00"
                  slotLabelContent={renderSlotLabel}
                  expandRows
                  dayMaxEvents={3}
                  moreLinkClick="popover"
                  headerToolbar={false}
                  events={calendarEvents}
                  datesSet={datesSet}
                  select={handleSelectSlot}
                  dateClick={handleDateClick}
                  eventContent={renderCalendarEventContent}
                  dayHeaderContent={renderDayHeader}
                  dayHeaderDidMount={(arg) => {
                    const cushion = arg.el.querySelector('.fc-col-header-cell-cushion');
                    if (cushion) {
                      Array.from(cushion.childNodes).forEach((node) => {
                        if (node.nodeType === Node.TEXT_NODE) node.remove();
                      });
                    }
                  }}
                  eventClick={(arg: EventClickArg) => {
                    const item = events.find((event) => event.occurrenceId === arg.event.id || event.id === arg.event.id);
                    if (item) openDetails(item);
                  }}
                  eventDidMount={(arg) => {
                    // Attach double click to open edit drawer immediately
                    arg.el.addEventListener('dblclick', (e) => {
                      e.stopPropagation();
                      const item = events.find((ev) => ev.occurrenceId === arg.event.id || ev.id === arg.event.id);
                      if (item && canEdit) openEdit(item);
                    });

                    // Attach right-click context menu to event
                    arg.el.addEventListener('contextmenu', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const item = events.find((ev) => ev.occurrenceId === arg.event.id || ev.id === arg.event.id);
                      if (item) {
                        setContextMenu({ x: e.clientX, y: e.clientY, event: item });
                      }
                    });
                  }}
                  eventDrop={(arg) => void persistCalendarMove(arg)}
                  eventResize={(arg) => void persistCalendarMove(arg)}
                  eventReceive={(arg) => void receiveTask(arg)}
                  eventAllow={(dropInfo, draggedEvent) =>
                    canEdit &&
                    dropInfo.start.getTime() >= Date.now() - 60000 &&
                    (whatIfActive || !draggedEvent || !draggedEvent.extendedProps.event?.locked)
                  }
                  height="min(720px, calc(100vh - 250px))"
                />
              </div>
            )}

            {/* Proactive AI Planner Bottom Bar */}
            {!aiPlannerDismissed && aiRecommendation && (
              <CalendarAiPlannerBar
                recommendation={aiRecommendation}
                loading={aiLoading}
                onApply={handleApplyAiPlanner}
                onCustomize={() => setIsConstraintsModalOpen(true)}
                onDismiss={() => setAiPlannerDismissed(true)}
              />
            )}
          </div>
          )}

          {((!isMobile && taskPanelVisible) || (isMobile && mobileCalendarTab === 'assistant')) && (
            <aside className="calendar-side-column">
            {/* Mini Calendar Navigator */}
            {isMiniCalendarVisible && !whatIfActive && (
              <div className="panel mini-calendar-sidebar-panel" style={{ marginBottom: '1rem' }}>
                <MiniCalendar
                  activeDate={activeDate}
                  selectedDate={activeDate}
                  events={events}
                  tasks={tasks}
                  timeZone={schedule?.timezone ?? DEFAULT_TIMEZONE}
                  onSelectDate={handleSelectDate}
                />
              </div>
            )}
            {/* What-If Impact Summary Card if active */}
            {whatIfActive && whatIfImpact && (
              <div className="panel what-if-impact-card">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Simulation Impact</p>
                    <h3>{whatIfImpact.title}</h3>
                  </div>
                  <span className="status-pill info">Impact</span>
                </div>
                <div className="impact-card-body">
                  <p className="impact-move-label">
                    {whatIfImpact.oldTime} <br />↓<br />
                    <strong>{whatIfImpact.newTime}</strong>
                  </p>
                  <div className="impact-summary-metrics">
                    <span><strong>1</strong> task moved</span>
                    <span><strong>0</strong> hard conflicts</span>
                    <span><strong>{whatIfImpact.workloadChange}</strong></span>
                  </div>
                  <div className="impact-notes-list">
                    {whatIfImpact.preferenceNotes.map((note) => (
                      <div className="impact-note-item" key={note}>
                        <span className="dot yellow" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                  <div className="drawer-actions">
                    <button className="secondary-button" onClick={discardWhatIf}>Discard</button>
                    <button className="primary-button" onClick={applyWhatIf}>Apply</button>
                  </div>
                </div>
              </div>
            )}

            {!whatIfActive && !editing && (
              <CalendarRightAssistantPanel
                taskListRef={taskListRef}
                activeDate={activeDate}
                timeZone={schedule?.timezone ?? DEFAULT_TIMEZONE}
                events={events}
                tasks={tasks}
                categories={categories}
                canEdit={canEdit}
                selectedTask={selectedTask}
                onSelectTask={(task) => {
                  setSelected(null);
                  setSelectedTask(task);
                }}
                onTaskCreated={(newTask) => {
                  setTasks((curr) => [newTask, ...curr]);
                  showToast(`Đã thêm bài tập "${newTask.title}"`, 'success');
                }}
                onEventCreated={(newEvent) => {
                  setEvents((curr) => [...curr, newEvent]);
                  showToast(`Đã thêm sự kiện "${newEvent.title}"`, 'success');
                }}
                onQuickBookFreeTime={() => {
                  if (aiRecommendation) {
                    handleApplyAiPlanner();
                  } else {
                    openCreate();
                  }
                }}
                onSelectEvent={(item) => openDetails(item)}
                onViewAllToday={() => {
                  handleChangeView('timeGridDay');
                }}
              />
            )}
          </aside>
          )}
        </div>
        </>
      )}

      {/* Quick Create Popover */}
      {quickCreate && (
        <QuickCreatePopover
          open={quickCreate.open}
          startsAt={quickCreate.startsAt}
          endsAt={quickCreate.endsAt}
          categories={categories}
          timeZone={schedule?.timezone ?? DEFAULT_TIMEZONE}
          onSave={(data) => void handleQuickCreateSave(data)}
          onMoreOptions={handleQuickCreateMore}
          onClose={() => setQuickCreate(null)}
        />
      )}

      {/* Centered Event Form Modal */}
      {editing && (
        <EventForm
          form={form}
          categories={categories}
          timeZone={schedule?.timezone ?? 'Asia/Ho_Chi_Minh'}
          onChange={update}
          onSave={() => void save()}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Compact Event Popover */}
      {selected && !editing && (
        <EventCompactPopover
          event={selected}
          category={categories.find((item) => item.id === selected.categoryId)}
          timeZone={schedule?.timezone ?? 'Asia/Ho_Chi_Minh'}
          canEdit={canEdit}
          transition={eventTransitionsMap.get(selected.id)}
          onEdit={() => openEdit(selected)}
          onDelete={() => void remove(selected)}
          onDuplicate={() => void duplicate(selected)}
          onToggleLock={() => void toggleLock(selected)}
          onComplete={() => void markComplete(selected)}
          onReschedule={() => setRescheduleTarget(selected)}
          onRecolor={(color) => void handleRecolor(selected, color)}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Right Click Context Menu */}
      {contextMenu && (
        <CalendarContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={(event) => openEdit(event)}
          onDuplicate={(event) => void duplicate(event)}
          onDelete={(event) => void remove(event)}
          onToggleLock={(event) => void toggleLock(event)}
          onToggleComplete={(event) => void markComplete(event)}
          onReschedule={(event) => setRescheduleTarget(event)}
          onRecolor={(event, color) => void handleRecolor(event, color)}
          onNewEvent={(date) => openCreate(date)}
          onNavigatePlan={() => navigate('/scheduling')}
          onNavigateReschedule={() => navigate('/rescheduling')}
        />
      )}

      {/* Conflict Dialog on Create/Edit */}
      {conflict && (
        <div className="dialog-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-labelledby="conflict-title">
            <h3 id="conflict-title">Academic commitment overlap detected</h3>
            <p>&quot;{conflict.title}&quot; overlaps {conflict.conflicts.length} event(s):</p>
            <ul>
              {conflict.conflicts.map((item) => (
                <li key={item.title}><strong>{item.title}</strong> · {item.overlapMinutes} minutes</li>
              ))}
            </ul>
            <div className="drawer-actions">
              <button className="secondary-button" onClick={() => setConflict(null)}>Cancel</button>
              <button className="primary-button" onClick={() => void save(true)}>Save anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobility Pre-Commit Soft Warning / Hard Conflict Modal (Zero-Icon, Warn Once) */}
      {mobilityPrompt && (
        <div className="dialog-backdrop transit-soft-warning-backdrop">
          <div
            className="confirm-dialog transit-soft-warning-modal"
            role="alertdialog"
            aria-labelledby="mobility-warning-title"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  {mobilityPrompt.finding.status === 'MOBILITY_CONFLICT'
                    ? 'Xung đột di chuyển vật lý'
                    : 'Cảnh báo thời gian di chuyển'}
                </p>
                <h3 id="mobility-warning-title">
                  {mobilityPrompt.finding.status === 'MOBILITY_CONFLICT'
                    ? 'Không đủ thời gian di chuyển'
                    : 'Thời gian chuyển tiếp khá sát'}
                </h3>
              </div>
            </div>

            <p className="mobility-message-text">
              {mobilityPrompt.finding.message}
            </p>

            <div className="mobility-transition-summary">
              <div className="transition-step-box">
                <span className="step-tag">Từ</span>
                <strong>{mobilityPrompt.finding.fromTitle}</strong>
                <span className="step-location">({mobilityPrompt.finding.fromLocationName})</span>
              </div>
              <div className="transition-duration-box">
                <span className="duration-arrow">&rarr;</span>
                <span className="duration-text">Ước tính: {mobilityPrompt.finding.travelMinutes} phút</span>
                <span className="buffer-text">Thời gian trống: {mobilityPrompt.finding.availableMinutes} phút</span>
              </div>
              <div className="transition-step-box">
                <span className="step-tag">Đến</span>
                <strong>{mobilityPrompt.finding.toTitle}</strong>
                <span className="step-location">({mobilityPrompt.finding.toLocationName})</span>
              </div>
            </div>

            {mobilityPrompt.finding.status === 'MOBILITY_CONFLICT' ? (
              <div className="drawer-actions">
                <button
                  type="button"
                  className="primary-button hero-btn-gradient-primary"
                  onClick={() => setMobilityPrompt(null)}
                >
                  Sửa lại thời gian
                </button>
              </div>
            ) : (
              <div className="drawer-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMobilityPrompt(null)}
                >
                  Sửa lại
                </button>
                <button
                  type="button"
                  className="primary-button hero-btn-gradient-primary"
                  onClick={() => void mobilityPrompt.onConfirmSave()}
                >
                  Vẫn lưu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteOpen && selected && (
        <div className="dialog-backdrop">
          <div className="confirm-dialog" role="alertdialog" aria-labelledby="delete-title">
            <h3 id="delete-title">Delete &quot;{selected.title}&quot;?</h3>
            <p>{selected.recurrenceRule ? 'This deletes the entire series.' : 'This action can be undone with Ctrl+Z.'}</p>
            <div className="drawer-actions">
              <button className="secondary-button" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button className="primary-button danger-button" onClick={() => void remove(selected)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <ShareModal
          open={shareOpen}
          scheduleName={schedule?.name ?? 'Academic Schedule'}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Reschedule Candidate Modal */}
      {rescheduleTarget && (
        <RescheduleCandidateModal
          event={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onConfirm={handleConfirmReschedule}
        />
      )}

      {/* Advanced Constraints Modal */}
      <AdvancedConstraintsModal
        isOpen={isConstraintsModalOpen}
        rules={schedulingRules}
        onClose={() => setIsConstraintsModalOpen(false)}
        onSaveRules={(updated) => {
          setSchedulingRules(updated);
          setIsConstraintsModalOpen(false);
          showToast('Advanced constraints updated', 'success');
        }}
      />
    </section>
  );
}

function ShareModal({
  open,
  scheduleName,
  onClose,
}: {
  open: boolean;
  scheduleName: string;
  onClose: () => void;
}) {
  const [access, setAccess] = useState<'private' | 'link'>('link');
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/demo/share/smart-schedule-demo`;

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Public schedule link copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      showToast('Public schedule link copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="confirm-dialog share-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">FPT University Quy Nhơn</p>
            <h3>Chia sẻ &ldquo;{scheduleName}&rdquo;</h3>
          </div>
          <button className="text-close-btn" onClick={onClose}>Đóng</button>
        </div>
        <p className="muted">Tạo liên kết thời khóa biểu chỉ xem cho nhóm học tập, giảng viên và cố vấn học tập.</p>

        <div className="share-options">
          <label className={access === 'private' ? 'share-option-card selected' : 'share-option-card'}>
            <input type="radio" name="share-access" checked={access === 'private'} onChange={() => setAccess('private')} />
            <div>
              <strong>Riêng tư</strong>
              <small>Chỉ bạn mới có quyền xem hoặc chỉnh sửa các sự kiện trong không gian này.</small>
            </div>
          </label>
          <label className={access === 'link' ? 'share-option-card selected' : 'share-option-card'}>
            <input type="radio" name="share-access" checked={access === 'link'} onChange={() => setAccess('link')} />
            <div>
              <strong>Bất kỳ ai có liên kết</strong>
              <small>Chế độ chỉ xem thời khóa biểu công khai cho bạn học và giảng viên.</small>
            </div>
          </label>
        </div>

        {access === 'link' && (
          <div className="share-link-box">
            <label className="field">
              <span>Đường dẫn công khai</span>
              <div className="share-input-row">
                <input readOnly value={shareUrl} />
                <button className="secondary-button" onClick={copyLink}>
                  {copied ? 'Đã sao chép' : 'Sao chép link'}
                </button>
              </div>
            </label>
            <div className="public-preview-row">
              <a
                href="/demo/share/smart-schedule-demo"
                target="_blank"
                rel="noreferrer"
                className="primary-button"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              >
                Mở xem trang công khai
              </a>
            </div>
          </div>
        )}

        <div className="drawer-actions">
          <button className="secondary-button" onClick={onClose}>Hoàn tất</button>
        </div>
      </div>
    </div>
  );
}

function RescheduleCandidateModal({
  event,
  onClose,
  onConfirm,
}: {
  event: EventItem;
  onClose: () => void;
  onConfirm: (slot: { startsAt: string; endsAt: string; label: string }) => void;
}) {
  const options = [
    {
      id: 'slot-thu',
      startsAt: getDemoDate(3, 19, 0), // Thursday 19:00
      endsAt: getDemoDate(3, 21, 0),   // Thursday 21:00
      label: 'Thứ Năm 19:00–21:00',
      badges: [
        { text: 'Kịp hạn chót', type: 'good' },
        { text: 'Còn chỗ trống', type: 'good' },
        { text: 'Tải lượng cao (4h trong thứ Năm)', type: 'warn' },
      ],
    },
    {
      id: 'slot-sat',
      startsAt: getDemoDate(5, 14, 0), // Saturday 14:00
      endsAt: getDemoDate(5, 16, 0),   // Saturday 16:00
      label: 'Thứ Bảy 14:00–16:00',
      badges: [
        { text: 'Kịp hạn chót', type: 'good' },
        { text: 'Không trùng lịch', type: 'good' },
        { text: 'Thời gian cân đối', type: 'good' },
      ],
    },
  ];

  const [selectedId, setSelectedId] = useState<string>('slot-sat');
  const selectedSlot = options.find((o) => o.id === selectedId) ?? options[1];

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="confirm-dialog reschedule-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Đổi lịch thông minh</p>
            <h3>Xếp lại lịch &ldquo;{event.title}&rdquo;</h3>
          </div>
          <button className="text-close-btn" onClick={onClose}>Đóng</button>
        </div>
        <p className="muted">Lựa chọn khung giờ đề xuất phù hợp dựa trên hạn chót, năng suất và thời gian nghỉ tối thiểu.</p>

        <div className="candidate-slot-list">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={selectedId === option.id ? 'candidate-slot-card selected' : 'candidate-slot-card'}
              onClick={() => setSelectedId(option.id)}
            >
              <div className="candidate-slot-header">
                <strong>{option.label}</strong>
                {selectedId === option.id && <span className="status-pill info">Đang chọn</span>}
              </div>
              <div className="candidate-badges">
                {option.badges.map((b) => (
                  <span key={b.text} className={b.type === 'good' ? 'badge-good' : 'badge-warn'}>
                    {b.type === 'good' ? '[Tốt]' : '[Lưu ý]'} {b.text}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="drawer-actions">
          <button className="secondary-button" onClick={onClose}>Hủy</button>
          <button className="primary-button" onClick={() => onConfirm(selectedSlot)}>
            Xác nhận đổi lịch
          </button>
        </div>
      </div>
    </div>
  );
}

function parseRecurrence(raw: string | null): RecurrenceRule | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RecurrenceRule;
  } catch {
    return null;
  }
}

function toInput(event: EventItem): EventInput {
  return {
    title: event.title,
    description: event.description ?? '',
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location ?? '',
    locationId: event.locationId ?? null,
    categoryId: event.categoryId ?? undefined,
    taskId: event.taskId ?? event.sourceTaskId ?? null,
    sourceTaskId: event.sourceTaskId ?? event.taskId ?? null,
    priority: event.priority,
    status: event.status,
    recurrence: parseRecurrence(event.recurrenceRule),
    reminderMinutes: event.reminderMinutes ?? undefined,
    notes: event.notes ?? '',
    fixed: event.fixed,
    locked: event.locked,
    color: event.color ?? null,
  };
}

function getDeadlineClass(value: string) {
  const diff = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  return diff <= 1 ? 'deadline-risk-high' : diff <= 3 ? 'deadline-risk-medium' : 'deadline-risk-low';
}
