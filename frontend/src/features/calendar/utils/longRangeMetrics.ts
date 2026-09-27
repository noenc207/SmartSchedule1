import type { EventItem, Task } from '../../../types/domain';
import { DEFAULT_TIMEZONE, formatDate, getDurationMinutes } from '../../../utils/dateTime';

export type HeatmapLevel = 'none' | 'light' | 'moderate' | 'high' | 'overload';

/**
 * Calculates total scheduled focus workload in minutes on a given date.
 * Strictly checks that events overlap with the day in the specified timezone.
 */
export function getDailyWorkload(
  dateIso: string | Date,
  events: EventItem[],
  timeZone: string = DEFAULT_TIMEZONE
): number {
  const targetDateStr = formatDate(dateIso, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return events
    .filter((event) => {
      if (event.status === 'CANCELLED') return false;
      const eventDateStr = formatDate(event.startsAt, timeZone, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return eventDateStr === targetDateStr;
    })
    .reduce((sum, event) => sum + getDurationMinutes(event.startsAt, event.endsAt), 0);
}

/**
 * Derives heatmap level from scheduled minutes and user configured daily capacity.
 * Threshold rules:
 * 0h (0m) -> none
 * >0h to 2h (1–120m) -> light
 * >2h to 4h (121–240m) -> moderate
 * >4h to capacity (default 6h / 360m) -> high
 * >capacity (or >6h default) -> overload
 * Exactly 6h / capacity is 'high', NOT overload!
 */
export function getDateHeatmapLevel(
  minutes: number,
  capacityMinutes: number = 360
): HeatmapLevel {
  if (minutes <= 0) return 'none';
  if (minutes > capacityMinutes) return 'overload';
  if (minutes <= 120) return 'light';
  if (minutes <= 240) return 'moderate';
  return 'high';
}

export interface DailyMetrics {
  workloadMinutes: number;
  eventCount: number;
  taskCount: number;
  deadlines: number;
  isOverloaded: boolean;
  level: HeatmapLevel;
}

/**
 * Returns comprehensive daily metrics for a specific calendar date.
 */
export function getDailyMetrics(
  dateIso: string | Date,
  events: EventItem[],
  tasks: Task[],
  timeZone: string = DEFAULT_TIMEZONE,
  capacityMinutes: number = 360
): DailyMetrics {
  const targetDateStr = formatDate(dateIso, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const dayEvents = events.filter((e) => {
    if (e.status === 'CANCELLED') return false;
    const evDate = formatDate(e.startsAt, timeZone, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return evDate === targetDateStr;
  });

  const workloadMinutes = dayEvents.reduce(
    (sum, e) => sum + getDurationMinutes(e.startsAt, e.endsAt),
    0
  );

  // Distinct tasks scheduled on this day
  const taskIdsOnDay = new Set<string>();
  dayEvents.forEach((e) => {
    if (e.taskId) taskIdsOnDay.add(e.taskId);
  });

  // Deadlines falling on this day
  const deadlines = tasks.filter((t) => {
    if (!t.deadline || t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
    const deadlineDateStr = formatDate(t.deadline, timeZone, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return deadlineDateStr === targetDateStr;
  }).length;

  const isOverloaded = workloadMinutes > capacityMinutes;
  const level = getDateHeatmapLevel(workloadMinutes, capacityMinutes);

  return {
    workloadMinutes,
    eventCount: dayEvents.length,
    taskCount: taskIdsOnDay.size,
    deadlines,
    isOverloaded,
    level,
  };
}

/**
 * Returns month indices (0-11) for a given quarter (1-4).
 * Q1 -> [0, 1, 2] (Jan, Feb, Mar)
 * Q2 -> [3, 4, 5] (Apr, May, Jun)
 * Q3 -> [6, 7, 8] (Jul, Aug, Sep)
 * Q4 -> [9, 10, 11] (Oct, Nov, Dec)
 */
export function getQuarterMonths(
  _year: number,
  quarter: 1 | 2 | 3 | 4
): [number, number, number] {
  switch (quarter) {
    case 1:
      return [0, 1, 2];
    case 2:
      return [3, 4, 5];
    case 3:
      return [6, 7, 8];
    case 4:
    default:
      return [9, 10, 11];
  }
}

export interface WeekSummary {
  startDate: Date;
  endDate: Date;
  plannedMinutes: number;
  eventCount: number;
  deadlineCount: number;
  highPriorityTaskCount: number;
  isOverloaded: boolean;
}

/**
 * Generates a concise summary for a 7-day week starting on weekStart.
 */
export function getWeekSummary(
  weekStart: Date,
  events: EventItem[],
  tasks: Task[],
  timeZone: string = DEFAULT_TIMEZONE,
  capacityMinutesPerDay: number = 360
): WeekSummary {
  const startMs = weekStart.getTime();
  const endMs = startMs + 7 * 86400000;
  const endDate = new Date(endMs - 1);

  const weekEvents = events.filter((e) => {
    if (e.status === 'CANCELLED') return false;
    const t = new Date(e.startsAt).getTime();
    return t >= startMs && t < endMs;
  });

  const plannedMinutes = weekEvents.reduce(
    (sum, e) => sum + getDurationMinutes(e.startsAt, e.endsAt),
    0
  );

  const deadlineCount = tasks.filter((t) => {
    if (!t.deadline || t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
    const dt = new Date(t.deadline).getTime();
    return dt >= startMs && dt < endMs;
  }).length;

  const activeTaskIds = new Set(weekEvents.map((e) => e.taskId).filter(Boolean));
  const highPriorityTaskCount = tasks.filter(
    (t) => activeTaskIds.has(t.id) && t.priority === 'HIGH'
  ).length;

  const weeklyCapacity = capacityMinutesPerDay * 7;
  const isOverloaded = plannedMinutes > weeklyCapacity;

  return {
    startDate: weekStart,
    endDate,
    plannedMinutes,
    eventCount: weekEvents.length,
    deadlineCount,
    highPriorityTaskCount,
    isOverloaded,
  };
}

export interface TimelineSessionSegment {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  color: string | null;
  hasConflict: boolean;
}

export interface TimelineTaskRow {
  task: Task;
  sessions: TimelineSessionSegment[];
  totalScheduledMinutes: number;
  deadlineDate: string | null;
  isOverdue: boolean;
  color: string;
}

/**
 * Segments actual scheduled sessions for each task without inventing continuous blocks.
 * Preserves split sessions on the same task row!
 */
export function getTimelineTaskData(
  tasks: Task[],
  events: EventItem[],
  timeZone: string = DEFAULT_TIMEZONE
): TimelineTaskRow[] {
  const now = Date.now();

  return tasks.map((task) => {
    const taskEvents = events.filter(
      (e) => e.taskId === task.id || e.sourceTaskId === task.id || (e.notes && e.notes.includes(task.id))
    );

    // Sort sessions chronologically
    const sorted = [...taskEvents].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );

    // Detect internal conflicts or overlaps between sessions
    const sessions: TimelineSessionSegment[] = sorted.map((e, idx) => {
      const dur = getDurationMinutes(e.startsAt, e.endsAt);
      const eStart = new Date(e.startsAt).getTime();
      const eEnd = new Date(e.endsAt).getTime();

      const hasConflict = sorted.some((other, oIdx) => {
        if (idx === oIdx) return false;
        const oStart = new Date(other.startsAt).getTime();
        const oEnd = new Date(other.endsAt).getTime();
        return eStart < oEnd && eEnd > oStart;
      });

      return {
        eventId: e.id,
        title: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        durationMinutes: dur,
        color: e.color ?? task.color ?? null,
        hasConflict,
      };
    });

    const totalScheduledMinutes = sessions.reduce((s, seg) => s + seg.durationMinutes, 0);
    const isOverdue = Boolean(
      task.deadline &&
        new Date(task.deadline).getTime() < now &&
        task.remainingDurationMinutes > 0
    );

    return {
      task,
      sessions,
      totalScheduledMinutes,
      deadlineDate: task.deadline ?? null,
      isOverdue,
      color: task.color ?? '#ea580c',
    };
  });
}
