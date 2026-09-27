import { describe, expect, it } from 'vitest';
import type { EventItem, Task } from '../../../types/domain';
import {
  getDateHeatmapLevel,
  getDailyWorkload,
  getDailyMetrics,
  getQuarterMonths,
  getWeekSummary,
  getTimelineTaskData,
} from './longRangeMetrics';
import { createTimestamp, DEFAULT_TIMEZONE } from '../../../utils/dateTime';

describe('longRangeMetrics engine', () => {
  describe('getDateHeatmapLevel', () => {
    it('maps exact workload thresholds deterministically with default 6h capacity', () => {
      expect(getDateHeatmapLevel(0)).toBe('none');
      expect(getDateHeatmapLevel(60)).toBe('light'); // 1h
      expect(getDateHeatmapLevel(120)).toBe('light'); // 2h boundary
      expect(getDateHeatmapLevel(180)).toBe('moderate'); // 3h
      expect(getDateHeatmapLevel(240)).toBe('moderate'); // 4h boundary
      expect(getDateHeatmapLevel(300)).toBe('high'); // 5h
      expect(getDateHeatmapLevel(360)).toBe('high'); // Exactly 6h -> high, NOT overload!
      expect(getDateHeatmapLevel(480)).toBe('overload'); // 8h -> overload
      expect(getDateHeatmapLevel(600)).toBe('overload'); // 10h -> overload
    });

    it('respects user configured daily focus capacity', () => {
      // Configured 8h capacity (480m)
      expect(getDateHeatmapLevel(420, 480)).toBe('high'); // 7h with 8h cap is high
      expect(getDateHeatmapLevel(480, 480)).toBe('high'); // Exactly 8h is high
      expect(getDateHeatmapLevel(540, 480)).toBe('overload'); // 9h is overload

      // Configured 4h capacity (240m)
      expect(getDateHeatmapLevel(240, 240)).toBe('moderate'); // 4h fits in moderate
      expect(getDateHeatmapLevel(250, 240)).toBe('overload'); // 250m exceeds 240m cap
    });
  });

  describe('getQuarterMonths', () => {
    it('returns exact 0-indexed month triplets for all 4 quarters', () => {
      expect(getQuarterMonths(2026, 1)).toEqual([0, 1, 2]); // Jan, Feb, Mar
      expect(getQuarterMonths(2026, 2)).toEqual([3, 4, 5]); // Apr, May, Jun
      expect(getQuarterMonths(2026, 3)).toEqual([6, 7, 8]); // Jul, Aug, Sep
      expect(getQuarterMonths(2026, 4)).toEqual([9, 10, 11]); // Oct, Nov, Dec
    });
  });

  describe('getDailyWorkload and getDailyMetrics', () => {
    const testDate = createTimestamp(2026, 9, 22, 0, 0, DEFAULT_TIMEZONE);
    const ev1: EventItem = {
      id: 'e1',
      scheduleId: 's1',
      taskId: 't1',
      categoryId: 'c1',
      title: 'Lab Session',
      description: null,
      location: null,
      startsAt: createTimestamp(2026, 9, 22, 8, 0, DEFAULT_TIMEZONE),
      endsAt: createTimestamp(2026, 9, 22, 10, 0, DEFAULT_TIMEZONE), // 120m
      priority: 'HIGH',
      status: 'SCHEDULED',
      fixed: false,
      locked: false,
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: null,
      color: null,
      occurrenceId: 'e1',
      seriesId: 'e1',
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    const ev2: EventItem = {
      id: 'e2',
      scheduleId: 's1',
      taskId: 't2',
      categoryId: 'c1',
      title: 'Project Study',
      description: null,
      location: null,
      startsAt: createTimestamp(2026, 9, 22, 14, 0, DEFAULT_TIMEZONE),
      endsAt: createTimestamp(2026, 9, 22, 15, 30, DEFAULT_TIMEZONE), // 90m
      priority: 'MEDIUM',
      status: 'SCHEDULED',
      fixed: false,
      locked: false,
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: null,
      color: null,
      occurrenceId: 'e2',
      seriesId: 'e2',
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    const task1: Task = {
      id: 't1',
      scheduleId: 's1',
      ownerId: 'u1',
      title: 'AI Lab',
      description: null,
      estimatedDurationMinutes: 120,
      remainingDurationMinutes: 0,
      priority: 'HIGH',
      status: 'SCHEDULED',
      deadline: createTimestamp(2026, 9, 22, 23, 59, DEFAULT_TIMEZONE),
      categoryId: 'c1',
      color: null,
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 120,
      preferredStartTime: null,
      preferredEndTime: null,
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    it('calculates total workload minutes accurately on test date', () => {
      const workload = getDailyWorkload(testDate, [ev1, ev2], DEFAULT_TIMEZONE);
      expect(workload).toBe(210); // 120 + 90
    });

    it('calculates daily metrics with event count, task count, and deadlines', () => {
      const metrics = getDailyMetrics(testDate, [ev1, ev2], [task1], DEFAULT_TIMEZONE, 360);
      expect(metrics.workloadMinutes).toBe(210);
      expect(metrics.eventCount).toBe(2);
      expect(metrics.taskCount).toBe(2);
      expect(metrics.deadlines).toBe(1);
      expect(metrics.isOverloaded).toBe(false);
      expect(metrics.level).toBe('moderate');
    });

    it('identifies empty days as none', () => {
      const emptyDate = createTimestamp(2026, 9, 25, 0, 0, DEFAULT_TIMEZONE);
      const metrics = getDailyMetrics(emptyDate, [ev1, ev2], [task1], DEFAULT_TIMEZONE, 360);
      expect(metrics.workloadMinutes).toBe(0);
      expect(metrics.eventCount).toBe(0);
      expect(metrics.deadlines).toBe(0);
      expect(metrics.level).toBe('none');
    });
  });

  describe('getTimelineTaskData', () => {
    const taskA: Task = {
      id: 'task-a',
      scheduleId: 's1',
      ownerId: 'u1',
      title: 'Database Assignment',
      description: null,
      estimatedDurationMinutes: 180,
      remainingDurationMinutes: 0,
      priority: 'HIGH',
      status: 'SCHEDULED',
      deadline: '2026-09-26T23:59:00Z',
      categoryId: 'c1',
      color: '#ea580c',
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 120,
      preferredStartTime: null,
      preferredEndTime: null,
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    const session1: EventItem = {
      id: 's1',
      scheduleId: 's1',
      taskId: 'task-a',
      categoryId: 'c1',
      title: 'DB Part 1',
      description: null,
      location: null,
      startsAt: '2026-09-22T09:00:00Z',
      endsAt: '2026-09-22T10:30:00Z', // 90m
      priority: 'HIGH',
      status: 'SCHEDULED',
      fixed: false,
      locked: false,
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: 'task-task-a',
      color: null,
      occurrenceId: 's1',
      seriesId: 's1',
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    const session2: EventItem = {
      id: 's2',
      scheduleId: 's1',
      taskId: 'task-a',
      categoryId: 'c1',
      title: 'DB Part 2',
      description: null,
      location: null,
      startsAt: '2026-09-24T14:00:00Z',
      endsAt: '2026-09-24T15:30:00Z', // 90m
      priority: 'HIGH',
      status: 'SCHEDULED',
      fixed: false,
      locked: false,
      recurrenceRule: null,
      reminderMinutes: 15,
      notes: 'task-task-a',
      color: null,
      occurrenceId: 's2',
      seriesId: 's2',
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    it('preserves multiple split sessions under the same task row', () => {
      const rows = getTimelineTaskData([taskA], [session1, session2]);
      expect(rows.length).toBe(1);
      expect(rows[0].task.id).toBe('task-a');
      expect(rows[0].sessions.length).toBe(2);
      expect(rows[0].totalScheduledMinutes).toBe(180);
      expect(rows[0].deadlineDate).toBe('2026-09-26T23:59:00Z');
      expect(rows[0].sessions[0].title).toBe('DB Part 1');
      expect(rows[0].sessions[1].title).toBe('DB Part 2');
    });
  });
});
