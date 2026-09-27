import type { EventItem, Task } from '../../../types/domain';

/**
 * Calculates total scheduled duration in minutes for a task across all active events in the workspace.
 * Matches by explicit e.taskId, or fallback e.notes containing the task ID.
 */
export function getTaskScheduledMinutes(taskId: string, events: EventItem[]): number {
  return events
    .filter((e) => e.taskId === taskId || (e.notes && e.notes.includes(taskId)))
    .reduce((sum, e) => {
      const ms = new Date(e.endsAt).getTime() - new Date(e.startsAt).getTime();
      return sum + Math.max(0, Math.round(ms / 60000));
    }, 0);
}

/**
 * Derives canonical remaining work in minutes:
 * remaining = max(0, estimated - scheduled)
 */
export function getTaskRemainingMinutes(task: Task, events: EventItem[]): number {
  const scheduled = getTaskScheduledMinutes(task.id, events);
  return Math.max(0, task.estimatedDurationMinutes - scheduled);
}

export type TaskSchedulingState = 'UNSCHEDULED' | 'PARTIAL' | 'SCHEDULED';

/**
 * Derives task scheduling state from actual scheduled sessions.
 * 0 scheduled => UNSCHEDULED
 * 0 < scheduled < estimated => PARTIAL
 * scheduled >= estimated => SCHEDULED
 */
export function getTaskSchedulingState(task: Task, events: EventItem[]): TaskSchedulingState {
  const scheduled = getTaskScheduledMinutes(task.id, events);
  if (scheduled <= 0) return 'UNSCHEDULED';
  if (scheduled < task.estimatedDurationMinutes) return 'PARTIAL';
  return 'SCHEDULED';
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ''}` : `${remainder}m`;
}

export function formatDeadline(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
  return diff < 0 ? 'overdue' : diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff}d`;
}

export function getDeadlineRisk(value: string | null | undefined): 'high' | 'medium' | 'low' | 'none' {
  if (!value) return 'none';
  const diff = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (diff <= 1) return 'high';
  if (diff <= 3) return 'medium';
  return 'low';
}
