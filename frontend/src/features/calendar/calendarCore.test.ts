import { describe, expect, it } from 'vitest';
import { toCalendarEvent } from './utils/eventMapper';
import { resolveEventColor } from './utils/colorPalette';
import {
  formatMinutes,
  getTaskRemainingMinutes,
  getTaskScheduledMinutes,
  getTaskSchedulingState,
} from '../scheduling/utils/taskCalculations';
import type { Category, EventItem, Task } from '../../types/domain';

describe('Calendar & Scheduling Core Stabilization Matrix', () => {
  const dummyCategory: Category = {
    id: 'cat-test',
    ownerId: 'owner-1',
    name: 'Academic',
    color: '#2563eb', // Blue
    icon: 'book',
    createdAt: '2026-09-22T00:00:00Z',
    updatedAt: '2026-09-22T00:00:00Z',
  };

  const dummyTask: Task = {
    id: 'task-1',
    scheduleId: 'sched-1',
    ownerId: 'owner-1',
    categoryId: 'cat-test',
    title: 'Database Project',
    description: null,
    estimatedDurationMinutes: 180, // 3h
    remainingDurationMinutes: 180,
    priority: 'HIGH',
    deadline: '2026-09-27T23:59:00Z',
    status: 'TODO',
    preferredStartTime: '17:00',
    preferredEndTime: '22:00',
    minimumSessionMinutes: 30,
    maximumSessionMinutes: 120,
    color: '#ea580c', // Task custom orange
    createdAt: '2026-09-22T00:00:00Z',
    updatedAt: '2026-09-22T00:00:00Z',
  };

  describe('Boundary and Overlap Detection Logic', () => {
    function detectOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
      const start1 = new Date(s1).getTime();
      const end1 = new Date(e1).getTime();
      const start2 = new Date(s2).getTime();
      const end2 = new Date(e2).getTime();
      return start1 < end2 && end1 > start2;
    }

    it('determines that boundary-touching events (09:00–11:00 and 11:00–13:00) do NOT overlap', () => {
      const e1Start = '2026-09-22T02:00:00.000Z'; // 09:00 UTC+7
      const e1End = '2026-09-22T04:00:00.000Z';   // 11:00 UTC+7
      const e2Start = '2026-09-22T04:00:00.000Z'; // 11:00 UTC+7
      const e2End = '2026-09-22T06:00:00.000Z';   // 13:00 UTC+7

      expect(detectOverlap(e1Start, e1End, e2Start, e2End)).toBe(false);
    });

    it('detects two overlapping events (14:00–16:00 and 14:30–15:30)', () => {
      const e1Start = '2026-09-22T07:00:00.000Z'; // 14:00 UTC+7
      const e1End = '2026-09-22T09:00:00.000Z';   // 16:00 UTC+7
      const e2Start = '2026-09-22T07:30:00.000Z'; // 14:30 UTC+7
      const e2End = '2026-09-22T08:30:00.000Z';   // 15:30 UTC+7

      expect(detectOverlap(e1Start, e1End, e2Start, e2End)).toBe(true);
    });

    it('detects three mutually overlapping events (14:00–16:00, 14:30–15:30, 15:00–17:00)', () => {
      const e1 = { start: '2026-09-22T07:00:00.000Z', end: '2026-09-22T09:00:00.000Z' }; // 14-16
      const e2 = { start: '2026-09-22T07:30:00.000Z', end: '2026-09-22T08:30:00.000Z' }; // 14:30-15:30
      const e3 = { start: '2026-09-22T08:00:00.000Z', end: '2026-09-22T10:00:00.000Z' }; // 15-17

      expect(detectOverlap(e1.start, e1.end, e2.start, e2.end)).toBe(true);
      expect(detectOverlap(e2.start, e2.end, e3.start, e3.end)).toBe(true);
      expect(detectOverlap(e1.start, e1.end, e3.start, e3.end)).toBe(true);
    });
  });

  describe('Event Color Hierarchy & Conflict Visuals', () => {
    it('inherits category color when neither event nor task specifies color', () => {
      const ev: EventItem = {
        id: 'ev-1',
        scheduleId: 'sched-1',
        categoryId: 'cat-test',
        title: 'Class',
        description: null,
        startsAt: '2026-09-22T02:00:00Z',
        endsAt: '2026-09-22T04:00:00Z',
        location: null,
        priority: 'MEDIUM',
        status: 'SCHEDULED',
        recurrenceRule: null,
        reminderMinutes: null,
        notes: null,
        fixed: false,
        locked: false,
        color: null,
        createdAt: '2026-09-22T00:00:00Z',
        updatedAt: '2026-09-22T00:00:00Z',
        occurrenceId: 'ev-1',
        seriesId: 'ev-1',
      };
      const res = resolveEventColor(ev, dummyCategory, { ...dummyTask, color: null });
      expect(res.color).toBe('#2563eb');
      expect(res.source).toBe('category');
    });

    it('inherits task color when task specifies custom color and event does not', () => {
      const ev: EventItem = {
        id: 'ev-1',
        scheduleId: 'sched-1',
        categoryId: 'cat-test',
        taskId: 'task-1',
        title: 'Task Session',
        description: null,
        startsAt: '2026-09-22T02:00:00Z',
        endsAt: '2026-09-22T04:00:00Z',
        location: null,
        priority: 'MEDIUM',
        status: 'SCHEDULED',
        recurrenceRule: null,
        reminderMinutes: null,
        notes: null,
        fixed: false,
        locked: false,
        color: null,
        createdAt: '2026-09-22T00:00:00Z',
        updatedAt: '2026-09-22T00:00:00Z',
        occurrenceId: 'ev-1',
        seriesId: 'ev-1',
      };
      const res = resolveEventColor(ev, dummyCategory, dummyTask);
      expect(res.color).toBe('#ea580c');
      expect(res.source).toBe('task');
    });

    it('overrides task color when event has explicit custom color', () => {
      const ev: EventItem = {
        id: 'ev-1',
        scheduleId: 'sched-1',
        categoryId: 'cat-test',
        taskId: 'task-1',
        title: 'Overridden Color',
        description: null,
        startsAt: '2026-09-22T02:00:00Z',
        endsAt: '2026-09-22T04:00:00Z',
        location: null,
        priority: 'MEDIUM',
        status: 'SCHEDULED',
        recurrenceRule: null,
        reminderMinutes: null,
        notes: null,
        fixed: false,
        locked: false,
        color: '#7c3aed', // Purple override
        createdAt: '2026-09-22T00:00:00Z',
        updatedAt: '2026-09-22T00:00:00Z',
        occurrenceId: 'ev-1',
        seriesId: 'ev-1',
      };
      const res = resolveEventColor(ev, dummyCategory, dummyTask);
      expect(res.color).toBe('#7c3aed');
      expect(res.source).toBe('event');
    });

    it('tags calendar event with conflict class and red border when conflicting, preserving identity background', () => {
      const ev: EventItem = {
        id: 'ev-1',
        scheduleId: 'sched-1',
        categoryId: 'cat-test',
        taskId: 'task-1',
        title: 'Conflicting Task',
        description: null,
        startsAt: '2026-09-22T02:00:00Z',
        endsAt: '2026-09-22T04:00:00Z',
        location: null,
        priority: 'HIGH',
        status: 'SCHEDULED',
        recurrenceRule: null,
        reminderMinutes: null,
        notes: null,
        fixed: false,
        locked: false,
        color: null,
        createdAt: '2026-09-22T00:00:00Z',
        updatedAt: '2026-09-22T00:00:00Z',
        occurrenceId: 'ev-1',
        seriesId: 'ev-1',
      };
      const calEv = toCalendarEvent(ev, [dummyCategory], [dummyTask], true);
      expect(calEv.classNames).toContain('calendar-event-conflict');
      expect(calEv.borderColor).toBe('var(--danger, #dc2626)');
      // Background retains tinted identity color
      expect(calEv.backgroundColor).toContain('#ea580c');
      expect(calEv.extendedProps?.hasConflict).toBe(true);
    });
  });

  describe('Duration & Scheduling State Derivation', () => {
    it('formats 120m to 2h and 90m to 1h 30m', () => {
      expect(formatMinutes(120)).toBe('2h');
      expect(formatMinutes(90)).toBe('1h 30m');
      expect(formatMinutes(45)).toBe('45m');
    });

    it('derives correct state: 0/180 => UNSCHEDULED', () => {
      const events: EventItem[] = [];
      expect(getTaskScheduledMinutes(dummyTask.id, events)).toBe(0);
      expect(getTaskRemainingMinutes(dummyTask, events)).toBe(180);
      expect(getTaskSchedulingState(dummyTask, events)).toBe('UNSCHEDULED');
    });

    it('derives correct state: 60/180 => PARTIAL, remaining = 120m', () => {
      const events: EventItem[] = [
        {
          id: 'ev-s1',
          scheduleId: 'sched-1',
          categoryId: 'cat-test',
          taskId: 'task-1',
          title: 'Database Project · Session 1',
          description: null,
          startsAt: '2026-09-22T10:00:00.000Z',
          endsAt: '2026-09-22T11:00:00.000Z', // 60 min
          location: null,
          priority: 'HIGH',
          status: 'SCHEDULED',
          recurrenceRule: null,
          reminderMinutes: null,
          notes: 'task-1',
          fixed: false,
          locked: false,
          createdAt: '2026-09-22T00:00:00Z',
          updatedAt: '2026-09-22T00:00:00Z',
          occurrenceId: 'ev-s1',
          seriesId: 'ev-s1',
        },
      ];
      expect(getTaskScheduledMinutes(dummyTask.id, events)).toBe(60);
      expect(getTaskRemainingMinutes(dummyTask, events)).toBe(120);
      expect(getTaskSchedulingState(dummyTask, events)).toBe('PARTIAL');
    });

    it('derives correct state: 180/180 => SCHEDULED, remaining = 0m', () => {
      const events: EventItem[] = [
        {
          id: 'ev-s1',
          scheduleId: 'sched-1',
          categoryId: 'cat-test',
          taskId: 'task-1',
          title: 'Database Project · Session 1',
          description: null,
          startsAt: '2026-09-22T10:00:00.000Z',
          endsAt: '2026-09-22T12:00:00.000Z', // 120 min
          location: null,
          priority: 'HIGH',
          status: 'SCHEDULED',
          recurrenceRule: null,
          reminderMinutes: null,
          notes: 'task-1',
          fixed: false,
          locked: false,
          createdAt: '2026-09-22T00:00:00Z',
          updatedAt: '2026-09-22T00:00:00Z',
          occurrenceId: 'ev-s1',
          seriesId: 'ev-s1',
        },
        {
          id: 'ev-s2',
          scheduleId: 'sched-1',
          categoryId: 'cat-test',
          taskId: 'task-1',
          title: 'Database Project · Session 2',
          description: null,
          startsAt: '2026-09-23T10:00:00.000Z',
          endsAt: '2026-09-23T11:00:00.000Z', // 60 min
          location: null,
          priority: 'HIGH',
          status: 'SCHEDULED',
          recurrenceRule: null,
          reminderMinutes: null,
          notes: 'task-1',
          fixed: false,
          locked: false,
          createdAt: '2026-09-22T00:00:00Z',
          updatedAt: '2026-09-22T00:00:00Z',
          occurrenceId: 'ev-s2',
          seriesId: 'ev-s2',
        },
      ];
      expect(getTaskScheduledMinutes(dummyTask.id, events)).toBe(180);
      expect(getTaskRemainingMinutes(dummyTask, events)).toBe(0);
      expect(getTaskSchedulingState(dummyTask, events)).toBe('SCHEDULED');
    });
  });

  describe('Event Time Controller & Granular Picker Stabilization', () => {
    function parseDateTime(val: string) {
      const [datePart, timePart] = val.split('T');
      const [h, m] = (timePart || '08:00').split(':');
      return { date: datePart, hour: h, minute: m };
    }

    function addDuration(startsAt: string, minutes: number): string {
      const { date, hour, minute } = parseDateTime(startsAt);
      const s = new Date(`${date}T${hour}:${minute}:00`).getTime();
      const e = new Date(s + minutes * 60000);
      const ey = e.getFullYear();
      const em = String(e.getMonth() + 1).padStart(2, '0');
      const ed = String(e.getDate()).padStart(2, '0');
      const eh = String(e.getHours()).padStart(2, '0');
      const emin = String(e.getMinutes()).padStart(2, '0');
      return `${ey}-${em}-${ed}T${eh}:${emin}`;
    }

    it('correctly parses ISO local datetime string into date, hour, and minute components', () => {
      const parsed = parseDateTime('2026-09-20T14:30');
      expect(parsed.date).toBe('2026-09-20');
      expect(parsed.hour).toBe('14');
      expect(parsed.minute).toBe('30');
    });

    it('correctly applies quick duration pills (+30p, +45p, +90p, +120p)', () => {
      const start = '2026-09-20T08:00';
      expect(addDuration(start, 30)).toBe('2026-09-20T08:30');
      expect(addDuration(start, 45)).toBe('2026-09-20T08:45');
      expect(addDuration(start, 90)).toBe('2026-09-20T09:30');
      expect(addDuration(start, 120)).toBe('2026-09-20T10:00');
    });

    it('handles roll-over past midnight correctly when applying large durations', () => {
      const lateStart = '2026-09-20T23:30';
      const result = addDuration(lateStart, 60); // 1 hour past 23:30 = 00:30 next day
      expect(result).toBe('2026-09-21T00:30');
    });
  });
});

