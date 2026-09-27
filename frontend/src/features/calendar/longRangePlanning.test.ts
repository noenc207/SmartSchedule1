import { describe, expect, it } from 'vitest';
import {
  getDailyWorkload,
  getDateHeatmapLevel,
  getDailyMetrics,
  getQuarterMonths,
  getWeekSummary,
  getTimelineTaskData,
} from './utils/longRangeMetrics';
import type { Category, EventItem, Task } from '../../types/domain';

describe('Long-Range Planning & Navigation Comprehensive Test Suite', () => {
  const dummyTask: Task = {
    id: 'task-capstone',
    scheduleId: 'sched-1',
    ownerId: 'user-1',
    categoryId: 'cat-1',
    title: 'Graduation Capstone Defense',
    description: 'Defense presentation and slides',
    estimatedDurationMinutes: 300, // 5 hours
    remainingDurationMinutes: 120, // 2 hours remaining
    priority: 'HIGH',
    deadline: '2026-09-25T17:00:00.000Z',
    status: 'IN_PROGRESS',
    preferredStartTime: '08:00',
    preferredEndTime: '18:00',
    minimumSessionMinutes: 60,
    maximumSessionMinutes: 120,
    color: '#ea580c',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const dummyCategory: Category = {
    id: 'cat-1',
    ownerId: 'user-1',
    name: 'Capstone',
    color: '#3b82f6',
    icon: 'briefcase',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const mockSession1: EventItem = {
    id: 'event-session-1',
    scheduleId: 'sched-1',
    categoryId: 'cat-1',
    taskId: 'task-capstone',
    title: 'Graduation Capstone Defense - Session 1',
    description: null,
    startsAt: '2026-09-22T02:00:00.000Z', // 09:00 - 11:00 UTC+7 (120 min)
    endsAt: '2026-09-22T04:00:00.000Z',
    location: 'Lab A3',
    priority: 'HIGH',
    status: 'SCHEDULED',
    recurrenceRule: null,
    reminderMinutes: 15,
    notes: 'task-capstone',
    fixed: false,
    locked: false,
    occurrenceId: 'occ-1',
    seriesId: 'series-1',
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
  };

  const mockSession2: EventItem = {
    id: 'event-session-2',
    scheduleId: 'sched-1',
    categoryId: 'cat-1',
    taskId: 'task-capstone',
    title: 'Graduation Capstone Defense - Session 2',
    description: null,
    startsAt: '2026-09-24T07:00:00.000Z', // 14:00 - 15:00 UTC+7 (60 min)
    endsAt: '2026-09-24T08:00:00.000Z',
    location: 'Lab A3',
    priority: 'HIGH',
    status: 'SCHEDULED',
    recurrenceRule: null,
    reminderMinutes: 15,
    notes: 'task-capstone',
    fixed: false,
    locked: false,
    occurrenceId: 'occ-2',
    seriesId: 'series-2',
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
  };

  describe('1. Workload Calculation & Heatmap Intensity Mapping', () => {
    it('correctly aggregates workload for multiple events on the same day in Asia/Ho_Chi_Minh', () => {
      const extraEvent: EventItem = {
        ...mockSession1,
        id: 'event-extra',
        startsAt: '2026-09-22T07:00:00.000Z', // 14:00 - 16:00 UTC+7 (120 min)
        endsAt: '2026-09-22T09:00:00.000Z',
      };

      const dateTarget = new Date('2026-09-22T00:00:00.000Z');
      const minutes = getDailyWorkload(dateTarget, [mockSession1, extraEvent, mockSession2]);
      // mockSession1 (120) + extraEvent (120) = 240 minutes on Sept 22
      expect(minutes).toBe(240);
    });

    it('faithfully preserves the exact 6h (360m) boundary as high and NOT overload', () => {
      // 360m with default capacity 360m:
      expect(getDateHeatmapLevel(360, 360)).toBe('high');
      // 361m should trigger overload:
      expect(getDateHeatmapLevel(361, 360)).toBe('overload');
    });

    it('handles customizable capacity thresholds correctly', () => {
      // User with 8-hour (480m) daily capacity: 420m (7h) is high, 500m is overload
      expect(getDateHeatmapLevel(420, 480)).toBe('high');
      expect(getDateHeatmapLevel(500, 480)).toBe('overload');

      // User with 4-hour (240m) capacity: 200m is moderate, 250m is overload
      expect(getDateHeatmapLevel(200, 240)).toBe('moderate');
      expect(getDateHeatmapLevel(250, 240)).toBe('overload');
    });
  });

  describe('2. Quarter & Multi-month Segmentation', () => {
    it('accurately divides all four academic quarters into 3-month slices', () => {
      expect(getQuarterMonths(2026, 1)).toEqual([0, 1, 2]);   // Jan, Feb, Mar
      expect(getQuarterMonths(2026, 2)).toEqual([3, 4, 5]);   // Apr, May, Jun
      expect(getQuarterMonths(2026, 3)).toEqual([6, 7, 8]);   // Jul, Aug, Sep
      expect(getQuarterMonths(2026, 4)).toEqual([9, 10, 11]); // Oct, Nov, Dec
    });

    it('summarizes weekly workload and identifies impending deadlines in the week', () => {
      // Week starting Monday Sept 21, 2026
      const weekStart = new Date('2026-09-21T00:00:00.000Z');
      const summary = getWeekSummary(weekStart, [mockSession1, mockSession2], [dummyTask], 'Asia/Ho_Chi_Minh', 360);

      // Session 1: 120m, Session 2: 60m => Total = 180m
      expect(summary.plannedMinutes).toBe(180);
      expect(summary.isOverloaded).toBe(false);
      // Deadline is on Sept 25, which falls within this week!
      expect(summary.deadlineCount).toBe(1);
      expect(summary.eventCount).toBe(2);
    });
  });

  describe('3. Timeline & Gantt Chart Split Session Representation', () => {
    it('groups multiple scheduled sessions under the same task row with discrete intervals', () => {
      const rows = getTimelineTaskData([dummyTask], [mockSession1, mockSession2], 'Asia/Ho_Chi_Minh');

      expect(rows.length).toBe(1);
      const row = rows[0];
      expect(row.task.id).toBe('task-capstone');
      // Must maintain 2 separate sessions on the single row without inventing an artificial continuous block
      expect(row.sessions.length).toBe(2);
      expect(row.sessions[0].eventId).toBe('event-session-1');
      expect(row.sessions[0].durationMinutes).toBe(120);
      expect(row.sessions[1].eventId).toBe('event-session-2');
      expect(row.sessions[1].durationMinutes).toBe(60);
      expect(row.deadlineDate).toBe('2026-09-25T17:00:00.000Z');
    });

    it('reports zero sessions for completely unscheduled tasks while maintaining task details', () => {
      const unassignedTask: Task = {
        ...dummyTask,
        id: 'task-empty',
        title: 'Future Research',
      };

      const rows = getTimelineTaskData([unassignedTask], [], 'Asia/Ho_Chi_Minh');
      expect(rows.length).toBe(1);
      expect(rows[0].sessions.length).toBe(0);
      expect(rows[0].task.title).toBe('Future Research');
    });
  });

  describe('4. Mini Calendar Activity Indicators', () => {
    it('computes daily metrics with event count, task deadlines, and overload status', () => {
      const sept22 = new Date('2026-09-22T00:00:00.000Z');
      const metrics = getDailyMetrics(sept22, [mockSession1], [dummyTask], 'Asia/Ho_Chi_Minh', 360);

      expect(metrics.eventCount).toBe(1);
      expect(metrics.workloadMinutes).toBe(120);
      expect(metrics.level).toBe('light'); // 120m is >0 and <= 120m -> light
      expect(metrics.isOverloaded).toBe(false);
      // Deadline is on Sept 25, not Sept 22
      expect(metrics.deadlines).toBe(0);
    });

    it('identifies deadlines on the exact target date for mini calendar diamond indicator', () => {
      // In Asia/Ho_Chi_Minh (UTC+7), '2026-09-25T17:00:00.000Z' is 2026-09-26 00:00:00 UTC+7
      // Let's create target date corresponding to task's deadline date in timezone:
      const targetDate = new Date('2026-09-26T00:00:00.000Z');
      const metrics = getDailyMetrics(targetDate, [], [dummyTask], 'Asia/Ho_Chi_Minh', 360);

      expect(metrics.deadlines).toBe(1);
    });
  });
});
