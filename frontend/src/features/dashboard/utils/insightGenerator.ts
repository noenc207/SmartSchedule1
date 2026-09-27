import type { DayWorkloadMetric, SmartInsight, FreeTimeGap } from '../types/dashboard';
import type { Task, EventItem } from '../../../types/domain';
import { getDurationMinutes, formatTimeRange } from '../../../utils/dateTime';

/**
 * Derives contextual, high-signal AI scheduling insights from actual application data.
 * Strictly prioritizes urgency and actionable advice without noise.
 */
export function generateSmartInsights(
  todayEvents: EventItem[],
  upcomingTasks: Task[],
  weekMetrics: DayWorkloadMetric[],
  todayGaps: FreeTimeGap[]
): SmartInsight[] {
  const insights: SmartInsight[] = [];

  // 1. Check for imminent high-priority deadlines (within 48 hours)
  const now = new Date();
  const criticalTask = upcomingTasks.find((task) => {
    if (task.status === 'COMPLETED' || !task.deadline) return false;
    const deadlineDate = new Date(task.deadline);
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return task.priority === 'HIGH' && diffHours > 0 && diffHours <= 48;
  });

  if (criticalTask && criticalTask.deadline) {
    const deadlineDate = new Date(criticalTask.deadline);
    const isDueTomorrow = deadlineDate.getDate() === now.getDate() + 1;
    const isDueToday = deadlineDate.toDateString() === now.toDateString();

    const dueText = isDueToday
      ? 'today'
      : isDueTomorrow
      ? 'tomorrow'
      : `in ${Math.max(1, Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)))}h`;

    insights.push({
      id: `urgent-${criticalTask.id}`,
      type: 'urgency',
      title: `${criticalTask.title} is due ${dueText}`,
      description: `High priority task has ${criticalTask.remainingDurationMinutes}m remaining work. We recommend scheduling focus time before the deadline.`,
      actionLabel: 'Schedule Session',
      actionRoute: '/scheduling',
    });
  }

  // 2. Check for study capacity overload across the week
  const overloadedDays = weekMetrics.filter((m) => m.isOverloaded);
  if (overloadedDays.length > 0) {
    const worstDay = [...overloadedDays].sort(
      (a, b) =>
        b.totalWorkloadMinutes - b.capacityMinutes -
        (a.totalWorkloadMinutes - a.capacityMinutes)
    )[0];

    const overHours = Math.round(((worstDay.totalWorkloadMinutes - worstDay.capacityMinutes) / 60) * 10) / 10;

    insights.push({
      id: `overload-${worstDay.dateKey}`,
      type: 'overload',
      title: `${worstDay.fullDayLabel} workload exceeds daily capacity by ${overHours}h`,
      description: `Planned academic commitments and focus sessions exceed available hours on ${worstDay.fullDayLabel}. Consider rescheduling some tasks to lighter days.`,
      actionLabel: 'Balance Schedule',
      actionRoute: '/rescheduling',
    });
  }

  // 3. Check for productive daytime free gaps (e.g. >= 60 minutes)
  const primeGap = todayGaps.find((g) => g.durationMinutes >= 60);
  if (primeGap) {
    const topTask = primeGap.suggestedTask || upcomingTasks.find((t) => t.status !== 'COMPLETED');
    const taskName = topTask ? ` on "${topTask.title}"` : '';

    const startHour = new Date(primeGap.startsAt).getHours();
    const timeOfDay = startHour < 12 ? 'this morning' : startHour < 17 ? 'this afternoon' : 'this evening';

    insights.push({
      id: `gap-${primeGap.startsAt}`,
      type: 'opportunity',
      title: `You have ${primeGap.durationMinutes}m available ${timeOfDay}`,
      description: `Open window between ${primeGap.timeRangeLabel} is ideal for a focused study session${taskName}.`,
      actionLabel: 'Schedule Session',
      actionRoute: '/scheduling',
    });
  }

  // 4. Fallback positive reinforcement / schedule health insight if no crises
  if (insights.length === 0) {
    const totalPlannedWeek = weekMetrics.reduce((sum, m) => sum + m.totalWorkloadMinutes, 0);
    const totalCapacityWeek = weekMetrics.reduce((sum, m) => sum + m.capacityMinutes, 0);

    if (totalPlannedWeek > 0 && totalPlannedWeek <= totalCapacityWeek) {
      insights.push({
        id: 'healthy-week',
        type: 'success',
        title: 'Your academic schedule is balanced and achievable',
        description: `${Math.round(totalPlannedWeek / 60)}h planned across the week within your study capacity limits. Deadlines are protected.`,
        actionLabel: 'View Full Calendar',
        actionRoute: '/calendar',
      });
    } else {
      insights.push({
        id: 'welcome-open',
        type: 'opportunity',
        title: 'Make room for what matters this week',
        description: 'Add your courses and assignments, then generate an optimal plan that protects your focus.',
        actionLabel: 'Generate Smart Plan',
        actionRoute: '/scheduling',
      });
    }
  }

  return insights;
}

/**
 * Identifies free time gaps between daytime events today (between 08:00 and 19:00).
 */
export function detectTodayFreeGaps(
  todayEvents: EventItem[],
  baseDate: Date = new Date(),
  tasks: Task[] = []
): FreeTimeGap[] {
  const sorted = [...todayEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const gaps: FreeTimeGap[] = [];

  const dayStart = new Date(baseDate);
  dayStart.setHours(8, 0, 0, 0);

  const dayEnd = new Date(baseDate);
  dayEnd.setHours(19, 0, 0, 0);

  let cursor = dayStart.getTime();

  for (const ev of sorted) {
    const evStart = new Date(ev.startsAt).getTime();
    const evEnd = new Date(ev.endsAt).getTime();

    if (evStart > cursor) {
      const gapMinutes = Math.round((evStart - cursor) / (1000 * 60));
      if (gapMinutes >= 45 && cursor < dayEnd.getTime()) {
        const gapStartDate = new Date(cursor);
        const gapEndDate = new Date(Math.min(evStart, dayEnd.getTime()));
        const timeRangeLabel = formatTimeRange(gapStartDate, gapEndDate);

        // Find a matching task that could fit inside this gap
        const candidateTask = tasks.find(
          (t) =>
            t.status !== 'COMPLETED' &&
            t.remainingDurationMinutes > 0 &&
            t.remainingDurationMinutes <= gapMinutes
        ) || tasks.find((t) => t.status !== 'COMPLETED');

        gaps.push({
          startsAt: gapStartDate.toISOString(),
          endsAt: gapEndDate.toISOString(),
          durationMinutes: gapMinutes,
          timeRangeLabel,
          suggestedTask: candidateTask,
        });
      }
    }
    cursor = Math.max(cursor, evEnd);
  }

  // Check gap after last event until 19:00
  if (cursor < dayEnd.getTime()) {
    const gapMinutes = Math.round((dayEnd.getTime() - cursor) / (1000 * 60));
    if (gapMinutes >= 45) {
      const gapStartDate = new Date(cursor);
      const timeRangeLabel = formatTimeRange(gapStartDate, dayEnd);
      gaps.push({
        startsAt: gapStartDate.toISOString(),
        endsAt: dayEnd.toISOString(),
        durationMinutes: gapMinutes,
        timeRangeLabel,
        suggestedTask: tasks.find((t) => t.status !== 'COMPLETED'),
      });
    }
  }

  return gaps;
}
