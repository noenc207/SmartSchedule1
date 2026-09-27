import { describe, it, expect } from 'vitest';
import {
  getTaskScheduledMinutes,
  getTaskRemainingMinutes,
  getTaskSchedulingState,
  formatMinutes,
} from './taskCalculations';
import type { EventItem, Task } from '../../../types/domain';

const mockTask: Task = {
  id: 'task-test-1',
  scheduleId: 'sched-1',
  ownerId: 'user-1',
  categoryId: 'cat-1',
  title: 'Machine Learning Assignment',
  description: 'Test description',
  estimatedDurationMinutes: 180, // 3h
  remainingDurationMinutes: 180,
  priority: 'HIGH',
  deadline: null,
  status: 'TODO',
  preferredStartTime: null,
  preferredEndTime: null,
  minimumSessionMinutes: 30,
  maximumSessionMinutes: 120,
  createdAt: '2026-09-22T00:00:00Z',
  updatedAt: '2026-09-22T00:00:00Z',
};

const createMockEvent = (id: string, taskId: string, startsAt: string, endsAt: string): EventItem => ({
  id,
  scheduleId: 'sched-1',
  categoryId: 'cat-1',
  taskId,
  title: 'ML Session',
  description: null,
  startsAt,
  endsAt,
  location: null,
  priority: 'HIGH',
  status: 'SCHEDULED',
  recurrenceRule: null,
  reminderMinutes: 15,
  notes: `Scheduled from task · ${taskId}`,
  fixed: false,
  locked: false,
  createdAt: startsAt,
  updatedAt: startsAt,
  occurrenceId: id,
  seriesId: id,
});

describe('taskCalculations — canonical data consistency', () => {
  it('correctly reports 0 scheduled minutes and UNSCHEDULED state when no events exist', () => {
    const scheduled = getTaskScheduledMinutes('task-test-1', []);
    const remaining = getTaskRemainingMinutes(mockTask, []);
    const state = getTaskSchedulingState(mockTask, []);

    expect(scheduled).toBe(0);
    expect(remaining).toBe(180);
    expect(state).toBe('UNSCHEDULED');
  });

  it('correctly calculates 60m scheduled, 120m remaining, and PARTIAL state when 1h session exists', () => {
    const events = [
      createMockEvent('ev-1', 'task-test-1', '2026-09-22T10:00:00Z', '2026-09-22T11:00:00Z'),
    ];

    const scheduled = getTaskScheduledMinutes('task-test-1', events);
    const remaining = getTaskRemainingMinutes(mockTask, events);
    const state = getTaskSchedulingState(mockTask, events);

    expect(scheduled).toBe(60);
    expect(remaining).toBe(120);
    expect(state).toBe('PARTIAL');
  });

  it('correctly reports SCHEDULED state when scheduled sessions meet or exceed estimated duration', () => {
    const events = [
      createMockEvent('ev-1', 'task-test-1', '2026-09-22T10:00:00Z', '2026-09-22T12:00:00Z'), // 120m
      createMockEvent('ev-2', 'task-test-1', '2026-09-23T14:00:00Z', '2026-09-23T15:00:00Z'), // 60m -> 180m total
    ];

    const scheduled = getTaskScheduledMinutes('task-test-1', events);
    const remaining = getTaskRemainingMinutes(mockTask, events);
    const state = getTaskSchedulingState(mockTask, events);

    expect(scheduled).toBe(180);
    expect(remaining).toBe(0);
    expect(state).toBe('SCHEDULED');
  });

  it('never produces negative remaining duration if sessions exceed estimate', () => {
    const events = [
      createMockEvent('ev-1', 'task-test-1', '2026-09-22T10:00:00Z', '2026-09-22T14:00:00Z'), // 240m > 180m
    ];

    const remaining = getTaskRemainingMinutes(mockTask, events);
    expect(remaining).toBe(0);
  });

  it('formats minutes into human-readable strings', () => {
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(180)).toBe('3h');
  });
});
