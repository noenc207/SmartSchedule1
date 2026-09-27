import { useState, useEffect, useMemo, useCallback } from 'react';
import { eventApi } from '../../../services/eventApi';
import { taskApi } from '../../../services/taskApi';
import { availabilityApi } from '../../../services/availabilityApi';
import { categoryApi } from '../../../services/categoryApi';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { isDemoMode, getDemoDate } from '../../../services/demoMode';
import { getDurationMinutes } from '../../../utils/dateTime';
import { calculateYAxisConfig, formatWorkloadHours } from '../utils/chartCalculations';
import { generateSmartInsights, detectTodayFreeGaps } from '../utils/insightGenerator';
import type { EventItem, Task, Category, Availability } from '../../../types/domain';
import type {
  DayWorkloadMetric,
  SmartInsight,
  KpiMetric,
  FreeTimeGap,
  ChartYAxisConfig,
} from '../types/dashboard';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function useDashboardData() {
  const { activeScheduleId } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  // Selected date for Today's Schedule view (defaults to real today)
  const todayDate = useMemo(() => {
    return new Date();
  }, []);

  const [activeDate, setActiveDate] = useState<Date>(todayDate);

  // Determine current week dates (Mon to Sun)
  const weekDates = useMemo(() => {
    const base = new Date(activeDate);
    const day = base.getDay(); // 0 is Sun, 1 is Mon
    const diffToMon = day === 0 ? -6 : 1 - day;

    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [activeDate]);

  const loadData = useCallback(async () => {
    if (!activeScheduleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fromDate = new Date(weekDates[0]);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(weekDates[6]);
      toDate.setHours(23, 59, 59, 999);

      const [loadedEvents, taskPage, loadedAvail, loadedCats] = await Promise.all([
        eventApi.list(activeScheduleId, fromDate.toISOString(), toDate.toISOString()),
        taskApi.list(activeScheduleId),
        availabilityApi.list(activeScheduleId).catch(() => [] as Availability[]),
        categoryApi.list().catch(() => [] as Category[]),
      ]);

      setEvents(loadedEvents);
      setTasks(taskPage.content || []);
      setAvailabilities(loadedAvail);
      setCategories(loadedCats);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.message || 'Could not load schedule data. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, [activeScheduleId, weekDates]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Derive Daily Capacity Map from Availability windows
  const dailyCapacityMinutes = useMemo(() => {
    const map = new Map<number, number>(); // 1 (Mon) to 7 (Sun)
    for (let d = 1; d <= 7; d++) {
      const slots = availabilities.filter((a) => a.dayOfWeek === d && a.enabled);
      if (slots.length > 0) {
        const totalMin = slots.reduce((acc, slot) => {
          const [sh, sm] = slot.startTime.split(':').map(Number);
          const [eh, em] = slot.endTime.split(':').map(Number);
          return acc + (eh * 60 + em - (sh * 60 + sm));
        }, 0);
        map.set(d, totalMin);
      } else {
        // Default standard 6h study capacity for weekdays, 4h for weekends if not configured
        map.set(d, d <= 5 ? 360 : 240);
      }
    }
    return map;
  }, [availabilities]);

  // Compute Workload Metrics for the 7 days (Mon-Sun)
  const weekMetrics: DayWorkloadMetric[] = useMemo(() => {
    const todayStr = todayDate.toDateString();

    return weekDates.map((date) => {
      const dateKey = date.toISOString().split('T')[0];
      const dayOfWeekIndex = date.getDay(); // 0 Sun ... 6 Sat
      // Map JS getDay (0=Sun, 1=Mon...6=Sat) to API dayOfWeek (1=Mon ... 7=Sun)
      const apiDayOfWeek = dayOfWeekIndex === 0 ? 7 : dayOfWeekIndex;

      const capacity = dailyCapacityMinutes.get(apiDayOfWeek) || 360;

      // Find events falling on this date
      const dayEvents = events.filter((ev) => {
        const evDate = new Date(ev.startsAt);
        return evDate.toDateString() === date.toDateString();
      });

      let fixedMinutes = 0;
      let plannedMinutes = 0;

      for (const ev of dayEvents) {
        const dur = Math.max(0, getDurationMinutes(ev.startsAt, ev.endsAt));
        if (ev.fixed || ev.locked) {
          fixedMinutes += dur;
        } else {
          plannedMinutes += dur;
        }
      }

      const totalWorkloadMinutes = fixedMinutes + plannedMinutes;

      return {
        date,
        dateKey,
        dayLabel: DAY_NAMES[dayOfWeekIndex],
        fullDayLabel: FULL_DAY_NAMES[dayOfWeekIndex],
        fixedMinutes,
        plannedMinutes,
        totalWorkloadMinutes,
        capacityMinutes: capacity,
        isToday: date.toDateString() === todayStr,
        isOverloaded: totalWorkloadMinutes > capacity,
        eventCount: dayEvents.length,
        events: dayEvents,
      };
    });
  }, [weekDates, todayDate, events, dailyCapacityMinutes]);

  // Dynamic Y-axis config for the workload chart
  const yAxisConfig: ChartYAxisConfig = useMemo(() => {
    return calculateYAxisConfig(weekMetrics);
  }, [weekMetrics]);

  // Today's events sorted by startsAt
  const todaysEvents = useMemo(() => {
    const key = activeDate.toDateString();
    return events
      .filter((ev) => new Date(ev.startsAt).toDateString() === key)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [events, activeDate]);

  // Detect free intervals for today
  const todayGaps: FreeTimeGap[] = useMemo(() => {
    return detectTodayFreeGaps(todaysEvents, activeDate, tasks);
  }, [todaysEvents, activeDate, tasks]);

  // Upcoming non-completed tasks with deadlines
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'COMPLETED' && t.deadline)
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
      .slice(0, 5);
  }, [tasks]);

  // Derive Contextual Smart Insights
  const smartInsights: SmartInsight[] = useMemo(() => {
    return generateSmartInsights(todaysEvents, upcomingTasks, weekMetrics, todayGaps);
  }, [todaysEvents, upcomingTasks, weekMetrics, todayGaps]);

  // Derive KPI Metrics
  const kpiMetrics: KpiMetric[] = useMemo(() => {
    const totalPlannedMin = weekMetrics.reduce((acc, m) => acc + m.totalWorkloadMinutes, 0);
    const totalCapacityMin = weekMetrics.reduce((acc, m) => acc + m.capacityMinutes, 0);
    const highPriorityTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.priority === 'HIGH');
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

    const totalTasksCount = tasks.length || 1;
    const completionPct = Math.round((completedTasks.length / totalTasksCount) * 100);

    const isHealthy = totalPlannedMin <= totalCapacityMin && highPriorityTasks.length <= 3;

    return [
      {
        id: 'planned-hours',
        label: 'Focus Planned',
        value: formatWorkloadHours(totalPlannedMin),
        subtext: `Across 7 days of commitments`,
        badge: {
          text: `${Math.round((totalPlannedMin / Math.max(1, totalCapacityMin)) * 100)}% load`,
          variant: totalPlannedMin > totalCapacityMin ? 'warning' : 'info',
        },
      },
      {
        id: 'study-capacity',
        label: 'Weekly Study Capacity',
        value: formatWorkloadHours(totalCapacityMin),
        subtext: `Configured availability windows`,
      },
      {
        id: 'deadlines-risk',
        label: 'High Priority Deadlines',
        value: `${highPriorityTasks.length}`,
        subtext: highPriorityTasks.length > 0 ? 'Action required this week' : 'All clear',
        badge: {
          text: highPriorityTasks.length > 2 ? 'Urgent' : 'On Track',
          variant: highPriorityTasks.length > 2 ? 'danger' : 'success',
        },
      },
      {
        id: 'schedule-health',
        label: 'Schedule Health',
        value: isHealthy ? 'Optimal' : 'Attention',
        subtext: `${completionPct}% tasks completed`,
        badge: {
          text: isHealthy ? 'Balanced' : 'High Load',
          variant: isHealthy ? 'success' : 'warning',
        },
      },
    ];
  }, [weekMetrics, tasks]);

  // Derive Structured Real-World Data for Dashboard Cards
  const VIETNAMESE_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const eventsByDay = useMemo(() => {
    const map: Record<
      string,
      Array<{
        id: string;
        time: string;
        title: string;
        room: string;
        color: 'blue' | 'purple' | 'green' | 'orange';
        iconType: 'book' | 'code' | 'cpu' | 'lang';
      }>
    > = {
      T2: [],
      T3: [],
      T4: [],
      T5: [],
      T6: [],
      T7: [],
      CN: [],
    };

    const colorCycle: Array<'blue' | 'purple' | 'green' | 'orange'> = ['blue', 'purple', 'green', 'orange'];

    events.forEach((ev, idx) => {
      const d = new Date(ev.startsAt);
      const dayKey = VIETNAMESE_DAYS[d.getDay()] || 'T2';
      const startH = d.getHours().toString().padStart(2, '0');
      const startM = d.getMinutes().toString().padStart(2, '0');
      const endD = new Date(ev.endsAt);
      const endH = endD.getHours().toString().padStart(2, '0');
      const endM = endD.getMinutes().toString().padStart(2, '0');

      let iconType: 'book' | 'code' | 'cpu' | 'lang' = 'book';
      const lower = ev.title.toLowerCase();
      if (lower.includes('web') || lower.includes('lập trình') || lower.includes('code')) {
        iconType = 'code';
      } else if (lower.includes('ai') || lower.includes('trí tuệ') || lower.includes('mạng') || lower.includes('hệ điều hành')) {
        iconType = 'cpu';
      } else if (lower.includes('anh') || lower.includes('english') || lower.includes('ngôn ngữ')) {
        iconType = 'lang';
      }

      map[dayKey].push({
        id: ev.id,
        time: `${startH}:${startM} - ${endH}:${endM}`,
        title: ev.title,
        room: ev.location || 'Phòng B3.03',
        color: colorCycle[idx % colorCycle.length],
        iconType,
      });
    });

    return map;
  }, [events]);

  // Formatted classes for the selected activeDate (synchronized with timetable day selector)
  const todaysClasses = useMemo(() => {
    const now = new Date();
    const activeKey = activeDate.toDateString();
    const isRealToday = activeKey === now.toDateString();

    // Check real events matching activeDate
    const matchingEvents = events
      .filter((ev) => new Date(ev.startsAt).toDateString() === activeKey)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    if (matchingEvents.length > 0) {
      return matchingEvents.map((ev, i) => {
        const s = new Date(ev.startsAt);
        const e = new Date(ev.endsAt);
        const isNow = isRealToday && now >= s && now <= e;
        const isPast = isRealToday ? now > e : activeDate < now;

        let iconType: 'book' | 'code' | 'cpu' | 'lang' = 'book';
        const lower = ev.title.toLowerCase();
        if (lower.includes('web') || lower.includes('lập trình') || lower.includes('code')) iconType = 'code';
        else if (lower.includes('ai') || lower.includes('trí tuệ') || lower.includes('máy') || lower.includes('hệ điều hành')) iconType = 'cpu';
        else if (lower.includes('anh') || lower.includes('english')) iconType = 'lang';

        return {
          id: ev.id,
          time: `${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')} - ${e.getHours().toString().padStart(2, '0')}:${e.getMinutes().toString().padStart(2, '0')}`,
          title: ev.title,
          room: ev.location || 'Phòng B3.03',
          status: isNow ? ('Đang diễn ra' as const) : isPast ? ('Đã kết thúc' as const) : ('Sắp tới' as const),
          statusVariant: isNow ? ('active-blue' as const) : ('upcoming-grey' as const),
          iconType,
          color: (['blue', 'purple', 'green', 'orange'][i % 4]) as 'blue' | 'purple' | 'green' | 'orange',
        };
      });
    }

    // Schedule has no events on this day
    return [];
  }, [events, activeDate]);

  // Today's free study gap
  const studyGap = useMemo(() => {
    if (todayGaps.length > 0) {
      const g = todayGaps[0];
      return {
        minutes: g.durationMinutes,
        timeRange: g.timeRangeLabel || '08:00 - 09:00',
      };
    }
    return {
      minutes: 60,
      timeRange: '08:00 - 09:00',
    };
  }, [todayGaps]);

  // KPI Summary (100% synchronized with actual events, tasks, deadlines)
  const kpiSummary = useMemo(() => {
    const now = new Date();

    // 1. Remaining study time (events from now until end of week + pending tasks)
    const remainingEvents = events.filter((e) => new Date(e.endsAt).getTime() > now.getTime());
    const remainingEventMinutes = remainingEvents.reduce(
      (acc, e) => acc + getDurationMinutes(e.startsAt, e.endsAt),
      0
    );
    const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');
    const pendingTaskMinutes = pendingTasks.reduce(
      (acc, t) => acc + (t.remainingDurationMinutes || t.estimatedDurationMinutes || 60),
      0
    );
    const totalRemainingMinutes = remainingEventMinutes + pendingTaskMinutes;
    const remainingHoursNum = Math.round(totalRemainingMinutes / 60);

    // Days remaining this week with scheduled events
    const remainingDaysSet = new Set(remainingEvents.map((e) => new Date(e.startsAt).toDateString()));
    const daysWithSchedule = Math.max(1, remainingDaysSet.size);
    const dailyAvg = (remainingHoursNum / daysWithSchedule).toFixed(1).replace('.0', '');
    const dailyAvgHours = `/ ${dailyAvg}h/ngày có lịch`;

    // Past study hours vs total planned for the week
    const pastEvents = events.filter((e) => new Date(e.endsAt).getTime() <= now.getTime());
    const pastEventMinutes = pastEvents.reduce(
      (acc, e) => acc + getDurationMinutes(e.startsAt, e.endsAt),
      0
    );
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
    const completedTaskMinutes = completedTasks.reduce(
      (acc, t) => acc + (t.estimatedDurationMinutes || 60),
      0
    );
    const totalPastMinutes = pastEventMinutes + completedTaskMinutes;
    const grandTotalMinutes = totalPastMinutes + totalRemainingMinutes;
    const studyProgressPct =
      grandTotalMinutes > 0 ? Math.min(100, Math.round((totalPastMinutes / grandTotalMinutes) * 100)) : 0;

    // 2. Deadlines
    const deadlineTasks = tasks.filter((t) => t.deadline);
    const pendingDeadlineTasks = deadlineTasks.filter((t) => t.status !== 'COMPLETED');
    const completedDeadlineTasks = deadlineTasks.filter((t) => t.status === 'COMPLETED');
    const oneDayAhead = now.getTime() + 24 * 60 * 60 * 1000;
    const isUrgent = pendingDeadlineTasks.some((t) => new Date(t.deadline!).getTime() <= oneDayAhead);
    const deadlineBadgeText = isUrgent
      ? 'Khẩn cấp'
      : pendingDeadlineTasks.length === 0
      ? 'Hoàn thành'
      : 'On Track';
    const deadlineProgressPct =
      deadlineTasks.length > 0
        ? Math.round((completedDeadlineTasks.length / deadlineTasks.length) * 100)
        : tasks.length > 0
        ? Math.round((completedTasks.length / tasks.length) * 100)
        : 100;

    // 3. Completed work
    const completedHoursNum = Math.round(completedTaskMinutes / 60);
    const allTasksMinutes = tasks.reduce((acc, t) => acc + (t.estimatedDurationMinutes || 60), 0);
    const totalTargetHoursNum = Math.round(allTasksMinutes / 60);
    const completedPct =
      allTasksMinutes > 0 ? Math.min(100, Math.round((completedTaskMinutes / allTasksMinutes) * 100)) : 100;

    // 4. Weekly Goal
    const dayOfWeek = now.getDay();
    const remainingDays = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weeklyGoalPct =
      tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 100;

    return {
      remainingHours: `${remainingHoursNum}h`,
      dailyAvgHours,
      studyProgressPct: events.length > 0 || tasks.length > 0 ? studyProgressPct : 0,
      urgentDeadlineCount: pendingDeadlineTasks.length,
      deadlineBadgeText: pendingDeadlineTasks.length === 0 ? 'Hoàn thành' : deadlineBadgeText,
      deadlineProgressPct: deadlineTasks.length > 0 ? deadlineProgressPct : 100,
      completedHours: `${completedHoursNum}h`,
      totalTargetHours: `tổng ${totalTargetHoursNum}h`,
      completedPct: tasks.length > 0 ? completedPct : 100,
      weeklyGoalPct: tasks.length > 0 ? weeklyGoalPct : 100,
      remainingDays: Math.max(1, remainingDays),
    };
  }, [events, tasks, weekMetrics]);

  // Actions
  const toggleTaskComplete = async (task: Task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      const updated = await taskApi.update(task.id, {
        ...task,
        status: nextStatus,
      });
      setTasks((curr) => curr.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      console.error('Failed to update task completion:', e);
    }
  };

  return {
    loading,
    error,
    activeDate,
    setActiveDate,
    weekDates,
    weekMetrics,
    yAxisConfig,
    todaysEvents,
    todayGaps,
    upcomingTasks,
    tasks,
    smartInsights,
    kpiMetrics,
    eventsByDay,
    todaysClasses,
    studyGap,
    kpiSummary,
    categories,
    toggleTaskComplete,
    refresh: loadData,
  };
}
